import NetInfo from '@react-native-community/netinfo';

import { NativeBaseProvider } from 'native-base';
import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, StyleSheet } from 'react-native';
import 'react-native-gesture-handler';
import { heightPercentageToDP } from 'react-native-responsive-screen';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

console.log('App.jsx: File loaded');

// Import utilities and components
import NetworkStatusBanner from './App/src/components/NetworkStatusBanner';
import { persistor, store } from './App/src/Redux/store';
import { loginDataSelectors } from './App/src/Redux/Login/loginSlice';
import { NavigationRef } from './App/src/navigation/RouterServices';

console.log('App.jsx: Imports successful');
console.log('Store:', store);
console.log('Persistor:', persistor);


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
     

const Stack = createNativeStackNavigator();

const App = () => {
  const [netInfo, setNetInfo] = useState('');
  const [isConnected, setIsConnected] = useState(true);

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
                          
           
            </Stack.Navigator>
          </NavigationContainer>
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
