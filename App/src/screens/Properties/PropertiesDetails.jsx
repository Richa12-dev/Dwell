import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Platform,
  StatusBar,
  ActivityIndicator,
  Linking,
   FlatList,
} from "react-native";

import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import Swiper from "react-native-swiper";
import { useSelector, useDispatch } from "react-redux";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Toast from "react-native-simple-toast";

import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import Container from "../../components/Container/Container";
import { openLocationInMaps } from "../../Redux/Properties/services";
import { loginDataSelectors } from "../../Redux/Login/loginSlice";
import { propertiesSelectors, clearCurrentTenant } from "../../Redux/Properties/propertiesSlice";
import { getTenantById } from "../../Redux/Properties/services";
import { Colors } from "../../Theme";
import { getFontFamily } from "../../utils";


const { width: screenWidth } = Dimensions.get("window");

const PropertiesDetails = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const property = route?.params?.property;
  
  const { userData } = useSelector(loginDataSelectors.getLoginStatus);
  const accessToken = useSelector(loginDataSelectors.getAccessToken);
  const currentTenantRaw = useSelector(propertiesSelectors.getCurrentTenant);
  const currentTenants = Array.isArray(currentTenantRaw)
    ? currentTenantRaw
    : currentTenantRaw
    ? [currentTenantRaw]
    : [];

  const tenantLoading = useSelector(propertiesSelectors.isTenantLoading);
  const [pendingTenants, setPendingTenants] = useState(0);

  const fallbackTenants = (property?.tenant_names || []).map((name, i) => ({
    id: property?.tenant_ids?.[i] || `fallback-${i}`,
    name,
    email: property?.tenant_emails?.[i] || null,
    phone: null,
    avatar: null,
  }));

  const displayTenants = currentTenants.length > 0 ? currentTenants : fallbackTenants;

  const contactEmail = userData?.email || null;
  const contactPhone = userData?.phoneNumber || null;

  // ✅ Debug logging to see what we receive
  useEffect(() => {
    if (property) {
      console.log('🏠 Property Details Loaded:', {
        property_id: property.property_id,
        name: property.name,
        has_image_urls: !!property.image_urls,
        image_urls_length: property.image_urls?.length,
        has_images: !!property.images,
        images_length: property.images?.length,
        has_media: !!property.media,
        media_photos_length: property.media?.photos?.length,
        media_preview_length: property.media?.photos_preview?.length,
      });
    }
  }, [property]);

