
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ImageBackground,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';

const SocialAuthScreenLandlord = ({ route, navigation }) => {
  const { persona } = route.params;

  const handleGoogleLogin = () => {
    console.log('Google Login');
  };

  const handleAppleLogin = () => {
    console.log('Apple Login');
  };

  const handleEmailLogin = () => {
        navigation.navigate('LandlordLogin', { userType: 'landlord' });
  };

  return (
  <ImageBackground
    source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
    style={styles.backgroundImage}
    resizeMode="cover"
  >
      <LinearGradient
      colors={['rgba(254, 249, 246, 0.03)', '#F5F3F2']}
      locations={[0.0453, 0.9953]}
      style={styles.gradientOverlay}
    >
      <StatusBar backgroundColor={Colors.black} barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <AppIcon name={icons.arrowBack} size={24} />
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../Assets/Image/D.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.heading}>Hi There!</Text>

            <Text style={styles.mainHeading}>
              Continue as{'\n'}
              <Text style={styles.boldText}>
                {persona?.charAt(0).toUpperCase() + persona?.slice(1)}
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleGoogleLogin}
            >
              <Text style={styles.buttonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleAppleLogin}
            >
              <Text style={styles.buttonText}>Continue with Apple</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>OR</Text>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={handleEmailLogin}
            >
              <Text style={styles.outlineText}>Login with Email</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  </ImageBackground>
);
};

export default SocialAuthScreenLandlord;

const styles = StyleSheet.create({
      backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%'
    },
  imageStyle: {
        // width: 687,
        width: '100%',
        height: 1231,
        top: -270,
        left: 0,
        // left: -128,
        opacity: 0.3,
        // position: 'absolute',
    },
    gradientOverlay: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
  header: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    paddingTop: hp(6),
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: hp(5),
  },
  logo: {
    width: wp(40),
    height: hp(25),
  },
  contentContainer: {
    paddingHorizontal: wp(5),
    marginTop: hp(3),
  },
  heading: {
    fontSize: 16,
    fontFamily: getFontFamily('medium'),
    color: '#000',
    marginBottom: hp(1),
    fontWeight: 'bold',
  },
  mainHeading: {
    fontSize: hp(2.8),
    color: Colors.black,
    lineHeight: hp(3.5),
    marginBottom: hp(4),
    fontWeight: 'bold',
  },
  boldText: {
    fontWeight: 'bold',
    color: Colors.black,
  },
  button: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 10,
    marginBottom: hp(2),
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: getFontFamily('semibold'),
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineText: {
    fontFamily: getFontFamily('semibold'),
    fontSize: 16,
    color: '#000',
  },
  orText: {
    textAlign: 'center',
    marginVertical: hp(2),
    fontFamily: getFontFamily('medium'),
  },
});
