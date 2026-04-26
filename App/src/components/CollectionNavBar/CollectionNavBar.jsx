import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Dialog from 'react-native-dialog';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {useDispatch, useSelector} from 'react-redux';
import {icons} from '../../Assets';
import {AppIcon} from '../AppIcon';
import {loginDataSelectors} from '../../Redux/Login/loginSlice';
import {logout} from '../../Redux/Login/services';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import {
  notificationSelectors,
  getUnreadCount,
} from '../../Redux/NotificationServices/notificationSlice';

const CollectionNavBar = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {token} = useSelector(loginDataSelectors.getData);
  const [showDialog, setShowDialog] = useState(false);
  
  // Get unread count from Redux store
  const unreadCount = useSelector(notificationSelectors.selectUnreadCount);
  const hasUnread = unreadCount > 0;
 
  // Re-fetch unread count every time screen comes into focus
  // So when user reads notifications and comes back, the dot disappears
  useFocusEffect(
    useCallback(() => {
      dispatch(getUnreadCount());
    }, [dispatch]),
  );
 

  const handleLogout = async () => {
    try {
      setShowDialog(false);
      await dispatch(logout({token})).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Glass Effect Navbar */}
        <View style={styles.glassContainer}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../Assets/Image/D.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoText}>DWELL</Text>
              <Text style={styles.logoText}>PROPERTIES</Text>
            </View>
          </View>

          {/* Right Icons */}
          <View style={styles.rightIcons}>
            <TouchableOpacity
              onPress={() => navigation.navigate('TenantNotification')}
              style={styles.iconButton}>
            <AppIcon
                name={hasUnread ? icons.bellIcon : icons.bell}
                size={wp('7')}
                color={'#292929'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileHome')}
              style={styles.iconButton}>
              <AppIcon name={icons.profile} size={wp('7')} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Logout Dialog */}
      <Dialog.Container visible={showDialog}>
        <Text
          style={{
            fontFamily: getFontFamily('medium'),
            textAlign: 'center',
            color: Colors.black,
          }}>
          Are you sure you want to logout?
        </Text>
        <View style={styles.dialogButtons}>
          <TouchableOpacity
            style={[styles.dialogBtn, {backgroundColor: '#a1a1a1'}]}
            onPress={handleLogout}>
            <Text
              style={{fontFamily: getFontFamily('medium'), color: 'black'}}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dialogBtn, {backgroundColor: Colors.red}]}
            onPress={() => setShowDialog(false)}>
            <Text
              style={{fontFamily: getFontFamily('medium'), color: 'white'}}>
              No
            </Text>
          </TouchableOpacity>
        </View>
      </Dialog.Container>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : hp(7),
    paddingHorizontal: wp(4),
    backgroundColor: 'transparent',
  },

  glassContainer: {
    height: hp(9),
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    backgroundColor: 'rgba(255, 245, 245, 0.85)', 
    borderWidth: 1.5,
    borderColor: 'rgba(229, 57, 53, 0.2)',
    shadowColor: '#E53935',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  logoTextContainer: {
    justifyContent: 'center',
  },
  logoText: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily('bold'),
    color: Colors.red,
    letterSpacing: 0.5,
    lineHeight: wp(4.5),
    fontWeight: "bold",
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: wp('9'),
    height: wp('9'),
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(10),
    marginTop: hp(3),
    marginBottom: hp(3),
  },
  dialogBtn: {
    paddingHorizontal: wp(4),
    paddingVertical: wp(2),
    borderRadius: 4,
  },
});

export default CollectionNavBar;
