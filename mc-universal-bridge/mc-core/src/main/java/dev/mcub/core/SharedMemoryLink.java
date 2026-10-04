package dev.mcub.core;

import static java.lang.foreign.ValueLayout.*;

import java.lang.foreign.Arena;
import java.lang.foreign.FunctionDescriptor;
import java.lang.foreign.Linker;
import java.lang.foreign.MemorySegment;
import java.lang.foreign.SymbolLookup;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.VarHandle;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

final class SharedMemoryLink {
    record HostState(int flags, long worldId, double x, double y, double z,
                     float yaw, float pitch, int viewportW, int viewportH,
                     double gameTimeSeconds, float unitsPerBlock) {}

    record Entity(long id, int kind, int flags, float x, float y, float z,
                  float yaw, float halfX, float halfY, float halfZ,
                  float health, float healthMax, int level, int nameHash) {}

    record CollisionBatch(int type, byte[] payload) {}

    static final class McState {
        int flags = Protocol.MC_IN_WORLD | Protocol.MC_ON_GROUND;
        double x, y, z;
        float yaw, pitch;
        float eyeHeight = 1.62f;
        float fov = 70.0f;
        int cameraMode;
        int teleportAck;
        long frameId;
        double prevX, prevY, prevZ;
        double curX, curY, curZ;
        float tickMs = 50.0f;
    }

    private static final int FILE_MAP_ALL_ACCESS = 0xF001F;
    private static final VarHandle INT = JAVA_INT.varHandle();
    private static final VarHandle LONG = JAVA_LONG.varHandle();

    private final MethodHandle openFileMapping;
    private final MethodHandle mapViewOfFile;
    private final MethodHandle getTickCount64;
    private final MethodHandle getCurrentProcessId;

    private MemorySegment shm;

    SharedMemoryLink() {
        Linker linker = Linker.nativeLinker();
        SymbolLookup k32 = SymbolLookup.libraryLookup("kernel32", Arena.global());
        openFileMapping = linker.downcallHandle(
            k32.find("OpenFileMappingW").orElseThrow(),
            FunctionDescriptor.of(ADDRESS, JAVA_INT, JAVA_INT, ADDRESS)
        );
        mapViewOfFile = linker.downcallHandle(
            k32.find("MapViewOfFile").orElseThrow(),
            FunctionDescriptor.of(ADDRESS, ADDRESS, JAVA_INT, JAVA_INT, JAVA_INT, JAVA_LONG)
        );
        getTickCount64 = linker.downcallHandle(
            k32.find("GetTickCount64").orElseThrow(),
            FunctionDescriptor.of(JAVA_LONG)
        );
        getCurrentProcessId = linker.downcallHandle(
            k32.find("GetCurrentProcessId").orElseThrow(),
            FunctionDescriptor.of(JAVA_INT)
        );
    }

    boolean connect() {
        if (shm != null) return true;
        try (Arena arena = Arena.ofConfined()) {
            MemorySegment name = arena.allocateFrom(Protocol.MAPPING_NAME, StandardCharsets.UTF_16LE);
            MemorySegment handle = (MemorySegment) openFileMapping.invokeExact(FILE_MAP_ALL_ACCESS, 0, name);
            if (handle.address() == 0) return false;
            MemorySegment view = (MemorySegment) mapViewOfFile.invokeExact(
                handle, FILE_MAP_ALL_ACCESS, 0, 0, 0L
            );
            if (view.address() == 0) return false;
            MemorySegment candidate = view.reinterpret(Protocol.MAPPING_BYTES);
            if (candidate.get(JAVA_INT, Protocol.OFF_HEADER + Protocol.H_MAGIC) != Protocol.MAGIC ||
                candidate.get(JAVA_INT, Protocol.OFF_HEADER + Protocol.H_VERSION) != Protocol.VERSION) {
                throw new IllegalStateException("MCUB protocol mismatch");
            }
            candidate.set(JAVA_INT, Protocol.OFF_HEADER + Protocol.H_MC_PID,
                (int) getCurrentProcessId.invokeExact());
            shm = candidate;
            heartbeat();
            return true;
        } catch (Throwable t) {
            throw new RuntimeException(t);
        }
    }

    void heartbeat() {
        if (shm == null) return;
        LONG.setRelease(shm, Protocol.OFF_HEADER + Protocol.H_MC_HEARTBEAT, tickCount());
    }

    long tickCount() {
        try {
            return (long) getTickCount64.invokeExact();
        } catch (Throwable t) {
            throw new RuntimeException(t);
        }
    }

