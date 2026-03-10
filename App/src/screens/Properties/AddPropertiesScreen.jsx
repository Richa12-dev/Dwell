import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { createProperty, updateProperty, geocodeAddress } from '../../Redux/Properties/services';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const initialForm = {
  // Step 1
  name: "",
  description: "",
  images: [],
  street: "",
  city: "",
  state: "",
  zip_code: "",

  // Step 2
  property_type: "Apartment",
  bedrooms: "",
  bathrooms: "",
  area_sqft: "",
  year_built: "",
  monthly_rent: "",
  security_deposit: "",

  // Step 3
  amenities: {
    furnished: false,
    parking: false,
    elevator: false,
    ac: false,
    gym: false,
    pool: false,
  },
  availability_status: "Available",
  tenant_id: "",
  tenant_name: "",
  tenant_email: "",
};

/* ========================================
   STEP 1 COMPONENT
   ======================================== */
const Step1 = memo(({ form, errors, handleChange, pickImages, removeImage, onNext, verifyingAddress, verifiedAddress }) => (
  <View style={styles.stepContainer}>
    {/* Property Name */}
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppIcon name={icons.redProperties} size={hp(2.5)} />
        <Text style={styles.label}>Property Name</Text>
      </View>
      <TextInput
        mode="outlined"
        placeholder="Enter Property Name"
        value={form.name}
        onChangeText={(t) => handleChange("name", t)}
        style={styles.input}
        outlineColor={Colors.border}
        activeOutlineColor={Colors.red}
        error={!!errors.name}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
    </View>

    {/* Description */}
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppIcon name={icons.progresses} size={hp(2.5)} />
        <Text style={styles.label}>Description</Text>
      </View>
      <TextInput
        mode="outlined"
        placeholder="Enter the Property Description"
        value={form.description}
        onChangeText={(t) => handleChange("description", t)}
        multiline
        numberOfLines={4}
        style={[styles.input, { height: hp(12) }]}
        outlineColor={Colors.border}
        activeOutlineColor={Colors.red}
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
            <View key={idx} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.propertyImage} resizeMode="cover" />
              <TouchableOpacity onPress={() => removeImage(idx)} style={styles.removeImageBtn}>
                <AppIcon name={icons.close} size={hp(1.5)} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
        <AppIcon name={icons.photo} size={hp(2.5)} color={Colors.black} />
        <Text style={styles.addImageText}>Add Images</Text>
      </TouchableOpacity>
    </View>

    {/* Address Information */}
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppIcon name={icons.location} size={hp(2.5)} />
        <Text style={styles.label}>Address Information</Text>
      </View>

      <Text style={styles.subLabel}>Street Address</Text>
      <TextInput
        mode="outlined"
        placeholder="Enter Street Address"
        value={form.street}
        onChangeText={(t) => handleChange("street", t)}
        style={styles.input}
        outlineColor={Colors.border}
        activeOutlineColor={Colors.red}
        error={!!errors.street}
      />
      {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>City</Text>
          <TextInput
            mode="outlined"
            placeholder="City"
            value={form.city}
            onChangeText={(t) => handleChange("city", t)}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
            error={!!errors.city}
          />
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>State</Text>
          <TextInput
            mode="outlined"
            placeholder="State"
            value={form.state}
            onChangeText={(t) => handleChange("state", t)}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
            error={!!errors.state}
          />
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
        </View>
      </View>

      <Text style={styles.subLabel}>Zip Code</Text>
      <TextInput
        mode="outlined"
        placeholder="12345-6789"
        keyboardType="numeric"
        value={form.zip_code}
        onChangeText={(t) => handleChange("zip_code", t)}
        style={styles.input}
        outlineColor={Colors.border}
        activeOutlineColor={Colors.red}
      />
    </View>

    {/* Verified address badge */}
    {verifiedAddress ? (
      <View style={styles.verifiedBadge}>
        <AppIcon name={icons.ok} size={hp(2)} color="green" />
        <Text style={styles.verifiedText} numberOfLines={1}>{verifiedAddress}</Text>
      </View>
    ) : null}

    {/* Next Button */}
    <TouchableOpacity
      style={[styles.nextButton, verifyingAddress && { opacity: 0.6 }]}
      onPress={onNext}
      disabled={verifyingAddress}
    >
      {verifyingAddress ? (
        <ActivityIndicator size="small" color={Colors.red} style={{ marginRight: wp(2) }} />
      ) : null}
      <Text style={styles.nextButtonText}>
        {verifyingAddress ? 'Verifying Address...' : 'Property Type & Pricing'}
      </Text>
      {!verifyingAddress && (
        <AppIcon name={icons.arrowBack} size={hp(2)} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
      )}
    </TouchableOpacity>
  </View>
));

