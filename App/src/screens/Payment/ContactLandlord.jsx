import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Box, Text, HStack, VStack } from "native-base";
import { useSelector, useDispatch } from "react-redux";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { useNavigation } from "@react-navigation/native";
import { getTenantProperties, getProperty } from "../../Redux/Properties/services";
import { propertiesSelectors } from "../../Redux/Properties/propertiesSlice";
import Container from "../../components/Container/Container";
import { getFontFamily } from '../../utils';

// ─────────────────────────────────────────────────────────────
// Helper: extract a plain string property_id safely
// ─────────────────────────────────────────────────────────────
const extractPropertyId = (tenantProperties, currentProperty) => {
  const fromTenant = tenantProperties?.[0]?.property_id;
  const fromCurrent = currentProperty?.property_id;

  // Guard: must be a non-empty string, never an object
  if (typeof fromTenant === "string" && fromTenant.trim()) return fromTenant.trim();
  if (typeof fromCurrent === "string" && fromCurrent.trim()) return fromCurrent.trim();
  return null;
};

const ContactLandlord = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const { tenantProperties, currentProperty, loading } = useSelector(
    propertiesSelectors.getPropertiesData
  );
  const loginData = useSelector((state) => state.loginData || {});
  const token = loginData?.accessToken;
  const tenant_sub = loginData?.userData?.tenantId;

  // ─────────────────────────────────────────────────────────────
  // Single combined fetch — fixes the waterfall double-call bug
  // Step 1: getTenantProperties → get property_id string
  // Step 2: getProperty(propertyId) → get landlord_contact
  // Both happen in sequence inside this one function, triggered
  // only ONCE on mount (or on manual refresh).
  // ─────────────────────────────────────────────────────────────
  const fetchLandlordInfo = useCallback(
    async (isRefresh = false) => {
      if (!token || !tenant_sub) return;

      if (isRefresh) setRefreshing(true);

      try {
        // Step 1 — get tenant's properties
        const result = await dispatch(
          getTenantProperties({ tenantId: tenant_sub, token })
        ).unwrap();

        // Step 2 — extract property_id safely as a plain string
        const propertyId =
          typeof result?.[0]?.property_id === "string"
            ? result[0].property_id.trim()
            : null;

        if (!propertyId) return;

        // Step 3 — fetch full property (includes landlord_contact)
        await dispatch(getProperty(propertyId)).unwrap();
      } catch (err) {
        // Errors are already handled + toasted in the thunks
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [dispatch, token, tenant_sub]
  );

  // Run once on mount
  useEffect(() => {
    fetchLandlordInfo();
  }, [fetchLandlordInfo]);

  // ─────────────────────────────────────────────────────────────
  // Extract landlord info — try landlord_contact first (API shape),
  // then fall back to flat fields set by the getProperty thunk
  // ─────────────────────────────────────────────────────────────
  const landlordName =
    currentProperty?.landlord_contact?.name ||
    currentProperty?.landlord?.name ||
    currentProperty?.landlord_name ||
    "Not Available";

  const landlordEmail =
    currentProperty?.landlord_contact?.email ||
    currentProperty?.landlord?.email ||
    currentProperty?.landlord_email ||
    "Not Available";

  const landlordPhone =
    currentProperty?.landlord_contact?.phone_number ||
    currentProperty?.landlord?.phone ||
    currentProperty?.landlord_phone ||
    "Not Available";

  const propertyId = extractPropertyId(tenantProperties, currentProperty);

  // ─────────────────────────────────────────────────────────────
  // Shared Header (used in all render branches)
  // ─────────────────────────────────────────────────────────────
  const Header = () => (
    <View style={styles.headerContainer}>
      <HStack alignItems="center" justifyContent="space-between">
        <HStack alignItems="center" space={2}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
          </TouchableOpacity>
          <Text style={styles.title}>Contact Landlord</Text>
        </HStack>

        {/* Refresh button — top-right */}
        <TouchableOpacity
          onPress={() => fetchLandlordInfo(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          disabled={loading || refreshing}
        >
          {loading || refreshing ? (
            <ActivityIndicator size="small" color={Colors.red} />
          ) : (
            <AppIcon name={icons.refresh} height={hp(2.5)} width={hp(2.5)} />
          )}
        </TouchableOpacity>
      </HStack>

      <Text style={styles.subtitle}>Your landlord contact information</Text>
    </View>
  );

  // ─────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <Container scroll={false}>
        <View style={styles.container}>
          <Header />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.red} />
            <Text mt={3} fontSize={hp(2)} color={Colors.textGray}>
              Loading landlord information...
            </Text>
          </View>
        </View>
      </Container>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Empty state — no property found
  // ─────────────────────────────────────────────────────────────
  if (!currentProperty || !propertyId) {
    return (
      <Container scroll={false}>
        <View style={styles.container}>
          <Header />
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLandlordInfo(true)}
                colors={[Colors.red]}
                tintColor={Colors.red}
              />
            }
          >
            <Box bg="white" rounded="2xl" p={5} shadow={3} alignItems="center">
              <AppIcon name={icons.home} height={hp(5)} width={hp(5)} />
              <Text fontSize={hp(2)} textAlign="center" color="gray.500" mt={3}>
                No property information available.
              </Text>
              <Text fontSize={hp(1.6)} textAlign="center" color="gray.400" mt={2}>
                Please ensure you have an active lease.
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchLandlordInfo(true)}
                activeOpacity={0.8}
              >
                <HStack alignItems="center" space={2}>
                  <AppIcon name={icons.refresh} height={hp(2)} width={hp(2)} />
                  <Text style={styles.retryText}>Try Again</Text>
                </HStack>
              </TouchableOpacity>
            </Box>
          </ScrollView>
        </View>
      </Container>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main content
  // ─────────────────────────────────────────────────────────────
  return (
    <Container scroll={false}>
      <View style={styles.container}>
        <Header />

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLandlordInfo(true)}
              colors={[Colors.red]}
              tintColor={Colors.red}
            />
          }
        >
          <VStack space={4}>
            {/* Full Name */}
            <Box style={styles.infoCard}>
              <HStack space={3} alignItems="center">
                <View style={styles.iconBox}>
                  <AppIcon name={icons.person} height={hp(2.5)} width={hp(2.5)} />
                </View>
                <VStack flex={1}>
                  <Text fontSize={hp(1.6)} color={Colors.textGray}>
                    Full Name
                  </Text>
                  <Text
                    fontSize={hp(2)}
                    fontWeight={landlordName !== "Not Available" ? "bold" : "normal"}
                    mt={1}
                  >
                    {landlordName}
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Email */}
            <Box style={styles.infoCard}>
              <HStack space={3} alignItems="center">
                <View style={styles.iconBox}>
                  <AppIcon name={icons.email} height={hp(2.5)} width={hp(2.5)} />
                </View>
                <VStack flex={1}>
                  <Text fontSize={hp(1.6)} color={Colors.textGray}>
                    Email ID
                  </Text>
                  <Text
                    fontSize={hp(2)}
                    fontWeight={landlordEmail !== "Not Available" ? "bold" : "normal"}
                    mt={1}
                  >
                    {landlordEmail}
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Phone */}
            <Box style={styles.infoCard}>
              <HStack space={3} alignItems="center">
                <View style={styles.iconBox}>
                  <AppIcon name={icons.phone} height={hp(2.5)} width={hp(2.5)} />
                </View>
                <VStack flex={1}>
                  <Text fontSize={hp(1.6)} color={Colors.textGray}>
                    Phone Number
                  </Text>
                  <Text
                    fontSize={hp(2)}
                    fontWeight={landlordPhone !== "Not Available" ? "bold" : "normal"}
                    mt={1}
                  >
                    {landlordPhone}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          </VStack>
        </ScrollView>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: hp(2),
    paddingBottom: hp(2),
    paddingHorizontal: wp(5),
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: hp(1.6),
    color: Colors.textGray,
    marginTop: hp(0.3),
  },
  contentContainer: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    paddingBottom: hp(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(5),
  },
  infoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: hp(2),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconBox: {
    backgroundColor: "rgba(229, 57, 53, 0.1)",
    padding: hp(1.2),
    borderRadius: 10,
  },
  retryButton: {
    marginTop: hp(2.5),
    backgroundColor: Colors.red,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(8),
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontSize: hp(1.8),
    fontWeight: "bold",
  },
});

export default ContactLandlord;
