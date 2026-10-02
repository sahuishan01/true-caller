import UIKit
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        _ = AudioSessionManager.shared

        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = ViewController()
        window?.makeKeyAndVisible()
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
