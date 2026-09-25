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
            webView.loadUrl(GAME_URL);

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
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
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
