import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "../../Theme";
import { getFontFamily } from "../../utils";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import Container from "../../components/Container/Container";
import { getLandlordProperties } from "../../Redux/Properties/services";
import { propertiesSelectors } from "../../Redux/Properties/propertiesSlice";
import { useFocusEffect } from "@react-navigation/native";

const LandlordProperties = ({ navigation }) => {
  const dispatch = useDispatch();
  const screenWidth = Dimensions.get("window").width;

  // 🔹 Modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("7 Days");

  // Redux selectors
  const propertiesData = useSelector(propertiesSelectors.getPropertiesData) || {};
  const {
    landlordProperties = [],
    loading = false,
    totalProperties = 0,
  } = propertiesData;

  const authData = useSelector(state => state?.loginData || state?.login || {});
  const authToken = authData?.accessToken || authData?.token || null;
  const landlordId = authData?.landlordId || authData?.userData?.landlordId || authData?.user?.landlordId || null;

  // Fetch properties on mount
useFocusEffect(
    useCallback(() => {
      if (landlordId && authToken) {
        dispatch(getLandlordProperties({ landlordId, token: authToken }));
      }
    }, [dispatch, landlordId, authToken])
  );


const propertyStats = useMemo(() => {
  const total = landlordProperties.length;
  
  // Count vacant and occupied properties
  const vacant = landlordProperties.filter(p =>
    (p?.availability || '').toLowerCase() === 'available'
  ).length;
  const occupied = total - vacant;

  // Calculate rent statistics
  let totalPotentialRent = 0; // Total rent from all properties (if all were rented)
  let monthlyIncome = 0; // Only from occupied properties
  let paidAmount = 0; // For future use when you add payment tracking
  let pendingAmount = 0; // All occupied property rent (no payment tracking yet)

  landlordProperties.forEach((property, index) => {
    // ✅ Use monthly_rent (this is the field your API actually uses)
    const rent = parseFloat(property?.monthly_rent || 0);
    
    // Debug: Log first 3 properties to verify data
    if (index < 3) {
      console.log(`Property ${index + 1}:`, {
        name: property.name,
        monthly_rent: property.monthly_rent,
        rent: rent,
        availability: property.availability
      });
    }
    
    // Add to total potential rent (all properties)
    totalPotentialRent += rent;

    // Check if property is occupied
    const availability = (property?.availability || '').toLowerCase();
    const isOccupied = availability === 'occupied';

    if (isOccupied) {
      // Add to monthly income (only occupied properties)
      monthlyIncome += rent;
      
      // ⚠️ Since you don't have payment_status in your API:
      // All occupied property rent is considered PENDING until you add payment tracking
      pendingAmount += rent;
      
      // paidAmount stays 0 for now (you can add payment tracking later)
    }
  });

  // Debug: Log final calculations
  console.log('📊 Property Stats:', {
    total,
    vacant,
    occupied,
    totalPotentialRent,
    monthlyIncome,
    paidAmount,
    pendingAmount
  });

  return {
    total,
    vacant,
    occupied,
    totalPotentialRent, // Sum of ALL property rents
    monthlyIncome, // Sum of OCCUPIED property rents only
    paidAmount, // 0 for now (no payment tracking)
    pendingAmount, // Same as monthlyIncome (all occupied rent is pending)
  };
}, [landlordProperties]);

// 🔹 Format currency - Shows full amount without K abbreviation
const formatCurrency = (amount) => {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

  // 🔹 Get current month name
  const getCurrentMonth = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return `${months[currentMonth]} ${currentYear}`;
  };

  // 🔹 Chart data for each range (you can replace this with actual revenue data from API)
  const chartDataSets = {
    "7 Days": [20, 40, 80, 60, 50, 45, 40],
    "1 Month": [35, 45, 55, 65],
    "3 Months": [50, 60, 70],
    "1 Year": [60, 80, 100, 110],
  };

  // 🔹 Labels depending on selection
  const getLabels = () => {
    switch (selectedFilter) {
      case "1 Month":
        return ["W1", "W2", "W3", "W4"];
      case "3 Months":
        return ["Jan", "Feb", "Mar"];
      case "1 Year":
        return ["Q1", "Q2", "Q3", "Q4"];
      default:
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }
  };

  const chartData = {
    labels: getLabels(),
    datasets: [
      {
        data: chartDataSets[selectedFilter],
        strokeWidth: 2,
        color: () => "rgba(229, 57, 53, 1)",
        withShadow: false,
        withDots: true,
      },
    ],
  };

  // ✅ Chart Config — completely transparent background for glass effect
  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "transparent",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "transparent",
    backgroundGradientToOpacity: 0,

    fillShadowGradientFrom: "transparent",
    fillShadowGradientFromOpacity: 0,
    fillShadowGradientTo: "transparent",
    fillShadowGradientToOpacity: 0,

    color: () => "rgba(229, 57, 53, 1)",
    labelColor: () => "rgba(102, 102, 102, 0.8)",
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#E53935",
    },
    propsForBackgroundLines: {
      strokeWidth: 0,
    },
  };

  // 🔹 Handle filter change
  const handleFilterSelect = (option) => {
    setSelectedFilter(option);
    setFilterModalVisible(false);
  };

  const quickLinks = [
    {
      title: "Add New Property",
      icon: icons.newProperites,
      action: () => navigation.navigate("AddProperty"),
    },
    {
      title: "Tenant Management",
      icon: icons.TenantManagement,
      action: () => navigation.navigate("TenantManagement"),
    },
    {
      title: "Rent Collection",
      icon: icons.rentCollection,
      action: () => navigation.navigate("RentCollection"),
    },
    {
      title: "Maintenance Request",
      icon: icons.mantenanceRequest,
      action: () => navigation.navigate("LandlordSupport"),
    },
  ];

  if (loading && landlordProperties.length === 0) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Rent Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryItem}>
              <AppIcon name={icons.rentCollections} size={wp(6)} />
              <View style={{ marginLeft: wp(2) }}>
                <Text style={styles.summaryNumber}>
                    ${formatCurrency(propertyStats.totalPotentialRent)}
                </Text>
                <Text style={styles.summaryLabel}>
                  Total Rent Collection
                </Text>
              </View>
            </View>

            <View style={styles.footerItem}>
              <Text style={styles.footerNumber}>
                  ${formatCurrency(propertyStats.monthlyIncome)}
              </Text>
              <Text style={styles.footerLabel}>Monthly Income</Text>
            </View>
          </View>

          {/* Paid and Pending Amounts */}
          <View style={styles.paymentSummary}>
            <View style={styles.paymentItem}>
              <View style={[styles.paymentDot, { backgroundColor: '#10B981' }]} />
              <View>
                <Text style={styles.paymentLabel}>Paid</Text>
                <Text style={[styles.paymentAmount, { color: '#10B981' }]}>
                  ${propertyStats.paidAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.paymentItem}>
              <View style={[styles.paymentDot, { backgroundColor: '#F59E0B' }]} />
              <View>
                <Text style={styles.paymentLabel}>Pending</Text>
                <Text style={[styles.paymentAmount, { color: '#F59E0B' }]}>
                  ${propertyStats.pendingAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Chart Header with Filter Button */}
          <View style={styles.chartHeader}>
            <TouchableOpacity
              style={styles.chartTitleRow}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.chartTitle}>
                Rent Collection (Last {selectedFilter})
              </Text>
              <AppIcon name={icons.arrowDown} size={wp(4)} color={Colors.black} />
            </TouchableOpacity>
          </View>

          <LineChart
            data={chartData}
            width={screenWidth * 0.85}
            height={hp(22)}
            chartConfig={chartConfig}
            bezier
            withInnerLines={false}
            style={{
              borderRadius: 15,
            }}
            transparent={true}
          />

          {/* Footer Summary */}
          <View style={styles.footerSummary}>
            <View style={styles.summaryItem}>
              <AppIcon name={icons.totalProperties} size={wp(6)} />
            </View>
            
            <View style={styles.footerItem}>
              <Text style={styles.footerNumber}>{propertyStats.total}</Text>
              <Text style={styles.footerLabel}>Total Properties</Text>
            </View>

            <View style={styles.footerItem}>
              <Text style={styles.footerNumber}>{propertyStats.vacant}</Text>
              <Text style={styles.footerLabel}>Vacant Properties</Text>
            </View>
            
            <View style={styles.footerItem}>
              <Text style={[styles.footerNumber, { color: Colors.red }]}>
                {propertyStats.occupied}
              </Text>
              <Text style={styles.footerLabel}>Occupied</Text>
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinksContainer}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickLinksRow}>
            {quickLinks.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.linkCard}
                onPress={item.action}
              >
                <View style={styles.iconCircle}>
                  <AppIcon name={item.icon} size={wp(8)} />
                </View>
                <Text style={styles.linkText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filter Modal */}
        <Modal
          visible={filterModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setFilterModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Time Range</Text>
                {["7 Days", "1 Month", "3 Months", "1 Year"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      selectedFilter === option && styles.selectedOption,
                    ]}
                    onPress={() => handleFilterSelect(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedFilter === option && styles.selectedOptionText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(0.5),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: hp(20),
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: wp(4),
    color: Colors.black,
    fontFamily: getFontFamily("medium"),
  },
  summaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 15,
    padding: wp(4),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    marginVertical: hp(1),
    borderWidth: 2,
    borderColor: "rgba(229, 57, 53, 0.2)",
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp(2),
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: wp(5),
    fontFamily: getFontFamily("bold"),
    color: Colors.black,
  },
  summaryLabel: {
    fontSize: wp(3),
    color: "#666",
    fontFamily: getFontFamily("medium"),
  },
  paymentSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: hp(2),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
    marginBottom: hp(2),
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  paymentDot: {
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
  },
  paymentLabel: {
    fontSize: wp(3),
    color: "#666",
    fontFamily: getFontFamily("medium"),
  },
  paymentAmount: {
    fontSize: wp(4),
    fontFamily: getFontFamily("bold"),
  },
  chartContainer: {
    alignItems: "flex-start",
  },
  chartHeader: {
    marginBottom: hp(1),
  },
  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  chartTitle: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily("bold"),
    color: Colors.black,
    marginRight: wp(3),
  },
  filterButton: {
    paddingHorizontal: wp(1),
    paddingVertical: wp(0.5),
  },
  chartWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 15,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(2),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    alignItems: "center",
  },
  chartStyle: {
    borderRadius: 15,
  },
  footerSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: hp(1.5),
  },
  footerItem: {
    alignItems: "center",
    flex: 1,
  },
  footerNumber: {
    fontSize: wp(4.5),
    fontFamily: getFontFamily("bold"),
    color: Colors.black,
  },
  footerLabel: {
    fontSize: wp(3),
    color: "#666",
    fontFamily: getFontFamily("medium"),
  },
  quickLinksContainer: {
    marginTop: hp(1),
  },
  sectionTitle: {
    fontSize: wp(4.5),
    fontFamily: getFontFamily("bold"),
    color: Colors.black,
    marginBottom: hp(2),
  },
  quickLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  linkCard: {
    width: wp(20),
    alignItems: "center",
    marginBottom: hp(2),
  },
  iconCircle: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    backgroundColor: "#FFF4F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp(0.5),
    shadowColor: "#E53935",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  linkText: {
    fontSize: wp(3),
    fontFamily: getFontFamily("medium"),
    textAlign: "center",
    color: Colors.black,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: wp(70),
    borderRadius: 10,
    paddingVertical: hp(3),
    paddingHorizontal: wp(5),
    alignItems: "center",
  },
  modalTitle: {
    fontSize: wp(4),
    fontFamily: getFontFamily("bold"),
    color: Colors.red,
    marginBottom: hp(2),
  },
  optionButton: {
    width: "100%",
    paddingVertical: hp(1.5),
    borderRadius: 8,
    alignItems: "center",
    marginVertical: hp(0.5),
    backgroundColor: "#f7f7f7",
  },
  optionText: {
    fontSize: wp(3.8),
    color: Colors.black,
    fontFamily: getFontFamily("medium"),
  },
  selectedOption: {
    backgroundColor: Colors.red,
  },
  selectedOptionText: {
    color: "#fff",
  },
});

export default LandlordProperties;
