// services.js — Properties Redux Thunks (Node.js API)
// All endpoints follow the Swagger spec at /properties
// Field names are camelCase as per the Node.js backend schema

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { Linking } from 'react-native';
import { authFetch } from '../../utils/authFetch';

// ─────────────────────────────────────────────────────────────
// BASE URLS
// ─────────────────────────────────────────────────────────────
const BASE_URL           = Config.Base_url;
const PROPERTIES_API_URL = `${BASE_URL}/properties`;
const GEOCODING_BASE_URL = Config.GOOGLE_MAPS_BASE_URL;
const GEOCODING_API_KEY  = Config.GOOGLE_MAPS_API_KEY;

// ─────────────────────────────────────────────────────────────
// NODE.JS API — FIELD MAPPING REFERENCE
//
// Python backend    →  Node.js backend
// property_id       →  id
// street            →  streetAddress
// zip_code          →  zipCode
// property_type     →  propertyType
// area_sqft         →  areaSqft
// monthly_rent      →  monthlyRent
// security_deposit  →  securityDeposit
// image_urls        →  images
// is_available      →  availabilityStatus (enum string)
// landlord_id       →  landlordId
// tenant_id         →  tenantId
// bedrooms (int)    →  bedrooms (enum string: "2 bhk")
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Helper: resolve property ID
// ─────────────────────────────────────────────────────────────
export const resolveId = (property) =>
  property?.id || property?.property_id || property?.propertyId || property?.ID || null;

