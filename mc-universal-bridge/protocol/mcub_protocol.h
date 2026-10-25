#pragma once
#include <cstddef>
#include <cstdint>

namespace mcub::proto {

inline constexpr std::uint32_t kMagic = 0x4255434Du; // bytes: M C U B
inline constexpr std::uint32_t kVersion = 1;
inline constexpr wchar_t kMappingName[] = L"Local\\MCUB_v1";
inline constexpr std::uint32_t kMappingBytes = 16u * 1024u * 1024u;

inline constexpr std::uint32_t kOffHeader = 0x00000;
inline constexpr std::uint32_t kOffHostState = 0x00100;
inline constexpr std::uint32_t kOffMcState = 0x00200;
inline constexpr std::uint32_t kOffEntityTable = 0x01000;
inline constexpr std::uint32_t kOffInputRing = 0x0A000;
inline constexpr std::uint32_t kOffHostEventRing = 0x11000;
inline constexpr std::uint32_t kOffMcEventRing = 0x18000;
inline constexpr std::uint32_t kOffCollisionRing = 0x20000;
inline constexpr std::uint32_t kCollisionRingBytes = 4u * 1024u * 1024u;
inline constexpr std::uint32_t kOffRenderRing = kOffCollisionRing + kCollisionRingBytes;
inline constexpr std::uint32_t kRenderRingBytes = 8u * 1024u * 1024u;

inline constexpr std::uint32_t kInputRingEntries = 1024;
inline constexpr std::uint32_t kHostEventRingEntries = 512;
inline constexpr std::uint32_t kMcEventRingEntries = 512;
inline constexpr std::uint32_t kMaxEntities = 512;
inline constexpr std::uint32_t kRingDataOffset = 0x80;

enum HeaderFlags : std::uint32_t {
    kHostReady = 1u << 0,
    kMcReady = 1u << 1,
};

enum HostCapabilities : std::uint64_t {
    kCapPlayerPuppet = 1ull << 0,
    kCapCamera = 1ull << 1,
    kCapCollision = 1ull << 2,
    kCapEntities = 1ull << 3,
    kCapDamage = 1ull << 4,
    kCapInput = 1ull << 5,
    kCapWater = 1ull << 6,
    kCapRenderer = 1ull << 7,
};

enum HostStateFlags : std::uint32_t {
    kHostInWorld = 1u << 0,
    kHostMenuOpen = 1u << 1,
    kHostLoading = 1u << 2,
    kHostPaused = 1u << 3,
};

enum McStateFlags : std::uint32_t {
    kMcInWorld = 1u << 0,
    kMcOnGround = 1u << 1,
    kMcSneaking = 1u << 2,
    kMcSprinting = 1u << 3,
    kMcSwimming = 1u << 4,
    kMcFlying = 1u << 5,
    kMcDead = 1u << 6,
    kMcScreenOpen = 1u << 7,
};

enum EntityKind : std::uint32_t {
    kEntityUnknown = 0,
    kEntityHumanoid = 1,
    kEntityCreature = 2,
    kEntityBoss = 3,
    kEntityVehicle = 4,
    kEntityObject = 5,
};

enum EntityFlags : std::uint32_t {
    kEntityHostile = 1u << 0,
    kEntityDead = 1u << 1,
    kEntityEssential = 1u << 2,
    kEntityInCombat = 1u << 3,
    kEntityInteractable = 1u << 4,
};

enum InputType : std::uint16_t {
    kInputKey = 1,
    kInputMouseButton = 2,
    kInputMouseDelta = 3,
    kInputScroll = 4,
    kInputText = 5,
    kInputReleaseAll = 6,
};

enum HostEventType : std::uint32_t {
    kHostEventPlayerHurt = 1,
    kHostEventTeleport = 2,
    kHostEventWorldChanged = 3,
    kHostEventInteractionResult = 4,
};

enum McEventType : std::uint32_t {
    kMcEventHitEntity = 1,
    kMcEventUseEntity = 2,
    kMcEventPlayerDied = 3,
    kMcEventExplosion = 4,
    kMcEventBlockChanged = 5,
};

enum CollisionMessageType : std::uint32_t {
    kCollisionPad = 0,
    kCollisionClear = 1,
    kCollisionTriangles = 2,
    kCollisionBoxes = 3,
};

#pragma pack(push, 1)

struct Header {
    std::uint32_t magic;
    std::uint32_t version;
    std::uint32_t mappingBytes;
    std::uint32_t flags;
    std::uint32_t hostPid;
    std::uint32_t mcPid;
    std::uint64_t hostHeartbeatMs;
    std::uint64_t mcHeartbeatMs;
    std::uint64_t hostCapabilities;
    std::uint64_t mcCapabilities;
    std::uint64_t sessionId;
};
static_assert(sizeof(Header) == 64);

struct HostState {
    std::uint32_t seq;
    std::uint32_t flags;
    std::uint64_t worldId;
    double x, y, z;
    float yaw, pitch;
    std::uint32_t viewportW, viewportH;
    double gameTimeSeconds;
    float unitsPerBlock;
    std::uint32_t reserved[15];
};
static_assert(sizeof(HostState) == 128);

struct McState {
    std::uint32_t seq;
    std::uint32_t flags;
    double x, y, z;
    float yaw, pitch;
    float eyeHeight;
    float fovDegrees;
    std::uint32_t cameraMode;
    std::uint32_t teleportAck;
    std::uint64_t frameId;
    double prevX, prevY, prevZ;
    double curX, curY, curZ;
    float tickMs;
    std::uint32_t reserved[3];
};
static_assert(sizeof(McState) == 128);

struct EntityRecord {
    std::uint64_t id;
    std::uint32_t kind;
    std::uint32_t flags;
    float x, y, z;
    float yaw;
    float halfX, halfY, halfZ;
    float health;
    float healthMax;
    std::uint32_t level;
    std::uint32_t reserved0;
    std::uint32_t nameHash;
};
static_assert(sizeof(EntityRecord) == 64);

struct EntityTable {
    std::uint32_t seq;
    std::uint32_t count;
    std::uint8_t reserved[56];
    EntityRecord entities[kMaxEntities];
};

struct InputEvent {
    std::uint16_t type;
    std::uint16_t code;
    std::int32_t a, b, c, d;
    std::uint32_t frame;
};
static_assert(sizeof(InputEvent) == 24);

struct GameEvent {
    std::uint32_t type;
    std::uint32_t flags;
    std::uint64_t target;
    std::uint64_t source;
    float a, b, c, d;
    std::uint32_t data0;
    std::uint32_t data1;
};
static_assert(sizeof(GameEvent) == 48);

struct CollisionMessageHeader {
    std::uint32_t type;
    std::uint32_t payloadBytes;
};

struct CollisionBatchHeader {
    std::uint32_t epoch;
    std::uint32_t count;
    float minX, minY, minZ;
    float maxX, maxY, maxZ;
};
static_assert(sizeof(CollisionBatchHeader) == 32);

struct Triangle {
    float ax, ay, az;
    float bx, by, bz;
    float cx, cy, cz;
    std::uint32_t flags;
};
static_assert(sizeof(Triangle) == 40);

struct Box {
    float minX, minY, minZ;
    float maxX, maxY, maxZ;
    std::uint32_t flags;
    std::uint32_t reserved;
};
static_assert(sizeof(Box) == 32);

#pragma pack(pop)

inline constexpr std::uint64_t kRingHeadOffset = 0x00;
inline constexpr std::uint64_t kRingTailOffset = 0x40;

static_assert(kOffEntityTable + sizeof(EntityTable) <= kOffInputRing);
static_assert(kOffInputRing + kRingDataOffset + sizeof(InputEvent) * kInputRingEntries <= kOffHostEventRing);
static_assert(kOffHostEventRing + kRingDataOffset + sizeof(GameEvent) * kHostEventRingEntries <= kOffMcEventRing);
static_assert(kOffMcEventRing + kRingDataOffset + sizeof(GameEvent) * kMcEventRingEntries <= kOffCollisionRing);
static_assert(kOffRenderRing + kRenderRingBytes <= kMappingBytes);

} // namespace mcub::proto
