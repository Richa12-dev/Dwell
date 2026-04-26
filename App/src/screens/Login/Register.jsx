// Register.jsx — Fixed
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
  ScrollView, StatusBar, ActivityIndicator, Modal, FlatList,
  TextInput as RNTextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { TextInput } from 'react-native-paper';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, verifyContractorAddress, fetchCountries,  getPrefilledData } from '../../Redux/Login/loginservices';
import { loginDataSelectors, resetAddressVerification } from '../../Redux/Login/loginSlice';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { inviteSelectors } from '../../Redux/Invite/inviteSlice';

const US_FALLBACK = { name: 'United States', flag: '🇺🇸', dial: '+1' };

const roleOptions = [
  { id: 'tenant',     name: 'Tenant' },
  { id: 'landlord',   name: 'Landlord' },
  { id: 'contractor', name: 'Contractor' },
];

const Register = ({ navigation ,route}) => {
  const scrollRef = useRef(null);
  
const inviteToken = route?.params?.inviteToken || null;
const prefillPhone  = route?.params?.prefillPhone || '';
  const prefillRole   = route?.params?.prefillRole  || '';
 
  // Fallback: read resolvedInvite directly from Redux
  // (covers the case where the app was already open when the link was tapped)
  const resolvedInvite = useSelector(inviteSelectors.getResolvedInvite);
  const resolvedPhone  = prefillPhone || resolvedInvite?.phone || '';
  const resolvedRole   = prefillRole  || resolvedInvite?.role  || '';
 

  const [fields, setFields] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '', role: '',
  });

  const [address, setAddress] = useState({
    street: '', city: '', state: '', zipcode: '',
  });

  const [hidePassword,     setHidePassword]     = useState(true);
  const [errors,           setErrors]           = useState({});
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const dispatch = useDispatch();

  // ── Country picker ────────────────────────────────────────────────────────
  const { loading: countriesLoading, list: countries } = useSelector(loginDataSelectors.getCountries);
  const [selectedCountry, setSelectedCountry] = useState(US_FALLBACK);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch,    setCountrySearch]    = useState('');

  useEffect(() => {
    if (countries.length <= 1) dispatch(fetchCountries());
  }, []);

  useEffect(() => {
    if (countries.length > 1) {
      const us = countries.find(c => c.name === 'United States') ?? US_FALLBACK;
      setSelectedCountry(us);
    }
  }, [countries]);
  
    // ── Prefill phone & role from invite deep link ────────────────────────────
  // Data is already in route.params (set by App.jsx deep-link handler) OR
  // in Redux resolvedInvite. We just sync it into fields whenever countries load
  // so the country-code picker can match the dial code.
  useEffect(() => {
    if (!resolvedPhone) return;
 
    const digitsOnly = resolvedPhone.replace(/[\s\-()]/g, '');
    const matchedCountry = countries.find(c => c.dial && digitsOnly.startsWith(c.dial));
 
    if (matchedCountry) {
      setSelectedCountry(matchedCountry);
      const numberOnly = digitsOnly.slice(matchedCountry.dial.length);
      setFields(prev => ({ ...prev, phone: numberOnly, role: resolvedRole || prev.role }));
    } else {
      setFields(prev => ({ ...prev, phone: digitsOnly, role: resolvedRole || prev.role }));
    }
  }, [countries, resolvedPhone]);
  
  // ── Prefill phone & role from invite token ────────────────────────────────
