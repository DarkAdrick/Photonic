package com.phoenixfactory.photonic

import android.Manifest
import android.content.ContentUris
import android.content.ContentValues
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import org.json.JSONObject

@CapacitorPlugin(
    name = "PhotonicBackend",
    permissions = [
        Permission(strings = [Manifest.permission.READ_MEDIA_IMAGES]),
        Permission(strings = [Manifest.permission.READ_MEDIA_VIDEO]),
        Permission(strings = [Manifest.permission.READ_EXTERNAL_STORAGE])
    ]
)
class PhotonicBackendPlugin : Plugin() {

    private val executor = Executors.newSingleThreadExecutor()

    private fun requiredPermissions(): Array<String> =
        if (Build.VERSION.SDK_INT >= 33) {
            arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

    private fun allGranted(): Boolean =
        requiredPermissions().all {
            activity?.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED
        }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", allGranted())
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (allGranted()) {
            val ret = JSObject()
            ret.put("granted", true)
            call.resolve(ret)
        } else {
            requestPermissionForAliases(arrayOf("photos"), call, "permissionCallback")
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", allGranted())
        call.resolve(ret)
    }

    @PluginMethod
    fun scanMedia(call: PluginCall) {
        if (!allGranted()) {
            val ret = JSObject()
            ret.put("error", "permission denied")
            ret.put("granted", false)
            call.resolve(ret)
            return
        }
        executor.execute {
            try {
                val photos = JSArray()
                queryImages().forEach { photos.put(it) }
                queryVideos().forEach { photos.put(it) }
                val ret = JSObject()
                ret.put("photos", photos)
                ret.put("done", true)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("scanMedia failed: ${e.message}", e)
            }
        }
    }

    private fun queryImages(): List<JSObject> {
        val resolver = activity?.contentResolver ?: return emptyList()
        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.DATE_TAKEN,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
            MediaStore.Images.Media.ORIENTATION,
            MediaStore.Images.Media.LATITUDE,
            MediaStore.Images.Media.LONGITUDE
        )
        val list = mutableListOf<JSObject>()
        resolver.query(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            projection, null, null, null
        )?.use { cursor ->
            val idCol = cursor.getColumnIndex(MediaStore.Images.Media._ID)
            val nameCol = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME)
            val sizeCol = cursor.getColumnIndex(MediaStore.Images.Media.SIZE)
            val dateCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN)
            val mimeCol = cursor.getColumnIndex(MediaStore.Images.Media.MIME_TYPE)
            val widthCol = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH)
            val heightCol = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT)
            val orientCol = cursor.getColumnIndex(MediaStore.Images.Media.ORIENTATION)
            val latCol = cursor.getColumnIndex(MediaStore.Images.Media.LATITUDE)
            val lngCol = cursor.getColumnIndex(MediaStore.Images.Media.LONGITUDE)
            while (cursor.moveToNext()) {
                val id = if (idCol >= 0) cursor.getLong(idCol) else -1L
                val uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
                val obj = JSObject()
                obj.put("uri", uri.toString())
                obj.put("kind", "image")
                obj.put("filename", if (nameCol >= 0) cursor.getString(nameCol) else "")
                obj.put("size", if (sizeCol >= 0) cursor.getLong(sizeCol) else 0L)
                val dateTaken = if (dateCol >= 0) cursor.getLong(dateCol) else 0L
                obj.put("date_taken", formatDate(dateTaken))
                obj.put("mime", if (mimeCol >= 0) cursor.getString(mimeCol) ?: "" else "")
                obj.put("width", if (widthCol >= 0) cursor.getInt(widthCol) else 0)
                obj.put("height", if (heightCol >= 0) cursor.getInt(heightCol) else 0)
                obj.put("orientation", if (orientCol >= 0) cursor.getInt(orientCol) else 0)
                if (latCol >= 0 && !cursor.isNull(latCol)) {
                    obj.put("latitude", cursor.getDouble(latCol))
                } else {
                    obj.put("latitude", JSONObject.NULL)
                }
                if (lngCol >= 0 && !cursor.isNull(lngCol)) {
                    obj.put("longitude", cursor.getDouble(lngCol))
                } else {
                    obj.put("longitude", JSONObject.NULL)
                }
                obj.put("hash", md5Of(uri))
                list.add(obj)
            }
        }
        return list
    }

    private fun queryVideos(): List<JSObject> {
        val resolver = activity?.contentResolver ?: return emptyList()
        val projection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME,
            MediaStore.Video.Media.SIZE,
            MediaStore.Video.Media.DATE_TAKEN,
            MediaStore.Video.Media.MIME_TYPE,
            MediaStore.Video.Media.WIDTH,
            MediaStore.Video.Media.HEIGHT,
            MediaStore.Video.Media.LATITUDE,
            MediaStore.Video.Media.LONGITUDE
        )
        val list = mutableListOf<JSObject>()
        resolver.query(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            projection, null, null, null
        )?.use { cursor ->
            val idCol = cursor.getColumnIndex(MediaStore.Video.Media._ID)
            val nameCol = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME)
            val sizeCol = cursor.getColumnIndex(MediaStore.Video.Media.SIZE)
            val dateCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_TAKEN)
            val mimeCol = cursor.getColumnIndex(MediaStore.Video.Media.MIME_TYPE)
            val widthCol = cursor.getColumnIndex(MediaStore.Video.Media.WIDTH)
            val heightCol = cursor.getColumnIndex(MediaStore.Video.Media.HEIGHT)
            val latCol = cursor.getColumnIndex(MediaStore.Video.Media.LATITUDE)
            val lngCol = cursor.getColumnIndex(MediaStore.Video.Media.LONGITUDE)
            while (cursor.moveToNext()) {
                val id = if (idCol >= 0) cursor.getLong(idCol) else -1L
                val uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id)
                val obj = JSObject()
                obj.put("uri", uri.toString())
                obj.put("kind", "video")
                obj.put("filename", if (nameCol >= 0) cursor.getString(nameCol) else "")
                obj.put("size", if (sizeCol >= 0) cursor.getLong(sizeCol) else 0L)
                val dateTaken = if (dateCol >= 0) cursor.getLong(dateCol) else 0L
                obj.put("date_taken", formatDate(dateTaken))
                obj.put("mime", if (mimeCol >= 0) cursor.getString(mimeCol) ?: "" else "")
                obj.put("width", if (widthCol >= 0) cursor.getInt(widthCol) else 0)
                obj.put("height", if (heightCol >= 0) cursor.getInt(heightCol) else 0)
                obj.put("orientation", 0)
                if (latCol >= 0 && !cursor.isNull(latCol)) {
                    obj.put("latitude", cursor.getDouble(latCol))
                } else {
                    obj.put("latitude", JSONObject.NULL)
                }
                if (lngCol >= 0 && !cursor.isNull(lngCol)) {
                    obj.put("longitude", cursor.getDouble(lngCol))
                } else {
                    obj.put("longitude", JSONObject.NULL)
                }
                obj.put("hash", md5Of(uri))
                list.add(obj)
            }
        }
        return list
    }

    private fun formatDate(epochMillis: Long): String {
        if (epochMillis <= 0) return ""
        return SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date(epochMillis))
    }

    private fun md5Of(uri: Uri): String {
        return try {
            val resolver = activity?.contentResolver ?: return ""
            val input = resolver.openInputStream(uri) ?: return ""
            input.use {
                val digest = MessageDigest.getInstance("MD5")
                val buffer = ByteArray(8192)
                while (true) {
                    val read = it.read(buffer)
                    if (read == -1) break
                    digest.update(buffer, 0, read)
                }
                val bytes = digest.digest()
                val sb = StringBuilder()
                for (b in bytes) {
                    sb.append(String.format("%02x", b))
                }
                sb.toString()
            }
        } catch (e: Exception) {
            ""
        }
    }

    @PluginMethod
    fun readFile(call: PluginCall) {
        val uri = call.getString("uri") ?: run {
            call.reject("uri is required")
            return
        }
        val maxDim = (call.getInt("maxDim", 0) ?: 0)
        val mime = call.getString("mime") ?: ""
        executor.execute {
            try {
                if (mime.startsWith("video/")) {
                    resolveVideoThumb(Uri.parse(uri), MediaStore.Video.Thumbnails.MINI_KIND, call, mime)
                } else {
                    val result = decodeImage(Uri.parse(uri), maxDim)
                    call.resolve(result)
                }
            } catch (e: Exception) {
                call.reject("readFile failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun thumbnail(call: PluginCall) {
        val uri = call.getString("uri") ?: run {
            call.reject("uri is required")
            return
        }
        val mime = call.getString("mime") ?: ""
        executor.execute {
            try {
                if (mime.startsWith("video/")) {
                    resolveVideoThumb(Uri.parse(uri), MediaStore.Video.Thumbnails.MINI_KIND, call, mime)
                } else {
                    val result = decodeImage(Uri.parse(uri), 520)
                    call.resolve(result)
                }
            } catch (e: Exception) {
                call.reject("thumbnail failed: ${e.message}", e)
            }
        }
    }

    private fun resolveVideoThumb(uri: Uri, kind: Int, call: PluginCall, mime: String) {
        val resolver = activity?.contentResolver ?: throw IllegalStateException("No content resolver")
        val id = try {
            val idStr = uri.lastPathSegment?.toLongOrNull()
            idStr ?: ContentUris.parseId(uri)
        } catch (e: Exception) {
            ContentUris.parseId(uri)
        }
        val bitmap = MediaStore.Video.Thumbnails.getThumbnail(
            resolver, id, kind, null
        )
        if (bitmap == null) {
            call.reject("Could not generate video thumbnail")
            return
        }
        val ret = JSObject()
        ret.put("data", bitmapToBase64(bitmap))
        ret.put("width", bitmap.width)
        ret.put("height", bitmap.height)
        ret.put("mime", mime)
        call.resolve(ret)
    }

    private fun decodeImage(uri: Uri, maxDim: Int): JSObject {
        val resolver = activity?.contentResolver ?: throw IllegalStateException("No content resolver")
        val input = resolver.openInputStream(uri) ?: throw IllegalStateException("Cannot open stream")

        val orientation = try {
            val exif = ExifInterface(input)
            exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        } catch (e: Exception) {
            ExifInterface.ORIENTATION_NORMAL
        }

        val bounds = BitmapFactory.Options()
        bounds.inJustDecodeBounds = true
        val rawInput = resolver.openInputStream(uri)
        BitmapFactory.decodeStream(rawInput, null, bounds)
        rawInput?.close()

        var bitmap: Bitmap
        if (maxDim > 0 && bounds.outWidth > 0 && (bounds.outWidth > maxDim || bounds.outHeight > maxDim)) {
            val scale = maxOf(bounds.outWidth, bounds.outHeight).toFloat() / maxDim.toFloat()
            val options = BitmapFactory.Options()
            options.inSampleSize = if (scale > 4f) 4 else if (scale > 2f) 2 else 1
            val stream = resolver.openInputStream(uri)
            bitmap = BitmapFactory.decodeStream(stream, null, options)!!
            stream?.close()
            if (maxOf(bitmap.width, bitmap.height) > maxDim) {
                val ratio = maxDim.toFloat() / maxOf(bitmap.width, bitmap.height).toFloat()
                val newW = (bitmap.width * ratio).toInt().coerceAtLeast(1)
                val newH = (bitmap.height * ratio).toInt().coerceAtLeast(1)
                bitmap = Bitmap.createScaledBitmap(bitmap, newW, newH, true)
            }
        } else {
            val stream = resolver.openInputStream(uri)
            bitmap = BitmapFactory.decodeStream(stream)!!
            stream?.close()
        }

        val rotated = applyRotation(bitmap, orientation)
        if (rotated !== bitmap) {
            bitmap.recycle()
        }

        val ret = JSObject()
        ret.put("data", bitmapToBase64(rotated))
        ret.put("width", rotated.width)
        ret.put("height", rotated.height)
        ret.put("mime", "image/jpeg")
        return ret
    }

    private fun applyRotation(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.postRotate(90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.postRotate(270f)
                matrix.postScale(-1f, 1f)
            }
            else -> return bitmap
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    @PluginMethod
    fun rawBytes(call: PluginCall) {
        val uri = call.getString("uri") ?: run {
            call.reject("uri is required")
            return
        }
        executor.execute {
            try {
                val resolver = activity?.contentResolver ?: throw IllegalStateException("No content resolver")
                val input = resolver.openInputStream(Uri.parse(uri)) ?: throw IllegalStateException("Cannot open stream")
                input.use {
                    val out = ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (true) {
                        val read = it.read(buffer)
                        if (read == -1) break
                        out.write(buffer, 0, read)
                    }
                    val bytes = out.toByteArray()
                    val ret = JSObject()
                    ret.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP))
                    ret.put("mime", queryMimeType(uri))
                    ret.put("size", bytes.size)
                    call.resolve(ret)
                }
            } catch (e: Exception) {
                call.reject("rawBytes failed: ${e.message}", e)
            }
        }
    }

    private fun queryMimeType(uri: String): String {
        return try {
            val resolver = activity?.contentResolver ?: return ""
            resolver.query(Uri.parse(uri), null, null, null, null)?.use { cursor ->
                val col = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
                if (col >= 0) cursor.getString(col) ?: "" else ""
            } ?: ""
        } catch (e: Exception) {
            ""
        }
    }
}
