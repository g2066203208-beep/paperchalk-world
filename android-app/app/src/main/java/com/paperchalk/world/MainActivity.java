package com.paperchalk.world;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
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

            // Always fetch the newest GitHub Pages build.
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);

            webView.setWebViewClient(new WebViewClient());
            webView.setWebChromeClient(new WebChromeClient());

            // Clear HTTP/cache files only. localStorage remains intact for game/session data.
            webView.clearCache(true);
            webView.clearHistory();

            setContentView(webView);

            // A unique query string prevents stale index.html from being reused by WebView/CDN.
            webView.loadUrl(GAME_URL + "?app=" + System.currentTimeMillis());

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
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }
}
