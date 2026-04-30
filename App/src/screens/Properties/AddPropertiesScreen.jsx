import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from "react-native";
import { TextInput } from "react-native-paper";
import { useDispatch, useSelector } from 'react-redux';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";
import { createProperty, updateProperty, geocodeAddress, getLandlordProperties } from '../../Redux/Properties/servicesNode';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import AddressAutoComplete from '../../components/AddressAutoComplete/AddressAutoComplete';


// ─────────────────────────────────────────────────────────────
// Helper: extract images from a property object (edit mode)
// ─────────────────────────────────────────────────────────────
const extractImagesFromProperty = (property) => {
  if (!property) return [];
  const urls = property.images || property.image_urls || property.photos || [];
  return Array.isArray(urls) ? urls.filter(Boolean) : [];
};

// ─────────────────────────────────────────────────────────────
// Initial form state
// ─────────────────────────────────────────────────────────────
const initialForm = {
  name: "", description: "", images: [],
  street: "", city: "", state: "", zip_code: "",
  property_type: "Apartment", bedrooms: "2", bathrooms: "1",
  area_sqft: "", year_built: "", monthly_rent: "", security_deposit: "",
  amenities: {
    furnished: false, parking: false, elevator: false, ac: false,
    gym: false, pool: false, washer_dryer: false, dishwasher: false,
    fireplace: false, hardwood_floors: false, high_ceilings: false,
    smart_thermostat: false, cable_ready: false, refrigerator: false,
    microwave: false, garbage_disposal: false, stainless_appliances: false,
    high_speed_internet: false, smart_locks: false, video_doorbell: false,
    keyless_entry: false, garage: false, covered_parking: false,
    ev_charging: false, pet_friendly: false, cats_allowed: false,
    dogs_allowed: false, clubhouse: false, business_center: false,
    package_receiving: false, controlled_access: false, balcony: false,
    bbq_area: false, dog_park: false, playground: false,
    security_system: false, cctv: false, on_site_maintenance: false,
    trash_pickup: false, short_term_lease: false, wheelchair_access: false,
    ada_compliant: false,
  },
  availability_status: "Available",
  tenantName: "", tenantPhone: "",
};

// ═════════════════════════════════════════════════════════════
// Upload Progress Overlay
// Shows while images are being uploaded to S3.
// Switches label to "Saving property..." during the API call.
// ═════════════════════════════════════════════════════════════
const UploadProgressOverlay = memo(({ visible, current, total, isSubmitting }) => {
  if (!visible) return null;

  const pct   = total > 0 ? Math.round((current / total) * 100) : 0;
  const label = isSubmitting
    ? 'Saving property...'
    : total > 0
    ? `Uploading image ${current} of ${total}`
    : 'Preparing...';

  return (
    <View style={ol.overlay}>
      <View style={ol.card}>
        <ActivityIndicator size="large" color={Colors.red} />
        <Text style={ol.title}>Please Wait</Text>
        <Text style={ol.label}>{label}</Text>
        <View style={ol.barTrack}>
          <View style={[ol.barFill, { width: `${Math.min(isSubmitting ? 100 : pct, 100)}%` }]} />
        </View>
        {!isSubmitting && <Text style={ol.pct}>{pct}%</Text>}
        <Text style={ol.hint}>Do not close the app</Text>
      </View>
    </View>
  );
});

