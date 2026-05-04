import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { APNsTokenModule } = NativeModules;

const apnsEmitter = APNsTokenModule
  ? new NativeEventEmitter(APNsTokenModule)
  : null;

function isValidApnsToken(token) {
  return /^[a-f0-9]{64}$/i.test(token);
}

// Returns Promise<{ token, apnsEnv }>
// Backend registration is handled by registerDeviceTokenToServer in Redux
export const registerDeviceToken = () => {
  return new Promise(async (resolve, reject) => {

    if (Platform.OS !== 'ios') {
      return resolve(null);
    }

    if (!APNsTokenModule) {
      console.error('[APNs] APNsTokenModule not found in NativeModules');
      return reject(new Error('APNsTokenModule not found'));
    }

    console.log('[APNs] APNsTokenModule found - checking for saved token...');

    // Check UserDefaults for token from previous session
    try {
      const savedToken = await APNsTokenModule.getStoredToken();
      if (savedToken && isValidApnsToken(savedToken)) {
          console.log('[APNs] TOKEN FROM STORAGE:', savedToken);
             console.log('[APNs] Token length:', savedToken.length);
             console.log('[APNs] __DEV__ value:', __DEV__);              // ← ADD
             console.log('[APNs] apnsEnv:', __DEV__ ? 'sandbox' : 'production'); // ← ADD

        return resolve({
          token:    savedToken,
          apnsEnv:  __DEV__ ? 'sandbox' : 'production',
        });
      } else {
        console.log('[APNs] No valid saved token, waiting for fresh one...');
      }
    } catch (e) {
      console.log('[APNs] No saved token yet...');
    }

    // Wait for fresh token emitted from AppDelegate
    const tokenSub = apnsEmitter.addListener('APNsTokenReceived', (event) => {
      tokenSub.remove();
      errorSub.remove();

      const apnsToken = event.token;
      console.log('[APNs] FRESH TOKEN RECEIVED:', apnsToken);
      console.log('[APNs] Token length:', apnsToken?.length);

      if (!isValidApnsToken(apnsToken)) {
        return reject(new Error(
          `[APNs] Invalid token format. Expected 64 hex chars, got ${apnsToken?.length}`
        ));
      }

      resolve({
        token:   apnsToken,
        apnsEnv: __DEV__ ? 'sandbox' : 'production',
      });
    });

    const errorSub = apnsEmitter.addListener('APNsTokenError', (event) => {
      tokenSub.remove();
      errorSub.remove();
      reject(new Error(`[APNs] Native error: ${event.error}`));
    });

    setTimeout(() => {
      tokenSub.remove();
      errorSub.remove();
      reject(new Error('[APNs] Timeout - no token in 15s. Check Xcode console.'));
    }, 15000);
  });
};

export const setupNotificationTapHandler = (onTap) => {
  if (!apnsEmitter) return () => {};
  const sub = apnsEmitter.addListener('APNsNotificationTapped', (data) => {
    if (onTap) onTap(data);
  });
  return () => sub.remove();
};

export const removePushListeners = () => {
  if (apnsEmitter) {
    apnsEmitter.removeAllListeners('APNsTokenReceived');
    apnsEmitter.removeAllListeners('APNsTokenError');
    apnsEmitter.removeAllListeners('APNsNotificationTapped');
  }
};
