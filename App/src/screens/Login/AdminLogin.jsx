import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
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
import FlashMessage from 'react-native-flash-message';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { TextInput } from 'react-native-paper';
import { icons } from '../../Assets';
import { AppIcon } from '../../components/AppIcon';
import CustomButton from '../../components/CustomButton';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { login } from '../../Redux/Login/services';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { useFocusEffect } from '@react-navigation/native';
import { resetRoot } from '../../navigation/RouterServices';

const AdminLogin = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [hidePassword, setHidePassword] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const dispatch = useDispatch();

    const { loading } = useSelector(loginDataSelectors.getLoginStatus);

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            return () => {
                setEmail('');
                setPassword('');
            };
        }, [])
    );

    const handleLogin = async () => {
        if (!isMounted) return;
        Keyboard.dismiss();

        // Dispatch login — role 'admin' will be decoded from JWT
        dispatch(
            login({
                username: email,
                password: password,
                isAdmin: true, // flag so services.js can route to AdminDashboard
            })
        );
    };

    const isLoginDisabled = useCallback(() => {
        return email.trim() === '' || password.trim() === '';
    }, [email, password]);

    const togglePasswordVisibility = useCallback(() => {
        if (isMounted) setHidePassword(prev => !prev);
    }, [isMounted]);

    return (
        <ImageBackground
            source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
            style={styles.backgroundImage}
            imageStyle={styles.imageStyle}
            resizeMode="contain"
        >
            <LinearGradient
                colors={['rgba(254, 249, 246, 0.1)', '#F5F3F2']}
                locations={[0.3453, 0.7113]}
                style={styles.gradientOverlay}
            >
                <StatusBar backgroundColor={Colors.black} barStyle="dark-content" />
                <FlashMessage position="top" />

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
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
                        {/* Admin badge — subtle indicator this is admin panel */}
                        <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>ADMIN PORTAL</Text>
                        </View>
                    </View>

                    {/* Header */}
                    <View style={styles.contentContainer}>
                        <Text style={[styles.heading, { textAlign: 'left', marginBottom: 20, marginTop: 30 }]}>
                            Welcome, Admin!
                        </Text>
                        <Text style={styles.mainHeading}>
                            Please enter your {'\n'}
                            <Text style={styles.boldText}>Admin Login Details</Text>
                        </Text>

                        {/* Form */}
                        <View style={styles.formContainer}>
                            <TextInput
                                label="Admin Email"
                                mode="outlined"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                style={styles.input}
                                outlineColor="#100d0dff"
                                activeOutlineColor={'#E53935'}
                                theme={{ roundness: 8 }}
                                left={
                                    <TextInput.Icon
                                        icon={() => (
                                            <AppIcon name={icons.email} height={hp(2.3)} width={hp(2.3)} />
                                        )}
                                    />
                                }
                            />

                            <TextInput
                                label="Password"
                                mode="outlined"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={hidePassword}
                                style={[styles.input, { marginTop: hp(2) }]}
                                outlineColor="#100d0dff"
                                activeOutlineColor={'#E53935'}
                                theme={{ roundness: 8 }}
                                left={
                                    <TextInput.Icon
                                        icon={() => (
                                            <AppIcon name={icons.password} height={hp(2.3)} width={hp(2.3)} />
                                        )}
                                    />
                                }
                                right={
                                    <TextInput.Icon
                                        icon={() => (
                                            <AppIcon
                                                name={hidePassword ? icons.eye : icons.eyeSlash}
                                                height={hp(2.3)}
                                                width={hp(2.3)}
                                            />
                                        )}
                                        onPress={togglePasswordVisibility}
                                        forceTextInputFocus={false}
                                    />
                                }
                            />

                            {/* Forgot Password */}
                            <TouchableOpacity
                                style={styles.forgotButton}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            {/* Login Button */}
                            <CustomButton
                                style={styles.loginButton}
                                title="Admin Login"
                                size={16}
                                action={handleLogin}
                                disabled={isLoginDisabled()}
                                loading={loading}
                                color={isLoginDisabled() ? '#DAD4D4' : '#E53935'}
                                textColor={Colors.white}
                            />
                        </View>
                    </View>
                </ScrollView>
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
        width: '100%',
        height: 1231,
        top: -270,
        left: 0,
        opacity: 0.3,
    },
    gradientOverlay: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp(5),
        paddingTop: hp(6),
        paddingBottom: hp(1),
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: hp(5),
        paddingHorizontal: 20,
    },
    logo: {
        width: wp(40),
        height: hp(25),
    },
    adminBadge: {
        backgroundColor: '#E53935',
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 8,
    },
    adminBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: getFontFamily('bold'),
        letterSpacing: 1.5,
    },
    contentContainer: {
        paddingHorizontal: wp(5),
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
        marginBottom: hp(3),
        fontWeight: 'bold',
    },
    boldText: {
        fontWeight: 'bold',
        color: '#E53935',
    },
    formContainer: { width: '100%' },
    input: {
        backgroundColor: 'transparent',
        borderRadius: 8,
    },
    forgotButton: {
        alignSelf: 'flex-start',
        marginVertical: hp(1),
    },
    forgotButtonText: {
        color: Colors.black,
        fontFamily: getFontFamily('medium'),
        fontSize: 14,
        fontWeight: 'bold',
    },
    loginButton: {
        borderRadius: 10,
        marginVertical: hp(2),
        paddingVertical: 16,
        minHeight: hp(6),
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AdminLogin;
