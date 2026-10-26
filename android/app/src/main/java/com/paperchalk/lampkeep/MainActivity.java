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
        if(Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener((view,insets)->{
                Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                view.setPadding(0,safe.top,0,safe.bottom);
                return insets;
            });
        }
        setContentView(web);
        if(state==null) web.loadUrl(HOME+"?source=apk");
        else web.restoreState(state);
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
