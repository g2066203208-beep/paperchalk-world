package com.pixelatelier.app

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Authoritative V1.2 shape rasterizer. The viewport previews these exact integer pixel
 * indices; confirmation calls [commit] with the same result. The document is NEVER
 * modified by [rasterize]. Coordinates are half-open only for selection bounds.
 */
enum class ShapeKind { LINE, RECTANGLE, FILLED_RECTANGLE, ELLIPSE, FILLED_ELLIPSE, RECT_SELECTION }

data class PixelPoint(val x: Int, val y: Int)

data class ShapeDraft(
    val kind: ShapeKind,
    val start: PixelPoint,
    val end: PixelPoint,
    val argb: Int
) {
    fun withStart(value: PixelPoint) = copy(start = value)
    fun withEnd(value: PixelPoint) = copy(end = value)
}

/** One authoritative operation for preview and commit, independent of Android display DPI. */
object ShapeRasterizer {
    fun selection(width: Int, height: Int, draft: ShapeDraft): SelectionMask {
        require(draft.kind == ShapeKind.RECT_SELECTION)
        val x0 = draft.start.x.coerceIn(0, width - 1)
        val x1 = draft.end.x.coerceIn(0, width - 1)
        val y0 = draft.start.y.coerceIn(0, height - 1)
        val y1 = draft.end.y.coerceIn(0, height - 1)
        return SelectionMask.rectangle(width, height, min(x0,x1), min(y0,y1), max(x0,x1)+1, max(y0,y1)+1)
    }

    fun rasterize(width: Int, height: Int, draft: ShapeDraft): IntArray {
        require(width in 1..1024 && height in 1..1024)
        if (draft.kind == ShapeKind.RECT_SELECTION) return IntArray(0)
        // Safe bounded coordinates: prevents huge offscreen line loops.
        val a = PixelPoint(draft.start.x.coerceIn(-width,2*width),
            draft.start.y.coerceIn(-height,2*height))
        val b = PixelPoint(draft.end.x.coerceIn(-width,2*width),
            draft.end.y.coerceIn(-height,2*height))
        val l = min(a.x,b.x).coerceAtLeast(0)
        val r = max(a.x,b.x).coerceAtMost(width-1)
        val t = min(a.y,b.y).coerceAtLeast(0)
        val bot = max(a.y,b.y).coerceAtMost(height-1)
        if (l > r || t > bot) return IntArray(0)
        return when(draft.kind) {
            ShapeKind.LINE -> {
                // Full geometric path is clipped only at plot time.
                val data = IntArray(max(abs(b.x-a.x),abs(b.y-a.y))+1)
                var n=0
                var x=a.x; var y=a.y
                val dx=abs(b.x-a.x); val dy=abs(b.y-a.y)
                val sx=if (a.x<b.x) 1 else -1
                val sy=if (a.y<b.y) 1 else -1
                var error=dx-dy
                while(true) {
                    if(x in 0 until width && y in 0 until height) data[n++]=y*width+x
                    if(x==b.x && y==b.y) break
                    val twice=error*2
                    if(twice > -dy) { error-=dy; x+=sx }
                    if(twice < dx) { error+=dx; y+=sy }
                }
                data.copyOf(n)
            }
            ShapeKind.RECTANGLE, ShapeKind.FILLED_RECTANGLE -> {
                val result=IntArray((r-l+1)*(bot-t+1))
                var n=0
                for(y in t..bot) for(x in l..r)
                    if(draft.kind==ShapeKind.FILLED_RECTANGLE || x==l || x==r || y==t || y==bot)
                        result[n++]=y*width+x
                result.copyOf(n)
            }
            ShapeKind.ELLIPSE, ShapeKind.FILLED_ELLIPSE -> {
                val mask=SelectionMask.ellipse(width,height,
                    min(a.x,b.x),min(a.y,b.y),max(a.x,b.x)+1,max(a.y,b.y)+1)
                val result=IntArray((r-l+1)*(bot-t+1))
                var n=0
                for(y in t..bot) for(x in l..r) {
                    if(!mask.get(x,y)) continue
                    if(draft.kind==ShapeKind.FILLED_ELLIPSE ||
                        !mask.get(x-1,y) || !mask.get(x+1,y) ||
                        !mask.get(x,y-1) || !mask.get(x,y+1))
                        result[n++]=y*width+x
                }
                result.copyOf(n)
            }
            ShapeKind.RECT_SELECTION -> IntArray(0)
        }
    }

    /** One undo action regardless of the number of draft endpoint adjustments. */
    fun commit(document: PixelDocument, draft: ShapeDraft): Boolean {
        if (draft.kind == ShapeKind.RECT_SELECTION || document.currentLayer.locked) return false
        val indices=rasterize(document.width, document.height, draft)
        document.beginStroke()
        for(i in indices) document.setPixel(i % document.width, i / document.width, draft.argb)
        return document.finishStroke()
    }

    /** Exact preview/commit mask consistency check, useful for golden tests. */
    fun logicalMask(width: Int, height: Int, draft: ShapeDraft): BooleanArray {
        val bits=BooleanArray(width*height)
        if (draft.kind==ShapeKind.RECT_SELECTION) {
            val mask=selection(width,height,draft)
            for(y in 0 until height) for(x in 0 until width)
                bits[y*width+x]=mask.get(x,y)
        } else for(i in rasterize(width,height,draft)) bits[i]=true
        return bits
    }
}
