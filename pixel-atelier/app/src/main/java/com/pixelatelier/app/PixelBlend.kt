package com.pixelatelier.app

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** Explicit straight-alpha sRGB blend contract. Values stored as unpremultiplied ARGB. */
enum class PixelBlendMode(val label: String) {
    NORMAL("普通"), MULTIPLY("正片叠底"), SCREEN("滤色"), OVERLAY("叠加"),
    ADD("加法"), SUBTRACT("减法"), DARKEN("变暗"), LIGHTEN("变亮"),
    DIFFERENCE("差值"), HARD_LIGHT("强光")
}

object PixelBlend {
    private fun mix(b: Double, s: Double, mode: PixelBlendMode) = when (mode) {
        PixelBlendMode.NORMAL -> s
        PixelBlendMode.MULTIPLY -> b*s
        PixelBlendMode.SCREEN -> b+s-b*s
        PixelBlendMode.OVERLAY -> if(b<=0.5) 2*b*s else 1-2*(1-b)*(1-s)
        PixelBlendMode.ADD -> min(1.0,b+s)
        PixelBlendMode.SUBTRACT -> max(0.0,b-s)
        PixelBlendMode.DARKEN -> min(b,s)
        PixelBlendMode.LIGHTEN -> max(b,s)
        PixelBlendMode.DIFFERENCE -> abs(b-s)
        PixelBlendMode.HARD_LIGHT -> if(s<=0.5) 2*b*s else 1-2*(1-b)*(1-s)
    }

    /** Applies layer opacity and optional 8-bit coverage before source-over composition. */
    fun over(background: Int, source: Int, opacity: Int = 255,
             mode: PixelBlendMode = PixelBlendMode.NORMAL, coverage: Int = 255): Int {
        val asrc=(source ushr 24)/255.0 *
            (opacity.coerceIn(0,255)/255.0) * (coverage.coerceIn(0,255)/255.0)
        if(asrc<=0.0) return background
        val ab=(background ushr 24)/255.0
        val ao=asrc+ab*(1.0-asrc)
        if(ao<=0.0) return 0
        fun channel(shift: Int): Int {
            val cb=((background ushr shift) and 255)/255.0
            val cs=((source ushr shift) and 255)/255.0
            val blended=mix(cb,cs,mode)
            val result=((1-asrc)*ab*cb + (1-ab)*asrc*cs + asrc*ab*blended)/ao
            return (result.coerceIn(0.0,1.0)*255.0).roundToInt().coerceIn(0,255)
        }
        return ((ao*255.0).roundToInt().coerceIn(0,255) shl 24) or
            (channel(16) shl 16) or (channel(8) shl 8) or channel(0)
    }
}
