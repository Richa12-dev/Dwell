import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View, Image} from 'react-native';
import {icons} from '../../Assets';
import {AppIcon} from '../../components/AppIcon';
import CustomModal from '../../components/HamburgerComponent';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const Navbar = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showSettingsOptions, setShowSettingsOptions] = useState(false);
  const [changeColor, setChangeColor] = useState(false);
  const navigation = useNavigation();

  const handleShowModal = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const handleItemClick = item => {
    if (item.title === 'Settings') {
      setShowSettingsOptions(!showSettingsOptions);
      setChangeColor(!changeColor);
    } else {
      switch (item.title) {
        // case 'Home':
        //   handleCloseModal();
        //   navigation.navigate('BottomFotter', {screen: 'Home'});
        //   break;
        case 'Disbursal':
          handleCloseModal();
          navigation.navigate('Disbursal');
          break;
        case 'Payout':
          handleCloseModal();
          navigation.navigate('Payout');
          break;
        // case 'Lead Generation':
        //   handleCloseModal();
        //   navigation.navigate('BottomFotter', {screen: 'Attendance'});
        //   break;
        // case 'My SE Score':
        //   handleCloseModal();
        //   navigation.navigate('ScoreHome');
        //   break;
        case 'Support':
          handleCloseModal();
          navigation.navigate('BottomFotter', {screen: 'Menu'});
          break;
        case 'Product Policy':
          handleCloseModal();
        
          break;
        default:
          break;
      }
    }
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleShowModal}>
          <AppIcon name={icons.humberger} size={wp('13')} />
        </TouchableOpacity>
         
                   <Image
                                source={require('../../Assets/Image/dwellProperties/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                              />
             
        {/* <AppIcon name={icons.logo} size={wp('11')} style={styles.logo} /> */}
        <TouchableOpacity onPress={() => navigation.navigate('Notification')}>
          <AppIcon name={icons.bellIcon} size={wp('9')} style={styles.bell} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ProfileHome')}>
          <AppIcon name={icons.avtarWhite} size={wp('9')} />
        </TouchableOpacity>
      </View>

      <CustomModal
        isVisible={isModalVisible}
        onCloseModal={handleCloseModal}
        onBackButtonPress={handleCloseModal}
        animationIn="slideInLeft"
        animationOut="slideOutLeft"
        title="Dwell"
        onItemClick={handleItemClick}
        // appLogo={icons.logo}
        items={[
            {title: 'Home', icon: icons.hmbergerHome},
          // {title: 'Home', icon: icons.hmbergerHome, screen: 'Dashboard'},
          // {title: 'Disbursal', icon: icons.disbursalLogo, screen: 'Disbursal'},
          // {title: 'Payout', icon: icons.payoutLogo, screen: 'Payout'},
          // {
          //   title: 'Lead Generation',
          //   icon: icons.leadGenerationIcon,
          //   screen: '',
          // },
  
          // {title: 'My SE Score', icon: icons.mySeScoreLogo, screen: ''},
          {
            title: 'Support',
            icon: icons.humbergerSupport,
            // screen: '',
          },
          {
            title: 'Settings',
            icon: icons.settingLogo,
            screen: 'Dashboard',
            rightIcon: icons.dropHUmberger,
          },
        ]}
        showSettingsOptions={showSettingsOptions}
        changeColor={changeColor}
        setShowSettingsOptions={setShowSettingsOptions}
        setChangeColor={setChangeColor}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'red',
    alignItems: 'center',
  },
logo: {
  width: wp('20%'),     // adjust width
  height: hp('5%'),     // adjust height
  marginLeft: wp('10%'), // keep it centered without pushing too far
},

  bell: {
    marginLeft: wp('25%'),
  },
});

export default Navbar;
