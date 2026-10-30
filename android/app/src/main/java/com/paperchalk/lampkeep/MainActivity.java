package com.paperchalk.lampkeep;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

/**
 * Minimal Android wrapper. No legacy game logic, file bridges, or native UI.
 * Every cold launch loads the hosted page with a fresh URL query parameter.
 * PAPERWORLD background animation is served from the existing GitHub Pages root.
 * Rebuild of this existing application ID refreshes the original APK release.
 */
public final class MainActivity extends Activity {
    private static final String HOME =
        "https://g2066203208-beep.github.io/paperchalk-world/";
    private static final String SITE_HOST = "g2066203208-beep.github.io";
    private static final String SITE_PATH = "/paperchalk-world/";

    private WebView web;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFFFFF5E6);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setTextZoom(100);

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme())
                    && SITE_HOST.equals(uri.getHost())
                    && uri.getPath() != null
                    && uri.getPath().startsWith(SITE_PATH)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "无法打开外部链接", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });

        FrameLayout root = new FrameLayout(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        if (Build.VERSION.SDK_INT >= 30) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets safe = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                FrameLayout.LayoutParams params =
                    (FrameLayout.LayoutParams) web.getLayoutParams();
                params.setMargins(safe.left, safe.top, safe.right, safe.bottom);
                web.setLayoutParams(params);
                return insets;
            });
        }
        setContentView(root);
        root.requestApplyInsets();
        if (state == null || web.restoreState(state) == null) {
            web.loadUrl(HOME + "?apk=1&fresh=" + System.currentTimeMillis());
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (web != null) web.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
