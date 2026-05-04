import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    let delegate = ReactNativeDelegate()
    let factory  = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory  = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "dwell",
      in: window,
      launchOptions: launchOptions
    )

    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(
      options: [.alert, .badge, .sound]
    ) { granted, error in
      if let error = error {
        print("[APNs] Permission error: \(error.localizedDescription)")
        return
      }
      if granted {
        print("[APNs] Permission granted - requesting token")
        DispatchQueue.main.async {
          application.registerForRemoteNotifications()
        }
      } else {
        print("[APNs] Permission denied")
      }
    }

    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("[APNs] Token received (\(tokenString.count) chars): \(tokenString)")
    UserDefaults.standard.set(tokenString, forKey: "apns_device_token")
    APNsTokenModule.shared.sendTokenToJS(tokenString)
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("[APNs] Registration failed: \(error.localizedDescription)")
    APNsTokenModule.shared.sendErrorToJS(error.localizedDescription)
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    // Forward to RNCPushNotificationIOS — fires JS 'notification' event
    // with foreground=true (delivery). The JS guard skips navigation here.
    let userInfo = notification.request.content.userInfo
    RNCPushNotificationIOS.didReceiveRemoteNotification(userInfo)

    // Show banner + sound + badge even when app is open
    completionHandler([.alert, .badge, .sound])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    print("[APNs] Notification tapped: \(userInfo)")

    // ✅ KEY FIX — forwards tap to RNCPushNotificationIOS
    // This triggers JS addEventListener('notification') with foreground=false
    // so the navigation guard runs and opens the correct screen
      RNCPushNotificationIOS.didReceive(response)

    // Keep custom module for any other JS listeners
    APNsTokenModule.shared.sendNotificationTapToJS(userInfo)
    completionHandler()
  }

  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    print("[APNs] Background notification received")
    // Forward to RNCPushNotificationIOS for proper background fetch handling
    RNCPushNotificationIOS.didReceiveRemoteNotification(userInfo, fetchCompletionHandler: completionHandler)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
