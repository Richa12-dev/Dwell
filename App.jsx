import NetInfo from '@react-native-community/netinfo';

import { NativeBaseProvider } from 'native-base';
import React, { useEffect, useState, useRef } from 'react';
import { AppState, Platform, StatusBar, StyleSheet, LogBox, Linking  } from 'react-native';
import 'react-native-gesture-handler';
import { heightPercentageToDP } from 'react-native-responsive-screen';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { NavigationContainer } from '@react-navigation/native';

// import { createStackNavigator } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { configureGoogleSignIn, refreshToken } from './App/src/Redux/Login/loginservices';

// Import utilities and components
import NetworkStatusBanner from './App/src/components/NetworkStatusBanner';
import { persistor, store } from './App/src/Redux/store';
import { loginDataSelectors } from './App/src/Redux/Login/loginSlice';
import { NavigationRef } from './App/src/navigation/RouterServices';


// Import all screens
import Splash from './App/src/screens/Splash/Splash';
import OnboardingScreen from './App/src/screens/OnboardingScreen/OnboardingScreen';
import Login from './App/src/screens/Login/Login';
import TenantLogin from './App/src/screens/Login/TenantLogin';
import Register from './App/src/screens/Login/Register';
import ForgotPassword from './App/src/screens/Login/ForgotPassword';
import ResetPassword from './App/src/screens/Login/ResetPassword';
import BottomFotter from './App/src/navigation/BottonFooter';
import ProfileFooter from './App/src/navigation/ProfileFooter';
import AddPropertiesScreen from './App/src/screens/Properties/AddPropertiesScreen';
import PropertiesDetails from './App/src/screens/Properties/PropertiesDetails';
import LandlordProperties from './App/src/screens/Properties/LandlordProperties';
import Properties from './App/src/screens/Properties/Properties';
import ProfileHome from './App/src/screens/Profile/ProfileHome';
import Payout from './App/src/screens/Payout';
import Query from './App/src/screens/Support/Query';
import QueryDetails from './App/src/screens/Support/QueryDetails';
import LandlordSupport from './App/src/screens/Support/LandlordSupport';
import LandlordTicketDetails from './App/src/screens/Support/LandlordTicketDetails';
import Dashboard from './App/src/screens/Dashboard/Dashboard';
import OtpScreen from './App/src/screens/Login/OtpScreen';
import LandlordLogin from './App/src/screens/Login/LandlordLogin';
import TenantPayments from './App/src/screens/Payment/TenantPayments';
import ContactLandlord from './App/src/screens/Payment/ContactLandlord';
import RentDocuments from './App/src/screens/Payment/RentDocuments';
import RentHistory from './App/src/screens/Payment/RentHistory';
import MaintenanceDetails from './App/src/screens/Support/MaintenanceDetails';
import TenantNotification from './App/src/screens/Notification/TenantNotification';
import ContractorLogin from './App/src/screens/Login/ContractorLogin';
import ContractorDashboard from './App/src/screens/Dashboard/ContractorDashboard';
import Welcome from './App/src/screens/Contractor/Welcome';
import SelectServices from './App/src/screens/Contractor/SelectServices';
import UploadDocuments from './App/src/screens/Contractor/UploadDocuments';
import CongratuationScreen from './App/src/screens/Contractor/CongratuationScreen';
import ContractorSupport from './App/src/screens/Support/ContractorSupport';
import AddInvoiceScreen from './App/src/screens/Support/AddInvoiceScreen';
import ContractorHome from './App/src/navigation/ContractorHome';
import ContractorPayment from './App/src/screens/Payment/ContractorPayment';
import PaymentLedger from './App/src/screens/Payment/PaymentLedger';
import Leaderboard from './App/src/screens/Payment/Leaderboard';

  import ReferralsRewards from './App/src/screens/Payment/ReferralsRewards';
  import TenantManagement from './App/src/screens/Support/TenantManagement';
import RentCollection from './App/src/screens/Payment/RentCollection';
import AdminLogin from './App/src/screens/Login/AdminLogin';

