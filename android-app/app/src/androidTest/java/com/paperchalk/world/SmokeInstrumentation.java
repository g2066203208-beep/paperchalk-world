package com.paperchalk.world;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.TextView;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/** Real-WebView smoke checks with bounded waits and no external test framework. */
public final class SmokeInstrumentation extends Instrumentation {
    private static final String TAG = "PaperchalkSmoke";
    // Cold CI WebView/GLES initialization shares CPUs with Android first-boot jobs.
    private static final long MAIN_STEP_SECONDS = 30;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final CountDownLatch activityResumed = new CountDownLatch(1);
    private final AtomicBoolean finished = new AtomicBoolean();
    private final ScheduledExecutorService watchdog = Executors.newSingleThreadScheduledExecutor();
    private volatile Activity activity;
    private volatile String phase = "runner-create";
    private volatile long startedAt;
    private volatile String channelDiagnostic = "not requested";
    private Bundle arguments;

    @Override
    public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        this.arguments = arguments == null ? new Bundle() : arguments;
        start();
    }

    @Override
    public void callActivityOnResume(Activity candidate) {
        super.callActivityOnResume(candidate);
        if (candidate instanceof MainActivity) {
            activity = candidate;
            activityResumed.countDown();
        }
    }

    @Override
    public void onStart() {
        startedAt = SystemClock.elapsedRealtime();
        watchdog.schedule(() -> fail(new AssertionError(
                "Overall 180-second watchdog expired during " + phase)), 180, TimeUnit.SECONDS);
        try {
            markPhase("launch-request");
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.setClassName(getTargetContext().getPackageName(), MainActivity.class.getName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            // startActivitySync waits for application idleness without a deadline.
            // A continuously rendering WebView need not become idle.
            runMainBounded("request Activity launch", () -> getTargetContext().startActivity(intent));
            markPhase("wait-activity-resume");
            require(activityResumed.await(20, TimeUnit.SECONDS), "Activity did not resume within 20 seconds");

            markPhase("wait-initial-channel");
            awaitCurrentVersion();
            markPhase("check-release-url");
            WebView page = getWebView();
            String expectedVersion = arguments.getString("expectedVersion", "");
            String url = getUrl(page);
            require(url.startsWith(ChannelRelease.ORIGIN + ChannelRelease.APP_PATH + "releases/"),
                    "App did not load the immutable release directory: " + url);
            if (!expectedVersion.isEmpty()) {
                require(url.contains("/releases/" + expectedVersion + "/"),
                        "Loaded release does not match expectedVersion: " + url);
            }

            markPhase("wait-studio-save-hook");
            awaitScript(page, "Boolean(window.PaperchalkSaveNow && window.PaperchalkSaveNow())", "true");
            markPhase("read-document-identity");
            String firstDocument = evaluate(page, "String(performance.timeOrigin)");
            markPhase("pause-activity");
            runMainBounded("pause Activity", () -> callActivityOnPause(activity));
            markPhase("resume-activity");
            runMainBounded("resume Activity", () -> callActivityOnResume(activity));
            markPhase("wait-resumed-channel");
            awaitCurrentVersion();
            markPhase("check-resume-preservation");
            require(page == getWebView(), "Unchanged release replaced the WebView");
            require(url.equals(getUrl(page)), "Unchanged release changed navigation");
            require(firstDocument.equals(evaluate(page, "String(performance.timeOrigin)")),
                    "Returning to unchanged release reloaded the game");
            markPhase("check-game-canvas");
            require("true".equals(evaluate(page,
                    "Boolean(document.querySelector('#viewport canvas'))")), "Game canvas is absent");
            markPhase("check-fullscreen-game");
            require("true".equals(evaluate(page,
                    "Boolean(document.body.classList.contains('game-mode') && getComputedStyle(document.querySelector('.app-header')).display === 'none' && document.querySelector('#viewport').clientHeight === innerHeight)")),
                    "Game did not use the full viewport");
            SystemClock.sleep(1600);
            runMainBounded("check native fullscreen layout", () -> {
                View root = (View) field("root");
                View strip = (View) field("statusStrip");
                require(page.getWidth() == root.getWidth() && page.getHeight() == root.getHeight(),
                        "Native chrome reduced the game area");
                require(strip.getVisibility() == View.GONE, "Successful status overlay did not hide");
            });

            Bundle result = new Bundle();
            result.putString("status", "PASS");
            result.putString("url", url);
            result.putString("checks", "native launch; latest channel; immutable URL; save hook; resume without reload; fullscreen canvas; hidden native overlay");
            complete(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            fail(error);
        }
    }

    private void markPhase(String next) {
        require(!finished.get(), "Runner already ended");
        phase = next;
        long elapsed = SystemClock.elapsedRealtime() - startedAt;
        Log.i(TAG, "PHASE " + next + " at " + elapsed + "ms");
        Bundle update = new Bundle();
        update.putString("phase", next);
        update.putLong("elapsed_ms", elapsed);
        update.putString("stream", "\nPHASE " + next + " (" + elapsed + "ms)\n");
        sendStatus(0, update);
    }

    private void fail(Throwable error) {
        Log.e(TAG, "FAIL during " + phase, error);
        Bundle result = new Bundle();
        result.putString("status", "FAIL");
        result.putString("error", error.getClass().getSimpleName() + ": " + error.getMessage());
        result.putString("channel_probe", channelDiagnostic);
        complete(Activity.RESULT_CANCELED, result);
    }

    private void complete(int code, Bundle result) {
        if (!finished.compareAndSet(false, true)) return;
        result.putString("phase", phase);
        result.putLong("elapsed_ms", SystemClock.elapsedRealtime() - startedAt);
        watchdog.shutdownNow();
        finish(code, result);
    }

    private void runMainBounded(String description, Runnable action) throws Exception {
        require(!finished.get(), "Runner already ended before " + description);
        CountDownLatch completed = new CountDownLatch(1);
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Runnable queued = () -> {
            try {
                if (!finished.get()) action.run();
            } catch (Throwable error) {
                failure.set(error);
            } finally {
                completed.countDown();
            }
        };
        require(main.post(queued), "Main looper rejected " + description);
        if (!completed.await(MAIN_STEP_SECONDS, TimeUnit.SECONDS)) {
            main.removeCallbacks(queued);
            throw new AssertionError("Main-thread step exceeded " + MAIN_STEP_SECONDS
                    + " seconds: " + description + " during " + phase);
        }
        if (failure.get() != null) throw new AssertionError(
                "Main-thread step failed: " + description, failure.get());
        require(!finished.get(), "Runner ended during " + description);
    }

    private void awaitCurrentVersion() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 60000;
        String last = "";
        boolean diagnosed = false;
        while (SystemClock.elapsedRealtime() < deadline) {
            AtomicReference<String> text = new AtomicReference<>("");
            AtomicBoolean confirmed = new AtomicBoolean();
            runMainBounded("read native status", () -> {
                text.set(((TextView) field("status")).getText().toString());
                confirmed.set(Boolean.TRUE.equals(field("loaded"))
                        && Boolean.TRUE.equals(field("latestConfirmed"))
                        && Boolean.FALSE.equals(field("checking")));
            });
            last = text.get();
            if (confirmed.get() && last.contains("已连接最新测试版本")) return;
            if (!diagnosed && (last.contains("无法检查最新版本")
                    || last.contains("新版内容需要更新 App 安装包"))) {
                diagnosed = true;
                String waitingPhase = phase;
                markPhase(waitingPhase + "-probe-channel");
                boolean channelReachable = probeChannel();
                if (channelReachable) {
                    AtomicBoolean clicked = new AtomicBoolean();
                    runMainBounded("retry native channel after successful diagnostic probe", () -> {
                        View button = findRetry(activity.getWindow().getDecorView());
                        if (button != null) clicked.set(button.performClick());
                    });
                    diagnostic("channel_retry", clicked.get()
                            ? "Clicked visible native retry once after successful probe"
                            : "Native retry was unavailable; still waiting for real UI state");
                }
                markPhase(waitingPhase);
            }
            SystemClock.sleep(200);
        }
        throw new AssertionError("Native channel did not become ready: " + last);
    }

    private boolean probeChannel() throws Exception {
        // Reuse the exact production fetch/validation code but do not change App state.
        // The diagnostic worker cannot occupy the UI thread or wait indefinitely on DNS.
        ExecutorService probe = Executors.newSingleThreadExecutor(task -> {
            Thread thread = new Thread(task, "PaperchalkChannelDiagnostic");
            thread.setDaemon(true);
            return thread;
        });
        Future<ChannelRelease> pending = probe.submit(() -> {
            Method fetch = MainActivity.class.getDeclaredMethod("fetchRelease");
            fetch.setAccessible(true);
            return (ChannelRelease) fetch.invoke(activity);
        });
        try {
            ChannelRelease release = pending.get(20, TimeUnit.SECONDS);
            channelDiagnostic = "SUCCESS version=" + release.version + " entry=" + release.entry;
            diagnostic("channel_probe", channelDiagnostic);
            return true;
        } catch (TimeoutException error) {
            channelDiagnostic = "TIMEOUT: production channel fetch did not complete within 20 seconds";
            diagnostic("channel_probe", channelDiagnostic);
            return false;
        } catch (ExecutionException error) {
            Throwable cause = error.getCause();
            while (cause instanceof InvocationTargetException && cause.getCause() != null) {
                cause = cause.getCause();
            }
            StringBuilder detail = new StringBuilder("FAILURE: ");
            for (int depth = 0; cause != null && depth < 4; depth++, cause = cause.getCause()) {
                if (depth > 0) detail.append("; caused by ");
                detail.append(cause.getClass().getName()).append(": ").append(cause.getMessage());
            }
            channelDiagnostic = detail.toString();
            diagnostic("channel_probe", channelDiagnostic);
            return false;
        } finally {
            pending.cancel(true);
            probe.shutdownNow();
        }
    }

    private void diagnostic(String key, String message) {
        if (finished.get()) return;
        Log.i(TAG, key + ": " + message);
        Bundle update = new Bundle();
        update.putString("phase", phase);
        update.putString(key, message);
        update.putString("stream", "\nDIAGNOSTIC " + key + ": " + message + "\n");
        sendStatus(0, update);
    }

    private static View findRetry(View view) {
        if (!view.isShown() || !view.isEnabled()) return null;
        if (view instanceof TextView && "重试".contentEquals(((TextView) view).getText())
                && view.isClickable()) return view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                View found = findRetry(group.getChildAt(i));
                if (found != null) return found;
            }
        }
        return null;
    }

    private void awaitScript(WebView page, String script, String expected) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 60000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if (expected.equals(evaluate(page, script))) return;
            SystemClock.sleep(200);
        }
        throw new AssertionError("Studio was not ready for: " + script);
    }

    private String evaluate(WebView page, String script) throws Exception {
        CountDownLatch completed = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        runMainBounded("dispatch WebView script", () -> page.evaluateJavascript(script, value -> {
            result.set(value);
            completed.countDown();
        }));
        if (!completed.await(8, TimeUnit.SECONDS)) {
            throw new AssertionError("WebView script callback exceeded 8 seconds during " + phase);
        }
        return result.get();
    }

    private WebView getWebView() throws Exception {
        AtomicReference<WebView> result = new AtomicReference<>();
        runMainBounded("find WebView",
                () -> result.set(findWebView(activity.getWindow().getDecorView())));
        require(result.get() != null, "WebView absent");
        return result.get();
    }

    private String getUrl(WebView page) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        runMainBounded("read WebView URL", () -> result.set(page.getUrl()));
        return result.get() == null ? "" : result.get();
    }

    private static WebView findWebView(View view) {
        if (view instanceof WebView) return (WebView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                WebView found = findWebView(group.getChildAt(i));
                if (found != null) return found;
            }
        }
        return null;
    }

    private Object field(String name) {
        try {
            Field field = MainActivity.class.getDeclaredField(name);
            field.setAccessible(true);
            return field.get(activity);
        } catch (ReflectiveOperationException error) {
            throw new AssertionError("Missing native state: " + name, error);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
