package com.pixelatelier.app

import java.util.ArrayDeque

/** Authoritative, addressable ARGB pixels. No anti-aliasing, resampling or implicit blur. */
data class PixelLayer(
    val id: Long,
    var name: String,
    val pixels: IntArray,
    var visible: Boolean = true,
    var locked: Boolean = false,
    var opacity: Int = 255,
    var blendMode: PixelBlendMode = PixelBlendMode.NORMAL,
    var alphaLocked: Boolean = false,
    var mask: ByteArray? = null,
    var maskEnabled: Boolean = true
) {
    fun copyLayer(): PixelLayer = copy(pixels = pixels.copyOf(), mask = mask?.copyOf())
}

private data class Change(val index: Int, val before: Int, val after: Int)
private data class LayerPixelsChange(val layerId: Long, val changes: List<Change>)
private data class LayerSettings(
    val opacity: Int, val blendMode: PixelBlendMode, val alphaLocked: Boolean,
    val mask: ByteArray?, val maskEnabled: Boolean
)
private data class LayerPropertyChange(val layerId: Long,
    val before: LayerSettings, val after: LayerSettings)
private data class PixelAction(
    val affectedLayers: List<LayerPixelsChange> = emptyList(),
    val properties: List<LayerPropertyChange> = emptyList()
)
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
    private var maskStrokeOriginal: ByteArray? = null
    private var maskStrokeLayerId: Long = -1
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
        val old = layer.pixels[index]
        val next = if (layer.alphaLocked) {
            if (old ushr 24 == 0 || argb ushr 24 == 0) return
            (old and -0x1000000) or (argb and 0x00FFFFFF)
        } else argb
        if (old == next) return
        if (stroke == null) beginStroke()
        stroke?.putIfAbsent(index, old)
        layer.pixels[index] = next
    }

    /** Begins a grayscale mask painting stroke, recorded as one undoable edit. */
    fun beginMaskStroke(): Boolean {
        finishMaskStroke()
        finishStroke()
        val layer=currentLayer
        if(layer.locked || layer.mask==null) return false
        maskStrokeOriginal=layer.mask!!.copyOf()
        maskStrokeLayerId=layer.id
        return true
    }
    fun setMaskPixel(x: Int,y: Int,value: Int) {
        if(x !in 0 until width || y !in 0 until height) return
        val layer=layers.firstOrNull { it.id==maskStrokeLayerId } ?: return
        if(layer.locked) return
        layer.mask?.set(y*width+x,value.coerceIn(0,255).toByte())
    }
    fun maskLine(x0: Int,y0: Int,x1: Int,y1: Int,value: Int) {
        var x=x0;var y=y0
        val dx=kotlin.math.abs(x1-x0); val dy=kotlin.math.abs(y1-y0)
        val sx=if(x0<x1) 1 else -1;val sy=if(y0<y1) 1 else -1
        var err=dx-dy
        while(true) {
            setMaskPixel(x,y,value)
            if(x==x1 && y==y1) break
            val e2=err*2
            if(e2 > -dy) {err-=dy;x+=sx}
            if(e2 < dx) {err+=dx;y+=sy}
        }
    }
    fun finishMaskStroke(): Boolean {
        val before=maskStrokeOriginal ?: return false
        val id=maskStrokeLayerId
        val layer=layers.firstOrNull { it.id==id }
        maskStrokeOriginal=null
        maskStrokeLayerId=-1
        val after=layer?.mask ?: return false
        if(before.contentEquals(after)) return false
        val old=settings(layer).copy(mask=before)
        val now=settings(layer)
        undo.addLast(PixelAction(properties=listOf(LayerPropertyChange(id,old,now))))
        while(undo.size > historyLimit) undo.removeFirst()
        redo.clear()
        return true
    }
    fun cancelMaskStroke() {
        val before=maskStrokeOriginal ?: return
        layers.firstOrNull { it.id==maskStrokeLayerId }?.mask=before
        maskStrokeOriginal=null
        maskStrokeLayerId=-1
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
        finishMaskStroke()
        finishStroke()
        if (undo.isEmpty()) return false
        val action = undo.removeLast()
        for (entry in action.affectedLayers) {
            layers.firstOrNull { it.id == entry.layerId }?.let { layer ->
                for (c in entry.changes) layer.pixels[c.index] = c.before
            }
        }
        for (entry in action.properties) {
            layers.firstOrNull { it.id == entry.layerId }?.let { applySettings(it, entry.before) }
        }
        redo.addLast(action)
        return true
    }

    fun redo(): Boolean {
        finishMaskStroke()
        if (redo.isEmpty()) return false
        val action = redo.removeLast()
        for (entry in action.affectedLayers) {
            layers.firstOrNull { it.id == entry.layerId }?.let { layer ->
                for (c in entry.changes) layer.pixels[c.index] = c.after
            }
        }
        for (entry in action.properties) {
            layers.firstOrNull { it.id == entry.layerId }?.let { applySettings(it, entry.after) }
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
                val next = if (layer.alphaLocked) {
                    if (before ushr 24 == 0 || color ushr 24 == 0) continue
                    (before and -0x1000000) or (color and 0x00FFFFFF)
                } else color
                if (before == next) continue
                changes.add(Change(index, before, next))
                layer.pixels[index] = next
            }
            if (changes.isNotEmpty()) entries.add(LayerPixelsChange(layer.id, changes))
        }
        if (entries.isEmpty()) return false
        undo.addLast(PixelAction(entries))
        while (undo.size > historyLimit) undo.removeFirst()
        redo.clear()
        return true
    }

    private fun settings(layer: PixelLayer) = LayerSettings(
        layer.opacity, layer.blendMode, layer.alphaLocked, layer.mask?.copyOf(), layer.maskEnabled
    )
    private fun applySettings(layer: PixelLayer, snapshot: LayerSettings) {
        layer.opacity = snapshot.opacity
        layer.blendMode = snapshot.blendMode
        layer.alphaLocked = snapshot.alphaLocked
        layer.mask = snapshot.mask?.copyOf()
        layer.maskEnabled = snapshot.maskEnabled
    }
    private fun mutateSettings(block: (PixelLayer) -> Unit): Boolean {
        finishMaskStroke()
        finishStroke()
        val layer = currentLayer
        if (layer.locked) return false
        val old=settings(layer)
        block(layer)
        val after=settings(layer)
        if (old.opacity == after.opacity && old.blendMode == after.blendMode &&
            old.alphaLocked == after.alphaLocked && old.maskEnabled == after.maskEnabled &&
            (old.mask?.contentEquals(after.mask ?: ByteArray(0)) ?: (after.mask == null))) return false
        undo.addLast(PixelAction(properties=listOf(LayerPropertyChange(layer.id,old,after))))
        while(undo.size > historyLimit) undo.removeFirst()
        redo.clear()
        return true
    }
    fun setBlendMode(mode: PixelBlendMode) =
        mutateSettings { it.blendMode = mode }
    fun setOpacity(value: Int) =
        mutateSettings { it.opacity = value.coerceIn(0,255) }
    fun setAlphaLocked(value: Boolean) =
        mutateSettings { it.alphaLocked = value }
    fun createMask(): Boolean =
        mutateSettings { it.mask = ByteArray(width*height){ 0xff.toByte() }; it.maskEnabled = true }
    fun removeMask(): Boolean =
        mutateSettings { it.mask = null }
    fun fillMask(value: Int): Boolean =
        mutateSettings { it.mask?.fill(value.coerceIn(0,255).toByte()) }
    fun invertMask(): Boolean =
        mutateSettings { it.mask?.let { pixels ->
            for(i in pixels.indices) pixels[i]=(255-(pixels[i].toInt() and 255)).toByte()
        } }
    fun setMaskEnabled(enabled: Boolean): Boolean =
        mutateSettings { if(it.mask != null) it.maskEnabled=enabled }

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

    private fun blendPixel(dst: Int, layer: PixelLayer, src: Int, index: Int): Int {
        val coverage = if(layer.maskEnabled) (layer.mask?.get(index)?.toInt()?.and(255) ?: 255) else 255
        return PixelBlend.over(dst,src,layer.opacity,layer.blendMode,coverage)
    }

    /** Uses the exact same per-layer blend and mask arithmetic as final export. */
    fun compositeWithPreview(index: Int, previewArgb: Int): Int {
        if(index !in 0 until width*height) return 0
        var output=0
        for(layer in layers) {
            if(!layer.visible || layer.opacity==0) continue
            val src=if(layer.id==currentLayer.id) {
                val original=layer.pixels[index]
                if(layer.alphaLocked) {
                    if(original ushr 24 == 0 || previewArgb ushr 24 == 0) original
                    else (original and -0x1000000) or (previewArgb and 0x00FFFFFF)
                } else previewArgb
            } else layer.pixels[index]
            output=blendPixel(output,layer,src,index)
        }
        return output
    }

    /** Single authoritative CPU compositing path for editor and exported PNG. */
    fun composite(): IntArray {
        val output=IntArray(width*height)
        for(layer in layers) {
            if(!layer.visible || layer.opacity==0) continue
            for(i in output.indices)
                output[i]=blendPixel(output[i],layer,layer.pixels[i],i)
        }
        return output
    }

    companion object {
        fun new(width: Int, height: Int, name: String = "未命名作品"): PixelDocument =
            PixelDocument(java.util.UUID.randomUUID().toString(), name, width, height)
    }
}
