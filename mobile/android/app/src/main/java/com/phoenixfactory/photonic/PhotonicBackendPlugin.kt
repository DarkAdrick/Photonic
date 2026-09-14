package com.phoenixfactory.photonic

import android.Manifest
import android.content.ContentResolver
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.MediaMetadataRetriever
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayInputStream
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import org.json.JSONObject

// EXIF metadata extracted from an image header (mirrors the fields the
// desktop scanner stores: backend/scanner.py). Exposure/geometry values are
// formatted as decimal strings (e.g. "50.0", "2.8", "0.008") to match
// Pillow's IFDRational.__str__ output used by the desktop scanner.
data class ImageExif(
    var cameraMake: String? = null,
    var cameraModel: String? = null,
    var lens: String? = null,
    var focalLength: String? = null,
    var aperture: String? = null,
    var shutterSpeed: String? = null,
    var iso: Int? = null,
    var orientation: Int? = null,
    var dateTaken: String? = null,
    var latitude: Double? = null,
    var longitude: Double? = null,
    var hasGpsTags: Boolean = false
)

@CapacitorPlugin(
    name = "PhotonicBackend",
    permissions = [
        Permission(strings = [Manifest.permission.READ_MEDIA_IMAGES], alias = "media"),
        Permission(strings = [Manifest.permission.READ_MEDIA_VIDEO], alias = "media"),
        Permission(strings = [Manifest.permission.ACCESS_MEDIA_LOCATION], alias = "loc"),
        Permission(strings = [Manifest.permission.READ_EXTERNAL_STORAGE], alias = "legacy")
    ]
)
class PhotonicBackendPlugin : Plugin() {

    private val executor = Executors.newSingleThreadExecutor()

    // Media read is the gate for scanning. ACCESS_MEDIA_LOCATION is only used
    // to lift the EXIF-GPS redaction when the user accepts it; its denial must
    // not block the scan (photos just come back without coordinates).
    private fun mediaPermissions(): Array<String> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

