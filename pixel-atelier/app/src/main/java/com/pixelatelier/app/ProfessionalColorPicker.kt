package com.pixelatelier.app

import android.graphics.Paint
import android.graphics.LinearGradient
import android.graphics.Shader
import android.graphics.SweepGradient
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/** True native color wheel, saturation/value square, alpha, HSV, RGB, HEX and swatches. */
@Composable
fun ProfessionalColorPicker(
    initialColor: Int,
    presetColors: List<Int>,
    onCommit: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    val initial = remember(initialColor) { FloatArray(3).also {
        android.graphics.Color.colorToHSV(initialColor, it)
    } }
    var hue by remember(initialColor) { mutableFloatStateOf(initial[0]) }
    var saturation by remember(initialColor) { mutableFloatStateOf(initial[1]) }
    var value by remember(initialColor) { mutableFloatStateOf(initial[2]) }
    var alpha by remember(initialColor) { mutableIntStateOf(initialColor ushr 24) }
    var hex by remember(initialColor) { mutableStateOf("%08X".format(initialColor)) }
    var tab by remember { mutableIntStateOf(0) }
    val color = remember(hue,saturation,value,alpha) {
        android.graphics.Color.HSVToColor(alpha, floatArrayOf(hue,saturation,value))
    }
    LaunchedEffect(color) { hex = "%08X".format(color) }
    fun applyColor(newColor: Int) {
        val hsv = FloatArray(3)
        android.graphics.Color.colorToHSV(newColor,hsv)
        hue=hsv[0]; saturation=hsv[1]; value=hsv[2]; alpha=newColor ushr 24
    }

    Dialog(onDismissRequest = onDismiss, properties=DialogProperties(usePlatformDefaultWidth=false)) {
        Surface(
            Modifier.fillMaxWidth(0.94f).heightIn(max=720.dp),
            shape=RoundedCornerShape(22.dp), tonalElevation=8.dp,
            color=Color(0xFF1B2330)
        ) {
            Column(
                Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
                    .padding(horizontal=16.dp,vertical=14.dp),
                verticalArrangement=Arrangement.spacedBy(8.dp)
            ) {
                Text("专业颜色选择",style=MaterialTheme.typography.titleLarge)
                Row(verticalAlignment=Alignment.CenterVertically) {
                    Box(Modifier.size(width=64.dp,height=44.dp).clip(RoundedCornerShape(8.dp))
                        .background(Color(color)).border(1.dp,Color.LightGray,RoundedCornerShape(8.dp)))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("#%08X".format(color), style=MaterialTheme.typography.titleMedium)
                        Text("ARGB · α " + alpha + " / 255",
                            style=MaterialTheme.typography.labelSmall, color=Color.LightGray)
                    }
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick={applyColor(initialColor)}) { Text("重置") }
                }
                HueAndSVPicker(
                    hue=hue, saturation=saturation, value=value,
                    onHue={ hue=it },
                    onSV={ s,v->saturation=s; value=v }
                )
                Row(verticalAlignment=Alignment.CenterVertically) {
                    Text("透明度 α",modifier=Modifier.width(74.dp),
                        style=MaterialTheme.typography.labelMedium)
                    Slider(value=alpha.toFloat(),onValueChange={alpha=it.roundToInt().coerceIn(0,255)},
                        valueRange=0f..255f,modifier=Modifier.weight(1f))
                    Text(alpha.toString(),modifier=Modifier.width(40.dp))
                }
                Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected=tab==0,onClick={tab=0},label={Text("HSV")})
                    FilterChip(selected=tab==1,onClick={tab=1},label={Text("RGB")})
                    FilterChip(selected=tab==2,onClick={tab=2},label={Text("色板")})
                }
                when(tab) {
                    0 -> {
                        ColorChannelSlider("色相 H",hue,0f..360f,{hue=it.coerceIn(0f,359.999f)})
                        ColorChannelSlider("饱和 S",saturation*100f,0f..100f,{saturation=it/100f})
                        ColorChannelSlider("明度 V",value*100f,0f..100f,{value=it/100f})
                    }
                    1 -> {
                        val red=(color ushr 16) and 255
                        val green=(color ushr 8) and 255
                        val blue=color and 255
                        ColorChannelSlider("红 R",red.toFloat(),0f..255f,
                            {applyColor((alpha shl 24) or (it.roundToInt() shl 16) or (green shl 8) or blue)})
                        ColorChannelSlider("绿 G",green.toFloat(),0f..255f,
                            {applyColor((alpha shl 24) or (red shl 16) or (it.roundToInt() shl 8) or blue)})
                        ColorChannelSlider("蓝 B",blue.toFloat(),0f..255f,
                            {applyColor((alpha shl 24) or (red shl 16) or (green shl 8) or it.roundToInt())})
                    }
                    2 -> {
                        presetColors.chunked(7).forEach { colors ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                                colors.forEach { swatch ->
                                    Box(Modifier.size(35.dp).clip(RoundedCornerShape(7.dp))
                                        .background(Color(swatch))
                                        .border(1.dp,Color.Gray,RoundedCornerShape(7.dp))
                                        .clickable { applyColor(swatch) })
                                }
                            }
                        }
                    }
                }
                Row(verticalAlignment=Alignment.CenterVertically,
                    horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value=hex,
                        onValueChange={hex=it.trim().removePrefix("#").uppercase().take(8)},
                        modifier=Modifier.weight(1f),
                        label={Text("ARGB（8 位 HEX）")},singleLine=true
                    )
                    TextButton(onClick={
                        if(hex.length==8 && hex.all{it in '0'..'9' || it in 'A'..'F'})
                            hex.toLongOrNull(16)?.let { applyColor(it.toInt()) }
                    }) {Text("应用")}
                }
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.End,
                    verticalAlignment=Alignment.CenterVertically) {
                    TextButton(onClick=onDismiss){Text("取消")}
                    Button(onClick={onCommit(color)}){Text("使用颜色")}
                }
            }
        }
    }
}

