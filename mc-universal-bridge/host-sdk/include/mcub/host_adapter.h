#pragma once
#include <cstdint>
#include "../../../protocol/mcub_protocol.h"

#if defined(_WIN32)
#define MCUB_EXPORT extern "C" __declspec(dllexport)
#else
#define MCUB_EXPORT extern "C"
#endif

namespace mcub {

inline constexpr std::uint32_t kAdapterAbiVersion = 1;

struct HostServicesV1 {
    std::uint32_t abiVersion;
    std::uint32_t structSize;

    void (*log)(int level, const char* message);
    bool (*pushInput)(const proto::InputEvent* event);
    bool (*pushHostEvent)(const proto::GameEvent* event);
    bool (*publishCollision)(std::uint32_t type, const void* payload, std::uint32_t bytes);
};

struct AdapterV1 {
    std::uint32_t abiVersion;
    std::uint32_t structSize;
    const char* name;
    std::uint64_t capabilities;

    bool (*start)(const HostServicesV1* services);
    void (*stop)();
    void (*tick)(double dtSeconds);

    bool (*sampleHostState)(proto::HostState* outState);
    std::uint32_t (*enumerateEntities)(proto::EntityRecord* outEntities, std::uint32_t capacity);

    void (*applyMcState)(const proto::McState* state);
    void (*handleMcEvent)(const proto::GameEvent* event);
};

using CreateAdapterV1Fn = const AdapterV1* (*)();

} // namespace mcub

MCUB_EXPORT const mcub::AdapterV1* mcub_create_adapter_v1();
