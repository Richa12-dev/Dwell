import React, { useEffect, useState } from 'react';
import { Dimensions, StatusBar, StyleSheet, View, ImageBackground, Image, Text } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import LinearGradient from 'react-native-linear-gradient';
// import {useSelector} from 'react-redux';
import { resetRoot } from '../../navigation/RouterServices';
// import {loginDataSelectors} from '../../Redux/Login/loginSlice';
const Splash = ({ navigation }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // For now always go to Onboarding
      navigation.replace('OnboardingScreen');

    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    // <View>
    <View style={styles.container}>
      <StatusBar backgroundColor={'#000'} barStyle="light-content" />

      {/* Background Image with gradient overlay */}
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




        {/* Logo Container */}
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
