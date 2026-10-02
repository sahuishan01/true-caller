import Foundation
import AVFoundation

public class AudioSessionManager: NSObject {

    public static let shared = AudioSessionManager()

    public override init() {
        super.init()
        setupNotifications()
    }

    /**
     * Activates the iOS AVAudioSession configured for voice chat over speaker/Bluetooth.
     */
    public func activateCallAudioSession(useSpeaker: Bool = true) throws {
        let session = AVAudioSession.sharedInstance()

        var options: AVAudioSession.CategoryOptions = [.allowBluetooth, .allowBluetoothA2DP]
        if useSpeaker {
            options.insert(.defaultToSpeaker)
        }

        try session.setCategory(.playAndRecord, mode: .voiceChat, options: options)
        try session.setPreferredSampleRate(48000)
        try session.setPreferredIOBufferDuration(0.02) // 20ms buffer for low latency
        try session.setActive(true, options: [])
    }

    /**
     * Deactivates the audio session when the call ends.
     */
    public func deactivateCallAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setActive(false, options: [.notifyOthersOnDeactivation])
        } catch {
            print("[AudioSessionManager] Error deactivating session: \(error)")
        }
    }

    /**
     * Toggles between Speakerphone and Receiver.
     */
    public func setSpeakerphone(enabled: Bool) throws {
        let session = AVAudioSession.sharedInstance()
        if enabled {
            try session.overrideOutputAudioPort(.speaker)
        } else {
            try session.overrideOutputAudioPort(.none)
        }
    }

    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }

    @objc private func handleInterruption(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        if type == .began {
            print("[AudioSessionManager] Audio session interrupted (e.g. cellular incoming call)")
        } else if type == .ended {
            guard let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt else { return }
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            if options.contains(.shouldResume) {
                try? activateCallAudioSession()
            }
        }
    }

    @objc private func handleRouteChange(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        print("[AudioSessionManager] Audio route changed. Reason: \(reason.rawValue)")
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