// ─────────────────────────────────────────────────────────────
// Helper: build a full S3 URL from a key or partial path
// ─────────────────────────────────────────────────────────────
const toFullImageUrl = (photo) => {
  if (!photo) return null;
  if (typeof photo === 'object' && photo.url) {
    const url = photo.url.split('?')[0];
    return url.startsWith('http') ? url : null;
  }
  if (typeof photo === 'string') {
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo.split('?')[0]; // strip presigned params, keep clean S3 URL
    }
    if (photo.startsWith('data:')) return photo;
    // Plain filename stored in DB (e.g. "UUID.jpg") — pass through so
    // useSignedImageUrls can sign it via GET /s3/download-url
    if (photo.match(/\.(jpg|jpeg|png|webp|gif|heic)$/i)) return photo;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────
// Helper: normalise images on a property object
// ─────────────────────────────────────────────────────────────
const normalizePropertyImages = (property) => {
  if (!property) return property;
  const rawImages = property.images || property.image_urls || [];
  const imageUrls = rawImages.map(toFullImageUrl).filter(Boolean);
  return { ...property, images: imageUrls, image_urls: imageUrls };
};

// ─────────────────────────────────────────────────────────────
// Helper: map Node.js PropertyResponseDto → Redux-friendly shape
// ─────────────────────────────────────────────────────────────
const normalizeProperty = (raw) => {
  if (!raw) return raw;

  // ─── Build amenities array from all boolean flags ─────────────────────
  const AMENITY_MAP = [
    { key: 'isFurnished',         label: 'Furnished' },
    { key: 'hasParking',          label: 'Parking' },
    { key: 'hasElevator',         label: 'Elevator' },
    { key: 'ac',                  label: 'AC / HVAC' },
    { key: 'gym',                 label: 'Gym' },
    { key: 'pool',                label: 'Pool' },
    { key: 'washerDryer',         label: 'Washer/Dryer' },
    { key: 'dishwasher',          label: 'Dishwasher' },
    { key: 'fireplace',           label: 'Fireplace' },
    { key: 'hardwoodFloors',      label: 'Hardwood Floors' },
    { key: 'highCeilings',        label: 'High Ceilings' },
    { key: 'smartThermostat',     label: 'Smart Thermostat' },
    { key: 'cableReady',          label: 'Cable Ready' },
    { key: 'refrigerator',        label: 'Refrigerator' },
    { key: 'microwave',           label: 'Microwave' },
    { key: 'garbageDisposal',     label: 'Garbage Disposal' },
    { key: 'stainlessAppliances', label: 'Stainless Appliances' },
    { key: 'highSpeedInternet',   label: 'High-Speed Internet' },
    { key: 'smartLocks',          label: 'Smart Locks' },
    { key: 'videoDoorbell',       label: 'Video Doorbell' },
    { key: 'keylessEntry',        label: 'Keyless Entry' },
    { key: 'garage',              label: 'Garage' },
    { key: 'coveredParking',      label: 'Covered Parking' },
    { key: 'evCharging',          label: 'EV Charging' },
    { key: 'petFriendly',         label: 'Pet Friendly' },
    { key: 'catsAllowed',         label: 'Cats Allowed' },
    { key: 'dogsAllowed',         label: 'Dogs Allowed' },
    { key: 'clubhouse',           label: 'Clubhouse' },
    { key: 'businessCenter',      label: 'Business Center' },
    { key: 'packageReceiving',    label: 'Package Receiving' },
    { key: 'controlledAccess',    label: 'Controlled Access' },
    { key: 'balcony',             label: 'Balcony / Patio' },
    { key: 'bbqArea',             label: 'BBQ / Grill Area' },
    { key: 'dogPark',             label: 'Dog Park' },
    { key: 'playground',          label: 'Playground' },
    { key: 'securitySystem',      label: 'Security System' },
    { key: 'cctv',                label: 'CCTV' },
    { key: 'onSiteMaintenance',   label: 'On-site Maintenance' },
    { key: 'trashPickup',         label: 'Trash Pickup' },
    { key: 'shortTermLease',      label: 'Short-Term Lease' },
    { key: 'wheelchairAccess',    label: 'Wheelchair Access' },
    { key: 'adaCompliant',        label: 'ADA Compliant' },
  ];

  const amenitiesArray = AMENITY_MAP
    .filter(({ key }) => raw[key] === true)
    .map(({ label }) => label);

  const normalized = {
    id:               raw.id,
    property_id:      raw.id,
    name:             raw.name,
    description:      raw.description || '',
    streetAddress:    raw.streetAddress,
    street:           raw.streetAddress,
    city:             raw.city,
    state:            raw.state,
    zipCode:          raw.zipCode,
    zipcode:          raw.zipCode,
    zip_code:         raw.zipCode,
    timezone:         raw.timezone || 'America/New_York',
    propertyType:     raw.propertyType,
    property_type:    raw.propertyType,
    bedrooms:         raw.bedrooms,
    bathrooms:        raw.bathrooms,
    areaSqft:         raw.areaSqft,
    area_sqft:        raw.areaSqft,
    area:             raw.areaSqft,
    yearBuilt:        raw.yearBuilt,
    year_built:       raw.yearBuilt,
    monthlyRent:      raw.monthlyRent,
    monthly_rent:     raw.monthlyRent,
    securityDeposit:  raw.securityDeposit,
    security_deposit: raw.securityDeposit,
    availabilityStatus: raw.availabilityStatus,
    availability:       raw.availabilityStatus,
    is_available: raw.availabilityStatus === 'vacant' || raw.availabilityStatus === 'available soon',

    // ─── All boolean amenity flags (kept for backward compat) ──────────
    isFurnished:          raw.isFurnished          ?? false,
    hasParking:           raw.hasParking           ?? false,
    hasElevator:          raw.hasElevator          ?? false,
    ac:                   raw.ac                   ?? false,
    gym:                  raw.gym                  ?? false,
    pool:                 raw.pool                 ?? false,
    washerDryer:          raw.washerDryer          ?? false,
    dishwasher:           raw.dishwasher           ?? false,
    fireplace:            raw.fireplace            ?? false,
    hardwoodFloors:       raw.hardwoodFloors       ?? false,
    highCeilings:         raw.highCeilings         ?? false,
    smartThermostat:      raw.smartThermostat      ?? false,
    cableReady:           raw.cableReady           ?? false,
    refrigerator:         raw.refrigerator         ?? false,
    microwave:            raw.microwave            ?? false,
    garbageDisposal:      raw.garbageDisposal      ?? false,
    stainlessAppliances:  raw.stainlessAppliances  ?? false,
    highSpeedInternet:    raw.highSpeedInternet     ?? false,
    smartLocks:           raw.smartLocks           ?? false,
    videoDoorbell:        raw.videoDoorbell         ?? false,
    keylessEntry:         raw.keylessEntry          ?? false,
    garage:               raw.garage               ?? false,
    coveredParking:       raw.coveredParking        ?? false,
    evCharging:           raw.evCharging            ?? false,
    petFriendly:          raw.petFriendly           ?? false,
    catsAllowed:          raw.catsAllowed           ?? false,
    dogsAllowed:          raw.dogsAllowed           ?? false,
    clubhouse:            raw.clubhouse             ?? false,
    businessCenter:       raw.businessCenter        ?? false,
    packageReceiving:     raw.packageReceiving      ?? false,
    controlledAccess:     raw.controlledAccess      ?? false,
    balcony:              raw.balcony               ?? false,
    bbqArea:              raw.bbqArea               ?? false,
    dogPark:              raw.dogPark               ?? false,
    playground:           raw.playground            ?? false,
    securitySystem:       raw.securitySystem        ?? false,
    cctv:                 raw.cctv                  ?? false,
    onSiteMaintenance:    raw.onSiteMaintenance     ?? false,
    trashPickup:          raw.trashPickup           ?? false,
    shortTermLease:       raw.shortTermLease        ?? false,
    wheelchairAccess:     raw.wheelchairAccess      ?? false,
    adaCompliant:         raw.adaCompliant          ?? false,

    // ✅ Pre-built label array — PropertiesDetails renders this directly
    amenities: amenitiesArray,

    // ─── Tenant fields ──────────────────────────────────────────────────
    tenantId:    raw.tenantId  || null,
    tenant_id:   raw.tenantId  || null,
    tenant_ids:  raw.tenantId  ? [raw.tenantId]   : [],   // ✅ FIX Bug 2
    tenant_names: raw.tenantName ? [raw.tenantName] : [],
    tenant_emails: [],
    tenantPhone: raw.tenantPhone || raw.tenant_phone || null,
    tenantName:  raw.tenantName || null,
    tenants: raw.tenantId
      ? [{ tenant_id: raw.tenantId, name: raw.tenantName || '', email: '' }]
      : [],

    landlordId:  raw.landlordId,
    landlord_id: raw.landlordId,
    createdAt:   raw.createdAt,
    created_at:  raw.createdAt,   // ✅ FIX — details screen uses created_at
    updatedAt:   raw.updatedAt,
    images:      raw.images     || raw.image_urls || [],
    image_urls:  raw.image_urls || raw.images     || [],
  };

  return normalizePropertyImages(normalized);
};
// ─────────────────────────────────────────────────────────────
// Helper: map form data → CreatePropertyDto / UpdatePropertyDto
// ─────────────────────────────────────────────────────────────
const buildNodeApiPayload = (propertyData, landlordId, processedImages) => {
  const bedroomMap = { 0: 'studio', 1: '1 bhk', 2: '2 bhk', 3: '3 bhk', 4: '4 bhk' };
  const rawBedrooms = propertyData.bedrooms;
  let bedroomEnum;
  if (typeof rawBedrooms === 'string' && rawBedrooms.includes('bhk')) bedroomEnum = rawBedrooms;
  else if (rawBedrooms === 'studio') bedroomEnum = 'studio';
  else { const num = parseInt(rawBedrooms) || 0; bedroomEnum = num >= 5 ? '5+ bhk' : (bedroomMap[num] || 'studio'); }

  const availMap = {
    // UI labels → backend enum values
    'Available':           'vacant',
    'available':           'vacant',
    'Vacant':              'vacant',
    'vacant':              'vacant',
    'Currently Occupied':  'currently occupied',
    'currently occupied':  'currently occupied',
    'Occupied':            'currently occupied',
    'occupied':            'currently occupied',
    'Under Maintenance':   'under maintenance',
    'under maintenance':   'under maintenance',
    'Available Soon':      'available soon',
    'available soon':      'available soon',
  };

  const rawAvailability =
    propertyData.availability_status || propertyData.availabilityStatus || propertyData.availability || 'vacant';
  const availabilityStatus = availMap[rawAvailability] || rawAvailability.toLowerCase() || 'vacant';

  // Only include tenant invite if BOTH name and phone are provided
  const tenantsArray = [];
  const tenantName   = (propertyData.tenantName  || propertyData.tenant_name  || '').trim();
    const rawPhone = (propertyData.tenantPhone || propertyData.tenant_phone || '').trim();

    const tenantPhone = rawPhone
      ? rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`
      : '';
  if (tenantName && tenantPhone) {
    tenantsArray.push({ name: tenantName, phone: tenantPhone });
  }

  const payload = {
    landlordId,
    name:            propertyData.name?.trim().substring(0, 140),
    description:     propertyData.description?.trim().substring(0, 4000) || '',
    streetAddress:   propertyData.streetAddress || propertyData.street || '',
    city:            propertyData.city  || '',
    state:           propertyData.state || '',
      zipCode:       propertyData.zipCode       || propertyData.zip_code       || propertyData.zipcode || '',
      postalCode:    propertyData.zipCode       || propertyData.postalCode     || propertyData.zip_code || '',
      country:       propertyData.country       || 'USA',
      latitude:  typeof propertyData.latitude  === 'number' ? propertyData.latitude  : 0,
      longitude: typeof propertyData.longitude === 'number' ? propertyData.longitude : 0,
    timezone:        propertyData.timezone || 'America/New_York',
    propertyType:    (propertyData.propertyType || propertyData.property_type || 'apartment').toLowerCase(),
    bedrooms:        bedroomEnum,
    bathrooms:       parseFloat(propertyData.bathrooms) || 0,
    areaSqft:        parseFloat(String(propertyData.areaSqft || propertyData.area_sqft || 0).replace(/[^\d.]/g, '')) || 0,
    yearBuilt:       parseInt(propertyData.yearBuilt || propertyData.year_built) || null,
    monthlyRent:     parseFloat(propertyData.monthlyRent || propertyData.monthly_rent) || 0,
    securityDeposit: parseFloat(propertyData.securityDeposit || propertyData.security_deposit) || 0,
    
    availabilityStatus,
    images:          processedImages,
      tenants: tenantsArray,
      
      // ─── All amenities: form snake_case → backend camelCase ───────────────
        isFurnished:          propertyData.amenities?.furnished          ?? propertyData.isFurnished          ?? false,
        hasParking:           propertyData.amenities?.parking            ?? propertyData.hasParking            ?? false,
        hasElevator:          propertyData.amenities?.elevator           ?? propertyData.hasElevator           ?? false,
        ac:                   propertyData.amenities?.ac                 ?? false,
        gym:                  propertyData.amenities?.gym                ?? false,
        pool:                 propertyData.amenities?.pool               ?? false,
        washerDryer:          propertyData.amenities?.washer_dryer       ?? false,
        dishwasher:           propertyData.amenities?.dishwasher         ?? false,
        fireplace:            propertyData.amenities?.fireplace          ?? false,
        hardwoodFloors:       propertyData.amenities?.hardwood_floors    ?? false,
        highCeilings:         propertyData.amenities?.high_ceilings      ?? false,
        smartThermostat:      propertyData.amenities?.smart_thermostat   ?? false,
        cableReady:           propertyData.amenities?.cable_ready        ?? false,
        refrigerator:         propertyData.amenities?.refrigerator       ?? false,
        microwave:            propertyData.amenities?.microwave          ?? false,
        garbageDisposal:      propertyData.amenities?.garbage_disposal   ?? false,
        stainlessAppliances:  propertyData.amenities?.stainless_appliances ?? false,
      highSpeedInternet:    propertyData.amenities?.high_speed_internet ?? false,
       smartLocks:           propertyData.amenities?.smart_locks        ?? false,
       videoDoorbell:        propertyData.amenities?.video_doorbell     ?? false,
       keylessEntry:         propertyData.amenities?.keyless_entry      ?? false,
       garage:               propertyData.amenities?.garage             ?? false,
       coveredParking:       propertyData.amenities?.covered_parking    ?? false,
       evCharging:           propertyData.amenities?.ev_charging        ?? false,
       petFriendly:          propertyData.amenities?.pet_friendly       ?? false,
       catsAllowed:          propertyData.amenities?.cats_allowed       ?? false,
       dogsAllowed:          propertyData.amenities?.dogs_allowed       ?? false,
       clubhouse:            propertyData.amenities?.clubhouse          ?? false,
       businessCenter:       propertyData.amenities?.business_center    ?? false,
       packageReceiving:     propertyData.amenities?.package_receiving  ?? false,
       controlledAccess:     propertyData.amenities?.controlled_access  ?? false,
       balcony:              propertyData.amenities?.balcony            ?? false,
       bbqArea:              propertyData.amenities?.bbq_area           ?? false,
       dogPark:              propertyData.amenities?.dog_park           ?? false,
       playground:           propertyData.amenities?.playground         ?? false,
      securitySystem:       propertyData.amenities?.security_system    ?? false,
        cctv:                 propertyData.amenities?.cctv               ?? false,
        onSiteMaintenance:    propertyData.amenities?.on_site_maintenance ?? false,
        trashPickup:          propertyData.amenities?.trash_pickup       ?? false,
        shortTermLease:       propertyData.amenities?.short_term_lease   ?? false,
        wheelchairAccess:     propertyData.amenities?.wheelchair_access  ?? false,
        adaCompliant:         propertyData.amenities?.ada_compliant      ?? false,
      };


  // Only attach tenants when both name AND phone are present
  if (tenantsArray.length > 0) payload.tenants = tenantsArray;

  // Strip nullish optional fields to avoid backend validation errors
  if (!payload.yearBuilt) delete payload.yearBuilt;

  return payload;
};

// ─────────────────────────────────────────────────────────────
// Helper: safe JSON parse
// ─────────────────────────────────────────────────────────────
const safeJsonParse = async (response, fallback = {}) => {
  const ct = response.headers.get('content-type');
  if (ct?.includes('application/json')) return response.json();
  try { return JSON.parse(await response.text()); } catch { return fallback; }
};



// ─────────────────────────────────────────────────────────────
// Step 1 — get a presigned upload URL from the backend
// ─────────────────────────────────────────────────────────────
const getSignedUrl = async (fileName, token) => {
  try {
    console.log('🔑 Getting signed URL for:', fileName);

    const response = await authFetch(`${BASE_URL}/s3/upload-url`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName,
        contentType: 'image/jpeg', // must match the PUT header below
        folder:      'uploads',    // ✅ always 'uploads'
        expiresIn:   3600,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Signed URL error:', response.status, data?.message);
      return null;
    }

    console.log('✅ Signed URL received — fileUrl:', data.fileUrl);
    return { uploadUrl: data.uploadUrl, fileUrl: data.fileUrl };
  } catch (error) {
    console.error('❌ getSignedUrl error:', error.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Step 2 — upload file to S3 using the presigned URL
//
// fetch(fileUri) turns a local file:// URI into a Blob.
// We PUT the Blob directly — zero encoding needed.
// Content-Type MUST match what was sent to /s3/upload-url.
// ─────────────────────────────────────────────────────────────
const uploadToS3 = async (fileUri, uploadUrl, contentType = 'image/jpeg') => {
  try {
    console.log('📤 Fetching blob from:', fileUri.substring(0, 60));

    // Convert local URI → Blob (React Native fetch supports file:// URIs)
    const fileResponse = await fetch(fileUri);
    const blob         = await fileResponse.blob();

    console.log('📦 Blob — size:', blob.size, 'bytes | type:', blob.type);

    // PUT blob directly to S3 presigned URL
    const result = await fetch(uploadUrl, {
      method:  'PUT',
      headers: {
        'Content-Type': contentType, // MUST match the contentType sent to /s3/upload-url
      },
      body: blob,
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error('❌ S3 PUT failed:', result.status, errorText.substring(0, 300));
      throw new Error(`S3 upload failed (${result.status})`);
    }

    console.log('✅ S3 upload successful');
    return true;
  } catch (error) {
    console.error('❌ uploadToS3 error:', error.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// Step 3 — full single-file upload flow
// Returns the permanent S3 fileUrl, or null on failure
// ─────────────────────────────────────────────────────────────
const handleSingleUpload = async (file, token) => {
  // file = { uri: string, type: string, fileName: string }
  const signedData = await getSignedUrl(file.fileName, token);
  if (!signedData) return null;

  const { uploadUrl, fileUrl } = signedData;
  const success = await uploadToS3(file.uri, uploadUrl, file.type || 'image/jpeg');

  if (!success) return null;

  console.log('🎉 File available at:', fileUrl);
  return fileUrl;
};

// ─────────────────────────────────────────────────────────────
// Main orchestrator — upload all local images, return fileUrls[]
//
// • Already-remote https:// URLs are passed through unchanged (edit mode)
// • Local file:// URIs go through getSignedUrl → uploadToS3
// • onProgress(imageIndex, totalImages) — optional UI callback
// ─────────────────────────────────────────────────────────────
export const processPropertyImages = async (images, token, onProgress) => {
  console.log('🖼️  processPropertyImages — total:', images?.length ?? 0);

  if (!Array.isArray(images) || images.length === 0) return [];
  if (!token) { console.error('❌ No token'); return []; }

  const remoteUrls = [];
  const localFiles = [];
    
   

    for (const uri of images.slice(0, 9)) {
      if (typeof uri !== 'string') continue;

      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        // ✅ Strip presigned query params — keep only the clean permanent S3 URL
        // Presigned URLs look like: https://...s3.amazonaws.com/uploads/file.jpg?X-Amz-Algorithm=...
        try {
          const clean = uri.split('?')[0];
          remoteUrls.push(clean);
        } catch {
          remoteUrls.push(uri);
        }
      } else {
        const rawName  = uri.split('/').pop().split('?')[0] || `img-${Date.now()}`;
        const fileName = rawName.replace(/\.(heic|heif|jpeg|jpg|png|webp|gif)$/i, '') + '.jpg';
        localFiles.push({ uri, type: 'image/jpeg', fileName });
      }
    }

  if (localFiles.length === 0) {
    console.log('  → No local files, returning remote URLs as-is');
    return remoteUrls;
  }

  const uploadedUrls = [];

  for (let i = 0; i < localFiles.length; i++) {
    const file = localFiles[i];
    console.log(`\n📤 [${i + 1}/${localFiles.length}] Uploading: ${file.fileName}`);
    onProgress && onProgress(i, localFiles.length);

    const fileUrl = await handleSingleUpload(file, token);

    if (fileUrl) {
      uploadedUrls.push(fileUrl);
    } else {
      console.warn(`⚠️  Image ${i + 1} failed — skipping`);
      Toast.show(`Warning: Image ${i + 1} could not be uploaded`);
    }
  }

  onProgress && onProgress(localFiles.length, localFiles.length);
  console.log(`\n📊 Summary: ${uploadedUrls.length}/${localFiles.length} succeeded`);

  return [...remoteUrls, ...uploadedUrls];
};

// ─────────────────────────────────────────────────────────────
// Exported image transform helper (used in detail screens)
// ─────────────────────────────────────────────────────────────
export const transformPropertyImages = (property) => {
  if (!property) return [];
  const n = normalizePropertyImages(property);
  return n.image_urls || n.images || [];
};

// ═════════════════════════════════════════════════════════════
// GEOCODING
// ═════════════════════════════════════════════════════════════
export const geocodeAddress = async (address) => {
  if (!address?.trim()) throw new Error('Address is required');

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 8000);

    try {
        const url = `${GEOCODING_BASE_URL}?address=${encodeURIComponent(address.trim())}&key=${GEOCODING_API_KEY}`;
        const response = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
        const data = await response.json();
        
        if (data.status !== 'OK' || !data.results?.[0]) {
            return { isValid: false };
        }
        
        const result       = data.results[0];
        const components   = result.address_components || [];
        
        // ── Helper to extract a component by type ──
        const get = (type) =>
        components.find(c => c.types.includes(type))?.long_name || '';
        const getShort = (type) =>
        components.find(c => c.types.includes(type))?.short_name || '';
        
        return {
            isValid:           true,
            formatted_address: result.formatted_address,
            lat:               result.geometry.location.lat,
            lng:               result.geometry.location.lng,
            // ✅ These are what AddPropertiesScreen now reads:
            country:           getShort('country') === 'US' ? 'USA' : get('country'),
            postalCode:        get('postal_code'),
            city:              get('locality')              || get('sublocality'),
            state:             get('administrative_area_level_1'),
            street:            `${get('street_number')} ${get('route')}`.trim(),
        };
    }catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Address verification timed out.');
    throw error;
        return { isValid: false };
  }
};

// ═════════════════════════════════════════════════════════════
// PLACES AUTOCOMPLETE
// Returns up to 5 address predictions for the given input text.
// ═════════════════════════════════════════════════════════════
export const fetchAddressSuggestions = async (input) => {
  if (!input || input.trim().length < 3) return [];

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   GEOCODING_API_KEY,
        },
        body: JSON.stringify({
          input:         input.trim(),
          languageCode:  'en',
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log('[Autocomplete] new API response:', JSON.stringify(data).slice(0, 200));

    if (!Array.isArray(data.suggestions)) return [];

    // Map new shape → same shape the component expects
    return data.suggestions
      .filter(s => s.placePrediction)
      .slice(0, 10)
      .map(s => ({
        place_id:    s.placePrediction.placeId,
        description: s.placePrediction.text?.text || '',
        structured_formatting: {
          main_text:      s.placePrediction.structuredFormat?.mainText?.text      || s.placePrediction.text?.text || '',
          secondary_text: s.placePrediction.structuredFormat?.secondaryText?.text || '',
        },
      }));
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') console.warn('[Autocomplete] timed out');
    else console.warn('[Autocomplete] error:', error.message);
    return [];
  }
};

// ═════════════════════════════════════════════════════════════
// PLACE DETAILS
// Given a place_id, returns parsed street / city / state / zip.
// ═════════════════════════════════════════════════════════════
export const fetchPlaceDetails = async (placeId, preloadedComponents = null) => {
  if (preloadedComponents) {
    const parts    = preloadedComponents;
    const get      = (type) => parts.find(c => c.types?.includes(type))?.long_name  || '';
    const getShort = (type) => parts.find(c => c.types?.includes(type))?.short_name || '';
    const streetNum = get('street_number');
    const route     = get('route');
    return {
      street:   streetNum && route ? `${streetNum} ${route}` : (route || ''),
      city:     get('locality') || get('sublocality_level_1') || get('administrative_area_level_2'),
      state:    getShort('administrative_area_level_1'),
      zip_code: get('postal_code'),
    };
  }

  if (!placeId) return null;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 6000);

  try {
    // ✅ Strip 'places/' prefix if already included in placeId
    const cleanId = placeId.replace(/^places\//, '');

    const response = await fetch(
      `https://places.googleapis.com/v1/places/${cleanId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   GEOCODING_API_KEY,
          'X-Goog-FieldMask': 'addressComponents',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    const data = await response.json();

    // ✅ Log to confirm shape
    console.log('[PlaceDetails] status:', response.status);
    console.log('[PlaceDetails] raw:', JSON.stringify(data).slice(0, 400));

    const parts = data.addressComponents || [];

    if (parts.length === 0) {
      console.warn('[PlaceDetails] addressComponents is empty — check FieldMask or placeId');
      return null;
    }

    // New Places API uses longText/shortText instead of long_name/short_name
    const get      = (type) => parts.find(c => c.types?.includes(type))?.longText  || '';
    const getShort = (type) => parts.find(c => c.types?.includes(type))?.shortText || '';

    const streetNum = get('street_number');
    const route     = get('route');

    const result = {
      street:   streetNum && route
                  ? `${streetNum} ${route}`
                  : route || get('premise') || '',
      city:     get('locality')
                  || get('sublocality_level_1')
                  || get('administrative_area_level_2')
                  || get('postal_town'),
      state:    getShort('administrative_area_level_1'),
      zip_code: get('postal_code'),
    };

    console.log('[PlaceDetails] parsed result:', result); // ✅
    return result;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') console.warn('[PlaceDetails] timed out');
    else console.warn('[PlaceDetails] error:', error.message);
    return null;
  }
};
export const openLocationInMaps = async (property) => {
  try {
    const parts = [
      property.streetAddress || property.street,
      property.city, property.state,
      property.zipCode || property.zipcode,
    ].filter(Boolean);
    const address = parts.join(', ');
    if (!address.trim()) { Toast.show('No address available'); return; }

    try {
      const geo = await geocodeAddress(address);
      if (geo?.lat && geo?.lng) {
        const url = `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`;
        if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
      }
    } catch {}

    const fallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    if (await Linking.canOpenURL(fallback)) await Linking.openURL(fallback);
    else Toast.show('Unable to open maps');
  } catch { Toast.show('Failed to open location in maps'); }
};