    private fun allGranted(): Boolean =
        mediaPermissions().all {
            activity?.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED
        }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", allGranted())
        ret.put("locationGranted", locationGranted())
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        val mediaOk = allGranted()
        if (mediaOk && locationGranted()) {
            val ret = JSObject()
            ret.put("granted", true)
            ret.put("locationGranted", true)
            call.resolve(ret)
            return
        }
        val mediaAlias = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) "media" else "legacy"
        if (!mediaOk && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            requestPermissionForAliases(arrayOf(mediaAlias, "loc"), call, "permissionCallback")
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Photos/videos already granted: request the optional location
            // redaction access on its own (required to lift the EXIF GPS).
            requestPermissionForAlias("loc", call, "permissionCallback")
        } else {
            requestPermissionForAlias(mediaAlias, call, "permissionCallback")
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val ret = JSObject()
        // Only the media permissions gate the scan; the optional location
        // redaction access is reported separately.
        ret.put("granted", allGranted())
        ret.put("locationGranted", locationGranted())
        call.resolve(ret)
    }

    private fun locationGranted(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.R ||
            activity?.checkSelfPermission(Manifest.permission.ACCESS_MEDIA_LOCATION) == PackageManager.PERMISSION_GRANTED

    @PluginMethod
    fun scanPage(call: PluginCall) {
        if (!allGranted()) {
            val ret = JSObject()
            ret.put("error", "permission denied")
            ret.put("granted", false)
            call.resolve(ret)
            return
        }
        val roots = parseRoots(call)
        val kind = call.getString("kind") ?: "image"
        val afterId = (call.getData()?.opt("afterId") as? Number)?.toLong()
            ?: call.getString("afterId")?.toLongOrNull()
            ?: 0L
        val limit = call.getInt("limit") ?: 400
        Log.d("PhotonicScan", "scanPage parsed afterId=$afterId kind=$kind data=${call.getData()}")
        executor.execute {
            try {
                val hasRelativePath = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                val (rootSel, rootArgs) = if (hasRelativePath) {
                    rootsClause(roots, MediaStore.MediaColumns.RELATIVE_PATH)
                } else {
                    null to arrayOf()
                }
                val args = if (rootArgs.isEmpty()) null else rootArgs
                val rows = if (kind == "video") {
                    queryVideos(rootSel, args, afterId, limit, hasRelativePath)
                } else {
                    queryImages(rootSel, args, afterId, limit, hasRelativePath)
                }
                val done = rows.size < limit
                val nextAfter = if (done) 0L else rows.last().optLong("id", 0L)
                Log.d("PhotonicScan", "page kind=$kind after=$afterId nextAfter=$nextAfter rows=${rows.size} geo=${rows.count { !it.isNull("latitude") && !it.isNull("longitude") }} done=$done")
                val photos = JSArray()
                rows.forEach { photos.put(it) }
                val ret = JSObject()
                ret.put("photos", photos)
                ret.put("next_after", nextAfter.toString())
                ret.put("done", done)
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e("PhotonicScan", "scanPage failed", e)
                call.reject("scanPage failed: ${e.message}", e)
            }
        }
    }

    private fun parseRoots(call: PluginCall): List<String> {
        val arr = call.getArray("roots") ?: return emptyList()
        val roots = try {
            (0 until arr.length())
                .mapNotNull { arr.get(it) as? String }
                .map { it.trim() }
                .filter { it.isNotEmpty() }
        } catch (e: Exception) {
            emptyList()
        }
        Log.d("PhotonicScan", "parseRoots -> ${roots.joinToString(" | ")}")
        return roots
    }

    // Build a MediaStore selection matching any of the given relative paths
    // (e.g. "DCIM/Camera" → RELATIVE_PATH LIKE 'DCIM/Camera/%').
    private fun rootsClause(roots: List<String>, column: String): Pair<String?, Array<String>> {
        if (roots.isEmpty()) return null to arrayOf()
        val clean = roots.map { it.trim().trim('/') }.filter { it.isNotEmpty() }.distinct()
        if (clean.isEmpty()) return null to arrayOf()
        val parts = clean.map { "$column LIKE ? ESCAPE '\\'" }
        val params = clean.map { r ->
            r.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "/%"
        }.toTypedArray()
        val sel = "(" + parts.joinToString(" OR ") + ")"
        Log.d("PhotonicScan", "rootsClause [$column] -> $sel params=${params.joinToString(" | ")}")
        return sel to params
    }

    private fun queryImages(selection: String?, args: Array<String>?, afterId: Long, limit: Int, hasRelativePath: Boolean): List<JSObject> {
        val resolver = activity?.contentResolver ?: return emptyList()
        val projection = buildList {
            add(MediaStore.Images.Media._ID)
            add(MediaStore.Images.Media.DISPLAY_NAME)
            add(MediaStore.Images.Media.SIZE)
            add(MediaStore.Images.Media.DATE_TAKEN)
            add(MediaStore.Images.Media.MIME_TYPE)
            add(MediaStore.Images.Media.WIDTH)
            add(MediaStore.Images.Media.HEIGHT)
            add(MediaStore.Images.Media.ORIENTATION)
            add(MediaStore.Images.Media.LATITUDE)
            add(MediaStore.Images.Media.LONGITUDE)
            if (hasRelativePath) add(MediaStore.MediaColumns.RELATIVE_PATH)
        }.toTypedArray()
        val idGuard = "_ID > ?"
        val sel = if (selection == null) idGuard else "($selection) AND $idGuard"
        val selArgs: Array<String> =
            if (args == null) arrayOf(afterId.toString()) else args + arrayOf(afterId.toString())
        val sortOrder = MediaStore.Images.Media._ID + " ASC"
        val list = mutableListOf<JSObject>()
        var geoCount = 0
        var exifMakeCount = 0
        var gpsTagCount = 0
        var mediaCoordCount = 0
        resolver.query(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            projection, sel, selArgs, sortOrder
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
            val relCol = cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
            var count = 0
            while (cursor.moveToNext()) {
                if (count >= limit) break
                count++
                val id = if (idCol >= 0) cursor.getLong(idCol) else -1L
                val uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
                val relPath = if (relCol >= 0 && !cursor.isNull(relCol)) cursor.getString(relCol) else ""
                val displayName = if (nameCol >= 0) cursor.getString(nameCol) ?: "" else ""
                // MediaStore exposes no camera/lens/exposure metadata: read the
                // EXIF header once for every field (GPS included, MediaProvider
                // often leaves LATITUDE/LONGITUDE empty).
                val exif = readImageExif(id, uri, relPath, displayName)
                if (!exif.cameraMake.isNullOrBlank() || !exif.cameraModel.isNullOrBlank()) exifMakeCount++
                if (exif.hasGpsTags) gpsTagCount++
                val obj = JSObject()
                obj.put("id", id)
                obj.put("uri", uri.toString())
                obj.put("kind", "image")
                obj.put("folder", relPath)
                obj.put("filename", displayName)
                obj.put("size", if (sizeCol >= 0) cursor.getLong(sizeCol) else 0L)
                val mediaDateTaken = if (dateCol >= 0) cursor.getLong(dateCol) else 0L
                obj.put("date_taken", if (mediaDateTaken > 0) formatDate(mediaDateTaken) else (exif.dateTaken ?: ""))
                obj.put("mime", if (mimeCol >= 0) cursor.getString(mimeCol) ?: "" else "")
                obj.put("width", if (widthCol >= 0) cursor.getInt(widthCol) else 0)
                obj.put("height", if (heightCol >= 0) cursor.getInt(heightCol) else 0)
                obj.put("orientation", if (orientCol >= 0) cursor.getInt(orientCol) else (exif.orientation ?: 0))
                putImageExif(obj, exif)
                val mediaLat = if (latCol >= 0 && !cursor.isNull(latCol)) cursor.getDouble(latCol) else null
                val mediaLng = if (lngCol >= 0 && !cursor.isNull(lngCol)) cursor.getDouble(lngCol) else null
                if (mediaLat != null && mediaLng != null) mediaCoordCount++
                var latitude = exif.latitude ?: mediaLat
                var longitude = exif.longitude ?: mediaLng
                // Reject the classic "GPS at 0,0" (zeros written in EXIF but no real fix)
                if (latitude == 0.0 && longitude == 0.0) {
                    latitude = null
                    longitude = null
                }
                if (latitude != null) obj.put("latitude", latitude) else obj.put("latitude", JSONObject.NULL)
                if (longitude != null) obj.put("longitude", longitude) else obj.put("longitude", JSONObject.NULL)
                if (latitude != null && longitude != null) geoCount++
                obj.put("hash", "") // md5 skipped on mobile: hashing every file blocks the scan
                list.add(obj)
            }
        }
        Log.d("PhotonicScan", "images rows=${list.size} geo=$geoCount make=$exifMakeCount gpsTag=$gpsTagCount mediaCoord=$mediaCoordCount")
        return list
    }

    private fun queryVideos(selection: String?, args: Array<String>?, afterId: Long, limit: Int, hasRelativePath: Boolean): List<JSObject> {
        val resolver = activity?.contentResolver ?: return emptyList()
        val projection = buildList {
            add(MediaStore.Video.Media._ID)
            add(MediaStore.Video.Media.DISPLAY_NAME)
            add(MediaStore.Video.Media.SIZE)
            add(MediaStore.Video.Media.DATE_TAKEN)
            add(MediaStore.Video.Media.MIME_TYPE)
            add(MediaStore.Video.Media.WIDTH)
            add(MediaStore.Video.Media.HEIGHT)
            add(MediaStore.Video.Media.LATITUDE)
            add(MediaStore.Video.Media.LONGITUDE)
            if (hasRelativePath) add(MediaStore.MediaColumns.RELATIVE_PATH)
        }.toTypedArray()
        val idGuard = "_ID > ?"
        val sel = if (selection == null) idGuard else "($selection) AND $idGuard"
        val selArgs: Array<String> =
            if (args == null) arrayOf(afterId.toString()) else args + arrayOf(afterId.toString())
        val sortOrder = MediaStore.Video.Media._ID + " ASC"
        val list = mutableListOf<JSObject>()
        var geoCount = 0
        var mediaCoordCount = 0
        resolver.query(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            projection, sel, selArgs, sortOrder
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
            val relCol = cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
            var count = 0
            while (cursor.moveToNext()) {
                if (count >= limit) break
                count++
                val id = if (idCol >= 0) cursor.getLong(idCol) else -1L
                val uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id)
                val obj = JSObject()
                obj.put("id", id)
                obj.put("uri", uri.toString())
                obj.put("kind", "video")
                obj.put("folder", if (relCol >= 0 && !cursor.isNull(relCol)) cursor.getString(relCol) else "")
                obj.put("filename", if (nameCol >= 0) cursor.getString(nameCol) else "")
                obj.put("size", if (sizeCol >= 0) cursor.getLong(sizeCol) else 0L)
                val dateTaken = if (dateCol >= 0) cursor.getLong(dateCol) else 0L
                obj.put("date_taken", formatDate(dateTaken))
                obj.put("mime", if (mimeCol >= 0) cursor.getString(mimeCol) ?: "" else "")
                obj.put("width", if (widthCol >= 0) cursor.getInt(widthCol) else 0)
                obj.put("height", if (heightCol >= 0) cursor.getInt(heightCol) else 0)
                obj.put("orientation", 0)
                val mediaLat = if (latCol >= 0 && !cursor.isNull(latCol)) cursor.getDouble(latCol) else null
                val mediaLng = if (lngCol >= 0 && !cursor.isNull(lngCol)) cursor.getDouble(lngCol) else null
                if (mediaLat != null && mediaLng != null) mediaCoordCount++
                // MediaStore often leaves LATITUDE/LONGITUDE empty: fall back to meta GPS
                val gps = if (mediaLat == null || mediaLng == null) readMediaMetadataLocation(requireOriginalUri(uri)) else null
                var latitude = gps?.first ?: mediaLat
                var longitude = gps?.second ?: mediaLng
                // Reject the classic "GPS at 0,0" (zeros written in metadata but no real fix)
                if (latitude == 0.0 && longitude == 0.0) {
                    latitude = null
                    longitude = null
                }
                if (latitude != null) obj.put("latitude", latitude) else obj.put("latitude", JSONObject.NULL)
                if (longitude != null) obj.put("longitude", longitude) else obj.put("longitude", JSONObject.NULL)
                if (latitude != null && longitude != null) geoCount++
                obj.put("hash", "") // md5 skipped on mobile: hashing every file blocks the scan
                list.add(obj)
            }
        }
        Log.d("PhotonicScan", "videos rows=${list.size} geo=$geoCount mediaCoord=$mediaCoordCount")
        return list
    }

    // MediaStore exposes no camera/lens/exposure fields and often leaves
    // LATITUDE/LONGITUDE empty (lazy extraction by MediaProvider). Read the
    // complete EXIF header once per image, mirroring the desktop scanner.
    // GPS reading is split: the served MediaStore stream was observed to lose
    // the GPS IFD on several Pixel Ultra HDR JPEGs while the physical file
    // keeps it, so the first instances probe several byte sources (physical
    // path, file descriptor, DocumentsProvider, served stream) and reuses the
    // first one that yields plausible coordinates for the rest of the scan.
    private var gpsSourceBudget = 12
    private var gpsSourceProven: String? = null
    private fun readImageExif(id: Long, uri: Uri, relPath: String, displayName: String): ImageExif {
        return try {
            val resolver = activity?.contentResolver ?: return ImageExif()
            val originalUri = requireOriginalUri(uri)
            val bytes = readGpsSource(resolver, id, originalUri, relPath, displayName) ?: return ImageExif()
            val exif = ExifInterface(ByteArrayInputStream(bytes))
            val meta = ImageExif()
            meta.cameraMake = exif.getAttribute(ExifInterface.TAG_MAKE)
            meta.cameraModel = exif.getAttribute(ExifInterface.TAG_MODEL)
            meta.lens = exif.getAttribute(ExifInterface.TAG_LENS_MODEL)
            meta.focalLength = rationalString(exif.getAttribute(ExifInterface.TAG_FOCAL_LENGTH))
            meta.aperture = rationalString(exif.getAttribute(ExifInterface.TAG_F_NUMBER))
            meta.shutterSpeed = rationalString(exif.getAttribute(ExifInterface.TAG_EXPOSURE_TIME))
            meta.iso = parseIso(exif.getAttribute(ExifInterface.TAG_ISO_SPEED_RATINGS))
            meta.orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL
            ).takeIf { it != ExifInterface.ORIENTATION_NORMAL }
            meta.dateTaken = exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL)
            meta.hasGpsTags = exif.hasAttribute(ExifInterface.TAG_GPS_LATITUDE)
            val gps = gpsFromBytes(bytes)
            if (gps != null) {
                meta.latitude = gps.first
                meta.longitude = gps.second
            } else if (meta.hasGpsTags) {
                // Real GPS IFD but nothing usable out of the raw/lib parse:
                // last resort, media extractor.
                val loc = readMediaMetadataLocation(originalUri)
                if (loc != null) {
                    meta.latitude = loc.first
                    meta.longitude = loc.second
                }
            }
            meta
        } catch (e: Exception) {
            ImageExif()
        }
    }

    // Android redacts GPS/EXIF content for apps without ACCESS_MEDIA_LOCATION.
    // The Uri returned by setRequireOriginal (API 30+) opts into the original
    // bytes, which is where the coordinates live.
    private fun requireOriginalUri(uri: Uri): Uri {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try { MediaStore.setRequireOriginal(uri) } catch (e: Exception) { uri }
        } else {
            uri
        }
    }

    // Try every byte source while the probe budget lasts, log the outcome of
    // each one, and remember the first source yielding plausible coordinates
    // so the rest of the scan reads directly through it.
    private fun readGpsSource(resolver: ContentResolver, id: Long, uri: Uri, relPath: String, displayName: String): ByteArray? {
        if (gpsSourceProven != null) {
            val proven = readBytesVia(gpsSourceProven!!, resolver, uri, relPath, displayName)
            if (proven != null) return proven
        }
        val order = listOf("stream", "pfd", "path", "doc")
        var first = listOf("stream")
        if (gpsSourceProven == null && gpsSourceBudget > 0) {
            gpsSourceBudget--
            first = order
        }
        var best: Pair<String, ByteArray>? = null
        for (name in first) {
            val b = readBytesVia(name, resolver, uri, relPath, displayName)
            val gps = if (b != null) gpsFromBytes(b) else null
            if (gpsSourceProven == null) {
                Log.d(
                    "PhotonicScan",
                    "gpsSrc id=$id src=$name size=${b?.size ?: -1} gps=${fmtGps(gps)} head=${shortHex(b)}"
                )
            }
            if (gps != null && best == null) best = name to b!!
        }
        if (gpsSourceProven == null && best != null) {
            gpsSourceProven = best.first
            Log.d("PhotonicScan", "gpsSrc id=$id proven=${best.first}")
        }
        return best?.second ?: readBytesVia("stream", resolver, uri, relPath, displayName)
    }

    // Read the image bytes through one of the possible channels. "stream" is
    // the usual MediaStore content stream; "pfd" opens the underlying file
    // descriptor; "path" reads the physical file directly (needs legacy
    // storage access); "doc" goes through the external storage documents
    // provider. Sizes are logged so a "re-encoded by MediaProvider" stream is
    // distinguishable from a faithful one.
    private fun readBytesVia(name: String, resolver: ContentResolver, uri: Uri, relPath: String, displayName: String): ByteArray? {
        return try {
            when (name) {
                "stream" -> resolver.openInputStream(uri)?.use { it.readBytes() }
                "pfd" -> resolver.openFileDescriptor(uri, "r")?.use { pfd ->
                    FileInputStream(pfd.fileDescriptor).use { it.readBytes() }
                }
                "path" -> {
                    if (relPath.isBlank() || displayName.isBlank()) return null
                    val file = File("/storage/emulated/0/" + relPath.trim('/') + "/" + displayName)
                    if (!file.exists()) null else file.inputStream().use { it.readBytes() }
                }
                "doc" -> {
                    if (relPath.isBlank() || displayName.isBlank()) return null
                    val docUri = Uri.parse(
                        "content://com.android.externalstorage.documents/document/primary:" +
                            Uri.encode(relPath.trim('/') + "/" + displayName)
                    )
                    resolver.openFileDescriptor(docUri, "r")?.use { pfd ->
                        FileInputStream(pfd.fileDescriptor).use { it.readBytes() }
                    }
                }
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun gpsFromBytes(bytes: ByteArray?): Pair<Double, Double>? {
        if (bytes == null) return null
        val raw = try { readGpsRaw(bytes) } catch (e: Exception) { null }
        val plausible = raw?.takeIf { isPlausibleGps(it) }
        if (plausible != null) return plausible
        val exif = try { ExifInterface(ByteArrayInputStream(bytes)) } catch (e: Exception) { return null }
        val lat = dmsToDecimal(
            exif.getAttribute(ExifInterface.TAG_GPS_LATITUDE),
            exif.getAttribute(ExifInterface.TAG_GPS_LATITUDE_REF)
        )
        val lng = dmsToDecimal(
            exif.getAttribute(ExifInterface.TAG_GPS_LONGITUDE),
            exif.getAttribute(ExifInterface.TAG_GPS_LONGITUDE_REF)
        )
        return if (lat != null && lng != null && isPlausibleGps(lat to lng)) lat to lng else null
    }

    private fun isPlausibleGps(g: Pair<Double, Double>): Boolean =
        g.first in -90.0..90.0 && g.second in -180.0..180.0 &&
            (g.first != 0.0 || g.second != 0.0)

    private fun fmtGps(g: Pair<Double, Double>?): String =
        if (g == null) "(null)" else String.format(Locale.US, "(%.6f, %.6f)", g.first, g.second)

    private fun shortHex(b: ByteArray?): String =
        if (b == null || b.size < 8) "n/a"
        else b.sliceArray(0..3).joinToString("") { "%02x".format(it) } + ".." +
            b.sliceArray(b.size - 4 until b.size).joinToString("") { "%02x".format(it) }

    // Put the EXIF fields into a JSObject, keeping the desktop's snake_case
    // keys (backend/scanner.py). Null values are emitted as JSON NULL.
    private fun putImageExif(obj: JSObject, meta: ImageExif) {
        obj.put("camera_make", meta.cameraMake ?: "")
        obj.put("camera_model", meta.cameraModel ?: "")
        obj.put("lens", meta.lens ?: "")
        obj.put("focal_length", meta.focalLength ?: "")
        obj.put("aperture", meta.aperture ?: "")
        obj.put("shutter_speed", meta.shutterSpeed ?: "")
        val iso = meta.iso
        if (iso != null) obj.put("iso", iso) else obj.put("iso", JSONObject.NULL)
    }

    // ─── Raw GPS parse (independent of ExifInterface) ───────────────────────
    // The androidx/platform ExifInterface returned "0/1,0/1,0/1" with empty
    // refs for these Pixel JPEGs on-device while the desktop tools return real
    // coordinates. Parse the GPS IFD straight out of the JPEG bytes instead.

    private fun u8(b: ByteArray, off: Int): Int =
        if (off in b.indices) (b[off].toInt() and 0xFF) else -1

    private fun u16(b: ByteArray, off: Int, little: Boolean): Int {
        val a = u8(b, off)
        val s = u8(b, off + 1)
        if (a < 0 || s < 0) return -1
        return if (little) (s shl 8) or a else (a shl 8) or s
    }

    private fun u32(b: ByteArray, off: Int, little: Boolean): Long {
        val a = u8(b, off); val s = u8(b, off + 1); val d = u8(b, off + 2); val f = u8(b, off + 3)
        if (a < 0 || s < 0 || d < 0 || f < 0) return -1L
        return if (little) (f.toLong() shl 24) or (d.toLong() shl 16) or (s.toLong() shl 8) or a.toLong()
        else (a.toLong() shl 24) or (s.toLong() shl 16) or (d.toLong() shl 8) or f.toLong()
    }

    private fun rationalRaw(b: ByteArray, off: Int, little: Boolean): Double? {
        val num = u32(b, off, little); val den = u32(b, off + 4, little)
        if (num <= 0L || den <= 0L) return null
        return num.toDouble() / den.toDouble()
    }

    private fun exifTypeSize(t: Int): Int = when (t) {
        1, 2, 6, 7 -> 1
        3, 8 -> 2
        4, 9 -> 4
        5, 10 -> 8
        else -> 1
    }

    private fun rawGpsIfd(t: ByteArray, little: Boolean, off: Int): Pair<Double, Double>? {
        val count = u16(t, off, little)
        if (count < 0) return null
        var p = off + 2
        var latRef: String? = null
        var lngRef: String? = null
        var lat: Array<Double?>? = null
        var lng: Array<Double?>? = null
        var n = 0
        while (n < count) {
            if (p + 12 > t.size) return null
            val tag = u16(t, p, little)
            val typ = u16(t, p + 2, little)
            val cnt = u32(t, p + 4, little)
            val ds = exifTypeSize(typ).toLong() * cnt
            val valuePos: Int
            if (ds > 4L) {
                val o2 = u32(t, p + 8, little)
                if (o2 < 0L || o2 > Int.MAX_VALUE.toLong()) return null
                valuePos = o2.toInt()
            } else {
                valuePos = p + 8
            }
            when (tag) {
                0x0001 -> if (typ == 2 && valuePos in t.indices) latRef = (t[valuePos].toInt() and 0xFF).toChar().toString()
                0x0003 -> if (typ == 2 && valuePos in t.indices) lngRef = (t[valuePos].toInt() and 0xFF).toChar().toString()
                0x0002 -> if (typ == 5 && cnt == 3L) lat = arrayOf(
                    rationalRaw(t, valuePos, little), rationalRaw(t, valuePos + 8, little), rationalRaw(t, valuePos + 16, little))
                0x0004 -> if (typ == 5 && cnt == 3L) lng = arrayOf(
                    rationalRaw(t, valuePos, little), rationalRaw(t, valuePos + 8, little), rationalRaw(t, valuePos + 16, little))
            }
            p += 12
            n++
        }
        val la = lat ?: return null
        val ln = lng ?: return null
        val lr = latRef ?: return null
        val nr = lngRef ?: return null
        val d = (la[0] ?: 0.0) + (la[1] ?: 0.0) / 60.0 + (la[2] ?: 0.0) / 3600.0
        val e = (ln[0] ?: 0.0) + (ln[1] ?: 0.0) / 60.0 + (ln[2] ?: 0.0) / 3600.0
        return (if (lr == "S" || lr == "W") -d else d) to (if (nr == "S" || nr == "W") -e else e)
    }

    private fun rawIfdGps(t: ByteArray, little: Boolean, off: Int, depth: Int): Pair<Double, Double>? {
        if (depth > 4 || off < 0 || off + 2 > t.size) return null
        val count = u16(t, off, little)
        if (count < 0) return null
        var p = off + 2
        var gpsOff: Long? = null
        var n = 0
        while (n < count) {
            if (p + 12 > t.size) return null
            val tag = u16(t, p, little)
            if (tag == 0x8825) gpsOff = u32(t, p + 8, little)
            p += 12
            n++
        }
        val go = gpsOff ?: return null
        if (go < 0L || go > Int.MAX_VALUE.toLong()) return null
        return rawGpsIfd(t, little, go.toInt())
    }

    // (lat, lng) from the JPEG APP1/EXIF/GPS IFD, reading the bytes directly.
    private fun readGpsRaw(bytes: ByteArray): Pair<Double, Double>? {
        if (bytes.size < 4 || (bytes[0].toInt() and 0xFF) != 0xFF || (bytes[1].toInt() and 0xFF) != 0xD8) return null
        var i = 2
        var tiff: ByteArray? = null
        while (i < bytes.size - 4) {
            if ((bytes[i].toInt() and 0xFF) != 0xFF) { i++; continue }
            val marker = bytes[i + 1].toInt() and 0xFF
            if (marker == 0xD8 || marker == 0x01 || marker in 0xD0..0xD7) { i += 2; continue }
            if (i + 4 > bytes.size) break
            val segLen = ((bytes[i + 2].toInt() and 0xFF) shl 8) or (bytes[i + 3].toInt() and 0xFF)
            if (i + 4 + segLen > bytes.size) break
            if (marker == 0xE1 && segLen > 10
                && bytes[i + 4] == 'E'.code.toByte()
                && bytes[i + 5] == 'x'.code.toByte()
                && bytes[i + 6] == 'i'.code.toByte()
                && bytes[i + 7] == 'f'.code.toByte()
                && bytes[i + 8] == 0.toByte() && bytes[i + 9] == 0.toByte()) {
                tiff = bytes.copyOfRange(i + 10, i + 4 + segLen)
                break
            }
            i += 2 + segLen
        }
        val t = tiff ?: return null
        if (t.size < 8) return null
        val little: Boolean = when {
            t[0] == 'I'.code.toByte() && t[1] == 'I'.code.toByte() -> true
            t[0] == 'M'.code.toByte() && t[1] == 'M'.code.toByte() -> false
            else -> return null
        }
        if (u16(t, 2, little) != 42) return null
        val ifd0 = u32(t, 4, little)
        if (ifd0 < 0L || ifd0 > Int.MAX_VALUE.toLong()) return null
        return rawIfdGps(t, little, ifd0.toInt(), 0)
    }

    // "51/1,30/1,1234/100" + "N/S/E/W" → decimal degrees. Some firmwares
    // return the DMS parts separated by spaces instead of commas, so split on
    // any run of comma/whitespace (NOT on "/", the fractional separator inside
    // each rational) and trim every part.
    private fun dmsToDecimal(dms: String?, ref: String?): Double? {
        if (dms == null || ref == null || ref.isBlank()) return null
        val parts = dms.trim().split(Regex("[,\\s]+"))
        if (parts.isEmpty()) return null
        val deg = rationalToDouble(parts[0]) ?: return null
        val min = if (parts.size > 1) rationalToDouble(parts[1]) ?: 0.0 else 0.0
        val sec = if (parts.size > 2) rationalToDouble(parts[2]) ?: 0.0 else 0.0
        var value = deg + min / 60.0 + sec / 3600.0
        if (ref.equals("S", true) || ref.equals("W", true)) value = -value
        return value
    }

    private fun rationalToDouble(r: String?): Double? {
        if (r == null) return null
        val trimmed = r.trim()
        if (trimmed.isEmpty()) return null
        val idx = trimmed.indexOf('/')
        return if (idx > 0) {
            val num = trimmed.substring(0, idx).trim().toDoubleOrNull() ?: return null
            val den = trimmed.substring(idx + 1).trim().toDoubleOrNull() ?: return null
            if (den == 0.0) null else num / den
        } else {
            trimmed.toDoubleOrNull()
        }
    }

    // EXIF rational "28/10" → "2.8" — matches Pillow's IFDRational.__str__
    // so both desktop and mobile produce identical strings for display.
    private fun rationalString(r: String?): String? {
        if (r == null) return null
        val trimmed = r.trim()
        if (trimmed.isEmpty()) return null
        val idx = trimmed.indexOf('/')
        if (idx <= 0) return trimmed
        val num = trimmed.substring(0, idx).trim().toDoubleOrNull() ?: return trimmed
        val den = trimmed.substring(idx + 1).trim().toDoubleOrNull() ?: return trimmed
        if (den == 0.0) return trimmed
        return (num / den).toString()
    }

    // ISO is either a plain value ("100") or a rational ("100/1") — match the
    // desktop scanner's `_int(exif["ISOSpeedRatings"])`.
    private fun parseIso(r: String?): Int? {
        if (r.isNullOrBlank()) return null
        val trimmed = r.trim()
        val idx = trimmed.indexOf('/')
        return if (idx > 0) {
            val num = trimmed.substring(0, idx).trim().toIntOrNull() ?: return null
            val den = trimmed.substring(idx + 1).trim().toIntOrNull() ?: return null
            if (den == 0) null else num / den
        } else {
            trimmed.toIntOrNull()
        }
    }

    // Location fallback via MediaMetadataRetriever. Works for videos AND images:
    // some camera apps expose location only through the extractor. Returned
    // string is ISO-6709-ish ("+51.5-0.15") or comma/slash separated.
    private fun readMediaMetadataLocation(uri: Uri): Pair<Double, Double>? {
        return try {
            val retriever = MediaMetadataRetriever()
            try {
                retriever.setDataSource(context, uri)
                val loc = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_LOCATION) ?: return null
                parseLocation(loc)
            } finally {
                retriever.release()
            }
        } catch (e: Exception) {
            null
        }
    }

    // Accepts "+51.5072-0.1275" (ISO 6709), "51.5072,-0.1275" and
    // "51.5072/-0.1275".
    private fun parseLocation(loc: String): Pair<Double, Double>? {
        val s = loc.trim()
        val comma = Regex("^(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)$").find(s)
        if (comma != null) {
            val lat = comma.groupValues[1].toDouble()
            val lng = comma.groupValues[2].toDouble()
            if (lat.isNaN() || lng.isNaN()) return null
            return lat to lng
        }
        val m = Regex("(?s)^([+-]\\d+(?:\\.\\d+)?)([+-]\\d+(?:\\.\\d+)?)$").find(s)
        if (m != null) {
            val lat = m.groupValues[1].toDouble()
            val lng = m.groupValues[2].toDouble()
            if (lat.isNaN() || lng.isNaN()) return null
            return lat to lng
        }
        return null
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
        val maxDim = call.getInt("maxDim") ?: 520
        executor.execute {
            try {
                if (mime.startsWith("video/")) {
                    resolveVideoThumb(Uri.parse(uri), MediaStore.Video.Thumbnails.MINI_KIND, call, mime)
                } else {
                    val result = decodeImage(Uri.parse(uri), maxDim)
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

    // Set the status bar and navigation bar icon appearance so they stay
    // readable over the app's edge-to-edge content. `dark` = dark icons
    // (light background); `false` = light icons (dark background).
    @PluginMethod
    fun setSystemBarStyle(call: PluginCall) {
        val act = activity ?: run {
            call.reject("no activity")
            return
        }
        val dark = call.getBoolean("dark", false) ?: false
        act.runOnUiThread {
            try {
                val controller = WindowInsetsControllerCompat(act.window, act.window.decorView)
                controller.isAppearanceLightStatusBars = dark
                controller.isAppearanceLightNavigationBars = dark
                val ret = JSObject()
                ret.put("ok", true)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("setSystemBarStyle failed: ${e.message}", e)
            }
        }
    }

    // Open the media file in the system's default app (image viewer / player).
    @PluginMethod
    fun openMedia(call: PluginCall) {
        val act = activity ?: run {
            call.reject("no activity")
            return
        }
        val uriStr = call.getString("uri") ?: run {
            call.reject("uri is required")
            return
        }
        val mime = call.getString("mime") ?: ""
        act.runOnUiThread {
            try {
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(uriStr), if (mime.isBlank()) "application/octet-stream" else mime)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                act.startActivity(intent)
                call.resolve(JSObject().put("ok", true))
            } catch (e: Exception) {
                call.reject("openMedia failed: ${e.message}", e)
            }
        }
    }

    // Reveal a photo in a file manager: open its parent folder via the
    // DocumentsUI external-storage provider (built-in Files app). No file
    // manager available → falls back to opening the photo itself.
    @PluginMethod
    fun revealMedia(call: PluginCall) {
        val act = activity ?: run {
            call.reject("no activity")
            return
        }
        val uriStr = call.getString("uri") ?: run {
            call.reject("uri is required")
            return
        }
        val uri = Uri.parse(uriStr)
        val fallbackRel = call.getString("folder") ?: ""
        val mime = call.getString("mime") ?: ""
        act.runOnUiThread {
            try {
                val folderRel = resolveFolderRelative(uri) ?: fallbackRel
                val docId = "primary:" + folderRel.trim('/')
                val dirUri = DocumentsContract.buildDocumentUri(
                    "com.android.externalstorage.documents", docId
                )
                try {
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(dirUri, "vnd.android.document/directory")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    act.startActivity(intent)
                    call.resolve(JSObject().put("ok", true))
                } catch (e: Exception) {
                    // No handler for the folder → open the file itself instead.
                    val fallback = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(uri, if (mime.isBlank()) "application/octet-stream" else mime)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    act.startActivity(fallback)
                    call.resolve(JSObject().put("ok", true))
                }
            } catch (e: Exception) {
                call.reject("revealMedia failed: ${e.message}", e)
            }
        }
    }

    private fun resolveFolderRelative(uri: Uri): String? {
        val resolver = activity?.contentResolver ?: return null
        var rel: String? = null
        resolver.query(uri, arrayOf(MediaStore.MediaColumns.RELATIVE_PATH), null, null, null)?.use { c ->
            if (c.moveToFirst()) {
                val idx = c.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
                if (idx >= 0 && !c.isNull(idx)) rel = c.getString(idx)
            }
        }
        return rel
    }

    // Pick a folder via the Android Storage Access Framework and return its
    // MediaStore-style relative path (e.g. "DCIM/Camera"). The chosen folder
    // is then used to filter scanMedia() via rootsClause().
    @PluginMethod
    fun pickFolder(call: PluginCall) {
        val act = activity ?: run {
            call.reject("no activity")
            return
        }
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "pickFolderResult")
    }

    @ActivityCallback
    fun pickFolderResult(call: PluginCall, result: ActivityResult) {
        val data = result.data ?: run {
            call.reject("canceled")
            return
        }
        val treeUri = data.data ?: run {
            call.reject("no folder selected")
            return
        }
        try {
            activity?.contentResolver?.takePersistableUriPermission(
                treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        } catch (e: Exception) {
            // Persistable permission may be unavailable on some devices; non-fatal.
        }
        val path = documentTreeRelativePath(treeUri)
        val ret = JSObject()
        ret.put("uri", treeUri.toString())
        ret.put("name", Uri.decode(treeUri.lastPathSegment.orEmpty()).removePrefix("primary:"))
        ret.put("path", path)
        call.resolve(ret)
    }

    // Turn a content://.../primary:DCIM/Camera tree URI into "DCIM/Camera".
    private fun documentTreeRelativePath(uri: Uri): String {
        val encoded = uri.toString()
        val marker = "/tree/"
        val idx = encoded.indexOf(marker)
        if (idx < 0) return ""
        var rel = Uri.decode(encoded.substring(idx + marker.length))
        val colon = rel.indexOf(':')
        if (colon >= 0) rel = rel.substring(colon + 1)
        return rel.trim('/')
    }
}
