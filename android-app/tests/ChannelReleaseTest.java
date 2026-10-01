package com.paperchalk.world;

/** Dependency-free JVM checks; run with javac/java in CI or locally. */
public final class ChannelReleaseTest {
    private static final String VERSION = "a1d919ed99665dc19f8594fd111e37a65b0df3a3";
    private static final String ENTRY = "releases/" + VERSION + "/studio/index.html";
    private static final String DATE = "2026-10-01T08:00:00Z";
    private static int checks;

    public static void main(String[] args) {
        ChannelRelease release = valid();
        check(release.version.equals(VERSION), "version retained");
        check(release.shortVersion().equals("a1d919e"), "short version");
        check(release.url().equals(ChannelRelease.ORIGIN + ChannelRelease.APP_PATH + ENTRY), "release URL");
        check(release.permitsNavigation(release.url()), "canonical entry");
        check(release.permitsNavigation(release.url() + "?display=1#settings"), "same-document parameters");
        check(release.permitsNavigation(release.url().replace("index.html", "")), "same directory index");
        check(!release.permitsNavigation("http:" + release.url().substring(6)), "reject cleartext");
        check(!release.permitsNavigation(release.url().replace("github.io", "github.io.evil.test")), "reject host suffix");
        check(!release.permitsNavigation(release.url().replace("https://", "https://user@")), "reject credentials");
        check(!release.permitsNavigation(release.url().replace("github.io/", "github.io:444/")), "reject other port");
        check(!release.permitsNavigation(release.url().replace(VERSION, "abcdef0")), "reject other release");
        check(!release.permitsNavigation(release.url().replace("/studio/", "/studio/../studio/")), "reject traversal");
        check(!release.permitsNavigation(release.url().replace("/studio/", "/%73tudio/")), "reject encoded path");
        check(!release.permitsNavigation("javascript:alert(1)"), "reject JS navigation");
        check(!release.permitsNavigation(null), "reject missing URL");
        reject(() -> ChannelRelease.validate(2, VERSION, ENTRY, DATE, 5), "unsupported schema");
        reject(() -> ChannelRelease.validate(1, "HEAD", ENTRY, DATE, 5), "invalid revision");
        reject(() -> ChannelRelease.validate(1, "abcdef", ENTRY, DATE, 5), "short revision");
        reject(() -> ChannelRelease.validate(1, null, ENTRY, DATE, 5), "missing revision");
        reject(() -> ChannelRelease.validate(1, VERSION, "https://evil.test/index.html", DATE, 5), "foreign entry");
        reject(() -> ChannelRelease.validate(1, VERSION, "../studio/index.html", DATE, 5), "relative traversal");
        reject(() -> ChannelRelease.validate(1, VERSION, ENTRY.replace(VERSION, "abcdef0"), DATE, 5), "revision mismatch");
        reject(() -> ChannelRelease.validate(1, VERSION, ENTRY + "?x=1", DATE, 5), "entry query");
        reject(() -> ChannelRelease.validate(1, VERSION, ENTRY.replace("/studio/", "/%73tudio/"), DATE, 5), "encoded entry");
        reject(() -> ChannelRelease.validate(1, VERSION, ENTRY, "tomorrow", 5), "invalid date");
        reject(() -> ChannelRelease.validate(1, VERSION, ENTRY, null, 5), "missing date");
        reject(() -> ChannelRelease.validate(1, VERSION, ENTRY, DATE, 0), "invalid minimum shell");
        try {
            ChannelRelease.validate(1, VERSION, ENTRY, DATE, 6);
            throw new AssertionError("new shell must be required");
        } catch (ChannelRelease.ShellUpgradeRequiredException expected) { checks++; }
        System.out.println("PASS: " + checks + " Android channel validation checks");
    }

    private static ChannelRelease valid() {
        return ChannelRelease.validate(1, VERSION, ENTRY, DATE, 5);
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
        checks++;
    }

    private static void reject(Runnable action, String message) {
        try {
            action.run();
            throw new AssertionError("Accepted " + message);
        } catch (IllegalArgumentException expected) { checks++; }
    }
}
