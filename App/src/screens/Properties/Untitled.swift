
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Alert as RNAlert,
  PermissionsAndroid
} from 'react-native';
import {
  VStack,
  HStack,
  Button,
  Text,
  Box,
  FormControl,
  Input,
  Select,
  CheckIcon,
  Switch,
  Alert,
  Spinner,
  Pressable,
  Image,
  FlatList,
  Toast
} from 'native-base';
import { useNavigation , useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { createProperty, updateProperty, validateTenantIdSimple } from '../../Redux/Properties/services';
import { propertiesSelectors, clearError } from '../../Redux/Properties/propertiesSlice';
import { Colors } from '../../Theme';
import Container from '../../components/Container/Container';


const AddPropertiesScreen = ({ onClose, propertyData }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { loading, error } = useSelector(propertiesSelectors.getPropertiesData);

  // Get authentication data from Redux store
  const loginData = useSelector(state => state.loginData || state.login || {});
  const authToken = loginData?.token;
  const landlordId = loginData?.userData?.landlordId || loginData?.userData?.id || loginData?.user?.landlordId || loginData?.user?.id;

  console.log('🏠 AddProperty - Auth Info:', {
    hasToken: !!authToken,
    landlordId: landlordId,
    userRole: loginData?.userData?.role || loginData?.user?.role
  });

  // Check if route.params OR props has property data for edit mode
  const editProperty = propertyData || route?.params?.propertyData || null;
  const isEditMode = !!editProperty;

  const [formData, setFormData] = useState({
    name: editProperty?.name || '',
    address: editProperty?.address || '',
    city: editProperty?.city || '',
    state: editProperty?.state || '',
    zip_code: editProperty?.zip_code || '',
    property_type: editProperty?.property_type || 'Apartment',
    bedrooms: editProperty?.bedrooms?.toString() || '1',
    bathrooms: editProperty?.bathrooms?.toString() || '1',
    square_footage: editProperty?.square_footage?.toString() || '',
    year_built: editProperty?.year_built?.toString() || '',
    monthly_rent: editProperty?.monthly_rent?.toString() || '',
    security_deposit: editProperty?.security_deposit?.toString() || '',
    is_available: editProperty?.is_available ?? true,
    furnished: editProperty?.furnished ?? false,
    parking: editProperty?.parking ?? false,
    elevator: editProperty?.elevator ?? false,
    description: editProperty?.description || '',
    images: editProperty?.images || [],
    tenant_id: editProperty?.tenant_id || '',
    tenant_name: editProperty?.tenant_name || '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [tenantValidation, setTenantValidation] = useState({
    isValidating: false,
    isValid: null,
    tenantInfo: null,
    error: null
  });

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    // Auto-set availability based on tenant assignment
    if (formData.tenant_id && tenantValidation.isValid) {
      setFormData(prev => ({ ...prev, is_available: false }));
    } else if (!formData.tenant_id) {
      setFormData(prev => ({ ...prev, is_available: true }));
    }
  }, [formData.tenant_id, tenantValidation.isValid]);

  const resetForm = () => {
    if (editProperty) {
      setFormData({
        ...editProperty,
        bedrooms: editProperty?.bedrooms?.toString(),
        bathrooms: editProperty?.bathrooms?.toString(),
        square_footage: editProperty?.square_footage?.toString(),
        year_built: editProperty?.year_built?.toString(),
        monthly_rent: editProperty?.monthly_rent?.toString(),
        security_deposit: editProperty?.security_deposit?.toString(),
      });
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        property_type: 'Apartment',
        bedrooms: '1',
        bathrooms: '1',
        square_footage: '',
        year_built: '',
        monthly_rent: '',
        security_deposit: '',
        is_available: true,
        furnished: false,
        parking: false,
        elevator: false,
        description: '',
        images: [],
        tenant_id: '',
        tenant_name: '',
      });
    }
    setFormErrors({});
    setTenantValidation({
      isValidating: false,
      isValid: null,
      tenantInfo: null,
      error: null
    });
  };

  const validateTenant = async (tenantId) => {
    if (!tenantId.trim()) {
      setTenantValidation({
        isValidating: false,
        isValid: null,
        tenantInfo: null,
        error: null
      });
      return;
    }

    setTenantValidation(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const result = await dispatch(validateTenantIdSimple(tenantId)).unwrap();
      
      console.log('✅ Tenant validation result:', result);
      
      if (result.isValid) {
        setTenantValidation({
          isValidating: false,
          isValid: true,
          tenantInfo: result.tenantInfo,
          error: null
        });
        
        if (result.tenantInfo.name) {
          setFormData(prev => ({ ...prev, tenant_name: result.tenantInfo.name }));
        }
      } else {
        setTenantValidation({
          isValidating: false,
          isValid: false,
          tenantInfo: null,
          error: result.message || 'Invalid tenant ID format'
        });
      }
    } catch (error) {
      console.error('❌ Tenant validation error:', error);
      
      setTenantValidation({
        isValidating: false,
        isValid: false,
        tenantInfo: null,
        error: error.message || 'Failed to validate tenant ID'
      });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.tenant_id !== (editProperty?.tenant_id || '')) {
        validateTenant(formData.tenant_id);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.tenant_id]);

  const convertToBase64 = (uri) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        const reader = new FileReader();
        reader.onloadend = function() {
          resolve(reader.result.split(',')[1]);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open('GET', uri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const showImagePicker = () => {
    RNAlert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
    };

    launchCamera(options, handleImageResponse);
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
      selectionLimit: 5 - formData.images.length,
    };

    launchImageLibrary(options, handleImageResponse);
  };

  const handleImageResponse = async (response) => {
    if (response.didCancel || response.error) return;

    try {
      const newImages = [];
      const assets = response.assets || [response];
      
      for (const asset of assets) {
        if (asset.uri) {
          const base64 = await convertToBase64(asset.uri);
          newImages.push(base64);
        }
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages].slice(0, 5)
      }));
    } catch (error) {
      console.error('Error converting image to base64:', error);
      RNAlert.alert('Error', 'Failed to process image');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Property name is required';
    }

    if (formData.monthly_rent && isNaN(parseFloat(formData.monthly_rent))) {
      errors.monthly_rent = 'Monthly rent must be a valid number';
    }

    if (formData.security_deposit && isNaN(parseFloat(formData.security_deposit))) {
      errors.security_deposit = 'Security deposit must be a valid number';
    }

    if (formData.square_footage && isNaN(parseInt(formData.square_footage))) {
      errors.square_footage = 'Square footage must be a valid number';
    }

    if (formData.year_built && (isNaN(parseInt(formData.year_built)) || parseInt(formData.year_built) < 1800 || parseInt(formData.year_built) > new Date().getFullYear())) {
      errors.year_built = 'Year built must be a valid year';
    }

    if (formData.zip_code && formData.zip_code.length > 0 && !/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
      errors.zip_code = 'Zip code must be in format 12345 or 12345-6789';
    }

    if (formData.tenant_id && !tenantValidation.isValid) {
      errors.tenant_id = tenantValidation.error || 'Please enter a valid tenant ID';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const generatePropertyId = () => {
    return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async () => {
    if (!authToken || !landlordId) {
      RNAlert.alert('Authentication Error', 'Please login again to continue');
      return;
    }

    if (!validateForm()) return;

    const propertyId = isEditMode ? (editProperty.id || editProperty.ID) : generatePropertyId();

    const propertyPayload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      zip_code: formData.zip_code.trim(),
      property_type: formData.property_type,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      square_footage: formData.square_footage || null,
      year_built: formData.year_built || null,
      monthly_rent: formData.monthly_rent || null,
      security_deposit: formData.security_deposit || null,
      is_available: !formData.tenant_id?.trim(),
      furnished: formData.furnished,
      parking: formData.parking,
      elevator: formData.elevator,
      description: formData.description.trim(),
      images: formData.images,
      tenant_id: formData.tenant_id?.trim() || null,
      tenant_name: formData.tenant_name?.trim() || null,
      landlord_id: landlordId,
      owner_id: landlordId,
      user_id: landlordId,
      created_at: isEditMode ? editProperty.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: isEditMode ? editProperty.created_by : landlordId,
      updated_by: landlordId,
    };

    if (isEditMode) {
      propertyPayload.id = propertyId;
      propertyPayload.ID = propertyId;
    }

    console.log('🏠 Submitting property:', {
      isEditMode,
      propertyId,
      propertyName: propertyPayload.name,
      tenantId: propertyPayload.tenant_id,
      isAvailable: propertyPayload.is_available,
      landlordId: propertyPayload.landlord_id
    });

    try {
      let result;
      
      if (isEditMode) {
        result = await dispatch(updateProperty({
          propertyId: propertyId,
          propertyData: propertyPayload,
          token: authToken,
          landlordId: landlordId
        })).unwrap();
        
        console.log('✅ Property updated successfully');
      } else {
        result = await dispatch(createProperty({
          propertyData: propertyPayload,
          token: authToken,
          landlordId: landlordId
        })).unwrap();
        
        console.log('✅ Property created successfully');
      }

      const tenantAssignmentMessage = formData.tenant_id?.trim()
        ? ` and assigned to tenant ${formData.tenant_name || formData.tenant_id}`
        : '';
        
      RNAlert.alert(
        'Success',
        `Property ${isEditMode ? 'updated' : 'created'} successfully${tenantAssignmentMessage}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              if (onClose) {
                onClose();
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Failed to save property:', error);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      RNAlert.alert('Error', errorMessage);
    }
  };

  const handleSubmitTenant = async () => {
    if (!validateForm()) return;

    if (formData.tenant_id && tenantValidation.isValid) {
      const tenantName = tenantValidation.tenantInfo?.name || formData.tenant_id;
      RNAlert.alert(
        'Confirm Tenant Assignment',
        `Are you sure you want to assign "${tenantName}" to this property?\n\nThis will mark the property as occupied.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Assign', onPress: () => handleSubmit() }
        ]
      );
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    const originalData = {
      name: editProperty?.name || '',
      address: editProperty?.address || '',
      city: editProperty?.city || '',
      state: editProperty?.state || '',
      zip_code: editProperty?.zip_code || '',
      property_type: editProperty?.property_type || 'Apartment',
      bedrooms: editProperty?.bedrooms?.toString() || '1',
      bathrooms: editProperty?.bathrooms?.toString() || '1',
      square_footage: editProperty?.square_footage?.toString() || '',
      year_built: editProperty?.year_built?.toString() || '',
      monthly_rent: editProperty?.monthly_rent?.toString() || '',
      security_deposit: editProperty?.security_deposit?.toString() || '',
      is_available: editProperty?.is_available ?? true,
      furnished: editProperty?.furnished ?? false,
      parking: editProperty?.parking ?? false,
      elevator: editProperty?.elevator ?? false,
      description: editProperty?.description || '',
      images: editProperty?.images || [],
      tenant_id: editProperty?.tenant_id || '',
      tenant_name: editProperty?.tenant_name || '',
    };

    if (JSON.stringify(formData) !== JSON.stringify(originalData)) {
      RNAlert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            onPress: () => {
              if (onClose) {
                onClose();
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );
    } else {
      if (onClose) {
        onClose();
      } else {
        navigation.goBack();
      }
    }
  };

  const renderImageItem = ({ item, index }) => (
    <Box mr={3} position="relative">
      <Image
        source={{ uri: `data:image/jpeg;base64,${item}` }}
        alt={`Property image ${index + 1}`}
        size="lg"
        rounded="md"
      />
      <Pressable
        position="absolute"
        top={1}
        right={1}
        bg="red.500"
        rounded="full"
        p={1}
        onPress={() => removeImage(index)}
      >
        <Ionicons name="close" size={12} color="white" />
      </Pressable>
    </Box>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Container>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <VStack space={4} p={4}>
            {/* Header */}
            <HStack alignItems="center" justifyContent="space-between" mb={2}>
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                {isEditMode ? 'Edit Property' : 'Add New Property'}
              </Text>
              <Pressable onPress={handleBack}>
                <Ionicons name="close" size={28} color="#666" />
              </Pressable>
            </HStack>

            {/* Property Name */}
            <Box bg="white" p={4} rounded="xl" shadow={2}>
              <FormControl isRequired isInvalid={!!formErrors.name}>
                <FormControl.Label>
                  <HStack alignItems="center" space={2}>
                    <Ionicons name="home-outline" size={18} color="#666" />
                    <Text fontSize="md" bold>
                      Property Name
                    </Text>
                  </HStack>
                </FormControl.Label>
                <Input
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  placeholder="Enter property name"
                  _focus={{ borderColor: 'blue.500' }}
                />
                {formErrors.name && (
                  <FormControl.ErrorMessage>
                    <Text>{formErrors.name}</Text>
                  </FormControl.ErrorMessage>
                )}
              </FormControl>
            </Box>

            {/* Property Images */}
            <Box bg="white" p={4} rounded="xl" shadow={2}>
              <VStack space={4}>
                <HStack alignItems="center" space={2} mb={2}>
                  <Ionicons name="camera-outline" size={18} color="#666" />
                  <Text fontSize="md" bold color="gray.700">
                    Property Images
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    ({formData.images.length}/5)
                  </Text>
                </HStack>

                {formData.images.length > 0 && (
                  <FlatList
                    data={formData.images}
                    renderItem={renderImageItem}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                )}

                <Button
                  variant="outline"
                  colorScheme="blue"
                  onPress={showImagePicker}
                  isDisabled={formData.images.length >= 5}
                  leftIcon={
                    <Ionicons
                      name="add-outline"
                      size={18}
                      color="#3182ce"
                    />
                  }
                >
                  <Text>Add Images</Text>
                </Button>
              </VStack>
            </Box>

            {/* Address Information */}
            <Box bg="white" p={4} rounded="xl" shadow={2}>
              <VStack space={4}>
                <HStack alignItems="center" space={2} mb={2}>
                  <Ionicons name="location-outline" size={18} color="#666" />
                  <Text fontSize="md" bold color="gray.700">
                    Address Information
                  </Text>
                </HStack>

                <FormControl>
                  <FormControl.Label>
                    <Text>Street Address</Text>
                  </FormControl.Label>
                  <Input
                    value={formData.address}
                    onChangeText={(text) => handleInputChange('address', text)}
                    placeholder="Enter street address"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </FormControl>

                <HStack space={3}>
                  <FormControl flex={2}>
                    <FormControl.Label>
                      <Text>City</Text>
                    </FormControl.Label>
                    <Input
                      value={formData.city}
                      onChangeText={(text) => handleInputChange('city', text)}
                      placeholder="City"
                      _focus={{ borderColor: 'blue.500' }}
                    />
                  </FormControl>
                  <FormControl flex={1}>
                    <FormControl.Label>
                      <Text>State</Text>
                    </FormControl.Label>
                    <Input
                      value={formData.state}
                      onChangeText={(text) => handleInputChange('state', text)}
                      placeholder="State"
                      _focus={{ borderColor: 'blue.500' }}
                    />
                  </FormControl>
                </HStack>

                <FormControl isInvalid={!!formErrors.zip_code}>
                  <FormControl.Label>
                    <Text>Zip Code</Text>
                  </FormControl.Label>
                  <Input
                    value={formData.zip_code}
                    onChangeText={(text) =>
                      handleInputChange('zip_code', text)
                    }
                    placeholder="12345"
                    keyboardType="numeric"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                  {formErrors.zip_code && (
                    <FormControl.ErrorMessage>
                      <Text>{formErrors.zip_code}</Text>
                    </FormControl.ErrorMessage>
                  )}
                </FormControl>
              </VStack>
            </Box>

            {/* Property Details */}
            <Box bg="white" p={4} rounded="xl" shadow={2}>
              <VStack space={4}>
                <HStack alignItems="center" space={2} mb={2}>
                  <Ionicons name="business-outline" size={18} color="#666" />
                  <Text fontSize="md" bold color="gray.700">
                    Property Details
                  </Text>
                </HStack>

                <FormControl>
                  <FormControl.Label>
                    <Text>Property Type</Text>
                  </FormControl.Label>
                  <Select
                    selectedValue={formData.property_type}
                    onValueChange={(value) =>
                      handleInputChange('property_type', value)
                    }
                    _selectedItem={{
                      bg: 'blue.100',
                      endIcon: <CheckIcon size="5" />,
                    }}
                  >
                    <Select.Item label="Apartment" value="Apartment" />
                    <Select.Item label="House" value="House" />
                    <Select.Item label="Condo" value="Condo" />
                    <Select.Item label="Townhouse" value="Townhouse" />
                    <Select.Item label="Studio" value="Studio" />
                    <Select.Item label="Villa" value="Villa" />
                  </Select>
                </FormControl>

                <HStack space={3}>
                  <FormControl flex={1}>
                    <FormControl.Label>
                      <Text>Bedrooms</Text>
                    </FormControl.Label>
                    <Select
                      selectedValue={formData.bedrooms}
                      onValueChange={(value) =>
                        handleInputChange('bedrooms', value)
                      }
                      _selectedItem={{
                        bg: 'blue.100',
                        endIcon: <CheckIcon size="5" />,
                      }}
                    >
                      <Select.Item label="Studio" value="0" />
                      <Select.Item label="1 BHK" value="1" />
                      <Select.Item label="2 BHK" value="2" />
                      <Select.Item label="3 BHK" value="3" />
                    </Select>
                  </FormControl>

                  <FormControl flex={1}>
                    <FormControl.Label>
                      <Text>Bathrooms</Text>
                    </FormControl.Label>
                    <Select
                      selectedValue={formData.bathrooms}
                      onValueChange={(value) =>
                        handleInputChange('bathrooms', value)
                      }
                      _selectedItem={{
                        bg: 'blue.100',
                        endIcon: <CheckIcon size="5" />,
                      }}
                    >
                      <Select.Item label="1" value="1" />
                      <Select.Item label="2" value="2" />
                      <Select.Item label="3" value="3" />
                    </Select>
                  </FormControl>
                </HStack>

                <HStack space={3}>
                  <FormControl flex={1}>
                    <FormControl.Label>
                      <Text>Area (sq ft)</Text>
                    </FormControl.Label>
                    <Input
                      value={formData.square_footage}
                      onChangeText={(text) =>
                        handleInputChange('square_footage', text)
                      }
                      placeholder="1000"
                      keyboardType="numeric"
                      _focus={{ borderColor: 'blue.500' }}
                    />
                  </FormControl>

                  <FormControl flex={1}>
                    <FormControl.Label>
                      <Text>Year Built</Text>
                    </FormControl.Label>
                    <Input
                      value={formData.year_built}
                      onChangeText={(text) =>
                        handleInputChange('year_built', text)
                      }
                      placeholder="2020"
                      keyboardType="numeric"
                      _focus={{ borderColor: 'blue.500' }}
                    />
                  </FormControl>
                </HStack>
              </VStack>
            </Box>

            {/* Pricing */}
            <Box bg="white" p={4} rounded="xl" shadow={2}>
              <VStack space={4}>
                <HStack alignItems="center" space={2}>
                  <Ionicons name="cash-outline" size={18} color="#666" />
                  <Text fontSize="md" bold>
                    Pricing
                  </Text>
                </HStack>

                <FormControl>
                  <FormControl.Label>
                    <Text>Monthly Rent</Text>
                  </FormControl.Label>
                  <Input
                    value={formData.monthly_rent}
                    onChangeText={(text) =>
                      handleInputChange('monthly_rent', text)
                    }
                    placeholder="25000"
                    keyboardType="numeric"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </FormControl>

                <FormControl>
                  <FormControl.Label>
                    <Text>Security Deposit</Text>
                  </FormControl.Label>
                  <Input
                    value={formData.security_deposit}
                    onChangeText={(text) =>
                      handleInputChange('security_deposit', text)
                    }
                    placeholder="50000"
                    keyboardType="numeric"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </FormControl>
              </VStack>
            </Box>

              {/* Amenities */}
              <Box bg="white" p={4} rounded="xl" shadow={2}>
                <VStack space={4}>
                  <HStack alignItems="center" space={2}>
                    <Ionicons name="star-outline" size={18} color="#666" />
                    <Text fontSize="md" bold>
                      Amenities
                    </Text>
                  </HStack>

                  <HStack justifyContent="space-between">
                    <HStack alignItems="center" space={2}>
                      <Ionicons name="bed-outline" size={16} color="#666" />
                      <Text>Furnished</Text>
                    </HStack>
                    <Switch
                      value={formData.furnished}
                      onToggle={(v) => handleInputChange('furnished', v)}
                      colorScheme="blue"
                    />
                  </HStack>

                  <HStack justifyContent="space-between">
                    <HStack alignItems="center" space={2}>
                      <Ionicons name="car-outline" size={16} color="#666" />
                      <Text>Parking Available</Text>
                    </HStack>
                    <Switch
                      value={formData.parking}
                      onToggle={(v) => handleInputChange('parking', v)}
                      colorScheme="blue"
                    />
                  </HStack>

                  <HStack justifyContent="space-between">
                    <HStack alignItems="center" space={2}>
                      <Ionicons name="arrow-up-outline" size={16} color="#666" />
                      <Text>Elevator/Lift</Text>
                    </HStack>
                    <Switch
                      value={formData.elevator}
                      onToggle={(v) => handleInputChange('elevator', v)}
                      colorScheme="blue"
                    />
                  </HStack>
                </VStack>
              </Box>

              {/* Availability */}
              <Box bg="white" p={4} rounded="xl" shadow={2}>
                <FormControl>
                  <FormControl.Label>
                    <HStack alignItems="center" space={2}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#666"
                      />
                      <Text fontSize="md" bold>
                        Availability Status
                      </Text>
                    </HStack>
                  </FormControl.Label>
                  <Select
                    selectedValue={formData.is_available.toString()}
                    onValueChange={(v) =>
                      handleInputChange('is_available', v === 'true')
                    }
                    _selectedItem={{
                      bg: 'blue.100',
                      endIcon: <CheckIcon size="5" />,
                    }}
                  >
                    <Select.Item label="Available for Rent" value="true" />
                    <Select.Item label="Currently Occupied" value="false" />
                  </Select>
                </FormControl>
              </Box>

              {/* Tenant Assignment */}
              <Box bg="white" p={4} rounded="xl" shadow={2}>
                <VStack space={4}>
                  <HStack alignItems="center" space={2}>
                    <Ionicons name="person-outline" size={18} color="#666" />
                    <Text fontSize="md" bold>
                      Tenant Assignment
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      (Optional)
                    </Text>
                  </HStack>

                  <FormControl>
                    <FormControl.Label>
                      <Text>Tenant ID</Text>
                    </FormControl.Label>
                    <HStack alignItems="center" space={2}>
                      <Input
                        flex={1}
                        value={formData.tenant_id}
                        onChangeText={(text) =>
                          handleInputChange('tenant_id', text)
                        }
                        placeholder="Enter tenant ID"
                        _focus={{ borderColor: 'blue.500' }}
                      />
                      {tenantValidation.isValidating && (
                        <Spinner size="sm" color="blue.500" />
                      )}
                      {tenantValidation.isValid === true && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#10b981"
                        />
                      )}
                      {tenantValidation.isValid === false && (
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#ef4444"
                        />
                      )}
                    </HStack>
                  </FormControl>

                  {formData.tenant_id ? (
                    <Box bg="blue.50" p={3} rounded="md">
                      <Text fontSize="sm" color="blue.700">
                        Assigning a tenant will automatically mark this property
                        as occupied.
                      </Text>
                    </Box>
                  ) : null}
                </VStack>
              </Box>

               {/* Description */}
          <Box bg="white" p={4} rounded="xl" shadow={2}>
            <FormControl>
              <FormControl.Label>
                <HStack alignItems="center" space={2}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#666"
                  />
                  <Text fontSize="md" bold>
                    Description (Optional)
                  </Text>
                </HStack>
              </FormControl.Label>
              <Input
                value={formData.description}
                onChangeText={(text) =>
                  handleInputChange('description', text)
                }
                placeholder="Enter description"
                _focus={{ borderColor: 'blue.500' }}
              />
            </FormControl>
          </Box>

        </VStack>
      </ScrollView>
    </Container>
  </KeyboardAvoidingView>
);
}
export default AddPropertiesScreen;



    .......................@GKInspectable


