package com.paperchalk.spineviewer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import com.esotericsoftware.spine.Animation;
import com.esotericsoftware.spine.SkeletonData;
import com.esotericsoftware.spine.Skin;
import com.esotericsoftware.spine.android.AndroidSkeletonDrawable;
import com.esotericsoftware.spine.android.DebugRenderer;
import com.esotericsoftware.spine.android.SpineController;
import com.esotericsoftware.spine.android.SpineView;
import com.esotericsoftware.spine.android.bounds.ContentMode;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * PaperChalk Spine Viewer
 *
 * Android viewer/debugger around the official Spine Android runtime.
 * Imports .atlas + .json/.skel + texture pages, provides playback controls,
 * skins, pan/zoom, backgrounds and debug bone points.
 */
public class MainActivity extends Activity {
    private static final int REQ_IMPORT = 1001;
    private static final String PREFS = "spine_viewer_prefs";
    private static final String PREF_ATLAS = "atlas_path";
    private static final String PREF_SKELETON = "skeleton_path";

    private final ExecutorService loaderExecutor = Executors.newSingleThreadExecutor();
    private final DebugRenderer debugRenderer = new DebugRenderer();

    private ZoomFrameLayout zoomViewport;
    private CheckerboardView checkerboard;
    private FrameLayout stage;
    private TextView statusText;
    private TextView speedText;
    private TextView mixText;
    private ProgressBar loading;
    private Spinner animationSpinner;
    private Spinner skinSpinner;
    private Spinner backgroundSpinner;
    private Spinner fitSpinner;
    private CheckBox loopCheck;
    private CheckBox bonesCheck;
    private Button playPauseButton;

