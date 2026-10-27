package com.paperchalk.lampkeep;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.graphics.Insets;
import android.view.WindowInsets;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.widget.Toast;
import android.widget.FrameLayout;

/**
 * Native Android shell for the responsive HTML5 game.
 * Each cold start loads the latest GitHub Pages client. App data / localStorage
 * persists in Android WebView private storage across same-signed APK updates.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://g2066203208-beep.github.io/paperchalk-world/";
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(20, 36, 72));
        getWindow().setNavigationBarColor(Color.rgb(20, 36, 72));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(20, 36, 72));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setTextZoom(100);
        web.getSettings().setUseWideViewPort(true);
        web.getSettings().setLoadWithOverviewMode(false);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("https".equals(u.getScheme()) && "g2066203208-beep.github.io".equals(u.getHost()) && (u.getPath() != null && u.getPath().startsWith("/paperchalk-world/"))) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW,u)); }
                catch (Exception e) { Toast.makeText(MainActivity.this,"无法打开外部链接",Toast.LENGTH_SHORT).show(); }
                return true;
            }
        });
        // Android 15 edge-to-edge: reserve real OS status/navigation/cutout insets.
        FrameLayout root = new FrameLayout(this);
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        if(Build.VERSION.SDK_INT >= 30) {
            root.setOnApplyWindowInsetsListener((view,insets)->{
                Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                FrameLayout.LayoutParams layout=(FrameLayout.LayoutParams)web.getLayoutParams();
                layout.setMargins(safe.left,safe.top,safe.right,safe.bottom);
                web.setLayoutParams(layout);
                return insets;
            });
        }
        setContentView(root);
        root.requestApplyInsets();
        if(state==null) loadLatest();
        else if(web.restoreState(state)==null) loadLatest();
    }
    private void loadLatest() {
        web.loadUrl(HOME+"?source=apk&launch="+System.currentTimeMillis());
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        web.saveState(state);
        super.onSaveInstanceState(state);
    }
    @Override public void onBackPressed() {
        if(web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if(web!=null){web.destroy();web=null;}
        super.onDestroy();
    }
}
