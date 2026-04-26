import React, { useState, useEffect } from "react";
import {
  View, Text, Image, ScrollView, StyleSheet,
  Dimensions, TouchableOpacity, Pressable, Platform,
  StatusBar, ActivityIndicator, Linking, FlatList,
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
import { openLocationInMaps, getProperty } from "../../Redux/Properties/servicesNode";
import { loginDataSelectors } from "../../Redux/Login/loginSlice";
import { propertiesSelectors, clearCurrentTenant } from "../../Redux/Properties/propertiesSlice";
import { getTenantById } from "../../Redux/Properties/servicesNode";
import { Colors } from "../../Theme";
import { getFontFamily } from "../../utils";
import { fetchSignedUrl } from "../../commonFunction/useSignedImageUrls";


const { width: screenWidth } = Dimensions.get("window");

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const PropertiesDetails = ({ route, navigation }) => {
  const dispatch = useDispatch();

  // ── ✅ KEY FIX: Read propertyId from params, then look up the
  //    LIVE property from Redux state — never use stale route.params.property
  //    The dashboard now navigates with { propertyId } not { property }
  // ──────────────────────────────────────────────────────────
  const propertyId = route?.params?.propertyId || route?.params?.property?.property_id || route?.params?.property?.id;

  // Read live property from Redux landlordProperties array
  const landlordProperties = useSelector(propertiesSelectors.getLandlordProperties);
  const property = landlordProperties.find(
    p => p?.property_id === propertyId || p?.id === propertyId
  ) || route?.params?.property || null; // fallback to passed object if Redux doesn't have it yet

  const { userData } = useSelector(loginDataSelectors.getLoginStatus);
  const accessToken  = useSelector(loginDataSelectors.getAccessToken);

  const currentTenantRaw = useSelector(propertiesSelectors.getCurrentTenant);
  const currentTenants   = Array.isArray(currentTenantRaw)
    ? currentTenantRaw
    : currentTenantRaw ? [currentTenantRaw] : [];

  const tenantLoading = useSelector(propertiesSelectors.isTenantLoading);
  const [pendingTenants, setPendingTenants] = useState(0);

  // ── If property not in Redux yet, fetch it ─────────────────
  useEffect(() => {
    if (!property && propertyId && accessToken) {
      console.log('🔄 Property not in Redux, fetching by ID:', propertyId);
      dispatch(getProperty(propertyId));
    }
  }, [propertyId, property, accessToken]);

  const fallbackTenants = (property?.tenant_names || []).map((name, i) => ({
    id:    property?.tenant_ids?.[i] || `fallback-${i}`,
    name,
    email: property?.tenant_emails?.[i] || null,
    phone: null, avatar: null,
  }));
  const displayTenants = currentTenants.length > 0 ? currentTenants : fallbackTenants;

  const contactEmail = userData?.email       || null;
  const contactPhone = userData?.phoneNumber || null;

  // ── Amenities from boolean flags ──────────────────────────
const getAmenitiesFromFlags = (prop) => {
  // normalizeProperty already built this array from all boolean flags
  if (Array.isArray(prop?.amenities) && prop.amenities.length > 0) {
    return prop.amenities;
  }
  // Fallback for any stale/unnormalized property objects
  const list = [];
  if (prop?.isFurnished) list.push('Furnished');
  if (prop?.hasParking)  list.push('Parking');
  if (prop?.hasElevator) list.push('Elevator');
  return list;
};
  const propertyAmenities = getAmenitiesFromFlags(property);

  // ── ✅ Get raw images and sign them via /api/s3/download-url ──
  // The backend's download-url endpoint prepends "uploads/" to the key,
  // so we must send just the bare filename (e.g. "uuid.jpg"), NOT "uploads/uuid.jpg".
  const [signedUrls, setSignedUrls] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    const images = property?.images || property?.image_urls || [];
    if (!images.length || !accessToken) {
      setSignedUrls([]);
      setImageLoading(false);
      return;
    }

    let cancelled = false;
    const resolve = async () => {
      setImageLoading(true);

      const keys = images
        .map((img) => {
          if (!img || typeof img !== 'string') return null;
          const s = img.trim();

          // Already signed — use directly
          if (s.includes('X-Amz-Algorithm')) return { signed: s };

          let key = null;

          // Double-prefixed URL — extract the inner real key
          const doubleMatch = s.match(/uploads\/https?%3A\/\/|uploads\/https?:\/\//i);
          if (doubleMatch) {
            const inner = decodeURIComponent(s.substring(doubleMatch.index + 'uploads/'.length));
            const m = inner.match(/\.amazonaws\.com\/(.+)/);
            key = m ? m[1].split('?')[0] : null;
          }

          // Full S3 URL — extract key
          if (!key) {
            const m = s.match(/\.amazonaws\.com\/(.+)/);
            if (m) key = m[1].split('?')[0];
          }

          // Plain key (e.g. "uploads/uuid.jpg")
          if (!key && !s.startsWith('http')) key = s;

          if (!key) return null;

          // Strip "uploads/" prefix because the backend adds it
          key = key.replace(/^uploads\//, '');
          return { key };
        })
        .filter(Boolean);

      const results = await Promise.all(
        keys.map(async (entry) => {
          if (entry.signed) return entry.signed;          // already signed
          try {
            return await fetchSignedUrl(entry.key, accessToken);
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setSignedUrls(results.filter(Boolean));
        setImageLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [JSON.stringify(property?.images || property?.image_urls || []), accessToken]);

const fetchTenantData = async () => {
  const av = (property?.availability || property?.availabilityStatus || '').toLowerCase();
  const isOccupied = av === 'currently occupied' || av === 'under maintenance';
  if (!isOccupied || !accessToken) return;

  // ✅ FIX Bug 2 — use tenant_ids OR fall back to singular tenantId
  const tenantIds = property?.tenant_ids?.length > 0
    ? property.tenant_ids
    : property?.tenantId
    ? [property.tenantId]
    : property?.tenant_id
    ? [property.tenant_id]
    : [];

  if (tenantIds.length === 0) return;

  setPendingTenants(tenantIds.length);
  for (const tenantId of tenantIds) {
    dispatch(getTenantById({ tenantId, token: accessToken }))
      .finally(() => setPendingTenants(prev => Math.max(0, prev - 1)));
  }
};

  // ── Derived values ────────────────────────────────────────
  const availabilityVal = (property?.availability || property?.availabilityStatus || '').toLowerCase();
  const status =
    availabilityVal === 'vacant' || availabilityVal === 'available soon'
      ? { label: "Available",         color: "#16A34A" }
      : availabilityVal === 'under maintenance'
      ? { label: "Under Maintenance",  color: "#F59E0B" }
      : availabilityVal === 'currently occupied'
      ? { label: "Occupied",           color: "#DC2626" }
      : { label: "Unknown",            color: "#6B7280" };

  const formatAddress = () =>
    [property?.street, property?.city, property?.state, property?.zipcode].filter(Boolean).join(", ");

  const getAreaValue = () => {
    if (!property?.area) return "N/A";
    if (typeof property.area === 'number') return property.area.toLocaleString();
    const match = String(property.area).match(/\d+/);
    return match ? parseInt(match[0]).toLocaleString() : property.area;
  };

  const handleCallTenant = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => Toast.show('Unable to make call'));
    else Toast.show('Phone number not available');
  };
  const handleEmailTenant = (email) => {
    if (email) Linking.openURL(`mailto:${email}`).catch(() => Toast.show('Unable to open email'));
    else Toast.show('Email not available');
  };

  const navbarHeight = Platform.OS === "android"
    ? StatusBar.currentHeight + hp(9) + hp(2)
    : hp(7) + hp(9) + hp(2);

  // ── Loading state while fetching property ─────────────────
  if (!property) {
    return (
      <Container style={{ marginTop: -navbarHeight }}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading property...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container style={{ marginTop: -navbarHeight }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>

          {/* ════════════════════════════════════════════════
              IMAGE GALLERY
              signedUrls = signed download URLs from /api/s3/download-url
              imageLoading = true while signing is in progress
              ════════════════════════════════════════════════ */}
          <View style={{ position: "relative" }}>
            <View style={{ height: 350, backgroundColor: "#E5E7EB" }}>

              {imageLoading && (property?.images || property?.image_urls || []).length > 0 ? (
                // Signing in progress
                <View style={styles.imageLoadingContainer}>
                  <ActivityIndicator size="large" color="#EF4444" />
                  <Text style={styles.imageLoadingText}>Loading images...</Text>
                </View>

              ) : signedUrls.length > 0 ? (
                // ✅ Signed URLs ready — render swiper
                <Swiper
                  autoplay={signedUrls.length > 1}
                  autoplayTimeout={3}
                  showsPagination
                  paginationStyle={{ bottom: 10 }}
                  dotStyle={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                  activeDotStyle={{ backgroundColor: "#fff" }}
                >
                  {signedUrls.map((uri, idx) => (
                    <View key={idx} style={{ flex: 1 }}>
                      <Image
                        source={{ uri }}
                        style={{ width: screenWidth, height: "100%" }}
                        resizeMode="cover"
                        onError={(e) => console.warn('❌ Image load error idx', idx, ':', e.nativeEvent.error)}
                        onLoad={() => console.log('✅ Image loaded idx', idx)}
                      />
                    </View>
                  ))}
                </Swiper>

              ) : (
                // No images available
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

            {signedUrls.length > 0 && (
              <View style={styles.photoCount}>
                <Text style={styles.photoCountText}>
                  {signedUrls.length} Photo{signedUrls.length !== 1 ? 's' : ''}
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

          {/* ════════════════════════════════════════════════
              HEADER + BASIC INFO
              ════════════════════════════════════════════════ */}
          <View style={styles.glassCard}>
            <View style={styles.topRow}>
              <View style={styles.leftBlock}>
                <Text style={styles.propertyName}>{property.name}</Text>
                {formatAddress() ? (
                  <TouchableOpacity onPress={() => openLocationInMaps(property)} style={styles.locationRow}>
                    <View style={{ flexDirection: 'row' }}>
                      <AppIcon name={icons.location} size={wp(5)} />
                      <Text style={styles.propertyAddress}>{formatAddress()}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.rightBlock}>
                <Text style={styles.propertyType}>{property.property_type || 'Apartment'}</Text>
              </View>
            </View>
          </View>

          {/* STATS CARD */}
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
                    ? new Date(property.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                    : "N/A"}
                </Text>
                <Text style={styles.infoLabel}>Added On</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoValue, { color: status.color }]}>{status.label}</Text>
                <Text style={styles.infoLabel}>Status</Text>
              </View>
            </View>
          </View>

          {/* DESCRIPTION */}
          {property.description ? (
            <View style={styles.glassCard}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <View style={{ marginTop: 10 }}>
                <Text style={styles.descText}>{property.description}</Text>
              </View>
            </View>
          ) : null}

          {/* AMENITIES */}
          {propertyAmenities.length > 0 && (
            <View style={styles.glassCard}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {propertyAmenities.map((amenity, i) => (
                  <View key={i} style={styles.amenityItem}>
                    <View style={styles.amenityIconBox}>
                      <AppIcon name={getAmenityIcon(amenity)} size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TENANT INFORMATION */}
          {(availabilityVal === 'currently occupied' || availabilityVal === 'under maintenance') && (
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
                    <Text style={{ color: '#6B7280', fontSize: 14 }}>No tenant information available</Text>
                  )}
                  renderItem={({ item: tenant }) => (
                    <View style={styles.tenantRow}>
                      <View style={styles.tenantLeft}>
                        <View style={styles.tenantAvatar}>
                          {tenant.avatar ? (
                            <Image source={{ uri: tenant.avatar }} style={styles.avatarImage} />
                          ) : (
                            <Text style={styles.avatarText}>
                              {tenant.name?.charAt(0)?.toUpperCase() || "T"}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tenantName}>{tenant.name}</Text>
                          <Text style={styles.tenantHouse}>Current Tenant</Text>
                          {tenant.email ? <Text style={styles.tenantLease}>{tenant.email}</Text> : null}
                          {tenant.lease_start ? (
                            <Text style={styles.tenantLease}>
                              Lease: {new Date(tenant.lease_start).toLocaleDateString()}
                              {tenant.lease_end ? ` - ${new Date(tenant.lease_end).toLocaleDateString()}` : ''}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.tenantActions}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => handleEmailTenant(tenant.email)}>
                          <AppIcon name={icons.email} size={hp(2.2)} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={() => handleCallTenant(tenant.phone)}>
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
                    <AppIcon name={icons.email} size={hp(2.2)} style={{ marginRight: 10 }}/>
               
                  <View>
                    <Text style={styles.infoRowLabel}>Email</Text>
                    <Text style={[styles.infoRowValue, { color: "#2563EB" }]}>{contactEmail}</Text>
                  </View>
                </View>
              )}
              {contactPhone && (
                <View style={styles.infoRowLine}>
                    <AppIcon name={icons.phone} size={hp(2.2)} style={{ marginRight: 10 }}/>
                  <View>
                    <Text style={styles.infoRowLabel}>Phone</Text>
                    <Text style={[styles.infoRowValue, { color: "#2563EB" }]}>{contactPhone}</Text>
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

// ─────────────────────────────────────────────────────────────
// Amenity icon mapper
// ─────────────────────────────────────────────────────────────
const getAmenityIcon = (amenity) => {
  const a = amenity.toLowerCase().trim();
  if (a === "furnished" || a.includes("wardrobe") || a.includes("closet") || a.includes("floor") || a.includes("ceiling")) return icons.furnished;
  if (a === "parking" || a.includes("garage") || a.includes("covered") || a.includes("ev charging")) return icons.parking;
  if (a === "elevator") return icons.elevator;
  if (a === "ac" || a.includes("air") || a.includes("hvac") || a.includes("heating") || a.includes("fireplace")) return icons.hvac;
  if (a === "gym" || a.includes("fitness")) return icons.gym;
  if (a === "pool" || a.includes("swimming")) return icons.pool;
  if (a.includes("appliances") || a.includes("washer") || a.includes("dryer") || a.includes("dishwasher") || a.includes("refrigerator") || a.includes("microwave") || a.includes("stainless") || a.includes("disposal")) return icons.appliances;
  if (a.includes("laundry") || a.includes("in-unit")) return icons.washerDryer;
  if (a.includes("landscaping") || a.includes("garden") || a.includes("dog park") || a.includes("playground")) return icons.landscaping;
  if (a.includes("balcony") || a.includes("patio") || a.includes("bbq") || a.includes("deck")) return icons.balcony;
  if (a.includes("wifi") || a.includes("internet") || a.includes("cable")) return icons.internet;
  if (a.includes("smart") || a.includes("thermostat") || a.includes("lock") || a.includes("doorbell") || a.includes("keyless")) return icons.smartHome;
  if (a.includes("light") || a.includes("electrical")) return icons.electrical;
  if (a.includes("paint")) return icons.painting;
  if (a.includes("plumb") || a.includes("water")) return icons.plumbing;
  if (a.includes("carpentry") || a.includes("wood") || a.includes("cabinet")) return icons.carpentry;
  if (a.includes("clean") || a.includes("trash") || a.includes("recycle")) return icons.cleaning;
  if (a.includes("pet") || a.includes("cat") || a.includes("dog")) return icons.petFriendly;
  if (a.includes("security") || a.includes("cctv") || a.includes("controlled") || a.includes("gated")) return icons.security;
  if (a.includes("wheelchair") || a.includes("ada") || a.includes("accessible")) return icons.accessibility;
  return icons.furnished;
};

export default PropertiesDetails;

const styles = StyleSheet.create({
  errorContainer:        { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText:             { fontSize: 18, color: "#6B7280", marginBottom: 20 },
  backButton:            { backgroundColor: "#EF4444", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backButtonText:        { color: "#fff", fontSize: 16, fontWeight: "600" },
  imageLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageLoadingText:      { fontSize: 14, color: '#6B7280', marginTop: 12 },
  photoCount:            { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  photoCountText:        { color: "#fff", fontSize: 12, fontWeight: "700" },
  backBtn:               { position: "absolute", left: 16, top: "50%", transform: [{ translateY: -20 }], backgroundColor: "white", padding: 10, borderRadius: 30, elevation: 5, shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 } },
  favBtn:                { position: "absolute", right: 16, top: "50%", transform: [{ translateY: -20 }], backgroundColor: "white", padding: 10, borderRadius: 30, elevation: 5, shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 } },
  glassCard:             { backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, overflow: "hidden", padding: 16, marginHorizontal: 16, marginVertical: 8 },
  topRow:                { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  leftBlock:             { flex: 1, paddingRight: 10 },
  propertyName:          { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 6 },
  locationRow:           { flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" },
  propertyAddress:       { fontSize: 13, color: "#6B7280", maxWidth: "93%", lineHeight: 18, marginLeft: 4 },
  rightBlock:            { paddingHorizontal: 12, paddingVertical: 6, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", borderRadius: 6 },
  propertyType:          { fontSize: 12, fontWeight: "700", color: "#fff", textTransform: "capitalize" },
  statsBox:              { backgroundColor: "rgba(243,244,246,0.5)", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", padding: 12, marginTop: 12 },
  statCol:               { alignItems: "center", flex: 1 },
  statValue:             { fontSize: 16, fontWeight: "700", color: "#111827" },
  statLabel:             { fontSize: 11, color: "#6B7280", marginTop: 2 },
  divider:               { width: 1, backgroundColor: "#D1D5DB" },
  infoRow:               { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  infoCol:               { alignItems: "center", flex: 1 },
  infoValue:             { fontSize: 14, fontWeight: "700", color: "#111827" },
  infoLabel:             { fontSize: 11, color: "#6B7280", marginTop: 2 },
  sectionTitle:          { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#111827" },
  descText:              { fontSize: 14, color: "#4B5563", lineHeight: 22 },
  amenitiesGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  amenityItem:           { width: "47%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.5)", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(229,231,235,0.5)" },
  amenityIconBox:        { width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(254,226,226,0.5)", justifyContent: "center", alignItems: "center", marginRight: 8 },
  amenityText:           { fontSize: 12, color: "#374151", fontWeight: "500", flex: 1 },
  loadingContainer:      { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  loadingText:           { marginLeft: 10, fontSize: 14, color: "#6B7280" },
  tenantRow:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  tenantLeft:            { flexDirection: "row", alignItems: "center", flex: 1 },
  tenantAvatar:          { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarImage:           { width: 44, height: 44, borderRadius: 22 },
  avatarText:            { fontSize: 18, fontWeight: "700", color: "#6B7280" },
  tenantName:            { fontSize: 15, fontWeight: "600", color: "#111827" },
  tenantHouse:           { fontSize: 12, color: "#6B7280", marginTop: 2 },
  tenantLease:           { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  tenantActions:         { flexDirection: "row", gap: 8 },
  iconButton:            { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.8)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(229,231,235,0.5)" },
  infoRowLine:           { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  infoRowLabel:          { fontSize: 12, color: "#6B7280" },
  infoRowValue:          { fontSize: 14, color: "#111827", fontWeight: "600" },
  rentPrice:             { fontSize: 20, fontWeight: "bold", color: Colors.black },
  utilitiesText:         { fontSize: 12, color: "#6B7280", marginTop: 2 },
  downloadBtn:           { backgroundColor: "#EF4444", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  downloadBtnText:       { color: "#fff", fontWeight: "700", fontSize: 12 },
});
