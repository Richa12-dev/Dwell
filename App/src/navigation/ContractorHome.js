import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
//import {createNativeBottomTabNavigator} from '@bottom-tabs/react-navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {Colors} from '../Theme';
import {AppIcon} from '../components/AppIcon';
import {icons} from '../Assets';
import {getFontFamily} from '../utils';
import ContractorDashboard from '../screens/Dashboard/ContractorDashboard';
import AIAssistant from '../screens/AIAssistant/AIAssistant';
import ContractorSupport from '../screens/Support/ContractorSupport';
import ContractorPayment from '../screens/Payment/ContractorPayment';
import AddInvoiceScreen from '../screens/Support/AddInvoiceScreen';

const Tab = createBottomTabNavigator();

// Custom Tab Bar Overlay Component
const CustomTabBarOverlay = ({state, descriptors, navigation}) => {
    
    // Hide the entire tab bar on the AI Assistant screen
    const currentRoute = state.routes[state.index]?.name;
    if (currentRoute === 'AIAssistant') return null;
   
  const TabBarArr = [
    {
      route: 'Home',
      name: 'Home',
      icon: icons.home,
      focusicon: icons.homered,
    },
    {
      route: 'Support',
      name: 'Request',
        icon: icons.properties,
      focusicon: icons.supportred,
    },
    {
      route: 'TenantPayments',
      name: 'Payments',
      icon: icons.payment,
      focusicon: icons.redPayment,
    },
  ];

  const AITab = {
    route: 'AIAssistant',
    name: 'Ask AI',
    icon: icons.ai,
    focusicon: icons.aired,
  };

  return (
    <View style={styles.navbarContainer} pointerEvents="box-none">
      {/* Main Navigation Bar with Glassmorphism */}
      <View style={styles.glassContainer}>
        {state.routes.slice(0, 3).map((route, index) => {
          const isFocused = state.index === index;
          const item = TabBarArr[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={onPress}
              style={styles.navbarButton}>
              <View
                style={[
                  styles.iconContainer,
                  isFocused && styles.iconContainerFocused,
                ]}>
                <AppIcon
                  name={isFocused ? item.focusicon : item.icon}
                  size={wp(6.5)}
                  color={isFocused ? Colors.red : Colors.grey}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? Colors.red : Colors.grey,
                    fontFamily: getFontFamily(isFocused ? 'bold' : 'medium'),
                  },
                ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating AI Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate(AITab.route)}
        style={styles.floatingAIButton}>
        <View style={styles.aiIconWrapper}>
          <AppIcon name={icons.aired} size={wp(8)} color={Colors.red} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const BottomBar = ({navigation, route}) => {
  const initialScreen = route?.params?.screen;

  return (
    <View style={styles.screenContainer}>
      <Tab.Navigator
        initialRouteName={initialScreen || 'Home'}
        tabBar={props => (
          <>
            {/* Hide the native tab bar but keep it for navigation */}
            <View style={styles.hiddenTabBar} />
            {/* Show custom overlay */}
            <CustomTabBarOverlay {...props} />
          </>
        )}
        screenOptions={{
          headerShown: false,
        }}>
        
        {/* Home Tab */}
        <Tab.Screen
          name="Home"
          component={ContractorDashboard}
          options={{
            title: 'Home',
            tabBarIcon: ({focused}) => ({
              uri: focused ? icons.homered : icons.home,
            }),
          }}
        />

        {/* Support Tab */}
        <Tab.Screen
          name="Support"
          component={ContractorSupport}
          options={{
            title: 'Support',
            tabBarIcon: ({focused}) => ({
              uri: focused ? icons.supportred : icons.support,
            }),
          }}
        />

        {/* Payments Tab */}
        <Tab.Screen
          name="TenantPayments"
          component={ContractorPayment}
          options={{
            title: 'Payments',
            tabBarIcon: ({focused}) => ({
              uri: focused ? icons.redPayment : icons.payment,
            }),
          }}
        />

        {/* AI Assistant Tab */}
        <Tab.Screen
          name="AIAssistant"
          component={AIAssistant}
          options={{
            title: 'Ask AI',
            tabBarIcon: ({focused}) => ({
              uri: focused ? icons.aired : icons.ai,
            }),
          }}
        />
          
          <Tab.Screen
            name="AddInvoiceScreen"
            component={AddInvoiceScreen}
            options={{
              tabBarButton: () => null, // This hides it from the tab bar UI
            }}
          />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  hiddenTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 0,
    opacity: 0,
  },
  navbarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? hp(2) : hp(1.5),
    left: wp(4),
    right: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassContainer: {
    flex: 1,
    height: hp(9),
    maxWidth: wp(75),
    borderRadius: 100,
    backgroundColor: 'rgba(255, 245, 245, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 57, 53, 0.2)',
    shadowColor: '#E53935',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: wp(2),
    marginRight: wp(3),
  },
  navbarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.3),
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: 'transparent',
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
  },
  label: {
    fontSize: wp(2.8),
    marginTop: hp(0.2),
    textAlign: 'center',
  },
  floatingAIButton: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(229, 57, 53, 0.3)',
    shadowColor: '#E53935',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});

export default BottomBar;
