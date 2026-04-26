import React, { useState, useRef , useEffect} from 'react';
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
import { confirmSignUp, resendVerificationCode } from '../../Redux/Login/loginservices';
import { loginDataSelectors, clearResendFreezeIfExpired } from '../../Redux/Login/loginSlice';
import {AppIcon} from '../../components/AppIcon';
import { icons } from '../../Assets';

const OtpScreen = ({ navigation, route }) => {
    const { email, phone, role } = route.params || {};
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const dispatch = useDispatch();
    const { loading ,tempRole , resendLoading} = useSelector(loginDataSelectors.getOtpData);
    const [resendTimer, setResendTimer] = useState(0);

    // ✅ NEW — resend freeze selector
    const {
        attempts: resendAttempts,
        frozenUntil: resendFrozenUntil,
        isFrozen: isResendFrozen,
        remaining: resendRemaining,
    } = useSelector(loginDataSelectors.getResendAttempts);

    // ✅ NEW — freeze countdown string
    const [freezeCountdown, setFreezeCountdown] = useState('');
    
    
    // ── Resend cooldown timer (30s between each resend) ──
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    // ✅ NEW — 5-min freeze countdown timer
    useEffect(() => {
        if (!resendFrozenUntil) {
            setFreezeCountdown('');
            return;
        }
        const tick = () => {
            const diff = resendFrozenUntil - Date.now();
            if (diff <= 0) {
                dispatch(clearResendFreezeIfExpired());
                setFreezeCountdown('');
                return;
            }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setFreezeCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [resendFrozenUntil, dispatch]);

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
        
        if (value && newOtp.every(d => d !== '')) {
        Keyboard.dismiss();
        const otpCode = newOtp.join('');
        dispatch(confirmSignUp({
            email: email,
            otpCode: otpCode,
            role: tempRole || 'tenant',
        })).unwrap().catch(error => {
            console.error('OTP verification error:', error);
        });
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
              role: tempRole || 'tenant',
            })).unwrap();
            // Success navigation is handled in the service
        } catch (error) {
            console.error('OTP verification error:', error);
        }
    };

 const handleResendCode = async () => {
  if (resendTimer > 0 || isResendFrozen) return; // ✅ also block if frozen
  try {
    await dispatch(resendVerificationCode({ email: email })).unwrap();
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    setResendTimer(30); // 30-second cooldown between resends
  } catch (error) {
    console.error('Resend code error:', error);
  }
};

    const isVerifyDisabled = otp.join('').length !== 6 || loading;

    // ✅ NEW — combined disabled check: loading OR 30s cooldown OR 5-min freeze
    const isResendDisabled = resendLoading || resendTimer > 0 || isResendFrozen;

    return (
        <ImageBackground
            source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
            style={styles.backgroundImage}
            imageStyle={styles.imageStyle}
            resizeMode="cover"
        >
                 <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0.2)',
            'rgba(0, 0, 0, 0.6)',
            'rgba(0, 0, 0, 0.7)',
        
          ]}
          locations={[0, 0.4, 0.55, 0.75, 0.9, ]}
          style={styles.gradientOverlay}
        >
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

                        {/* ✅ NEW — Freeze banner (shows after 3 resends) */}
                        {isResendFrozen && (
                            <View style={styles.freezeBanner}>
                                <Icon name="lock-clock" size={18} color="#B71C1C" />
                                <Text style={styles.freezeText}>
                                    Resend locked. Try again in{' '}
                                    <Text style={styles.freezeTimer}>{freezeCountdown}</Text>
                                </Text>
                            </View>
                        )}

                        {/* Resend Code */}
                        <View style={styles.resendContainer}>
                            <Text style={styles.resendText}>Didn't receive the code? </Text>
                            <TouchableOpacity onPress={handleResendCode} disabled={isResendDisabled}>
                                 <Text style={[
                                    styles.resendLink,
                                    isResendDisabled && { color: '#999' }
                                 ]}>
                                    {resendLoading
                                        ? 'Sending...'
                                        : isResendFrozen
                                            ? `Locked (${freezeCountdown})`
                                            : resendTimer > 0
                                                ? `Resend in ${resendTimer}s`
                                                : resendAttempts > 0
                                                    ? `Resend (${resendRemaining} left)`
                                                    : 'Resend'}
                                 </Text>
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

  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    ...StyleSheet.absoluteFillObject,
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
        color: 'Colors.White',
    },
    loginLink: {
        fontSize: 14,
        fontFamily: getFontFamily('bold'),
        color: Colors.black,
    },

    // ✅ NEW — Freeze banner styles
    freezeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#EF9A9A',
        borderRadius: 8,
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.2),
        marginBottom: hp(2),
        gap: wp(2),
    },
    freezeText: {
        flex: 1,
        fontSize: hp(1.6),
        fontFamily: getFontFamily('regular'),
        color: '#B71C1C',
    },
    freezeTimer: {
        fontFamily: getFontFamily('bold'),
        fontWeight: '700',
        color: '#B71C1C',
    },
});

export default OtpScreen;
