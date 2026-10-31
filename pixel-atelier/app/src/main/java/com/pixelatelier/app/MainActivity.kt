package com.pixelatelier.app

import android.graphics.Bitmap
import android.graphics.RectF
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.math.floor
import kotlin.math.min

private val SurfaceColor = Color(0xFF0E121A)
private val PanelColor = Color(0xFF19202B)
private val Accent = Color(0xFF8DAAFB)
private val TextMain = Color(0xFFF1F3FC)
private val PixelColors = listOf(
    0xff1c1d2b.toInt(), 0xff32364c.toInt(), 0xff505976.toInt(), 0xff8895af.toInt(),
    0xfff4f0e7.toInt(), 0xffe5b4a0.toInt(), 0xffbf7e81.toInt(), 0xff8a586f.toInt(),
    0xff613c60.toInt(), 0xff442c47.toInt(), 0xff32485d.toInt(), 0xff326878.toInt(),
    0xff509e91.toInt(), 0xff83c99f.toInt(), 0xffcee2a5.toInt(), 0xfff5d993.toInt(),
    0xfff2ab73.toInt(), 0xffd67665.toInt(), 0xffaf4c63.toInt(), 0xff663b57.toInt(),
    0xff7c5a83.toInt(), 0xffa084a4.toInt(), 0xffb1a7bd.toInt(), 0xffffffff.toInt()
)

enum class EditorTool(val label: String, val glyph: String) {
    PENCIL("铅笔", "✎"), ERASER("橡皮", "◇"), PICKER("吸管", "◎"),
    FILL("填色", "▣"), LINE("直线", "╱"), RECT("矩形", "□"),
    FILLED_RECT("实心矩形", "■"), ELLIPSE("椭圆", "◯"),
    FILLED_ELLIPSE("实心椭圆", "⬤"), SELECT_RECT("框选", "▧")
}

enum class EditorCategory(val label: String) {
    DRAW("绘画"), SHAPES("形状"), SELECT("选择")
}
private fun EditorTool.category(): EditorCategory = when (this) {
    EditorTool.PENCIL, EditorTool.ERASER, EditorTool.PICKER, EditorTool.FILL -> EditorCategory.DRAW
    EditorTool.SELECT_RECT -> EditorCategory.SELECT
    else -> EditorCategory.SHAPES
}
private fun EditorTool.shapeKind(): ShapeKind? = when (this) {
    EditorTool.LINE -> ShapeKind.LINE
    EditorTool.RECT -> ShapeKind.RECTANGLE
    EditorTool.FILLED_RECT -> ShapeKind.FILLED_RECTANGLE
    EditorTool.ELLIPSE -> ShapeKind.ELLIPSE
    EditorTool.FILLED_ELLIPSE -> ShapeKind.FILLED_ELLIPSE
    EditorTool.SELECT_RECT -> ShapeKind.RECT_SELECTION
    else -> null
}
private fun ShapeKind.labelZh() = when(this) {
    ShapeKind.LINE -> "直线"
    ShapeKind.RECTANGLE -> "矩形"
    ShapeKind.FILLED_RECTANGLE -> "实心矩形"
    ShapeKind.ELLIPSE -> "椭圆"
    ShapeKind.FILLED_ELLIPSE -> "实心椭圆"
    ShapeKind.RECT_SELECTION -> "框选"
}
enum class TouchMode(val label: String) {
    DIRECT("直接绘画"), OFFSET("偏移光标"), CURSOR("独立光标")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repository = ProjectStore(applicationContext)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(
                primary = Accent, background = SurfaceColor, surface = PanelColor,
                onBackground = TextMain, onSurface = TextMain
            )) { AtelierApp(repository) }
        }
    }
}

