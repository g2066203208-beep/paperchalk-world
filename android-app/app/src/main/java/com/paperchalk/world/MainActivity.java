package com.paperchalk.world;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

public class MainActivity extends Activity {

    private static final String GAME_URL =
            "https://g2066203208-beep.github.io/paperchalk-world/";

    private WebView webView;
    private long pausedAtMs = 0L;
    private boolean initialResume = true;

    private void loadFreshGame(String reason) {
        if (webView == null) return;
        String refreshUrl = GAME_URL
                + "?androidRefresh="
                + System.currentTimeMillis()
                + "&reason="
                + reason;
        java.util.HashMap<String, String> freshHeaders = new java.util.HashMap<>();
        freshHeaders.put("Cache-Control", "no-cache, max-age=0");
        freshHeaders.put("Pragma", "no-cache");
        webView.loadUrl(refreshUrl, freshHeaders);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();

        try {
            webView = new WebView(this);
            webView.setBackgroundColor(Color.rgb(232, 223, 207));

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);

            // Reuse HTTP/image/script caches. Clearing them on every launch caused repeated
            // download, SVG decode and GPU uploads on mobile.
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);

            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    // Recover from a Chromium renderer crash/OOM instead of leaving a dead surface.
                    ViewGroup parent = (ViewGroup) view.getParent();
                    if (parent != null) parent.removeView(view);
                    view.destroy();
                    webView = null;
                    recreate();
                    return true;
                }
            });
            webView.setWebChromeClient(new WebChromeClient());
            webView.clearHistory();

            setContentView(webView);

            // Fetch the tiny HTML shell fresh. Heavy versioned assets remain cached.
            loadFreshGame("launch");

        } catch (Throwable t) {
            TextView error = new TextView(this);
            error.setTextColor(Color.WHITE);
            error.setBackgroundColor(Color.rgb(35, 31, 25));
            error.setGravity(Gravity.CENTER);
            error.setPadding(40, 40, 40, 40);
            error.setTextSize(16f);
            error.setText(
                    "Paperchalk World 启动失败\n\n"
                    + t.getClass().getName()
                    + "\n"
                    + String.valueOf(t.getMessage())
            );
            setContentView(error);
        }
    }

    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemBars();
        if (webView != null) {
            webView.onResume();
            long awayMs = pausedAtMs > 0L
                    ? Math.max(0L, System.currentTimeMillis() - pausedAtMs)
                    : 0L;
            if (initialResume) {
                initialResume = false;
            } else if (awayMs >= 1500L) {
                // Revalidate after a real background trip, but do not tear down the game
                // for tiny system interruptions such as a permission sheet or notification.
                loadFreshGame("resume");
            }
        }
        pausedAtMs = 0L;
    }

    @Override
    protected void onPause() {
        pausedAtMs = System.currentTimeMillis();
        if (webView != null) {
            // Native lifecycle backup: persist position/inventory before refresh/process kill.
            webView.evaluateJavascript(
                    "(function(){try{return !!(window.PaperchalkSaveNow && window.PaperchalkSaveNow());}catch(e){return false;}})()",
                    ignored -> {}
            );
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }

        // Let the game close its backpack/menu layers before leaving the app.
        webView.evaluateJavascript(
                "(function(){try{return !!(window.PaperchalkHandleBack && window.PaperchalkHandleBack());}catch(e){return false;}})()",
                handled -> {
                    if ("true".equals(handled)) return;
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        moveTaskToBack(true);
                    }
                }
        );
    }
}
