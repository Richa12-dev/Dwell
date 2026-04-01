
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { getFontFamily } from "../../utils";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import Container from "../../components/Container/Container";
import { useSelector } from 'react-redux';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';

const ContractorDashboard= ({ navigation }) => {

  const loginData =
    useSelector(state => loginDataSelectors.getLoginStatus(state)) || {};
  const { userData = null, isLogged = false } = loginData;
  
  const fullName = userData?.firstName && userData?.lastName
     ? `${userData.firstName} ${userData.lastName}`
     : userData?.name || 'N/A';
  
  const screenWidth = Dimensions.get("window").width;

 // 🔹 Modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("7 Days");

  // 🔹 Chart data for each range
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
  
   const recentActivities = [
    {
      icon: icons.activeJob,
      title: "New job assigned: AC Repair at Oak St",
      time: "10 mins ago",
    
    },
    {
      icon: icons.dollar,
      title: "Payment received: $450",
      time: "2 hours ago",
     
    },
    {
      icon: icons.messages,
      title: "New message from Property Manager",
      time: "3 hours ago",
    
    },
  ];

  const quickLinks = [
    {
      title: "Referral & Rewards",
      icon: icons.reward,
      action: () => navigation.navigate("ReferralsRewards"),
    },
    {
      title: "Payment Ledger",
      icon: icons.rentCollection,
      action: () => navigation.navigate("Leaderboard"),
    },
    {
      title: "Leader" +"\n" + "board",
      icon: icons.leaderBoard,
      
      action: () => navigation.navigate("PaymentLedger"),
    },
   
  ];

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.container}>
      
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
    
        {/* Rent Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryItem}>
              <AppIcon name={icons.activeJob} size={wp(5)} />
              <View style={{ marginLeft: wp(2) }}>
                <Text style={styles.summaryNumber}>12</Text>
                <Text style={styles.summaryLabel}>Active Jobs</Text>
              </View>
    <View style={styles.badge}>
    <Text style={styles.badgeText}>3 Urgent</Text>
  </View>
            </View>

            <View style={styles.summaryItem}>
              <AppIcon name={icons.rentCollections} size={wp(6)} />
              <View style={{ marginLeft: wp(2) }}>
                <Text style={styles.summaryNumber}>$7500</Text>
                <Text style={styles.summaryLabel}>
                  Earning this Week
                </Text>
              </View>
            </View>
          </View>

          {/* Chart Section */}
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
  transparent={true}  // ← ADD THIS PROP
/>

          {/* Footer Summary */}
          <View style={styles.footerSummary}>
            <View style={styles.footerItem}>
              <Text style={styles.footerNumber, { color: Colors.green } }>↑ 23%</Text>
              <Text style={styles.footerLabel}>vs Last Week</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={[styles.footerNumber]}>
                08
              </Text>
              <Text style={styles.footerLabel}>Job this Month</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerNumber}>$12,480</Text>
              <Text style={styles.footerLabel}>Month Total</Text>
            </View>
          </View>
        </View>
        
         {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <AppIcon name={icons.greenBell} size={wp(5)} />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          <View style={styles.activityList}>
            {recentActivities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityIconContainer, { backgroundColor: activity.iconBg }]}>
                  <AppIcon name={activity.icon} size={wp(5)} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
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
    marginBottom: hp(1),
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: wp(5),
    fontFamily: getFontFamily("bold"),
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: wp(3),
    color: "#666",
    fontFamily: getFontFamily("medium"),
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
  marginRight: wp(3), // spacing before icon
},

filterButton: {
  paddingHorizontal: wp(1), // subtle tap area
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
    color: Colors.red,
    marginBottom: hp(2),
  },
  quickLinksRow: {
      marginTop: hp(1),
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
  // Modal
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
   activitySection: {
    marginTop: hp(2),
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  sectionTitle: {
    fontSize: wp(4.5),
    fontFamily: getFontFamily("bold"),
    color: Colors.black,
    marginLeft: wp(2),
  },
  activityList: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: wp(4),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(2),
  },
  activityIconContainer: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    marginLeft: wp(3),
    flex: 1,
  },
  activityTitle: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily("medium"),
    color: Colors.black,
    marginBottom: hp(0.3),
  },
  activityTime: {
    fontSize: wp(3),
    color: "#999",
    fontFamily: getFontFamily("regular"),
  },
  
  badge: {
  backgroundColor: Colors.red,   // or your theme color
  height: 24,
  minWidth: 72,                  // supports “3 Urgent”
  paddingHorizontal: 10,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
},

badgeText: {
  color: Colors.white,
  fontSize: hp(1.6),
  fontFamily: getFontFamily('bold'),
},


});

export default ContractorDashboard;
