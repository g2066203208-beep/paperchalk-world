package com.pixelatelier.app

/**
 * V1.1 pure Kotlin groundwork. These APIs are not wired into the Android tool dock yet.
 * A selection mask addresses logical image pixels; it is never a display/screen mask.
 */
class SelectionMask(val width: Int, val height: Int) {
    init { require(width in 1..1024 && height in 1..1024) }
    private val bits = BooleanArray(width * height)
    fun get(x: Int, y: Int): Boolean =
        x in 0 until width && y in 0 until height && bits[y * width + x]
    fun set(x: Int, y: Int, chosen: Boolean = true) {
        if (x in 0 until width && y in 0 until height) bits[y * width + x] = chosen
    }
    fun count(): Int = bits.count { it }
    fun invert(): SelectionMask {
        for (i in bits.indices) bits[i] = !bits[i]
        return this
    }
    fun combine(other: SelectionMask, operation: MaskOperation): SelectionMask {
        require(width == other.width && height == other.height)
        for (i in bits.indices) {
            val a = bits[i]; val b = other.bits[i]
            bits[i] = when (operation) {
                MaskOperation.REPLACE -> b
                MaskOperation.ADD -> a || b
                MaskOperation.SUBTRACT -> a && !b
                MaskOperation.INTERSECT -> a && b
                MaskOperation.XOR -> a != b
            }
        }
        return this
    }
    fun bounds(): PixelBounds? {
        var left = width; var top = height; var right = 0; var bottom = 0
        for (y in 0 until height) for (x in 0 until width) if (get(x, y)) {
            left = minOf(left, x); top = minOf(top, y)
            right = maxOf(right, x + 1); bottom = maxOf(bottom, y + 1)
        }
        return if (right == 0 || bottom == 0) null else PixelBounds(left, top, right, bottom)
    }
    companion object {
        /** Half-open rectangle [left,right) × [top,bottom). */
        fun rectangle(w: Int, h: Int, left: Int, top: Int, right: Int, bottom: Int): SelectionMask {
            val result = SelectionMask(w, h)
            for (y in top.coerceAtLeast(0) until bottom.coerceAtMost(h))
                for (x in left.coerceAtLeast(0) until right.coerceAtMost(w)) result.set(x, y)
            return result
        }
        /** Pixel-center ellipse: identical topology at every viewport zoom factor. */
        fun ellipse(w: Int, h: Int, left: Int, top: Int, right: Int, bottom: Int): SelectionMask {
            val result = SelectionMask(w, h)
            if (left >= right || top >= bottom) return result
            val rx = (right - left) / 2.0; val ry = (bottom - top) / 2.0
            val cx = (left + right) / 2.0; val cy = (top + bottom) / 2.0
            for (y in top.coerceAtLeast(0) until bottom.coerceAtMost(h))
                for (x in left.coerceAtLeast(0) until right.coerceAtMost(w)) {
                    val dx = (x + 0.5 - cx) / rx; val dy = (y + 0.5 - cy) / ry
                    if (dx * dx + dy * dy <= 1.0) result.set(x, y)
                }
            return result
        }
        /** 4/8 connected flood select, visited at most once; no recursive stack. */
        fun magicWand(
            pixels: IntArray, w: Int, h: Int, startX: Int, startY: Int, eightConnected: Boolean = false
        ): SelectionMask {
            require(pixels.size == w * h)
            val result = SelectionMask(w, h)
            if (startX !in 0 until w || startY !in 0 until h) return result
            val target = pixels[startY * w + startX]
            val queue = IntArray(w * h)
            var head = 0; var tail = 0
            result.set(startX, startY)
            queue[tail++] = startY * w + startX
            val neighbors = if (eightConnected)
                arrayOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1, -1 to -1, -1 to 1, 1 to -1, 1 to 1)
                else arrayOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)
            while (head < tail) {
                val i = queue[head++]; val x = i % w; val y = i / w
                for ((dx, dy) in neighbors) {
                    val nx = x + dx; val ny = y + dy
                    if (nx in 0 until w && ny in 0 until h && !result.get(nx, ny) &&
                        pixels[ny * w + nx] == target) {
                        result.set(nx, ny)
                        queue[tail++] = ny * w + nx
                    }
                }
            }
            return result
        }
    }
}
enum class MaskOperation { REPLACE, ADD, SUBTRACT, INTERSECT, XOR }
data class PixelBounds(val left: Int, val top: Int, val right: Int, val bottom: Int) {
    init { require(left <= right && top <= bottom) }
    val width get() = right - left
    val height get() = bottom - top
}