// ═════════════════════════════════════════════════════════════
// STEP 1 — Basic info, images, address
// ═════════════════════════════════════════════════════════════
const Step1 = memo(({
  form, errors, handleChange,
  pickImages, removeImage,
  onNext, verifyingAddress, verifiedAddress,
}) => (
  <View style={styles.stepContainer}>
    {/* Property Name */}
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppIcon name={icons.redProperties} size={hp(2.5)} />
        <Text style={styles.label}>Property Name</Text>
      </View>
      <TextInput
        mode="outlined" placeholder="Enter Property Name"
        value={form.name} onChangeText={(t) => handleChange("name", t)}
        style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.red}
        error={!!errors.name}
      />
      {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
    </View>

    {/* Description */}
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppIcon name={icons.progresses} size={hp(2.5)} />
        <Text style={styles.label}>Description</Text>
      </View>
      <TextInput
        mode="outlined" placeholder="Enter the Property Description"
        value={form.description} onChangeText={(t) => handleChange("description", t)}
        multiline numberOfLines={4} style={[styles.input, { height: hp(12) }]}
        outlineColor={Colors.border} activeOutlineColor={Colors.red}
      />
    </View>

    {/* Property Images */}
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppIcon name={icons.photos} size={hp(2.5)} />
        <Text style={styles.label}>Property Images ({form.images.length}/9)</Text>
      </View>

      {form.images.length > 0 && (
        <View style={styles.imageGrid}>
          {form.images.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.propertyImage} resizeMode="cover" />
              {/* "NEW" badge on local images not yet uploaded */}
              {!uri.startsWith('http') && (
                <View style={styles.localBadge}>
                  <Text style={styles.localBadgeText}>NEW</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => removeImage(idx)}
                style={styles.removeImageBtn}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <AppIcon name={icons.close} size={hp(1.5)} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.addImageBtn, form.images.length >= 9 && { opacity: 0.4 }]}
        onPress={pickImages}
        disabled={form.images.length >= 9}
      >
        <AppIcon name={icons.photo} size={hp(2.5)} color={Colors.black} />
        <Text style={styles.addImageText}>
          {form.images.length >= 9 ? 'Max 9 images reached' : 'Add Images'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Address */}
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppIcon name={icons.location} size={hp(2.5)} />
        <Text style={styles.label}>Address Information</Text>
      </View>
      
      <AddressAutoComplete
        value={{
          street:   form.street,
          city:     form.city,
          state:    form.state,
          zip_code: form.zip_code,
        }}
        onChange={({ street, city, state, zip_code }) => {
          handleChange('street',   street);
          handleChange('city',     city);
          handleChange('state',    state);
          handleChange('zip_code', zip_code);
        }}
        errors={{
          street: errors.street,
          city:   errors.city,
          state:  errors.state,
        }}
      />
      
 </View>
   

    

    {verifiedAddress ? (
      <View style={styles.verifiedBadge}>
        <AppIcon name={icons.ok} size={hp(2)} color="green" />
        <Text style={styles.verifiedText} numberOfLines={1}>{verifiedAddress}</Text>
      </View>
    ) : null}

    <TouchableOpacity
      style={[styles.nextButton, verifyingAddress && { opacity: 0.6 }]}
      onPress={onNext} disabled={verifyingAddress}
    >
      {verifyingAddress
        ? <ActivityIndicator size="small" color="white" style={{ marginRight: wp(2) }} />
        : null}
      <Text style={styles.nextButtonText}>
        {verifyingAddress ? 'Verifying Address...' : 'Property Type & Pricing'}
      </Text>
      {!verifyingAddress && (
        <AppIcon name={icons.arrowBack} size={hp(2)} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
      )}
    </TouchableOpacity>
  </View>
));

// ═════════════════════════════════════════════════════════════
// STEP 2 — Type, specs, pricing
// ═════════════════════════════════════════════════════════════
const Step2 = memo(({
  form, errors, handleChange, onNext, onBack,
  setPropertyTypeModal, setBedroomsModal, setBathroomsModal,
}) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepSubtitle}>Edit Property Types and Pricing Details</Text>
    <View style={styles.glassContainer}>
      <View style={styles.fieldContainer}>
        <Text style={styles.subLabel}>Property Type</Text>
        <TouchableOpacity style={styles.dropdownBox} onPress={() => setPropertyTypeModal(true)}>
          <Text style={styles.dropdownText}>{form.property_type}</Text>
          <AppIcon name={icons.arrowDown} size={hp(2)} color={Colors.placeholder} />
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>Bedrooms</Text>
          <TouchableOpacity style={styles.dropdownBox} onPress={() => setBedroomsModal(true)}>
            <Text style={[styles.dropdownText, !form.bedrooms && styles.placeholderText]}>
             {`${form.bedrooms} BHK`}
            </Text>
            <AppIcon name={icons.arrowDown} size={hp(2)} color={Colors.placeholder} />
          </TouchableOpacity>
          {errors.bedrooms ? <Text style={styles.errorText}>{errors.bedrooms}</Text> : null}
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>Bathrooms</Text>
          <TouchableOpacity style={styles.dropdownBox} onPress={() => setBathroomsModal(true)}>
            <Text style={[styles.dropdownText, !form.bathrooms && styles.placeholderText]}>
              {form.bathrooms || "1"}
            </Text>
            <AppIcon name={icons.arrowDown} size={hp(2)} color={Colors.placeholder} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>Area (Sq. ft)</Text>
          <TextInput
            mode="outlined" placeholder="2000" keyboardType="numeric"
            value={form.area_sqft} onChangeText={(t) => handleChange("area_sqft", t)}
            style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.red}
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>Year Built</Text>
          <TextInput
            mode="outlined" placeholder="2018" keyboardType="numeric"
            value={form.year_built} onChangeText={(t) => handleChange("year_built", t)}
            style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.red}
          />
        </View>
      </View>
    </View>

    <View style={styles.glassContainer}>
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <AppIcon name={icons.dollar} size={hp(2.5)} />
          <Text style={styles.label}>Pricing</Text>
        </View>
        <Text style={styles.subLabel}>Monthly Rent ($)</Text>
        <TextInput
          mode="outlined" placeholder="2600" keyboardType="numeric"
          value={form.monthly_rent} onChangeText={(t) => handleChange("monthly_rent", t)}
          style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.red}
          error={!!errors.monthly_rent}
        />
        {errors.monthly_rent ? <Text style={styles.errorText}>{errors.monthly_rent}</Text> : null}
        <Text style={styles.subLabel}>Security Deposit ($)</Text>
        <TextInput
          mode="outlined" placeholder="20000" keyboardType="numeric"
          value={form.security_deposit} onChangeText={(t) => handleChange("security_deposit", t)}
          style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.red}
        
        />
      </View>
    </View>

    <View style={styles.buttonRow}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <AppIcon name={icons.arrowBack} size={hp(2)} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.nextButtonFlex} onPress={onNext}>
        <Text style={styles.nextButtonText}>Amenities & Availability</Text>
        <AppIcon name={icons.arrowBack} size={hp(2)} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
      </TouchableOpacity>
    </View>
  </View>
));

