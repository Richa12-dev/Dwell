import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Box, Text, VStack, HStack } from "native-base";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { useNavigation } from "@react-navigation/native";
import Container from "../../components/Container/Container";
import { useSelector, useDispatch } from "react-redux";
import { getMaintenanceRequests } from "../../Redux/Maintenance/services";
import { maintenanceSelectors } from "../../Redux/Maintenance/maintenanceSlice";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { propertiesSelectors } from "../../Redux/Properties/propertiesSlice";
import { getTenantProperties, getProperty } from "../../Redux/Properties/services";

const Dashboard = () => {
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Get login data and token
  const loginData = useSelector((state) => state.loginData || {});
  const token = loginData?.accessToken;
  const idToken = loginData?.idToken;
  const tenant_sub = loginData?.userData?.tenantId;

  // Get properties data from Redux
  const {
    tenantProperties,
    currentProperty: reduxCurrentProperty,
  } = useSelector(propertiesSelectors.getPropertiesData);

  // Get maintenance data from Redux
  const {
    requests,
    loading: maintenanceLoading,
  } = useSelector(maintenanceSelectors.getMaintenanceData);

  // Fetch tenant properties on mount
  useEffect(() => {
    if (token && tenant_sub) {
      console.log('📡 Dashboard: Fetching tenant properties');
      dispatch(
        getTenantProperties({
          tenantId: tenant_sub,
          token: token,
        })
      );
    }
  }, [dispatch, token, tenant_sub]);

  // Get current property (from Redux or first tenant property)
  const currentProperty = reduxCurrentProperty ||
    (tenantProperties && tenantProperties.length > 0 ? tenantProperties[0] : null);

  // Extract property ID
  const propertyId = currentProperty?.property_id ||
                     currentProperty?.propertyId ||
                     currentProperty?.id;

  // Fetch detailed property data when propertyId is available
  useEffect(() => {
    if (propertyId && token) {
      console.log('📡 Dashboard: Fetching property details for:', propertyId);
      dispatch(
        getProperty({
          propertyId,
          token,
        })
      );
    }
  }, [dispatch, propertyId, token]);

  // Fetch maintenance requests
  useEffect(() => {
    if (token && tenant_sub) {
      console.log('📡 Dashboard: Fetching maintenance requests');
      dispatch(
        getMaintenanceRequests({
          tenant_id: tenant_sub,
          token: idToken,
        })
      );
    }
  }, [dispatch, idToken, tenant_sub]);

  // ✅ Use the same getDisplayStatus function as LandlordSupport
  const getDisplayStatus = (item) => {
    // Priority 1: Check contractor_assignment.state for COMPLETED
    if (item.contractor_assignment?.state?.toUpperCase() === 'COMPLETED') {
      return 'Resolved';
    }

    // Priority 2: Check main status field
    const mainStatus = item.status?.toLowerCase();
    if (mainStatus === 'completed' || mainStatus === 'closed' || mainStatus === 'resolved') {
      return 'Resolved';
    }

    // Priority 3: Check for completion indicators
    if (item.completed_at || item.completion_notes) {
      return 'Resolved';
    }

    // Check for In Progress
    if (item.contractor_assignment?.state?.toUpperCase() === 'ACCEPTED' ||
        item.contractor_assignment?.state?.toUpperCase() === 'IN_PROGRESS') {
      return 'In Progress';
    }

    // Check for New Request
    if (mainStatus === 'open' || mainStatus === 'new') {
      return 'New Request';
    }

    return 'Pending';
  };

  // ✅ Calculate counts using the same logic as LandlordSupport
  const newRequestCount = requests.filter(r =>
    getDisplayStatus(r) === 'New Request'
  ).length;

  const inProgressCount = requests.filter(r =>
    getDisplayStatus(r) === 'In Progress'
  ).length;

  const completedCount = requests.filter(r =>
    getDisplayStatus(r) === 'Resolved'
  ).length;

  // Filter upcoming maintenance (scheduled for today or future)
  const getUpcomingMaintenance = () => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    return requests
      .filter(item => {
        if (!item.preferred_window?.start_utc) return false;
        const scheduledDate = new Date(item.preferred_window.start_utc);
        return scheduledDate >= today &&
               item.status?.toLowerCase() !== 'closed' &&
               item.status?.toLowerCase() !== 'resolved';
      })
      .sort((a, b) => {
        const dateA = new Date(a.preferred_window.start_utc);
        const dateB = new Date(b.preferred_window.start_utc);
        return dateA - dateB;
      });
  };

  const upcomingMaintenance = getUpcomingMaintenance();
  const displayedItems = showAllMaintenance
    ? upcomingMaintenance
    : upcomingMaintenance.slice(0, 1);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format time window
  const formatTimeWindow = (startUtc, endUtc) => {
    if (!startUtc || !endUtc) return "";
    
    const start = new Date(startUtc);
    const end = new Date(endUtc);
    
    const formatTime = (date) =>
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  return (
    <Container style={styles.pageContainer}>
      {/* 🔗 Quick Links Section */}
      <VStack mt={hp(1)} mx={wp(4.5)}>
        <Text fontSize={hp(2.2)} bold color={Colors.black} mb={hp(1.5)} alignItems="flex-start">
          Quick Links
        </Text>
        <HStack justifyContent="space-around" mt={hp(1)} space={wp(1.6)} width="100%" alignItems="center">
          <QuickLink
            icon={icons.LandlordRent}
            label="Contact Landlord"
            onPress={() => navigation.navigate("ContactLandlord")}
          />
          <QuickLink
            icon={icons.RentHistory}
            label="Rent History"
            onPress={() => navigation.navigate("RentHistory")}
          />
          <QuickLink
            icon={icons.RentDocument}
            label="Rent Documents"
            onPress={() => navigation.navigate("RentDocuments")}
          />
        <QuickLink
            icon={icons.redMessages}
            label="Report Issue"
           onPress={() => navigation.navigate("AIAssistant", { hideSuggestions: true })}
          />
        </HStack>
      </VStack>

      {/* 💰 Rent Payment Card */}
      <View style={styles.rentCardWrapper}>
        <View style={styles.glassCard}>
          <View style={styles.rentCardInner}>
            <HStack alignItems="center" space={3}>
              <View style={styles.rentIconBox}>
                <AppIcon name={icons.RentHistory} height={hp(3)} width={hp(3)} />
              </View>

              <VStack flex={1}>
                <Text fontSize={hp(3.2)} bold color={Colors.black}>
                  $2600
                </Text>
                <Text fontSize={hp(1.8)} color={Colors.textGray}>
                  Pay your rent now
                </Text>
              </VStack>

              <TouchableOpacity style={styles.payRentBtn}>
                <Text style={styles.payRentBtnText}>Pay Rent</Text>
              </TouchableOpacity>
            </HStack>

            <HStack alignItems="center" space={2} mt={hp(1.5)}>
              <AppIcon name={icons.calendar} height={hp(2)} width={hp(2)} />
              <Text fontSize={hp(1.7)} color={Colors.textGray}>
                Next Due Date:{" "}
                <Text bold color={Colors.black}>
                  Sep 28, 2025
                </Text>
              </Text>
            </HStack>
          </View>
        </View>
      </View>

      {/* 🛠 Request Help Section */}
      <VStack mx={wp(4.5)} mt={hp(2)}>
        <Text fontSize={hp(2.2)} bold color={Colors.black} mb={hp(1.5)}>
          Request Help
        </Text>

        <View style={styles.glassCard}>
          <Box style={styles.glassCardInner}>
            {maintenanceLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <>
                <HStack justifyContent="space-around" mb={hp(2)}>
                  <VStack alignItems="center" flex={1}>
                    <HStack alignItems="center" space={2}>
                      <AppIcon name={icons.email} height={hp(2.2)} width={hp(2.2)} />
                      <Text fontSize={hp(2.5)} bold color={Colors.black}>
                        {newRequestCount.toString().padStart(2, '0')}
                      </Text>
                    </HStack>
                    <Text fontSize={hp(1.6)} color={Colors.textGray} mt={1}>
                      New Request
                    </Text>
                  </VStack>

                  <VStack alignItems="center" flex={1}>
                    <HStack alignItems="center" space={2}>
                      <View style={styles.progressIcon}>
                        <Text style={styles.progressIconText}>⏱</Text>
                      </View>
                      <Text fontSize={hp(2.5)} bold color={Colors.black}>
                        {inProgressCount.toString().padStart(2, '0')}
                      </Text>
                    </HStack>
                    <Text fontSize={hp(1.6)} color={Colors.textGray} mt={1}>
                      In Progress
                    </Text>
                  </VStack>

                  <VStack alignItems="center" flex={1}>
                    <HStack alignItems="center" space={2}>
                      <View style={styles.completedIcon}>
                        <Text style={styles.completedIconText}>✓</Text>
                      </View>
                      <Text fontSize={hp(2.5)} bold color={Colors.black}>
                        {completedCount.toString().padStart(2, '0')}
                      </Text>
                    </HStack>
                    <Text fontSize={hp(1.6)} color={Colors.textGray} mt={1}>
                      Completed
                    </Text>
                  </VStack>
                </HStack>

                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => navigation.navigate('Support')}
                >
                  <Text style={styles.viewDetailsBtnText}>View Details</Text>
                </TouchableOpacity>
              </>
            )}
          </Box>
        </View>
      </VStack>

      {/* 🧰 Upcoming Maintenance Section */}
      <VStack mx={wp(4.5)} mt={hp(2)} mb={hp(3)}>
        <Text fontSize={hp(2.2)} bold color={Colors.black} mb={hp(1.5)}>
          Upcoming Maintenance
        </Text>

        <View style={styles.glassCard}>
          <Box style={styles.glassCardInner}>
            {maintenanceLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : upcomingMaintenance.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="calendar-check" size={40} color="#E0E0E0" />
                <Text fontSize={hp(1.8)} color={Colors.textGray} mt={2} textAlign="center">
                  No upcoming maintenance scheduled
                </Text>
              </View>
            ) : (
              <>
                <VStack space={3}>
                  {displayedItems.map((item, index) => (
                    <TouchableOpacity
                      key={item.ticket_id || item.id}
                      onPress={() => {
                        navigation.navigate("QueryDetails", { data: item });
                      }}
                    >
                      <HStack
                        alignItems="center"
                        space={3}
                        pb={index < displayedItems.length - 1 ? 3 : 0}
                        borderBottomWidth={index < displayedItems.length - 1 ? 1 : 0}
                        borderBottomColor="#F3F4F6"
                      >
                        <View style={styles.maintenanceIconBox}>
                          <AppIcon
                            name={icons.maintenance}
                            height={hp(2.5)}
                            width={hp(2.5)}
                          />
                        </View>
                        <VStack flex={1}>
                          <Text fontSize={hp(1.6)} color={Colors.textGray}>
                            {formatDate(item.preferred_window?.start_utc)}
                          </Text>
                          <Text fontSize={hp(1.9)} bold color={Colors.black} mt={0.5}>
                            {item.title || 'Maintenance Request'}
                          </Text>
                          <Text fontSize={hp(1.6)} color={Colors.textGray} mt={0.5}>
                            {item.location || 'Location not specified'} • {formatTimeWindow(item.preferred_window?.start_utc, item.preferred_window?.end_utc)}
                          </Text>
                        </VStack>
                      </HStack>
                    </TouchableOpacity>
                  ))}
                </VStack>

                {upcomingMaintenance.length > 1 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllMaintenance(!showAllMaintenance)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllMaintenance ? "Show less details" : `Show more details (${upcomingMaintenance.length - 1} more)`}{" "}
                      <Text style={styles.arrow}>
                        {showAllMaintenance ? "▲" : "▼"}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Box>
        </View>
      </VStack>
    </Container>
  );
};

