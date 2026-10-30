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
    private boolean resumedOnce = false;
    private boolean legacyWorkerCleanupStarted = false;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.clearCache(true);
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

            @Override public void onPageFinished(WebView view, String url) {
                if (legacyWorkerCleanupStarted || !url.startsWith(HOME)) return;
                legacyWorkerCleanupStarted = true;
                // Earlier versions installed a root-scoped offline Service Worker.
                // It can return the OLD game even when WebView uses LOAD_NO_CACHE.
                // Migrate that old registration once; leave unrelated PixelLab caches alone.
                String migrate = "(async function(){try{" +
                    "if(!('serviceWorker' in navigator))return;" +
                    "const regs=await navigator.serviceWorker.getRegistrations();" +
                    "const old=regs.filter(r=>r.scope==='https://g2066203208-beep.github.io/paperchalk-world/');" +
                    "if(!old.length)return;" +
                    "await Promise.all(old.map(r=>r.unregister()));" +
                    "if('caches' in window){const keys=await caches.keys();" +
                    "await Promise.all(keys.filter(k=>/^(untitled-kiosk|paperworld|bone|night)/i.test(k)).map(k=>caches.delete(k)));}" +
                    "location.replace('https://g2066203208-beep.github.io/paperchalk-world/?apk=1&fresh='+Date.now());" +
                    "}catch(e){} })();";
                view.evaluateJavascript(migrate, null);
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
        // NEVER restore a stale WebView snapshot: always request the live Pages root.
        openLatestHome();
    }

    private void openLatestHome() {
        if (web != null) web.loadUrl(HOME + "?apk=1&fresh=" + System.currentTimeMillis());
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!resumedOnce) {
            resumedOnce = true; // Initial load already started in onCreate().
        } else {
            openLatestHome(); // Returning from background must refresh the live web game.
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
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