/** An internal clipboard with explicitly copied transparency and selection mask. */
data class PixelClipboard(
    val width: Int,
    val height: Int,
    val pixels: IntArray,
    val selected: BooleanArray
) {
    init { require(width > 0 && height > 0 && pixels.size == width * height && selected.size == width * height) }
    /** The document's own pixel mutation API keeps paste as one undoable stroke. */
    fun pasteInto(document: PixelDocument, dstX: Int, dstY: Int): Boolean {
        require(document.activeLayer in document.layers.indices)
        if (document.currentLayer.locked) return false
        document.beginStroke()
        for (y in 0 until height) for (x in 0 until width) {
            val i = y * width + x
            if (selected[i]) document.setPixel(dstX + x, dstY + y, pixels[i])
        }
        return document.finishStroke()
    }
    fun flipHorizontal(): PixelClipboard {
        val out = IntArray(pixels.size); val mask = BooleanArray(selected.size)
        for (y in 0 until height) for (x in 0 until width) {
            val src = y * width + x; val dst = y * width + (width - x - 1)
            out[dst] = pixels[src]; mask[dst] = selected[src]
        }
        return PixelClipboard(width, height, out, mask)
    }
    fun flipVertical(): PixelClipboard {
        val out = IntArray(pixels.size); val mask = BooleanArray(selected.size)
        for (y in 0 until height) for (x in 0 until width) {
            val src = y * width + x; val dst = (height - y - 1) * width + x
            out[dst] = pixels[src]; mask[dst] = selected[src]
        }
        return PixelClipboard(width, height, out, mask)
    }
    /** Positive rotation = 90° clockwise in screen coordinates (Y down). */
    fun rotate90(): PixelClipboard {
        val rotatedW = height; val rotatedH = width
        val out = IntArray(rotatedW * rotatedH); val mask = BooleanArray(out.size)
        for (y in 0 until height) for (x in 0 until width) {
            val src = y * width + x
            val destX = height - 1 - y; val destY = x
            val dest = destY * rotatedW + destX
            out[dest] = pixels[src]; mask[dest] = selected[src]
        }
        return PixelClipboard(rotatedW, rotatedH, out, mask)
    }
}
object PixelSelectionTools {
    fun copy(document: PixelDocument, mask: SelectionMask): PixelClipboard? {
        require(document.width == mask.width && document.height == mask.height)
        val bounds = mask.bounds() ?: return null
        val pixels = IntArray(bounds.width * bounds.height)
        val selected = BooleanArray(pixels.size)
        for (y in 0 until bounds.height) for (x in 0 until bounds.width) {
            val i = y * bounds.width + x
            selected[i] = mask.get(bounds.left + x, bounds.top + y)
            if (selected[i]) pixels[i] = document.pixel(bounds.left + x, bounds.top + y)
        }
        return PixelClipboard(bounds.width, bounds.height, pixels, selected)
    }
    /** Periodic cell painting. When wrapX/Y disabled, normal out-of-range behavior applies. */
    fun paintWrapped(
        document: PixelDocument, x: Int, y: Int, argb: Int,
        wrapX: Boolean, wrapY: Boolean
    ) {
        val px = if (wrapX) Math.floorMod(x, document.width) else x
        val py = if (wrapY) Math.floorMod(y, document.height) else y
        document.setPixel(px, py, argb)
    }
    /** Clean hard-pixel ellipse border or fill, using shared pixel-center mask test. */
    fun drawEllipse(
        document: PixelDocument, left: Int, top: Int, right: Int, bottom: Int,
        argb: Int, filled: Boolean = false
    ): Boolean {
        val mask = SelectionMask.ellipse(document.width, document.height, left, top, right, bottom)
        document.beginStroke()
        for (y in 0 until document.height) for (x in 0 until document.width) {
            if (!mask.get(x, y)) continue
            if (filled || !mask.get(x-1,y) || !mask.get(x+1,y) ||
                !mask.get(x,y-1) || !mask.get(x,y+1)) document.setPixel(x, y, argb)
        }
        return document.finishStroke()
    }
}
