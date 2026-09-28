package com.paperchalk.spineviewer;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Mobile shell around the MIT-licensed Stretchy Studio editor.
 *
 * The web editor provides PSD parsing, layer reconstruction, heuristic/DWPose
 * auto-rigging, mesh generation/deformation, vertex skinning and timeline
 * authoring. PaperChalk adds secure local hosting, Android file picking,
 * camera permission, camera-to-bone mocap and streaming canvas recording.
 */
public class StudioActivity extends Activity {
    private static final int REQ_FILE = 2201;
    private static final int REQ_CAMERA = 2202;

    private WebView webView;
    private TextView status;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingWebPermission;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        configureWebView();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xff15171d);
        setContentView(root);
        MobileUi.applySystemBars(this, root);

        // Safe top header: only navigation + title live here, so the Android
        // status bar/notch can never cover the editing actions.
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(6), dp(3), dp(6), dp(3));
        header.setBackgroundColor(0xff1d2028);
        root.addView(header, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(48)));

        Button back = button("← 返回", v -> finish());
        header.addView(back);

        TextView title = new TextView(this);
        title.setText("PaperChalk · 离线动画工作室");
        title.setTextColor(0xffffffff);
        title.setTextSize(14);
        title.setSingleLine(true);
        title.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
            0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
        titleLp.leftMargin = dp(8);
        header.addView(title, titleLp);

        Button refresh = button("刷新", v -> webView.reload());
        header.addView(refresh);

        status = new TextView(this);
        status.setTextColor(0xffc7ccda);
        status.setTextSize(11);
        status.setSingleLine(true);
        status.setEllipsize(android.text.TextUtils.TruncateAt.END);
        status.setPadding(dp(8), dp(2), dp(8), dp(2));
        status.setText("全离线 · PSD · 自动绑定 · 网格变形 · 面捕 · 动作/视频导出");
        root.addView(status, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(28)));

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        // Thumb-friendly bottom toolbar. It stays above gesture/navigation bars
        // and scrolls horizontally instead of squeezing buttons off-screen.
        HorizontalScrollView actionsScroll = new HorizontalScrollView(this);
        actionsScroll.setHorizontalScrollBarEnabled(false);
        actionsScroll.setFillViewport(false);
        actionsScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        actionsScroll.setBackgroundColor(0xff20232b);
        root.addView(actionsScroll, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(58)));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        actions.setPadding(dp(6), dp(4), dp(6), dp(4));
        actionsScroll.addView(actions, new HorizontalScrollView.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.MATCH_PARENT));

        actions.addView(button("PSD/图片", v -> runJs(
            "(function(){const i=document.querySelector('input[type=file]');if(i){i.click();return 'ok'}return 'no-input'})()"
        )));
        actions.addView(button("自动抠图", v ->
            startActivity(new Intent(this, CutoutActivity.class))));
        actions.addView(button("摄像头面捕", v -> runJs(
            "window.PaperChalkMocap?PaperChalkMocap.toggle():'bridge-loading'"
        )));
        actions.addView(button("录制动作", v -> runJs(
            "window.PaperChalkMocap?PaperChalkMocap.toggleRecord():'bridge-loading'"
        )));
        actions.addView(button("保存动作", v -> runJs(
            "window.PaperChalkMocap?PaperChalkMocap.exportCurrentMotion():'bridge-loading'"
        )));
        actions.addView(button("导出视频", v -> runJs(
            "window.PaperChalkRecorder?PaperChalkRecorder.start():'bridge-loading'"
        )));
        actions.addView(button("停止视频", v -> runJs(
            "window.PaperChalkRecorder?PaperChalkRecorder.stop():'bridge-loading'"
        )));
    }

    private Button button(String text, android.view.View.OnClickListener listener) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(12);
        b.setMinWidth(dp(72));
        b.setMinHeight(dp(44));
        b.setMinimumWidth(dp(72));
        b.setMinimumHeight(dp(44));
        b.setPadding(dp(10), dp(4), dp(10), dp(4));
        b.setOnClickListener(listener);
        return b;
    }

    private void configureWebView() {
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);

        webView.addJavascriptInterface(new AndroidStudioBridge(), "AndroidStudio");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override public boolean shouldOverrideUrlLoading(
                WebView view, android.webkit.WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("appassets.androidplatform.net".equals(uri.getHost())) return false;
                runOnUiThread(() -> Toast.makeText(
                    StudioActivity.this,
                    "离线模式：已阻止外部网页/登录页面",
                    Toast.LENGTH_SHORT
                ).show());
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectPaperChalkBridge();
                status.setText("全离线工作室已加载。PSD、自动绑定、摄像头面捕均不需要登录或联网。");
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(intent, REQ_FILE);
                return true;
            }

            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean needsCamera = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) needsCamera = true;
                    }
                    if (!needsCamera) {
                        request.deny();
                        return;
                    }
                    if (Build.VERSION.SDK_INT < 23 ||
                        checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingWebPermission = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                    }
                });
            }

            @Override public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                status.setText("Studio: " + consoleMessage.message());
                return super.onConsoleMessage(consoleMessage);
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/assets/studio/index.html");
    }

    private void injectPaperChalkBridge() {
        String js = "(function(){"
            + "if(!document.getElementById('paperchalk-mobile-css')){"
            + "var l=document.createElement('link');"
            + "l.id='paperchalk-mobile-css';l.rel='stylesheet';"
            + "l.href='https://appassets.androidplatform.net/assets/paperchalk-mobile.css';"
            + "document.head.appendChild(l);}"
            + "if(!document.getElementById('paperchalk-android-bridge')){"
            + "var s=document.createElement('script');"
            + "s.id='paperchalk-android-bridge';"
            + "s.src='https://appassets.androidplatform.net/assets/paperchalk-studio-bridge.js';"
            + "document.head.appendChild(s);}"
            + "})();";
        webView.evaluateJavascript(js, null);
    }

    private void runJs(String script) {
        if (webView == null) return;
        webView.evaluateJavascript(script, value -> {
            if (value != null && !value.equals("null")) status.setText("Studio: " + value.replace("\"", ""));
        });
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE || fileCallback == null) return;

        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null) {
                result = new Uri[clip.getItemCount()];
                for (int i = 0; i < clip.getItemCount(); i++) result[i] = clip.getItemAt(i).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA && pendingWebPermission != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else {
                pendingWebPermission.deny();
            }
            pendingWebPermission = null;
        }
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.evaluateJavascript("window.PaperChalkMocap&&PaperChalkMocap.shutdown();window.PaperChalkRecorder&&PaperChalkRecorder.stop();", null);
            webView.removeJavascriptInterface("AndroidStudio");
            webView.destroy();
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class AndroidStudioBridge {
        private OutputStream videoStream;
        private Uri mediaUri;
        private File legacyFile;
        private String currentName;

        private OutputStream motionStream;
        private Uri motionUri;
        private File motionLegacyFile;
        private String motionName;

        @JavascriptInterface public synchronized boolean beginVideo(String mimeType) {
            closeQuietly(false);
            String ext = mimeType != null && mimeType.contains("mp4") ? ".mp4" : ".webm";
            currentName = "PaperChalk-" + new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date()) + ext;
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Video.Media.DISPLAY_NAME, currentName);
                    values.put(MediaStore.Video.Media.MIME_TYPE,
                        mimeType == null || mimeType.isEmpty() ? "video/webm" : mimeType.split(";")[0]);
                    values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/PaperChalk");
                    values.put(MediaStore.Video.Media.IS_PENDING, 1);
                    mediaUri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
                    if (mediaUri == null) return false;
                    videoStream = getContentResolver().openOutputStream(mediaUri, "w");
                } else {
                    File dir = new File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), "PaperChalk");
                    if (!dir.exists()) dir.mkdirs();
                    legacyFile = new File(dir, currentName);
                    videoStream = new FileOutputStream(legacyFile);
                }
                runOnUiThread(() -> status.setText("视频录制中：" + currentName + "（应用不设时长上限）"));
                return videoStream != null;
            } catch (Exception e) {
                closeQuietly(false);
                runOnUiThread(() -> showError("无法创建视频文件", e));
                return false;
            }
        }

        @JavascriptInterface public synchronized void appendVideoChunk(String base64Data) {
            if (videoStream == null || base64Data == null || base64Data.isEmpty()) return;
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                videoStream.write(bytes);
                videoStream.flush();
            } catch (Exception e) {
                runOnUiThread(() -> showError("写入视频片段失败", e));
            }
        }

        @JavascriptInterface public synchronized void endVideo() {
            closeQuietly(true);
        }

        @JavascriptInterface public synchronized boolean beginMotionFile(String requestedName) {
            closeMotionQuietly(false);
            String safe = requestedName == null ? "PaperChalkMotion.pcmotion.json" :
                requestedName.replaceAll("[\\\\/:*?\"<>|]", "_");
            if (!(safe.endsWith(".json") || safe.endsWith(".gltf"))) safe += ".pcmotion.json";
            motionName = safe;
            String mime = safe.endsWith(".gltf") ? "model/gltf+json" : "application/json";
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, motionName);
                    values.put(MediaStore.Downloads.MIME_TYPE, mime);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PaperChalk");
                    values.put(MediaStore.Downloads.IS_PENDING, 1);
                    motionUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (motionUri == null) return false;
                    motionStream = getContentResolver().openOutputStream(motionUri, "w");
                } else {
                    File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "PaperChalk");
                    if (!dir.exists()) dir.mkdirs();
                    motionLegacyFile = new File(dir, motionName);
                    motionStream = new FileOutputStream(motionLegacyFile);
                }
                return motionStream != null;
            } catch (Exception e) {
                closeMotionQuietly(false);
                runOnUiThread(() -> showError("无法创建动作文件", e));
                return false;
            }
        }

        @JavascriptInterface public synchronized void appendMotionChunk(String base64Data) {
            if (motionStream == null || base64Data == null || base64Data.isEmpty()) return;
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                motionStream.write(bytes);
            } catch (Exception e) {
                runOnUiThread(() -> showError("写入动作文件失败", e));
            }
        }

        @JavascriptInterface public synchronized void endMotionFile() {
            closeMotionQuietly(true);
        }

        private void closeMotionQuietly(boolean publish) {
            try {
                if (motionStream != null) {
                    motionStream.flush();
                    motionStream.close();
                }
            } catch (Exception ignored) { }
            motionStream = null;

            if (Build.VERSION.SDK_INT >= 29 && motionUri != null) {
                try {
                    if (publish) {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Downloads.IS_PENDING, 0);
                        getContentResolver().update(motionUri, values, null, null);
                    } else {
                        getContentResolver().delete(motionUri, null, null);
                    }
                } catch (Exception ignored) { }
            }

            if (publish && motionName != null) {
                final String name = motionName;
                runOnUiThread(() -> {
                    status.setText("动作已保存：Downloads/PaperChalk/" + name);
                    Toast.makeText(StudioActivity.this, "动作已保存，可直接作为游戏动画资源导入", Toast.LENGTH_LONG).show();
                });
            }
            motionUri = null;
            motionLegacyFile = null;
            motionName = null;
        }

        @JavascriptInterface public void toast(String message) {
            runOnUiThread(() -> Toast.makeText(StudioActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface public void status(String message) {
            runOnUiThread(() -> status.setText(message));
        }

        private void closeQuietly(boolean publish) {
            try {
                if (videoStream != null) videoStream.close();
            } catch (Exception ignored) { }
            videoStream = null;

            if (Build.VERSION.SDK_INT >= 29 && mediaUri != null) {
                try {
                    if (publish) {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Video.Media.IS_PENDING, 0);
                        getContentResolver().update(mediaUri, values, null, null);
                    } else {
                        getContentResolver().delete(mediaUri, null, null);
                    }
                } catch (Exception ignored) { }
            }
            if (publish && currentName != null) {
                final String name = currentName;
                runOnUiThread(() -> {
                    status.setText("视频已保存到 Movies/PaperChalk/" + name);
                    Toast.makeText(StudioActivity.this, "视频已保存：" + name, Toast.LENGTH_LONG).show();
                });
            }
            mediaUri = null;
            legacyFile = null;
            currentName = null;
        }
    }

    private void showError(String title, Throwable t) {
        new AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(t == null ? "" : String.valueOf(t.getMessage()))
            .setPositiveButton("确定", null)
            .show();
    }
}