// ═════════════════════════════════════════════════════════════
// STEP 3 — Amenities, availability, tenant invite, submit
// ═════════════════════════════════════════════════════════════
const Step3 = memo(({
  form, errors, handleChange, toggleAmenity, onBack,
  handleFinish, loading, setStatusModal, isEdit,
}) => {
  const amenitiesList = [
    { label: "Furnished",            icon: icons.furnished,     key: "furnished" },
    { label: "Parking",              icon: icons.parking,       key: "parking" },
    { label: "Elevator",             icon: icons.elevator,      key: "elevator" },
    { label: "AC / HVAC",            icon: icons.hvac,          key: "ac" },
    { label: "Gym",                  icon: icons.gym,           key: "gym" },
    { label: "Pool",                 icon: icons.pool,          key: "pool" },
    { label: "Washer/Dryer",         icon: icons.appliances,    key: "washer_dryer" },
    { label: "Dishwasher",           icon: icons.appliances,    key: "dishwasher" },
    { label: "Fireplace",            icon: icons.hvac,          key: "fireplace" },
    { label: "Hardwood Floors",      icon: icons.furnished,     key: "hardwood_floors" },
    { label: "High Ceilings",        icon: icons.furnished,     key: "high_ceilings" },
    { label: "Smart Thermostat",     icon: icons.electrical,    key: "smart_thermostat" },
    { label: "Cable Ready",          icon: icons.electrical,    key: "cable_ready" },
    { label: "Refrigerator",         icon: icons.appliances,    key: "refrigerator" },
    { label: "Microwave",            icon: icons.appliances,    key: "microwave" },
    { label: "Garbage Disposal",     icon: icons.plumbing,      key: "garbage_disposal" },
    { label: "Stainless Appliances", icon: icons.appliances,    key: "stainless_appliances" },
    { label: "High-Speed Internet",  icon: icons.electrical,    key: "high_speed_internet" },
    { label: "Smart Locks",          icon: icons.electrical,    key: "smart_locks" },
    { label: "Video Doorbell",       icon: icons.electrical,    key: "video_doorbell" },
    { label: "Keyless Entry",        icon: icons.electrical,    key: "keyless_entry" },
    { label: "Garage",               icon: icons.parking,       key: "garage" },
    { label: "Covered Parking",      icon: icons.parking,       key: "covered_parking" },
    { label: "EV Charging",          icon: icons.electrical,    key: "ev_charging" },
    { label: "Pet Friendly",         icon: icons.petFriendly,   key: "pet_friendly" },
    { label: "Cats Allowed",         icon: icons.petFriendly,   key: "cats_allowed" },
    { label: "Dogs Allowed",         icon: icons.petFriendly,   key: "dogs_allowed" },
    { label: "Clubhouse",            icon: icons.furnished,     key: "clubhouse" },
    { label: "Business Center",      icon: icons.furnished,     key: "business_center" },
    { label: "Package Receiving",    icon: icons.furnished,     key: "package_receiving" },
    { label: "Controlled Access",    icon: icons.furnished,     key: "controlled_access" },
    { label: "Balcony / Patio",      icon: icons.landscaping,   key: "balcony" },
    { label: "BBQ / Grill Area",     icon: icons.landscaping,   key: "bbq_area" },
    { label: "Dog Park",             icon: icons.landscaping,   key: "dog_park" },
    { label: "Playground",           icon: icons.landscaping,   key: "playground" },
    { label: "Security System",      icon: icons.security,      key: "security_system" },
    { label: "CCTV",                 icon: icons.security,      key: "cctv" },
    { label: "On-site Maintenance",  icon: icons.furnished,     key: "on_site_maintenance" },
    { label: "Trash Pickup",         icon: icons.cleaning,      key: "trash_pickup" },
    { label: "Short-Term Lease",     icon: icons.furnished,     key: "short_term_lease" },
    { label: "Wheelchair Access",    icon: icons.accessibility, key: "wheelchair_access" },
    { label: "ADA Compliant",        icon: icons.furnished,     key: "ada_compliant" },
  ];

  const isOccupied = form.availability_status !== 'Available';

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Amenities</Text>
      <Text style={styles.stepSubtitle}>Edit Amenities and Property Availability Status</Text>

      <View style={styles.amenitiesGrid}>
        {amenitiesList.map(({ label, key, icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.amenityChip, form.amenities[key] && styles.amenityChipActive]}
            onPress={() => toggleAmenity(key)}
          >
            {form.amenities[key] && (
              <View style={styles.amenityCheckmark}>
                <AppIcon name={icons.ok} size={hp(1.5)} color="white" />
              </View>
            )}
            <AppIcon name={icon} size={hp(3.2)} color={form.amenities[key] ? Colors.red : Colors.placeholder} />
            <Text style={[styles.amenityLabel, form.amenities[key] && styles.amenityLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <AppIcon name={icons.persons} size={hp(2.5)} />
          <Text style={styles.label}>Availability Status</Text>
        </View>
        <Text style={styles.subLabel}>Status</Text>
        <TouchableOpacity style={styles.dropdownBox} onPress={() => setStatusModal(true)}>
          <Text style={styles.dropdownText}>{form.availability_status}</Text>
          <AppIcon name={icons.arrowDown} size={hp(2)} color={Colors.placeholder} />
        </TouchableOpacity>
      </View>

      {isOccupied && (
        <View style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <AppIcon name={icons.person} size={hp(2.5)} />
            <Text style={styles.label}>Invite Tenant</Text>
          </View>
          {form.tenantPhone?.trim() ? (
            <View style={styles.inviteSentBanner}>
              <AppIcon name={icons.ok} size={hp(2)} color="green" />
              <Text style={styles.inviteSentText}>
                An invite SMS will be sent to this number when you save the property.
              </Text>
            </View>
          ) : null}
          <Text style={styles.subLabel}>Tenant Name</Text>
          <TextInput
            mode="outlined" placeholder="Full name of tenant"
            value={form.tenantName} onChangeText={(t) => handleChange('tenantName', t)}
            style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.red}
            error={!!errors.tenantName}
          />
          {errors.tenantName ? <Text style={styles.errorText}>{errors.tenantName}</Text> : null}
          <Text style={styles.subLabel}>Tenant Phone Number(with country code)</Text>
          <TextInput
            mode="outlined" placeholder="+1 555 000 0000"
            value={form.tenantPhone} onChangeText={(t) => handleChange('tenantPhone', t)}
            keyboardType="phone-pad" style={styles.input}
            outlineColor={Colors.border} activeOutlineColor={Colors.red}
            error={!!errors.tenantPhone} left={<TextInput.Affix text="📱" />}
          />
          {errors.tenantPhone ? <Text style={styles.errorText}>{errors.tenantPhone}</Text> : null}
          <View style={styles.infoRow}>
            <AppIcon name={icons.bellIcon} size={hp(2)} color="orange" />
            <Text style={styles.infoText}>
              An SMS will be sent to this number with a deep-link to the app.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleFinish} disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" size="small" />
              <Text style={[styles.submitButtonText, { marginLeft: 8 }]}>
                {isEdit ? 'Updating...' : 'Adding...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              {isEdit ? 'Update Property' : 'Add Property'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const AddPropertiesScreen = ({ onClose = () => {}, propertyData = null }) => {
  const dispatch   = useDispatch();
  const isEdit     = !!propertyData;
  const authData   = useSelector(state => state?.loginData || {});
  const authToken  = authData?.accessToken || null;
  const landlordId = authData?.userData?.landlordId || authData?.userData?.id || null;

  const [step, setStep] = useState(1);

  const [form, setForm] = useState(() => {
    if (propertyData) {
      const existingImages = extractImagesFromProperty(propertyData);
      return {
        name:             propertyData.name || "",
        description:      propertyData.description || "",
        images:           existingImages,
        street:           propertyData.street || propertyData.streetAddress || "",
        city:             propertyData.city  || "",
        state:            propertyData.state || "",
        zip_code:         propertyData.zipcode || propertyData.zip_code || propertyData.zipCode || "",
        property_type:    propertyData.property_type || propertyData.propertyType || "Apartment",
        bedrooms:         propertyData.bedrooms?.toString() || "2",
        bathrooms:        propertyData.bathrooms?.toString() || "1",
        area_sqft:        propertyData.area
          ? propertyData.area.toString().replace(/[^\d]/g, '')
          : (propertyData.area_sqft?.toString() || ""),
        year_built:       propertyData.year_built?.toString() || "",
        monthly_rent:     propertyData.monthly_rent?.toString() || "",
        security_deposit: propertyData.security_deposit?.toString() || "",
        amenities: Array.isArray(propertyData.amenities)
          ? propertyData.amenities.reduce((acc, a) => { acc[a.toLowerCase()] = true; return acc; }, { ...initialForm.amenities })
          : (propertyData.amenities || { ...initialForm.amenities }),
        availability_status:
          propertyData.availability === 'available' || propertyData.availability_status === 'Available'
            ? 'Available'
            : propertyData.availability === 'maintenance' || propertyData.availability_status === 'Under Maintenance'
            ? 'Under Maintenance'
            : 'Currently Occupied',
        tenantName:  propertyData.tenantName  || propertyData.tenant_name  || "",
        tenantPhone: propertyData.tenantPhone || "",
      };
    }
    return initialForm;
  });

  const [errors,           setErrors]           = useState({});
  const [loading,          setLoading]          = useState(false);
  const [addressVerified,  setAddressVerified]  = useState(!!propertyData);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [verifiedAddress,  setVerifiedAddress]  = useState(null);

  // Upload overlay state
  const [uploadOverlay,  setUploadOverlay]  = useState(false);
  const [uploadCurrent,  setUploadCurrent]  = useState(0);
  const [uploadTotal,    setUploadTotal]    = useState(0);
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  // Modal states
  const [propertyTypeModal, setPropertyTypeModal] = useState(false);
  const [bedroomsModal,     setBedroomsModal]     = useState(false);
  const [bathroomsModal,    setBathroomsModal]    = useState(false);
  const [statusModal,       setStatusModal]       = useState(false);

  useEffect(() => { setErrors({}); }, [step]);

  const handleChange = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
    if (['street', 'city', 'state', 'zip_code'].includes(key)) {
      setAddressVerified(false);
      setVerifiedAddress(null);
    }
  }, []);

  const toggleAmenity = useCallback((key) => {
    setForm(prev => ({ ...prev, amenities: { ...prev.amenities, [key]: !prev.amenities[key] } }));
  }, []);

  // ── Image picking ──────────────────────────────────────────
  const pickImages = useCallback(() => {
    if (form.images.length >= 9) { Toast.show('Maximum 9 images allowed'); return; }
    Alert.alert('Add Images', 'Choose an option', [
      { text: 'Open Camera',         onPress: openCamera },
      { text: 'Choose from Gallery', onPress: pickImagesFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ], { cancelable: true });
  }, [form.images.length]);

  const removeImage = useCallback((idx) => {
    setForm(p => { const arr = [...p.images]; arr.splice(idx, 1); return { ...p, images: arr }; });
  }, []);

  const pickImagesFromGallery = async () => {
    try {
      const remaining = 9 - form.images.length;
      const res = await launchImageLibrary({
        mediaType: 'photo', selectionLimit: remaining, quality: 1, includeBase64: false,
      });
      if (res.didCancel || !res.assets) return;
      const uris = res.assets.map(a => a.uri).filter(Boolean);
      setForm(prev => ({ ...prev, images: [...prev.images, ...uris].slice(0, 9) }));
    } catch (err) {
      console.warn('Gallery error:', err);
      Toast.show('Could not open gallery.');
    }
  };

 const openCamera = async () => {
  try {
    const res = await launchCamera({
      mediaType:      'photo',
      cameraType:     'back',
      quality:        0.8,          // ← lower than 1, fixes silent failure on some iOS builds
      includeBase64:  false,
      saveToPhotos:   false,        // ← set true only if you want to save to camera roll
      presentationStyle: 'fullScreen', // ← fixes sheet dismissal issue on iOS
    });

    console.log('📷 Camera result:', JSON.stringify(res)); // ← add this to debug

    if (res.didCancel) {
      console.log('User cancelled camera');
      return;
    }
    if (res.errorCode) {
      console.warn('Camera error code:', res.errorCode, res.errorMessage);
      Toast.show(res.errorMessage || 'Camera error');
      return;
    }
    if (!res.assets || res.assets.length === 0) {
      console.warn('No assets returned from camera');
      return;
    }

    const uri = res.assets[0]?.uri;
    if (uri) setForm(prev => ({
      ...prev,
      images: [...prev.images, uri].slice(0, 9),
    }));

  } catch (err) {
    console.warn('Camera error:', err);
    Toast.show('Could not open camera.');
  }
};
  // ── Validation ────────────────────────────────────────────
  const validateStep = useCallback((s = step) => {
    const err = {};
    if (s === 1) {
      if (!form.name.trim())   err.name   = "Property name is required";
      if (!form.street.trim()) err.street = "Street address is required";
      if (!form.city.trim())   err.city   = "City is required";
      if (!form.state.trim())  err.state  = "State is required";
    }
    if (s === 2) {
      if (!form.monthly_rent.toString().trim()) err.monthly_rent = "Monthly rent is required";
      if (!form.bedrooms.toString().trim())     err.bedrooms     = "Enter bedrooms";
    }
    if (s === 3 && form.availability_status !== 'Available') {
      if (!form.tenantName?.trim())  err.tenantName  = "Tenant name is required";
      if (!form.tenantPhone?.trim()) err.tenantPhone = "Tenant phone number is required";
    }
    return err;
  }, [step, form]);

  const onNext = useCallback(async () => {
    const err = validateStep(step);
    if (Object.keys(err).length) { setErrors(err); return; }

    if (step === 1 && !addressVerified) {
      const fullAddress = [form.street, form.city, form.state, form.zip_code].filter(Boolean).join(', ');
      setVerifyingAddress(true);
      try {
        const result = await geocodeAddress(fullAddress);
        if (result.isValid) {
          setAddressVerified(true);
          setVerifiedAddress(result.formatted_address);
        setForm(prev => ({
  ...prev,
  lat:      result.lat,
  lng:      result.lng,
  country:  result.country   || prev.country  || 'USA',
  zip_code: result.postalCode || prev.zip_code || '',
}));
          Toast.show(`Address verified: ${result.formatted_address}`);
          setStep(s => s + 1);
        } else {
          setErrors(prev => ({ ...prev, street: 'Address not found. Please check and try again.' }));
          Toast.show('Address not found.');
        }
      } catch {
        Toast.show('Could not verify address, but you can continue.');
        setAddressVerified(true);
        setStep(s => s + 1);
      } finally {
        setVerifyingAddress(false);
      }
      return;
    }

    if (step < 3) setStep(s => s + 1);
  }, [step, validateStep, form, addressVerified]);

  const onBack = useCallback(() => {
    if (step > 1) setStep(s => s - 1); else onClose();
  }, [step, onClose]);

  // ─────────────────────────────────────────────────────────
  // handleFinish — Submit flow
  //
  // 1. Count local images
  // 2. Show upload overlay with progress
  // 3. Dispatch thunk (which calls processPropertyImages internally)
  //    — thunk uses blob flow: fetch(uri) → blob → PUT to S3
  // 4. Switch overlay to "Saving..." during API call
  // 5. Close on success
  // ─────────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    const err = { ...validateStep(1), ...validateStep(2), ...validateStep(3) };
    if (Object.keys(err).length) {
      setErrors(err);
      if (err.name || err.street || err.city) setStep(1);
      else if (err.monthly_rent || err.bedrooms) setStep(2);
      return;
    }

    if (!authToken || !landlordId) {
      Toast.show('Authentication required. Please login again.');
      return;
    }

    try {
      setLoading(true);

      // Count local (not-yet-uploaded) images
      const localImages = form.images.filter(u => typeof u === 'string' && !u.startsWith('http'));

      if (localImages.length > 0) {
        setUploadTotal(localImages.length);
        setUploadCurrent(0);
        setIsSubmitting(false);
        setUploadOverlay(true);
      }

      // onUploadProgress(imageIndex, totalImages)
      // Called by processPropertyImages after each image completes
      const onUploadProgress = (imageIndex, totalImages) => {
        setUploadCurrent(imageIndex + 1); // +1 so "1 of 3" shows after first upload
        setUploadTotal(totalImages);
      };

      // Map form field names → camelCase expected by buildNodeApiPayload
      const propertyPayload = {
        propertyData: {
          ...form,
          streetAddress:   form.street,
          zipCode:         form.zip_code,
          areaSqft:        form.area_sqft,
          yearBuilt:       form.year_built,
          monthlyRent:     form.monthly_rent,
          securityDeposit: form.security_deposit,
          propertyType:    form.property_type,
          isFurnished:     form.amenities?.furnished  || false,
          hasParking:      form.amenities?.parking     || false,
          hasElevator:     form.amenities?.elevator    || false,
          availabilityStatus: form.availability_status,
          latitude:  typeof form.lat === 'number' ? form.lat  : 0,
longitude: typeof form.lng === 'number' ? form.lng  : 0,

        },
        token:            authToken,
        landlordId,
        onUploadProgress, // ← live progress callback
      };

      if (isEdit && (propertyData?.property_id || propertyData?.id)) {
        propertyPayload.propertyId = propertyData.property_id || propertyData.id;
        setIsSubmitting(true);
        await dispatch(updateProperty(propertyPayload)).unwrap();
      } else {
        setIsSubmitting(true);
        await dispatch(createProperty(propertyPayload)).unwrap();
      }

      // ✅ CRITICAL: Re-fetch full properties list so Redux has fresh image URLs.
      // Without this, the Redux state still has the old property (without images)
      // because updateProperty could not find it by ID to patch it in-place.
      // getLandlordProperties completely replaces the array with server data.
      await dispatch(getLandlordProperties({ token: authToken }));

      setUploadOverlay(false);
      onClose();
    } catch (error) {
      setUploadOverlay(false);
      const errMsg = typeof error === 'string' ? error : error?.message || JSON.stringify(error);
      console.error('❌ handleFinish error:', errMsg);
      Toast.show(errMsg || 'Failed to save property');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }, [form, validateStep, authToken, landlordId, dispatch, onClose, isEdit, propertyData]);

  const propertyTypes   = ["Apartment", "Condo", "House", "Studio", "Villa", "Townhouse"];
  const bedroomOptions  = ["1", "2", "3", "4", "5", "6"];
  const bathroomOptions = ["1","1.5", "2","2.5", "3","3.5", "4"];
  const statusOptions   = ["Available", "Currently Occupied", "Under Maintenance"];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Container>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose}>
              <AppIcon name={icons.arrowBack} size={hp(3)} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEdit ? 'Edit Property' : step === 1 ? "Add Property" : step === 2 ? "Choose Property Type" : "Amenities"}
            </Text>
          </View>
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map(n => (
            <View key={n} style={[styles.stepDot, step >= n && styles.stepDotActive]} />
          ))}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <Step1
              form={form} errors={errors} handleChange={handleChange}
              pickImages={pickImages} removeImage={removeImage}
              onNext={onNext} verifyingAddress={verifyingAddress} verifiedAddress={verifiedAddress}
            />
          )}
          {step === 2 && (
            <Step2
              form={form} errors={errors} handleChange={handleChange}
              onNext={onNext} onBack={onBack}
              setPropertyTypeModal={setPropertyTypeModal}
              setBedroomsModal={setBedroomsModal}
              setBathroomsModal={setBathroomsModal}
            />
          )}
          {step === 3 && (
            <Step3
              form={form} errors={errors} handleChange={handleChange}
              toggleAmenity={toggleAmenity} onBack={onBack}
              handleFinish={handleFinish} loading={loading}
              setStatusModal={setStatusModal} isEdit={isEdit}
            />
          )}
        </ScrollView>

        {/* Upload Progress Overlay */}
        <UploadProgressOverlay
          visible={uploadOverlay}
          current={uploadCurrent}
          total={uploadTotal}
          isSubmitting={isSubmitting}
        />

        {/* PROPERTY TYPE MODAL */}
        <Modal visible={propertyTypeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Property Type</Text>
              {propertyTypes.map(type => (
                <TouchableOpacity key={type} style={styles.modalItem}
                  onPress={() => { handleChange("property_type", type); setPropertyTypeModal(false); }}>
                  <Text style={[styles.modalItemText, form.property_type === type && styles.modalItemSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalClose} onPress={() => setPropertyTypeModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BEDROOMS MODAL */}
        <Modal visible={bedroomsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Bedrooms</Text>
              {bedroomOptions.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalItem}
                  onPress={() => { handleChange("bedrooms", opt); setBedroomsModal(false); }}>
                  <Text style={[styles.modalItemText, form.bedrooms === opt && styles.modalItemSelected]}>{opt} BHK</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalClose} onPress={() => setBedroomsModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BATHROOMS MODAL */}
        <Modal visible={bathroomsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Bathrooms</Text>
              {bathroomOptions.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalItem}
                  onPress={() => { handleChange("bathrooms", opt); setBathroomsModal(false); }}>
                  <Text style={[styles.modalItemText, form.bathrooms === opt && styles.modalItemSelected]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalClose} onPress={() => setBathroomsModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* STATUS MODAL */}
        <Modal visible={statusModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Availability Status</Text>
              {statusOptions.map(opt => (
                <TouchableOpacity key={opt} style={styles.modalItem}
                  onPress={() => { handleChange("availability_status", opt); setStatusModal(false); }}>
                  <Text style={[styles.modalItemText, form.availability_status === opt && styles.modalItemSelected]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalClose} onPress={() => setStatusModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Container>
    </KeyboardAvoidingView>
  );
};

// ═════════════════════════════════════════════════════════════
// OVERLAY STYLES
// ═════════════════════════════════════════════════════════════
const ol = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: wp(6), width: wp(80), alignItems: 'center',
  },
  title: {
    fontSize: hp(2.2), fontFamily: getFontFamily('bold'),
    color: Colors.black, marginTop: hp(1.5), marginBottom: hp(0.5),
  },
  label: {
    fontSize: hp(1.6), fontFamily: getFontFamily('regular'),
    color: Colors.placeholder, textAlign: 'center', marginBottom: hp(1.5),
  },
  barTrack: {
    width: '100%', height: hp(1), borderRadius: 6,
    backgroundColor: '#EEE', overflow: 'hidden', marginBottom: hp(0.5),
  },
  barFill: { height: '100%', borderRadius: 6, backgroundColor: Colors.red },
  pct: { fontSize: hp(1.8), fontFamily: getFontFamily('semiBold'), color: Colors.red, marginBottom: hp(0.5) },
  hint: { fontSize: hp(1.4), color: Colors.placeholder, fontFamily: getFontFamily('regular') },
});

// ═════════════════════════════════════════════════════════════
// SCREEN STYLES
// ═════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wp(4), paddingVertical: hp(1.5) },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: wp(3) },
  headerTitle: { fontSize: hp(2.2), fontFamily: getFontFamily('bold'), color: Colors.black, marginLeft: wp(2) },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: wp(2), paddingBottom: hp(1) },
  stepDot: { width: wp(8), height: hp(0.5), borderRadius: 4, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.red },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: hp(4) },
  stepContainer: { paddingHorizontal: wp(7), paddingTop: hp(1) },
  stepTitle: { fontSize: hp(2.2), fontFamily: getFontFamily('bold'), color: Colors.black, marginBottom: hp(0.5) },
  stepSubtitle: { fontSize: hp(1.6), color: Colors.placeholder, marginBottom: hp(2), fontFamily: getFontFamily('regular') },
  glassContainer: { backgroundColor: Colors.backgroundColor || '#F8F8F8', borderRadius: 12, padding: wp(3), marginBottom: hp(2) },
  fieldContainer: { marginBottom: hp(2) },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2), marginBottom: hp(0.5) },
  label: { fontSize: hp(1.9), fontFamily: getFontFamily('semiBold'), color: Colors.black },
  subLabel: { fontSize: hp(1.6), fontFamily: getFontFamily('medium'), color: Colors.darkGray || '#555', marginTop: hp(1), marginBottom: hp(0.3) },
  input: { backgroundColor: Colors.white || '#fff', fontSize: hp(1.7), height: hp(6) },
  errorText: { fontSize: hp(1.4), color: Colors.red, marginTop: hp(0.3), fontFamily: getFontFamily('regular') },
  row: { flexDirection: 'row', gap: wp(3) },
  halfInput: { flex: 1 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2), marginBottom: hp(1) },
  imageWrapper: { position: 'relative' },
  propertyImage: { width: wp(27), height: wp(27), borderRadius: 8 },
  localBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: Colors.red, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  localBadgeText: { fontSize: hp(1.1), color: 'white', fontFamily: getFontFamily('bold') },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 3 },
  addImageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(2), borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 8, paddingVertical: hp(1.5), marginTop: hp(1) },
  addImageText: { fontSize: hp(1.7), color: Colors.black, fontFamily: getFontFamily('medium') },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: wp(2), backgroundColor: '#EFF9EF', borderRadius: 8, padding: wp(3), marginBottom: hp(2) },
  verifiedText: { flex: 1, fontSize: hp(1.5), color: 'green', fontFamily: getFontFamily('regular') },
  dropdownBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.border, borderRadius: 4, paddingHorizontal: wp(3), height: hp(6), backgroundColor: Colors.white || '#fff' },
  dropdownText: { fontSize: hp(1.7), color: Colors.black, fontFamily: getFontFamily('regular') },
  placeholderText: { color: Colors.placeholder },
amenitiesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginBottom: hp(2),
},
amenityChip: {
  width: '13.5%',
  minHeight: hp(7.2),
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: hp(0.7),
  paddingHorizontal: wp(0.5),
  borderRadius: 8,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.white || '#fff',
  position: 'relative',
  marginBottom: hp(0.5),
},

amenityCheckmark: {
  position: 'absolute',
  top: 2,
  right: 2,
  backgroundColor: Colors.red,
  borderRadius: 6,
  padding: 1,
},

amenityLabel: {
  fontSize: hp(0.95),
  lineHeight: hp(1.2),
  textAlign: 'center',
  color: Colors.placeholder,
  marginTop: hp(0.25),
  fontFamily: getFontFamily('regular'),
},
  amenityLabelActive: { color: Colors.red, fontFamily: getFontFamily('medium') },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: wp(2), marginTop: hp(1.5), backgroundColor: '#FFF8EC', borderRadius: 8, padding: wp(3) },
  infoText: { flex: 1, fontSize: hp(1.5), color: '#7A5C00', fontFamily: getFontFamily('regular'), lineHeight: hp(2.3) },
  inviteSentBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: wp(2), backgroundColor: '#EFF9EF', borderRadius: 8, padding: wp(3), marginBottom: hp(1.5) },
  inviteSentText: { flex: 1, fontSize: hp(1.5), color: '#1A5C1A', fontFamily: getFontFamily('regular'), lineHeight: hp(2.3) },
  buttonRow: { flexDirection: 'row', gap: wp(3), marginTop: hp(2) },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.red, borderRadius: 10, paddingVertical: hp(1.8), gap: wp(2), marginTop: hp(2) },
  nextButtonFlex: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.red, borderRadius: 10, paddingVertical: hp(1.8), gap: wp(2) },
  nextButtonText: { color: 'white', fontSize: hp(1.8), fontFamily: getFontFamily('semiBold') },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: wp(1), paddingHorizontal: wp(4), paddingVertical: hp(1.8), borderWidth: 1, borderColor: Colors.border, borderRadius: 10 },
  backButtonText: { fontSize: hp(1.7), fontFamily: getFontFamily('medium'), color: Colors.black },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingVertical: hp(1.8) },
  cancelButtonText: { fontSize: hp(1.7), fontFamily: getFontFamily('medium'), color: Colors.black },
  submitButton: { flex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.red, borderRadius: 10, paddingVertical: hp(1.8) },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: 'white', fontSize: hp(1.8), fontFamily: getFontFamily('semiBold') },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: Colors.white || '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: wp(5), paddingTop: hp(2), paddingBottom: hp(4) },
  modalTitle: { fontSize: hp(2), fontFamily: getFontFamily('bold'), color: Colors.black, marginBottom: hp(1.5), textAlign: 'center' },
  modalItem: { paddingVertical: hp(1.5), borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalItemText: { fontSize: hp(1.8), fontFamily: getFontFamily('regular'), color: Colors.black },
  modalItemSelected: { color: Colors.red, fontFamily: getFontFamily('semiBold') },
  modalClose: { marginTop: hp(1.5), alignItems: 'center', paddingVertical: hp(1.5) },
  modalCloseText: { fontSize: hp(1.8), color: Colors.placeholder, fontFamily: getFontFamily('medium') },
});

export default AddPropertiesScreen;
