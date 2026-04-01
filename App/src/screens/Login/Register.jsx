import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput as RNTextInput,
      KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { TextInput } from 'react-native-paper';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, verifyContractorAddress, fetchCountries } from '../../Redux/Login/services';
import { loginDataSelectors, resetAddressVerification } from '../../Redux/Login/loginSlice';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';


const US_FALLBACK = { name: 'United States', flag: '🇺🇸', dial: '+1' };

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

  // ── Country code picker ──────────────────────────────────────────────────────
  const { loading: countriesLoading, list: countries } = useSelector(
    loginDataSelectors.getCountries
  );
  const [selectedCountry, setSelectedCountry] = useState(US_FALLBACK);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    if (countries.length <= 1) {
      dispatch(fetchCountries());
    }
  }, []);

  useEffect(() => {
    if (countries.length > 1) {
      const us = countries.find(c => c.name === 'United States') ?? US_FALLBACK;
      setSelectedCountry(us);
    }
  }, [countries]);

  const { loading: registrationLoading } = useSelector(
    loginDataSelectors.getRegistrationData
  );

  // Address verification state from Redux
  const {
    loading: verifyLoading,
    status: verifyStatus,
    lat: verifiedLat,
    lng: verifiedLng,
    fullAddress: verifiedAddress,
    error: verifyError,
  } = useSelector(loginDataSelectors.getAddressVerification);

  const isContractor = fields.role === 'contractor';
  const isVerified = verifyStatus === 'success';

  // ── useMemo: reactive boolean — re-computes on every field/address change ────
  const isFormComplete = useMemo(() => {
    const base =
      fields.firstName.trim() !== '' &&
      fields.lastName.trim() !== '' &&
      fields.email.trim() !== '' &&
      fields.password.trim() !== '' &&
      fields.phone.trim() !== '' &&
      fields.role !== '';

    if (!base) return false;
    if (fields.role === 'contractor') {
      return (
        address.street.trim() !== '' &&
        address.city.trim() !== '' &&
        address.state.trim() !== '' &&
        address.zipcode.trim() !== '' &&
        isVerified
      );
    }
    return true;
  }, [fields, address, isVerified]);

  // ─── Address helpers ────────────────────────────────────────────────────────
  const handleAddressChange = (key, value) => {
    setAddress(prev => ({ ...prev, [key]: value }));
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

    if (!fields.firstName.trim()) newErrors.firstName = 'First name required';
    if (!fields.lastName.trim()) newErrors.lastName = 'Last name required';
    if (!emailRegex.test(fields.email)) newErrors.email = 'Enter a valid email';
    if (fields.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';
    if (!fields.phone.trim() || !/^\d{6,14}$/.test(fields.phone.trim()))
      newErrors.phone = 'Enter a valid phone number (digits only)';
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
        phoneNumber: `${selectedCountry.dial}${fields.phone.trim()}`,
        role: fields.role,
        tenantId: fields.role === 'tenant' ? `tenant-${Date.now()}` : '',
        landlordId: fields.role === 'landlord' ? `landlord-${Date.now()}` : '',
        contractorId:
          fields.role === 'contractor' ? `contractor-${Date.now()}` : undefined,
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
        role: fields.role,   
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
        
     <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >

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

              {/* Phone — country code picker + local number */}
              <View style={[styles.phoneRow, { marginTop: hp(0.8) }]}>

                {/* Country code button */}
                <TouchableOpacity
                  style={[
                    styles.countryCodeBtn,
                    errors.phone && styles.countryCodeBtnError,
                  ]}
                  onPress={() => {
                    setCountrySearch('');
                    setShowCountryModal(true);
                  }}
                  activeOpacity={0.7}>
                  {countriesLoading ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <>
                      <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                      <Text style={styles.countryDial}>{selectedCountry.dial}</Text>
                      <AppIcon name={icons.arrowDown} size={hp(2.2)} />
                    </>
                  )}
                </TouchableOpacity>

                {/* Plain RN TextInput — same height as button, no floating label offset */}
                <RNTextInput
                  style={[
                    styles.phoneInput,
                    errors.phone && styles.phoneInputError,
                  ]}
                  placeholder="Phone Number"
                  placeholderTextColor="#888"
                  keyboardType="phone-pad"
                  value={fields.phone}
                  onChangeText={t => setFields({ ...fields, phone: t.replace(/[^0-9]/g, '') })}
                />
              </View>
              {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

              {/* Country Code Modal */}
              <Modal
                visible={showCountryModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCountryModal(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Country</Text>
                      <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                        <Text style={styles.modalClose}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearchWrapper}>
                      <RNTextInput
                        style={styles.modalSearchInput}
                        placeholder="Search country or code..."
                        placeholderTextColor="#999"
                        value={countrySearch}
                        onChangeText={setCountrySearch}
                        autoFocus
                      />
                    </View>

                    {countriesLoading ? (
                      <View style={styles.modalLoader}>
                        <ActivityIndicator size="large" color={Colors.black} />
                        <Text style={styles.modalLoaderText}>Loading countries...</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={countries.filter(c =>
                          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          c.dial.includes(countrySearch)
                        )}
                        keyExtractor={item => item.name}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[
                              styles.modalItem,
                              item.name === selectedCountry.name && styles.modalItemActive,
                            ]}
                            onPress={() => {
                              setSelectedCountry(item);
                              setShowCountryModal(false);
                            }}>
                            <Text style={styles.modalItemFlag}>{item.flag}</Text>
                            <Text style={styles.modalItemName}>{item.name}</Text>
                            <Text style={styles.modalItemDial}>{item.dial}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                </View>
              </Modal>

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

              {isContractor && (
                <View style={styles.addressSection}>

                  <View style={styles.addressHeader}>
                    <View style={styles.addressHeaderLine} />
                    <Text style={styles.addressHeaderText}>Business Address</Text>
                    <View style={styles.addressHeaderLine} />
                  </View>

                  <Text style={styles.addressSubtitle}>
                    Your business address must be verified before you can register.
                  </Text>

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

                  {(errors.address || verifyError) ? (
                    <Text style={styles.error}>{errors.address || verifyError}</Text>
                  ) : null}

                  {verifyStatus === 'success' && (
                    <View style={styles.verifiedBanner}>
                      <Text style={styles.verifiedBannerIcon}>📍</Text>
                      <View style={styles.verifiedBannerText}>
                        <Text style={styles.verifiedBannerTitle}>Address Verified</Text>
                        <Text style={styles.verifiedBannerAddress}>{verifiedAddress}</Text>
                      </View>
                    </View>
                  )}

                  {verifyStatus === 'failed' && (
                    <View style={styles.failedBanner}>
                      <Text style={styles.failedBannerText}>
                        ⚠️  We couldn't locate this address. Please check the details and try again.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Submit — isFormComplete is a useMemo boolean, not a function call */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: isFormComplete ? '#E53935' : '#DAD3D3' },
                  registrationLoading && styles.submitButtonDisabled,
                ]}
                onPress={callAPI}
                disabled={registrationLoading}>
                <Text style={[
                  styles.submitText,
                  { color: isFormComplete ? '#FFFFFF' : '#5A5A5A' },
                ]}>
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
       </KeyboardAvoidingView>
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
    paddingVertical: hp(1.8), borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: hp(2.5), minHeight: hp(6),
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { fontSize: hp(2), fontFamily: getFontFamily('medium') },
  bottomTextContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: hp(1), marginBottom: hp(2),
  },
  bottomText: { fontSize: hp(1.8), color: '#6C6C6C', fontFamily: getFontFamily('regular') },
  loginLink: { fontSize: hp(1.8), color: Colors.black, fontFamily: getFontFamily('bold') },

  // ── Phone row ────────────────────────────────────────────────────────────────
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  countryCodeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(1),
    height: hp(6.5),
    paddingHorizontal: wp(2.5),
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#FFFFFF', minWidth: wp(26),
  },
  countryCodeBtnError: { borderColor: '#FF4444' },
  countryFlag: {
    fontSize: hp(2.6),
    lineHeight: hp(3.2),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  countryDial: {
    fontSize: hp(1.8), color: '#000',
    fontFamily: getFontFamily('medium'),
    includeFontPadding: false,
  },
  phoneInput: {
    flex: 1,
    height: hp(6.5),
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp(3),
    fontSize: hp(1.9), color: '#000',
    fontFamily: getFontFamily('regular'),
  },
  phoneInputError: { borderColor: '#FF4444' },

  // ── Country Modal ─────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%', paddingBottom: hp(3),
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: wp(5), paddingVertical: hp(2),
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: hp(2), fontWeight: '600', color: '#1F2D3D',
    fontFamily: getFontFamily('semiBold'),
  },
  modalClose: { fontSize: hp(2.2), color: '#666', paddingHorizontal: 4 },
  modalSearchWrapper: { paddingHorizontal: wp(4), paddingVertical: hp(1.2) },
  modalSearchInput: {
    height: hp(5.2), borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: wp(3), fontSize: hp(1.8), color: '#000',
    backgroundColor: '#F8F8F8',
  },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: wp(3),
    paddingVertical: hp(1.3), paddingHorizontal: wp(5),
    borderBottomWidth: 0.5, borderBottomColor: '#F4F4F4',
  },
  modalItemActive: { backgroundColor: '#F0F4FF' },
  modalItemFlag: { fontSize: hp(2.2), width: wp(7) },
  modalItemName: {
    flex: 1, fontSize: hp(1.8), color: '#1F2D3D',
    fontFamily: getFontFamily('regular'),
  },
  modalItemDial: { fontSize: hp(1.7), color: '#666', fontFamily: getFontFamily('regular') },
  modalLoader: { alignItems: 'center', paddingVertical: hp(5), gap: 12 },
  modalLoaderText: {
    fontSize: hp(1.7), color: '#666', fontFamily: getFontFamily('regular'),
  },
});

export default Register;