useEffect(() => {
  dispatch(clearCurrentTenant());
  setPendingTenants(0);

  const fetchTenantData = async () => {
    const tenantIds = property?.tenant_ids;
    const isOccupied = property?.availability !== 'available';

    console.log('🔍 Fetch guard check:', { isOccupied, tenantIds, hasToken: !!accessToken });

    if (!isOccupied || !Array.isArray(tenantIds) || tenantIds.length === 0 || !accessToken) {
    
      return;
    }

    setPendingTenants(tenantIds.length);

    for (const tenantId of tenantIds) {
      dispatch(getTenantById({ tenantId, token: accessToken }))
        .finally(() => {
          setPendingTenants((prev) => Math.max(0, prev - 1));
        });
    }
  };

  if (property) fetchTenantData();
  return () => { dispatch(clearCurrentTenant()); };
}, [property?.property_id]);




  // ✅ Fixed image source handler - handles all formats including S3 keys
  const getImageSource = (img) => {
    if (!img) {
      return require("../../Assets/Image/empty-box.png");
    }

    // If it's already a require statement or local asset
    if (typeof img === 'number') {
      return img;
    }

    // If it's a string
    if (typeof img === "string") {
      const cleanUrl = img.trim();
      
      // If it's a full HTTP/HTTPS URL (including pre-signed S3 URLs)
      if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
        return { uri: cleanUrl };
      }
      
      // If it's a base64 data URI
      if (cleanUrl.startsWith("data:image")) {
        return { uri: cleanUrl };
      }
      
      // ✅ NEW: If it looks like an S3 key (contains forward slashes but no http)
      if (cleanUrl.includes("/") && !cleanUrl.startsWith("http")) {
        console.log('🔧 Converting S3 key to full URL:', cleanUrl);
        return { uri: `https://dp-properties.s3.amazonaws.com/${cleanUrl}` };
      }
      
      // If it's a base64 string without prefix
      if (cleanUrl.length > 100 && !cleanUrl.includes("/") && !cleanUrl.includes(".")) {
        return { uri: `data:image/jpeg;base64,${cleanUrl}` };
      }
      
      // Otherwise treat as URL
      return { uri: cleanUrl };
    }

    // If it's an object with uri property
    if (img?.uri) {
      return { uri: img.uri };
    }

    // If it's an object with base64 property
    if (img?.base64) {
      return { uri: `data:image/jpeg;base64,${img.base64}` };
    }

    // ✅ CRITICAL FIX: If it's an object with url property (from API media.photos_expanded/preview)
    if (img?.url) {
      return { uri: img.url };
    }

    // ✅ NEW: If it's an object with key property, build full S3 URL
    if (img?.key) {
      console.log('🔧 Converting S3 key object to full URL:', img.key);
      return { uri: `https://dp-properties.s3.amazonaws.com/${img.key}` };
    }

    // Fallback
    return require("../../Assets/Image/empty-box.png");
  };

  // ✅ FIXED: Get property images - check photos_preview FIRST since PropertyCard works with it
  const getPropertyImages = () => {
    // ✅ PRIORITY 1: Check media.photos_preview (PropertyCard uses this successfully!)
    if (property?.media?.photos_preview && Array.isArray(property.media.photos_preview) && property.media.photos_preview.length > 0) {
      return property.media.photos_preview;
    }

    // Priority 2: Check media.photos_expanded
    if (property?.media?.photos_expanded && Array.isArray(property.media.photos_expanded) && property.media.photos_expanded.length > 0) {
      console.log('✅ Found images in media.photos_expanded:', property.media.photos_expanded.length);
      return property.media.photos_expanded;
    }

    // Priority 3: Check image_urls
    if (property?.image_urls && Array.isArray(property.image_urls) && property.image_urls.length > 0) {
      console.log('✅ Found images in image_urls:', property.image_urls.length);
      return property.image_urls;
    }

    // Priority 4: Check images
    if (property?.images && Array.isArray(property.images) && property.images.length > 0) {
      console.log('✅ Found images in images:', property.images.length);
      return property.images;
    }

    // Priority 5: Check media.photos and convert S3 keys to full URLs
    if (property?.media?.photos && Array.isArray(property.media.photos) && property.media.photos.length > 0) {
      console.log('⚠️ Found S3 keys in media.photos, building full URLs:', property.media.photos.length);
      // Convert S3 keys to full URLs
      return property.media.photos.map(photoKey => ({
        key: photoKey,
        url: `https://dp-properties.s3.amazonaws.com/${photoKey}`
      }));
    }

    return [];
  };

  const propertyImages = getPropertyImages();

  const status = property?.availability === 'available'
    ? { label: "Available", color: "#16A34A" }
    : { label: "Occupied", color: "#DC2626" };

  const formatAddress = () => {
    const parts = [];
    if (property?.street) parts.push(property.street);
    if (property?.city) parts.push(property.city);
    if (property?.state) parts.push(property.state);
    if (property?.zipcode) parts.push(property.zipcode);
    return parts.join(", ");
  };

  const handleCallTenant = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Toast.show('Unable to make call');
      });
    } else {
      Toast.show('Phone number not available');
    }
  };

  const handleEmailTenant = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`).catch(() => {
        Toast.show('Unable to open email');
      });
    } else {
      Toast.show('Email not available');
    }
  };

  // ✅ Extract area value from string (e.g., "2000 sqft" -> "2000")
  const getAreaValue = () => {
    if (!property?.area) return "N/A";
    if (typeof property.area === 'number') return property.area.toLocaleString();
    
    // Extract number from string like "2000 sqft"
    const match = String(property.area).match(/\d+/);
    return match ? parseInt(match[0]).toLocaleString() : property.area;
  };

  const navbarHeight =
    Platform.OS === "android"
      ? StatusBar.currentHeight + hp(9) + hp(2)
      : hp(7) + hp(9) + hp(2);

  if (!property) {
    return (
      <Container style={{ marginTop: -navbarHeight }}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Property not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  return (
    <Container style={{ marginTop: -navbarHeight }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          {/* IMAGE GALLERY */}
          <View style={{ position: "relative" }}>
            <View style={{ height: 350, backgroundColor: "#E5E7EB" }}>
              {propertyImages.length > 0 ? (
                <Swiper
                  autoplay={propertyImages.length > 1}
                  autoplayTimeout={3}
                  showsPagination
                  paginationStyle={{ bottom: 10 }}
                  dotStyle={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                  activeDotStyle={{ backgroundColor: "#fff" }}
                >
                  {propertyImages.map((img, idx) => {
                    // ✅ Extract URL - handle both object {url: "..."} and string formats
                    let imageUri = null;
                    
                    if (typeof img === 'object' && img !== null) {
                     
                      imageUri = img.url || img.uri || img.key;
                    } else if (typeof img === 'string') {
                      // String format
                      imageUri = img;
                    }

                    // If no valid URI found, skip this image
                    if (!imageUri) {
                      console.log('⚠️ No valid URI found for image index', idx, img);
                      return null;
                    }

                    // Build full URL if it's just an S3 key
                    if (!imageUri.startsWith('http') && imageUri.includes('/')) {
                      imageUri = `https://dp-properties.s3.amazonaws.com/${imageUri}`;
                    }

                    console.log(`🖼️ Rendering image ${idx}:`, imageUri.substring(0, 100) + '...');
                    
                    return (
                      <View key={idx} style={{ flex: 1 }}>
                        <Image
                          source={{ uri: imageUri }}
                          style={{ width: screenWidth, height: "100%" }}
                          resizeMode="cover"
                          onError={(e) => {
                            console.log('❌ Image load error for index', idx);
                            console.log('Error:', e.nativeEvent.error);
                            console.log('Image URI (first 150 chars):', imageUri?.substring(0, 150));
                            console.log('Original image data:', img);
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded successfully for index', idx);
                          }}
                          onLoadStart={() => {
                            console.log('⏳ Started loading image', idx);
                          }}
                        />
                      </View>
                    );
                  })}
                </Swiper>
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={require("../../Assets/Image/empty-box.png")}
                    style={{ width: 200, height: 200 }}
                    resizeMode="contain"
                  />
                  <Text style={{ marginTop: 10, color: '#6B7280' }}>No images available</Text>
                </View>
              )}
            </View>

            {propertyImages.length > 0 && (
              <View style={styles.photoCount}>
                <Text style={styles.photoCountText}>
                  {propertyImages.length} Photo{propertyImages.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <AppIcon name={icons.arrowBack} size={wp(6)} />
            </Pressable>

            <Pressable style={styles.favBtn}>
              <AppIcon name={icons.heart} size={wp(6)} />
            </Pressable>
          </View>

          {/* HEADER + BASIC PROPERTY INFO */}
          <View style={styles.glassCard}>
            <View style={styles.topRow}>
              <View style={styles.leftBlock}>
                <Text style={styles.propertyName}>{property.name}</Text>
                {formatAddress() ? (
                  <TouchableOpacity
                    onPress={() => openLocationInMaps(property)}
                    style={styles.locationRow}
                  >
                  <View style={{ flexDirection: 'row' }}>
                <AppIcon name={icons.location} size={wp(5)} />
                    <Text style={styles.propertyAddress}>
                      {formatAddress()}
                    </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.rightBlock}>
                <Text style={styles.propertyType}>
                  {property.property_type || 'Apartment'}
                </Text>
              </View>
            </View>
          </View>

          {/* PROPERTY STATS CARD */}
          <View style={[styles.glassCard, { borderWidth: 1, borderColor: "#D14B4B" }]}>
            <View style={styles.statsBox}>
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{property.bedrooms || "0"}</Text>
                <Text style={styles.statLabel}>Bedrooms</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statCol}>
                <Text style={styles.statValue}>{property.bathrooms || "0"}</Text>
                <Text style={styles.statLabel}>Bathrooms</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statCol}>
                <Text style={styles.statValue}>{getAreaValue()}</Text>
                <Text style={styles.statLabel}>sq. ft.</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoValue}>{property.year_built || "N/A"}</Text>
                <Text style={styles.infoLabel}>Year Built</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.infoValue}>
                  {property.created_at
                    ? new Date(property.created_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : "N/A"}
                </Text>
                <Text style={styles.infoLabel}>Added On</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={[styles.infoValue, { color: status.color }]}>
                  {status.label}
                </Text>
                <Text style={styles.infoLabel}>Status</Text>
              </View>
            </View>
          </View>

          {/* DESCRIPTION */}
          {property.description && (
            <View style={styles.glassCard}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <View style={{ marginTop: 10 }}>
                <Text style={styles.descText}>{property.description}</Text>
              </View>
            </View>
          )}

          {/* AMENITIES */}
          {property.amenities?.length > 0 && (
            <View style={styles.glassCard}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {property.amenities.map((amenity, i) => (
                  <View key={i} style={styles.amenityItem}>
                    <View style={styles.amenityIconBox}>
                      <AppIcon
                        name={getAmenityIcon(amenity)}
                        size={20}
                        color="#EF4444"
                      />
                    </View>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TENANT INFORMATION - Using Redux state */}
        {property.availability !== 'available' &&
  (
  <View style={styles.glassCard}>
    <Text style={styles.sectionTitle}>Tenant Information</Text>

    {(tenantLoading || pendingTenants > 0) && displayTenants.length === 0 ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#EF4444" />
        <Text style={styles.loadingText}>Loading tenant information...</Text>
      </View>
    ) : (
      <FlatList
        data={displayTenants}
        keyExtractor={(item) => item.id?.toString()}
        scrollEnabled={false}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 }} />
        )}
        ListEmptyComponent={() => (
          <Text style={{ color: '#6B7280', fontSize: 14 }}>
            No tenant information available
          </Text>
        )}
        renderItem={({ item: tenant }) => (
          <View style={styles.tenantRow}>
            <View style={styles.tenantLeft}>

              {/* Avatar */}
              <View style={styles.tenantAvatar}>
                {tenant.avatar ? (
                  <Image
                    source={{ uri: tenant.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {tenant.name?.charAt(0)?.toUpperCase() || "T"}
                  </Text>
                )}
              </View>

              {/* Tenant Info */}
              <View style={{ flex: 1 }}>
                <Text style={styles.tenantName}>{tenant.name}</Text>
                <Text style={styles.tenantHouse}>Current Tenant</Text>
                {tenant.email && (
                  <Text style={styles.tenantLease}>{tenant.email}</Text>
                )}
                {tenant.lease_start && (
                  <Text style={styles.tenantLease}>
                    Lease: {new Date(tenant.lease_start).toLocaleDateString()}
                    {tenant.lease_end
                      ? ` - ${new Date(tenant.lease_end).toLocaleDateString()}`
                      : ''}
                  </Text>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.tenantActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleEmailTenant(tenant.email)}
              >
               
                <AppIcon name={icons.email} size={hp(2.2)} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleCallTenant(tenant.phone)}
              >
                <AppIcon name={icons.phone} size={hp(2.2)} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    )}
  </View>
)}

          {/* CONTACT INFORMATION */}
          {(contactEmail || contactPhone) && (
            <View style={styles.glassCard}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              {contactEmail && (
                <View style={styles.infoRowLine}>
                  <MaterialIcon
                    name="email"
                    size={18}
                    color="#3B82F6"
                    style={{ marginRight: 10 }}
                  />
                  <View>
                    <Text style={styles.infoRowLabel}>Email</Text>
                    <Text style={[styles.infoRowValue, { color: "#2563EB" }]}>
                      {contactEmail}
                    </Text>
                  </View>
                </View>
              )}

              {contactPhone && (
                <View style={styles.infoRowLine}>
                  <MaterialIcon
                    name="phone"
                    size={18}
                    color="#3B82F6"
                    style={{ marginRight: 10 }}
                  />
                  <View>
                    <Text style={styles.infoRowLabel}>Phone</Text>
                    <Text style={[styles.infoRowValue, { color: "#2563EB" }]}>
                      {contactPhone}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ACTION BUTTONS */}
          <View style={styles.glassCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <View>
                <Text style={styles.rentPrice}>
                  ${property.monthly_rent?.toLocaleString() || "0"}/month
                </Text>
                <Text style={styles.utilitiesText}>+ Utilities Bill</Text>
              </View>
              <TouchableOpacity style={styles.downloadBtn}>
                <Text style={styles.downloadBtnText}>Download Agreement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};

// Helper function to get amenity icons
const getAmenityIcon = (amenity) => {
  const amenityLower = amenity.toLowerCase().trim();
  
  // Exact or close matches first
  if (amenityLower === "furnished") return icons.furnished;
  if (amenityLower === "parking") return icons.parking;
  if (amenityLower === "elevator") return icons.elevator;
  if (amenityLower === "ac" || amenityLower.includes("air") || amenityLower.includes("conditioning")) return icons.hvac;
  if (amenityLower === "gym" || amenityLower.includes("fitness")) return icons.furnished;
  if (amenityLower === "pool" || amenityLower.includes("swimming")) return icons.cleaning;
  if (amenityLower.includes("appliances")) return icons.appliances;
  if (amenityLower.includes("landscaping") || amenityLower.includes("garden")) return icons.landscaping;
  if (amenityLower.includes("wardrobe") || amenityLower.includes("closet")) return icons.furnished;
  if (amenityLower.includes("wifi") || amenityLower.includes("internet")) return icons.electrical;
  if (amenityLower.includes("light") || amenityLower.includes("electrical")) return icons.electrical;
  if (amenityLower.includes("paint")) return icons.painting;
  if (amenityLower.includes("hvac") || amenityLower.includes("heating")) return icons.hvac;
  if (amenityLower.includes("plumb")) return icons.plumbing;
  if (amenityLower.includes("carpentry") || amenityLower.includes("wood")) return icons.carpentry;
  if (amenityLower.includes("clean")) return icons.cleaning;
  
  // Default fallback
  return icons.furnished;
};


export default PropertiesDetails;

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#6B7280",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  leftBlock: {
    flex: 1,
    paddingRight: 10,
  },
  propertyName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  propertyAddress: {
    fontSize: 13,
    color: "#6B7280",
    maxWidth: "93%",
    lineHeight: 18,
    marginLeft: 4,
  },
  rightBlock: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 6,
  },
  propertyType: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textTransform: "capitalize",
  },
   backBtn: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "white",
    padding: 10,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
  },
  favBtn: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "white",
    padding: 10,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
  },
    photoCount: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  photoCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  statsBox: {
    backgroundColor: "rgba(243, 244, 246, 0.5)",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    marginTop: 12,
  },
  statCol: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: "#D1D5DB",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  infoCol: {
    alignItems: "center",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  infoLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  rentPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.black,
  },
  utilitiesText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },
  descText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  amenityItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.5)",
  },
  amenityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(254, 226, 226, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  amenityText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#6B7280",
  },
  tenantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  tenantLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6B7280",
  },
  tenantName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  tenantHouse: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  tenantLease: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  tenantActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.5)",
  },
  infoRowLine: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoRowLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  infoRowValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  downloadBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  downloadBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});
