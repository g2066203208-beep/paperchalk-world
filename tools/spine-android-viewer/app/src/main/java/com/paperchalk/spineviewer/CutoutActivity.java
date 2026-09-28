package com.paperchalk.spineviewer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.ByteBufferExtractor;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenter;
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenterResult;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * One-tap foreground extraction for character/person images.
 *
 * Uses the official MediaPipe Selfie Segmenter fully on-device. This is meant
 * as a fast foreground cutout before PSD/rigging work. Layered PSDs keep their
 * own alpha and do not need this step.
 */
public class CutoutActivity extends Activity {
    private static final int REQ_IMAGE = 3301;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private ImageView preview;
    private TextView status;
    private ProgressBar progress;
    private Bitmap resultBitmap;
    private ImageSegmenter segmenter;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        initSegmenter();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(8), dp(8), dp(8), dp(8));
        root.setBackgroundColor(0xff17191f);
        setContentView(root);
        MobileUi.applySystemBars(this, root);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        root.addView(header, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(46)));

        Button back = button("← 返回");
        back.setOnClickListener(v -> finish());
        header.addView(back);

        TextView title = new TextView(this);
        title.setText("自动抠图 · 本地 MediaPipe");
        title.setTextColor(Color.WHITE);
        title.setTextSize(14);
        title.setSingleLine(true);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
            0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        titleLp.leftMargin = dp(8);
        header.addView(title, titleLp);

        status = new TextView(this);
        status.setTextColor(Color.WHITE);
        status.setTextSize(11);
        status.setSingleLine(true);
        status.setEllipsize(android.text.TextUtils.TruncateAt.END);
        status.setText("完全离线 · 适合人物/人形角色 · 分层 PSD 保留原透明度");
        root.addView(status, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(28)));

        preview = new ImageView(this);
        preview.setScaleType(ImageView.ScaleType.FIT_CENTER);
        preview.setBackgroundColor(0xff2c3038);
        root.addView(preview, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        progress = new ProgressBar(this);
        progress.setVisibility(android.view.View.GONE);
        root.addView(progress, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(4)));

        HorizontalScrollView actionScroll = new HorizontalScrollView(this);
        actionScroll.setHorizontalScrollBarEnabled(false);
        actionScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        root.addView(actionScroll, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(58)));

        LinearLayout actions = new LinearLayout(this);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        actions.setPadding(dp(4), dp(4), dp(4), dp(4));
        actionScroll.addView(actions, new HorizontalScrollView.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.MATCH_PARENT));

        Button choose = button("选择图片并抠图");
        choose.setOnClickListener(v -> chooseImage());
        actions.addView(choose);

        Button save = button("保存透明 PNG");
        save.setOnClickListener(v -> saveResult());
        actions.addView(save);
    }

    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(12);
        b.setMinWidth(dp(96));
        b.setMinHeight(dp(44));
        b.setMinimumWidth(dp(96));
        b.setMinimumHeight(dp(44));
        b.setPadding(dp(10), dp(4), dp(10), dp(4));
        return b;
    }

    private void initSegmenter() {
        worker.submit(() -> {
            try {
                BaseOptions base = BaseOptions.builder()
                    .setModelAssetPath("selfie_segmenter.tflite")
                    .build();
                ImageSegmenter.ImageSegmenterOptions options =
                    ImageSegmenter.ImageSegmenterOptions.builder()
                        .setBaseOptions(base)
                        .setRunningMode(RunningMode.IMAGE)
                        .setOutputCategoryMask(true)
                        .setOutputConfidenceMasks(false)
                        .build();
                segmenter = ImageSegmenter.createFromOptions(this, options);
                runOnUiThread(() -> status.setText("自动抠图模型已就绪。"));
            } catch (Throwable t) {
                runOnUiThread(() -> showError("抠图模型初始化失败", t));
            }
        });
    }

    private void chooseImage() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/*");
        startActivityForResult(intent, REQ_IMAGE);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_IMAGE || resultCode != RESULT_OK || data == null || data.getData() == null) return;

        Uri uri = data.getData();
        progress.setVisibility(android.view.View.VISIBLE);
        status.setText("正在自动抠图…");
        worker.submit(() -> process(uri));
    }

    private void process(Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            Bitmap src = BitmapFactory.decodeStream(in);
            if (src == null) throw new IllegalArgumentException("无法解码图片");
            if (src.getConfig() != Bitmap.Config.ARGB_8888) {
                src = src.copy(Bitmap.Config.ARGB_8888, false);
            }

            ImageSegmenter local = segmenter;
            if (local == null) throw new IllegalStateException("抠图模型仍在初始化，请稍后重试");

            MPImage mpImage = new BitmapImageBuilder(src).build();
            ImageSegmenterResult result = local.segment(mpImage);
            Optional<MPImage> maskOpt = result.categoryMask();
            if (!maskOpt.isPresent()) throw new IllegalStateException("模型没有返回分割掩膜");

            MPImage maskImage = maskOpt.get();
            ByteBuffer mask = ByteBufferExtractor.extract(maskImage);
            int mw = maskImage.getWidth();
            int mh = maskImage.getHeight();

            Bitmap output = applyMask(src, mask, mw, mh);
            output = trimTransparent(output, 2);
            resultBitmap = output;

            final Bitmap shown = output;
            runOnUiThread(() -> {
                preview.setImageBitmap(shown);
                progress.setVisibility(android.view.View.GONE);
                status.setText("抠图完成：" + shown.getWidth() + "×" + shown.getHeight() + "，透明背景已裁边。");
            });
        } catch (Throwable t) {
            runOnUiThread(() -> {
                progress.setVisibility(android.view.View.GONE);
                showError("自动抠图失败", t);
            });
        }
    }

    private Bitmap applyMask(Bitmap src, ByteBuffer mask, int mw, int mh) {
        int w = src.getWidth();
        int h = src.getHeight();
        int[] srcPixels = new int[w * h];
        src.getPixels(srcPixels, 0, w, 0, 0, w, h);
        int[] out = new int[w * h];

        // Selfie segmenter category mask: 0 = foreground person; 255 = no label/background.
        for (int y = 0; y < h; y++) {
            int my = Math.min(mh - 1, Math.max(0, Math.round(y * (mh - 1f) / Math.max(1, h - 1f))));
            for (int x = 0; x < w; x++) {
                int mx = Math.min(mw - 1, Math.max(0, Math.round(x * (mw - 1f) / Math.max(1, w - 1f))));
                int category = mask.get(my * mw + mx) & 0xff;
                int color = srcPixels[y * w + x];
                int sourceAlpha = Color.alpha(color);
                int alpha = category == 0 ? sourceAlpha : 0;
                out[y * w + x] = (color & 0x00ffffff) | (alpha << 24);
            }
        }

        // Small 1-pixel alpha softening to reduce hard binary edges.
        int[] softened = out.clone();
        for (int y = 1; y < h - 1; y++) {
            for (int x = 1; x < w - 1; x++) {
                int idx = y * w + x;
                int a = Color.alpha(out[idx]);
                if (a == 0 || a == 255) {
                    int sum = 0;
                    int count = 0;
                    for (int yy = -1; yy <= 1; yy++) {
                        for (int xx = -1; xx <= 1; xx++) {
                            sum += Color.alpha(out[(y + yy) * w + (x + xx)]);
                            count++;
                        }
                    }
                    int avg = sum / count;
                    int rgb = out[idx] & 0x00ffffff;
                    softened[idx] = rgb | (avg << 24);
                }
            }
        }

        return Bitmap.createBitmap(softened, w, h, Bitmap.Config.ARGB_8888);
    }

    private Bitmap trimTransparent(Bitmap src, int padding) {
        int w = src.getWidth(), h = src.getHeight();
        int[] row = new int[w];
        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++) {
            src.getPixels(row, 0, w, 0, y, w, 1);
            for (int x = 0; x < w; x++) {
                if (Color.alpha(row[x]) > 8) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX || maxY < minY) return src;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(w - 1, maxX + padding);
        maxY = Math.min(h - 1, maxY + padding);
        return Bitmap.createBitmap(src, minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    private void saveResult() {
        Bitmap bitmap = resultBitmap;
        if (bitmap == null) {
            Toast.makeText(this, "先完成一次自动抠图", Toast.LENGTH_SHORT).show();
            return;
        }
        worker.submit(() -> {
            String name = "PaperChalk-Cutout-" +
                new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date()) + ".png";
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
                    values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/PaperChalk");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                    Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("MediaStore 创建失败");
                    try (OutputStream out = getContentResolver().openOutputStream(uri, "w")) {
                        if (out == null || !bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) {
                            throw new IllegalStateException("PNG 写入失败");
                        }
                    }
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    getContentResolver().update(uri, values, null, null);
                } else {
                    File dir = new File(getExternalFilesDir(Environment.DIRECTORY_PICTURES), "PaperChalk");
                    if (!dir.exists()) dir.mkdirs();
                    try (OutputStream out = new FileOutputStream(new File(dir, name))) {
                        if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) {
                            throw new IllegalStateException("PNG 写入失败");
                        }
                    }
                }
                runOnUiThread(() -> Toast.makeText(this, "已保存：" + name, Toast.LENGTH_LONG).show());
            } catch (Throwable t) {
                runOnUiThread(() -> showError("保存透明 PNG 失败", t));
            }
        });
    }

    private void showError(String title, Throwable t) {
        new AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(t == null ? "" : String.valueOf(t.getMessage()))
            .setPositiveButton("确定", null)
            .show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override protected void onDestroy() {
        worker.shutdownNow();
        if (segmenter != null) {
            try { segmenter.close(); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}