import Foundation
import React

@objc(APNsTokenModule)
class APNsTokenModule: RCTEventEmitter {

  static let shared = APNsTokenModule()

  private let TOKEN_EVENT = "APNsTokenReceived"
  private let ERROR_EVENT = "APNsTokenError"
  private let TAP_EVENT   = "APNsNotificationTapped"

  private var hasListeners = false

  override func startObserving() {
    hasListeners = true
    if let savedToken = UserDefaults.standard.string(forKey: "apns_device_token") {
      sendTokenToJS(savedToken)
    }
  }

  override func stopObserving() {
    hasListeners = false
  }

  override func supportedEvents() -> [String] {
    return [TOKEN_EVENT, ERROR_EVENT, TAP_EVENT]
  }

  func sendTokenToJS(_ token: String) {
    guard hasListeners else { return }
    sendEvent(withName: TOKEN_EVENT, body: ["token": token])
  }

  func sendErrorToJS(_ message: String) {
    guard hasListeners else { return }
    sendEvent(withName: ERROR_EVENT, body: ["error": message])
  }

  func sendNotificationTapToJS(_ userInfo: [AnyHashable: Any]) {
    guard hasListeners else { return }
    var jsPayload: [String: Any] = [:]
    for (key, value) in userInfo {
      if let stringKey = key as? String {
        jsPayload[stringKey] = value
      }
    }
    sendEvent(withName: TAP_EVENT, body: jsPayload)
  }

  @objc func getStoredToken(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(UserDefaults.standard.string(forKey: "apns_device_token"))
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
