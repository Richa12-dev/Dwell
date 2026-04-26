import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
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
import { useDispatch, useSelector } from "react-redux";
import Container from "../../components/Container/Container";

// ✅ Use createRent (POST /api/rent) instead of payRent
import { getUpcomingRents, createRent, getTenantRentHistory } from "../../Redux/Rent/services";
import { rentSelectors } from "../../Redux/Rent/rentSlice";
import { getMyProperties } from "../../Redux/Tenants/services";
import { tenantsSelectors } from "../../Redux/Tenants/tenantsSlice";

// ─── Field normalizer ─────────────────────────────────────────────────────────
const normalizeRentForCard = (item) => {
  const total     = item?.amount ?? item?.rent_amount ?? item?.rentAmount ?? 0;
  const baseRent  = item?.base_rent ?? item?.baseRent ?? item?.base_amount ?? total;
  const utilities = item?.utilities ?? item?.utility_charges ?? item?.utilityCharges ?? (total - baseRent);
  const dueDate   = item?.due_date || item?.dueDate || item?.due_on || item?.nextDueDate || 'N/A';
  const currency  = item?.currency_symbol || item?.currency || '$';

  return {
    id:               item?.id || item?.rent_id,
    total,
    baseRent,
    utilities,
    dueDate,
    currency,
    propertyName:     item?.property?.name || item?.property_name || item?.propertyName || '',
    month:            item?.month || null,
    year:             item?.year  || null,
    status:           item?.status || item?.payment_status || 'pending',
    // ✅ FIXED: propertyTenantId from the rent record itself, NOT item.property.id
  
  // ✅ FIXED
  propertyTenantId:
    item?.propertyTenantId ||
    item?.property_tenant_id ||
    item?.property?.id || null,
  };
};


const TenantPayments = () => {
  const [showContactModal, setShowContactModal]     = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [paying, setPaying]                         = useState(false);
  const navigation = useNavigation();
  const dispatch   = useDispatch();

  const upcomingRentsRaw = useSelector(rentSelectors.getUpcomingRents);
  const rentHistoryRaw   = useSelector(rentSelectors.getRentHistory);
  const loading          = useSelector(rentSelectors.isLoading);

  // Resolve which rent record to display (upcoming → history fallback)
  const pendingRent = (() => {
    if (upcomingRentsRaw?.length) {
      return normalizeRentForCard(upcomingRentsRaw[0]);
    }
    const historyPending = rentHistoryRaw?.find(
      (r) => (r.status || r.payment_status || '').toLowerCase() === 'pending'
    );
    return historyPending ? normalizeRentForCard(historyPending) : null;
  })();
  
  const myProperties = useSelector(tenantsSelectors.getMyProperties);
const activeLease  = myProperties?.[0]; // first active lease


  // ── Compute next month/year from rent history ─────────────────────────────
  // Scans all records and picks the month AFTER the latest one.
  // Both the "Next Due Date" label and handlePayRent read from here so
  // they stay in sync after every payment.
  const nextRentDate = (() => {
    const latest = (rentHistoryRaw || []).reduce(
      (max, r) => {
        const y = Number(r.year)  || 0;
        const m = Number(r.month) || 0;
        return y > max.year || (y === max.year && m > max.month)
          ? { month: m, year: y }
          : max;
      },
      { month: 0, year: 0 }
    );

    if (latest.month > 0 && latest.year > 0) {
      return {
        month: latest.month === 12 ? 1 : latest.month + 1,
        year:  latest.month === 12 ? latest.year + 1 : latest.year,
      };
    }
    // No history yet — fall back to pending rent's own month/year
    return { month: pendingRent?.month || null, year: pendingRent?.year || null };
  })();

  // Due date is the 1st of the next month to be created
  const computedDueDate = (() => {
    const { month, year } = nextRentDate;
    if (!month || !year) return pendingRent?.dueDate || '--';
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  })();

  useEffect(() => {
    dispatch(getUpcomingRents());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getTenantRentHistory());
  }, [dispatch]);

  // ✅ Pay Rent handler — POST /api/rent { propertyTenantId, month, year }
  // Always targets the NEXT month after the latest record so "already exists"
  // error never occurs again.
 const handlePayRent = async () => {
  const ptId = pendingRent?.propertyTenantId || activeLease?.property?.id || activeLease?.propertyId || null;
  const { month: nextMonth, year: nextYear } = nextRentDate;

  if (!ptId || !nextMonth || !nextYear) {
    console.warn('⚠️ handlePayRent missing data', { ptId, nextMonth, nextYear });
    return;
  }

  setPaying(true);
  await dispatch(createRent({ propertyTenantId: ptId, month: nextMonth, year: nextYear }));
  dispatch(getUpcomingRents());
  dispatch(getTenantRentHistory());
  setPaying(false);
};
  // ── Derived display values ────────────────────────────────────────────────
  const assignedMonthlyRent = activeLease?.property?.monthlyRent ?? activeLease?.property?.monthly_rent ?? null;