import AdminDashboard from './App/src/screens/Admin/AdminDashboard';
import AdminUserList from './App/src/screens/Admin/AdminUserList';

import TermsAndConditions from './App/src/screens/Terms&Conditions/Terms&Conditions';
     
import PrivacyPolicy from './App/src/screens/PrivacyPolicy/PrivacyPolicy';

import PropertyDocuments from './App/src/screens/PropertyDocuments/PropertyDocuments';

import WebhookLogMonitor from './App/src/screens/Admin/WebhookLogMonitor';
import SocialAuthScreen from './App/src/screens/Auth/SocialAuthScreen';
import SocialAuthScreenContractor from './App/src/screens/Auth/SocialAuthScreenContractor';

import SocialAuthScreenLandlord from './App/src/screens/Auth/SocialAuthScreenLandlord';

import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { registerDeviceToken, removePushListeners } from './App/src/utils/registerDeviceToken';
import { registerDeviceTokenToServer } from './App/src/Redux/Login/loginSlice';
import { resolveInviteToken } from './App/src/Redux/Invite/inviteServices';
import DeviceInfo from 'react-native-device-info';
import FullScreenImageViewer from './App/src/components/FullScreenImageViewer/FullScreenImageViewer';
import SignDocumentScreen from './App/src/screens/Payment/SignDocumentScreen';
import DocumentPreviewScreen from './App/src/screens/Payment/DocumentPreviewScreen';


const Stack = createNativeStackNavigator();

configureGoogleSignIn();

// ─── Background token refresh hook ────────────────────────────────────────────
const useTokenRefresh = () => {
  const dispatch = useDispatch();
  const { isLogged } = useSelector(loginDataSelectors.getLoginStatus);
  const refreshTokenValue = useSelector(state => state.loginData?.refreshToken);
  const intervalRef = useRef(null);
  
  
 
  useEffect(() => {
    if (!isLogged || !refreshTokenValue) return;
 
    // Refresh every 10 minutes (if access token expires at 15)
    intervalRef.current = setInterval(() => {
      dispatch(refreshToken({ refreshToken: refreshTokenValue }));
    }, 10 * 60 * 1000);
 
    // Also refresh when app comes back to foreground
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && refreshTokenValue) {
        dispatch(refreshToken({ refreshToken: refreshTokenValue }));
      }
    });
 
    return () => {
      clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [isLogged, refreshTokenValue]);
};
 
 
 
const TokenRefreshManager = ({ children }) => {
  useTokenRefresh();
 
  const dispatch = useDispatch();
  const { isLogged } = useSelector(loginDataSelectors.getLoginStatus);
  const userData    = useSelector((state) => state.loginData?.userData);
 
  // ✅ Get auth token from Redux for backend registration call
  const accessToken = useSelector((state) => state.loginData?.accessToken);
 
  useEffect(() => {
    console.log('🔍 isLogged in TokenRefreshManager:', isLogged);
    if (!isLogged) return;
 
    const userId =
      userData?.tenantId ||
      userData?.landlordId ||
      userData?.contractorId ||
      null;
 
    // ── ✅ Pure APNs token registration ─────────────────────────────────────
    // registerDeviceToken() now uses PushNotificationIOS (not Firebase)
    // Token will be 64-char hex string e.g: a1b2c3d4e5f6...
    registerDeviceToken(accessToken)
      .then((result) => {
        if (!result) return;
 
        const { token ,  apnsEnv } = result;
        console.log('✅ APNs Device Token:', token);
 
        if (userId) {
          dispatch(registerDeviceTokenToServer({
            deviceToken: token,
            userId,
            platform:    Platform.OS,        // 'ios'
          apnsEnv:      apnsEnv,                        // 'sandbox' | 'production'
        deviceModel:  DeviceInfo.getModel(),          // 'iPhone 15 Pro', 'iPad Air' etc
        appVersion:   DeviceInfo.getVersion(), 
          }));
        } else {
          console.warn('⚠️ No userId yet — APNs token NOT registered');
        }
      })
      .catch((err) => {
        console.error('❌ APNs token registration failed:', err.message);
      });
 
    
    });
 
    // ── ✅ Handle notification tap when app is in background ──────────────
    // Replaces: messaging().onNotificationOpenedApp(...)
    PushNotificationIOS.addEventListener('localNotification', (notification) => {
      const data = notification.getData();
      console.log('👆 Notification tapped (background):', data);
      if (data?.screen) {
        NavigationRef.current?.navigate(data.screen, { id: data.entityId });
      }
    });
 
    // ── ✅ Handle notification tap when app was CLOSED (cold start) ───────
    // Replaces: messaging().getInitialNotification()
    PushNotificationIOS.getInitialNotification().then((notification) => {
      if (notification) {
        const data = notification.getData();
        console.log('🚀 Cold start from notification:', data);
        if (data?.screen) {
          NavigationRef.current?.navigate(data.screen, { id: data.entityId });
        }
      }
 
 
    // ── Cleanup on logout / unmount ────────────────────────────────────────
   return () => {
      cleanupTapHandler();
      removePushListeners();
    };
  }, [isLogged]);
 
  return <>{children}</>;
};