/* ========================================
   STEP 2 COMPONENT
   ======================================== */
const Step2 = memo(({
  form, errors, handleChange, onNext, onBack,
  setPropertyTypeModal, setBedroomsModal, setBathroomsModal
}) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepSubtitle}>Edit Property Types and Pricing Details</Text>

    <View style={styles.glassContainer}>
      {/* Property Type */}
      <View style={styles.fieldContainer}>
        <Text style={styles.subLabel}>Property Type</Text>
        <TouchableOpacity style={styles.dropdownBox} onPress={() => setPropertyTypeModal(true)}>
          <Text style={styles.dropdownText}>{form.property_type}</Text>
          <AppIcon name={icons.arrowDown} size={hp(2)} color={Colors.placeholder} />
        </TouchableOpacity>
      </View>

      {/* Bedrooms & Bathrooms */}
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>Bedrooms</Text>
          <TouchableOpacity style={styles.dropdownBox} onPress={() => setBedroomsModal(true)}>
            <Text style={[styles.dropdownText, !form.bedrooms && styles.placeholderText]}>
              {form.bedrooms ? `${form.bedrooms} BHK` : "2 BHK"}
            </Text>
            <AppIcon name={icons.arrowDown} size={hp(2)} color={Colors.placeholder} />
          </TouchableOpacity>
          {errors.bedrooms && <Text style={styles.errorText}>{errors.bedrooms}</Text>}
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

      {/* Area & Year Built */}
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>Area (Sq. ft)</Text>
          <TextInput
            mode="outlined"
            placeholder="2000"
            keyboardType="numeric"
            value={form.area_sqft}
            onChangeText={(t) => handleChange("area_sqft", t)}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
          />
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.subLabel}>Year Built</Text>
          <TextInput
            mode="outlined"
            placeholder="2018"
            keyboardType="numeric"
            value={form.year_built}
            onChangeText={(t) => handleChange("year_built", t)}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
          />
        </View>
      </View>
    </View>

    <View style={styles.glassContainer}>
      {/* Pricing */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <AppIcon name={icons.dollar} size={hp(2.5)} />
          <Text style={styles.label}>Pricing</Text>
        </View>

        <Text style={styles.subLabel}>Monthly Rent ($)</Text>
        <TextInput
          mode="outlined"
          placeholder="$ 2600"
          keyboardType="numeric"
          value={form.monthly_rent}
          onChangeText={(t) => handleChange("monthly_rent", t)}
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.red}
          error={!!errors.monthly_rent}
          left={<TextInput.Affix text="$" />}
        />
        {errors.monthly_rent && <Text style={styles.errorText}>{errors.monthly_rent}</Text>}

        <Text style={styles.subLabel}>Security Deposit ($)</Text>
        <TextInput
          mode="outlined"
          placeholder="$ 200000"
          keyboardType="numeric"
          value={form.security_deposit}
          onChangeText={(t) => handleChange("security_deposit", t)}
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.red}
          left={<TextInput.Affix text="$" />}
        />
      </View>
    </View>

    {/* Navigation */}
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

