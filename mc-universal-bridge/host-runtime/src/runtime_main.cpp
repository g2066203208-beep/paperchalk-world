#include "shared_link.h"
#include "../../host-sdk/include/mcub/host_adapter.h"
#include <Windows.h>
#include <chrono>
#include <iostream>
#include <thread>
#include <vector>

namespace {
mcub::SharedLink* gLink = nullptr;

void logMessage(int level, const char* message) {
    const char* tag = level >= 2 ? "ERR" : level == 1 ? "WARN" : "INFO";
    std::cout << "[adapter/" << tag << "] " << (message ? message : "") << "\n";
}

bool pushInput(const mcub::proto::InputEvent* e) {
    return e && gLink && gLink->pushInput(*e);
}

bool pushHostEvent(const mcub::proto::GameEvent* e) {
    return e && gLink && gLink->pushHostEvent(*e);
}

bool publishCollision(std::uint32_t type, const void* payload, std::uint32_t bytes) {
    return gLink && gLink->writeCollision(type, payload, bytes);
}
}

int wmain(int argc, wchar_t** argv) {
    if (argc < 2) {
        std::wcerr << L"usage: mcub-host.exe <adapter.dll>\n";
        return 2;
    }

    HMODULE module = ::LoadLibraryW(argv[1]);
    if (!module) {
        std::wcerr << L"failed to load adapter: " << ::GetLastError() << L"\n";
        return 3;
    }

    auto create = reinterpret_cast<mcub::CreateAdapterV1Fn>(
        ::GetProcAddress(module, "mcub_create_adapter_v1")
    );
    if (!create) {
        std::cerr << "adapter does not export mcub_create_adapter_v1\n";
        return 4;
    }

    const mcub::AdapterV1* adapter = create();
    if (!adapter || adapter->abiVersion != mcub::kAdapterAbiVersion ||
        adapter->structSize < sizeof(mcub::AdapterV1)) {
        std::cerr << "adapter ABI mismatch\n";
        return 5;
    }

    mcub::SharedLink link;
    if (!link.create(adapter->capabilities)) {
        return 6;
    }
    gLink = &link;

    mcub::HostServicesV1 services{
        mcub::kAdapterAbiVersion,
        sizeof(mcub::HostServicesV1),
        &logMessage,
        &pushInput,
        &pushHostEvent,
        &publishCollision
    };

    if (!adapter->start || !adapter->start(&services)) {
        std::cerr << "adapter start failed\n";
        return 7;
    }

    std::cout << "MCUB host running with adapter: " << adapter->name << "\n";
    std::cout << "shared memory: Local\\MCUB_v1\n";
    std::cout << "Ctrl+C to stop\n";

    std::vector<mcub::proto::EntityRecord> entities(mcub::proto::kMaxEntities);
    auto last = std::chrono::steady_clock::now();
    auto lastEntities = last;

    for (;;) {
        const auto now = std::chrono::steady_clock::now();
        const double dt = std::chrono::duration<double>(now - last).count();
        last = now;

        link.heartbeat();
        if (adapter->tick) adapter->tick(dt);

        mcub::proto::HostState host{};
        if (adapter->sampleHostState && adapter->sampleHostState(&host)) {
            link.writeHostState(host);
        }

        if (now - lastEntities >= std::chrono::milliseconds(50)) {
            lastEntities = now;
            const auto count = adapter->enumerateEntities
                ? adapter->enumerateEntities(entities.data(), static_cast<std::uint32_t>(entities.size()))
                : 0u;
            link.writeEntities(entities.data(), count);
        }

        mcub::proto::McState mc{};
        if (link.readMcState(mc) && adapter->applyMcState) {
            adapter->applyMcState(&mc);
        }

        mcub::proto::GameEvent event{};
        while (link.popMcEvent(event)) {
            if (adapter->handleMcEvent) {
                adapter->handleMcEvent(&event);
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(4));
    }
}
