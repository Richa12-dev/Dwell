import React, { useState, useRef } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Keyboard,
    ImageBackground,
    ScrollView,
    TextInput as RNTextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';

import CustomButton from '../../components/CustomButton';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { confirmSignUp, resendVerificationCode } from '../../Redux/Login/services';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import {AppIcon} from '../../components/AppIcon';
import { icons } from '../../Assets';

const OtpScreen = ({ navigation, route }) => {
    const { email, phone } = route.params || {};
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const dispatch = useDispatch();
    const { loading } = useSelector(loginDataSelectors.getOtpData);

    const handleOtpChange = (value, index) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');

        if (otpCode.length !== 6) {
            showMessage({ message: 'Please enter complete 6-digit code', type: 'danger' });
            return;
        }

        Keyboard.dismiss();

        try {
            await dispatch(confirmSignUp({
                email: email,
                otpCode: otpCode,
            })).unwrap();
            // Success navigation is handled in the service
        } catch (error) {
            console.error('OTP verification error:', error);
        }
    };

    const handleResendCode = async () => {
        try {
            await dispatch(resendVerificationCode({ email: email })).unwrap();
            setOtp(['', '', '', '', '', '']); // Clear OTP inputs
            inputRefs.current[0]?.focus();
        } catch (error) {
            console.error('Resend code error:', error);
        }
    };

    const isVerifyDisabled = otp.join('').length !== 6 || loading;

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
                            onPress={() => navigation.goBack()}
                        >
                    <AppIcon name={icons.arrowBack} size={24} />
                        </TouchableOpacity>

                        {/* Heading */}
                        <Text style={styles.heading}>Verify Your Email</Text>
                        <Text style={styles.mainHeading}>
                            We have sent a verification code to{'\n'}
                            <Text style={styles.boldText}>{email}</Text>
                        </Text>

                        {/* OTP Input Boxes */}
                        <View style={styles.otpContainer}>
                            {otp.map((digit, index) => (
                                <RNTextInput
                                    key={index}
                                    ref={(ref) => (inputRefs.current[index] = ref)}
                                    style={styles.otpInput}
                                    value={digit}
                                    onChangeText={(value) => handleOtpChange(value, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        {/* Resend Code */}
                        <View style={styles.resendContainer}>
                            <Text style={styles.resendText}>Didn't receive the code? </Text>
                            <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                                <Text style={styles.resendLink}>Resend</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Verify Button */}
                        <CustomButton
                            style={styles.verifyButton}
                            title="Verify Email"
                            size={16}
                            action={handleVerifyOtp}
                            disabled={isVerifyDisabled}
                            loading={loading}
                            color={isVerifyDisabled ? '#DAD4D4' : '#E53935'}
                            textColor={Colors.white}
                        />

                        {/* Back to Login */}
                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Back to </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.loginLink}>Login</Text>
                            </TouchableOpacity>
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
    gradientOverlay: { ...StyleSheet.absoluteFillObject },
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
        lineHeight: hp(2.5),
        color: Colors.black,
        fontFamily: getFontFamily('regular'),
        fontWeight: '400',
        marginBottom: hp(4),
    },
    boldText: {
        fontWeight: '700',
        fontFamily: getFontFamily('bold'),
        color: Colors.black,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(3),
        paddingHorizontal: wp(2),
    },
    otpInput: {
        width: wp(12),
        height: hp(6.5),
        borderWidth: 1,
        borderColor: '#000000ff',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: hp(2.5),
        fontFamily: getFontFamily('bold'),
        color: Colors.black,
        backgroundColor: '#FFFFFF',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(3),
    },
    resendText: {
        fontSize: 14,
        fontFamily: getFontFamily('regular'),
        color: '#666',
    },
    resendLink: {
        fontSize: 14,
        fontFamily: getFontFamily('bold'),
        color: '#E53935',
    },
    verifyButton: {
        borderRadius: 10,
        paddingVertical: hp(1.8),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(3),
        minHeight: hp(6),
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        fontSize: 14,
        fontFamily: getFontFamily('regular'),
        color: '#666',
    },
    loginLink: {
        fontSize: 14,
        fontFamily: getFontFamily('bold'),
        color: Colors.black,
    },
});

export default OtpScreen;