import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { RefreshControl, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-simple-toast';
import {
  View, Box, Text, VStack, HStack, Button, Badge,
  Spinner, Pressable, Image,
} from 'native-base';
import Modal from 'react-native-modal';
import { Colors } from '../../Theme';
import { getLandlordProperties, deleteProperty } from '../../Redux/Properties/services';
import { propertiesSelectors } from '../../Redux/Properties/propertiesSlice';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Container from '../../components/Container/Container';
import PropertyFilters from '../../components/PropertyFilters/PropertyFilters';
import AddPropertiesScreen from './AddPropertiesScreen';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";

// Property Card Component
const PropertyCard = React.memo(({ property, onViewDetails, onEdit, onDelete, onToggleFavorite, isFavorite }) => {
  const propertyInfo = useMemo(() => ({
    bedrooms: property?.bedrooms || 'N/A',
    tenants: property?.number_of_tenants || '03',
    rent: property?.monthly_rent ? `$${property.monthly_rent}` : '$2600',
  }), [property]);

  const address = useMemo(() => {
    const parts = [];
    if (property?.address) parts.push(property.address);
    if (property?.city) parts.push(property.city);
    if (property?.state) parts.push(`(${property.state})`);
    if (property?.zip_code) parts.push(property.zip_code);
    return parts.join(', ') || '909-1/2 E 49th LA, (CA), 90011';
  }, [property]);

  const renderPropertyImage = useMemo(() => {
    try {
      if (!property?.images?.length) {
        return (
          <Image
            source={require('../../Assets/Image/empty-box.png')}
            alt="Property"
            w="100%"
            h="100%"
            resizeMode="cover"
          />
        );
      }
      const firstImage = property.images[0];
      const uri = firstImage.startsWith('data:image')
        ? firstImage
        : `data:image/jpeg;base64,${firstImage}`;
      return (
        <Image
          source={{ uri }}
          alt="Property"
          w="100%"
          h="100%"
          resizeMode="cover"
          fallbackSource={require('../../Assets/Image/empty-box.png')}
        />
      );
    } catch {
      return (
        <Image
          source={require('../../Assets/Image/empty-box.png')}
          alt="Property"
          w="100%"
          h="100%"
          resizeMode="cover"
        />
      );
    }
  }, [property?.images]);

  const propertyId = property?.id || property?.ID;

  return (
    <Pressable onPress={() => onViewDetails(property)} mb={4}>
      <Box bg="white" rounded="2xl" overflow="hidden" shadow={3} style={styles.cardShadow}>
        <Box position="relative" h={hp(20)}>
          {renderPropertyImage}
          <Pressable
            position="absolute"
            top={3}
            right={3}
            bg="white"
            rounded="full"
            p={2}
            shadow={2}
            onPress={() => onToggleFavorite(propertyId)}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#E53935' : '#666'}
            />
          </Pressable>
          
          <Box
            position="absolute"
            bottom={3}
            left={3}
            bg={property?.is_available ? 'green.500' : 'orange.500'}
            px={3}
            py={1}
            rounded="full"
          >
            <Text fontSize="xs" fontWeight="600" color="white">
              {property?.is_available ? 'Vacant' : 'Occupied'}
            </Text>
          </Box>
        </Box>

        <VStack p={4} space={3}>
          <VStack space={1}>
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              {property?.property_type || 'Apartment'}
            </Text>
            <Text fontSize="sm" color="gray.500" numberOfLines={1}>
              {address}
            </Text>
          </VStack>

          <HStack justifyContent="space-between" alignItems="center">
            <VStack>
              <Text fontSize="xs" color="gray.500">No. Tenant</Text>
              <Text fontSize="md" fontWeight="bold" color="gray.800">
                {propertyInfo.tenants}
              </Text>
            </VStack>
            <VStack>
              <Text fontSize="xs" color="gray.500">Rent</Text>
              <Text fontSize="md" fontWeight="bold" color="gray.800">
                {propertyInfo.rent}/month
              </Text>
            </VStack>
          </HStack>

          <HStack space={2} mt={2}>
            <Button
              flex={1}
              bg="#E53935"
              rounded="lg"
              _pressed={{ bg: "#C62828" }}
              onPress={() => onViewDetails(property)}
              _text={{ fontSize: "sm", fontWeight: "600" }}
            >
              View Details
            </Button>
            <Button variant="ghost" rounded="lg" p={2} onPress={() => onEdit(property)}>
              <MaterialIcons name="edit" size={20} color="#666" />
            </Button>
            <Button variant="ghost" rounded="lg" p={2} onPress={() => onDelete(propertyId)}>
              <MaterialIcons name="delete-outline" size={20} color="#E53935" />
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );
});

// Tenant Card Component
const TenantCard = React.memo(({ tenant }) => {
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid': return 'green.500';
      case 'pending': return 'orange.500';
      case 'overdue': return 'red.500';
      case 'in progress': return 'blue.500';
      default: return 'gray.500';
    }
  };

  return (
    <Pressable mb={4}>
      <Box bg="white" rounded="2xl" overflow="hidden" shadow={3} style={styles.cardShadow}>
        <HStack p={4} space={3} alignItems="center">
          <Box
            w={12}
            h={12}
            rounded="full"
            bg="gray.200"
            justifyContent="center"
            alignItems="center"
            overflow="hidden"
          >
            {tenant?.avatar ? (
              <Image
                source={{ uri: tenant.avatar }}
                alt={tenant?.name}
                w="100%"
                h="100%"
                resizeMode="cover"
              />
            ) : (
              <Text fontSize="xl" fontWeight="bold" color="gray.600">
                {tenant?.name?.charAt(0) || 'T'}
              </Text>
            )}
          </Box>

          <VStack flex={1} space={1}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              {tenant?.name || 'N/A'}
            </Text>
            <Text fontSize="sm" color="gray.500" numberOfLines={1}>
              {tenant?.address || '909-1/2 E 49th LA, (CA)..'}
            </Text>
          </VStack>

          <Badge
            bg={getStatusColor(tenant?.status)}
            rounded="lg"
            px={3}
            py={1}
            _text={{
              fontSize: "xs",
              fontWeight: "600",
              color: "white"
            }}
          >
            {tenant?.status || 'Pending'}
          </Badge>
        </HStack>
      </Box>
    </Pressable>
  );
});

