import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { Linking } from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';

const PROPERTIES_API_URL = 'https://70q2ntiu1f.execute-api.us-east-1.amazonaws.com/prod/properties';

const GEOCODING_BASE_URL = Config.GOOGLE_MAPS_BASE_URL;
const GEOCODING_API_KEY  = Config.GOOGLE_MAPS_API_KEY;

const S3_BASE_URL = 'https://dp-properties.s3.us-east-1.amazonaws.com';

// ─────────────────────────────────────────────────────────────
// ✅ FIXED: Helper to build a full S3 URL from whatever the
//    backend returns (string key, object with .url, full URL)
// ─────────────────────────────────────────────────────────────
const toFullImageUrl = (photo) => {
  if (!photo) return null;
  // Already an object with a url field
  if (typeof photo === 'object' && photo.url) {
    const url = photo.url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${S3_BASE_URL}/${url}`;
  }
  // Plain string
  if (typeof photo === 'string') {
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    if (photo.startsWith('data:')) return photo; // base64 – keep as-is
    return `${S3_BASE_URL}/${photo}`;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────
// ✅ FIXED: Normalise a raw property object from the backend
//    so it always has a populated `image_urls` array.
// ─────────────────────────────────────────────────────────────
const normalizePropertyImages = (property) => {
  if (!property) return property;

  // Already has valid http image_urls → keep them
  if (
    Array.isArray(property.image_urls) &&
    property.image_urls.length > 0 &&
    property.image_urls[0].startsWith('http')
  ) {
    return property;
  }

  let imageUrls = [];

  // Priority 1: media.photos_preview (objects with .url)
  if (property.media?.photos_preview?.length > 0) {
    imageUrls = property.media.photos_preview
      .map(toFullImageUrl)
      .filter(Boolean);
  }

  // Priority 2: media.photos (S3 keys or full URLs)
  if (imageUrls.length === 0 && property.media?.photos?.length > 0) {
    imageUrls = property.media.photos
      .map(toFullImageUrl)
      .filter(Boolean);
  }

  // Priority 3: existing image_urls (may be S3 keys)
  if (imageUrls.length === 0 && Array.isArray(property.image_urls)) {
    imageUrls = property.image_urls
      .map(toFullImageUrl)
      .filter(Boolean);
  }

  return { ...property, image_urls: imageUrls };
};

// ─────────────────────────────────────────────────────────────
// ✅ FIXED: Used after a CREATE / UPDATE to merge backend
//    response with the sent payload and normalise images.
// ─────────────────────────────────────────────────────────────
const transformPropertyResponse = (backendResponse, propertyId, sentPayload) => {
  const propertyData =
    backendResponse.property ||
    backendResponse.item ||
    backendResponse.data ||
    backendResponse;

  const merged = {
    ...sentPayload,
    property_id: propertyId,
    ...propertyData,
  };

  // Remove any lingering base64 strings before normalising
  if (Array.isArray(merged.image_urls)) {
    merged.image_urls = merged.image_urls.filter(
      (u) => typeof u === 'string' && !u.startsWith('data:')
    );
  }

  return normalizePropertyImages(merged);
};

// ─────────────────────────────────────────────────────────────
// Image compression & base64 helpers (unchanged)
// ─────────────────────────────────────────────────────────────
const compressImage = async (localUri) => {
  try {
    console.log('🔄 Compressing image:', localUri);
    const resizedImage = await ImageResizer.createResizedImage(
      localUri,
      1200,
      1200,
      'JPEG',
      80,
      0,
      null,
      false,
      { mode: 'contain', onlyScaleDown: true }
    );
    return resizedImage.uri;
  } catch (error) {
    console.warn('⚠️ Compression failed, using original:', error);
    return localUri;
  }
};

const convertImageToBase64 = async (localUri) => {
  try {
    const compressedUri = await compressImage(localUri);
    const base64String = await RNFS.readFile(compressedUri, 'base64');
    const extension = compressedUri.split('.').pop().toLowerCase();
    const mimeType =
      extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;
    const dataUri = `data:${mimeType};base64,${base64String}`;
    console.log('✅ Converted to base64, size:', dataUri.length, '(~' + Math.round(dataUri.length / 1024) + 'KB)');
    return dataUri;
  } catch (error) {
    console.error('❌ Error converting image:', error);
    throw error;
  }
};

const processPropertyImages = async (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];

  const imagesToProcess = images.slice(0, 3);
  if (images.length > 3) {
    console.warn(`⚠️ Only processing first 3 of ${images.length} images`);
    Toast.show('Processing first 3 images only (API size limit)');
  }

  const processedImages = [];
  for (const imageUri of imagesToProcess) {
    try {
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        processedImages.push(imageUri);
      } else if (imageUri.startsWith('data:')) {
        processedImages.push(imageUri);
      } else {
        console.log('🔄 Converting local image to base64...');
        const base64Image = await convertImageToBase64(imageUri);
        processedImages.push(base64Image);
      }
    } catch (error) {
      console.error('❌ Error processing image:', imageUri, error);
      Toast.show('Warning: Some images could not be processed');
    }
  }
  return processedImages;
};

// ─────────────────────────────────────────────────────────────
// GEOCODING
// ─────────────────────────────────────────────────────────────
export const geocodeAddress = async (address) => {
  if (!address || !address.trim()) throw new Error('Address is required');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `${GEOCODING_BASE_URL}?address=${encodedAddress}&key=${GEOCODING_API_KEY}`;
    console.log('🗺️ Geocoding address:', address);

    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('🗺️ Geocoding status:', data.status);

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      return { lat: location.lat, lng: location.lng, formatted_address: result.formatted_address, isValid: true };
    }

    if (data.status === 'ZERO_RESULTS') {
      return { lat: null, lng: null, formatted_address: null, isValid: false };
    }

    throw new Error(`Geocoding API error: ${data.status}`);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Address verification timed out. Please try again.');
    throw error;
  }
};

export const openLocationInMaps = async (property) => {
  try {
    const parts = [];
    if (property.street) parts.push(property.street);
    if (property.city) parts.push(property.city);
    if (property.state) parts.push(property.state);
    if (property.zipcode) parts.push(property.zipcode);
    const address = parts.join(', ');

    if (!address.trim()) { Toast.show('No address available for this property'); return; }

    try {
      const geocodeResult = await geocodeAddress(address);
      if (geocodeResult?.lat && geocodeResult?.lng) {
        const coordinatesUrl = `https://www.google.com/maps/search/?api=1&query=${geocodeResult.lat},${geocodeResult.lng}`;
        if (await Linking.canOpenURL(coordinatesUrl)) { await Linking.openURL(coordinatesUrl); return; }
      }
    } catch (geocodeError) {
      console.warn('Geocoding failed, falling back to address search:', geocodeError);
    }

    const addressUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    if (await Linking.canOpenURL(addressUrl)) {
      await Linking.openURL(addressUrl);
    } else {
      Toast.show('Unable to open maps application');
    }
  } catch (error) {
    console.error('Error opening maps:', error);
    Toast.show('Failed to open location in maps');
  }
};

