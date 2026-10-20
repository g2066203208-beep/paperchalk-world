#include "../../host-sdk/include/mcub/host_adapter.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>

namespace {
const mcub::HostServicesV1* gServices = nullptr;
double gTime = 0.0;
mcub::proto::McState gLastMc{};

void log(const char* msg) {
    if (gServices && gServices->log) {
        gServices->log(0, msg);
    }
}

bool start(const mcub::HostServicesV1* services) {
    gServices = services;
    log("fake adapter started");

    struct FloorPacket {
        mcub::proto::CollisionBatchHeader header;
        mcub::proto::Triangle triangles[2];
    } packet{};

    packet.header.epoch = 1;
    packet.header.count = 2;
    packet.header.minX = -32.0f;
    packet.header.minY = 0.0f;
    packet.header.minZ = -32.0f;
    packet.header.maxX = 32.0f;
    packet.header.maxY = 0.0f;
    packet.header.maxZ = 32.0f;

    packet.triangles[0] = {
        -32, 0, -32,
         32, 0, -32,
         32, 0,  32,
         0
    };
    packet.triangles[1] = {
        -32, 0, -32,
         32, 0,  32,
        -32, 0,  32,
         0
    };

    return services->publishCollision &&
           services->publishCollision(mcub::proto::kCollisionTriangles, &packet, sizeof(packet));
}

void stop() {
    log("fake adapter stopped");
}

void tick(double dt) {
    gTime += dt;
}

bool sampleHostState(mcub::proto::HostState* out) {
    if (!out) return false;
    *out = {};
    out->flags = mcub::proto::kHostInWorld;
    out->worldId = 1;
    out->x = gLastMc.x;
    out->y = gLastMc.y;
    out->z = gLastMc.z;
    out->yaw = gLastMc.yaw;
    out->pitch = gLastMc.pitch;
    out->viewportW = 1920;
    out->viewportH = 1080;
    out->gameTimeSeconds = gTime;
    out->unitsPerBlock = 1.0f;
    return true;
}

std::uint32_t enumerateEntities(mcub::proto::EntityRecord* out, std::uint32_t capacity) {
    if (!out || capacity == 0) return 0;

    auto& e = out[0];
    e = {};
    e.id = 0xF00D;
    e.kind = mcub::proto::kEntityHumanoid;
    e.flags = mcub::proto::kEntityHostile | mcub::proto::kEntityInteractable;
    e.x = 4.0f + static_cast<float>(std::cos(gTime) * 2.0);
    e.y = 0.9f;
    e.z = 4.0f + static_cast<float>(std::sin(gTime) * 2.0);
    e.yaw = static_cast<float>(gTime * 40.0);
    e.halfX = 0.3f;
    e.halfY = 0.9f;
    e.halfZ = 0.3f;
    e.health = 20.0f;
    e.healthMax = 20.0f;
    e.level = 1;
    e.nameHash = 0x46414B45u; // diagnostic only
    return 1;
}

void applyMcState(const mcub::proto::McState* state) {
    if (state) gLastMc = *state;
}

void handleMcEvent(const mcub::proto::GameEvent* event) {
    if (!event) return;
    char buffer[160];
    std::snprintf(buffer, sizeof(buffer),
        "MC event type=%u target=%llu amount=%.2f",
        event->type,
        static_cast<unsigned long long>(event->target),
        event->a);
    log(buffer);
}

const mcub::AdapterV1 kAdapter{
    mcub::kAdapterAbiVersion,
    sizeof(mcub::AdapterV1),
    "MCUB Fake Game",
    mcub::proto::kCapPlayerPuppet |
    mcub::proto::kCapCollision |
    mcub::proto::kCapEntities |
    mcub::proto::kCapDamage,
    &start,
    &stop,
    &tick,
    &sampleHostState,
    &enumerateEntities,
    &applyMcState,
    &handleMcEvent
};
}

MCUB_EXPORT const mcub::AdapterV1* mcub_create_adapter_v1() {
    return &kAdapter;
}