useEffect(() => {
  const prefillFromToken = async () => {
    try {
      const resultAction = await dispatch(getPrefilledData());

      if (getPrefilledData.fulfilled.match(resultAction)) {
        const inviteData = resultAction.payload?.inviteUserData;
        if (!inviteData) return;

        const phone = inviteData.phone || '';
        const role = inviteData.role || 'tenant';

        const digitsOnly = phone.replace(/[\s\-()]/g, '');
        const matchedCountry = countries.find(c =>
          c.dial && digitsOnly.startsWith(c.dial)
        );

        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
          const numberOnly = digitsOnly.slice(matchedCountry.dial.length);
          setFields(prev => ({ ...prev, phone: numberOnly, role }));
        } else {
          setFields(prev => ({ ...prev, phone: digitsOnly, role }));
        }
      }
    } catch (err) {
      console.error('[Register] Prefill failed:', err);
    }
  };

  prefillFromToken();
}, [countries]);

  const { loading: registrationLoading } = useSelector(loginDataSelectors.getRegistrationData);

  const {
    loading:     verifyLoading,
    status:      verifyStatus,
    lat:         verifiedLat,
    lng:         verifiedLng,
    fullAddress: verifiedAddress,
    error:       verifyError,
  } = useSelector(loginDataSelectors.getAddressVerification);

  const isContractor = fields.role === 'contractor';
  const isVerified   = verifyStatus === 'success';

  const isFormComplete = useMemo(() => {
    const base =
      fields.firstName.trim() !== '' &&
      fields.lastName.trim()  !== '' &&
      fields.email.trim()     !== '' &&
      fields.password.trim()  !== '' &&
      fields.phone.trim()     !== '' &&
      fields.role             !== '';
    if (!base) return false;
    if (fields.role === 'contractor') {
      return (
        address.street.trim()  !== '' &&
        address.city.trim()    !== '' &&
        address.state.trim()   !== '' &&
        address.zipcode.trim() !== '' &&
        isVerified
      );
    }
    return true;
  }, [fields, address, isVerified]);

  const handleAddressChange = (key, value) => {
    setAddress(prev => ({ ...prev, [key]: value }));
    if (verifyStatus !== 'idle') dispatch(resetAddressVerification());
  };
  
 
  const handleVerifyAddress = async () => {
    if (!address.street.trim() || !address.city.trim()) {
      setErrors(prev => ({ ...prev, address: 'Enter at least street and city to verify' }));
      return;
    }
    setErrors(prev => ({ ...prev, address: '' }));
    try {
    const res = await dispatch(verifyContractorAddress(address)).unwrap();

    console.log("✅ Verify Address Success:", res);
    // 🔥 Autofill correct address from Google
    setAddress(prev => ({
      ...prev,
      street: res.street || prev.street,
      city: res.city || prev.city,
      state: res.state || prev.state,
      zipcode: res.postalCode || prev.zipcode,
    }));

  } catch (err) {
    console.log("❌ Verify Address Error:", err);
  }
  };

  const validateFields = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!fields.firstName.trim()) newErrors.firstName = 'First name required';
    if (!fields.lastName.trim())  newErrors.lastName  = 'Last name required';
    if (!emailRegex.test(fields.email)) newErrors.email = 'Enter a valid email';
    if (fields.password.length < 8)     newErrors.password = 'Password must be at least 8 characters';
    if (!fields.phone.trim() || !/^\d{6,14}$/.test(fields.phone.trim()))
      newErrors.phone = 'Enter a valid phone number (digits only)';
    if (!fields.role) newErrors.role = 'Select a role';
    if (isContractor) {
      if (!address.street.trim())  newErrors.street  = 'Street address required';
      if (!address.city.trim())    newErrors.city    = 'City required';
      if (!address.state.trim())   newErrors.state   = 'State required';
      if (!address.zipcode.trim()) newErrors.zipcode = 'Zip code required';
      if (!isVerified)             newErrors.address = 'Please verify your address before submitting';
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
      // ✅ Matches Node.js /auth/register exactly — no fake IDs
      const userData = {
        email:       fields.email.trim(),
        password:    fields.password,
        firstName:   fields.firstName.trim(),
        lastName:    fields.lastName.trim(),
        phoneNumber: `${selectedCountry.dial}${fields.phone.trim()}`, // service maps to `phone`
        role:        fields.role,
        // ✅ Pass inviteToken so backend can link property-tenant record on register
        ...(inviteToken && { inviteToken }),
        ...(isContractor && {
          address: {
            street:      address.street.trim(),
            city:        address.city.trim(),
            state:       address.state.trim(),
            zipcode:     address.zipcode.trim(),
            fullAddress: verifiedAddress,
            lat:         verifiedLat,
            lng:         verifiedLng,
          },
        }),
      };

      await dispatch(registerUser(userData)).unwrap();
      navigation.navigate('OtpScreen', {
        email: fields.email.trim(),
        phone: selectedCountry.dial + fields.phone,
        role:  fields.role,
        inviteToken, 
      });
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleRoleSelect = (role) => {
    setFields(prev => ({ ...prev, role: role.id }));
    setShowRoleDropdown(false);
    if (errors.role) setErrors(prev => ({ ...prev, role: '' }));
    if (role.id !== 'contractor') dispatch(resetAddressVerification());
  };

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q));
  }, [countries, countrySearch]);

  const selectedRoleLabel = roleOptions.find(r => r.id === fields.role)?.name || '';

  const verifyButtonStyle = [
    styles.verifyButton,
    verifyStatus === 'success' ? styles.verifyButtonSuccess
    : verifyStatus === 'failed' ? styles.verifyButtonFailed
    : styles.verifyButtonDefault,
  ];

  return (
    <ImageBackground
      source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
      style={styles.backgroundImage}
      imageStyle={styles.imageStyle}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(254,249,246,0.1)', '#F5F3F2']}
        locations={[0.3453, 0.7113]}
        style={styles.gradientOverlay}
      >
        <StatusBar backgroundColor={Colors.black} barStyle="dark-content" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <AppIcon name={icons.arrowBack} size={24} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Account</Text>
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.mainHeading}>
                Create your{'\n'}
                <Text style={styles.boldText}>New Account</Text>
              </Text>

              <View style={styles.formContainer}>

                {/* First Name */}
                <TextInput
                  label="First Name"
                  mode="outlined"
                  value={fields.firstName}
                  onChangeText={v => setFields(p => ({ ...p, firstName: v }))}
                  style={styles.input}
                  outlineColor={errors.firstName ? 'red' : '#E0E0E0'}
                  activeOutlineColor={Colors.black}
                  theme={{ roundness: 8 }}
                />
                {errors.firstName ? <Text style={styles.error}>{errors.firstName}</Text> : null}

                {/* Last Name */}
                <TextInput
                  label="Last Name"
                  mode="outlined"
                  value={fields.lastName}
                  onChangeText={v => setFields(p => ({ ...p, lastName: v }))}
                  style={[styles.input, { marginTop: hp(1.5) }]}
                  outlineColor={errors.lastName ? 'red' : '#E0E0E0'}
                  activeOutlineColor={Colors.black}
                  theme={{ roundness: 8 }}
                />
                {errors.lastName ? <Text style={styles.error}>{errors.lastName}</Text> : null}

                {/* Email */}
                <TextInput
                  label="Email Address"
                  mode="outlined"
                  value={fields.email}
                  onChangeText={v => setFields(p => ({ ...p, email: v }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { marginTop: hp(1.5) }]}
                  outlineColor={errors.email ? 'red' : '#E0E0E0'}
                  activeOutlineColor={Colors.black}
                  theme={{ roundness: 8 }}
                  left={<TextInput.Icon icon={() => <AppIcon name={icons.email} height={hp(2.3)} width={hp(2.3)} />} />}
                />
                {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

                {/* Password */}
                <TextInput
                  label="Password"
                  mode="outlined"
                  value={fields.password}
                  onChangeText={v => setFields(p => ({ ...p, password: v }))}
                  secureTextEntry={hidePassword}
                  style={[styles.input, { marginTop: hp(1.5) }]}
                  outlineColor={errors.password ? 'red' : '#E0E0E0'}
                  activeOutlineColor={Colors.black}
                  theme={{ roundness: 8 }}
                  left={<TextInput.Icon icon={() => <AppIcon name={icons.password} height={hp(2.3)} width={hp(2.3)} />} />}
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <AppIcon
                          name={hidePassword ? icons.eye : icons.eyeSlash}
                          height={hp(2.3)} width={hp(2.3)}
                        />
                      )}
                      onPress={() => setHidePassword(p => !p)}
                      forceTextInputFocus={false}
                    />
                  }
                />
                {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

                {/* Phone + Country code */}
                <View style={[styles.phoneRow, { marginTop: hp(1.5) }]}>
                  {/* ✅ FIX: plain Text chevron — no AppIcon needed here */}
                  <TouchableOpacity
                    style={[styles.countryCodeBtn, errors.phone && styles.countryCodeBtnError]}
                    onPress={() => {
                    if (inviteToken) return;
                    setCountrySearch('');
                    setShowCountryModal(true); }}
                  >
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryDial}>{selectedCountry.dial}</Text>
                    <Text style={styles.chevron}>▼</Text>
                  </TouchableOpacity>
                  <RNTextInput
                    style={[styles.phoneInput, errors.phone && styles.phoneInputError]}
                    placeholder="Phone number"
                    placeholderTextColor="#999"
                    value={fields.phone}
                    onChangeText={v => setFields(p => ({ ...p, phone: v.replace(/\D/g, '') }))}
                    keyboardType="phone-pad"
                    maxLength={14}
                    editable={!inviteToken}
                  />
                </View>
                {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}

                {/* Role Dropdown */}
                {/* ✅ FIX: plain Text chevron — no AppIcon needed here */}
                <View style={{ marginTop: hp(1.5) }}>
                  <TouchableOpacity
                    style={[styles.roleInput, errors.role && styles.roleInputError]}
                    onPress={() => {
                  if (inviteToken) return;
                  setShowRoleDropdown(p => !p);
                    }}
                  >
                    <Text style={[styles.roleText, !fields.role && styles.placeholderText]}>
                      {selectedRoleLabel || 'Select Role'}
                    </Text>
                    <Text style={styles.chevron}>{showRoleDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showRoleDropdown && (
                    <View style={styles.dropdownMenu}>
                      {roleOptions.map((role, idx) => (
                        <TouchableOpacity
                          key={role.id}
                          style={[styles.dropdownItem, idx === roleOptions.length - 1 && styles.lastDropdownItem]}
                          onPress={() => handleRoleSelect(role)}
                        >
                          <Text style={styles.dropdownItemText}>{role.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {errors.role ? <Text style={styles.error}>{errors.role}</Text> : null}
                </View>

                {/* Contractor Address Section */}
                {isContractor && (
                  <View style={styles.addressSection}>
                    <View style={styles.addressHeader}>
                      <View style={styles.addressHeaderLine} />
                      <Text style={styles.addressHeaderText}>Service Address</Text>
                      <View style={styles.addressHeaderLine} />
                    </View>
                    <Text style={styles.addressSubtitle}>
                      Your business address for contractor verification
                    </Text>

                    <TextInput
                      label="Street Address"
                      mode="outlined"
                      value={address.street}
                      onChangeText={v => handleAddressChange('street', v)}
                      style={styles.input}
                      outlineColor={errors.street ? 'red' : '#E0E0E0'}
                      activeOutlineColor={Colors.black}
                      theme={{ roundness: 8 }}
                    />
                    {errors.street ? <Text style={styles.error}>{errors.street}</Text> : null}

                    <View style={styles.rowFields}>
                      <View style={styles.rowFieldCity}>
                        <TextInput
                          label="City"
                          mode="outlined"
                          value={address.city}
                          onChangeText={v => handleAddressChange('city', v)}
                          style={styles.input}
                          outlineColor={errors.city ? 'red' : '#E0E0E0'}
                          activeOutlineColor={Colors.black}
                          theme={{ roundness: 8 }}
                        />
                        {errors.city ? <Text style={styles.error}>{errors.city}</Text> : null}
                      </View>
                      <View style={styles.rowFieldState}>
                        <TextInput
                          label="State"
                          mode="outlined"
                          value={address.state}
                          onChangeText={v => handleAddressChange('state', v)}
                          style={styles.input}
                          outlineColor={errors.state ? 'red' : '#E0E0E0'}
                          activeOutlineColor={Colors.black}
                          theme={{ roundness: 8 }}
                        />
                        {errors.state ? <Text style={styles.error}>{errors.state}</Text> : null}
                      </View>
                    </View>

                    <TextInput
                      label="Zip Code"
                      mode="outlined"
                      value={address.zipcode}
                      onChangeText={v => handleAddressChange('zipcode', v)}
                      keyboardType="numeric"
                      style={[styles.input, { marginTop: hp(1) }]}
                      outlineColor={errors.zipcode ? 'red' : '#E0E0E0'}
                      activeOutlineColor={Colors.black}
                      theme={{ roundness: 8 }}
                    />
                    {errors.zipcode ? <Text style={styles.error}>{errors.zipcode}</Text> : null}

                    <TouchableOpacity
                      style={verifyButtonStyle}
                      onPress={handleVerifyAddress}
                      disabled={verifyLoading}
                    >
                      {verifyLoading ? (
                        <View style={styles.verifyLoadingRow}>
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.verifyButtonText}>Verifying...</Text>
                        </View>
                      ) : (
                        <Text style={styles.verifyButtonText}>
                          {verifyStatus === 'success' ? '✓ Address Verified'
                           : verifyStatus === 'failed' ? '✗ Retry Verification'
                           : 'Verify Address'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {verifyStatus === 'success' && (
                      <View style={styles.verifiedBanner}>
                        <Text style={styles.verifiedBannerIcon}>✓</Text>
                        <View style={styles.verifiedBannerText}>
                          <Text style={styles.verifiedBannerTitle}>Address Verified</Text>
                          <Text style={styles.verifiedBannerAddress}>{verifiedAddress}</Text>
                        </View>
                      </View>
                    )}
                    {verifyStatus === 'failed' && verifyError && (
                      <View style={styles.failedBanner}>
                        <Text style={styles.failedBannerText}>{verifyError}</Text>
                      </View>
                    )}
                    {errors.address ? <Text style={[styles.error, { marginTop: hp(0.5) }]}>{errors.address}</Text> : null}
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { backgroundColor: isFormComplete ? '#E53935' : '#DAD4D4' },
                    registrationLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={callAPI}
                  disabled={registrationLoading}
                >
                  <Text style={[styles.submitText, { color: isFormComplete ? '#FFFFFF' : '#5A5A5A' }]}>
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

        {/* Country Picker Modal */}
        <Modal
          visible={showCountryModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCountryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country Code</Text>
                <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalSearchWrapper}>
                <RNTextInput
                  style={styles.modalSearchInput}
                  placeholder="Search country..."
                  placeholderTextColor="#999"
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />
              </View>
              {countriesLoading ? (
                <View style={styles.modalLoader}>
                  <ActivityIndicator size="large" color={Colors.black} />
                  <Text style={styles.modalLoaderText}>Loading countries...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item, idx) => `${item.name}-${idx}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        item.name === selectedCountry.name && styles.modalItemActive,
                      ]}
                      onPress={() => { setSelectedCountry(item); setShowCountryModal(false); }}
                    >
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

      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  imageStyle:      { width: '100%', height: 931, top: -400, left: 0, opacity: 0.3 },
  gradientOverlay: { flex: 1 },
  scrollView:      { flex: 1 },
  scrollContent:   { flexGrow: 1, paddingBottom: hp(6) },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: wp(5), paddingTop: hp(6), paddingBottom: hp(1),
  },
  headerTitle: {
    fontSize: hp(2.2), fontWeight: 'bold', color: '#1F2D3D',
    marginLeft: 10, fontFamily: getFontFamily('bold'),
  },
  contentContainer: { paddingHorizontal: wp(5), paddingTop: hp(3) },
  mainHeading: {
    fontSize: hp(2.8), fontWeight: 'bold', color: Colors.black,
    lineHeight: hp(3.5), marginBottom: hp(2), fontFamily: getFontFamily('semiBold'),
  },
  boldText:      { fontFamily: getFontFamily('bold'), color: Colors.black },
  formContainer: { width: '100%' },
  input:         { backgroundColor: '#FFFFFF', borderRadius: 8, height: hp(6), justifyContent: 'center' },
  error:         { color: '#FF4444', marginTop: hp(0.4), marginBottom: hp(0.3), fontSize: hp(1.5), fontFamily: getFontFamily('regular') },
  roleInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: wp(3), paddingVertical: hp(1.5),
    backgroundColor: '#FFFFFF', minHeight: hp(6),
  },
  roleInputError:    { borderColor: 'red' },
  roleText:          { fontSize: hp(1.8), color: '#000', fontFamily: getFontFamily('regular') },
  placeholderText:   { color: '#999' },
  // ✅ Plain text chevron style — safe, no icon dependency
  chevron:           { fontSize: hp(1.6), color: '#666' },
  dropdownMenu: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    marginTop: hp(0.5), backgroundColor: '#fff', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, zIndex: 999,
  },
  dropdownItem:     { padding: hp(1.5), borderBottomWidth: 1, borderBottomColor: '#eee' },
  lastDropdownItem: { borderBottomWidth: 0 },
  dropdownItemText: { fontSize: hp(1.8), color: '#000', fontFamily: getFontFamily('regular') },
  addressSection: {
    marginTop: hp(2), borderWidth: 1, borderColor: '#E8E8E8',
    borderRadius: 12, padding: wp(4), backgroundColor: '#FAFAFA',
  },
  addressHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.8) },
  addressHeaderLine: { flex: 1, height: 1, backgroundColor: '#D0D0D0' },
  addressHeaderText: { fontSize: hp(1.8), fontFamily: getFontFamily('semiBold'), color: '#1F2D3D', marginHorizontal: wp(2), fontWeight: '600' },
  addressSubtitle:   { fontSize: hp(1.55), color: '#777', fontFamily: getFontFamily('regular'), marginBottom: hp(0.5), lineHeight: hp(2.2) },
  rowFields:         { flexDirection: 'row', marginTop: hp(1), gap: wp(2) },
  rowFieldCity:      { flex: 2 },
  rowFieldState:     { flex: 1 },
  verifyButton:      { marginTop: hp(1.5), paddingVertical: hp(1.5), borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: hp(5.5) },
  verifyButtonDefault: { backgroundColor: '#1F2D3D' },
  verifyButtonSuccess: { backgroundColor: '#2E7D32' },
  verifyButtonFailed:  { backgroundColor: '#C62828' },
  verifyButtonText:    { color: '#FFFFFF', fontSize: hp(1.8), fontFamily: getFontFamily('medium'), fontWeight: '600' },
  verifyLoadingRow:    { flexDirection: 'row', alignItems: 'center' },
  verifiedBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7',
    borderRadius: 8, padding: hp(1.2), marginTop: hp(1.2),
  },
  verifiedBannerIcon:    { fontSize: hp(2), marginRight: wp(2), marginTop: 1 },
  verifiedBannerText:    { flex: 1 },
  verifiedBannerTitle:   { fontSize: hp(1.6), fontFamily: getFontFamily('semiBold'), color: '#1B5E20', fontWeight: '600', marginBottom: 2 },
  verifiedBannerAddress: { fontSize: hp(1.5), fontFamily: getFontFamily('regular'), color: '#2E7D32', lineHeight: hp(2.1) },
  failedBanner:     { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80', borderRadius: 8, padding: hp(1.2), marginTop: hp(1.2) },
  failedBannerText: { fontSize: hp(1.5), fontFamily: getFontFamily('regular'), color: '#E65100', lineHeight: hp(2.1) },
  submitButton:         { paddingVertical: hp(1.8), borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: hp(2.5), minHeight: hp(6) },
  submitButtonDisabled: { opacity: 0.7 },
  submitText:           { fontSize: hp(2), fontFamily: getFontFamily('medium') },
  bottomTextContainer:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: hp(1), marginBottom: hp(2) },
  bottomText:           { fontSize: hp(1.8), color: '#6C6C6C', fontFamily: getFontFamily('regular') },
  loginLink:            { fontSize: hp(1.8), color: Colors.black, fontFamily: getFontFamily('bold') },
  phoneRow:             { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  countryCodeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(1),
    height: hp(6.5), paddingHorizontal: wp(2.5),
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#FFFFFF', minWidth: wp(26),
  },
  countryCodeBtnError: { borderColor: '#FF4444' },
  countryFlag:         { fontSize: hp(2.6), lineHeight: hp(3.2), includeFontPadding: false, textAlignVertical: 'center' },
  countryDial:         { fontSize: hp(1.8), color: '#000', fontFamily: getFontFamily('medium'), includeFontPadding: false },
  phoneInput: {
    flex: 1, height: hp(6.5),
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#FFFFFF', paddingHorizontal: wp(3),
    fontSize: hp(1.9), color: '#000', fontFamily: getFontFamily('regular'),
  },
  phoneInputError: { borderColor: '#FF4444' },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer:  { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: hp(3) },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: wp(5), paddingVertical: hp(2), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle:      { fontSize: hp(2), fontWeight: '600', color: '#1F2D3D', fontFamily: getFontFamily('semiBold') },
  modalClose:      { fontSize: hp(2.2), color: '#666', paddingHorizontal: 4 },
  modalSearchWrapper: { paddingHorizontal: wp(4), paddingVertical: hp(1.2) },
  modalSearchInput:   { height: hp(5.2), borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: wp(3), fontSize: hp(1.8), color: '#000', backgroundColor: '#F8F8F8' },
  modalItem:       { flexDirection: 'row', alignItems: 'center', gap: wp(3), paddingVertical: hp(1.3), paddingHorizontal: wp(5), borderBottomWidth: 0.5, borderBottomColor: '#F4F4F4' },
  modalItemActive: { backgroundColor: '#F0F4FF' },
  modalItemFlag:   { fontSize: hp(2.2), width: wp(7) },
  modalItemName:   { flex: 1, fontSize: hp(1.8), color: '#1F2D3D', fontFamily: getFontFamily('regular') },
  modalItemDial:   { fontSize: hp(1.7), color: '#666', fontFamily: getFontFamily('regular') },
  modalLoader:     { alignItems: 'center', paddingVertical: hp(5), gap: 12 },
  modalLoaderText: { fontSize: hp(1.7), color: '#666', fontFamily: getFontFamily('regular') },
});

export default Register;