    HostState readHostState() {
        if (shm == null) return null;
        long b = Protocol.OFF_HOST_STATE;
        for (int attempt = 0; attempt < 100; attempt++) {
            int s1 = (int) INT.getAcquire(shm, b);
            if ((s1 & 1) != 0 || s1 == 0) {
                Thread.onSpinWait();
                continue;
            }
            int flags = shm.get(JAVA_INT, b + 4);
            long worldId = shm.get(JAVA_LONG, b + 8);
            double x = shm.get(JAVA_DOUBLE, b + 16);
            double y = shm.get(JAVA_DOUBLE, b + 24);
            double z = shm.get(JAVA_DOUBLE, b + 32);
            float yaw = shm.get(JAVA_FLOAT, b + 40);
            float pitch = shm.get(JAVA_FLOAT, b + 44);
            int w = shm.get(JAVA_INT, b + 48);
            int h = shm.get(JAVA_INT, b + 52);
            double time = shm.get(JAVA_DOUBLE, b + 56);
            float units = shm.get(JAVA_FLOAT, b + 64);
            VarHandle.loadLoadFence();
            if ((int) INT.getAcquire(shm, b) == s1) {
                return new HostState(flags, worldId, x, y, z, yaw, pitch, w, h, time, units);
            }
        }
        return null;
    }

    void writeMcState(McState st) {
        if (shm == null) return;
        long b = Protocol.OFF_MC_STATE;
        int seq = shm.get(JAVA_INT, b);
        INT.setRelease(shm, b, seq + 1);
        VarHandle.storeStoreFence();

        shm.set(JAVA_INT, b + 4, st.flags);
        shm.set(JAVA_DOUBLE, b + 8, st.x);
        shm.set(JAVA_DOUBLE, b + 16, st.y);
        shm.set(JAVA_DOUBLE, b + 24, st.z);
        shm.set(JAVA_FLOAT, b + 32, st.yaw);
        shm.set(JAVA_FLOAT, b + 36, st.pitch);
        shm.set(JAVA_FLOAT, b + 40, st.eyeHeight);
        shm.set(JAVA_FLOAT, b + 44, st.fov);
        shm.set(JAVA_INT, b + 48, st.cameraMode);
        shm.set(JAVA_INT, b + 52, st.teleportAck);
        shm.set(JAVA_LONG, b + 56, st.frameId);
        shm.set(JAVA_DOUBLE, b + 64, st.prevX);
        shm.set(JAVA_DOUBLE, b + 72, st.prevY);
        shm.set(JAVA_DOUBLE, b + 80, st.prevZ);
        shm.set(JAVA_DOUBLE, b + 88, st.curX);
        shm.set(JAVA_DOUBLE, b + 96, st.curY);
        shm.set(JAVA_DOUBLE, b + 104, st.curZ);
        shm.set(JAVA_FLOAT, b + 112, st.tickMs);

        INT.setRelease(shm, b, seq + 2);
    }

    List<Entity> readEntities() {
        List<Entity> result = new ArrayList<>();
        if (shm == null) return result;
        long b = Protocol.OFF_ENTITY_TABLE;
        for (int attempt = 0; attempt < 50; attempt++) {
            int s1 = (int) INT.getAcquire(shm, b);
            if ((s1 & 1) != 0 || s1 == 0) continue;
            int count = Math.min(shm.get(JAVA_INT, b + 4), Protocol.MAX_ENTITIES);
            result.clear();
            long p = b + 64;
            for (int i = 0; i < count; i++, p += Protocol.ENTITY_BYTES) {
                result.add(new Entity(
                    shm.get(JAVA_LONG, p),
                    shm.get(JAVA_INT, p + 8),
                    shm.get(JAVA_INT, p + 12),
                    shm.get(JAVA_FLOAT, p + 16),
                    shm.get(JAVA_FLOAT, p + 20),
                    shm.get(JAVA_FLOAT, p + 24),
                    shm.get(JAVA_FLOAT, p + 28),
                    shm.get(JAVA_FLOAT, p + 32),
                    shm.get(JAVA_FLOAT, p + 36),
                    shm.get(JAVA_FLOAT, p + 40),
                    shm.get(JAVA_FLOAT, p + 44),
                    shm.get(JAVA_FLOAT, p + 48),
                    shm.get(JAVA_INT, p + 52),
                    shm.get(JAVA_INT, p + 60)
                ));
            }
            VarHandle.loadLoadFence();
            if ((int) INT.getAcquire(shm, b) == s1) return result;
        }
        return List.of();
    }

    CollisionBatch pollCollision() {
        if (shm == null) return null;
        long ring = Protocol.OFF_COLLISION_RING;
        long head = (long) LONG.getAcquire(shm, ring);
        long tail = (long) LONG.getAcquire(shm, ring + 0x40);
        if (tail >= head) return null;

        long capacity = Protocol.COLLISION_RING_BYTES - Protocol.RING_DATA;
        long pos = tail % capacity;
        long data = ring + Protocol.RING_DATA;
        int type = shm.get(JAVA_INT, data + pos);
        int payloadBytes = shm.get(JAVA_INT, data + pos + 4);

        if (type == Protocol.COLLISION_PAD) {
            tail += capacity - pos;
            LONG.setRelease(shm, ring + 0x40, tail);
            return pollCollision();
        }

        byte[] payload = new byte[payloadBytes];
        MemorySegment.copy(shm, JAVA_BYTE, data + pos + 8, payload, 0, payloadBytes);
        long used = (8L + payloadBytes + 7L) & ~7L;
        LONG.setRelease(shm, ring + 0x40, tail + used);
        return new CollisionBatch(type, payload);
    }
}
