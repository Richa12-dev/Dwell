//import {createNativeBottomTabNavigator} from '@bottom-tabs/react-navigation';
//import React from 'react';
//import {Platform, StyleSheet, Text, TouchableOpacity, View, Dimensions} from 'react-native';
//
//import {icons} from '../Assets';
//import {Colors} from '../Theme';
//import {AppIcon} from '../components/AppIcon';
//import {
//  heightPercentageToDP,
//  heightPercentageToDP as hp,
//  widthPercentageToDP as wp,
//} from 'react-native-responsive-screen';
//// import {
////   LandlordDashboardView,
////    LandlordProperties,
////   LandlordSupport
//// } from '../screens';
//import LandlordDashboardView from '../screens/Dashboard/LandlordDashboardView';
//import LandlordProperties from '../screens/Properties/LandlordProperties';
//import LandlordSupport from '../screens/Support/LandlordSupport';
//import {getFontFamily} from '../utils';
//import AIAssistant from '../screens/AIAssistant/AIAssistant';
//
////const Tab = createBottomTabNavigator();
//
//const Tab = createNativeBottomTabNavigator();
//
//const TabButton = props => {
//  const {item, onPress, accessibilityState, styles, navigation} = props;
//  const focused = accessibilityState.selected;
//  // const handlePress = () => {
//  //   console.log('hhhh', item.route);
//  //   // Reset the stack navigation to the initial route
//  //   navigation.reset({
//  //     index: 0,
//  //     routes: [{name: item.route}],
//  //   });
//  // };
//
//  const handlePress = () => {
//  navigation.navigate(item.route);
// };
//  // splashBAckground
//  return (
//    <TouchableOpacity
//      activeOpacity={1}
//      // onPress={item.name == 'Support' ? console.log('') : handlePress}
//         onPress={handlePress}
//      style={styles.contanier}>
//      <View>
//        <AppIcon
//          name={focused ? item.focusicon : item.icon}
//          size={focused ? wp(8) : wp(7)}
//          style={{marginTop: focused ? -2 : 0}}
//        />
//       
//      </View>
//      <Text
//        style={{
//          ...styles.title,
//          color: focused ? Colors.red : Colors.white,
//          fontFamily: getFontFamily('medium'),
//          fontSize: focused ? wp(4.5) : wp(3.5),
//        }}>
//        {item.name}
//      </Text>
//    </TouchableOpacity>
//  );
//};
//
//const BottomBar = ({navigation, route}) => {
//  const initialScreen = route?.params?.screen;
//
//  const TabBarArr = [
//    {
//      route: 'Home',
//      component: LandlordDashboardView,
//      name: 'Home',
//      icon: icons.whiteHome,
//      focusicon: icons.greenHome,
//    },
//    {
//      route: 'Attendance',
//      component: LandlordProperties,
//      name: 'Properties',
//      icon: icons.whiteLead,
//      focusicon: icons.greenLead,
//    },
//       {
//          route: 'Menu',
//         component: LandlordSupport,
//          name: 'Support',
//          icon: icons.whiteSupport,
//          focusicon: icons.greenSupport,
//        },
//   
//    // {
//    //   route: 'Home',
//    //   component: StaffDashboard,
//    //   name: 'Home',
//    //   icon: icons.whiteHome,
//    //   focusicon: icons.greenHome,
//    // },
//    // {
//    //   route: 'Attendance',
//    //   component: StaffLeadGenration,
//    //   name: 'Lead',
//    //   icon: icons.whiteLead,
//    //   focusicon: icons.greenLead,
//    // },
//   
//  ];
//    const AITab = {
//      route: 'AIAssistant',
//      name: 'Ask AI',
//      icon: icons.ai,
//      focusicon: icons.aired,
//    };
//
//  const { width, height } = Dimensions.get('window');
// 
//  const wp = (percentage) => {
//    return (width * percentage) / 100;
//  };
//   
//  const hp = (percentage) => {
//    return (height * percentage) / 100;
//  };
//
//  return (
//    <Tab.Navigator
//      initialRouteName={initialScreen || 'Home'}
//      screenOptions={{
//        headerShown: false,
//        tabBarStyle: [styles.tabbar],
//
//        tabBarHideOnKeyboard: true,
//      }}
//      safeAreaInsets={{
//        bottom: 5,
//      }}>
//      {TabBarArr.map((item, index) => {
//        return (
//          <Tab.Screen
//            key={index}
//            options={{
//              tabBarShowLabel: false,
//              tabBarButton: props => (
//                <TabButton
//                  {...props}
//                  item={item}
//                  styles={styles}
//                  navigation={navigation}
//                  // onPress={SetFooterSelected(index)}
//                  //    theme={theme}
//                />
//              ),
//            }}
//            name={item.route}
//            component={item.component}
//          />
//        );
//      })}
//    </Tab.Navigator>
//  );
//};
//
//const styles = StyleSheet.create({
//  contanier: {
//    flex: 1,
//    justifyContent: 'center',
//    alignItems: 'center',
//    borderColor: Colors.black,
//    height: Platform.OS === 'ios' ? hp(10) : hp(10),
//  },
//  title: {
//    //  fontFamily: fonts.regular,
//    // fontWeight:'700',
//    fontSize: hp(1.5),
//    color: Colors.white,
//    marginTop: hp(0.4),
//  },
//  tabbar: {
//    height: Platform.OS === 'ios' ? hp(10) : hp(10),
//    backgroundColor: Colors.black,
//    borderTopLeftRadius: 18,
//    borderTopRightRadius: 18,
//  },
//  icon: {
//    width: hp(3),
//    height: hp(3),
//  },
//  homeicon: {
//    width: hp(10),
//    height: hp(10),
//    bottom: hp(3),
//  },
//  outerContanier: {
//    borderColor: Colors.white,
//    borderWidth: hp(1),
//    borderRadius: hp(100),
//    bottom: hp(4),
//    position: 'absolute',
//    zIndex: 1000,
//  },
//  innerContanier: {
//    backgroundColor: Colors.black,
//    padding: hp(1),
//    borderRadius: hp(100),
//  },
//});
//
//export default BottomBar;

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

