import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Keyboard,
    Image,
    ImageBackground,
    ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { icons } from '../../Assets';
import { AppIcon } from '../../components/AppIcon';

import CustomButton from '../../components/CustomButton';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { forgotPassword } from '../../Redux/Login/services';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { useDispatch, useSelector } from 'react-redux';

const ForgotPassword = ({ navigation }) => {
    const [email, setEmail] = useState('');
    // const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const { loading } = useSelector(loginDataSelectors.getForgotPasswordData);

    
    const handleSendOTP = async () => {
        if (!email.trim()) {
            showMessage({ message: 'Please enter your email address', type: 'danger' });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage({ message: 'Please enter a valid email address', type: 'danger' });
            return;
        }

        Keyboard.dismiss();

        try {
            await dispatch(forgotPassword({ email: email.trim() })).unwrap();
            // On success, navigate to ResetPassword screen
            navigation.navigate('ResetPassword', { email: email.trim() });
        } catch (error) {
            // Error is already handled in the service with Toast
            console.error('Forgot password error:', error);
        }
    };

//   const handleSendOTP = () => {
//   if (!email.trim()) {
//     showMessage({ message: 'Please enter your email address', type: 'danger' });
//     return;
//   }

//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   if (!emailRegex.test(email)) {
//     showMessage({ message: 'Please enter a valid email address', type: 'danger' });
//     return;
//   }

//   Keyboard.dismiss();
//   setLoading(true);

//   // Directly navigate since API is not ready
//   setTimeout(() => {
//     setLoading(false);
//     showMessage({ message: 'OTP sent successfully to your email', type: 'success' });
//     navigation.navigate('ResetPassword', { email });
//   }, 500); // small delay for UX
// };



    // const handleSendOTP = async () => {
    //     if (!email.trim()) {
    //         showMessage({ message: 'Please enter your email address', type: 'danger' });
    //         return;
    //     }

    //     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    //     if (!emailRegex.test(email)) {
    //         showMessage({ message: 'Please enter a valid email address', type: 'danger' });
    //         return;
    //     }

    //     Keyboard.dismiss();
    //     setLoading(true);

    //     try {
    //         // Replace with actual API
    //         const response = await new Promise((resolve) =>
    //             setTimeout(() => resolve({ success: true }), 1500)
    //         );

    //         if (response.success) {
    //             showMessage({ message: 'OTP sent successfully to your email', type: 'success' });
    //             navigation.navigate('ResetPassword', { email });
    //         }
    //     } catch (error) {
    //         showMessage({
    //             message: error?.message || 'Failed to send OTP. Please try again.',
    //             type: 'danger',
    //         });
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const isButtonDisabled = !email.trim();

    return (
        <ImageBackground
            source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
            style={styles.backgroundImage}
            imageStyle={styles.imageStyle}
            resizeMode="cover"
        >
            <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.95)', '#FFFFFF']}
                locations={[0, 0.2, 0.35, 0.5, 0.7]}
                style={styles.gradientOverlay}>
                <StatusBar backgroundColor={Colors.black} barStyle="dark-content" />
                <FlashMessage position="top" />

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Back Button */}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.navigate('Login')}
                        >
                        <AppIcon name={icons.arrowBack} size={24} />
                        </TouchableOpacity>

                        {/* Logo */}
                        {/* <View style={styles.logoContainer}>
              <Image
                source={require('../../Assets/Image/dwellProperties/Dlogo1.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View> */}

                        {/* Heading */}
                        <Text style={styles.heading}>Forgot  {'\n'}your Password?</Text>
                        <Text style={styles.mainHeading}>
                            Enter your valid email address and we will send {'\n'}
                            you instructions to reset your password.
                        </Text>

                        {/* Form */}
                        <View style={styles.formContainer}>
                            <TextInput
                                label="Email Address"
                                mode="outlined"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={styles.input}
                                outlineColor="#000000ff"
                                activeOutlineColor={Colors.black}
                                theme={{ roundness: 8 }}
                                left={
                                    <TextInput.Icon
                                        icon={require('../../Assets/Image/email.png')}
                                        size={20}
                                        forceTextInputFocus={false}
                                    />
                                }
                            />

                            <CustomButton
                                style={styles.sendButton}
                                title="Reset Password"
                                size={16}
                                action={handleSendOTP}
                                disabled={isButtonDisabled}
                                loading={loading}
                                color={isButtonDisabled ? '#DAD4D4' : '#E53935'}
                                textColor={Colors.white}
                            />

                            {/* Back to Login */}
                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>Back to </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.loginLink}>Login</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    imageStyle: {
        width: '100%',
        height: 931,
        top: -400,
        left: 0,
        opacity: 0.3,
    },
    gradientOverlay: {
         ...StyleSheet.absoluteFillObject 
        },
    scrollContent: { 
        flexGrow: 1,
         paddingHorizontal: wp(5),
         paddingVertical: hp(5) 
        },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : hp(5),
        left: wp(5),
        zIndex: 100,
        padding: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 20,
    },

    heading: {
        fontSize: hp(3.2),
        lineHeight: hp(3.5),
        fontFamily: getFontFamily('bold'),
        fontWeight: '700',
        color: Colors.black,
        marginTop: hp(22),
        marginBottom: hp(2),
        letterSpacing: 0,
    },

    mainHeading: {
        fontSize: hp(1.8),
        lineHeight: hp(3.2),
        color: Colors.black,
        fontFamily: getFontFamily('regular'),
        fontWeight: '400',
        marginBottom: hp(1.5),
    },
    boldText: {
        fontWeight: 'bold',
        color: Colors.black
    },
    formContainer: { 
        width: '100%',
         marginTop: hp(2) 
        },
    input: { 
        backgroundColor: 'transparent',
         borderRadius: 8,
          marginBottom: hp(3)
         },
    sendButton: {
         borderRadius: 10,
          paddingVertical: hp(1.8),
           justifyContent: 'center',
            alignItems: 'center',
             marginBottom: hp(3) 
            },
    loginContainer: {
         flexDirection: 'row',
          justifyContent: 'center',
           alignItems: 'center'
         },
    loginText: {
         fontSize: 14,
          fontFamily: getFontFamily('regular'),
           color: '#666'
         },
    loginLink: {
         fontSize: 14,
          fontFamily: getFontFamily('bold'),
           color: Colors.black 
        },
});

export default ForgotPassword;
