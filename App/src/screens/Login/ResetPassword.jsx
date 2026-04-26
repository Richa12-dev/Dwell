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
    ImageBackground,
    ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import CustomButton from '../../components/CustomButton';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { confirmForgotPassword } from '../../Redux/Login/loginservices';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { useDispatch, useSelector } from 'react-redux';
import {AppIcon} from '../../components/AppIcon';
import { icons } from '../../Assets';

const ResetPassword = ({ navigation, route }) => {
    const { email } = route.params || {};
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const dispatch = useDispatch();
    const { loading } = useSelector(loginDataSelectors.getResetPasswordData);

    const handleResetPassword = async () => {
        if (!resetCode.trim()) {
            showMessage({ message: 'Please enter the reset code', type: 'danger' });
            return;
        }

        if (!newPassword.trim()) {
            showMessage({ message: 'Please enter a new password', type: 'danger' });
            return;
        }

        if (newPassword.length < 8) {
            showMessage({ message: 'Password must be at least 8 characters long', type: 'danger' });
            return;
        }

        if (!confirmPassword.trim()) {
            showMessage({ message: 'Please confirm your password', type: 'danger' });
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage({ message: 'Passwords do not match', type: 'danger' });
            return;
        }

        Keyboard.dismiss();

        try {
            await dispatch(confirmForgotPassword({
                email: email,
                code: resetCode.trim(),
                newPassword: newPassword,
            })).unwrap();
            // Success navigation is handled in the service
        } catch (error) {
            console.error('Reset password error:', error);
        }
    };

    const isButtonDisabled = !resetCode.trim() || !newPassword.trim() || !confirmPassword.trim();

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
                        <Text style={styles.heading}>Reset Code</Text>
                        <Text style={styles.mainHeading}>
                            We have sent the reset code to your registered email{'\n'}
                            address. Enter it in below field to reset password.
                        </Text>

                        {/* Form */}
                        <View style={styles.formContainer}>
                            <TextInput
                                label="Reset Code"
                                mode="outlined"
                                value={resetCode}
                                onChangeText={setResetCode}
                                keyboardType="default"
                                autoCapitalize="characters"
                                style={styles.input}
                                outlineColor="#000000ff"
                                activeOutlineColor={Colors.black}
                                theme={{ roundness: 8 }}
                                placeholder="DW123456"
                            />

                            <TextInput
                                label="New Password"
                                mode="outlined"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNewPassword}
                                autoCapitalize="none"
                                style={styles.input}
                                outlineColor="#000000ff"
                                activeOutlineColor={Colors.black}
                                theme={{ roundness: 8 }}
                                right={
                                    <TextInput.Icon
                                    
                                icon={() => (
                      <AppIcon
                        name={showNewPassword ? icons.eye : icons.eyeSlash}
                        height={hp(2.3)}
                        width={hp(2.3)}
                      />
                    )}
                    
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                        forceTextInputFocus={false}
                                    />
                                }
                            />

                            <TextInput
                                label="Confirm Password"
                                mode="outlined"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                style={styles.input}
                                outlineColor="#000000ff"
                                activeOutlineColor={Colors.black}
                                theme={{ roundness: 8 }}
                                right={
                                    <TextInput.Icon
                                                                      icon={() => (
                      <AppIcon
                        name={showNewPassword ? icons.eye : icons.eyeSlash}
                        height={hp(2.3)}
                        width={hp(2.3)}
                      />
                    )}

                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        forceTextInputFocus={false}
                                    />
                                }
                            />

                            <CustomButton
                                style={styles.resetButton}
                                title="Change Password"
                                size={16}
                                action={handleResetPassword}
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
    gradientOverlay: { ...StyleSheet.absoluteFillObject },
    scrollContent: { flexGrow: 1, paddingHorizontal: wp(5), paddingVertical: hp(5) },
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
        fontSize: hp(1.7),
        lineHeight: hp(2.2),
        color: Colors.black,
        fontFamily: getFontFamily('regular'),
        fontWeight: '400',
        marginBottom: hp(1.5),
    },
    formContainer: {
         width: '100%',
          marginTop: hp(1) 
        },
    input: {
         backgroundColor: 'transparent',
          borderRadius: 8,
           marginBottom: hp(1)
         },
    resetButton: { 
        borderRadius: 10, 
        paddingVertical: hp(1.8), 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: hp(3) ,
         minHeight: hp(6),
    },
    loginContainer: {
         flexDirection: 'row',
          justifyContent: 'center',
           alignItems: 'center' 
        },
    loginText: {
         fontSize: 14,
         fontFamily: getFontFamily('regular'),
          color: '#666' },
    loginLink: {
         fontSize: 14,
          fontFamily: getFontFamily('bold'),
           color: Colors.black 
        },
});

export default ResetPassword;
