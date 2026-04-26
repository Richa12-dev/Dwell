import React, { useState, useMemo, useCallback } from "react";
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
import { getLandlordProperties } from "../../Redux/Properties/servicesNode";
import { propertiesSelectors } from "../../Redux/Properties/propertiesSlice";
import { useFocusEffect } from "@react-navigation/native";

import {
  getLandlordRentHistory,
  getLandlordSummary,
} from "../../Redux/Rent/services";
import { rentSelectors } from "../../Redux/Rent/rentSlice";

const screenWidth = Dimensions.get("window").width;

const FILTER_OPTIONS = [ "3 Months", "6 Months", "1 Year"];

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const buildChartData = (rentHistory = [], selectedFilter) => {
  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const parseRecord = (r) => {
    if (r?.month != null && r?.year != null) {
      return { month: parseInt(r.month, 10) - 1, year: parseInt(r.year, 10) };
    }
    const dateStr = r?.due_date || r?.dueDate || r?.paid_date || r?.paidDate || r?.createdAt;
    if (dateStr && dateStr !== "N/A") {
      const d = new Date(dateStr);
      if (!isNaN(d)) return { month: d.getMonth(), year: d.getFullYear() };
    }
    return null;
  };

  const getAmount = (r) =>
    parseFloat(r?.amount ?? r?.rent_amount ?? r?.monthly_rent ?? 0) || 0;

  // ✅ FIX 2: Helper to check if a record should be counted in the chart.
  // Only 'paid' records are summed — pending/stale records (e.g. from a previous
  // tenant with $2600 rent) were inflating the April total to $3050.
  // If status is empty/unknown we still count it (backward compat with older records).
  const isPaid = (r) => {
    const status = (r?.status || r?.payment_status || '').toLowerCase();
    return !status || status === 'paid';
  };

  if (selectedFilter === "1 Month") {
    const weekBuckets = [0, 0, 0, 0];
    rentHistory.forEach((r) => {
      if (!isPaid(r)) return;
      const parsed = parseRecord(r);
      if (!parsed) return;
      if (parsed.month !== thisMonth || parsed.year !== thisYear) return;
      const dateStr = r?.due_date || r?.dueDate || r?.paid_date || r?.paidDate || r?.createdAt;
      const d = dateStr ? new Date(dateStr) : null;
      const day = d && !isNaN(d) ? d.getDate() : 15;
      const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
      weekBuckets[weekIndex] += getAmount(r);
    });
    return {
      labels:   ["W1", "W2", "W3", "W4"],
      datasets: [{ data: weekBuckets.map(v => Math.round(v)), strokeWidth: 2 }],
    };
  }

  const monthCount = selectedFilter === "3 Months" ? 3
    : selectedFilter === "6 Months" ? 6
    : 12;

  const buckets = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    let m = thisMonth - i;
    let y = thisYear;
    while (m < 0) { m += 12; y -= 1; }
    buckets.push({ month: m, year: y, total: 0 });
  }

  rentHistory.forEach((r) => {
    if (!isPaid(r)) return;
    const parsed = parseRecord(r);
    if (!parsed) return;
    const bucket = buckets.find(
      (b) => b.month === parsed.month && b.year === parsed.year
    );
    if (bucket) bucket.total += getAmount(r);
  });

  return {
    labels:   buckets.map((b) => MONTH_NAMES[b.month]),
    datasets: [{ data: buckets.map((b) => Math.round(b.total)), strokeWidth: 2 }],
  };
};

