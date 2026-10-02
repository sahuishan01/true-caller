import UIKit
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Pre-warm audio session manager
        _ = AudioSessionManager.shared
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // iOS will keep the audio session alive in background when in active voice chat
        print("[AppDelegate] App entered background while maintaining offline voice session")
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        print("[AppDelegate] App returned to foreground")
    }
}
