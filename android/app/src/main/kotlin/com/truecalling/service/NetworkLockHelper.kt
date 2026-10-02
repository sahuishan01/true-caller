package com.truecalling.service

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.os.PowerManager

class NetworkLockHelper(private val context: Context) {

    private var wifiLock: WifiManager.WifiLock? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    private var wakeLock: PowerManager.WakeLock? = null

    fun acquireLocks() {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val powerManager = context.applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager

        // 1. Wi-Fi Low Latency Lock
        if (wifiLock == null && wifiManager != null) {
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                WifiManager.WIFI_MODE_FULL_LOW_LATENCY
            } else {
                WifiManager.WIFI_MODE_FULL_HIGH_PERF
            }
            wifiLock = wifiManager.createWifiLock(mode, "TrueCalling:WifiLock").apply {
                setReferenceCounted(false)
                acquire()
            }
        }

        // 2. Wi-Fi Multicast Lock (essential for mDNS discovery packets to pass OS filter)
        if (multicastLock == null && wifiManager != null) {
            multicastLock = wifiManager.createMulticastLock("TrueCalling:MulticastLock").apply {
                setReferenceCounted(false)
                acquire()
            }
        }

        // 3. Partial WakeLock to prevent CPU sleep during active call
        if (wakeLock == null && powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TrueCalling:WakeLock").apply {
                setReferenceCounted(false)
                acquire(4 * 60 * 60 * 1000L) // Safety timeout: 4 hours
            }
        }
    }

    fun releaseLocks() {
        try {
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
        } catch (_: Exception) {}
        wifiLock = null

        try {
            if (multicastLock?.isHeld == true) {
                multicastLock?.release()
            }
        } catch (_: Exception) {}
        multicastLock = null

        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}
        wakeLock = null
    }
}
