#pragma once
#include <Windows.h>
#include <atomic>
#include <cstdint>
#include <vector>
#include "../../protocol/mcub_protocol.h"

namespace mcub {

class SharedLink {
public:
    SharedLink() = default;
    ~SharedLink();

    SharedLink(const SharedLink&) = delete;
    SharedLink& operator=(const SharedLink&) = delete;

    bool create(std::uint64_t capabilities);
    void heartbeat();
    void setMcReady(bool ready);

    void writeHostState(const proto::HostState& state);
    bool readMcState(proto::McState& out) const;
    void writeEntities(const proto::EntityRecord* entities, std::uint32_t count);

    bool pushInput(const proto::InputEvent& event);
    bool pushHostEvent(const proto::GameEvent& event);
    bool popMcEvent(proto::GameEvent& event);

    bool writeCollision(std::uint32_t type, const void* payload, std::uint32_t bytes);

    proto::Header* header() const;

private:
    template <class T>
    T* at(std::uint32_t offset) const {
        return reinterpret_cast<T*>(base_ + offset);
    }

    template <class T>
    bool pushFixed(std::uint32_t ringOffset, std::uint32_t entries, const T& value);

    template <class T>
    bool popFixed(std::uint32_t ringOffset, std::uint32_t entries, T& value);

    HANDLE mapping_ = nullptr;
    std::uint8_t* base_ = nullptr;
};

} // namespace mcub
