package com.pixelatelier.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

/** Versioned, atomic, fully local project archive. One pixel = one encoded ARGB integer. */
class ProjectStore(context: Context) {
    private val folder = File(context.filesDir, "projects").apply { mkdirs() }

    fun list(): List<File> = folder.listFiles { file -> file.isFile && file.name.endsWith(".pixelatelier") }
        ?.sortedByDescending { it.lastModified() } ?: emptyList()

    private fun file(id: String) = File(folder, id.filter { it.isLetterOrDigit() || it == '-' } + ".pixelatelier")

    fun save(document: PixelDocument) {
        val target = AtomicFile(file(document.id))
        val output = target.startWrite()
        try {
            ZipOutputStream(output).use { zip ->
                val manifest = JSONObject()
                manifest.put("format", "pixelatelier")
                manifest.put("version", 1)
                manifest.put("id", document.id)
                manifest.put("title", document.title)
                manifest.put("width", document.width)
                manifest.put("height", document.height)
                manifest.put("active", document.activeLayer)
                val layers = JSONArray()
                document.layers.forEachIndexed { i, layer ->
                    layers.put(JSONObject()
                        .put("id", layer.id)
                        .put("name", layer.name)
                        .put("visible", layer.visible)
                        .put("locked", layer.locked)
                        .put("opacity", layer.opacity))
                    val bytes = ByteArrayOutputStream(document.width * document.height * 4)
                    DataOutputStream(bytes).use { out -> layer.pixels.forEach { out.writeInt(it) } }
                    zip.putNextEntry(ZipEntry("layers/" + i + ".argb"))
                    zip.write(bytes.toByteArray())
                    zip.closeEntry()
                }
                manifest.put("layers", layers)
                zip.putNextEntry(ZipEntry("manifest.json"))
                zip.write(manifest.toString().toByteArray(Charsets.UTF_8))
                zip.closeEntry()
            }
            target.finishWrite(output)
        } catch (error: Throwable) {
            target.failWrite(output)
            throw error
        }
    }

    fun load(id: String): PixelDocument = load(file(id))

    fun load(source: File): PixelDocument {
        var manifest: JSONObject? = null
        val raw = hashMapOf<Int, ByteArray>()
        ZipInputStream(source.inputStream().buffered()).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                if (entry.name == "manifest.json") {
                    val bytes = readBounded(zip, 128 * 1024)
                    manifest = JSONObject(String(bytes, Charsets.UTF_8))
                } else {
                    val match = Regex("layers/([0-9]+)\\.argb").matchEntire(entry.name)
                    if (match != null) {
                        val index = match.groupValues[1].toInt()
                        if (index in 0..31) raw[index] = readBounded(zip, 4 * 1024 * 1024)
                    }
                }
                zip.closeEntry()
            }
        }
        val json = manifest ?: error("缺少工程清单")
        require(json.getString("format") == "pixelatelier" && json.getInt("version") == 1)
        val w = json.getInt("width"); val h = json.getInt("height")
        require(w in 1..1024 && h in 1..1024 && w.toLong() * h <= 1048576)
        val infos = json.getJSONArray("layers")
        require(infos.length() in 1..32)
        val layers = (0 until infos.length()).map { i ->
            val metadata = infos.getJSONObject(i)
            val bytes = raw[i] ?: error("图层数据缺失")
            require(bytes.size == w * h * 4) { "图层数据损坏" }
            val input = DataInputStream(ByteArrayInputStream(bytes))
            val pixels = IntArray(w * h) { input.readInt() }
            PixelLayer(metadata.getLong("id"), metadata.getString("name"),
                pixels, metadata.getBoolean("visible"), metadata.getBoolean("locked"),
                metadata.getInt("opacity").coerceIn(0, 255))
        }.toMutableList()
        return PixelDocument(json.getString("id"), json.getString("title"), w, h,
            layers, json.optInt("active").coerceIn(0, layers.lastIndex))
    }

    private fun readBounded(input: InputStream, limit: Int): ByteArray {
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        while (true) {
            val n = input.read(buffer)
            if (n < 0) break
            require(output.size() + n <= limit) { "项目文件超过安全大小" }
            output.write(buffer, 0, n)
        }
        return output.toByteArray()
    }

    fun exportPng(document: PixelDocument, output: OutputStream) {
        val bitmap = Bitmap.createBitmap(document.width, document.height, Bitmap.Config.ARGB_8888)
        try {
            bitmap.setPixels(document.composite(), 0, document.width, 0, 0, document.width, document.height)
            require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) { "PNG 写入失败" }
        } finally { bitmap.recycle() }
    }

    fun importPng(input: InputStream): PixelDocument {
        val bitmap = BitmapFactory.decodeStream(input) ?: error("无法读取图片")
        try {
            require(bitmap.width in 1..1024 && bitmap.height in 1..1024)
            require(bitmap.width.toLong() * bitmap.height <= 1048576)
            val doc = PixelDocument.new(bitmap.width, bitmap.height, "导入图片")
            bitmap.getPixels(doc.currentLayer.pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
            return doc
        } finally { bitmap.recycle() }
    }
}
