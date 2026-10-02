package com.truecalling.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class CallForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "true_calling_active_call"
        const val NOTIFICATION_ID = 10101

        const val ACTION_START_CALL = "com.truecalling.action.START_CALL"
        const val ACTION_STOP_CALL = "com.truecalling.action.STOP_CALL"
        const val ACTION_TOGGLE_MUTE = "com.truecalling.action.TOGGLE_MUTE"
        const val ACTION_TOGGLE_SPEAKER = "com.truecalling.action.TOGGLE_SPEAKER"

        const val EXTRA_ROOM_NAME = "extra_room_name"
        const val EXTRA_PARTICIPANTS_COUNT = "extra_participants_count"
    }

    private var networkLockHelper: NetworkLockHelper? = null
    private var isMuted = false
    private var isSpeakerOn = true
    private var roomName = "Offline Group Call"
    private var participantCount = 1

    override fun onCreate() {
        super.onCreate()
        networkLockHelper = NetworkLockHelper(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY

        when (action) {
            ACTION_START_CALL -> {
                roomName = intent.getStringExtra(EXTRA_ROOM_NAME) ?: "Offline Group Call"
                participantCount = intent.getIntExtra(EXTRA_PARTICIPANTS_COUNT, 1)

                // Acquire high performance Wi-Fi, Multicast, and Wake Locks
                networkLockHelper?.acquireLocks()

                val notification = buildCallNotification()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                    )
                } else {
                    startForeground(NOTIFICATION_ID, notification)
                }
            }

            ACTION_TOGGLE_MUTE -> {
                isMuted = !isMuted
                updateNotification()
            }

            ACTION_TOGGLE_SPEAKER -> {
                isSpeakerOn = !isSpeakerOn
                updateNotification()
            }

            ACTION_STOP_CALL -> {
                stopCallAndService()
            }
        }

        return START_STICKY
    }

    private fun buildCallNotification(): Notification {
        val stopIntent = Intent(this, CallForegroundService::class.java).apply {
            this.action = ACTION_STOP_CALL
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val muteIntent = Intent(this, CallForegroundService::class.java).apply {
            this.action = ACTION_TOGGLE_MUTE
        }
        val mutePendingIntent = PendingIntent.getService(
            this, 2, muteIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val muteLabel = if (isMuted) "Unmute" else "Mute"
        val statusText = "Active: $participantCount participants • ${if (isMuted) "Muted" else "Speaking"}"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(roomName)
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .addAction(android.R.drawable.ic_lock_silent_mode, muteLabel, mutePendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Call", stopPendingIntent)
            .build()
    }

    private fun updateNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildCallNotification())
    }

    private fun stopCallAndService() {
        networkLockHelper?.releaseLocks()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        networkLockHelper?.releaseLocks()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Active TrueCalling Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows persistent controls while an offline voice call is active"
                setSound(null, null)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
