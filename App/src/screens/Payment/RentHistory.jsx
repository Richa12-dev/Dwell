import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { Box, Text, VStack, HStack } from "native-base";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";

import { getTenantRentHistory } from "../../Redux/Rent/services";
import { rentSelectors } from "../../Redux/Rent/rentSlice";

import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** month: 4, year: 2026  →  "April 2026" */
const formatMonthYear = (month, year) => {
  if (!month) return "N/A";
  const name = MONTH_NAMES[(Number(month) - 1)] || `Month ${month}`;
  return year ? `${name} ${year}` : name;
};

/** "2026-04-01"  →  "Apr 1, 2026"  |  null → null */
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatSafeDate = (date) => {
  if (!date) return 'N/A';

  try {
    const normalizedDate =
      typeof date === 'string' && date.includes('T')
        ? date
        : `${date}T00:00:00`;

    const d = new Date(normalizedDate);

    if (isNaN(d.getTime())) return 'N/A';

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return 'N/A';
  }
};
// ─── Field normalizer ─────────────────────────────────────────────────────────
// Mapped 1-to-1 against the real /api/rent/tenant-history response:
// {
//   id, amount (string "200.00"), dueDate, paidDate (nullable), status,
//   paymentMethod (nullable), paymentReference (nullable),
//   lateFee (nullable), notes (nullable), month (number 4), year (2026),
//   property: { name, monthlyRent, ... }
// }
const normalizeRentRecord = (item) => {
  const amount  = parseFloat(item?.amount ?? item?.rent_amount ?? item?.rentAmount ?? 0) || 0;
  const lateFee = item?.lateFee != null ? parseFloat(item.lateFee) : null;

  return {
    id:             item?.id || item?.rent_id || null,
    month:          formatMonthYear(item?.month, item?.year),
    status:         (item?.status || item?.payment_status || "pending").toUpperCase(),
    property_name:  item?.property?.name || item?.property_name || item?.propertyName || "N/A",
    amount,
    lateFee,
due_date: formatSafeDate(item?.dueDate),
paid_date:
  item?.paidDate
    ? formatSafeDate(item.paidDate)
    : item?.status === 'paid'
    ? formatSafeDate(item?.updatedAt || item?.createdAt)
    : 'N/A',    // paymentMethod is null until paid
    payment_mode:   item?.paymentMethod || item?.payment_mode || item?.paymentMode || null,
    // paymentReference is the transaction reference
    transaction_id: item?.paymentReference || item?.payment_reference
                      || item?.transactionId || item?.transaction_id || null,
    receipt_url:    item?.receipt_url || item?.receiptUrl || null,
    notes:          item?.notes || null,
      property_name:    item?.property?.name || item?.property_name || item?.propertyName || "N/A",
    // ✅ ADD: show address so tenant can distinguish properties
    property_address: item?.property
      ? `${item.property.streetAddress || ''}, ${item.property.city || ''}`
      : null,
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

const RentHistory = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();

  const rentHistoryRaw = useSelector(rentSelectors.getRentHistory);
  const loading        = useSelector(rentSelectors.isLoading);
  const error          = useSelector(rentSelectors.getError);

  const rentHistory = (rentHistoryRaw || []).map(normalizeRentRecord);

  // Re-fetch every time this screen gains focus so a payment made on
  // Dashboard / TenantPayments is reflected here immediately
  useFocusEffect(
    useCallback(() => {
      dispatch(getTenantRentHistory());
    }, [dispatch])
  );

  // ── Status helpers ────────────────────────────────────────────────────────

  const getStatusColor = (status) => {
    switch (status) {
      case "PAID":    return "#4CAF50";
      case "LATE":    return "#FF9800";
      case "PENDING":
      case "OVERDUE": return "#F44336";
      default:        return Colors.textGray;
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case "PAID":    return "rgba(76, 175, 80, 0.1)";
      case "LATE":    return "rgba(255, 152, 0, 0.1)";
      case "PENDING":
      case "OVERDUE": return "rgba(244, 67, 54, 0.1)";
      default:        return "rgba(0, 0, 0, 0.05)";
    }
  };

  // ── Receipt handler ───────────────────────────────────────────────────────

  const handleDownloadReceipt = async (receiptUrl) => {
    if (!receiptUrl) {
      Toast.show("Receipt not available");
      return;
    }
    try {
      const supported = await Linking.canOpenURL(receiptUrl);
      if (supported) {
        await Linking.openURL(receiptUrl);
        Toast.show("Opening receipt...");
      } else {
        Toast.show("Unable to open receipt");
      }
    } catch (err) {
      console.error("Error opening receipt:", err);
      Toast.show("Failed to open receipt");
    }
  };

  // ── Row renderer ──────────────────────────────────────────────────────────

  const renderItem = ({ item }) => {
    const isPaid    = item.status === "PAID";
    const isPending = item.status === "PENDING" || item.status === "OVERDUE";

    return (
      <TouchableOpacity
        onPress={() => handleDownloadReceipt(item.receipt_url)}
        activeOpacity={0.7}
      >
        <Box style={styles.historyCard}>
          <VStack space={2}>

            {/* ── Month + Status ── */}
            <HStack justifyContent="space-between" alignItems="center">
              <Text style={styles.monthText}>{item.month}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            </HStack>

            {/* ── Property name ── */}
            <Text style={styles.propertyText} numberOfLines={1}>
              {item.property_name}
            </Text>

            {/* ── Amount + Date ── */}
            <HStack justifyContent="space-between" alignItems="flex-end" mt={1}>
              <VStack>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.amountText}>
                  ${item.amount.toFixed(2)}
                </Text>
                {/* Late fee shown only when present */}
                {item.lateFee != null && (
                  <Text style={styles.lateFeeText}>
                    + ${item.lateFee.toFixed(2)} late fee
                  </Text>
                )}
              </VStack>

              <VStack alignItems="flex-end">
                {isPaid ? (
                  <>
                    <Text style={styles.detailLabel}>Paid on</Text>
                    <Text style={styles.detailText}>{item.paid_date || "—"}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.detailLabel}>Due on</Text>
                    <Text style={[styles.detailText, { color: getStatusColor(item.status) }]}>
                      {item.due_date}
                    </Text>
                  </>
                )}
              </VStack>
            </HStack>

            {/* ── Payment mode + Receipt ── */}
            <HStack justifyContent="space-between" alignItems="center" mt={2}>
              <HStack space={1} alignItems="center">
                <AppIcon name={icons.Wallet} height={hp(1.8)} width={hp(1.8)} />
                <Text style={styles.paymentModeText}>
                  {item.payment_mode
                    ? item.payment_mode.charAt(0).toUpperCase() + item.payment_mode.slice(1)
                    : isPending
                    ? "Payment Pending"
                    : "—"}
                </Text>
              </HStack>

              {item.receipt_url ? (
                <HStack space={1} alignItems="center">
                  <AppIcon name={icons.Download} height={hp(1.8)} width={hp(1.8)} />
                  <Text style={styles.receiptText}>Receipt</Text>
                </HStack>
              ) : null}
            </HStack>

            {/* ── Reference / Transaction ID (only when paid) ── */}
            {item.transaction_id ? (
              <Text style={styles.transactionText}>Ref: {item.transaction_id}</Text>
            ) : null}

            {/* ── Notes ── */}
            {item.notes ? (
              <Text style={styles.notesText}>{item.notes}</Text>
            ) : null}

          </VStack>
        </Box>
      </TouchableOpacity>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  const renderEmptyState = () => (
    <Box style={styles.emptyContainer}>
      <AppIcon name={icons.Document} height={hp(8)} width={hp(8)} />
      <Text style={styles.emptyTitle}>No Rent History</Text>
      <Text style={styles.emptySubtitle}>
        Your rent payment history will appear here
      </Text>
    </Box>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Container scroll={false}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <HStack alignItems="center" justifyContent="flex-start" space={2}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
          </TouchableOpacity>
          <Text style={styles.title}>Rent History</Text>
        </HStack>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text mt={3} fontSize={hp(2)} color={Colors.textGray}>
            Loading rent history...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text fontSize={hp(2)} color="red.500" textAlign="center" mb={3}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => dispatch(getTenantRentHistory())}
            style={styles.retryButton}
          >
            <Text color={Colors.red} fontSize={hp(1.8)}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rentHistory}
          renderItem={renderItem}
          keyExtractor={(item, index) => String(item?.id || index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: hp(1.5) }} />}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </Container>
  );
};