@Composable
private fun AtelierApp(store: ProjectStore) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val writeMutex = remember { Mutex() }
    var pending by remember { mutableStateOf<Job?>(null) }
    var projects by remember { mutableStateOf(store.list()) }
    var document by remember { mutableStateOf<PixelDocument?>(null) }
    var version by remember { mutableIntStateOf(0) }
    var color by remember { mutableIntStateOf(PixelColors[17]) }
    var tool by remember { mutableStateOf(EditorTool.PENCIL) }
    var toolCategory by remember { mutableStateOf(EditorCategory.DRAW) }
    var preview by remember { mutableStateOf<ShapeDraft?>(null) }
    var editStart by remember { mutableStateOf(false) }
    var cursorShapeAnchored by remember { mutableStateOf(false) }
    var touchMode by remember { mutableStateOf(TouchMode.DIRECT) }
    var selection by remember { mutableStateOf<SelectionMask?>(null) }
    var internalClipboard by remember { mutableStateOf<PixelClipboard?>(null) }
    var showNew by remember { mutableStateOf(false) }
    var showColors by remember { mutableStateOf(false) }
    var showLayers by remember { mutableStateOf(false) }
    var showOptions by remember { mutableStateOf(false) }
    var cursor by remember { mutableStateOf(IntOffset(0, 0)) }
    val snackbar = remember { SnackbarHostState() }

    fun notifyChange() { version++ }
    fun scheduleSave(immediate: Boolean = false) {
        val snapshot = document?.deepCopy() ?: return
        pending?.cancel()
        pending = scope.launch {
            if (!immediate) delay(350)
            try {
                withContext(Dispatchers.IO) { writeMutex.withLock { store.save(snapshot) } }
                projects = store.list()
            } catch (e: Exception) { snackbar.showSnackbar("保存失败：" + (e.message ?: "存储异常")) }
        }
    }

    fun openProject(file: File) {
        scope.launch {
            try {
                val loaded = withContext(Dispatchers.IO) { store.load(file) }
                pending?.cancel()
                document = loaded
                preview = null; cursorShapeAnchored = false
                selection = null
                internalClipboard = null
                version++
                cursor = IntOffset(loaded.width / 2, loaded.height / 2)
            } catch (e: Exception) {
                snackbar.showSnackbar("无法打开工程：" + (e.message ?: "文件损坏"))
            }
        }
    }

    fun closeProject() {
        scheduleSave(true)
        document = null
        preview = null; cursorShapeAnchored = false
        showLayers = false; showColors = false
    }

    BackHandler(document != null) { closeProject() }

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch {
            try {
                val imported = withContext(Dispatchers.IO) {
                    context.contentResolver.openInputStream(uri).use { input ->
                        store.importPng(input ?: error("无法打开文件"))
                    }
                }
                document = imported; preview = null; selection = null; internalClipboard = null; version++
                scheduleSave(true)
            } catch (e: Exception) { snackbar.showSnackbar("导入失败：" + (e.message ?: "未知错误")) }
        }
    }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("image/png")) { uri ->
        val snapshot = document?.deepCopy()
        if (uri != null && snapshot != null) scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    context.contentResolver.openOutputStream(uri)?.use { store.exportPng(snapshot, it) }
                        ?: error("无法写入导出文件")
                }
                snackbar.showSnackbar("PNG 导出成功（原始像素尺寸）")
            } catch (e: Exception) { snackbar.showSnackbar("导出失败：" + (e.message ?: "未知错误")) }
        }
    }

    Box(Modifier.fillMaxSize().background(SurfaceColor).safeDrawingPadding().imePadding()) {
        val doc = document
        if (doc == null) {
            Column(Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 20.dp)) {
                Text("PIXEL ATELIER", style = MaterialTheme.typography.labelLarge, color = Accent)
                Spacer(Modifier.height(5.dp))
                Text("像素工坊", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                Text("每个像素，都值得精确绘制。", color = Color(0xFF95A0B3))
                Spacer(Modifier.height(22.dp))
                Button(onClick = { showNew = true }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("＋  新建像素作品")
                }
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = { importLauncher.launch("image/png") }, modifier = Modifier.fillMaxWidth()) {
                    Text("导入 PNG 图片")
                }
                Spacer(Modifier.height(28.dp))
                Text("本地作品", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("仅保存在本设备 · 完全离线", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(12.dp))
                if (projects.isEmpty()) {
                    Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        Text("还没有作品，创建第一张真实像素画吧", color = Color.Gray)
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(projects, key = { it.absolutePath }) { file ->
                            GalleryItem(file, store) { openProject(file) }
                        }
                    }
                }
            }
        } else {
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 56.dp).testTag("top-toolbar")
                        .padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { closeProject() }, modifier = Modifier.size(48.dp)) {
                        Text("‹", style = MaterialTheme.typography.headlineMedium)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(doc.title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                            fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                        Text("${doc.width}×${doc.height}", color = Color.Gray,
                            style = MaterialTheme.typography.labelSmall)
                    }
                    TextButton(onClick = { if (doc.undo()) { notifyChange(); scheduleSave() } },
                        modifier = Modifier.widthIn(min = 48.dp), enabled = doc.canUndo) { Text("撤销") }
                    TextButton(onClick = { if (doc.redo()) { notifyChange(); scheduleSave() } },
                        modifier = Modifier.widthIn(min = 48.dp), enabled = doc.canRedo) { Text("重做") }
                    IconButton(onClick = { showOptions = true }, modifier = Modifier.size(48.dp)) {
                        Text("⋮", style = MaterialTheme.typography.titleLarge)
                    }
                }
                HorizontalDivider(color = Color(0xFF30394A))
                PixelViewport(doc, version, tool, color, touchMode, cursor, selection, preview,
                    onPreview = { preview = it },
                    onSelection = { selection = it },
                    onCursor = {
                        cursor = it
                        if (cursorShapeAnchored && tool.shapeKind() != null)
                            preview = preview?.withEnd(PixelPoint(it.x,it.y))
                    },
                    onPick = { color = it },
                    onChanged = { notifyChange() },
                    onCommit = { notifyChange(); scheduleSave() },
                    modifier = Modifier.weight(1f).fillMaxWidth()
                )
                if (preview != null) {
                    val draft = preview!!
                    Column(Modifier.fillMaxWidth().background(Color(0xFF243248))
                        .testTag("shape-preview-controls")
                        .padding(horizontal = 10.dp, vertical = 6.dp)) {
                        Text(
                            "预览 · " + draft.kind.labelZh() + " (" +
                                draft.start.x + "," + draft.start.y + ") → (" +
                                draft.end.x + "," + draft.end.y + ")",
                            color = TextMain, style = MaterialTheme.typography.labelMedium,
                            maxLines = 1
                        )
                        Row(verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            TextButton(onClick = { editStart = !editStart }) {
                                Text(if (editStart) "起点" else "终点")
                            }
                            listOf("←" to PixelPoint(-1,0), "→" to PixelPoint(1,0),
                                "↑" to PixelPoint(0,-1), "↓" to PixelPoint(0,1)).forEach { (label,delta) ->
                                TextButton(
                                    onClick = {
                                        val p = if (editStart) draft.start else draft.end
                                        val next = PixelPoint(p.x+delta.x,p.y+delta.y)
                                        preview = if(editStart) draft.withStart(next) else draft.withEnd(next)
                                    },
                                    modifier = Modifier.widthIn(min=32.dp)
                                ) { Text(label) }
                            }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = {
                                preview = null
                                cursorShapeAnchored = false
                            }) { Text("取消") }
                            Button(onClick = {
                                if (draft.kind == ShapeKind.RECT_SELECTION) {
                                    selection = ShapeRasterizer.selection(doc.width,doc.height,draft)
                                } else {
                                    if (ShapeRasterizer.commit(doc,draft)) {
                                        notifyChange(); scheduleSave()
                                    }
                                }
                                preview = null
                                cursorShapeAnchored = false
                            }, enabled = draft.kind == ShapeKind.RECT_SELECTION || !doc.currentLayer.locked) {
                                Text("完成")
                            }
                        }
                    }
                }
                Row(
                    Modifier.fillMaxWidth().background(PanelColor)
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier.size(34.dp).clip(RoundedCornerShape(9.dp))
                            .background(Color(color)).border(2.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(9.dp))
                            .clickable { showColors = true }
                    )
                    Spacer(Modifier.width(9.dp))
                    TextButton(onClick = { showColors = true }) { Text("颜色") }
                    TextButton(onClick = { showLayers = true }) { Text("图层 " + doc.layers.size) }
                    if (selection != null) {
                        TextButton(onClick = {
                            internalClipboard = PixelSelectionTools.copy(doc, selection!!)
                        }) { Text("复制") }
                        TextButton(onClick = { selection = null }) { Text("取消框选") }
                    }
                    if (internalClipboard != null) {
                        TextButton(onClick = {
                            val clip = internalClipboard!!
                            if (clip.pasteInto(doc, (doc.width - clip.width) / 2,
                                    (doc.height - clip.height) / 2)) {
                                notifyChange(); scheduleSave()
                            }
                        }) { Text("粘贴") }
                    }
                    Spacer(Modifier.width(12.dp))
                    TextButton(onClick = {
                        touchMode = TouchMode.entries[(touchMode.ordinal + 1) % TouchMode.entries.size]
                    }) { Text(touchMode.label, style = MaterialTheme.typography.labelMedium) }
                }
                if (touchMode == TouchMode.CURSOR) {
                    Row(
                        Modifier.fillMaxWidth().background(PanelColor).padding(horizontal = 12.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("准星  " + cursor.x + "," + cursor.y, modifier = Modifier.weight(1f))
                        Button(onClick = {
                            val kind = tool.shapeKind()
                            if (kind != null) {
                                if (!cursorShapeAnchored) {
                                    preview = ShapeDraft(kind,PixelPoint(cursor.x,cursor.y),
                                        PixelPoint(cursor.x,cursor.y),color)
                                    cursorShapeAnchored = true
                                } else {
                                    preview = preview?.withEnd(PixelPoint(cursor.x,cursor.y))
                                    cursorShapeAnchored = false
                                }
                            } else {
                                doc.beginStroke()
                                doc.setPixel(cursor.x, cursor.y, if (tool == EditorTool.ERASER) 0 else color)
                                if (doc.finishStroke()) { notifyChange(); scheduleSave() }
                            }
                        }) { Text(if (tool.shapeKind()!=null)
                            (if(cursorShapeAnchored) "设终点" else "设起点") else "● 落笔") }
                    }
                }
                Row(
                    Modifier.fillMaxWidth().background(PanelColor)
                        .padding(horizontal = 10.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(9.dp)
                ) {
                    EditorCategory.entries.forEach { category ->
                        FilterChip(selected = toolCategory == category, onClick = {
                            toolCategory = category
                            tool = EditorTool.entries.first { it.category() == category }
                            preview = null; cursorShapeAnchored = false
                        }, label = { Text(category.label) })
                    }
                }
                Row(
                    Modifier.fillMaxWidth().background(PanelColor)
                        .horizontalScroll(rememberScrollState()).padding(horizontal = 8.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    EditorTool.entries.filter { it.category() == toolCategory }.forEach { t ->
                        val active = t == tool
                        Column(
                            Modifier.widthIn(min = 62.dp).clip(RoundedCornerShape(13.dp))
                                .background(if (active) Accent.copy(alpha = 0.22f) else Color.Transparent)
                                .clickable { tool = t; preview = null; cursorShapeAnchored = false }.padding(horizontal = 10.dp, vertical = 7.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(t.glyph, style = MaterialTheme.typography.titleLarge,
                                color = if (active) Accent else TextMain)
                            Text(t.label, style = MaterialTheme.typography.labelSmall,
                                color = if (active) Accent else Color.LightGray)
                        }
                    }
                }
            }
        }

        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
    }

    if (showNew) {
        var title by remember { mutableStateOf("未命名作品") }
        var selected by remember { mutableIntStateOf(64) }
        var width by remember { mutableStateOf("64") }
        var height by remember { mutableStateOf("64") }
        AlertDialog(
            onDismissRequest = { showNew = false },
            title = { Text("新建像素作品") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(title, { title = it }, label = { Text("作品名称") }, singleLine = true)
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        listOf(16,32,64,128,256,512).forEach { n ->
                            FilterChip(selected = selected == n, onClick = {
                                selected = n; width = n.toString(); height = n.toString()
                            }, label = { Text(n.toString()) })
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(width, { width = it.filter(Char::isDigit).take(4) },
                            Modifier.weight(1f), label = { Text("宽度") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                        OutlinedTextField(height, { height = it.filter(Char::isDigit).take(4) },
                            Modifier.weight(1f), label = { Text("高度") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    }
                    Text("透明画布 · 真实 ARGB 像素 · 完全本地", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                }
            },
            confirmButton = {
                Button(onClick = {
                    val w = width.toIntOrNull() ?: 0; val h = height.toIntOrNull() ?: 0
                    if (w in 1..1024 && h in 1..1024 && w.toLong()*h <= 1048576L) {
                        document = PixelDocument.new(w,h,title.ifBlank { "未命名作品" })
                        preview = null; cursorShapeAnchored = false
                        selection = null; internalClipboard = null
                        version++; showNew = false
                        cursor = IntOffset(w/2,h/2)
                        scheduleSave(true)
                    }
                }, enabled = (width.toIntOrNull() ?: 0) in 1..1024 &&
                    (height.toIntOrNull() ?: 0) in 1..1024) { Text("创建画布") }
            },
            dismissButton = { TextButton(onClick = { showNew = false }) { Text("取消") } }
        )
    }

    if (showColors) AlertDialog(
        onDismissRequest = { showColors = false },
        title = { Text("选择像素颜色") },
        text = {
            Column {
                PixelColors.chunked(6).forEach { line ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        line.forEach { shade ->
                            Box(Modifier.padding(3.dp).size(36.dp).clip(RoundedCornerShape(8.dp))
                                .background(Color(shade))
                                .border(if (color == shade) 2.dp else 0.dp, Accent, RoundedCornerShape(8.dp))
                                .clickable { color = shade; showColors = false })
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                var hex by remember(color) { mutableStateOf("%08X".format(color)) }
                OutlinedTextField(hex, { hex = it.take(8).uppercase() },
                    label = { Text("RGBA 十六进制 (AARRGGBB)") }, singleLine = true)
                TextButton(onClick = {
                    val parsed = hex.toLongOrNull(16)
                    if (parsed != null && hex.length == 8) {
                        color = parsed.toInt()
                        showColors = false
                    }
                }) { Text("使用自定义颜色") }
            }
        },
        confirmButton = { TextButton(onClick = { showColors = false }) { Text("完成") } }
    )

    val activeDoc = document
    if (showLayers && activeDoc != null) AlertDialog(
        onDismissRequest = { showLayers = false },
        title = { Text("图层管理") },
        text = {
            Column {
                activeDoc.layers.indices.reversed().forEach { index ->
                    val layer = activeDoc.layers[index]
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = activeDoc.activeLayer == index,
                            onClick = { activeDoc.activeLayer = index; notifyChange() })
                        Text(layer.name, Modifier.weight(1f).clickable {
                            activeDoc.activeLayer = index; notifyChange()
                        })
                        TextButton(onClick = {
                            layer.visible = !layer.visible; notifyChange(); scheduleSave()
                        }) { Text(if (layer.visible) "显示" else "隐藏") }
                        TextButton(onClick = {
                            layer.locked = !layer.locked; notifyChange(); scheduleSave()
                        }) { Text(if (layer.locked) "已锁" else "锁定") }
                    }
                }
                Row {
                    TextButton(onClick = {
                        if (activeDoc.addLayer()) { notifyChange(); scheduleSave() }
                    }) { Text("＋ 添加图层") }
                    TextButton(onClick = {
                        if (activeDoc.removeLayer()) { notifyChange(); scheduleSave() }
                    }, enabled = activeDoc.layers.size > 1) { Text("删除当前") }
                }
            }
        },
        confirmButton = { TextButton(onClick = { showLayers = false }) { Text("完成") } }
    )

    if (showOptions && activeDoc != null) AlertDialog(
        onDismissRequest = { showOptions = false },
        title = { Text("工程操作") },
        text = {
            Column {
                TextButton(onClick = {
                    scheduleSave(true); showOptions = false
                }) { Text("保存当前工程") }
                TextButton(onClick = {
                    showOptions = false
                    exportLauncher.launch(activeDoc.title.replace(Regex("[\\/:*?\"<>|]"), "_") + ".png")
                }) { Text("导出无损 PNG") }
                TextButton(onClick = {
                    showOptions = false
                    importLauncher.launch("image/png")
                }) { Text("导入 PNG 为新工程") }
                Text("工程：.pixelatelier · 无网络权限", color = Color.Gray,
                    style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = { TextButton(onClick = { showOptions = false }) { Text("关闭") } }
    )
}

@Composable
private fun GalleryItem(file: File, store: ProjectStore, onClick: () -> Unit) {
    var preview by remember(file.absolutePath, file.lastModified()) { mutableStateOf<Bitmap?>(null) }
    var title by remember(file.absolutePath, file.lastModified()) { mutableStateOf("加载作品…") }
    var dims by remember(file.absolutePath, file.lastModified()) { mutableStateOf("") }
    LaunchedEffect(file.absolutePath, file.lastModified()) {
        try {
            val details = withContext(Dispatchers.IO) {
                val d = store.load(file)
                val image = Bitmap.createBitmap(d.width,d.height,Bitmap.Config.ARGB_8888)
                image.setPixels(d.composite(),0,d.width,0,0,d.width,d.height)
                Triple(d.title, d.width.toString() + " × " + d.height.toString(), image)
            }
            title = details.first; dims = details.second; preview = details.third
        } catch (_: Throwable) { title = "工程文件异常" }
    }
    Surface(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        color = PanelColor, shape = RoundedCornerShape(16.dp)
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(68.dp).clip(RoundedCornerShape(11.dp))
                .background(Color(0xFF343A46)), contentAlignment = Alignment.Center) {
                val image = preview
                if (image == null) Text("▦", fontWeight = FontWeight.Bold, color = Accent)
                else Canvas(Modifier.fillMaxSize()) {
                    drawIntoCanvas {
                        val fit = min(size.width / image.width, size.height / image.height)
                        val dw = image.width * fit
                        val dh = image.height * fit
                        it.nativeCanvas.drawBitmap(image, null,
                            RectF((size.width - dw)/2,(size.height - dh)/2,
                                (size.width + dw)/2,(size.height + dh)/2),
                            android.graphics.Paint().apply { isFilterBitmap = false; isAntiAlias = false })
                    }
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Spacer(Modifier.height(5.dp))
                Text(dims + "  ·  本地工程", color = Color(0xFF9DA7B9),
                    style = MaterialTheme.typography.bodySmall)
            }
            Text("›", color = Accent, style = MaterialTheme.typography.headlineMedium)
        }
    }
}

/** Unified transformation: screen = imagePixel * scale + offset.
 * Multi-touch discards the uncommitted stroke before pan/zoom to avoid accidental pixels.
 */
@Composable
private fun PixelViewport(
    doc: PixelDocument,
    version: Int,
    tool: EditorTool,
    color: Int,
    mode: TouchMode,
    cursor: IntOffset,
    selection: SelectionMask?,
    preview: ShapeDraft?,
    onPreview: (ShapeDraft?) -> Unit,
    onSelection: (SelectionMask?) -> Unit,
    onCursor: (IntOffset) -> Unit,
    onPick: (Int) -> Unit,
    onChanged: () -> Unit,
    onCommit: () -> Unit,
    modifier: Modifier = Modifier
) {
    val viewport = remember { mutableStateOf(IntSize.Zero) }
    val zoom = remember(doc.id) { mutableFloatStateOf(1f) }
    val pan = remember(doc.id) { mutableStateOf(Offset.Zero) }
    val density = LocalDensity.current.density
    val currentChanged by rememberUpdatedState(onChanged)
    val currentCommit by rememberUpdatedState(onCommit)
    val currentCursor by rememberUpdatedState(onCursor)
    val currentPick by rememberUpdatedState(onPick)
    val currentSelection by rememberUpdatedState(onSelection)
    val currentPreview by rememberUpdatedState(preview)
    val currentDraftUpdate by rememberUpdatedState(onPreview)
    var hasFitViewport by remember(doc.id) { mutableStateOf(false) }
    LaunchedEffect(doc.id, viewport.value) {
        val bounds = viewport.value
        if (!hasFitViewport && bounds.width > 0 && bounds.height > 0) {
            val fit = min(bounds.width.toFloat()/doc.width, bounds.height.toFloat()/doc.height)*0.9f
            zoom.floatValue = fit.coerceIn(0.2f,32f)
            pan.value = Offset((bounds.width-doc.width*zoom.floatValue)/2f,
                (bounds.height-doc.height*zoom.floatValue)/2f)
            hasFitViewport = true
        }
    }
    val previewIndices = remember(doc.width,doc.height,preview) {
        if (preview != null && preview.kind != ShapeKind.RECT_SELECTION)
            ShapeRasterizer.rasterize(doc.width,doc.height,preview) else IntArray(0)
    }
    val bitmap = remember(doc, version) {
        Bitmap.createBitmap(doc.width,doc.height,Bitmap.Config.ARGB_8888).apply {
            setPixels(doc.composite(),0,doc.width,0,0,doc.width,doc.height)
        }
    }
    DisposableEffect(bitmap) { onDispose { bitmap.recycle() } }

    val drawingPaint = remember {
        android.graphics.Paint().apply {
            isFilterBitmap = false; isAntiAlias = false; isDither = false
        }
    }
    val pixelPreviewPaint = remember { android.graphics.Paint().apply {
        isFilterBitmap=false; isAntiAlias=false
    } }
    val checkerPreviewPaint = remember { android.graphics.Paint().apply {
        isFilterBitmap=false; isAntiAlias=false
    } }
    val previewGuidePaint = remember { android.graphics.Paint().apply {
        isAntiAlias=true; this.color=android.graphics.Color.WHITE; strokeWidth=2f
        style=android.graphics.Paint.Style.STROKE
    } }
    val gridPaint = remember {
        android.graphics.Paint().apply {
            this.color = 0x33FFFFFF; strokeWidth = 1f; isAntiAlias = false
        }
    }

    Canvas(
        modifier.background(Color(0xFF10151E)).testTag("pixel-canvas")
            .onSizeChanged { viewport.value = it }
            .pointerInput(doc, tool, color, mode) {
                fun toPixel(point: Offset): IntOffset {
                    val p = if (mode == TouchMode.OFFSET) point - Offset(0f, 56f*density) else point
                    return IntOffset(
                        floor((p.x-pan.value.x)/zoom.floatValue).toInt(),
                        floor((p.y-pan.value.y)/zoom.floatValue).toInt()
                    )
                }
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    val first = toPixel(down.position)
                    var last = first
                    var stroke = false
                    var multi = false
                    val shapeKind = tool.shapeKind()
                    var currentShape = currentPreview
                    var modifyingStart = false
                    if (mode != TouchMode.CURSOR && shapeKind != null) {
                        val existing = currentShape
                        val hitRadius = 25f * density
                        fun screenOf(p: PixelPoint) = Offset(
                            pan.value.x + (p.x + 0.5f) * zoom.floatValue,
                            pan.value.y + (p.y + 0.5f) * zoom.floatValue
                        )
                        val hitStart = existing != null && existing.kind == shapeKind &&
                            (down.position-screenOf(existing.start)).getDistance() <= hitRadius
                        val hitEnd = existing != null && existing.kind == shapeKind &&
                            (down.position-screenOf(existing.end)).getDistance() <= hitRadius
                        if (hitStart || hitEnd) {
                            modifyingStart = hitStart && !hitEnd
                        } else {
                            currentShape = ShapeDraft(shapeKind,PixelPoint(first.x,first.y),
                                PixelPoint(first.x,first.y),color)
                            currentDraftUpdate(currentShape)
                        }
                    }
                    fun plot(point: IntOffset) {
                        if (point.x !in 0 until doc.width || point.y !in 0 until doc.height) return
                        when (tool) {
                            EditorTool.PENCIL -> doc.setPixel(point.x,point.y,color)
                            EditorTool.ERASER -> doc.setPixel(point.x,point.y,0)
                            EditorTool.FILL -> doc.floodFill(point.x,point.y,color)
                            EditorTool.PICKER -> currentPick(doc.composite()[point.y*doc.width+point.x])
                            else -> Unit
                        }
                        currentChanged()
                    }
                    if (mode != TouchMode.CURSOR) {
                        if (mode == TouchMode.OFFSET) currentCursor(first)
                        if (shapeKind == null && tool != EditorTool.PICKER) {
                            doc.beginStroke(); stroke = true
                        }
                        if (tool in listOf(EditorTool.PENCIL,EditorTool.ERASER,
                                EditorTool.FILL,EditorTool.PICKER)) plot(first)
                    } else currentCursor(first)

                    while (true) {
                        val event = awaitPointerEvent()
                        val pressed = event.changes.filter { it.pressed }
                        if (pressed.size >= 2) {
                            if (!multi && stroke) {
                                doc.cancelStroke()
                                stroke = false
                                currentChanged()
                            }
                            multi = true
                            val a = pressed[0]; val b = pressed[1]
                            val prevCenter = (a.previousPosition + b.previousPosition)/2f
                            val nowCenter = (a.position + b.position)/2f
                            val oldDistance = (a.previousPosition-b.previousPosition).getDistance()
                            val newDistance = (a.position-b.position).getDistance()
                            val oldScale = zoom.floatValue
                            val factor = if (oldDistance > 3f) newDistance / oldDistance else 1f
                            val newScale = (oldScale*factor).coerceIn(0.2f,64f)
                            val anchor = (prevCenter-pan.value)/oldScale
                            pan.value = nowCenter-anchor*newScale
                            zoom.floatValue = newScale
                            event.changes.forEach { it.consume() }
                        } else if (!multi) {
                            val changed = pressed.firstOrNull()
                                ?: event.changes.firstOrNull()
                            if (changed != null) {
                                val point = toPixel(changed.position)
                                if (mode == TouchMode.OFFSET) currentCursor(point)
                                if (mode == TouchMode.CURSOR) {
                                    currentCursor(IntOffset(point.x.coerceIn(0,doc.width-1),
                                        point.y.coerceIn(0,doc.height-1)))
                                } else if (shapeKind != null) {
                                    val draft = currentShape
                                    if (draft != null) {
                                        currentShape = if (modifyingStart)
                                            draft.withStart(PixelPoint(point.x,point.y))
                                        else draft.withEnd(PixelPoint(point.x,point.y))
                                        currentDraftUpdate(currentShape)
                                    }
                                } else if (tool == EditorTool.PENCIL || tool == EditorTool.ERASER) {
                                    if (stroke && point != last) {
                                        doc.line(last.x,last.y,point.x,point.y,
                                            if (tool == EditorTool.ERASER) 0 else color)
                                        currentChanged()
                                    }
                                }
                                last = point
                            }
                        }
                        if (pressed.isEmpty()) break
                    }
                    if (!multi && stroke && mode != TouchMode.CURSOR) {
                        if (doc.finishStroke()) currentCommit()
                    }
                }
            }
    ) {
        drawIntoCanvas { wrapper ->
            val canvas = wrapper.nativeCanvas
            val scale = zoom.floatValue
            val left = pan.value.x
            val top = pan.value.y
            canvas.save()
            canvas.clipRect(0f,0f,size.width,size.height)
            val tileSize = 8 * scale
            val tilePaint = android.graphics.Paint().apply { this.color = 0xFF343B49.toInt() }
            val tileOther = android.graphics.Paint().apply { this.color = 0xFF404858.toInt() }
            canvas.drawRect(left,top,left+doc.width*scale,top+doc.height*scale,tilePaint)
            if (tileSize >= 2f) {
                for (by in 0 until (doc.height+7)/8)
                    for (bx in 0 until (doc.width+7)/8)
                        if ((bx+by)%2==1) {
                            canvas.drawRect(left+bx*tileSize, top+by*tileSize,
                                minOf(left+(bx+1)*tileSize,left+doc.width*scale),
                                minOf(top+(by+1)*tileSize,top+doc.height*scale),tileOther)
                        }
            }
            canvas.drawBitmap(bitmap,null,RectF(left,top,left+doc.width*scale,
                top+doc.height*scale),drawingPaint)

            // V1.2: the draft uses exactly ShapeRasterizer's integer cells and
            // the document's alpha compositing rules; never mutates the document.
            val draft = preview
            if (draft != null && draft.kind != ShapeKind.RECT_SELECTION) {
                var runRow = -1
                var runStart = -1
                var runEnd = -1
                var runArgb = 0
                var runChecker = 0
                fun flushRun() {
                    if(runRow < 0) return
                    val x0 = left + runStart*scale
                    val x1 = left + (runEnd+1)*scale
                    val y0 = top + runRow*scale
                    val y1 = top + (runRow+1)*scale
                    checkerPreviewPaint.color = runChecker
                    canvas.drawRect(x0,y0,x1,y1,checkerPreviewPaint)
                    if (runArgb ushr 24 != 0) {
                        pixelPreviewPaint.color = runArgb
                        canvas.drawRect(x0,y0,x1,y1,pixelPreviewPaint)
                    }
                }
                for (index in previewIndices) {
                    val x = index % doc.width
                    val y = index / doc.width
                    val argb = doc.compositeWithPreview(index,draft.argb)
                    val checker = if (8*scale >= 2f && ((x/8+y/8)%2==1))
                        0xFF404858.toInt() else 0xFF343B49.toInt()
                    if (y==runRow && x==runEnd+1 && argb==runArgb && checker==runChecker) {
                        runEnd=x
                    } else {
                        flushRun()
                        runRow=y; runStart=x; runEnd=x; runArgb=argb; runChecker=checker
                    }
                }
                flushRun()
            }
            if (draft != null) {
                if (draft.kind == ShapeKind.RECT_SELECTION) {
                    val mask = ShapeRasterizer.selection(doc.width,doc.height,draft)
                    val bounds = mask.bounds()
                    if (bounds != null) {
                        val tint = android.graphics.Paint().apply {
                            this.color=0x44699CF9; isAntiAlias=false
                        }
                        canvas.drawRect(left+bounds.left*scale,top+bounds.top*scale,
                            left+bounds.right*scale,top+bounds.bottom*scale,tint)
                    }
                }
                val guide = previewGuidePaint
                val startX = left + (draft.start.x+0.5f)*scale
                val startY = top + (draft.start.y+0.5f)*scale
                val endX = left + (draft.end.x+0.5f)*scale
                val endY = top + (draft.end.y+0.5f)*scale
                guide.color = android.graphics.Color.WHITE
                canvas.drawCircle(startX,startY,8f,guide)
                guide.color = 0xFF71DCE3.toInt()
                canvas.drawCircle(endX,endY,8f,guide)
            }
            if (scale >= 9f) {
                for(x in 0..doc.width)
                    canvas.drawLine(left+x*scale,top,left+x*scale,top+doc.height*scale,gridPaint)
                for(y in 0..doc.height)
                    canvas.drawLine(left,top+y*scale,left+doc.width*scale,top+y*scale,gridPaint)
            }
            if (selection != null && selection.width == doc.width &&
                    selection.height == doc.height) {
                selection.bounds()?.let { bounds ->
                    val edge = android.graphics.Paint().apply {
                        this.color = android.graphics.Color.WHITE
                        isAntiAlias = false
                        strokeWidth = 2f
                        style = android.graphics.Paint.Style.STROKE
                        pathEffect = android.graphics.DashPathEffect(floatArrayOf(7f,5f),0f)
                    }
                    canvas.drawRect(left + bounds.left*scale, top + bounds.top*scale,
                        left + bounds.right*scale, top + bounds.bottom*scale, edge)
                }
            }
            if (mode != TouchMode.DIRECT && cursor.x in 0 until doc.width && cursor.y in 0 until doc.height) {
                val cx = left + (cursor.x+0.5f)*scale
                val cy = top + (cursor.y+0.5f)*scale
                val pen = android.graphics.Paint().apply {
                    this.color = android.graphics.Color.WHITE; strokeWidth = 2f; isAntiAlias = false
                }
                canvas.drawLine(cx-11f,cy,cx+11f,cy,pen)
                canvas.drawLine(cx,cy-11f,cx,cy+11f,pen)
                pen.color = android.graphics.Color.BLACK; pen.strokeWidth = 1f
                canvas.drawCircle(cx,cy,4f,pen)
            }
            canvas.restore()
        }
    }
}