// Quick Link Component
const QuickLink = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickLink} onPress={onPress}>
    <View style={styles.iconCircle}>
      <AppIcon name={icon} height={hp(3.5)} width={hp(3.5)} />
    </View>
    <Text
      fontSize={hp(1.9)}
      color={Colors.textGray}
      style={styles.quickLinkText}
      numberOfLines={2}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  pageContainer: {},
  rentCardWrapper: {
    marginHorizontal: wp(4.5),
    marginTop: hp(1),
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
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
  rentCardInner: { padding: hp(2) },
  rentIconBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: hp(1.2),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  payRentBtn: {
    backgroundColor: Colors.red,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: 10,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  payRentBtnText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: hp(1.8)
  },
  progressIcon: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  progressIconText: { fontSize: hp(1.5) },
  completedIcon: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  completedIconText: { fontSize: hp(1.5), color: "#059669", fontWeight: "bold" },
  viewDetailsBtn: {
    borderWidth: 2,
    borderColor: Colors.red,
    paddingVertical: hp(1.5),
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  viewDetailsBtnText: {
    color: Colors.red,
    fontWeight: "bold",
    fontSize: hp(1.8),
  },
  maintenanceIconBox: {
    backgroundColor: "rgba(255, 232, 232, 0.9)",
    padding: hp(1.5),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  showMoreBtn: { paddingTop: hp(2), alignItems: "center" },
  showMoreText:{
  fontSize: hp(1.7),
  color: Colors.textGray,
  fontWeight: "600"
   },
  arrow: { fontSize: hp(1.4) },
  loadingContainer: {
    paddingVertical: hp(2),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: hp(3),
    alignItems: "center",
    justifyContent: "center",
  },
  quickLink: {
    alignItems: "center",
    width: wp(22),
  },
  quickLinkText: {
    fontFamily: "Nunito",
    fontWeight: "600",
    fontSize: hp(1.7),
    textAlign: "center",
    color: Colors.black,
    width: wp(22),
    marginTop: hp(0.5),
  },
  iconCircle: {
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: hp(1.5),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: Colors.red,
  },
});

export default Dashboard;