// ─── Styles (unchanged) ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  listContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    paddingBottom: hp(10),
  },
  historyCard: {
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
  monthText: {
    fontSize: hp(2),
    fontWeight: "bold",
    color: "#000",
  },
  statusBadge: {
    paddingHorizontal: hp(1.2),
    paddingVertical: hp(0.5),
    borderRadius: 8,
  },
  statusText: {
    fontSize: hp(1.4),
    fontWeight: "600",
  },
  propertyText: {
    fontSize: hp(1.6),
    color: Colors.textGray,
  },
  amountLabel: {
    fontSize: hp(1.4),
    color: Colors.textGray,
  },
  amountText: {
    fontSize: hp(2.4),
    fontWeight: "bold",
    color: "#000",
    marginTop: hp(0.3),
  },
  lateFeeText: {
    fontSize: hp(1.4),
    color: "#FF9800",
    marginTop: hp(0.2),
  },
  detailLabel: {
    fontSize: hp(1.4),
    color: Colors.textGray,
  },
  detailText: {
    fontSize: hp(1.6),
    color: "#000",
    marginTop: hp(0.3),
  },
  paymentModeText: {
    fontSize: hp(1.5),
    color: Colors.textGray,
  },
  receiptText: {
    fontSize: hp(1.5),
    color: Colors.red,
    fontWeight: "500",
  },
  transactionText: {
    fontSize: hp(1.3),
    color: Colors.textGray,
    marginTop: hp(0.5),
  },
  notesText: {
    fontSize: hp(1.3),
    color: Colors.textGray,
    fontStyle: "italic",
    marginTop: hp(0.3),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(5),
  },
  retryButton: {
    marginTop: hp(2),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: hp(10),
  },
  emptyTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: "#000",
    marginTop: hp(2),
  },
  emptySubtitle: {
    fontSize: hp(1.6),
    color: Colors.textGray,
    marginTop: hp(1),
    textAlign: "center",
  },
});

export default RentHistory;
