package com.paperchalk.world;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.TextView;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Real-WebView smoke checks without external test framework dependencies. */
public final class SmokeInstrumentation extends Instrumentation {
    private Bundle arguments;
    private Activity activity;

    @Override
    public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        this.arguments = arguments == null ? new Bundle() : arguments;
        start();
    }

    @Override
    public void onStart() {
        Bundle result = new Bundle();
        try {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.setClassName(getTargetContext().getPackageName(), MainActivity.class.getName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity = startActivitySync(intent);
            awaitCurrentVersion();
            WebView page = getWebView();
            String expectedVersion = arguments.getString("expectedVersion", "");
            String url = getUrl(page);
            require(url.startsWith(ChannelRelease.ORIGIN + ChannelRelease.APP_PATH + "releases/"),
                    "App did not load the immutable release directory: " + url);
            if (!expectedVersion.isEmpty()) {
                require(url.contains("/releases/" + expectedVersion + "/"),
                        "Loaded release does not match expectedVersion: " + url);
            }
            awaitScript(page, "Boolean(window.PaperchalkSaveNow && window.PaperchalkSaveNow())", "true");
            String firstDocument = evaluate(page, "String(performance.timeOrigin)");
            runOnMainSync(() -> callActivityOnPause(activity));
            runOnMainSync(() -> callActivityOnResume(activity));
            awaitCurrentVersion();
            require(page == getWebView(), "Unchanged release replaced the WebView");
            require(url.equals(getUrl(page)), "Unchanged release changed navigation");
            require(firstDocument.equals(evaluate(page, "String(performance.timeOrigin)")),
                    "Returning to unchanged release reloaded the game");
            require("true".equals(evaluate(page,
                    "Boolean(document.querySelector('#viewport canvas'))")), "Game canvas is absent");
            result.putString("status", "PASS");
            result.putString("url", url);
            result.putString("checks", "native launch; latest channel; immutable URL; save hook; resume without reload; canvas");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            result.putString("status", "FAIL");
            result.putString("error", error.getClass().getSimpleName() + ": " + error.getMessage());
            finish(Activity.RESULT_CANCELED, result);
        }
    }

    private void awaitCurrentVersion() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 60000;
        String last = "";
        while (SystemClock.elapsedRealtime() < deadline) {
            AtomicReference<String> text = new AtomicReference<>("");
            runOnMainSync(() -> text.set(visibleText(activity.getWindow().getDecorView())));
            last = text.get();
            if (last.contains("已连接最新测试版本")) return;
            SystemClock.sleep(200);
        }
        throw new AssertionError("Native channel did not become ready: " + last);
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
        runOnMainSync(() -> page.evaluateJavascript(script, value -> {
            result.set(value);
            completed.countDown();
        }));
        if (!completed.await(8, TimeUnit.SECONDS)) throw new AssertionError("WebView script timed out");
        return result.get();
    }

    private WebView getWebView() {
        AtomicReference<WebView> result = new AtomicReference<>();
        runOnMainSync(() -> result.set(findWebView(activity.getWindow().getDecorView())));
        require(result.get() != null, "WebView absent");
        return result.get();
    }

    private String getUrl(WebView page) {
        AtomicReference<String> result = new AtomicReference<>();
        runOnMainSync(() -> result.set(page.getUrl()));
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

    private static String visibleText(View view) {
        if (view.getVisibility() != View.VISIBLE) return "";
        if (view instanceof TextView) return ((TextView) view).getText().toString();
        if (!(view instanceof ViewGroup)) return "";
        StringBuilder result = new StringBuilder();
        ViewGroup group = (ViewGroup) view;
        for (int i = 0; i < group.getChildCount(); i++) result.append(visibleText(group.getChildAt(i))).append(' ');
        return result.toString();
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
