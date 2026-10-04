package dev.mcub.core;

final class Protocol {
    private Protocol() {}

    static final int MAGIC = 0x4255434D;
    static final int VERSION = 1;
    static final long MAPPING_BYTES = 16L * 1024L * 1024L;
    static final String MAPPING_NAME = "Local\\MCUB_v1";

    static final long OFF_HEADER = 0x00000;
    static final long OFF_HOST_STATE = 0x00100;
    static final long OFF_MC_STATE = 0x00200;
    static final long OFF_ENTITY_TABLE = 0x01000;
    static final long OFF_INPUT_RING = 0x0A000;
    static final long OFF_HOST_EVENT_RING = 0x11000;
    static final long OFF_MC_EVENT_RING = 0x18000;
    static final long OFF_COLLISION_RING = 0x20000;
    static final long COLLISION_RING_BYTES = 4L * 1024L * 1024L;
    static final long RING_DATA = 0x80;

    static final int MAX_ENTITIES = 512;
    static final int INPUT_RING_ENTRIES = 1024;
    static final int HOST_EVENT_RING_ENTRIES = 512;
    static final int MC_EVENT_RING_ENTRIES = 512;
    static final int INPUT_BYTES = 24;
    static final int EVENT_BYTES = 48;

    static final long H_MAGIC = 0;
    static final long H_VERSION = 4;
    static final long H_MAPPING_BYTES = 8;
    static final long H_FLAGS = 12;
    static final long H_HOST_PID = 16;
    static final long H_MC_PID = 20;
    static final long H_HOST_HEARTBEAT = 24;
    static final long H_MC_HEARTBEAT = 32;
    static final long H_HOST_CAPS = 40;

    static final int HOST_IN_WORLD = 1;
    static final int MC_IN_WORLD = 1;
    static final int MC_ON_GROUND = 1 << 1;

    static final int HOST_STATE_BYTES = 128;
    static final int MC_STATE_BYTES = 128;
    static final int ENTITY_BYTES = 64;

    static final int HOST_EVENT_PLAYER_HURT = 1;
    static final int HOST_EVENT_TELEPORT = 2;
    static final int HOST_EVENT_WORLD_CHANGED = 3;

    static final int MC_EVENT_HIT_ENTITY = 1;
    static final int MC_EVENT_USE_ENTITY = 2;
    static final int MC_EVENT_PLAYER_DIED = 3;
    static final int MC_EVENT_EXPLOSION = 4;
    static final int MC_EVENT_BLOCK_CHANGED = 5;

    static final int COLLISION_PAD = 0;
    static final int COLLISION_CLEAR = 1;
    static final int COLLISION_TRIANGLES = 2;
    static final int COLLISION_BOXES = 3;
}
