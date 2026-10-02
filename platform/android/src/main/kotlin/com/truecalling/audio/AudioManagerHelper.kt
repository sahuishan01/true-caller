package com.truecalling.audio

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build

class AudioManagerHelper(private val context: Context) {

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var originalAudioMode: Int = AudioManager.MODE_NORMAL
    private var originalSpeakerphoneOn: Boolean = false

    fun startCallAudio(useSpeaker: Boolean = true) {
        originalAudioMode = audioManager.mode
        originalSpeakerphoneOn = audioManager.isSpeakerphoneOn

        // Set to MODE_IN_COMMUNICATION for VoIP echo cancellation and audio processing
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        setSpeakerphone(useSpeaker)
    }

    fun setSpeakerphone(on: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val devices = audioManager.availableCommunicationDevices
            val targetType = if (on) AudioDeviceInfo.TYPE_BUILTIN_SPEAKER else AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
            val device = devices.find { it.type == targetType }
            if (device != null) {
                audioManager.setCommunicationDevice(device)
            }
        } else {
            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = on
        }
    }

    fun enableBluetoothSco() {
        @Suppress("DEPRECATION")
        if (audioManager.isBluetoothScoAvailableOffCall) {
            audioManager.startBluetoothSco()
            audioManager.isBluetoothScoOn = true
        }
    }

    fun stopCallAudio() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            audioManager.stopBluetoothSco()
            @Suppress("DEPRECATION")
            audioManager.isBluetoothScoOn = false
            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = originalSpeakerphoneOn
        }
        audioManager.mode = originalAudioMode
    }
}
