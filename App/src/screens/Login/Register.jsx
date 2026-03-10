import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { TextInput } from 'react-native-paper';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, verifyContractorAddress } from '../../Redux/Login/services';
import { loginDataSelectors, resetAddressVerification } from '../../Redux/Login/loginSlice';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';


const roleOptions = [
  { id: 'tenant', name: 'Tenant' },
  { id: 'landlord', name: 'Landlord' },
  { id: 'contractor', name: 'Contractor' },
];


const Register = ({ navigation }) => {
  const scrollRef = useRef(null);

  // Core fields
  const [fields, setFields] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: '',
  });

  // Contractor address fields
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipcode: '',
  });

  const [hidePassword, setHidePassword] = useState(true);
  const [errors, setErrors] = useState({});
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const dispatch = useDispatch();

 
  const { loading: registrationLoading } = useSelector(
    loginDataSelectors.getRegistrationData
  );

  // Address verification state from Redux
  const {
    loading: verifyLoading,
    status: verifyStatus,   // 'idle' | 'success' | 'failed'
    lat: verifiedLat,
    lng: verifiedLng,
    fullAddress: verifiedAddress,
    error: verifyError,
  } = useSelector(loginDataSelectors.getAddressVerification);

  const isContractor = fields.role === 'contractor';
  const isVerified = verifyStatus === 'success';

  // ─── Address helpers ────────────────────────────────────────────────────────
  const handleAddressChange = (key, value) => {
    setAddress(prev => ({ ...prev, [key]: value }));
    // Reset Redux verification state whenever user edits any address field
    if (verifyStatus !== 'idle') {
      dispatch(resetAddressVerification());
    }
  };

  // ─── Dispatch geocoding thunk ───────────────────────────────────────────────
  const handleVerifyAddress = async () => {
    if (!address.street.trim() || !address.city.trim()) {
      setErrors(prev => ({
        ...prev,
        address: 'Enter at least street and city to verify',
      }));
      return;
    }
    setErrors(prev => ({ ...prev, address: '' }));
    await dispatch(verifyContractorAddress(address));
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validateFields = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+\d{11,15}$/;

    if (!fields.firstName.trim()) newErrors.firstName = 'First name required';
    if (!fields.lastName.trim()) newErrors.lastName = 'Last name required';
    if (!emailRegex.test(fields.email)) newErrors.email = 'Enter a valid email';
    if (fields.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';
    if (!phoneRegex.test(fields.phone))
      newErrors.phone = 'Enter phone in format +15555550100';
    if (!fields.role) newErrors.role = 'Select a role';

    if (isContractor) {
      if (!address.street.trim()) newErrors.street = 'Street address required';
      if (!address.city.trim()) newErrors.city = 'City required';
      if (!address.state.trim()) newErrors.state = 'State required';
      if (!address.zipcode.trim()) newErrors.zipcode = 'Zip code required';
      if (!isVerified) {
        newErrors.address = 'Please verify your address before submitting';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const callAPI = async () => {
    if (!validateFields()) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    try {
      const userData = {
        email: fields.email.trim(),
        password: fields.password,
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        phoneNumber: fields.phone.trim(),
        role: fields.role,
        tenantId: fields.role === 'tenant' ? `tenant-${Date.now()}` : '',
        landlordId: fields.role === 'landlord' ? `landlord-${Date.now()}` : '',
        contractorId:
          fields.role === 'contractor' ? `contractor-${Date.now()}` : undefined,
        // Verified address payload for contractors
        ...(isContractor && {
          address: {
            street: address.street.trim(),
            city: address.city.trim(),
            state: address.state.trim(),
            zipcode: address.zipcode.trim(),
            fullAddress: verifiedAddress,
            lat: verifiedLat,
            lng: verifiedLng,
          },
        }),
      };

      await dispatch(registerUser(userData)).unwrap();
      navigation.navigate('OtpScreen', {
        email: fields.email.trim(),
        phone: fields.phone.trim(),
      });
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  // ─── Dropdown handlers ──────────────────────────────────────────────────────
  const handleRoleDropdownToggle = () => {
    const newState = !showRoleDropdown;
    setShowRoleDropdown(newState);
    if (newState)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleRoleSelect = roleId => {
    setFields({ ...fields, role: roleId });
    setShowRoleDropdown(false);
    if (roleId !== 'contractor') {
      dispatch(resetAddressVerification());
      setAddress({ street: '', city: '', state: '', zipcode: '' });
    }
  };

  // ─── Verify button helpers ──────────────────────────────────────────────────
  const getVerifyButtonStyle = () => {
    if (verifyStatus === 'success') return styles.verifyButtonSuccess;
    if (verifyStatus === 'failed') return styles.verifyButtonFailed;
    return styles.verifyButtonDefault;
  };

  const getVerifyButtonLabel = () => {
    if (verifyLoading) return '';
    if (verifyStatus === 'success') return '✓  Verified';
    if (verifyStatus === 'failed') return 'Retry Verify';
    return 'Verify Address';
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <ImageBackground
      source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
      style={styles.backgroundImage}
      imageStyle={styles.imageStyle}
      resizeMode="cover">
      <LinearGradient
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.3)',
          'rgba(255,255,255,0.7)',
          'rgba(255,255,255,0.95)',
          '#FFFFFF',
        ]}
        locations={[0, 0.2, 0.35, 0.5, 0.7]}
        style={styles.gradientOverlay}>
        <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <AppIcon name={icons.arrowBack} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Register</Text>
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.mainHeading}>
              Don't have an{'\n'}
              <Text style={styles.boldText}>Account? Register Now!</Text>
            </Text>

            <View style={styles.formContainer}>

              {/* First Name */}
              <TextInput
                label="First Name" mode="outlined" style={styles.input}
                outlineColor="#E0E0E0" activeOutlineColor={Colors.black}
                value={fields.firstName}
                onChangeText={t => setFields({ ...fields, firstName: t })}
                theme={{ roundness: 8 }} />
              {errors.firstName && <Text style={styles.error}>{errors.firstName}</Text>}

              {/* Last Name */}
              <TextInput
                label="Last Name" mode="outlined"
                style={[styles.input, { marginTop: hp(0.8) }]}
                outlineColor="#E0E0E0" activeOutlineColor={Colors.black}
                value={fields.lastName}
                onChangeText={t => setFields({ ...fields, lastName: t })}
                theme={{ roundness: 8 }} />
              {errors.lastName && <Text style={styles.error}>{errors.lastName}</Text>}

              {/* Email */}
              <TextInput
                label="Email Address" mode="outlined"
                style={[styles.input, { marginTop: hp(0.8) }]}
                outlineColor="#E0E0E0" activeOutlineColor={Colors.black}
                keyboardType="email-address" autoCapitalize="none"
                value={fields.email}
                onChangeText={t => setFields({ ...fields, email: t })}
                theme={{ roundness: 8 }} />
              {errors.email && <Text style={styles.error}>{errors.email}</Text>}

              {/* Password */}
              <TextInput
                label="Password" mode="outlined"
                style={[styles.input, { marginTop: hp(0.8) }]}
                outlineColor="#E0E0E0" activeOutlineColor={Colors.black}
                secureTextEntry={hidePassword}
                value={fields.password}
                onChangeText={t => setFields({ ...fields, password: t })}
                theme={{ roundness: 8 }}
                right={
                  <TextInput.Icon
                    icon={() => (
                      <AppIcon
                        name={hidePassword ? icons.eye : icons.eyeSlash}
                        height={hp(2.3)} width={hp(2.3)} />
                    )}
                    onPress={() => setHidePassword(!hidePassword)}
                    forceTextInputFocus={false} />
                } />
              {errors.password && <Text style={styles.error}>{errors.password}</Text>}

              {/* Phone */}
              <TextInput
                label="Phone Number" mode="outlined"
                style={[styles.input, { marginTop: hp(0.8) }]}
                outlineColor="#E0E0E0" activeOutlineColor={Colors.black}
                keyboardType="phone-pad"
                value={fields.phone}
                onChangeText={t => setFields({ ...fields, phone: t })}
                theme={{ roundness: 8 }} />
              {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

              {/* Role Dropdown */}
              <TouchableOpacity
                style={[
                  styles.roleInput,
                  { marginTop: hp(1.5) },
                  errors.role && styles.roleInputError,
                ]}
                onPress={handleRoleDropdownToggle}>
                <Text style={[styles.roleText, !fields.role && styles.placeholderText]}>
                  {fields.role
                    ? roleOptions.find(r => r.id === fields.role)?.name
                    : 'Select Role'}
                </Text>
                <AppIcon name={icons.arrowDown} />
              </TouchableOpacity>
              {errors.role && <Text style={styles.error}>{errors.role}</Text>}

              {showRoleDropdown && (
                <View style={styles.dropdownMenu}>
                  {roleOptions.map((role, index) => (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.dropdownItem,
                        index === roleOptions.length - 1 && styles.lastDropdownItem,
                      ]}
                      onPress={() => handleRoleSelect(role.id)}>
                      <Text style={styles.dropdownItemText}>{role.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ═══════════════════════════════════════════════════
                  CONTRACTOR ADDRESS SECTION
                  Appears only when role === 'contractor'
                  Verification is dispatched to Redux (verifyContractorAddress thunk)
              ═══════════════════════════════════════════════════ */}
              {isContractor && (
                <View style={styles.addressSection}>

                  {/* Section header */}
                  <View style={styles.addressHeader}>
                    <View style={styles.addressHeaderLine} />
                    <Text style={styles.addressHeaderText}>Business Address</Text>
                    <View style={styles.addressHeaderLine} />
                  </View>

                  <Text style={styles.addressSubtitle}>
                    Your business address must be verified before you can register.
                  </Text>

                  {/* Street */}
                  <TextInput
                    label="Street Address" mode="outlined"
                    style={[styles.input, { marginTop: hp(1) }]}
                    outlineColor={errors.street ? '#FF4444' : '#E0E0E0'}
                    activeOutlineColor={Colors.black}
                    value={address.street}
                    onChangeText={t => handleAddressChange('street', t)}
                    theme={{ roundness: 8 }}
                    placeholder="e.g. 123 Main St" />
                  {errors.street && <Text style={styles.error}>{errors.street}</Text>}

                  {/* City + State row */}
                  <View style={styles.rowFields}>
                    <View style={styles.rowFieldCity}>
                      <TextInput
                        label="City" mode="outlined" style={styles.input}
                        outlineColor={errors.city ? '#FF4444' : '#E0E0E0'}
                        activeOutlineColor={Colors.black}
                        value={address.city}
                        onChangeText={t => handleAddressChange('city', t)}
                        theme={{ roundness: 8 }} />
                      {errors.city && <Text style={styles.error}>{errors.city}</Text>}
                    </View>

                    <View style={styles.rowFieldState}>
                      <TextInput
                        label="State" mode="outlined" style={styles.input}
                        outlineColor={errors.state ? '#FF4444' : '#E0E0E0'}
                        activeOutlineColor={Colors.black}
                        value={address.state}
                        onChangeText={t => handleAddressChange('state', t)}
                        theme={{ roundness: 8 }}
                        autoCapitalize="characters"
                        maxLength={2}
                        placeholder="NY" />
                      {errors.state && <Text style={styles.error}>{errors.state}</Text>}
                    </View>
                  </View>

                  {/* Zip Code */}
                  <TextInput
                    label="Zip Code" mode="outlined"
                    style={[styles.input, { marginTop: hp(1) }]}
                    outlineColor={errors.zipcode ? '#FF4444' : '#E0E0E0'}
                    activeOutlineColor={Colors.black}
                    keyboardType="number-pad"
                    value={address.zipcode}
                    onChangeText={t => handleAddressChange('zipcode', t)}
                    theme={{ roundness: 8 }}
                    maxLength={10} />
                  {errors.zipcode && <Text style={styles.error}>{errors.zipcode}</Text>}

                  {/* Verify Button */}
                  <TouchableOpacity
                    style={[styles.verifyButton, getVerifyButtonStyle()]}
                    onPress={handleVerifyAddress}
                    disabled={verifyLoading}
                    activeOpacity={0.8}>
                    {verifyLoading ? (
                      <View style={styles.verifyLoadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.verifyButtonText}>Verifying...</Text>
                      </View>
                    ) : (
                      <Text style={styles.verifyButtonText}>{getVerifyButtonLabel()}</Text>
                    )}
                  </TouchableOpacity>

                  {/* Address-level error (local or from Redux) */}
                  {(errors.address || verifyError) ? (
                    <Text style={styles.error}>{errors.address || verifyError}</Text>
                  ) : null}

                  {/* Success banner */}
                  {verifyStatus === 'success' && (
                    <View style={styles.verifiedBanner}>
                      <Text style={styles.verifiedBannerIcon}>📍</Text>
                      <View style={styles.verifiedBannerText}>
                        <Text style={styles.verifiedBannerTitle}>Address Verified</Text>
                        <Text style={styles.verifiedBannerAddress}>{verifiedAddress}</Text>
                      </View>
                    </View>
                  )}

                  {/* Failed hint */}
                  {verifyStatus === 'failed' && (
                    <View style={styles.failedBanner}>
                      <Text style={styles.failedBannerText}>
                        ⚠️  We couldn't locate this address. Please check the details and try again.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  registrationLoading && styles.submitButtonDisabled,
                ]}
                onPress={callAPI}
                disabled={registrationLoading}>
                <Text style={styles.submitText}>
                  {registrationLoading ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>

              <View style={styles.bottomTextContainer}>
                <Text style={styles.bottomText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  imageStyle: { width: '100%', height: 931, top: -400, left: 0, opacity: 0.3 },
  gradientOverlay: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: hp(6) },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: wp(5), paddingTop: hp(6), paddingBottom: hp(1),
  },
  headerTitle: {
    fontSize: hp(2.2), fontWeight: 'bold', color: '#1F2D3D',
    marginLeft: 10, fontFamily: getFontFamily('bold'),
  },
  contentContainer: { paddingHorizontal: wp(5), paddingTop: hp(18) },
  mainHeading: {
    fontSize: hp(2.8), fontWeight: 'bold', color: Colors.black,
    lineHeight: hp(3), marginBottom: hp(2), fontFamily: getFontFamily('semiBold'),
  },
  boldText: { fontFamily: getFontFamily('bold'), color: Colors.black },
  formContainer: { width: '100%' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 8, height: hp(6), justifyContent: 'center' },
  roleInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: wp(2), paddingVertical: hp(1.5),
    backgroundColor: '#FFFFFF', minHeight: hp(6),
  },
  roleInputError: { borderColor: 'red' },
  roleText: { fontSize: hp(1.8), color: '#000', fontFamily: getFontFamily('regular') },
  placeholderText: { color: '#666' },
  dropdownMenu: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    marginTop: hp(1), backgroundColor: '#fff', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  dropdownItem: { padding: hp(1.5), borderBottomWidth: 1, borderBottomColor: '#eee' },
  lastDropdownItem: { borderBottomWidth: 0 },
  dropdownItemText: { fontSize: hp(1.8), color: '#000', fontFamily: getFontFamily('regular') },
  error: {
    color: '#FF4444', marginTop: hp(0.4), marginBottom: hp(0.3),
    fontSize: hp(1.5), fontFamily: getFontFamily('regular'),
  },

  // ── Address Section ──────────────────────────────────────────────────────────
  addressSection: {
    marginTop: hp(2), borderWidth: 1, borderColor: '#E8E8E8',
    borderRadius: 12, padding: wp(4), backgroundColor: '#FAFAFA',
  },
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.8) },
  addressHeaderLine: { flex: 1, height: 1, backgroundColor: '#D0D0D0' },
  addressHeaderText: {
    fontSize: hp(1.8), fontFamily: getFontFamily('semiBold'),
    color: '#1F2D3D', marginHorizontal: wp(2), fontWeight: '600',
  },
  addressSubtitle: {
    fontSize: hp(1.55), color: '#777', fontFamily: getFontFamily('regular'),
    marginBottom: hp(0.5), lineHeight: hp(2.2),
  },
  rowFields: { flexDirection: 'row', marginTop: hp(1), gap: wp(2) },
  rowFieldCity: { flex: 2 },
  rowFieldState: { flex: 1 },

  // ── Verify Button ────────────────────────────────────────────────────────────
  verifyButton: {
    marginTop: hp(1.5), paddingVertical: hp(1.5), borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', minHeight: hp(5.5),
  },
  verifyButtonDefault: { backgroundColor: '#1F2D3D' },
  verifyButtonSuccess: { backgroundColor: '#2E7D32' },
  verifyButtonFailed: { backgroundColor: '#C62828' },
  verifyButtonText: {
    color: '#FFFFFF', fontSize: hp(1.8),
    fontFamily: getFontFamily('medium'), fontWeight: '600',
  },
  verifyLoadingRow: { flexDirection: 'row', alignItems: 'center' },

  // ── Banners ──────────────────────────────────────────────────────────────────
  verifiedBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7',
    borderRadius: 8, padding: hp(1.2), marginTop: hp(1.2),
  },
  verifiedBannerIcon: { fontSize: hp(2), marginRight: wp(2), marginTop: 1 },
  verifiedBannerText: { flex: 1 },
  verifiedBannerTitle: {
    fontSize: hp(1.6), fontFamily: getFontFamily('semiBold'),
    color: '#1B5E20', fontWeight: '600', marginBottom: 2,
  },
  verifiedBannerAddress: {
    fontSize: hp(1.5), fontFamily: getFontFamily('regular'),
    color: '#2E7D32', lineHeight: hp(2.1),
  },
  failedBanner: {
    backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80',
    borderRadius: 8, padding: hp(1.2), marginTop: hp(1.2),
  },
  failedBannerText: {
    fontSize: hp(1.5), fontFamily: getFontFamily('regular'),
    color: '#E65100', lineHeight: hp(2.1),
  },

  // ── Submit ───────────────────────────────────────────────────────────────────
  submitButton: {
    backgroundColor: '#DAD3D3', paddingVertical: hp(1.8), borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: hp(2.5), minHeight: hp(6),
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: '#5A5A5A', fontSize: hp(2), fontFamily: getFontFamily('medium') },
  bottomTextContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: hp(1), marginBottom: hp(2),
  },
  bottomText: { fontSize: hp(1.8), color: '#6C6C6C', fontFamily: getFontFamily('regular') },
  loginLink: { fontSize: hp(1.8), color: Colors.black, fontFamily: getFontFamily('bold') },
});

export default Register;