// ═════════════════════════════════════════════════════════════
// THUNKS
// ═════════════════════════════════════════════════════════════

export const getProperties = createAsyncThunk(
  'properties/getProperties',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.loginData?.token || null;
      if (!token) return rejectWithValue('Authentication token is required.');

      const q = new URLSearchParams();
      if (params.city)   q.append('city',   params.city);
      if (params.status) q.append('status', params.status);
      if (params.page)   q.append('page',   params.page);
      if (params.limit)  q.append('limit',  params.limit);
      const url = q.toString() ? `${PROPERTIES_API_URL}?${q}` : PROPERTIES_API_URL;

        const response = await authFetch(url, { method: 'GET' });
      const data = await safeJsonParse(response, { items: [] });
      if (response.ok) {
        const raw = data.items || data.properties || data.data || data || [];
        return (Array.isArray(raw) ? raw : []).map(normalizeProperty);
      }
      if (response.status === 401) return rejectWithValue('Session expired.');
      const msg = data?.message || `HTTP ${response.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Failed to fetch properties';
      Toast.show(msg); return rejectWithValue(msg);
    }
  }
);

export const getLandlordProperties = createAsyncThunk(
  'properties/getLandlordProperties',
  async (params, { getState, rejectWithValue }) => {
    try {
      let token = typeof params === 'string' ? null : params?.token;
      if (!token) { const s = getState(); token = s.loginData?.accessToken || s.loginData?.token || null; }
      if (!token) return rejectWithValue('Authentication token is required.');

        const response = await authFetch(`${PROPERTIES_API_URL}?limit=100&page=1`, { method: 'GET' });
      const data = await safeJsonParse(response, { items: [] });
      if (!response.ok) {
        if (response.status === 401) return rejectWithValue('Session expired.');
        const msg = data?.message || `HTTP ${response.status}`;
        Toast.show(msg); return rejectWithValue(msg);
      }
        const raw = data.items || data.properties || data.data || data || [];
        // ADD THIS ONE LINE:
        console.log('🏠 SERVER images[0]:', raw[0]?.images);
        return (Array.isArray(raw) ? raw : []).map(normalizeProperty);
    } catch (err) {
      const msg = err.message || 'Failed to fetch properties';
      Toast.show(msg); return rejectWithValue(msg);
    }
  }
);

export const getProperty = createAsyncThunk(
  'properties/getProperty',
  async (propertyId, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.loginData?.token || null;
      if (!token) return rejectWithValue('Authentication token is required.');

        const response = await authFetch(`${PROPERTIES_API_URL}/${propertyId}`, { method: 'GET' });
      const data = await safeJsonParse(response, {});
      if (response.ok) return normalizeProperty(data.data || data.property || data.item || data);
      if (response.status === 401) return rejectWithValue('Session expired.');
      if (response.status === 404) return rejectWithValue('Property not found.');
      if (response.status === 403) return rejectWithValue('Access denied.');
      const msg = data?.message || `HTTP ${response.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) { Toast.show(err.message); return rejectWithValue(err.message); }
  }
);

