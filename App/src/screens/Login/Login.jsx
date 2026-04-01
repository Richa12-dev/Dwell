import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
  Image,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { getFontFamily } from '../../utils';
import LinearGradient from 'react-native-linear-gradient';

const ADMIN_TAP_COUNT = 5;      // Number of taps required
const ADMIN_TAP_TIMEOUT = 3000; // Reset tap count if idle for 3 seconds

const Login = ({ navigation }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // --- Secret admin tap state ---
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  useEffect(() => {
    if (isLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }

    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isLoaded, fadeAnim]);

  // Clean up tap timer on unmount
  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  // Secret logo tap handler — 5 taps within 3 seconds → AdminLogin
  const handleLogoTap = () => {
    tapCount.current += 1;

    // Reset the idle timer on each tap
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0; // reset if user stops tapping
    }, ADMIN_TAP_TIMEOUT);

    if (tapCount.current >= ADMIN_TAP_COUNT) {
      tapCount.current = 0;
      clearTimeout(tapTimer.current);
      navigation.navigate('AdminLogin');
    }
  };

  const handleLogin = () => {
    navigation.navigate('TenantLogin');
  };

  const handleTenantLogin = () => {
    navigation.navigate('TenantLogin', { userType: 'tenant' });
  };

  const handleLandlordLogin = () => {
    navigation.navigate('LandlordLogin', { userType: 'landlord' });
  };

  const handleContractorLogin = () => {
    navigation.navigate('ContractorLogin', { userType: 'contractor' });
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };
  
    const handleOpenTerms = () => {
    navigation.navigate('TermsAndConditions', { readOnly: true });
  };
  
  const handleOpenPrivacy = () => {
  navigation.navigate('PrivacyPolicy');
};

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

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>

          {/* Logo — tap 5 times to access Admin Login */}
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={handleLogoTap}
            activeOpacity={1}        // No visual feedback — keeps it truly hidden
          >
            <Image
              source={require('../../Assets/Image/D.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Bottom Form Section */}
          <View style={styles.formContainer}>
            {/* Terms and Privacy Text */}
            <Text style={styles.termsText}>
              By continuing, you accept{'\n'}
              <Text style={styles.boldLinkText} onPress={handleOpenTerms}>Terms & Conditions</Text>
              {' and '}
              <Text style={styles.boldLinkText}  onPress={handleOpenPrivacy}>Privacy Policy</Text>
            </Text>

            {/* Tenant Login Button */}
            <TouchableOpacity
              style={[styles.button, styles.redButton]}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.whiteButtonText}>Tenant Login</Text>
            </TouchableOpacity>

            {/* Landlord Login Button */}
            <TouchableOpacity
              style={[styles.button, styles.redButton]}
              onPress={handleLandlordLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.whiteButtonText}>Landlord Login</Text>
            </TouchableOpacity>

            {/* Contractor Login Button */}
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={handleContractorLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.outlineButtonText}>Contractor Login</Text>
            </TouchableOpacity>

            {/* Register Text */}
            <TouchableOpacity onPress={handleRegister} activeOpacity={0.7}>
              <Text style={styles.registerText}>
                Don't have an account?{' '}
                <Text style={styles.registerLink}>Register Now</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ImageBackground>
    </View>
  );
};

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
  },
  contentContainer: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: hp(15),
    paddingHorizontal: 20,
  },
  logo: {
    width: wp(40),
    height: hp(30),
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: wp(5),
    paddingBottom: hp(5),
    paddingTop: hp(3),
    alignItems: 'center',
  },
  formContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  termsText: {
    fontFamily: getFontFamily('regular'),
    fontSize: wp(3.2),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  boldLinkText: {
    fontFamily: getFontFamily('semibold'),
    color: '#FFFFFF',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  redButton: {
    backgroundColor: '#E63946',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  whiteButtonText: {
    fontSize: wp(4.2),
    fontFamily: getFontFamily('semibold'),
    color: '#FFFFFF',
  },
  outlineButtonText: {
    fontSize: wp(4.2),
    fontFamily: getFontFamily('semibold'),
    color: '#FFFFFF',
  },
  registerText: {
    fontFamily: getFontFamily('regular'),
    fontSize: wp(3.5),
    color: '#FFFFFF',
    marginTop: 8,
  },
  registerLink: {
    fontFamily: getFontFamily('semibold'),
    color: '#FFFFFF',
  },
});

export default Login;