    private SpineView spineView;
    private SpineController controller;
    private volatile boolean drawBones = false;
    private boolean spinnerSetup = false;
    private float playbackSpeed = 1f;
    private float defaultMix = 0.20f;
    private String currentAnimation;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        restoreLastProject();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(18, 20, 26));
        root.setPadding(dp(8), dp(8), dp(8), dp(8));
        setContentView(root);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        root.addView(header, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)));

        TextView title = new TextView(this);
        title.setText("Spine 骨骼动画工具  ·  Runtime " + BuildConfig.SPINE_RUNTIME_VERSION);
        title.setTextColor(Color.WHITE);
        title.setTextSize(17);
        title.setSingleLine(true);
        header.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button importButton = button("导入 Spine 文件");
        importButton.setOnClickListener(v -> openImporter());
        header.addView(importButton);

        Button aboutButton = button("说明");
        aboutButton.setOnClickListener(v -> showAbout());
        header.addView(aboutButton);

        statusText = new TextView(this);
        statusText.setTextColor(Color.rgb(190, 198, 214));
        statusText.setTextSize(12);
        statusText.setText("请选择同一套导出文件：.atlas + .json/.skel + 全部纹理 PNG。支持多选。\n捏合缩放 · 单指拖动 · 双击复位视图。");
        root.addView(statusText, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        stage = new FrameLayout(this);
        LinearLayout.LayoutParams stageLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        stageLp.topMargin = dp(6);
        stageLp.bottomMargin = dp(6);
        root.addView(stage, stageLp);

        checkerboard = new CheckerboardView(this);
        stage.addView(checkerboard, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        zoomViewport = new ZoomFrameLayout(this);
        stage.addView(zoomViewport, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        loading = new ProgressBar(this);
        loading.setVisibility(View.GONE);
        FrameLayout.LayoutParams loadingLp = new FrameLayout.LayoutParams(dp(54), dp(54), Gravity.CENTER);
        stage.addView(loading, loadingLp);

        buildControlPanel(root);
    }

    private void buildControlPanel(LinearLayout root) {
        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.VERTICAL);
        controls.setPadding(dp(6), dp(4), dp(6), dp(4));
        controls.setBackgroundColor(Color.rgb(238, 240, 244));
        root.addView(controls, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        HorizontalScrollView rowScroller = new HorizontalScrollView(this);
        rowScroller.setHorizontalScrollBarEnabled(false);
        controls.addView(rowScroller, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        rowScroller.addView(row, new HorizontalScrollView.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        playPauseButton = button("播放/暂停");
        playPauseButton.setEnabled(false);
        playPauseButton.setOnClickListener(v -> togglePlayback());
        row.addView(playPauseButton);

        Button setupPoseButton = button("设置姿势");
        setupPoseButton.setOnClickListener(v -> resetSetupPose());
        row.addView(setupPoseButton);

        Button resetViewButton = button("视图复位");
        resetViewButton.setOnClickListener(v -> {
            zoomViewport.resetTransform();
            if (spineView != null) spineView.setContentMode(ContentMode.FIT);
            fitSpinner.setSelection(0);
        });
        row.addView(resetViewButton);

        loopCheck = new CheckBox(this);
        loopCheck.setText("循环");
        loopCheck.setChecked(true);
        loopCheck.setOnCheckedChangeListener((buttonView, isChecked) -> replayCurrentAnimation());
        row.addView(loopCheck);

        bonesCheck = new CheckBox(this);
        bonesCheck.setText("骨骼点");
        bonesCheck.setOnCheckedChangeListener((buttonView, isChecked) -> {
            drawBones = isChecked;
            if (spineView != null) spineView.invalidate();
        });
        row.addView(bonesCheck);

        row.addView(label(" 动画 "));
        animationSpinner = spinner();
        animationSpinner.setEnabled(false);
        row.addView(animationSpinner, new LinearLayout.LayoutParams(dp(190), dp(48)));
        animationSpinner.setOnItemSelectedListener(new SimpleItemSelectedListener(position -> {
            if (!spinnerSetup || controller == null || !controller.isInitialized()) return;
            Object selected = animationSpinner.getSelectedItem();
            if (selected == null) return;
            currentAnimation = selected.toString();
            replayCurrentAnimation();
        }));

        row.addView(label(" 皮肤 "));
        skinSpinner = spinner();
        skinSpinner.setEnabled(false);
        row.addView(skinSpinner, new LinearLayout.LayoutParams(dp(170), dp(48)));
        skinSpinner.setOnItemSelectedListener(new SimpleItemSelectedListener(position -> applySelectedSkin()));

        row.addView(label(" 背景 "));
        backgroundSpinner = spinner();
        backgroundSpinner.setAdapter(stringAdapter(Arrays.asList("棋盘", "深色", "浅色")));
        backgroundSpinner.setSelection(0);
        row.addView(backgroundSpinner, new LinearLayout.LayoutParams(dp(120), dp(48)));
        backgroundSpinner.setOnItemSelectedListener(new SimpleItemSelectedListener(position -> {
            if (position == 1) checkerboard.setMode(CheckerboardView.Mode.DARK);
            else if (position == 2) checkerboard.setMode(CheckerboardView.Mode.LIGHT);
            else checkerboard.setMode(CheckerboardView.Mode.CHECKER);
        }));

        row.addView(label(" 显示 "));
        fitSpinner = spinner();
        fitSpinner.setAdapter(stringAdapter(Arrays.asList("适应", "填充")));
        fitSpinner.setSelection(0);
        row.addView(fitSpinner, new LinearLayout.LayoutParams(dp(120), dp(48)));
        fitSpinner.setOnItemSelectedListener(new SimpleItemSelectedListener(position -> {
            if (spineView != null) spineView.setContentMode(position == 1 ? ContentMode.FILL : ContentMode.FIT);
        }));

        LinearLayout sliders = new LinearLayout(this);
        sliders.setOrientation(LinearLayout.HORIZONTAL);
        sliders.setGravity(Gravity.CENTER_VERTICAL);
        controls.addView(sliders, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        speedText = label("速度 1.00×");
        sliders.addView(speedText, new LinearLayout.LayoutParams(dp(92), ViewGroup.LayoutParams.WRAP_CONTENT));
        SeekBar speedBar = new SeekBar(this);
        speedBar.setMax(390);
        speedBar.setProgress(90);
        sliders.addView(speedBar, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        speedBar.setOnSeekBarChangeListener(new SimpleSeekBarListener(progress -> {
            playbackSpeed = (progress + 10) / 100f;
            speedText.setText(String.format(Locale.US, "速度 %.2f×", playbackSpeed));
            if (controller != null && controller.isInitialized()) controller.getAnimationState().setTimeScale(playbackSpeed);
        }));

        mixText = label("混合 0.20s");
        sliders.addView(mixText, new LinearLayout.LayoutParams(dp(92), ViewGroup.LayoutParams.WRAP_CONTENT));
        SeekBar mixBar = new SeekBar(this);
        mixBar.setMax(100);
        mixBar.setProgress(20);
        sliders.addView(mixBar, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        mixBar.setOnSeekBarChangeListener(new SimpleSeekBarListener(progress -> {
            defaultMix = progress / 100f;
            mixText.setText(String.format(Locale.US, "混合 %.2fs", defaultMix));
            if (controller != null && controller.isInitialized()) controller.getAnimationStateData().setDefaultMix(defaultMix);
        }));
    }

    private void openImporter() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        startActivityForResult(intent, REQ_IMPORT);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_IMPORT || resultCode != RESULT_OK || data == null) return;

        List<Uri> uris = new ArrayList<>();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) uris.add(clip.getItemAt(i).getUri());
        } else if (data.getData() != null) {
            uris.add(data.getData());
        }
        if (uris.isEmpty()) return;

        setLoading(true, "正在导入文件…");
        loaderExecutor.submit(() -> importSelectedFiles(uris));
    }

    private void importSelectedFiles(List<Uri> uris) {
        File projectDir = new File(getFilesDir(), "projects/project-" + System.currentTimeMillis());
        if (!projectDir.mkdirs() && !projectDir.isDirectory()) {
            showError("无法创建项目目录。", null);
            return;
        }

        List<File> copied = new ArrayList<>();
        try {
            for (Uri uri : uris) {
                String name = getDisplayName(uri);
                if (name == null || name.trim().isEmpty()) name = "asset-" + copied.size();
                name = sanitizeFileName(name);
                File target = new File(projectDir, name);
                copyUri(uri, target);
                copied.add(target);
            }
        } catch (Exception e) {
            deleteRecursively(projectDir);
            showError("复制所选文件失败。", e);
            return;
        }

        File atlas = findFirstByExtension(copied, ".atlas");
        File skeleton = chooseSkeletonForAtlas(copied, atlas);
        if (atlas == null || skeleton == null) {
            deleteRecursively(projectDir);
            showError("缺少必要文件。请一次多选同一套 Spine 导出的 .atlas、.json 或 .skel，以及所有 PNG 纹理页。", null);
            return;
        }

        loadProject(atlas, skeleton, true);
    }

    private void loadProject(File atlas, File skeleton, boolean persist) {
        runOnUiThread(() -> setLoading(true, "正在解析 " + skeleton.getName() + " …"));
        loaderExecutor.submit(() -> {
            try {
                AndroidSkeletonDrawable drawable = AndroidSkeletonDrawable.fromFile(atlas, skeleton);
                runOnUiThread(() -> attachDrawable(drawable, atlas, skeleton, persist));
            } catch (Throwable t) {
                showError("Spine 文件加载失败。请确认 Runtime " + BuildConfig.SPINE_RUNTIME_VERSION
                    + " 与导出 Spine Editor 的 major.minor 版本匹配，并确认 atlas 引用的所有纹理页都已选择。", t);
            }
        });
    }

    private void attachDrawable(AndroidSkeletonDrawable drawable, File atlas, File skeleton, boolean persist) {
        controller = new SpineController.Builder(initialized -> onSpineInitialized(initialized, atlas, skeleton))
            .setOnAfterPaint((initialized, canvas, commands) -> {
                if (drawBones) debugRenderer.render(initialized.getDrawable(), canvas, commands);
            })
            .build();

        spineView = new SpineView(this, controller);
        spineView.setContentMode(ContentMode.FIT);
        zoomViewport.removeAllViews();
        zoomViewport.addView(spineView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        zoomViewport.resetTransform();

        spineView.setSkeletonDrawable(drawable);

        if (persist) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(PREF_ATLAS, atlas.getAbsolutePath())
                .putString(PREF_SKELETON, skeleton.getAbsolutePath())
                .apply();
        }
    }

    private void onSpineInitialized(SpineController initialized, File atlas, File skeleton) {
        spinnerSetup = false;
        SkeletonData data = initialized.getDrawable().getSkeletonData();

        List<String> animations = new ArrayList<>();
        for (Animation animation : data.getAnimations()) animations.add(animation.getName());
        animationSpinner.setAdapter(stringAdapter(animations.isEmpty() ? Collections.singletonList("(无动画)") : animations));
        animationSpinner.setEnabled(!animations.isEmpty());

        List<String> skins = new ArrayList<>();
        for (Skin skin : data.getSkins()) skins.add(skin.getName());
        skinSpinner.setAdapter(stringAdapter(skins.isEmpty() ? Collections.singletonList("(无皮肤)") : skins));
        skinSpinner.setEnabled(!skins.isEmpty());

        initialized.getAnimationState().setTimeScale(playbackSpeed);
        initialized.getAnimationStateData().setDefaultMix(defaultMix);

        spinnerSetup = true;
        playPauseButton.setEnabled(true);
        playPauseButton.setText("暂停");

        if (!animations.isEmpty()) {
            currentAnimation = animations.get(0);
            initialized.getAnimationState().setAnimation(0, currentAnimation, loopCheck.isChecked());
        } else {
            currentAnimation = null;
        }

        int boneCount = data.getBones().size;
        int slotCount = data.getSlots().size;
        setLoading(false, "");
        statusText.setText("已加载：" + skeleton.getName() + "  |  Atlas: " + atlas.getName()
            + "  |  动画 " + animations.size() + "  皮肤 " + skins.size()
            + "  骨骼 " + boneCount + "  插槽 " + slotCount
            + "  |  Runtime " + BuildConfig.SPINE_RUNTIME_VERSION);
    }

    private void restoreLastProject() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String atlasPath = prefs.getString(PREF_ATLAS, null);
        String skeletonPath = prefs.getString(PREF_SKELETON, null);
        if (atlasPath == null || skeletonPath == null) return;
        File atlas = new File(atlasPath);
        File skeleton = new File(skeletonPath);
        if (atlas.isFile() && skeleton.isFile()) {
            setLoading(true, "正在恢复上次项目…");
            loadProject(atlas, skeleton, false);
        }
    }

    private void togglePlayback() {
        if (controller == null || !controller.isInitialized()) return;
        if (controller.isPlaying()) {
            controller.pause();
            playPauseButton.setText("播放");
        } else {
            controller.resume();
            playPauseButton.setText("暂停");
        }
        if (spineView != null) spineView.invalidate();
    }

    private void resetSetupPose() {
        if (controller == null || !controller.isInitialized()) return;
        controller.getAnimationState().clearTracks();
        controller.getSkeleton().setToSetupPose();
        currentAnimation = null;
        if (spineView != null) spineView.invalidate();
        Toast.makeText(this, "已切回设置姿势。重新选择动画即可继续播放。", Toast.LENGTH_SHORT).show();
    }

    private void replayCurrentAnimation() {
        if (controller == null || !controller.isInitialized() || currentAnimation == null || currentAnimation.startsWith("(")) return;
        controller.getAnimationStateData().setDefaultMix(defaultMix);
        controller.getAnimationState().setAnimation(0, currentAnimation, loopCheck.isChecked());
        if (!controller.isPlaying()) {
            controller.resume();
            playPauseButton.setText("暂停");
        }
    }

    private void applySelectedSkin() {
        if (!spinnerSetup || controller == null || !controller.isInitialized()) return;
        Object selected = skinSpinner.getSelectedItem();
        if (selected == null || selected.toString().startsWith("(")) return;
        Skin skin = controller.getDrawable().getSkeletonData().findSkin(selected.toString());
        if (skin != null) {
            controller.getSkeleton().setSkin(skin);
            controller.getSkeleton().setSlotsToSetupPose();
            if (spineView != null) spineView.invalidate();
        }
    }

    private void showAbout() {
        String message = "PaperChalk Spine Viewer\n\n"
            + "功能：\n"
            + "• 导入 Spine .atlas + .json/.skel + 多页 PNG\n"
            + "• 动画/皮肤切换、循环、暂停、速度、混合时间\n"
            + "• FIT/FILL、三种背景、捏合缩放、拖动、双击复位\n"
            + "• 官方 DebugRenderer 骨骼点叠加\n"
            + "• 本地持久化最近项目；无联网、无账号、无遥测\n\n"
            + "当前官方 Spine Runtime：" + BuildConfig.SPINE_RUNTIME_VERSION + "\n"
            + "Spine 导出数据与 Runtime 的 major.minor 版本必须匹配。\n\n"
            + "许可：本 APK 使用 Esoteric Software 官方 Spine Runtimes。其许可不是 MIT/Apache；"
            + "使用本工具的每位用户必须满足 Spine Runtimes License / Spine Editor License 的要求。"
            + "项目中已附 SPINE_RUNTIME_LICENSE.txt。";
        new AlertDialog.Builder(this)
            .setTitle("关于")
            .setMessage(message)
            .setPositiveButton("知道了", null)
            .show();
    }

    private void setLoading(boolean visible, String message) {
        loading.setVisibility(visible ? View.VISIBLE : View.GONE);
        if (message != null && !message.isEmpty()) statusText.setText(message);
    }

    private void showError(String message, Throwable t) {
        runOnUiThread(() -> {
            setLoading(false, "");
            String detail = t == null ? "" : "\n\n" + t.getClass().getSimpleName() + ": " + String.valueOf(t.getMessage());
            statusText.setText("加载失败：" + message);
            new AlertDialog.Builder(this)
                .setTitle("无法加载 Spine 项目")
                .setMessage(message + detail)
                .setPositiveButton("确定", null)
                .show();
        });
    }

    private File chooseSkeletonForAtlas(List<File> files, File atlas) {
        List<File> skeletons = new ArrayList<>();
        for (File file : files) {
            String n = file.getName().toLowerCase(Locale.ROOT);
            if (n.endsWith(".json") || n.endsWith(".skel")) skeletons.add(file);
        }
        if (skeletons.isEmpty()) return null;
        if (atlas == null || skeletons.size() == 1) return skeletons.get(0);

        String atlasBase = stripExtension(atlas.getName()).toLowerCase(Locale.ROOT);
        Collections.sort(skeletons, Comparator.comparingInt((File f) -> commonPrefixLength(atlasBase,
            stripExtension(f.getName()).toLowerCase(Locale.ROOT))).reversed());
        return skeletons.get(0);
    }

    private static int commonPrefixLength(String a, String b) {
        int n = Math.min(a.length(), b.length());
        int i = 0;
        while (i < n && a.charAt(i) == b.charAt(i)) i++;
        return i;
    }

    private static String stripExtension(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private static File findFirstByExtension(List<File> files, String ext) {
        for (File file : files) if (file.getName().toLowerCase(Locale.ROOT).endsWith(ext)) return file;
        return null;
    }

    private String getDisplayName(Uri uri) {
        ContentResolver resolver = getContentResolver();
        try (Cursor cursor = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int i = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0) return cursor.getString(i);
            }
        } catch (Exception ignored) { }
        String path = uri.getLastPathSegment();
        return path == null ? null : path.substring(path.lastIndexOf('/') + 1);
    }

    private void copyUri(Uri uri, File target) throws IOException {
        try (InputStream in = getContentResolver().openInputStream(uri);
             FileOutputStream out = new FileOutputStream(target)) {
            if (in == null) throw new IOException("无法打开 " + uri);
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) >= 0) out.write(buffer, 0, read);
        }
    }

    private static String sanitizeFileName(String name) {
        return name.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteRecursively(child);
        }
        file.delete();
    }

    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextSize(12);
        b.setAllCaps(false);
        b.setMinHeight(0);
        b.setMinWidth(0);
        b.setPadding(dp(10), dp(4), dp(10), dp(4));
        return b;
    }

    private TextView label(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Color.rgb(40, 44, 52));
        t.setTextSize(12);
        t.setGravity(Gravity.CENTER_VERTICAL);
        return t;
    }

    private Spinner spinner() {
        return new Spinner(this, Spinner.MODE_DROPDOWN);
    }

    private ArrayAdapter<String> stringAdapter(List<String> items) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, items);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        return adapter;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override protected void onDestroy() {
        loaderExecutor.shutdownNow();
        if (controller != null && controller.isInitialized()) controller.pause();
        super.onDestroy();
    }

    private static class SimpleItemSelectedListener implements android.widget.AdapterView.OnItemSelectedListener {
        interface Handler { void onSelected(int position); }
        private final Handler handler;
        SimpleItemSelectedListener(Handler handler) { this.handler = handler; }
        @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) { handler.onSelected(position); }
        @Override public void onNothingSelected(android.widget.AdapterView<?> parent) { }
    }

    private static class SimpleSeekBarListener implements SeekBar.OnSeekBarChangeListener {
        interface Handler { void onProgress(int progress); }
        private final Handler handler;
        SimpleSeekBarListener(Handler handler) { this.handler = handler; }
        @Override public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) { handler.onProgress(progress); }
        @Override public void onStartTrackingTouch(SeekBar seekBar) { }
        @Override public void onStopTrackingTouch(SeekBar seekBar) { }
    }
}