const displayTotal = pendingRent?.total ?? assignedMonthlyRent ?? '--';
  const currency  = pendingRent?.currency || '$';
  const totalRent = pendingRent?.total    ?? '--';
  const baseRent  = pendingRent?.baseRent ?? '--';
  const utilities = pendingRent?.utilities ?? '--';

  return (
    <Container>
      {/* 🔹 Rent Due Section */}
      <VStack alignItems="center" mt={hp(2)}>
      
        <Text fontSize={hp(2)} color={Colors.textGray}>
          Your Rent is Due
        </Text>

    {loading ? (
    <ActivityIndicator size="small" color={Colors.red} style={{ marginVertical: hp(1.5) }} />
  ) : (
    <Text fontSize={hp(3.2)} bold color={Colors.black}>
      {displayTotal !== '--' ? `$${displayTotal}` : '--'}
    </Text>
  )}
        <TouchableOpacity
          style={[styles.payBtn, (paying || !pendingRent?.propertyTenantId) && { opacity: 0.7 }]}
          onPress={handlePayRent}
          disabled={paying || !(pendingRent?.propertyTenantId || activeLease?.property?.id || activeLease?.propertyId)}
        >
          {paying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>Pay Rent Now</Text>
          )}
        </TouchableOpacity>

        {/* ✅ Due date advances after each payment */}
        <Text fontSize={hp(1.8)} mt={hp(1)} color={Colors.textGray}>
          Next Due Date: <Text bold>{computedDueDate}</Text>
        </Text>
      </VStack>

      {/* 🔹 Rent Breakdown */}
      <Box bg="white" shadow={2} rounded="2xl" p={4} mt={hp(2)} mx={wp(5)}>
        <Text fontSize={hp(2)} bold mb={hp(1)}>
          Rent Breakdown
        </Text>

        <HStack justifyContent="space-between" mb={2}>
          <Text>Base Rent</Text>
          <Text bold>{baseRent !== '--' ? `${currency}${baseRent}` : '--'}</Text>
        </HStack>

        <HStack justifyContent="space-between" mb={2}>
          <Text>Utilities</Text>
          <Text bold>{utilities !== '--' ? `${currency}${utilities}` : '--'}</Text>
        </HStack>

        <HStack justifyContent="space-between">
          <Text bold>Total Rent</Text>
          <Text bold>{totalRent !== '--' ? `${currency}${totalRent}` : '--'}</Text>
        </HStack>
      </Box>

      {/* 🔹 Quick Links */}
      <VStack mt={hp(4)} mx={wp(5)} alignItems="center">
        <Text fontSize={hp(2.2)} bold mb={hp(1)}>
          Quick Links
        </Text>
        <HStack justifyContent="space-around" mt={hp(1)} space={wp(2)}>
          <QuickLink
            icon={icons.LandlordRent}
            label="Contact Landlord"
            onPress={() => navigation.navigate("ContactLandlord")}
          />
          <QuickLink
            icon={icons.RentHistory}
            label={"Rent" + "\n" + "History"}
            onPress={() => navigation.navigate("RentHistory")}
          />
          <QuickLink
            icon={icons.RentDocument}
            label="Rent Documents"
            onPress={() => navigation.navigate("RentDocuments")}
          />
        </HStack>
      </VStack>

      {/* 🔹 Contact Landlord Modal */}
      <Modal
        visible={showContactModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Contact Landlord</Text>

            <VStack space={4} mt={hp(3)}>
              <InfoBox icon={icons.person} label="Full Name"     value="Henry Cooper" />
              <InfoBox icon={icons.email}  label="Email ID"      value="henrycooper@gmail.com" />
              <InfoBox icon={icons.phone}  label="Phone Number"  value="+1 5555 5555 55" />
            </VStack>
          </View>
        </View>
      </Modal>

      {/* 🔹 Rent Documents Modal */}
      <Modal
        visible={showDocumentsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDocumentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowDocumentsModal(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Rent Documents</Text>

            <VStack space={4} mt={hp(3)}>
              <DocumentItem label="Rent Agreement" />
              <DocumentItem label="Inspection Reports" />
              <DocumentItem label="Insurance Policies" />
            </VStack>
          </View>
        </View>
      </Modal>
    </Container>
  );
};

// ─── Sub-components (unchanged) ───────────────────────────────────────────────

const QuickLink = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickLink} onPress={onPress}>
    <View style={styles.iconCircle}>
      <AppIcon name={icon} height={hp(4)} width={hp(4)} />
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

const InfoBox = ({ icon, label, value }) => (
  <Box style={styles.infoBox}>
    <HStack space={3} alignItems="center">
      <AppIcon name={icon} height={hp(2)} width={hp(2)} />
      <VStack>
        <Text fontSize={hp(1.6)} color={Colors.textGray}>{label}</Text>
        <Text fontSize={hp(2)}>{value}</Text>
      </VStack>
    </HStack>
  </Box>
);

const DocumentItem = ({ label }) => (
  <TouchableOpacity style={styles.docItem}>
    <HStack justifyContent="space-between" alignItems="center">
      <HStack space={3} alignItems="center">
        <AppIcon name={icons.document} height={hp(3)} width={hp(3)} />
        <VStack>
          <Text fontSize={hp(1.8)} bold>Download</Text>
          <Text fontSize={hp(1.8)}>{label}</Text>
        </VStack>
      </HStack>
      <View style={styles.downloadBtn}>
        <AppIcon name={icons.download} height={hp(2.5)} width={hp(2.5)} />
      </View>
    </HStack>
  </TouchableOpacity>
);

// ─── Styles (unchanged) ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  payBtn: {
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
  payBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: hp(2),
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
    color: "#222222",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    minHeight: hp(50),
  },
  modalHandle: {
    width: wp(15),
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: hp(2),
  },
  closeBtn: {
    position: "absolute",
    right: wp(5),
    top: hp(2),
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeText: {
    fontSize: hp(2.5),
    color: "#6B7280",
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: "#000",
    marginTop: hp(1),
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    padding: hp(2),
    borderRadius: 12,
  },
  docItem: {
    backgroundColor: "#F9FAFB",
    padding: hp(2),
    borderRadius: 12,
  },
  downloadBtn: {
    backgroundColor: "#FEE2E2",
    padding: hp(1),
    borderRadius: 8,
  },
});

export default TenantPayments;
