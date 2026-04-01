import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {
  BackHandler,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Dialog from 'react-native-dialog';
import Modal from 'react-native-modal';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {useDispatch, useSelector} from 'react-redux';
import {icons} from '../../Assets';
import {loginDataSelectors} from '../../Redux/Login/loginSlice';
import {logout} from '../../Redux/Login/services';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import {AppIcon} from '../AppIcon';
import HamburgerItem from '../DisbursalComponent';

const CustomModal = ({
  isVisible,
  onCloseModal,
  animationIn,
  animationOut,
  title,
  items,
  appLogo,
  onItemClick,
  showSettingsOptions,
  changeColor,
  logoutToken,
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {token} = useSelector(loginDataSelectors.getData);
  const [showDialog, setShowDialog] = useState(false);

  const handledialog = () => {
    setShowDialog(true);
  };

  const handleLogout = () => {
    dispatch(
      logout({
        token: token,
      }),
    );
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isVisible) {
          onCloseModal();
          return true;
        }
        return false;
      },
    );

    return () => backHandler.remove();
  }, [isVisible, onCloseModal]);

  return (
    <Modal
      isVisible={isVisible}
      onSwipeComplete={onCloseModal}
      onBackdropPress={onCloseModal}
      animationIn={animationIn}
      onBackButtonPress={onCloseModal}
      animationOut={animationOut}
      style={{margin: 0}}>
      <StatusBar backgroundColor={'#edffe8'} />
      <View
        style={{
          backgroundColor: '#edffe8',
          flex: 1,
          width: wp(80),
        }}>
        <View
          style={{
            flexDirection: 'row',
            marginTop: hp(5),
            marginBottom: hp(2),
            marginHorizontal: wp(4),
            alignItems: 'center',
          }}>
          <View>
            <Text
              style={{
                fontSize: wp(7),
                color: '#174035',
                marginLeft: wp(5),
                fontFamily: getFontFamily('bold'),
              }}>
              THE DWELL
            </Text>
          </View>
        </View>

        {items.map((item, index) => (
          <React.Fragment key={index}>
            <TouchableOpacity onPress={() => onItemClick(item)}>
              <HamburgerItem
                title={item.title}
                icon={item.icon}
                rightIcon={item.rightIcon}
                hideBorderBottom={item.title === 'Settings'}
                backgroundColor={
                  item.title === 'Settings' && changeColor
                    ? '#d8fbce'
                    : '#edffe8'
                }
              />
            </TouchableOpacity>
            {item.title === 'Settings' && showSettingsOptions && (
              <View
                style={{
                  height: showSettingsOptions ? null : 0,
                }}>
                <TouchableOpacity
                  onPress={() => {
                    onCloseModal();
                    navigation.navigate('Notification');
                  }}>
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: changeColor ? '#d8fbce' : '#edffe8',
                      paddingVertical: wp(1),
                    }}>
                    <Text
                      style={{
                        textAlign: 'left',
                        color: '#224b3e',
                        fontSize: wp(3.5),
                        marginLeft: wp(30),
                        fontFamily: getFontFamily('bold'),
                        backgroundColor: changeColor ? '#d8fbce' : '#edffe8',
                      }}>
                      Notification
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onCloseModal();
                    navigation.navigate('Privacy');
                  }}>
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: changeColor ? '#d8fbce' : '#edffe8',
                      paddingVertical: wp(1),
                    }}>
                    <Text
                      style={{
                        textAlign: 'left',
                        color: '#224b3e',
                        fontSize: wp(3.5),
                        marginLeft: wp(30),
                        fontFamily: getFontFamily('bold'),
                        backgroundColor: changeColor ? '#d8fbce' : '#edffe8',
                      }}>
                      Privacy Policy
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onCloseModal();
                    navigation.navigate('TCMenu');
                  }}>
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: changeColor ? '#d8fbce' : '#edffe8',
                      paddingVertical: 5,
                    }}>
                    <Text
                      style={{
                        textAlign: 'left',
                        color: '#224b3e',
                        fontSize: wp(3.5),
                        marginLeft: wp(30),
                        fontFamily: getFontFamily('bold'),
                        backgroundColor: changeColor ? '#d8fbce' : '#edffe8',
                      }}>
                      T&C Policy
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={handledialog}>
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: changeColor ? '#d8fbce' : '#edffe8',
                      paddingVertical: 5,
                      paddingBottom: 15,
                    }}>
                    <Text
                      style={{
                        textAlign: 'left',
                        color: '#224b3e',
                        fontSize: wp(3.5),
                        marginLeft: wp(30),
                        fontFamily: getFontFamily('bold'),
                      }}>
                      Logout
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>

      <Dialog.Container visible={showDialog}>
        <Text
          style={{
            fontFamily: getFontFamily('medium'),
            textAlign: 'center',
            marginTop: 0,
            color: Colors.primary,
          }}>
          Are you sure you want to logout?
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: widthPercentageToDP(10),
            marginTop: hp(3),
            marginBottom: hp(3),
          }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#a1a1a1',
              paddingHorizontal: wp(4),
              paddingVertical: wp(2),
              borderRadius: 4,
            }}
            onPress={handleLogout}>
            <Text style={{fontFamily: getFontFamily('medium'), color: 'black'}}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingHorizontal: wp(4),
              paddingVertical: wp(2),
              borderRadius: 4,
            }}
            onPress={() => setShowDialog(false)}>
            <Text style={{fontFamily: getFontFamily('medium'), color: 'white'}}>
              No
            </Text>
          </TouchableOpacity>
        </View>
      </Dialog.Container>
    </Modal>
  );
};

export default CustomModal;
