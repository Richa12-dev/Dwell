import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Image, ImageBackground, ScrollView,
  Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useDispatch } from 'react-redux';

// ✅ Official Apple Sign-In Button (Apple's native button via invertase)
import { AppleButton } from '@invertase/react-native-apple-authentication';

import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { googleOAuthLogin, appleOAuthLogin } from '../../Redux/Login/loginservices';

const SocialAuthScreen = ({ route, navigation }) => {
  const { persona } = route.params; // 'tenant' | 'landlord' | 'contractor'
  const dispatch = useDispatch();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  const EMAIL_ROUTES = {
    tenant: 'TenantLogin',
    landlord: 'LandlordLogin',
    contractor: 'ContractorLogin',
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    await dispatch(googleOAuthLogin({ persona }));
    setLoadingGoogle(false);
  };

  const handleAppleLogin = async () => {
    setLoadingApple(true);
    await dispatch(appleOAuthLogin({ persona }));
    setLoadingApple(false);
  };

  const handleEmailLogin = () => {
    navigation.navigate(EMAIL_ROUTES[persona], { userType: persona });
  };

  const personaLabel = persona?.charAt(0).toUpperCase() + persona?.slice(1);

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
                <Text style={styles.boldText}>{personaLabel}</Text>
              </Text>

              {/* ✅ Custom Red Google Button — centered, full width */}
              {loadingGoogle ? (
                <View style={[styles.socialButton, styles.googleButton]}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleLogin}
                  activeOpacity={0.85}
                >
                  {/* Google "G" SVG-style icon using colored text blocks */}
                  <View style={styles.googleIconContainer}>
          <Image
  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
  style={styles.googleIcon}
  resizeMode="contain"
/>
                  
                
                  </View>
                  <Text style={styles.socialButtonText}>Sign in with Google</Text>
                </TouchableOpacity>
              )}

              {/* ✅ Official Apple Sign-In Button (iOS only) */}
              {Platform.OS === 'ios' && (
                <>
                  {loadingApple ? (
                    <View style={[styles.socialButton, styles.appleLoadingButton]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : (
                    <AppleButton
                      buttonStyle={AppleButton.Style.BLACK}
                      buttonType={AppleButton.Type.SIGN_IN}
                      style={styles.appleButton}
                      onPress={handleAppleLogin}
                    />
                  )}
                </>
              )}

              <Text style={styles.orText}>OR</Text>

              {/* Email Login */}
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

export default SocialAuthScreen;

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    paddingTop: hp(6),
  },

  logoContainer: {
    alignItems: 'center',
    marginTop: hp(5),
    minHeight: hp(25),
    justifyContent: 'center',
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

  // ✅ Shared social button base
  socialButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },

  // ✅ Google — red background, centered content
  googleButton: {
    backgroundColor: '#DB4437',
  },
  googleIcon: {
    width: 16,
    height: 16,
  
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: {
    color: '#DB4437',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 18,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 19,
    fontFamily: getFontFamily('semibold'),
    fontWeight: '600',
  },

  // ✅ Apple button — matches Google button width/height
  appleButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    marginBottom: hp(2),
  },
  appleLoadingButton: {
    backgroundColor: '#000',
  },

  // OR divider
  orText: {
    textAlign: 'center',
    marginVertical: hp(2),
    fontFamily: getFontFamily('medium'),
  },

  // Email outline button
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
});
