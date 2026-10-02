package com.truecalling

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import com.truecalling.audio.AudioManagerHelper
import com.truecalling.service.CallForegroundService
import java.net.Inet4Address
import java.net.NetworkInterface

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var audioManagerHelper: AudioManagerHelper
    private val PERMISSION_REQUEST_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        audioManagerHelper = AudioManagerHelper(this)
        requestAppPermissions()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                databaseEnabled = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_NO_CACHE
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    // Automatically grant audio recording permission inside WebView WebRTC
                    request?.grant(request.resources)
                }

                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    Log.d("TrueCallingWeb", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    val response = assetLoader.shouldInterceptRequest(request.url)
                    if (response != null) return response

                    // Intercept fallback for local asset requests
                    val urlStr = request.url.toString()
                    if (urlStr.startsWith("file:///android_asset/")) {
                        val assetPath = urlStr.removePrefix("file:///android_asset/")
                        try {
                            val mimeType = getMimeType(assetPath)
                            val stream = assets.open(assetPath)
                            return WebResourceResponse(mimeType, "UTF-8", stream)
                        } catch (e: Exception) {
                            Log.e("TrueCalling", "Failed to open asset: $assetPath", e)
                        }
                    } else if (urlStr.startsWith("file:///assets/")) {
                        val assetPath = "assets/" + urlStr.removePrefix("file:///assets/")
                        try {
                            val mimeType = getMimeType(assetPath)
                            val stream = assets.open(assetPath)
                            return WebResourceResponse(mimeType, "UTF-8", stream)
                        } catch (e: Exception) {
                            Log.e("TrueCalling", "Failed to open fallback asset: $assetPath", e)
                        }
                    }
                    return null
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    Log.e("TrueCallingWeb", "Error [${error?.errorCode}]: ${error?.description} for ${request?.url}")
                }
            }

            addJavascriptInterface(WebAppInterface(this@MainActivity), "AndroidNative")
        }

        setContentView(webView)

        // Load local TrueCalling application bundle via secure asset loader
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    private fun getMimeType(path: String): String {
        return when {
            path.endsWith(".html") -> "text/html"
            path.endsWith(".js") || path.endsWith(".mjs") -> "application/javascript"
            path.endsWith(".css") -> "text/css"
            path.endsWith(".json") -> "application/json"
            path.endsWith(".png") -> "image/png"
            path.endsWith(".svg") -> "image/svg+xml"
            path.endsWith(".ico") -> "image/x-icon"
            path.endsWith(".woff2") -> "font/woff2"
            path.endsWith(".woff") -> "font/woff"
            path.endsWith(".ttf") -> "font/ttf"
            else -> "application/octet-stream"
        }
    }

    fun getLocalIpAddress(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (iface.isLoopback || !iface.isUp) continue
                val addresses = iface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        val ip = addr.hostAddress ?: continue
                        if (ip.startsWith("192.168.") || ip.startsWith("172.") || ip.startsWith("10.")) {
                            return ip
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("TrueCalling", "Failed to get local IP", e)
        }
        return "127.0.0.1"
    }

    private fun requestAppPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.MODIFY_AUDIO_SETTINGS,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_MULTICAST_STATE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            permissions.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    fun startCallService(roomName: String, participantCount: Int) {
        val intent = Intent(this, CallForegroundService::class.java).apply {
            action = CallForegroundService.ACTION_START_CALL
            putExtra(CallForegroundService.EXTRA_ROOM_NAME, roomName)
            putExtra(CallForegroundService.EXTRA_PARTICIPANTS_COUNT, participantCount)
        }
        ContextCompat.startForegroundService(this, intent)
        audioManagerHelper.startCallAudio(useSpeaker = true)
    }

    fun stopCallService() {
        val intent = Intent(this, CallForegroundService::class.java).apply {
            action = CallForegroundService.ACTION_STOP_CALL
        }
        startService(intent)
        audioManagerHelper.stopCallAudio()
    }

    override fun onDestroy() {
        audioManagerHelper.stopCallAudio()
        super.onDestroy()
    }

    class WebAppInterface(private val activity: MainActivity) {
        @JavascriptInterface
        fun getLocalIpAddress(): String {
            return activity.getLocalIpAddress()
        }

        @JavascriptInterface
        fun startCall(roomName: String, participantCount: Int) {
            activity.runOnUiThread {
                activity.startCallService(roomName, participantCount)
            }
        }

        @JavascriptInterface
        fun stopCall() {
            activity.runOnUiThread {
                activity.stopCallService()
            }
        }
    }
}
