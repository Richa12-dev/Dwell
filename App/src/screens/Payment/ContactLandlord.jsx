import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { Box, Text, HStack, VStack } from "native-base";
import { useSelector, useDispatch } from "react-redux";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { useNavigation } from "@react-navigation/native";
import { getTenantProperties, getProperty } from "../../Redux/Properties/services";
import { propertiesSelectors } from "../../Redux/Properties/propertiesSlice";
import Container from "../../components/Container/Container";

const ContactLandlord = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  
  const { tenantProperties, currentProperty, loading } = useSelector(propertiesSelectors.getPropertiesData);
  const loginData = useSelector((state) => state.loginData || {});
  const token = loginData?.accessToken;
  const tenant_sub = loginData?.userData?.tenantId;

  // Debug login data structure
  useEffect(() => {
    console.log('👤 Login Data:', {
      hasAccessToken: !!loginData?.accessToken,
      tenantId: loginData?.userData?.tenantId,
      fullLoginData: loginData,
    });
  }, [loginData]);

  // Fetch tenant properties on mount
  useEffect(() => {
    if (token && tenant_sub) {
      console.log('🔍 ContactLandlord: Fetching tenant properties for:', tenant_sub);
      console.log('🔍 Token available:', !!token);
      dispatch(getTenantProperties({ tenantId: tenant_sub, token }));
    } else {
      console.log('❌ Missing credentials:', { hasToken: !!token, hasTenantId: !!tenant_sub });
    }
  }, [dispatch, token, tenant_sub]);

  // Get property ID from tenant properties
  const propertyId = tenantProperties?.[0]?.property_id || currentProperty?.property_id;

  // Debug tenant properties
  useEffect(() => {
    console.log('📋 Tenant Properties:', tenantProperties);
    console.log('🔑 Property ID:', propertyId);
  }, [tenantProperties, propertyId]);

  // Fetch detailed property data to get landlord info
  useEffect(() => {
    if (propertyId && token) {
      console.log('🔍 ContactLandlord: Fetching property details for:', propertyId);
      // Pass just the propertyId string - the thunk gets token from state
      dispatch(getProperty(propertyId));
    }
  }, [dispatch, propertyId, token]);

  // Extract landlord information from the API response
  // Based on the API response structure: landlord_contact contains { name, email, phone_number }
  const landlordName = currentProperty?.landlord_contact?.name ||
                       currentProperty?.landlord_name ||
                       "Not Available";
  
  const landlordEmail = currentProperty?.landlord_contact?.email ||
                        currentProperty?.landlord_email ||
                        "Not Available";
  
  const landlordPhone = currentProperty?.landlord_contact?.phone_number ||
                        currentProperty?.landlord_phone ||
                        "Not Available";

  // Debug logging
  useEffect(() => {
    if (currentProperty) {
      console.log('🏠 ContactLandlord - Current Property:', {
        property_id: currentProperty.property_id,
        landlord_contact: currentProperty.landlord_contact,
        landlord_name: landlordName,
        landlord_email: landlordEmail,
        landlord_phone: landlordPhone,
      });
    }
  }, [currentProperty, landlordName, landlordEmail, landlordPhone]);

  if (loading) {
    return (
      <Container scroll={false}>
        <View style={styles.container}>
          {/* 🔹 Header */}
          <View style={styles.headerContainer}>
            <HStack alignItems="center" justifyContent="flex-start" space={2}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
              </TouchableOpacity>

              <Text style={styles.title}>Contact Landlord</Text>
            </HStack>

            <Text style={styles.subtitle}>Your landlord contact information</Text>
          </View>

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

  if (!currentProperty || !propertyId) {
    return (
      <Container scroll={false}>
        <View style={styles.container}>
          {/* 🔹 Header */}
          <View style={styles.headerContainer}>
            <HStack alignItems="center" justifyContent="flex-start" space={2}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
              </TouchableOpacity>

              <Text style={styles.title}>Contact Landlord</Text>
            </HStack>

            <Text style={styles.subtitle}>Your landlord contact information</Text>
          </View>

          <View style={styles.contentContainer}>
            <Box bg="white" rounded="2xl" p={5} shadow={3}>
              <Text fontSize={hp(2)} textAlign="center" color="gray.500">
                No property information available.
              </Text>
              <Text fontSize={hp(1.6)} textAlign="center" color="gray.400" mt={2}>
                Please ensure you have an active lease.
              </Text>
            </Box>
          </View>
        </View>
      </Container>
    );
  }

  return (
    <Container scroll={false}>
      <View style={styles.container}>
        {/* 🔹 Header */}
        <View style={styles.headerContainer}>
          <HStack alignItems="center" justifyContent="flex-start" space={2}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
            </TouchableOpacity>

            <Text style={styles.title}>Contact Landlord</Text>
          </HStack>

          <Text style={styles.subtitle}>Your landlord contact information</Text>
        </View>

        {/* 🔹 Content */}
        <View style={styles.contentContainer}>
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
                  <Text fontSize={hp(2)} bold={landlordName !== "Not Available"} mt={1}>
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
                  <Text fontSize={hp(2)} bold={landlordEmail !== "Not Available"} mt={1}>
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
                  <Text fontSize={hp(2)} bold={landlordPhone !== "Not Available"} mt={1}>
                    {landlordPhone}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          </VStack>
        </View>
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
    color: "#000"
  },
  subtitle: {
    fontSize: hp(1.6),
    color: Colors.textGray,
    marginTop: hp(0.3)
  },
  contentContainer: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
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
});

export default ContactLandlord;