/* ========================================
   STEP 3 COMPONENT
   ======================================== */
const Step3 = memo(({
  form, handleChange, toggleAmenity, onBack,
  handleFinish, loading, setStatusModal, isEdit
}) => {
  const amenitiesList = [
    { label: "Furnished", icon: icons.furnished, key: "furnished" },
    { label: "Parking", icon: icons.parking, key: "parking" },
    { label: "Elevator", icon: icons.elevator, key: "elevator" },
    { label: "AC", icon: icons.furnished, key: "ac" },
    { label: "Gym", icon: icons.furnished, key: "gym" },
    { label: "Pool", icon: icons.furnished, key: "pool" },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Amenities</Text>
      <Text style={styles.stepSubtitle}>Edit Amenities and Property Availability Status</Text>

      {/* Amenities Grid */}
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
            <AppIcon name={icon} size={hp(5)} color={form.amenities[key] ? Colors.red : Colors.placeholder} />
            <Text style={[styles.amenityLabel, form.amenities[key] && styles.amenityLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Availability Status */}
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

      {/* Tenant Assignment */}
      {form.availability_status !== 'Available' && (
        <View style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <AppIcon name={icons.person} size={hp(2.5)} />
            <Text style={styles.label}>Tenant Assignment</Text>
          </View>

          <Text style={styles.subLabel}>Tenant Email</Text>
          <TextInput
            mode="outlined"
            placeholder="tenant@example.com"
            value={form.tenant_email}
            onChangeText={(t) => handleChange("tenant_email", t)}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
          />

          <Text style={styles.subLabel}>Tenant Name</Text>
          <TextInput
            mode="outlined"
            placeholder="Tenant Name"
            value={form.tenant_name}
            onChangeText={(t) => handleChange("tenant_name", t)}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.red}
          />

          <View style={styles.infoRow}>
            <AppIcon name={icons.bellIcon} size={hp(2)} color="orange" />
            <Text style={styles.infoText}>
              Assigning a tenant will automatically mark this property as occupied.
            </Text>
          </View>
        </View>
      )}

      {/* Final Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleFinish}
          disabled={loading}
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

/* ========================================
   SELECT MODAL
   ======================================== */
const SelectModal = memo(({ visible, onClose, title, options, onSelect }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView style={styles.modalScroll}>
          {options.map((item, index) => (
            <TouchableOpacity key={index} style={styles.modalOption} onPress={() => onSelect(item)}>
              <Text style={styles.modalOptionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
));

/* ========================================
   ✅ FIXED: Helper — build edit-mode image array from
   whatever shape the Redux property object has
   ======================================== */
const extractImagesFromProperty = (propertyData) => {
  if (!propertyData) return [];

  const S3 = 'https://dp-properties.s3.amazonaws.com';
  const toUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'object' && img.url) {
      return img.url.startsWith('http') ? img.url : `${S3}/${img.url}`;
    }
    if (typeof img === 'string') {
      if (img.startsWith('http') || img.startsWith('data:')) return img;
      return `${S3}/${img}`;
    }
    return null;
  };

  // Priority 1: already-normalised image_urls (set by services.js normalizePropertyImages)
  if (Array.isArray(propertyData.image_urls) && propertyData.image_urls.length > 0) {
    const urls = propertyData.image_urls.map(toUrl).filter(Boolean);
    if (urls.length > 0) { console.log('✅ Edit images from image_urls:', urls); return urls; }
  }

  // Priority 2: media.photos_preview
  if (propertyData.media?.photos_preview?.length > 0) {
    const urls = propertyData.media.photos_preview.map(toUrl).filter(Boolean);
    if (urls.length > 0) { console.log('✅ Edit images from photos_preview:', urls); return urls; }
  }

  // Priority 3: media.photos (S3 keys)
  if (propertyData.media?.photos?.length > 0) {
    const urls = propertyData.media.photos.map(toUrl).filter(Boolean);
    if (urls.length > 0) { console.log('✅ Edit images from media.photos:', urls); return urls; }
  }

  // Priority 4: images array
  if (Array.isArray(propertyData.images) && propertyData.images.length > 0) {
    const urls = propertyData.images.map((img) => {
      if (typeof img === 'object' && img?.uri) return img.uri;
      return toUrl(img);
    }).filter(Boolean);
    if (urls.length > 0) return urls;
  }

  console.log('⚠️ No images found on property');
  return [];
};

/* ========================================
   MAIN COMPONENT
   ======================================== */
const AddPropertiesScreen = ({ onClose = () => {}, propertyData = null }) => {
  const dispatch = useDispatch();
  const isEdit = !!propertyData;

  const authData = useSelector(state => state?.loginData || state?.login || {});
  const authToken = authData?.accessToken || null;
  const landlordId = authData?.landlordId || authData?.userData?.landlordId || null;

  const [step, setStep] = useState(1);

  const [form, setForm] = useState(() => {
    if (propertyData) {
      const existingImages = extractImagesFromProperty(propertyData);

      return {
        name: propertyData.name || "",
        description: propertyData.description || "",
        images: existingImages,
        street: propertyData.street || "",
        city: propertyData.city || "",
        state: propertyData.state || "",
        zip_code: propertyData.zipcode || propertyData.zip_code || "",
        property_type: propertyData.property_type || "Apartment",
        bedrooms: propertyData.bedrooms?.toString() || "",
        bathrooms: propertyData.bathrooms?.toString() || "",
        area_sqft: propertyData.area
          ? propertyData.area.toString().replace(/[^\d]/g, '')
          : (propertyData.area_sqft?.toString() || ""),
        year_built: propertyData.year_built?.toString() || "",
        monthly_rent: propertyData.monthly_rent?.toString() || "",
        security_deposit: propertyData.security_deposit?.toString() || "",
        amenities: Array.isArray(propertyData.amenities)
          ? propertyData.amenities.reduce((acc, amenity) => {
              acc[amenity.toLowerCase()] = true;
              return acc;
            }, { ...initialForm.amenities })
          : (propertyData.amenities || { ...initialForm.amenities }),
        availability_status: propertyData.availability === 'available' ? 'Available' : 'Occupied',
        tenant_email: propertyData.tenants?.[0]?.email || "",
        tenant_name: propertyData.tenants?.[0]?.name || "",
        // ✅ FIXED: was incorrectly mapped to tenant email; now uses actual tenant id
        tenant_id: propertyData.tenants?.[0]?.tenant_id ||
                   propertyData.tenants?.[0]?.id ||
                   propertyData.tenant_ids?.[0] || "",
      };
    }
    return initialForm;
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [addressVerified, setAddressVerified] = useState(!!propertyData);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState(null);

  // Modal states
  const [propertyTypeModal, setPropertyTypeModal] = useState(false);
  const [bedroomsModal, setBedroomsModal] = useState(false);
  const [bathroomsModal, setBathroomsModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  useEffect(() => { setErrors({}); }, [step]);

  const handleChange = useCallback((key, value) => {
    setForm((prevForm) => ({ ...prevForm, [key]: value }));
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[key];
      return newErrors;
    });
    if (['street', 'city', 'state', 'zip_code'].includes(key)) {
      setAddressVerified(false);
      setVerifiedAddress(null);
    }
  }, []);

  const toggleAmenity = useCallback((key) => {
    setForm((prevForm) => ({
      ...prevForm,
      amenities: { ...prevForm.amenities, [key]: !prevForm.amenities[key] },
    }));
  }, []);

  const pickImages = useCallback(() => {
    Alert.alert(
      'Add Images',
      'Choose an option',
      [
        { text: 'Open Camera', onPress: openCamera },
        { text: 'Choose from Gallery', onPress: pickImagesFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, []);

  const removeImage = useCallback((idx) => {
    setForm((p) => {
      const arr = [...p.images];
      arr.splice(idx, 1);
      return { ...p, images: arr };
    });
  }, []);

  const pickImagesFromGallery = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 9, quality: 0.8 });
      if (res.didCancel) return;
      if (res.assets) {
        const selected = res.assets.map(item => item.uri);
        setForm(prev => ({ ...prev, images: [...prev.images, ...selected].slice(0, 9) }));
      }
    } catch (err) { console.log("Gallery Error:", err); }
  };

  const openCamera = async () => {
    try {
      const res = await launchCamera({ mediaType: 'photo', cameraType: 'back', quality: 0.8 });
      if (res.didCancel) return;
      if (res.assets) {
        const newImage = res.assets[0].uri;
        setForm(prev => ({ ...prev, images: [...prev.images, newImage].slice(0, 9) }));
      }
    } catch (err) { console.log("Camera Error:", err); }
  };

  const validateStep = useCallback((s = step) => {
    const err = {};
    if (s === 1) {
      if (!form.name.trim()) err.name = "Property name is required";
      if (!form.street.trim()) err.street = "Street address is required";
      if (!form.city.trim()) err.city = "City is required";
      if (!form.state.trim()) err.state = "State is required";
    }
    if (s === 2) {
      if (!form.monthly_rent.toString().trim()) err.monthly_rent = "Monthly rent is required";
      if (!form.bedrooms.toString().trim()) err.bedrooms = "Enter bedrooms";
    }
    if (s === 3) {
      if (form.availability_status !== 'Available') {
        if (!form.tenant_email.trim()) err.tenant_email = "Tenant email is required";
        if (!form.tenant_name.trim()) err.tenant_name = "Tenant name is required";
      }
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
    lat: result.lat,
    lng: result.lng,
  }));
          Toast.show(`Address verified: ${result.formatted_address}`);
          setStep((s) => s + 1);
        } else {
          setErrors((prev) => ({ ...prev, street: 'Address not found. Please check and try again.' }));
          Toast.show('Address not found. Please enter a valid address.');
        }
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding failed, allowing user to continue:', geocodeError.message);
        Toast.show('Could not verify address, but you can continue.');
        setAddressVerified(true);
        setStep((s) => s + 1);
      } finally {
        setVerifyingAddress(false);
      }
      return;
    }

    if (step < 3) setStep((s) => s + 1);
  }, [step, validateStep, form, addressVerified]);

  const onBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
    else onClose();
  }, [step, onClose]);

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

      const propertyPayload = {
        propertyData: form,
        token: authToken,
        landlordId,
      };

      if (isEdit && propertyData?.property_id) {
        propertyPayload.propertyId = propertyData.property_id;
        await dispatch(updateProperty(propertyPayload)).unwrap();
        Toast.show('Property updated successfully!');
      } else {
        await dispatch(createProperty(propertyPayload)).unwrap();
        Toast.show('Property added successfully!');
      }

      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      Toast.show(error?.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  }, [form, validateStep, authToken, landlordId, dispatch, onClose, isEdit, propertyData]);

  const propertyTypes = ["Apartment", "Condo", "House", "Studio", "Villa", "Townhouse"];
  const bedroomOptions = ["1", "2", "3", "4", "5", "6"];
  const bathroomOptions = ["1", "2", "3", "4"];
  const statusOptions = ["Available", "Currently Occupied", "Under Maintenance"];

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

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <Step1
              form={form}
              errors={errors}
              handleChange={handleChange}
              pickImages={pickImages}
              removeImage={removeImage}
              onNext={onNext}
              verifyingAddress={verifyingAddress}
              verifiedAddress={verifiedAddress}
            />
          )}
          {step === 2 && (
            <Step2
              form={form}
              errors={errors}
              handleChange={handleChange}
              onNext={onNext}
              onBack={onBack}
              setPropertyTypeModal={setPropertyTypeModal}
              setBedroomsModal={setBedroomsModal}
              setBathroomsModal={setBathroomsModal}
            />
          )}
          {step === 3 && (
            <Step3
              form={form}
              handleChange={handleChange}
              toggleAmenity={toggleAmenity}
              onBack={onBack}
              handleFinish={handleFinish}
              loading={loading}
              setStatusModal={setStatusModal}
              isEdit={isEdit}
            />
          )}
        </ScrollView>

        {/* Modals */}
        <SelectModal
          visible={propertyTypeModal}
          onClose={() => setPropertyTypeModal(false)}
          title="Select Property Type"
          options={propertyTypes}
          onSelect={(val) => { handleChange("property_type", val); setPropertyTypeModal(false); }}
        />
        <SelectModal
          visible={bedroomsModal}
          onClose={() => setBedroomsModal(false)}
          title="Select Bedrooms"
          options={bedroomOptions}
          onSelect={(val) => { handleChange("bedrooms", val); setBedroomsModal(false); }}
        />
        <SelectModal
          visible={bathroomsModal}
          onClose={() => setBathroomsModal(false)}
          title="Select Bathrooms"
          options={bathroomOptions}
          onSelect={(val) => { handleChange("bathrooms", val); setBathroomsModal(false); }}
        />
        <SelectModal
          visible={statusModal}
          onClose={() => setStatusModal(false)}
          title="Select Status"
          options={statusOptions}
          onSelect={(val) => { handleChange("availability_status", val); setStatusModal(false); }}
        />
      </Container>
    </KeyboardAvoidingView>
  );
};

