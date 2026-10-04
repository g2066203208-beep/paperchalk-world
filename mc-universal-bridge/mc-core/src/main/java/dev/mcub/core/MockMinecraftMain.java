package dev.mcub.core;

import java.util.List;

public final class MockMinecraftMain {
    public static void main(String[] args) throws Exception {
        SharedMemoryLink link = new SharedMemoryLink();
        System.out.println("MCUB mock Minecraft: waiting for Local\\MCUB_v1 ...");

        while (!link.connect()) {
            Thread.sleep(500);
        }

        System.out.println("connected");
        SharedMemoryLink.McState mc = new SharedMemoryLink.McState();
        long frame = 0;

        while (true) {
            link.heartbeat();
            SharedMemoryLink.HostState host = link.readHostState();

            if (host != null && (host.flags() & Protocol.HOST_IN_WORLD) != 0) {
                mc.prevX = mc.curX;
                mc.prevY = mc.curY;
                mc.prevZ = mc.curZ;

                double t = host.gameTimeSeconds();
                mc.curX = Math.cos(t * 0.35) * 2.0;
                mc.curY = 1.0;
                mc.curZ = Math.sin(t * 0.35) * 2.0;
                mc.x = mc.curX;
                mc.y = mc.curY;
                mc.z = mc.curZ;
                mc.yaw = (float) ((t * 20.0) % 360.0);
                mc.frameId = ++frame;
                link.writeMcState(mc);
            }

            List<SharedMemoryLink.Entity> entities = link.readEntities();
            if (!entities.isEmpty() && frame % 120 == 0) {
                var e = entities.getFirst();
                System.out.printf("foreign entity id=%x pos=(%.2f %.2f %.2f) hp=%.1f/%.1f%n",
                    e.id(), e.x(), e.y(), e.z(), e.health(), e.healthMax());
            }

            SharedMemoryLink.CollisionBatch batch;
            while ((batch = link.pollCollision()) != null) {
                System.out.println("collision batch type=" + batch.type() + " bytes=" + batch.payload().length);
            }

            Thread.sleep(16);
        }
    }
}
