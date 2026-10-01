package com.paperchalk.world;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

/** Validates the public release pointer before any WebView navigation. */
public final class ChannelRelease {
    public static final int SHELL_VERSION = 5;
    public static final String ORIGIN = "https://g2066203208-beep.github.io";
    public static final String APP_PATH = "/paperchalk-world/app/";
    public static final String CHANNEL_URL = ORIGIN + APP_PATH + "channel.json";
    private static final Pattern VERSION = Pattern.compile("[a-f0-9]{7,40}");

    public final String version;
    public final String entry;
    public final String publishedAt;
    public final int minShellVersion;

    private ChannelRelease(String version, String entry, String publishedAt,
            int minShellVersion) {
        this.version = version;
        this.entry = entry;
        this.publishedAt = publishedAt;
        this.minShellVersion = minShellVersion;
    }

    public static ChannelRelease validate(int schemaVersion, String version,
            String entry, String publishedAt, int minShellVersion) {
        if (schemaVersion != 1) throw new IllegalArgumentException("Unsupported release schema");
        if (version == null || !VERSION.matcher(version).matches()) {
            throw new IllegalArgumentException("Invalid release version");
        }
        // Exact equality rejects absolute URLs, encoded paths, queries, fragments,
        // backslashes and traversal before URI resolution.
        String expectedEntry = "releases/" + version + "/studio/index.html";
        if (!expectedEntry.equals(entry)) {
            throw new IllegalArgumentException("Release entry does not match its version");
        }
        if (minShellVersion < 1) throw new IllegalArgumentException("Invalid shell version");
        if (minShellVersion > SHELL_VERSION) throw new ShellUpgradeRequiredException();
        try {
            Instant.parse(publishedAt);
        } catch (DateTimeParseException | NullPointerException error) {
            throw new IllegalArgumentException("Invalid publication time", error);
        }
        return new ChannelRelease(version, entry, publishedAt, minShellVersion);
    }

    public String url() {
        return ORIGIN + APP_PATH + entry;
    }

    public String shortVersion() {
        return version.substring(0, 7);
    }

    public boolean permitsNavigation(String url) {
        if (url == null) return false;
        try {
            URI uri = new URI(url);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || !"g2066203208-beep.github.io".equalsIgnoreCase(uri.getHost())
                    || uri.getRawUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443)) return false;
            String expected = APP_PATH + entry;
            String rawPath = uri.getRawPath();
            return expected.equals(rawPath)
                    || expected.substring(0, expected.length() - "index.html".length()).equals(rawPath);
        } catch (URISyntaxException error) {
            return false;
        }
    }

    public static final class ShellUpgradeRequiredException extends IllegalArgumentException {
        public ShellUpgradeRequiredException() {
            super("This release requires a newer Android app");
        }
    }
}