export default AddPropertiesScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    marginLeft: wp(3),
    color: Colors.black,
    fontFamily: getFontFamily('bold'),
  },
  scrollView: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: wp(4), paddingVertical: hp(2), paddingBottom: hp(4) },
  stepContainer: { paddingBottom: hp(2) },
  stepTitle: {
    fontSize: hp(2.6), fontWeight: "bold", color: Colors.black,
    marginBottom: hp(0.5), fontFamily: getFontFamily('bold'),
  },
  stepSubtitle: {
    fontSize: hp(1.7), color: Colors.placeholder,
    marginBottom: hp(2), fontFamily: getFontFamily('regular'),
  },
  fieldContainer: { marginBottom: hp(2) },
  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: hp(1) },
  label: {
    fontSize: hp(1.9), fontWeight: "600", color: Colors.black,
    marginLeft: wp(2), fontFamily: getFontFamily('semiBold'),
  },
  subLabel: {
    fontSize: hp(1.7), color: Colors.black,
    marginBottom: hp(0.5), fontFamily: getFontFamily('regular'),
  },
  input: { backgroundColor: "#fff", fontFamily: getFontFamily('regular') },
  errorText: {
    fontSize: hp(1.5), color: Colors.primary,
    marginTop: hp(0.5), fontFamily: getFontFamily('regular'),
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { width: "48%" },
  dropdownBox: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: wp(3), paddingVertical: hp(1.5),
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", backgroundColor: "#fff",
  },
  dropdownText: { fontSize: hp(1.8), color: Colors.black, fontFamily: getFontFamily('regular') },
  placeholderText: { color: Colors.placeholder, fontFamily: getFontFamily('regular') },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: hp(2) },
  imageWrapper: {
    width: wp(28), height: hp(10), marginRight: wp(2),
    marginBottom: hp(2), position: "relative",
  },
  propertyImage: { width: "100%", height: "100%", borderRadius: 8 },
  removeImageBtn: {
    position: "absolute", top: -hp(0.8), right: -wp(1.5),
    backgroundColor: Colors.red, borderRadius: 50,
    width: wp(6), height: wp(6), alignItems: "center", justifyContent: "center",
  },
  addImageBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingVertical: hp(1.5), backgroundColor: "#fff",
  },
  addImageText: {
    marginLeft: wp(2), fontSize: hp(1.8),
    color: Colors.black, fontWeight: "500", fontFamily: getFontFamily('medium'),
  },
  nextButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    borderRadius: 8, paddingVertical: hp(1.8), marginTop: hp(2),
  },
  nextButtonText: {
    color: "black", fontSize: hp(1.8), fontWeight: "600",
    marginRight: wp(2), fontFamily: getFontFamily('semiBold'), textAlign: "right",
  },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: hp(3) },
  backButton: { flexDirection: "row", alignItems: "center", paddingVertical: hp(1.5) },
  backButtonText: {
    marginLeft: wp(2), fontSize: hp(1.8), fontWeight: "500", fontFamily: getFontFamily('medium'),
  },
  nextButtonFlex: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 8, paddingVertical: hp(1.8), marginLeft: wp(4),
  },
  cancelButton: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingVertical: hp(1.8), alignItems: "center", justifyContent: "center", marginRight: wp(3),
  },
  cancelButtonText: {
    fontSize: hp(1.8), color: Colors.black, fontWeight: "600", fontFamily: getFontFamily('semiBold'),
  },
  submitButton: {
    flex: 1, backgroundColor: Colors.red, borderRadius: 8,
    paddingVertical: hp(1.8), alignItems: "center", justifyContent: "center",
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    color: "white", fontSize: hp(1.8), fontWeight: "600", fontFamily: getFontFamily('semiBold'),
  },
  loadingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  amenitiesGrid: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", marginBottom: hp(2),
  },
  amenityChip: {
    width: wp(28), height: hp(12), borderWidth: 2, borderColor: Colors.border,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "white", marginBottom: hp(2), position: "relative",
  },
  amenityChipActive: { borderColor: Colors.red, backgroundColor: "#FFEBEE" },
  amenityCheckmark: {
    position: "absolute", top: -hp(1), right: -wp(2),
    backgroundColor: Colors.red, borderRadius: 50,
    width: wp(6), height: wp(6), alignItems: "center", justifyContent: "center",
  },
  amenityLabel: {
    fontSize: hp(1.6), color: Colors.black,
    marginTop: hp(1), textAlign: "center", fontFamily: getFontFamily('regular'),
  },
  amenityLabelActive: { color: Colors.red, fontWeight: "600", fontFamily: getFontFamily('semiBold') },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: hp(1.5), paddingHorizontal: wp(2) },
  infoText: {
    fontSize: hp(1.5), color: Colors.placeholder,
    marginLeft: wp(2), flex: 1, fontFamily: getFontFamily('regular'),
  },
  modalOverlay: {
    flex: 1, justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)", padding: wp(10),
  },
  modalContainer: { backgroundColor: "#fff", borderRadius: 10, padding: hp(2), maxHeight: hp(50) },
  modalTitle: {
    fontSize: hp(2), fontWeight: "600", marginBottom: hp(1.5),
    textAlign: "center", color: Colors.black, fontFamily: getFontFamily('semiBold'),
  },
  modalScroll: { maxHeight: hp(40) },
  modalOption: { paddingVertical: hp(1.5), borderBottomWidth: 1, borderColor: Colors.border },
  modalOptionText: {
    textAlign: "center", fontSize: hp(1.9), color: Colors.black, fontFamily: getFontFamily('regular'),
  },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9",
    borderWidth: 1, borderColor: "#A5D6A7", borderRadius: 8,
    paddingHorizontal: wp(3), paddingVertical: hp(0.8),
    marginTop: hp(1), marginBottom: hp(0.5),
  },
  verifiedText: {
    fontSize: hp(1.5), color: "#2E7D32",
    marginLeft: wp(2), flex: 1, fontFamily: getFontFamily('regular'),
  },
  glassContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: wp(4), borderRadius: 15, marginTop: hp(2),
    borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
