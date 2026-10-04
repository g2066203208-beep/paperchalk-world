#include "shared_link.h"
#include <algorithm>
#include <cstring>
#include <iostream>

namespace mcub {
namespace {
template <class T>
std::atomic_ref<T> atom(T& value) {
    return std::atomic_ref<T>(value);
}

std::uint64_t nowMs() {
    return ::GetTickCount64();
}
} // namespace

SharedLink::~SharedLink() {
    if (base_) {
        ::UnmapViewOfFile(base_);
    }
    if (mapping_) {
        ::CloseHandle(mapping_);
    }
}

bool SharedLink::create(std::uint64_t capabilities) {
    mapping_ = ::CreateFileMappingW(
        INVALID_HANDLE_VALUE,
        nullptr,
        PAGE_READWRITE,
        0,
        proto::kMappingBytes,
        proto::kMappingName
    );
    if (!mapping_) {
        std::cerr << "CreateFileMappingW failed: " << ::GetLastError() << "\n";
        return false;
    }

    base_ = static_cast<std::uint8_t*>(
        ::MapViewOfFile(mapping_, FILE_MAP_ALL_ACCESS, 0, 0, proto::kMappingBytes)
    );
    if (!base_) {
        std::cerr << "MapViewOfFile failed: " << ::GetLastError() << "\n";
        return false;
    }

    std::memset(base_, 0, proto::kMappingBytes);
    auto* h = header();
    h->version = proto::kVersion;
    h->mappingBytes = proto::kMappingBytes;
    h->hostPid = ::GetCurrentProcessId();
    h->hostCapabilities = capabilities;
    h->sessionId = (nowMs() << 16) ^ h->hostPid;
    h->hostHeartbeatMs = nowMs();
    h->flags = proto::kHostReady;
    atom(h->magic).store(proto::kMagic, std::memory_order_release);
    return true;
}

void SharedLink::heartbeat() {
    if (base_) {
        atom(header()->hostHeartbeatMs).store(nowMs(), std::memory_order_release);
    }
}

void SharedLink::setMcReady(bool ready) {
    auto* h = header();
    if (!h) return;
    auto flags = atom(h->flags);
    auto value = flags.load(std::memory_order_relaxed);
    if (ready) value |= proto::kMcReady;
    else value &= ~proto::kMcReady;
    flags.store(value, std::memory_order_release);
}

proto::Header* SharedLink::header() const {
    return base_ ? at<proto::Header>(proto::kOffHeader) : nullptr;
}

void SharedLink::writeHostState(const proto::HostState& state) {
    auto* dst = at<proto::HostState>(proto::kOffHostState);
    auto seq = atom(dst->seq);
    const auto s = seq.load(std::memory_order_relaxed);
    seq.store(s + 1, std::memory_order_relaxed);
    std::atomic_thread_fence(std::memory_order_release);
    std::memcpy(reinterpret_cast<std::uint8_t*>(dst) + 4,
                reinterpret_cast<const std::uint8_t*>(&state) + 4,
                sizeof(proto::HostState) - 4);
    seq.store(s + 2, std::memory_order_release);
}

bool SharedLink::readMcState(proto::McState& out) const {
    if (!base_) return false;
    auto* src = at<proto::McState>(proto::kOffMcState);
    auto seq = atom(src->seq);
    for (int attempt = 0; attempt < 64; ++attempt) {
        const auto a = seq.load(std::memory_order_acquire);
        if (a & 1u) {
            YieldProcessor();
            continue;
        }
        std::memcpy(&out, src, sizeof(out));
        std::atomic_thread_fence(std::memory_order_acquire);
        if (seq.load(std::memory_order_relaxed) == a) {
            return a != 0;
        }
    }
    return false;
}

void SharedLink::writeEntities(const proto::EntityRecord* entities, std::uint32_t count) {
    auto* table = at<proto::EntityTable>(proto::kOffEntityTable);
    auto seq = atom(table->seq);
    const auto s = seq.load(std::memory_order_relaxed);
    seq.store(s + 1, std::memory_order_relaxed);
    std::atomic_thread_fence(std::memory_order_release);
    table->count = std::min(count, proto::kMaxEntities);
    if (table->count) {
        std::memcpy(table->entities, entities, sizeof(proto::EntityRecord) * table->count);
    }
    seq.store(s + 2, std::memory_order_release);
}

template <class T>
bool SharedLink::pushFixed(std::uint32_t ringOffset, std::uint32_t entries, const T& value) {
    auto* ring = base_ + ringOffset;
    auto& headRef = *reinterpret_cast<std::uint64_t*>(ring + proto::kRingHeadOffset);
    auto& tailRef = *reinterpret_cast<std::uint64_t*>(ring + proto::kRingTailOffset);
    const auto head = atom(headRef).load(std::memory_order_relaxed);
    const auto tail = atom(tailRef).load(std::memory_order_acquire);
    if (head - tail >= entries) return false;
    auto* data = reinterpret_cast<T*>(ring + proto::kRingDataOffset);
    data[head % entries] = value;
    atom(headRef).store(head + 1, std::memory_order_release);
    return true;
}

template <class T>
bool SharedLink::popFixed(std::uint32_t ringOffset, std::uint32_t entries, T& value) {
    auto* ring = base_ + ringOffset;
    auto& headRef = *reinterpret_cast<std::uint64_t*>(ring + proto::kRingHeadOffset);
    auto& tailRef = *reinterpret_cast<std::uint64_t*>(ring + proto::kRingTailOffset);
    const auto tail = atom(tailRef).load(std::memory_order_relaxed);
    const auto head = atom(headRef).load(std::memory_order_acquire);
    if (tail >= head) return false;
    auto* data = reinterpret_cast<T*>(ring + proto::kRingDataOffset);
    value = data[tail % entries];
    atom(tailRef).store(tail + 1, std::memory_order_release);
    return true;
}

bool SharedLink::pushInput(const proto::InputEvent& event) {
    return pushFixed(proto::kOffInputRing, proto::kInputRingEntries, event);
}

bool SharedLink::pushHostEvent(const proto::GameEvent& event) {
    return pushFixed(proto::kOffHostEventRing, proto::kHostEventRingEntries, event);
}

bool SharedLink::popMcEvent(proto::GameEvent& event) {
    return popFixed(proto::kOffMcEventRing, proto::kMcEventRingEntries, event);
}

bool SharedLink::writeCollision(std::uint32_t type, const void* payload, std::uint32_t bytes) {
    if (!base_) return false;
    auto* ring = base_ + proto::kOffCollisionRing;
    auto& headRef = *reinterpret_cast<std::uint64_t*>(ring + proto::kRingHeadOffset);
    auto& tailRef = *reinterpret_cast<std::uint64_t*>(ring + proto::kRingTailOffset);
    auto* data = ring + proto::kRingDataOffset;
    constexpr std::uint64_t capacity = proto::kCollisionRingBytes - proto::kRingDataOffset;

    const std::uint64_t messageBytes = (sizeof(proto::CollisionMessageHeader) + bytes + 7ull) & ~7ull;
    if (messageBytes > capacity / 2) return false;

    auto head = atom(headRef).load(std::memory_order_relaxed);
    const auto tail = atom(tailRef).load(std::memory_order_acquire);
    auto pos = head % capacity;
    const auto pad = pos + messageBytes > capacity ? capacity - pos : 0;

    if (capacity - (head - tail) < messageBytes + pad) return false;

    if (pad) {
        auto* ph = reinterpret_cast<proto::CollisionMessageHeader*>(data + pos);
        *ph = { proto::kCollisionPad, 0 };
        head += pad;
        pos = 0;
    }

    auto* mh = reinterpret_cast<proto::CollisionMessageHeader*>(data + pos);
    *mh = { type, bytes };
    if (bytes) {
        std::memcpy(data + pos + sizeof(*mh), payload, bytes);
    }
    atom(headRef).store(head + messageBytes, std::memory_order_release);
    return true;
}

} // namespace mcub
