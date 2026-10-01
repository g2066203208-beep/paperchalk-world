package com.paperchalk.world;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.net.ssl.HttpsURLConnection;

/** Small Android shell; the published release is the source of game content. */
public class MainActivity extends Activity {
    private static final int PAPER = Color.rgb(238, 232, 217);
    private static final int INK = Color.rgb(50, 55, 43);
    private static final int WARNING = Color.rgb(141, 73, 24);
    private static final String SAVED_RELEASE = "last_verified_release";
    private static final String SAVE_SCRIPT = "(function(){try{return !!(window.PaperchalkSaveNow && window.PaperchalkSaveNow());}catch(e){return false;}})()";
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();

    private LinearLayout root;
    private FrameLayout viewport;
    private TextView status;
    private ProgressBar progress;
    private Button retry;
    private WebView webView;
    private SharedPreferences preferences;
    private ChannelRelease currentRelease;
    private ChannelRelease cachedRelease;
    private boolean checking;
    private boolean loaded;
    private boolean loadFailed;
    private boolean latestConfirmed;
    private boolean destroyed;
    private boolean resumed;
    private int checkGeneration;
    private int navigationGeneration;
    private int rendererCrashes;
    private long crashWindowStart;
    private String updateWarning;
    private String verifiedVersion;
    private OnBackInvokedCallback backCallback;
    private boolean backPending;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        preferences = getSharedPreferences("paperchalk-test-channel", MODE_PRIVATE);
        cachedRelease = readCachedRelease();
        createLayout();
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
        if (createWebView()) setStatus("正在连接最新测试版本…", true, false, false);
        // onResume also covers cold starts, so only one request is made on launch.
    }

    private void createLayout() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(PAPER);
        LinearLayout strip = new LinearLayout(this);
        strip.setGravity(Gravity.CENTER_VERTICAL);
        strip.setPadding(dp(12), dp(2), dp(8), dp(2));
        strip.setMinimumHeight(dp(44));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleSmall);
        strip.addView(progress, new LinearLayout.LayoutParams(dp(18), dp(18)));
        status = new TextView(this);
        status.setTextColor(INK);
        status.setTextSize(12);
        status.setPadding(dp(8), 0, dp(4), 0);
        status.setMaxLines(2);
        strip.addView(status, new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        retry = new Button(this);
        retry.setText("重试");
        retry.setTextSize(12);
        retry.setTextColor(INK);
        retry.setMinHeight(0);
        retry.setMinimumHeight(0);
        retry.setMinWidth(0);
        retry.setMinimumWidth(0);
        retry.setPadding(dp(8), 0, dp(8), 0);
        retry.setOnClickListener(ignored -> {
            if (webView == null) {
                rendererCrashes = 0;
                if (!createWebView()) return;
            }
            checkForUpdates();
        });
        strip.addView(retry, new LinearLayout.LayoutParams(dp(60), dp(44)));
        root.addView(strip, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        viewport = new FrameLayout(this);
        root.addView(viewport, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets safe = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else {
                int left = insets.getSystemWindowInsetLeft();
                int top = insets.getSystemWindowInsetTop();
                int right = insets.getSystemWindowInsetRight();
                int bottom = insets.getSystemWindowInsetBottom();
                if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                    left = Math.max(left, insets.getDisplayCutout().getSafeInsetLeft());
                    top = Math.max(top, insets.getDisplayCutout().getSafeInsetTop());
                    right = Math.max(right, insets.getDisplayCutout().getSafeInsetRight());
                    bottom = Math.max(bottom, insets.getDisplayCutout().getSafeInsetBottom());
                }
                view.setPadding(left, top, right, bottom);
            }
            return insets;
        });
        setContentView(root);
        root.requestApplyInsets();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private boolean createWebView() {
        try {
            WebView next = new WebView(this);
            webView = next;
            next.setBackgroundColor(PAPER);
            WebSettings settings = next.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setSafeBrowsingEnabled(true);
            settings.setGeolocationEnabled(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setSupportMultipleWindows(false);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            settings.setUserAgentString(settings.getUserAgentString()
                    + " PaperchalkShell/" + ChannelRelease.SHELL_VERSION);
            next.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
            next.setWebViewClient(new GameClient());
            next.setWebChromeClient(new WebChromeClient());
            viewport.addView(next, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            return true;
        } catch (RuntimeException | LinkageError error) {
            destroyWebView();
            setStatus("网页组件启动失败，请更新 Android System WebView 后重试", false, true, true);
            return false;
        }
    }

    private void checkForUpdates() {
        if (destroyed || checking || webView == null) return;
        checking = true;
        latestConfirmed = false;
        updateWarning = null;
        final int generation = ++checkGeneration;
        setStatus("正在检查最新测试版本" + versionSuffix(), true, false, false);
        network.execute(() -> {
            ChannelRelease release = null;
            Exception failure = null;
            try {
                release = fetchRelease();
            } catch (IOException | JSONException | IllegalArgumentException error) {
                failure = error;
            }
            final ChannelRelease result = release;
            final Exception error = failure;
            main.post(() -> {
                if (destroyed || generation != checkGeneration) return;
                checking = false;
                if (error != null) {
                    channelUnavailable(error);
                    return;
                }
                latestConfirmed = true;
                verifiedVersion = result.version;
                updateWarning = null;
                if (currentRelease != null && result.version.equals(currentRelease.version)
                        && !loadFailed) {
                    if (loaded) showCurrentStatus();
                    else setStatus("正在载入测试版本 · " + result.shortVersion(), true, false, false);
                    return;
                }
                switchRelease(result);
            });
        });
    }

    private ChannelRelease fetchRelease() throws IOException, JSONException {
        URL url = new URL(ChannelRelease.CHANNEL_URL + "?check=" + System.currentTimeMillis());
        HttpsURLConnection connection = (HttpsURLConnection) url.openConnection();
        connection.setConnectTimeout(6500);
        connection.setReadTimeout(8500);
        connection.setInstanceFollowRedirects(false);
        connection.setUseCaches(false);
        connection.setRequestProperty("Cache-Control", "no-cache, no-store, max-age=0");
        connection.setRequestProperty("Pragma", "no-cache");
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "PaperchalkShell/" + ChannelRelease.SHELL_VERSION);
        try {
            int code = connection.getResponseCode();
            if (code != 200) throw new IOException("Release channel HTTP " + code);
            try (InputStream input = connection.getInputStream();
                    ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (output.size() + count > 65536) throw new IOException("Release manifest too large");
                    output.write(buffer, 0, count);
                }
                return parseRelease(new String(output.toByteArray(), StandardCharsets.UTF_8));
            }
        } finally {
            connection.disconnect();
        }
    }

    private ChannelRelease parseRelease(String json) throws JSONException {
        JSONObject value = new JSONObject(json);
        return ChannelRelease.validate(integer(value, "schemaVersion"), value.getString("version"),
                value.getString("entry"), value.getString("publishedAt"), integer(value, "minShellVersion"));
    }

    private static int integer(JSONObject value, String key) throws JSONException {
        Object number = value.get(key);
        if (!(number instanceof Number)) throw new JSONException("Invalid integer: " + key);
        Number n = (Number) number;
        if (n.doubleValue() != n.intValue()) throw new JSONException("Invalid integer: " + key);
        return n.intValue();
    }

    private void channelUnavailable(Exception error) {
        latestConfirmed = false;
        verifiedVersion = null;
        updateWarning = error instanceof ChannelRelease.ShellUpgradeRequiredException
                ? "新版内容需要更新 App 安装包" : "无法检查最新版本，请检查网络后重试";
        if (loaded && !loadFailed) {
            showCurrentStatus();
        } else if (cachedRelease != null) {
            // This is only a last-known URL. A complete offline bundle is not promised.
            loadRelease(cachedRelease);
        } else {
            setStatus(updateWarning + "；尚无可用历史版本", false, true, true);
        }
    }

    private void switchRelease(ChannelRelease release) {
        if (!loaded || loadFailed || currentRelease == null) {
            loadRelease(release);
            return;
        }
        setStatus("发现新版本，正在保存当前进度…", true, false, false);
        final WebView previous = webView;
        final int expectedNavigation = navigationGeneration;
        final boolean[] completed = {false};
        Runnable timedOut = () -> {
            if (completed[0] || destroyed || previous != webView
                    || expectedNavigation != navigationGeneration) return;
            completed[0] = true;
            updateWarning = "发现新版本，保存未获确认；暂留当前版本，请重试";
            showCurrentStatus();
        };
        main.postDelayed(timedOut, 1500);
        try {
            previous.evaluateJavascript(SAVE_SCRIPT, saved -> {
                if (completed[0] || destroyed || previous != webView
                        || expectedNavigation != navigationGeneration) return;
                completed[0] = true;
                main.removeCallbacks(timedOut);
                if ("true".equals(saved)) loadRelease(release);
                else {
                    updateWarning = "发现新版本，但进度保存失败；暂留当前版本，请重试";
                    showCurrentStatus();
                }
            });
        } catch (RuntimeException error) {
            timedOut.run();
        }
    }

    private void loadRelease(ChannelRelease release) {
        if (destroyed || webView == null) return;
        currentRelease = release;
        final int generation = ++navigationGeneration;
        loaded = false;
        loadFailed = false;
        webView.stopLoading();
        setStatus((latestConfirmed ? "载入最新测试版本 · " : "未能检查更新，尝试上次版本 · ")
                + release.shortVersion(), true, !latestConfirmed, false);
        webView.loadUrl(release.url());
        main.postDelayed(() -> {
            if (!destroyed && generation == navigationGeneration && !loaded && !loadFailed) {
                webView.stopLoading();
                failPage("测试内容载入超时，请检查网络并重试");
            }
        }, 30000);
    }

    private ChannelRelease readCachedRelease() {
        String json = preferences.getString(SAVED_RELEASE, null);
        if (json == null) return null;
        try {
            return parseRelease(json);
        } catch (JSONException | IllegalArgumentException error) {
            preferences.edit().remove(SAVED_RELEASE).apply();
            return null;
        }
    }

    private void rememberRelease(ChannelRelease release) {
        try {
            JSONObject value = new JSONObject();
            value.put("schemaVersion", 1);
            value.put("version", release.version);
            value.put("entry", release.entry);
            value.put("publishedAt", release.publishedAt);
            value.put("minShellVersion", release.minShellVersion);
            preferences.edit().putString(SAVED_RELEASE, value.toString()).apply();
            cachedRelease = release;
        } catch (JSONException ignored) {
            // Failure to remember a URL must not interrupt an already loaded game.
        }
    }

    private final class GameClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            boolean permitted = currentRelease != null
                    && currentRelease.permitsNavigation(request.getUrl().toString());
            if (!permitted && request.isForMainFrame()) {
                Toast.makeText(MainActivity.this, "App 只打开已验证的测试内容", Toast.LENGTH_SHORT).show();
            }
            return !permitted;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (destroyed || view != webView || currentRelease == null
                    || !currentRelease.permitsNavigation(url) || loadFailed) return;
            loaded = true;
            rememberRelease(currentRelease);
            view.clearHistory();
            notifyPage(resumed ? "resume" : "pause");
            showCurrentStatus();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (view == webView && request.isForMainFrame() && currentRelease != null
                    && currentRelease.permitsNavigation(request.getUrl().toString())) {
                failPage("测试内容未能载入，请检查网络并重试");
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (view == webView && request.isForMainFrame() && currentRelease != null
                    && currentRelease.permitsNavigation(request.getUrl().toString())) {
                failPage("测试内容暂不可用（HTTP " + response.getStatusCode() + "），请重试");
            }
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            if (view == webView) failPage("安全连接失败，请检查设备时间或网络后重试");
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            if (view != webView) return true;
            long now = SystemClock.elapsedRealtime();
            if (rendererCrashes == 0 || now - crashWindowStart > 300000) {
                rendererCrashes = 0;
                crashWindowStart = now;
            }
            rendererCrashes++;
            checkGeneration++;
            checking = false;
            navigationGeneration++;
            destroyWebView();
            currentRelease = null;
            loaded = false;
            loadFailed = true;
            if (rendererCrashes <= 2 && createWebView()) {
                setStatus("画面中断，正在恢复已保存的版本…", true, true, false);
                checkForUpdates();
            } else {
                setStatus("画面多次中断，已停止自动重启；可关闭其他应用后重试", false, true, true);
            }
            return true;
        }
    }

    private void failPage(String message) {
        loaded = false;
        loadFailed = true;
        setStatus(message + versionSuffix(), false, true, true);
    }

    private void showCurrentStatus() {
        if (checking) return;
        if (updateWarning != null || !latestConfirmed || currentRelease == null
                || !currentRelease.version.equals(verifiedVersion)) {
            setStatus((updateWarning != null ? updateWarning : "未能确认最新版本")
                    + " · 当前 " + (currentRelease == null ? "—" : currentRelease.shortVersion()),
                    false, true, true);
        } else {
            setStatus("已连接最新测试版本" + versionSuffix(), false, false, false);
        }
    }

    private String versionSuffix() {
        return currentRelease == null ? "" : " · " + currentRelease.shortVersion();
    }

    private void setStatus(String message, boolean busy, boolean warning, boolean retryVisible) {
        if (destroyed || status == null) return;
        status.setText(message);
        status.setTextColor(warning ? WARNING : INK);
        progress.setVisibility(busy ? View.VISIBLE : View.GONE);
        retry.setVisibility(retryVisible ? View.VISIBLE : View.GONE);
        retry.setEnabled(!checking);
        status.setContentDescription(message);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    private void notifyPage(String state) {
        if (webView == null || !loaded) return;
        try {
            webView.evaluateJavascript("(function(){try{window.dispatchEvent(new Event('paperchalk:"
                    + state + "'));window.dispatchEvent(new Event('resize'));}catch(e){}})()", null);
        } catch (RuntimeException ignored) {
            // WebView may already be stopping while the Activity changes state.
        }
    }

    private void saveCurrentPage() {
        if (webView == null || !loaded) return;
        try {
            webView.evaluateJavascript(SAVE_SCRIPT, null);
        } catch (RuntimeException ignored) { }
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        hideSystemBars();
        if (webView != null) {
            webView.onResume();
            notifyPage("resume");
            checkForUpdates();
        }
    }

    @Override
    protected void onPause() {
        resumed = false;
        saveCurrentPage();
        notifyPage("pause");
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        if (backPending || destroyed) return;
        if (webView == null || !loaded) {
            moveTaskToBack(true);
            return;
        }
        backPending = true;
        final boolean[] completed = {false};
        Runnable leave = () -> {
            if (completed[0] || destroyed) return;
            completed[0] = true;
            backPending = false;
            saveCurrentPage();
            moveTaskToBack(true);
        };
        main.postDelayed(leave, 1000);
        try {
            webView.evaluateJavascript(
                    "(function(){try{return !!(window.PaperchalkHandleBack && window.PaperchalkHandleBack());}catch(e){return false;}})()",
                    handled -> {
                        if (completed[0] || destroyed) return;
                        main.removeCallbacks(leave);
                        if ("true".equals(handled)) {
                            completed[0] = true;
                            backPending = false;
                        } else leave.run();
                    });
        } catch (RuntimeException error) {
            leave.run();
        }
    }

    private void destroyWebView() {
        WebView old = webView;
        webView = null;
        if (old != null) {
            ViewGroup parent = (ViewGroup) old.getParent();
            if (parent != null) parent.removeView(old);
            old.stopLoading();
            old.destroy();
        }
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        checkGeneration++;
        navigationGeneration++;
        main.removeCallbacksAndMessages(null);
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        network.shutdownNow();
        destroyWebView();
        super.onDestroy();
    }
}