// ─────────────────────────────────────────────────────────────
// GET ALL PROPERTIES
// ─────────────────────────────────────────────────────────────
export const getProperties = createAsyncThunk(
  'properties/getProperties',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;
      if (!token) return rejectWithValue('Authentication token is required. Please login again.');

      const queryParams = new URLSearchParams();
      if (params.property_type) queryParams.append('property_type', params.property_type);
      if (params.availability) queryParams.append('availability', params.availability);

      const url = queryParams.toString() ? `${PROPERTIES_API_URL}?${queryParams}` : PROPERTIES_API_URL;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        try { data = JSON.parse(await response.text()); } catch { data = { items: [] }; }
      }

      if (response.ok) {
        const properties = data.items || data.properties || data.data || data || [];
        // ✅ FIXED: normalise images on every property
        return (Array.isArray(properties) ? properties : []).map(normalizePropertyImages);
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch')
        ? 'Network error. Please check your internet connection.'
        : err.message || 'Failed to fetch properties';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// ✅ FIXED: GET LANDLORD PROPERTIES — images now normalised
// ─────────────────────────────────────────────────────────────
export const getLandlordProperties = createAsyncThunk(
  'properties/getLandlordProperties',
  async (params, { getState, rejectWithValue }) => {
    try {
      let landlordId, token;
      if (typeof params === 'string') {
        landlordId = params;
        const state = getState();
        token = state.loginData?.accessToken || state.login?.accessToken;
      } else {
        landlordId = params.landlordId;
        token = params.token;
      }

      if (!landlordId) return rejectWithValue('Landlord ID is required');
      if (!token) return rejectWithValue('Authentication token is required. Please login again.');

      const response = await fetch(PROPERTIES_API_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        try { data = JSON.parse(await response.text()); } catch { data = { items: [] }; }
      }

      if (response.ok) {
        let properties = data?.items || data?.properties || data?.data || data || [];
        if (!Array.isArray(properties)) properties = [];

        const filteredProperties = properties.filter(
          (property) => property.landlord_id === landlordId
        );

        // ✅ FIXED: Transform media.photos / media.photos_preview → image_urls
        //    for every property so PropertyCard always has a usable URL
        return filteredProperties.map(normalizePropertyImages);

      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch')
        ? 'Network error. Please check your internet connection.'
        : err.message || 'Failed to fetch landlord properties';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET SINGLE PROPERTY
// ─────────────────────────────────────────────────────────────
export const getProperty = createAsyncThunk(
  'properties/getProperty',
  async (propertyId, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;
      if (!token) return rejectWithValue('Authentication token is required. Please login again.');

      const response = await fetch(`${PROPERTIES_API_URL}/${propertyId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        try { data = JSON.parse(await response.text()); } catch { data = { property: null }; }
      }

      if (response.ok) {
        const property = data.item || data.property || data.data || data;

        if (property?.landlord_id && !property.landlord) {
          try {
            const landlordResponse = await fetch(
              `https://70q2ntiu1f.execute-api.us-east-1.amazonaws.com/prod/landlords/${property.landlord_id}`,
              { method: 'GET', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` } }
            );
            if (landlordResponse.ok) {
              const landlordData = await landlordResponse.json();
              const landlord = landlordData.item || landlordData.landlord || landlordData.data || landlordData;
              property.landlord = {
                name: landlord.name || landlord.full_name ||
                  (landlord.firstName && landlord.lastName ? `${landlord.firstName} ${landlord.lastName}` : null),
                email: landlord.email,
                phone: landlord.phone || landlord.phoneNumber,
                full_name: landlord.full_name,
                firstName: landlord.firstName,
                lastName: landlord.lastName,
              };
              property.landlord_name = property.landlord.name;
              property.landlord_email = property.landlord.email;
              property.landlord_phone = property.landlord.phone;
            }
          } catch (landlordError) {
            console.warn('Error fetching landlord:', landlordError);
          }
        }

        // ✅ FIXED: normalise images
        return normalizePropertyImages(property);
      } else {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch property';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// CREATE PROPERTY
// ─────────────────────────────────────────────────────────────
export const createProperty = createAsyncThunk(
  'properties/createProperty',
  async (params, { rejectWithValue }) => {
    try {
      const { propertyData, token, landlordId } = params;

      if (!propertyData.name?.trim()) return rejectWithValue('Property name is required');
      if (!token) return rejectWithValue('Authentication token is required. Please login again.');
      if (!landlordId) return rejectWithValue('Landlord ID is required. Please login again.');

      console.log('🏠 Creating property with data:', propertyData);

      let processedImages = [];
      if (Array.isArray(propertyData.images) && propertyData.images.length > 0) {
        try {
          console.log(`📸 Processing ${propertyData.images.length} images...`);
          processedImages = await processPropertyImages(propertyData.images);
          console.log(`✅ Processed ${processedImages.length} images successfully`);
        } catch (error) {
          console.error('❌ Image processing failed:', error);
          Toast.show('Warning: Some images could not be processed');
        }
      }

      const selectedAmenities = Object.keys(propertyData.amenities || {})
        .filter((key) => propertyData.amenities[key] === true);

      const areaValue = propertyData.area_sqft
        ? parseInt(propertyData.area_sqft.toString().replace(/[^\d]/g, ''))
        : 0;
        
        // Use pre-verified coords if available, otherwise geocode
        let propertyLat = propertyData.lat ?? null;
        let propertyLng = propertyData.lng ?? null;

        if (!propertyLat || !propertyLng) {
          try {
            const fullAddress = [propertyData.street, propertyData.city,
              propertyData.state, propertyData.zip_code].filter(Boolean).join(', ');
            if (fullAddress.trim()) {
              const geoResult = await geocodeAddress(fullAddress);
              if (geoResult?.isValid) {
                propertyLat = geoResult.lat;
                propertyLng = geoResult.lng;
              }
            }
          } catch (geoErr) {
            console.warn('⚠️ Geocoding skipped:', geoErr.message);
          }
        }

      const apiPayload = {
        name: propertyData.name.trim().substring(0, 140),
        street: propertyData.street?.trim().substring(0, 512) || '',
        city: propertyData.city?.trim().substring(0, 512) || '',
        state: propertyData.state?.trim().substring(0, 512) || '',
        zipcode: propertyData.zip_code?.trim().substring(0, 512) || '',
        property_type: (propertyData.property_type?.toLowerCase() || 'apartment').substring(0, 64),
        availability: propertyData.availability_status === 'Available' ? 'available' : 'occupied',
        liked: false,
        bedrooms: parseInt(propertyData.bedrooms) || 0,
        bathrooms: parseInt(propertyData.bathrooms) || 0,
        area: areaValue,
        year_built: parseInt(propertyData.year_built) || null,
        monthly_rent: parseFloat(propertyData.monthly_rent) || 0,
        security_deposit: parseFloat(propertyData.security_deposit) || 0,
        amenities: selectedAmenities,
        image_urls: processedImages,
        landlord_id: landlordId,
          lat: propertyLat,
          lng: propertyLng,
      };

      if (propertyData.description?.trim()) {
        apiPayload.description = propertyData.description.trim().substring(0, 4000);
      }

      if (propertyData.tenant_email?.trim() && propertyData.availability_status !== 'Available') {
        apiPayload.tenants = [{
          email: propertyData.tenant_email.trim(),
          name: propertyData.tenant_name?.trim() || `Tenant`,
        }];
        apiPayload.availability = 'occupied';
      } else {
        apiPayload.tenants = [];
      }

      console.log('📤 Sending to API:', {
        ...apiPayload,
        image_urls: apiPayload.image_urls.map((url, idx) =>
          url.startsWith('data:') ? `[base64 image ${idx + 1}]` : url
        ),
      });

      const response = await fetch(PROPERTIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(apiPayload),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        try { data = JSON.parse(await response.text()); } catch { data = { success: true, property: apiPayload }; }
      }

      console.log('✅ Create Response:', data);

      if (response.ok) {
        Toast.show('Property created successfully!');
        // ✅ FIXED: normalise images on create response
        const rawProperty = data.property || data.item || data.data || {};
        const normalizedProperty = transformPropertyResponse(rawProperty, rawProperty.property_id || '', apiPayload);
        return { ...data, property: normalizedProperty, timestamp: new Date().toISOString() };
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const msg = data?.message || data?.error || data?.details || `HTTP ${response.status}`;
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch')
        ? 'Network error. Please check your internet connection.'
        : err.message || 'Failed to create property';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// ✅ FIXED: UPDATE PROPERTY — returns normalised S3 URLs
// ─────────────────────────────────────────────────────────────
export const updateProperty = createAsyncThunk(
  'properties/updateProperty',
  async (params, { rejectWithValue }) => {
    try {
      const { propertyId, propertyData, token, landlordId } = params;

      if (!propertyData.name?.trim()) return rejectWithValue('Property name is required');
      if (!token) return rejectWithValue('Authentication token is required. Please login again.');
      if (!propertyId) return rejectWithValue('Property ID is required for updates.');

      console.log('🔄 Updating property:', propertyId);

      let processedImages = [];
      if (Array.isArray(propertyData.images) && propertyData.images.length > 0) {
        try {
          console.log(`📸 Processing ${propertyData.images.length} images...`);
          processedImages = await processPropertyImages(propertyData.images);
          console.log(`✅ Processed ${processedImages.length} images successfully`);
        } catch (error) {
          console.error('❌ Image processing failed:', error);
          Toast.show('Warning: Some images could not be processed');
        }
      }

      const selectedAmenities = Object.keys(propertyData.amenities || {})
        .filter((key) => propertyData.amenities[key] === true);

      const areaValue = propertyData.area_sqft
        ? parseInt(propertyData.area_sqft.toString().replace(/[^\d]/g, ''))
        : 0;
        
        // Use pre-verified coords if available, otherwise geocode
        let propertyLat = propertyData.lat ?? null;
        let propertyLng = propertyData.lng ?? null;

        if (!propertyLat || !propertyLng) {
          try {
            const fullAddress = [propertyData.street, propertyData.city,
              propertyData.state, propertyData.zip_code].filter(Boolean).join(', ');
            if (fullAddress.trim()) {
              const geoResult = await geocodeAddress(fullAddress);
              if (geoResult?.isValid) {
                propertyLat = geoResult.lat;
                propertyLng = geoResult.lng;
              }
            }
          } catch (geoErr) {
            console.warn('⚠️ Geocoding skipped:', geoErr.message);
          }
        }

      const apiPayload = {
        name: propertyData.name.trim().substring(0, 140),
        street: propertyData.street?.trim().substring(0, 512) || '',
        city: propertyData.city?.trim().substring(0, 512) || '',
        state: propertyData.state?.trim().substring(0, 512) || '',
        zipcode: propertyData.zip_code?.trim().substring(0, 512) || '',
        property_type: (propertyData.property_type?.toLowerCase() || 'apartment').substring(0, 64),
        availability: propertyData.availability_status === 'Available' ? 'available' : 'occupied',
        bedrooms: parseInt(propertyData.bedrooms) || 0,
        bathrooms: parseInt(propertyData.bathrooms) || 0,
        area: areaValue,
        year_built: parseInt(propertyData.year_built) || null,
        monthly_rent: parseFloat(propertyData.monthly_rent) || 0,
        security_deposit: parseFloat(propertyData.security_deposit) || 0,
        amenities: selectedAmenities,
        image_urls: processedImages,
        landlord_id: landlordId,
          lat: propertyLat,
          lng: propertyLng,
      };

      if (propertyData.description !== undefined) {
        apiPayload.description = propertyData.description?.trim().substring(0, 4000) || '';
      }

      if (propertyData.tenant_email?.trim() && propertyData.availability_status !== 'Available') {
        apiPayload.tenants = [{
          email: propertyData.tenant_email.trim(),
          name: propertyData.tenant_name?.trim() || 'Tenant',
        }];
        apiPayload.availability = 'occupied';
      } else {
        apiPayload.tenants = [];
      }

      console.log('📤 Update payload:', {
        ...apiPayload,
        image_urls: apiPayload.image_urls.map((url, idx) =>
          url.startsWith('data:') ? `[base64 image ${idx + 1}]` : url
        ),
      });

      const response = await fetch(`${PROPERTIES_API_URL}/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(apiPayload),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        try {
          data = JSON.parse(await response.text());
        } catch {
          data = { success: true, message: 'Property updated', property: { ...apiPayload, property_id: propertyId } };
        }
      }

      if (response.ok) {
        Toast.show('Property updated successfully!');

        // ✅ FIXED: normalise backend response → proper S3 image_urls, not base64
        const rawProperty = data.property || data.item || data.data || {};
        const normalizedProperty = transformPropertyResponse(rawProperty, propertyId, apiPayload);

        console.log('✅ Normalised updated property images:', normalizedProperty.image_urls);

        return {
          ...data,
          property: normalizedProperty,
          propertyId, // ✅ explicit so the slice can filter by it
          timestamp: new Date().toISOString(),
        };
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        console.error('Update API Error:', msg);
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.message || 'Failed to update property';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// Exported helper (used in AddPropertiesScreen edit pre-population)
export const transformPropertyImages = (property) => {
  if (!property) return [];
  const normalized = normalizePropertyImages(property);
  return normalized.image_urls || [];
};

// ─────────────────────────────────────────────────────────────
// DELETE PROPERTY
// ─────────────────────────────────────────────────────────────
export const deleteProperty = createAsyncThunk(
  'properties/deleteProperty',
  async ({ propertyId, token, landlordId }, { rejectWithValue }) => {
    try {
      console.log('🗑️ Deleting property:', propertyId);

      if (!token) return rejectWithValue('Authentication token is required. Please login again.');
      if (!propertyId) return rejectWithValue('Property ID is required.');
        

      const response = await fetch(`${PROPERTIES_API_URL}/${propertyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      });

      console.log('📡 Delete Response Status:', response.status);

      let data;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          try { data = JSON.parse(await response.text()); } catch { data = { success: true }; }
        }
      } catch {
        data = { success: true };
      }

      if (response.ok) {
        Toast.show('Property deleted successfully!');
        return { propertyId, landlordId, timestamp: new Date().toISOString() };
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else if (response.status === 403) {
        return rejectWithValue('Access denied. You do not have permission to delete this property.');
      } else if (response.status === 404) {
        return rejectWithValue('Property not found.');
      } else {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch')
        ? 'Network error. Please check your internet connection.'
        : err.message || 'Failed to delete property';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET TENANT PROPERTIES
// ─────────────────────────────────────────────────────────────
export const getTenantProperties = createAsyncThunk(
  'properties/getTenantProperties',
  async (params, { rejectWithValue }) => {
    const { tenantId, token } = params;
    try {
      console.log('🔍 getTenantProperties called with:', { tenantId, hasToken: !!token });

      if (!token) return rejectWithValue('Authentication token is required.');
      if (!tenantId) return rejectWithValue('Tenant ID is required.');

      const response = await fetch(PROPERTIES_API_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        try { data = JSON.parse(await response.text()); } catch { data = { items: [] }; }
      }

      if (response.ok) {
        let properties = data?.items || data?.properties || data?.data || [];
        if (!Array.isArray(properties)) properties = [];

        const tenantProperties = properties.filter((property) => {
          if (property.tenant_ids && Array.isArray(property.tenant_ids)) {
            return property.tenant_ids.includes(tenantId);
          }
          return property.tenant_id === tenantId;
        });

        // ✅ FIXED: normalise images
        return tenantProperties.map(normalizePropertyImages);

      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else if (response.status === 403) {
        return rejectWithValue('Access denied.');
      } else {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch')
        ? 'Network error. Please check your internet connection.'
        : err.message || 'Failed to fetch tenant properties';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// VALIDATE TENANT ID (simple pattern check)
// ─────────────────────────────────────────────────────────────
export const validateTenantIdSimple = createAsyncThunk(
  'properties/validateTenantIdSimple',
  async (tenantId, { rejectWithValue }) => {
    try {
      if (!tenantId || !tenantId.trim()) {
        return { isValid: false, message: 'Tenant ID is required', tenantInfo: null };
      }

      const tenantIdPattern = /^tenant-\d{13}$/;
      if (tenantIdPattern.test(tenantId.trim())) {
        const timestamp = tenantId.replace('tenant-', '');
        const timestampNum = parseInt(timestamp, 10);
        const currentTime = Date.now();
        if (timestampNum > 0 && timestampNum <= currentTime && timestampNum > currentTime - 10 * 365 * 24 * 60 * 60 * 1000) {
          return {
            isValid: true,
            message: 'Tenant ID is valid',
            tenantInfo: {
              id: tenantId.trim(),
              name: `Tenant ${tenantId.slice(-4)}`,
              email: `tenant${tenantId.slice(-4)}@example.com`,
              phone: '+1234567890',
              currentPropertyId: null,
              currentPropertyName: null,
            },
          };
        }
      }

      return { isValid: false, message: 'Invalid tenant ID format', tenantInfo: null };
    } catch (error) {
      return rejectWithValue({ isValid: false, message: 'Failed to validate tenant ID', tenantInfo: null });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET TENANT BY ID
// ─────────────────────────────────────────────────────────────
export const getTenantById = createAsyncThunk(
  'properties/getTenantById',
  async (params, { rejectWithValue }) => {
    try {
      const { tenantId, token } = params;
      if (!tenantId) return rejectWithValue('Tenant ID is required');
      if (!token) return rejectWithValue('Authentication token is required');

      console.log('🔍 Fetching tenant:', tenantId);

      const TENANT_API_URL = 'https://70q2ntiu1f.execute-api.us-east-1.amazonaws.com/prod/tenants';
      const response = await fetch(`${TENANT_API_URL}/${tenantId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        try { data = JSON.parse(await response.text()); } catch { data = null; }
      }

      console.log('📦 Tenant Response:', data);

      if (response.ok && data) {
        const tenant = data.tenant || data.item || data.data || data;
        return {
          id: tenant.tenant_id || tenant.id || tenantId,
          name: `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || tenant.name || 'Unknown Tenant',
          email: tenant.email || null,
          phone: tenant.phoneNumber || tenant.phone || null,
          avatar: tenant.avatar || tenant.profileImage || null,
          lease_start: tenant.lease_start_date || null,
          lease_end: tenant.lease_end_date || null,
        };
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else if (response.status === 404) {
        return rejectWithValue('Tenant not found');
      } else {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        return rejectWithValue(msg);
      }
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch')
        ? 'Network error. Please check your internet connection.'
        : err.message || 'Failed to fetch tenant';
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET LANDLORD TENANTS (unchanged helper used elsewhere)
// ─────────────────────────────────────────────────────────────
export const getLandlordTenants = async ({ landlordId, token }) => {
  try {
    console.log('👥 Fetching tenants for landlord:', landlordId);
    const TENANTS_API_URL = 'https://70q2ntiu1f.execute-api.us-east-1.amazonaws.com/prod/tenants';
    const response = await fetch(`${TENANTS_API_URL}?landlord_id=${landlordId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    });

    let data;
    if (response.headers.get('content-type')?.includes('application/json')) {
      data = await response.json();
    } else {
      try { data = JSON.parse(await response.text()); } catch { data = { tenants: [] }; }
    }

    console.log('📦 Landlord Tenants Response:', data);

    if (response.ok) {
      const tenants = data.tenants || data.items || data.data || [];
      console.log('✅ Extracted Tenants:', tenants);
      console.log('✅ Tenant Count:', tenants.length);
      return Array.isArray(tenants) ? tenants : [];
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching landlord tenants:', error);
    return [];
  }
};