// ✅ Landlord Screens
import LandlordDashboardView from '../screens/Dashboard/LandlordDashboardView';
import LandlordProperties from '../screens/Properties/LandlordProperties';
import LandlordSupport from '../screens/Support/LandlordSupport';
import AIAssistant from '../screens/AIAssistant/AIAssistant';
import AddPropertiesScreen from '../screens/Properties/AddPropertiesScreen';
import PropertiesDetails from '../screens/Properties/PropertiesDetails';
import LandlordTicketDetails from '../screens/Support/LandlordTicketDetails';

import TenantManagement from '../screens/Support/TenantManagement';
import RentCollection from '../screens/Payment/RentCollection';


const Tab = createBottomTabNavigator();

// Custom Bubble Tab Bar (copied from BottonFooter)
const CustomTabBarOverlay = ({state, descriptors, navigation}) => {
  const TabBarArr = [
    {
      route: 'Home',
      name: 'Home',
        icon: icons.home,
        focusicon: icons.homered,
    },
    {
      route: 'Properties',
      name: 'Properties',
      icon: icons.properties,
      focusicon: icons.redProperties,
    },
    {
      route: 'Support',
      name: 'Support',
        icon: icons.support,
        focusicon: icons.supportred,
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
      {/* Main Bubble Navigation Bar */}
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
          <AppIcon name={AITab.focusicon} size={wp(8)} color={Colors.red} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Bottom Navigation Container
const ProfileFooter = ({navigation, route}) => {
  const initialScreen = route?.params?.screen;

  return (
    <View style={styles.screenContainer}>
      <Tab.Navigator
        initialRouteName={initialScreen || 'Home'}
        tabBar={props => (
          <>
            <View style={styles.hiddenTabBar} />
            <CustomTabBarOverlay {...props} />
          </>
        )}
        screenOptions={{
          headerShown: false,
        }}>
        {/* Landlord Tabs */}
        <Tab.Screen name="Home" component={LandlordDashboardView} />
        <Tab.Screen name="Properties" component={LandlordProperties} />
        <Tab.Screen name="Support" component={LandlordSupport} />
        <Tab.Screen name="AIAssistant" component={AIAssistant} />
          
          <Tab.Screen
                    name="AddPropertiesScreen"
                    component={AddPropertiesScreen}
                    options={{
                      tabBarButton: () => null, // Hide from tab bar
                    }}
                  />
                  <Tab.Screen
                    name="PropertiesDetails"
                    component={PropertiesDetails}
                    options={{
                      tabBarButton: () => null, // Hide from tab bar
                    }}
                  />
                  <Tab.Screen
                    name="LandlordTicketDetails"
                    component={LandlordTicketDetails}
                    options={{
                      tabBarButton: () => null, // Hide from tab bar
                    }}
                  />
          
          <Tab.Screen
            name="TenantManagement"
            component={TenantManagement}
            options={{
              tabBarButton: () => null, // Hide from tab bar
            }}
          />
          
          <Tab.Screen
            name="RentCollection"
            component={RentCollection}
            options={{
              tabBarButton: () => null, // Hide from tab bar
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

export default ProfileFooter;