const LandlordProperties = ({ navigation }) => {
  const dispatch = useDispatch();

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter]         = useState("3 Months");

  const propertiesData = useSelector(propertiesSelectors.getPropertiesData) || {};
  const {
    landlordProperties = [],
    loading            = false,
  } = propertiesData;

  const authData  = useSelector((state) => state?.loginData || state?.login || {});
  const authToken = authData?.accessToken || authData?.token || null;
  const landlordId =
    authData?.landlordId ||
    authData?.userData?.landlordId ||
    authData?.user?.landlordId ||
    null;

  const rentHistory     = useSelector(rentSelectors.getRentHistory);
  const landlordSummary = useSelector(rentSelectors.getLandlordSummary);
  const rentLoading     = useSelector(rentSelectors.isLoading);

  const isAuthenticated = Boolean(landlordId && authToken);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      dispatch(getLandlordProperties({ landlordId, token: authToken }));
      dispatch(getLandlordSummary());
      dispatch(getLandlordRentHistory());
    }, [dispatch, landlordId, authToken, isAuthenticated])
  );

  const propertyStats = useMemo(() => {
    const total  = landlordProperties.length;
    const vacant = landlordProperties.filter(
      (p) => {
        const av = (p?.availability || "").toLowerCase();
        return av === "available" || av === "vacant" || av === "available soon";
      }
    ).length;
    const occupied = total - vacant;

    let totalPotentialRent = 0;
    let monthlyIncome      = 0;

    landlordProperties.forEach((property) => {
      // ✅ read both camelCase and snake_case since normalizeProperty stamps both
      const rent = parseFloat(property?.monthly_rent || property?.monthlyRent || 0);
      totalPotentialRent += rent;

      // ✅ FIX 1: normalizeProperty sets availability = "currently occupied" (not "occupied").
      // The old check === "occupied" never matched so monthlyIncome was always 0.
      // .includes("occupied") catches both "occupied" and "currently occupied".
      if ((property?.availability || "").toLowerCase().includes("occupied")) {
        monthlyIncome += rent;
      }
    });

    // Paid = sum of paid records this month.
    // Uses the same parseRecord() logic as the chart so month/year extraction
    // is consistent (handles both r.month/r.year AND r.due_date/r.dueDate).
    // Status check also mirrors the chart: 'paid', 'completed', or empty/null.
    const now = new Date();
    const currentMonth = now.getMonth() + 1;  // 1-indexed
    const currentYear  = now.getFullYear();

    const parseRecordDate = (r) => {
      if (r?.month != null && r?.year != null) {
        return { month: parseInt(r.month, 10), year: parseInt(r.year, 10) };
      }
      const ds = r?.due_date || r?.dueDate || r?.paid_date || r?.paidDate || r?.createdAt;
      if (ds && ds !== "N/A") {
        const d = new Date(ds);
        if (!isNaN(d)) return { month: d.getMonth() + 1, year: d.getFullYear() };
      }
      return null;
    };

    const isPaidStatus = (r) => {
      const s = (r?.status || r?.payment_status || "").toLowerCase();
      // treat empty/null, "paid", or "completed" as paid
      return !s || s === "paid" || s === "completed";
    };

    let paidAmount = 0;
    rentHistory.forEach((r) => {
      if (!isPaidStatus(r)) return;
      const parsed = parseRecordDate(r);
      if (!parsed) return;
      if (parsed.month !== currentMonth || parsed.year !== currentYear) return;
      paidAmount += parseFloat(r?.amount ?? r?.rent_amount ?? 0) || 0;
    });

    const pendingAmount = Math.max(0, monthlyIncome - paidAmount);

    return { total, vacant, occupied, totalPotentialRent, monthlyIncome, paidAmount, pendingAmount };
  }, [landlordProperties, rentHistory]);

  const chartData = useMemo(
    () => buildChartData(rentHistory, selectedFilter),
    [rentHistory, selectedFilter]
  );

  const chartConfig = {
    backgroundColor:               "transparent",
    backgroundGradientFrom:        "transparent",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo:          "transparent",
    backgroundGradientToOpacity:   0,
    fillShadowGradientFrom:        "transparent",
    fillShadowGradientFromOpacity: 0,
    fillShadowGradientTo:          "transparent",
    fillShadowGradientToOpacity:   0,
    color:      () => "rgba(229, 57, 53, 1)",
    labelColor: () => "rgba(102, 102, 102, 0.8)",
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#E53935" },
    propsForBackgroundLines: { strokeWidth: 0 },
    formatYLabel: (value) => {
      const num = parseInt(value, 10);
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
      return `$${num}`;
    },
  };

  const formatCurrency = (amount) =>
    `${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const handleFilterSelect = (option) => {
    setSelectedFilter(option);
    setFilterModalVisible(false);
  };

  const quickLinks = [
    { title: "Add New Property",    icon: icons.newProperites,      action: () => navigation.navigate("AddPropertiesScreen") },
    { title: "Tenant Management",   icon: icons.TenantManagement,   action: () => navigation.navigate("TenantManagement") },
    { title: "Rent Collection",     icon: icons.rentCollection,     action: () => navigation.navigate("RentCollection") },
    { title: "Maintenance Request", icon: icons.mantenanceRequest,  action: () => navigation.navigate("Support") },
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

        <View style={styles.summaryCard}>

          <View style={styles.summaryTop}>
            <View style={styles.summaryItem}>
              <AppIcon name={icons.rentCollections} size={wp(6)} />
              <View style={{ marginLeft: wp(2) }}>
                <Text style={styles.summaryNumber}>
                  ${formatCurrency(propertyStats.totalPotentialRent)}
                </Text>
                <Text style={styles.summaryLabel}>Total Rent Collection</Text>
              </View>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerNumber}>
                ${formatCurrency(propertyStats.monthlyIncome)}
              </Text>
              <Text style={styles.footerLabel}>Monthly Income</Text>
            </View>
          </View>

          <View style={styles.paymentSummary}>
            <View style={styles.paymentItem}>
              <View style={[styles.paymentDot, { backgroundColor: "#10B981" }]} />
              <View>
                <Text style={styles.paymentLabel}>Paid</Text>
                <Text style={[styles.paymentAmount, { color: "#10B981" }]}>
                  ${formatCurrency(propertyStats.paidAmount)}
                </Text>
              </View>
            </View>
            <View style={styles.paymentItem}>
              <View style={[styles.paymentDot, { backgroundColor: "#F59E0B" }]} />
              <View>
                <Text style={styles.paymentLabel}>Pending</Text>
                <Text style={[styles.paymentAmount, { color: "#F59E0B" }]}>
                  ${formatCurrency(propertyStats.pendingAmount)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.chartHeader}>
            <TouchableOpacity
              style={styles.chartTitleRow}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.chartTitle}>Rent Collection ({selectedFilter})</Text>
              <AppIcon name={icons.arrowDown} size={wp(4)} color={Colors.black} />
            </TouchableOpacity>
          </View>

          {rentLoading ? (
            <View style={styles.chartLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.red} />
              <Text style={styles.chartLoadingText}>Loading chart data...</Text>
            </View>
          ) : (
            <LineChart
              data={chartData}
              width={screenWidth * 0.85}
              height={hp(22)}
              chartConfig={chartConfig}
              bezier
              withInnerLines={false}
              style={{ borderRadius: 15 }}
              transparent={true}
              decorator={() => null}
              onDataPointClick={() => {}}
            />
          )}

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

        <View style={styles.quickLinksContainer}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickLinksRow}>
            {quickLinks.map((item, index) => (
              <TouchableOpacity key={index} style={styles.linkCard} onPress={item.action}>
                <View style={styles.iconCircle}>
                  <AppIcon name={item.icon} size={wp(8)} />
                </View>
                <Text style={styles.linkText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Modal
          visible={filterModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Time Range</Text>
                {FILTER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionButton, selectedFilter === option && styles.selectedOption]}
                    onPress={() => handleFilterSelect(option)}
                  >
                    <Text style={[styles.optionText, selectedFilter === option && styles.selectedOptionText]}>
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
  container:             { paddingHorizontal: wp(5), paddingVertical: hp(0.5) },
  loadingContainer:      { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: hp(20) },
  loadingText:           { marginTop: hp(2), fontSize: wp(4), color: Colors.black, fontFamily: getFontFamily("medium") },
  summaryCard:           { backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 15, padding: wp(4), shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 3, marginVertical: hp(1), borderWidth: 2, borderColor: "rgba(229,57,53,0.2)" },
  summaryTop:            { flexDirection: "row", justifyContent: "space-between", marginBottom: hp(2) },
  summaryItem:           { flexDirection: "row", alignItems: "center" },
  summaryNumber:         { fontSize: wp(5), fontFamily: getFontFamily("bold"), color: Colors.black },
  summaryLabel:          { fontSize: wp(3), color: "#666", fontFamily: getFontFamily("medium") },
  paymentSummary:        { flexDirection: "row", justifyContent: "space-around", paddingVertical: hp(2), borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#eee", marginBottom: hp(2) },
  paymentItem:           { flexDirection: "row", alignItems: "center", gap: wp(2) },
  paymentDot:            { width: wp(3), height: wp(3), borderRadius: wp(1.5) },
  paymentLabel:          { fontSize: wp(3), color: "#666", fontFamily: getFontFamily("medium") },
  paymentAmount:         { fontSize: wp(4), fontFamily: getFontFamily("bold") },
  chartHeader:           { marginBottom: hp(1) },
  chartTitleRow:         { flexDirection: "row", alignItems: "center", justifyContent: "flex-start" },
  chartTitle:            { fontSize: wp(3.8), fontFamily: getFontFamily("bold"), color: Colors.black, marginRight: wp(3) },
  chartLoadingContainer: { height: hp(22), justifyContent: "center", alignItems: "center", gap: hp(1) },
  chartLoadingText:      { fontSize: wp(3.5), color: "#999", fontFamily: getFontFamily("regular") },
  footerSummary:         { flexDirection: "row", justifyContent: "space-between", marginTop: hp(2), borderTopWidth: 1, borderTopColor: "#eee", paddingTop: hp(1.5) },
  footerItem:            { alignItems: "center", flex: 1 },
  footerNumber:          { fontSize: wp(4.5), fontFamily: getFontFamily("bold"), color: Colors.black },
  footerLabel:           { fontSize: wp(3), color: "#666", fontFamily: getFontFamily("medium") },
  quickLinksContainer:   { marginTop: hp(1) },
  sectionTitle:          { fontSize: wp(4.5), fontFamily: getFontFamily("bold"), color: Colors.black, marginBottom: hp(2) },
  quickLinksRow:         { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" },
  linkCard:              { width: wp(20), alignItems: "center", marginBottom: hp(2) },
  iconCircle:            { width: wp(14), height: wp(14), borderRadius: wp(7), backgroundColor: "#FFF4F4", justifyContent: "center", alignItems: "center", marginBottom: hp(0.5), shadowColor: "#E53935", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderColor: Colors.lightRed, borderWidth: 1.5 },
  linkText:              { fontSize: wp(3), fontFamily: getFontFamily("medium"), textAlign: "center", color: Colors.black },
  modalOverlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modalContent:          { backgroundColor: "#fff", width: wp(70), borderRadius: 10, paddingVertical: hp(3), paddingHorizontal: wp(5), alignItems: "center" },
  modalTitle:            { fontSize: wp(4), fontFamily: getFontFamily("bold"), color: Colors.red, marginBottom: hp(2) },
  optionButton:          { width: "100%", paddingVertical: hp(1.5), borderRadius: 8, alignItems: "center", marginVertical: hp(0.5), backgroundColor: "#f7f7f7" },
  optionText:            { fontSize: wp(3.8), color: Colors.black, fontFamily: getFontFamily("medium") },
  selectedOption:        { backgroundColor: Colors.red },
  selectedOptionText:    { color: "#fff" },
});

export default LandlordProperties;
