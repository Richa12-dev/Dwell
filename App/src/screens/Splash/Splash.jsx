import React, { useEffect, useState } from 'react';
import { Dimensions, StatusBar, StyleSheet, View, ImageBackground, Image, Text, Linking ,Alert } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import LinearGradient from 'react-native-linear-gradient';
import branch from 'react-native-branch';
import { useSelector } from 'react-redux';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import {
  getPendingNotification,
  clearPendingNotification,
} from '../../utils/pendingNotification';
import { NavigationRef } from '../../navigation/RouterServices';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { getScreenFromNotification } from '../../utils/notificationHelper';

const Splash = ({ navigation }) => {
 const { isLogged, userData, isFirstLogin } = useSelector(loginDataSelectors.getLoginStatus);

  const timerRef = React.useRef(null);
 useEffect(() => {
  let navigated = false;
  const nav = (screen, params) => {
    if (navigated) return;
    navigated = true;
    navigation.replace(screen, params);
  };
  
  // Navigate to correct dashboard based on role
const goToDashboard = (notifData = null) => {
    const role = userData?.role;
      const roleKey =
    role === 'landlord'   ? 'landlord'   :
    role === 'contractor' ? 'contractor' : 'tenant';


   if (notifData && (notifData.type || notifData.screen)) {
    const { tabNavigator, screen, params } = getScreenFromNotification(notifData, roleKey);

    console.log(' Notification nav:', { tabNavigator, screen, params });

      if (screen && screen !== 'TenantNotification') {
        if (navigated) return;
        navigated = true;
        const dashScreen =
          role === 'admin'      ? 'AdminDashboard' :
          role === 'tenant'     ? 'BottomFotter'   :
          role === 'landlord'   ? 'ProfileFooter'  :
          role === 'contractor' ? (isFirstLogin ? 'Welcome' : 'ContractorHome') :
          'BottomFotter';

        // ✅ Reset stack — no Splash, no flash
        navigation.reset({
          index: 1,
          routes: [
            { name: tabNavigator || dashScreen },
            { name: screen, params },
          ],
        });
        return;
      }
    }

    // ── Normal dashboard navigation (unchanged) ────────────────────
    if (role === 'admin')           nav('AdminDashboard');
    else if (role === 'tenant')     nav('BottomFotter');
    else if (role === 'landlord')   nav('ProfileFooter');
    else if (role === 'contractor') isFirstLogin ? nav('Welcome') : nav('ContractorHome');
    else                            nav('BottomFotter');
  };

  // 1. Branch deep link (works for fresh installs)
  const unsubscribeBranch = branch.subscribe(({ error, params }) => {
  
    if (error || !params?.['+clicked_branch_link']) return;
    const token = params?.token;
    if (token) {
      nav('Register', { inviteToken: token });
    }
  });

  // 2. Direct URL (non-Branch)
  const checkDirectLink = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl?.includes('/auth/invited')) {
        const url = new URL(initialUrl);
        const token = url.searchParams.get('token');
        if (token) {
          nav('Register', { inviteToken: token });
        }
      }
    } catch (err) {
      console.error('[Splash] Deep link error:', err);
    }
  };

  checkDirectLink();


 PushNotificationIOS.getInitialNotification().then((notification) => {
    // notification is a PushNotificationIOS object — must call .getData()
    // NOT notification?.data (that's a plain-object pattern, not the iOS SDK)
    const raw = notification ? notification.getData() : null;
    const notifData = raw?.data || raw || null;

    console.log(' Splash notifData:', notifData);

  const hasValidNotif = !!(notifData?.type || notifData?.screen);

  console.log('Splash notifData:', notifData, 'valid:', hasValidNotif);

  const delay = hasValidNotif ? 0 : 3000;
  
    timerRef.current = setTimeout(() => {
    if (isLogged && userData) {
      goToDashboard(hasValidNotif ? notifData : null);
    } else {
      nav('OnboardingScreen');
    }
  }, delay);
  });

  // ── Cleanup (UNCHANGED + timer) ───────────────────────────────────
  return () => {
    unsubscribeBranch();
    clearTimeout(timerRef.current);  // ← clears notification timer too
  };

}, [navigation, isLogged, userData, isFirstLogin]);
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={'#000'} barStyle="light-content" />
      <ImageBackground
        source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0.2)',
            'rgba(0, 0, 0, 0.6)',
            'rgba(0, 0, 0, 0.9)',
            '#000000',
          ]}
          locations={[0, 0.4, 0.55, 0.75, 0.9, 1]}
          style={styles.gradientOverlay}
        />
        <View style={styles.logoContainer}>
          <Image
            source={require('../../Assets/Image/dwellProperties.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.copyright}>
          ©2025, Dwell Properties, All Rights Reserved
        </Text>
      </ImageBackground>
    </View>
  );
};

// ... keep your existing styles unchanged

const { width, height } = Dimensions.get('window');


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  logoContainer: {
    alignItems: 'center',
    // marginTop: hp(25),
    // paddingHorizontal: 20,
  },
  logo: {
    position: 'absolute',
    width: wp(79.5),
    height: hp(9.5),
    top: hp(37.8),
    left: wp(10.3),
    resizeMode: 'contain',
  },

  copyright: {
    position: 'absolute',
    top: hp(91.5),
    left: wp(13),
    width: wp(83),
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Nunito-Medium',
    fontWeight: '500',
  },
});


export default Splash;