// ─────────────────────────────────────────────────────────────
// CREATE PROPERTY
// Images are uploaded first via processPropertyImages(),
// then the S3 fileUrls are sent in the property JSON body.
// Pass onUploadProgress(imageIndex, totalImages) for UI updates.
// ─────────────────────────────────────────────────────────────
export const createProperty = createAsyncThunk(
  'properties/createProperty',
  async (params, { rejectWithValue }) => {
    try {
      const { propertyData, token, landlordId, onUploadProgress } = params;
      if (!propertyData.name?.trim()) return rejectWithValue('Property name is required');
      if (!token)                     return rejectWithValue('Authentication token is required.');
      if (!landlordId)                return rejectWithValue('Landlord ID is required.');

      const rawImages =
        Array.isArray(propertyData.images)     && propertyData.images.length     > 0 ? propertyData.images :
        Array.isArray(propertyData.image_urls) && propertyData.image_urls.length > 0 ? propertyData.image_urls : [];

      // ✅ Blob upload — no RNFS, no base64
      const processedImages = await processPropertyImages(rawImages, token, onUploadProgress);

      const apiPayload = buildNodeApiPayload(propertyData, landlordId, processedImages);
      console.log('CREATE payload FULL:', JSON.stringify(apiPayload, null, 2));

        const response = await authFetch(PROPERTIES_API_URL, {
              method:  'POST',
              body:    JSON.stringify(apiPayload),
            });
      const data = await safeJsonParse(response, {});
        
        if (response.ok || response.status === 201) {
          Toast.show('Property created successfully!');
          const raw = data.data || data.property || data.item || data;
          // ✅ Backend may return plain filenames — always use our processedImages
          if (processedImages?.length) raw.images = processedImages;
          return { ...data, property: normalizeProperty(raw), timestamp: new Date().toISOString() };
        }
      if (response.status === 401) return rejectWithValue('Session expired.');
      if (response.status === 403) return rejectWithValue('Access denied.');
      if (response.status === 422) {
        const details = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message || JSON.stringify(data?.errors || data));
        console.error('❌ createProperty 422 validation:', details);
        Toast.show(details); return rejectWithValue(details);
      }
      const msg = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message || data?.error || `HTTP ${response.status}`);
      console.error('❌ createProperty error response:', response.status, JSON.stringify(data));
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Failed to create property';
      Toast.show(msg); return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// UPDATE PROPERTY
// ─────────────────────────────────────────────────────────────
export const updateProperty = createAsyncThunk(
  'properties/updateProperty',
  async (params, { rejectWithValue }) => {
    try {
      const { propertyId, propertyData, token, landlordId, onUploadProgress } = params;
      if (!propertyData.name?.trim()) return rejectWithValue('Property name is required');
      if (!token)                     return rejectWithValue('Authentication token is required.');
      if (!propertyId)                return rejectWithValue('Property ID is required.');

      const imageSource =
        Array.isArray(propertyData.images)     ? propertyData.images :
        Array.isArray(propertyData.image_urls) ? propertyData.image_urls : [];

      const processedImages = await processPropertyImages(imageSource, token, onUploadProgress);
      const apiPayload      = buildNodeApiPayload(propertyData, landlordId, processedImages);
      console.log('UPDATE payload images:', apiPayload.images);

        const response = await authFetch(`${PROPERTIES_API_URL}/${propertyId}`, {
               method:  'PATCH',
               body:    JSON.stringify(apiPayload),
             });
      const data = await safeJsonParse(response, {});
      if (response.ok) {
        Toast.show('Property updated successfully!');
        const raw = data.data || data.property || data.item || {};
        if (!raw.id) raw.id = propertyId;
          if (!raw.images?.length && processedImages?.length) {
             raw.images = processedImages;
           }
        return { ...data, property: normalizeProperty(raw), propertyId, timestamp: new Date().toISOString() };
      }
      if (response.status === 401) return rejectWithValue('Session expired.');
      if (response.status === 403) return rejectWithValue('Access denied.');
      if (response.status === 404) return rejectWithValue('Property not found.');
      const msg = data?.message || `HTTP ${response.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) { Toast.show(err.message); return rejectWithValue(err.message); }
  }
);

export const deleteProperty = createAsyncThunk(
  'properties/deleteProperty',
  async ({ propertyId, token, landlordId }, { rejectWithValue }) => {
    try {
      if (!token)      return rejectWithValue('Authentication token is required.');
      if (!propertyId) return rejectWithValue('Property ID is required.');
        const response = await authFetch(`${PROPERTIES_API_URL}/${propertyId}`, {
               method: 'DELETE',
             });
      const data = await safeJsonParse(response, {});
      if (response.ok) { Toast.show('Property deleted successfully!'); return { propertyId, landlordId, timestamp: new Date().toISOString() }; }
      if (response.status === 401) return rejectWithValue('Session expired.');
      if (response.status === 403) return rejectWithValue('Access denied.');
      if (response.status === 404) return rejectWithValue('Property not found.');
      const msg = data?.message || `HTTP ${response.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) { Toast.show(err.message); return rejectWithValue(err.message); }
  }
);

export const getTenantProperties = createAsyncThunk(
  'properties/getTenantProperties',
  async ({ tenantId, token }, { rejectWithValue }) => {
    try {
      if (!token)    return rejectWithValue('Authentication token is required.');
      if (!tenantId) return rejectWithValue('Tenant ID is required.');
        const response = await authFetch(`${PROPERTIES_API_URL}?limit=200&page=1`, { method: 'GET' });
      const data = await safeJsonParse(response, { items: [] });
      if (response.ok) {
        const all  = Array.isArray(data.items || data.data || []) ? (data.items || data.data || []) : [];
        const mine = all.filter(p => p.tenantId === tenantId || p.tenant_id === tenantId);
        return mine.map(normalizeProperty);
      }
      if (response.status === 401) return rejectWithValue('Session expired.');
      const msg = data?.message || `HTTP ${response.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) { Toast.show(err.message); return rejectWithValue(err.message); }
  }
);

export const getTenantById = createAsyncThunk(
  'properties/getTenantById',
  async ({ tenantId, token }, { getState, rejectWithValue }) => {
    try {
      if (!tenantId) return rejectWithValue('Tenant ID is required');
      if (!token)    return rejectWithValue('Authentication token is required');
      const state  = getState();
      const stored = state.properties?.landlordProperties || [];
      const found  = stored.find(p => p.tenantId === tenantId || p.tenant_id === tenantId);
      if (found) return { id: tenantId, name: found.tenantName || 'Unknown Tenant', email: '', phone: null };

        const response = await authFetch(`${PROPERTIES_API_URL}?limit=200&page=1`, { method: 'GET' });
      const data = await safeJsonParse(response, { items: [] });
      if (response.ok) {
        const all  = Array.isArray(data.items || data.data || []) ? (data.items || data.data || []) : [];
        const prop = all.find(p => p.tenantId === tenantId || p.tenant_id === tenantId);
        return { id: tenantId, name: prop?.tenantName || 'Unknown Tenant', email: '', phone: null };
      }
      if (response.status === 401) return rejectWithValue('Session expired.');
      return rejectWithValue('Tenant not found');
    } catch (err) { return rejectWithValue(err.message || 'Failed to fetch tenant'); }
  }
);

export const getTenantReport = createAsyncThunk(
  'properties/getTenantReport',
  async ({ propertyId, token }, { rejectWithValue }) => {
    try {
      if (!propertyId) return rejectWithValue('Property ID is required.');
      if (!token)      return rejectWithValue('Authentication token is required.');
        const response = await authFetch(`${PROPERTIES_API_URL}/${propertyId}/tenant-report`, { method: 'GET' });
      const data = await safeJsonParse(response, {});
      if (response.ok) return data;
      if (response.status === 401) return rejectWithValue('Session expired.');
      if (response.status === 403) return rejectWithValue('Access denied.');
      if (response.status === 404) return rejectWithValue('Property not found.');
      return rejectWithValue(data?.message || `HTTP ${response.status}`);
    } catch (err) { return rejectWithValue(err.message || 'Failed to fetch report'); }
  }
);

export const validateTenantIdSimple = createAsyncThunk(
  'properties/validateTenantIdSimple',
  async (tenantId, { rejectWithValue }) => {
    try {
      if (!tenantId?.trim()) return { isValid: false, message: 'Tenant ID is required', tenantInfo: null };
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(tenantId.trim())) {
        return { isValid: true, message: 'Tenant ID is valid', tenantInfo: { id: tenantId.trim(), name: `Tenant ${tenantId.slice(-4)}`, email: `tenant${tenantId.slice(-4)}@example.com`, phone: null } };
      }
      return { isValid: false, message: 'Invalid tenant ID format (expected UUID)', tenantInfo: null };
    } catch { return rejectWithValue({ isValid: false, message: 'Failed to validate', tenantInfo: null }); }
  }
);

export const getLandlordTenants = createAsyncThunk(
  'properties/getLandlordTenants',
  async ({ token }, { rejectWithValue }) => {
    try {
        const response = await authFetch(`${PROPERTIES_API_URL}?limit=200&page=1`, { method: 'GET' });
      if (!response.ok) return [];
      const data = await safeJsonParse(response, { items: [] });
      const raw  = data.items || data.properties || data.data || [];
      const all  = Array.isArray(raw) ? raw : [];
      const tenantMap = {};
      all.forEach(p => {
        if (p.tenantId && !tenantMap[p.tenantId]) {
          tenantMap[p.tenantId] = { tenant_id: p.tenantId, id: p.tenantId, name: p.tenantName || '', email: '', property_id: p.id };
        }
      });
      return Object.values(tenantMap);
    } catch (err) { return rejectWithValue(err.message || 'Failed to fetch tenants'); }
  }
);