@Composable
private fun ColorChannelSlider(label: String, value: Float,
                               range: ClosedFloatingPointRange<Float>,
                               onChange: (Float) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min=42.dp),verticalAlignment=Alignment.CenterVertically) {
        Text(label,modifier=Modifier.width(68.dp),
            style=MaterialTheme.typography.labelMedium)
        Slider(value=value.coerceIn(range.start,range.endInclusive),
            onValueChange=onChange,valueRange=range,
            modifier=Modifier.weight(1f))
        Text(value.roundToInt().toString(),modifier=Modifier.width(36.dp))
    }
}

@Composable
private fun HueAndSVPicker(hue: Float, saturation: Float, value: Float,
                           onHue: (Float)->Unit, onSV: (Float,Float)->Unit) {
    val hueChange by rememberUpdatedState(onHue)
    val squareChange by rememberUpdatedState(onSV)
    Canvas(Modifier.fillMaxWidth().height(250.dp)
        .pointerInput(Unit) {
            awaitEachGesture {
                val down=awaitFirstDown(requireUnconsumed=false)
                val cx=size.width/2f; val cy=size.height/2f
                val radius=min(size.width,size.height)*0.5f - 8.dp.toPx()
                val side=radius*1.04f
                fun resolve(position: Offset, ring: Boolean) {
                    val dx=position.x-cx; val dy=position.y-cy
                    if(ring) {
                        val degrees=(Math.toDegrees(atan2(dy.toDouble(),dx.toDouble()))+360.0)%360.0
                        hueChange(degrees.toFloat())
                    } else {
                        val left=cx-side/2f; val top=cy-side/2f
                        squareChange(((position.x-left)/side).coerceIn(0f,1f),
                            (1f-(position.y-top)/side).coerceIn(0f,1f))
                    }
                }
                val dx=down.position.x-cx;val dy=down.position.y-cy
                val ring=kotlin.math.sqrt(dx*dx+dy*dy)>side*0.74f
                resolve(down.position,ring)
                while(true) {
                    val event=awaitPointerEvent()
                    val move=event.changes.firstOrNull() ?: break
                    resolve(move.position,ring)
                    move.consume()
                    if(!move.pressed) break
                }
            }
        }
    ) {
        drawIntoCanvas { canvas ->
            val native=canvas.nativeCanvas
            val cx=size.width/2f; val cy=size.height/2f
            val radius=min(size.width,size.height)*0.5f - 8.dp.toPx()
            val ringWidth=20.dp.toPx()
            val sweepColors=intArrayOf(
                0xffff0000.toInt(),0xffffff00.toInt(),0xff00ff00.toInt(),
                0xff00ffff.toInt(),0xff0000ff.toInt(),0xffff00ff.toInt(),
                0xffff0000.toInt()
            )
            val ringPaint=Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style=Paint.Style.STROKE;strokeWidth=ringWidth
                shader=SweepGradient(cx,cy,sweepColors,null)
            }
            native.drawCircle(cx,cy,radius-ringWidth/2f,ringPaint)
            val side=radius*1.04f
            val left=cx-side/2f;val top=cy-side/2f
            val hueColor=android.graphics.Color.HSVToColor(floatArrayOf(hue,1f,1f))
            val saturationPaint=Paint().apply {
                shader=LinearGradient(left,top,left+side,top,
                    android.graphics.Color.WHITE,hueColor,Shader.TileMode.CLAMP)
            }
            native.drawRect(left,top,left+side,top+side,saturationPaint)
            val blackPaint=Paint().apply {
                shader=LinearGradient(left,top,left,top+side,
                    0x00000000,0xff000000.toInt(),Shader.TileMode.CLAMP)
            }
            native.drawRect(left,top,left+side,top+side,blackPaint)
            val marker=Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style=Paint.Style.STROKE;strokeWidth=2.5.dp.toPx()
                color=android.graphics.Color.WHITE
            }
            val rad=Math.toRadians(hue.toDouble())
            val markerRadius=radius-ringWidth/2f
            native.drawCircle(cx+cos(rad).toFloat()*markerRadius,
                cy+sin(rad).toFloat()*markerRadius,ringWidth*0.52f,marker)
            val px=left+saturation*side;val py=top+(1f-value)*side
            val svColor=android.graphics.Color.HSVToColor(floatArrayOf(hue,saturation,value))
            marker.color=if(android.graphics.Color.luminance(svColor)>0.4)
                android.graphics.Color.BLACK else android.graphics.Color.WHITE
            native.drawCircle(px,py,6.dp.toPx(),marker)
        }
    }
}
