package com.pixelatelier.app

import java.util.ArrayDeque

/** Authoritative, addressable ARGB pixels. No anti-aliasing, resampling or implicit blur. */
data class PixelLayer(
    val id: Long,
    var name: String,
    val pixels: IntArray,
    var visible: Boolean = true,
    var locked: Boolean = false,
    var opacity: Int = 255
) {
    fun copyLayer(): PixelLayer = copy(pixels = pixels.copyOf())
}

private data class Change(val index: Int, val before: Int, val after: Int)
private data class LayerPixelsChange(val layerId: Long, val changes: List<Change>)
private data class PixelAction(val affectedLayers: List<LayerPixelsChange>)
enum class ClearScope { ACTIVE_LAYER, ALL_EDITABLE_LAYERS }

class PixelDocument(
    val id: String,
    var title: String,
    val width: Int,
    val height: Int,
    val layers: MutableList<PixelLayer> = mutableListOf(
        PixelLayer(System.nanoTime(), "图层 1", IntArray(width * height))
    ),
    var activeLayer: Int = 0
) {
    init {
        require(width in 1..1024 && height in 1..1024) { "Unsupported image dimensions" }
        require(width.toLong() * height <= 1048576L)
        require(layers.size in 1..32)
        require(layers.all { it.pixels.size == width * height })
    }

    private val undo = ArrayDeque<PixelAction>()
    private val redo = ArrayDeque<PixelAction>()
    private var stroke: MutableMap<Int, Int>? = null
    private var strokeLayerId: Long = -1
    private val historyLimit = 100
    val canUndo get() = undo.isNotEmpty()
    val canRedo get() = redo.isNotEmpty()
    val currentLayer get() = layers[activeLayer.coerceIn(layers.indices)]

    fun beginStroke() {
        if (stroke != null) finishStroke()
        stroke = linkedMapOf()
        strokeLayerId = currentLayer.id
    }

    fun pixel(x: Int, y: Int): Int {
        if (x !in 0 until width || y !in 0 until height) return 0
        return currentLayer.pixels[y * width + x]
    }

    fun setPixel(x: Int, y: Int, argb: Int) {
        if (x !in 0 until width || y !in 0 until height) return
        val layer = currentLayer
        if (layer.locked) return
        val index = y * width + x
        if (layer.pixels[index] == argb) return
        if (stroke == null) beginStroke()
        stroke?.putIfAbsent(index, layer.pixels[index])
        layer.pixels[index] = argb
    }

    fun line(x0: Int, y0: Int, x1: Int, y1: Int, argb: Int) {
        var x = x0; var y = y0
        val dx = kotlin.math.abs(x1 - x0)
        val dy = kotlin.math.abs(y1 - y0)
        val sx = if (x0 < x1) 1 else -1
        val sy = if (y0 < y1) 1 else -1
        var error = dx - dy
        while (true) {
            setPixel(x, y, argb)
            if (x == x1 && y == y1) break
            val e2 = error * 2
            if (e2 > -dy) { error -= dy; x += sx }
            if (e2 < dx) { error += dx; y += sy }
        }
    }

    fun rectangle(x0: Int, y0: Int, x1: Int, y1: Int, argb: Int, filled: Boolean = false) {
        val l = minOf(x0,x1).coerceAtLeast(0)
        val r = maxOf(x0,x1).coerceAtMost(width - 1)
        val t = minOf(y0,y1).coerceAtLeast(0)
        val b = maxOf(y0,y1).coerceAtMost(height - 1)
        for (y in t..b) for (x in l..r) {
            if (filled || y == t || y == b || x == l || x == r) setPixel(x,y,argb)
        }
    }

    /** Nonrecursive four-connected fill; every cell enqueued at most once. */
    fun floodFill(x: Int, y: Int, color: Int) {
        if (x !in 0 until width || y !in 0 until height || currentLayer.locked) return
        val target = pixel(x,y)
        if (target == color) return
        val queue = IntArray(width * height)
        var head = 0; var tail = 0
        val start = y * width + x
        queue[tail++] = start
        setPixel(x,y,color)
        while (head < tail) {
            val index = queue[head++]
            val px = index % width; val py = index / width
            fun visit(nx: Int, ny: Int) {
                if (nx !in 0 until width || ny !in 0 until height) return
                val i = ny * width + nx
                if (currentLayer.pixels[i] == target) {
                    setPixel(nx, ny, color)
                    queue[tail++] = i
                }
            }
            visit(px - 1, py); visit(px + 1, py)
            visit(px, py - 1); visit(px, py + 1)
        }
    }

    fun finishStroke(): Boolean {
        val original = stroke ?: return false
        val layer = layers.firstOrNull { it.id == strokeLayerId }
        stroke = null
        if (layer == null) return false
        val changes = original.mapNotNull { (i, old) ->
            val now = layer.pixels[i]
            if (old == now) null else Change(i, old, now)
        }
        if (changes.isEmpty()) return false
        undo.addLast(PixelAction(listOf(LayerPixelsChange(layer.id, changes))))
        while (undo.size > historyLimit) undo.removeFirst()
        redo.clear()
        return true
    }

    fun cancelStroke() {
        val original = stroke ?: return
        val layer = layers.firstOrNull { it.id == strokeLayerId }
        if (layer != null) for ((index, old) in original) layer.pixels[index] = old
        stroke = null
    }

    fun undo(): Boolean {
        finishStroke()
        if (undo.isEmpty()) return false
        val action = undo.removeLast()
        for (entry in action.affectedLayers) {
            layers.firstOrNull { it.id == entry.layerId }?.let { layer ->
                for (c in entry.changes) layer.pixels[c.index] = c.before
            }
        }
        redo.addLast(action)
        return true
    }

    fun redo(): Boolean {
        if (redo.isEmpty()) return false
        val action = redo.removeLast()
        for (entry in action.affectedLayers) {
            layers.firstOrNull { it.id == entry.layerId }?.let { layer ->
                for (c in entry.changes) layer.pixels[c.index] = c.after
            }
        }
        undo.addLast(action)
        return true
    }

    /**
     * Atomically clears or fills the selected pixels on one or multiple editable layers.
     * One user operation -> one history entry. A null mask targets every logical pixel.
     * Does not remove layer metadata, frames, IDs, or lock state.
     */
    fun replaceArea(color: Int = 0, mask: SelectionMask? = null,
                    scope: ClearScope = ClearScope.ACTIVE_LAYER): Boolean {
        if (mask != null) require(mask.width == width && mask.height == height)
        finishStroke()
        val targets = if (scope == ClearScope.ACTIVE_LAYER) listOf(currentLayer) else layers.toList()
        val entries = mutableListOf<LayerPixelsChange>()
        for (layer in targets) {
            if (layer.locked) continue
            val changes = ArrayList<Change>()
            for (index in 0 until width * height) {
                if (mask != null && !mask.get(index % width, index / width)) continue
                val before = layer.pixels[index]
                if (before == color) continue
                changes.add(Change(index, before, color))
                layer.pixels[index] = color
            }
            if (changes.isNotEmpty()) entries.add(LayerPixelsChange(layer.id, changes))
        }
        if (entries.isEmpty()) return false
        undo.addLast(PixelAction(entries))
        while (undo.size > historyLimit) undo.removeFirst()
        redo.clear()
        return true
    }

    fun addLayer(name: String = "图层 " + (layers.size + 1)): Boolean {
        if (layers.size >= 32) return false
        finishStroke()
        layers.add(PixelLayer(System.nanoTime(), name, IntArray(width * height)))
        activeLayer = layers.lastIndex
        undo.clear(); redo.clear()
        return true
    }

    fun removeLayer(): Boolean {
        if (layers.size <= 1) return false
        finishStroke()
        layers.removeAt(activeLayer)
        activeLayer = activeLayer.coerceAtMost(layers.lastIndex)
        undo.clear(); redo.clear()
        return true
    }

    fun deepCopy(): PixelDocument =
        PixelDocument(id, title, width, height, layers.map { it.copyLayer() }.toMutableList(), activeLayer)

    /**
     * Preview a replacement active-layer pixel through the EXACT same source-over
     * order/rounding as [composite], without writing to any layer or history.
     * This is called only for pixel indices touched by a transient shape draft.
     */
    fun compositeWithPreview(index: Int, previewArgb: Int): Int {
        if (index !in 0 until width * height) return 0
        val overrideId = currentLayer.id
        var output = 0
        for (layer in layers) {
            if (!layer.visible || layer.opacity == 0) continue
            val src = if (layer.id == overrideId) previewArgb else layer.pixels[index]
            val srcA = ((src ushr 24) * layer.opacity + 127) / 255
            if (srcA == 0) continue
            val dstA = output ushr 24
            val outA = srcA + (dstA * (255 - srcA) + 127) / 255
            if (outA == 0) { output = 0; continue }
            fun channel(shift: Int): Int {
                val sv = (src ushr shift) and 255
                val dv = (output ushr shift) and 255
                return ((sv * srcA * 255 + dv * dstA * (255 - srcA)) /
                    (outA * 255)).coerceIn(0,255)
            }
            output = (outA shl 24) or (channel(16) shl 16) or
                (channel(8) shl 8) or channel(0)
        }
        return output
    }

    /** Explicit source-over composition, no interpolation. */
    fun composite(): IntArray {
        val output = IntArray(width * height)
        for (layer in layers) {
            if (!layer.visible || layer.opacity == 0) continue
            for (i in output.indices) {
                val src = layer.pixels[i]
                val srcA = ((src ushr 24) * layer.opacity + 127) / 255
                if (srcA == 0) continue
                val dst = output[i]
                val dstA = dst ushr 24
                val outA = srcA + (dstA * (255 - srcA) + 127) / 255
                if (outA == 0) { output[i] = 0; continue }
                fun channel(shift: Int): Int {
                    val s = (src ushr shift) and 255
                    val d = (dst ushr shift) and 255
                    return ((s * srcA * 255 + d * dstA * (255 - srcA)) / (outA * 255)).coerceIn(0,255)
                }
                output[i] = (outA shl 24) or (channel(16) shl 16) or (channel(8) shl 8) or channel(0)
            }
        }
        return output
    }

    companion object {
        fun new(width: Int, height: Int, name: String = "未命名作品"): PixelDocument =
            PixelDocument(java.util.UUID.randomUUID().toString(), name, width, height)
    }
}