const useInviteDeepLink = () => {
  const dispatch = useDispatch();
 
  const handleUrl = async (url) => {
    if (!url) return;
 
    // Supports both:
    //   dwellproperties://invite?token=XXXX
    //   https://app.dwellproperties.ai/invite?token=XXXX
    //   https://app.dwellproperties.ai/invite/XXXX
    const queryMatch = url.match(/[?&]token=([^&]+)/);
    const pathMatch  = url.match(/\/invite\/([^/?#]+)/);
    const token      = queryMatch?.[1] || pathMatch?.[1];
 
    if (!token) return;
    console.log('🔗 Invite deep link token:', token);
 
    // resolveInviteToken → GET /auth/invite/:token
    // → stores { inviteId, phone, role } in state.invites.resolvedInvite
    const result = await dispatch(resolveInviteToken(token));
 
    if (resolveInviteToken.fulfilled.match(result)) {
      const { phone, role } = result.payload || {};
      // Navigate to Register with prefill params so the form auto-fills
      NavigationRef.current?.navigate('Register', {
        inviteToken:   token,
        prefillPhone:  phone  || '',
        prefillRole:   role   || 'tenant',
      });
    }
  };
 
  useEffect(() => {
    // Cold start — app opened directly from the SMS link
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
 
    // Warm start — app already open when link is tapped
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);
};
 
// Thin wrapper so useInviteDeepLink has store + navigation access
const InviteDeepLinkManager = ({ children }) => {
  useInviteDeepLink();
  return <>{children}</>;
};

const App = () => {
  const [netInfo, setNetInfo] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  
  useEffect(() => {
  LogBox.ignoreLogs([
    'SSRProvider is not necessary',
  ]);
}, []);


  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetInfo(
        `Connection type: ${state.type}
        Is connected?: ${state.isConnected}
        IP Address: ${state.details?.ipAddress || 'N/A'}`,
      );
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NativeBaseProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
         <TokenRefreshManager>
          <StatusBar
            backgroundColor="rgba(238, 81, 63, 1)"
            barStyle={'light-content'}
          />
          <NetworkStatusBanner
            isConnected={isConnected}
            isVisible={!isConnected}
          />
          
          {/* Navigation Container with all screens */}
          <NavigationContainer ref={NavigationRef}>
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{ headerShown: false }}>
              
              {/* Auth Screens */}
              <Stack.Screen name="Splash" component={Splash} />
              <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="TenantLogin" component={TenantLogin} />
              <Stack.Screen name="Register" component={Register} />
              <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
              <Stack.Screen name="ResetPassword" component={ResetPassword} />
              
               <Stack.Screen name="SocialAuth" component={SocialAuthScreen} />
                <Stack.Screen name="SocialAuthContractor" component={SocialAuthScreenContractor} />
                <Stack.Screen name="SocialAuthLandlord" component={SocialAuthScreenLandlord} />
              
               <Stack.Screen name="AdminLogin" component={AdminLogin} />
                {/* ── Admin Dashboard ── */}
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="UserList" component={AdminUserList}/>
              
   <Stack.Screen name="TermsAndConditions" component={TermsAndConditions} options={{ headerShown: false }}/>
   <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} options={{ headerShown: false }} />
              
              {/* Bottom Tab Navigators */}
              <Stack.Screen name="ProfileFooter" component={ProfileFooter} />
              <Stack.Screen name="BottomFotter" component={BottomFotter} />
              <Stack.Screen name="ContractorHome" component={ContractorHome} />
            <Stack.Screen name = "Welcome"
                component = {Welcome} />
                
              
              {/* Other Screens */}
              <Stack.Screen name="Dashboard" component={Dashboard} />
              <Stack.Screen name="AddPropertiesScreen" component={AddPropertiesScreen} />
              <Stack.Screen name="PropertiesDetails" component={PropertiesDetails} />
              <Stack.Screen name="LandlordProperties" component={LandlordProperties} />
              <Stack.Screen name="Properties" component={Properties} />
             
    <Stack.Screen name="PropertyDocuments" component={PropertyDocuments} />
              <Stack.Screen name="ProfileHome" component={ProfileHome} />
              <Stack.Screen name="Payout" component={Payout} />
              <Stack.Screen name="Query" component={Query} />
              <Stack.Screen name="QueryDetails" component={QueryDetails} />
              <Stack.Screen name="LandlordSupport" component={LandlordSupport} />
              <Stack.Screen name="LandlordTicketDetails" component={LandlordTicketDetails} />
              <Stack.Screen name="OtpScreen" component={OtpScreen} />
              <Stack.Screen name="LandlordLogin" component={LandlordLogin} />
              <Stack.Screen name="TenantPayments" component ={TenantPayments} />
              <Stack.Screen name="ContactLandlord"
              component ={ContactLandlord} />
            <Stack.Screen name="RentDocuments"
              component ={RentDocuments} />
            <Stack.Screen name="RentHistory"
              component ={RentHistory} />
                <Stack.Screen name="MaintenanceDetails" component={MaintenanceDetails} />
                
                <Stack.Screen name = "TenantNotification" component= {TenantNotification} />
                
                <Stack.Screen name = "ContractorLogin"
                component= {ContractorLogin} />
                
                <Stack.Screen name = "ContractorDashboard"
                component ={ContractorDashboard} />
            <Stack.Screen name = "SelectServices"
                component ={SelectServices} />
           
                <Stack.Screen name = "UploadDocuments"
                component ={UploadDocuments} />
                <Stack.Screen name = "CongratuationScreen"
                component ={CongratuationScreen} />
                <Stack.Screen name = "ContractorSupport"
                component ={ContractorSupport} />
                 <Stack.Screen name="AddInvoiceScreen" component={AddInvoiceScreen} />
                <Stack.Screen name = "ContractorPayment"
                component ={ContractorPayment} />
                
                <Stack.Screen name="PaymentLedger" component={PaymentLedger} />
                <Stack.Screen name="Leaderboard" component={Leaderboard} />
                <Stack.Screen name="ReferralsRewards" component={ReferralsRewards} />
                
                <Stack.Screen name="TenantManagement" component={TenantManagement} />
<Stack.Screen name="RentCollection" component={RentCollection} />

<Stack.Screen
  name="WebhookLogMonitor"
  component={WebhookLogMonitor}
  options={{ title: 'SMS Webhook Monitor' }}
/>
<Stack.Screen
  name="FullScreenImageViewer"
  component={FullScreenImageViewer}
  options={{
    headerShown:   false,
    animation:     'fade',          // smooth black fade in
    presentation:  'fullScreenModal',
  }}
/>

<Stack.Screen name="SignDocumentScreen" component={SignDocumentScreen} options={{ headerShown: false }} />
<Stack.Screen name="DocumentPreviewScreen" component={DocumentPreviewScreen} />
                          
           
            </Stack.Navigator>
          </NavigationContainer>
           </TokenRefreshManager>
        </PersistGate>
      </Provider>
    </NativeBaseProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(150, 163, 149, 1)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    ...Platform.select({
      ios: {
        paddingTop: heightPercentageToDP(5),
      },
    }),
  },
});

export default App;