// Statistics Header Component
const StatisticsHeader = React.memo(({ totalProperties, totalUnits, monthlyIncome, totalTenants }) => (
  <View style={styles.glassCard}>
    <Box style={styles.glassCardInner}>
      <HStack justifyContent="space-around" mb={hp(2)}>
        <VStack alignItems="center" flex={1}>
          <HStack alignItems="center" space={2}>
            <AppIcon name={icons.email} height={hp(2.2)} width={hp(2.2)} />
            <Text fontSize={hp(2.5)} bold color={Colors.black}>02</Text>
          </HStack>
          <Text fontSize={hp(1.6)} color={Colors.textGray} mt={1}>New Request</Text>
        </VStack>

        <VStack alignItems="center" flex={1}>
          <HStack alignItems="center" space={2}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: Colors.black }}>03</Text>
          </HStack>
          <Text fontSize={hp(1.6)} color={Colors.textGray} mt={1}>In Progress</Text>
        </VStack>

        <VStack alignItems="center" flex={1}>
          <HStack alignItems="center" space={2}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: Colors.black }}>05</Text>
          </HStack>
          <Text fontSize={hp(1.6)} color={Colors.textGray} mt={1}>Completed</Text>
        </VStack>
      </HStack>
    </Box>
  </View>
));

// Main Component
const LandlordProperties = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editPropertyData, setEditPropertyData] = useState(null);

  // Safe Redux data
  const propertiesData = useSelector(propertiesSelectors.getPropertiesData) || {};
  const {
    landlordProperties = [],
    loading = false,
    error = null,
    totalProperties = 0,
    totalUnits = 0,
    occupiedUnits = 0,
    vacantUnits = 0,
  } = propertiesData;

  // Auth safe fetch
  const authData = useSelector(state => state?.loginData || state?.login || {});
  const authToken = authData?.token || null;
  const landlordId = authData?.userData?.landlordId || authData?.user?.landlordId || null;

  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('properties');
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedTenantStatus, setSelectedTenantStatus] = useState('all'); // ✅ MOVED HERE

  const isAuthenticated = Boolean(landlordId && authToken);
  const hasProperties = landlordProperties.length > 0;

  // ✅ Mock tenant data - MOVED TO COMPONENT LEVEL
  const mockTenants = useMemo(() => [
    {
      id: 1,
      name: 'Sarah James',
      address: '909-1/2 E 49th LA',
      status: 'In Progress',
      avatar: null,
    },
    {
      id: 2,
      name: 'Peter Robinson',
      address: '909-1/2 E 49th LA',
      status: 'Overdue',
      avatar: null,
    },
    {
      id: 3,
      name: 'Henry Cooper',
      address: '909-1/2 E 49th LA, (CA)..',
      status: 'Pending',
      avatar: null,
    },
    {
      id: 4,
      name: 'Lucy Chang',
      address: '909-1/2 E 49th LA, (CA)..',
      status: 'Overdue',
      avatar: null,
    },
    {
      id: 5,
      name: 'Nathalie R.',
      address: '909-1/2 E 49th LA, (CA)..',
      status: 'Paid',
      avatar: null,
    },
  ], []);

  // Load properties safely
  useEffect(() => {
    if (landlordId && authToken) {
      dispatch(getLandlordProperties({ landlordId, token: authToken }));
    }
  }, [dispatch, landlordId, authToken]);

  const handleRefresh = useCallback(() => {
    if (isAuthenticated) {
      dispatch(getLandlordProperties({ landlordId, token: authToken }));
    } else {
      Toast.show('Please login again');
    }
  }, [dispatch, landlordId, authToken, isAuthenticated]);

  const handleAddProperty = () => {
    console.log('✅ Opening Add Property Modal');
    setEditPropertyData(null);
    setShowModal(true);
  };

  const handleViewDetails = property => {
    console.log('✅ Navigating to PropertiesDetails with:', property);
    navigation.navigate('PropertiesDetails', { property });
  };

  const handleEdit = property => {
    console.log('✅ Opening Edit Property Modal');
    setEditPropertyData(property);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditPropertyData(null);
    handleRefresh();
  };

  const handleDeleteProperty = async propertyId => {
    if (!isAuthenticated) return Toast.show('Please login again');
    try {
      await dispatch(deleteProperty({ propertyId, token: authToken, landlordId })).unwrap();
      Toast.show('Property deleted successfully');
      handleRefresh();
    } catch (err) {
      console.error('Delete property error:', err);
      Toast.show(err?.message || 'Failed to delete property');
    }
  };

  const handleToggleFavorite = id => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Calculate property type counts
  const propertyTypeCounts = useMemo(() => {
    return landlordProperties.reduce((acc, prop) => {
      const type = prop?.property_type || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }, [landlordProperties]);

  // Calculate vacant and occupied counts
  const availabilityCounts = useMemo(() => {
    const vacant = landlordProperties.filter(p => p?.is_available).length;
    const occupied = landlordProperties.length - vacant;
    return { vacant, occupied };
  }, [landlordProperties]);

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = landlordProperties.filter(prop => {
      const typeMatch = selectedPropertyType === 'all' || prop?.property_type === selectedPropertyType;
      const availMatch =
        selectedAvailability === 'all' ||
        (selectedAvailability === 'vacant' && prop?.is_available) ||
        (selectedAvailability === 'occupied' && !prop?.is_available);
      return typeMatch && availMatch;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.monthly_rent || 0) - (b.monthly_rent || 0);
        case 'price_desc':
          return (b.monthly_rent || 0) - (a.monthly_rent || 0);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'recent':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

    return sorted;
  }, [landlordProperties, selectedPropertyType, selectedAvailability, sortBy]);

  // ✅ Filter tenants by status
  const filteredTenants = useMemo(() => {
    if (selectedTenantStatus === 'all') return mockTenants;
    return mockTenants.filter(t => t.status.toLowerCase() === selectedTenantStatus.toLowerCase());
  }, [selectedTenantStatus, mockTenants]);

  // UI Conditions
  if (loading && !hasProperties)
    return <Container><Box flex={1} justifyContent="center" alignItems="center"><Spinner color="#E53935" /><Text mt={4}>Loading...</Text></Box></Container>;

  if (!isAuthenticated)
    return <Container><Box flex={1} justifyContent="center" alignItems="center"><MaterialIcons name="lock-outline" size={64} color="#E53935" /><Text mt={4}>Please login to continue</Text><Button mt={4} bg="#E53935" onPress={() => navigation.navigate('Login')}>Login</Button></Box></Container>;

  if (error)
    return <Container><Box flex={1} justifyContent="center" alignItems="center"><MaterialIcons name="error-outline" size={64} color="#E53935" /><Text mt={4}>Error loading properties</Text><Button mt={4} bg="#E53935" onPress={handleRefresh}>Retry</Button></Box></Container>;

  return (
    <Container>
      <FlatList
        data={activeTab === 'properties' ? filteredAndSortedProperties : filteredTenants}
        keyExtractor={(item, index) => String(item?.id || item?.ID || index)}
        renderItem={({ item }) => (
          activeTab === 'properties' ? (
            <PropertyCard
              property={item}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDeleteProperty}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={favorites.includes(item?.id || item?.ID)}
            />
          ) : (
            <TenantCard tenant={item} />
          )
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor="#E53935"
            colors={["#E53935"]}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ListHeaderComponent={
          <VStack space={4} mb={4}>
            <StatisticsHeader
              totalProperties={totalProperties}
              totalUnits={totalUnits}
              monthlyIncome="$5.7K"
              totalTenants={occupiedUnits}
            />
            
            {/* Tab Switcher */}
            <Box
              width={370}
              height={50}
              borderRadius={100}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.3)"
              bg="rgba(255,255,255,0.7)"
              flexDirection="row"
              alignSelf="center"
              overflow="hidden"
              mb={4}
            >
              <Box
                position="absolute"
                top={0}
                left={activeTab === 'properties' ? 0 : '50%'}
                width="50%"
                height="100%"
                bg="#E53935"
                borderRadius={100}
              />

              {[
                { key: 'properties', label: 'Properties', count: totalProperties },
                { key: 'tenants', label: 'Tenants', count: mockTenants.length },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    flex={1}
                    onPress={() => setActiveTab(tab.key)}
                    style={{ justifyContent: 'center', alignItems: 'center' }}
                  >
                    <HStack alignItems="center" space={1}>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color={isActive ? "white" : "gray.600"}
                      >
                        {tab.label}
                      </Text>
                      <Badge
                        bg={isActive ? "black" : "gray.300"}
                        rounded="full"
                        px={3}
                        _text={{
                          fontSize: "xs",
                          fontWeight: "bold",
                          color: isActive ? "#E53935" : "gray.600"
                        }}
                      >
                        {tab.count}
                      </Badge>
                    </HStack>
                  </Pressable>
                );
              })}
            </Box>

            {/* Conditional Filters */}
            {activeTab === 'properties' ? (
              <PropertyFilters
                selectedPropertyType={selectedPropertyType}
                onPropertyTypeChange={setSelectedPropertyType}
                selectedAvailability={selectedAvailability}
                onAvailabilityChange={setSelectedAvailability}
                propertyTypeCounts={propertyTypeCounts}
                vacantCount={availabilityCounts.vacant}
                occupiedCount={availabilityCounts.occupied}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            ) : (
              <HStack mx={wp(4.5)} space={wp(2)}>
                <TouchableOpacity
                  onPress={() => {/* Open tenant filter modal */}}
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                >
                  <View style={styles.glassCard}>
                    <Box style={styles.filterButtonInner}>
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text fontSize={hp(1.8)} fontWeight="500" color="gray.700">
                          All Tenants
                        </Text>
                        <AppIcon name={icons.arrowDown} size={wp(4)} color={Colors.black} />
                      </HStack>
                    </Box>
                  </View>
                </TouchableOpacity>
              </HStack>
            )}
          </VStack>
        }
        ListEmptyComponent={
          <Box alignItems="center" justifyContent="center" py={10}>
            <MaterialIcons
              name={activeTab === 'properties' ? "home-work" : "people-outline"}
              size={80}
              color="#E0E0E0"
            />
            <Text fontSize="lg" color="gray.500" mt={4}>
              {activeTab === 'properties' ? 'No properties found' : 'No tenants found'}
            </Text>
          </Box>
        }
      />

      <TouchableOpacity
        style={styles.fabButton}
        onPress={handleAddProperty}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        isVisible={showModal}
        onBackdropPress={handleCloseModal}
        style={{ margin: 0 }}
        animationIn="slideInRight"
        animationOut="slideOutRight"
        backdropOpacity={0.5}
      >
        <AddPropertiesScreen
          onClose={handleCloseModal}
          propertyData={editPropertyData}
        />
      </Modal>
    </Container>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fabText: {
    color: 'white',
    fontSize: 28,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  glassCardInner: { padding: hp(2) },
  filterButtonInner: {
    padding: hp(1.8),
  },
});

export default LandlordProperties;



