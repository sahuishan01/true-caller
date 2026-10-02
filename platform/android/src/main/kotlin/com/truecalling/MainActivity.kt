package com.truecalling

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.truecalling.audio.AudioManagerHelper
import com.truecalling.service.CallForegroundService

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var audioManagerHelper: AudioManagerHelper
    private val PERMISSION_REQUEST_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        audioManagerHelper = AudioManagerHelper(this)
        requestAppPermissions()

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    // Automatically grant audio recording permission inside WebView WebRTC
                    request?.grant(request.resources)
                }
            }

            webViewClient = WebViewClient()
        }

        setContentView(webView)

        // Load local TrueCalling application bundle or local server
        webView.loadUrl("file:///android_asset/index.html")
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
}
