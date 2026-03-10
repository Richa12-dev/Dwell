import React, { useEffect } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { Box, Text, VStack, HStack } from "native-base";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { getRentHistory } from "../../Redux/Rent/services";
import { rentSelectors } from "../../Redux/Rent/rentSlice";
import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";

const RentHistory = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { rentHistory, loading, error, totalCount } = useSelector(rentSelectors.getRentData);

  // Fetch rent history on mount - FOR DEMO: fetch all history without auth
  useEffect(() => {
    console.log('📊 RentHistory: Fetching all rent history (DEMO MODE)');
    dispatch(getRentHistory());
  }, [dispatch]);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return '#4CAF50';
      case 'LATE':
        return '#FF9800';
      case 'PENDING':
        return '#F44336';
      default:
        return Colors.textGray;
    }
  };

  const getStatusBgColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'rgba(76, 175, 80, 0.1)';
      case 'LATE':
        return 'rgba(255, 152, 0, 0.1)';
      case 'PENDING':
        return 'rgba(244, 67, 54, 0.1)';
      default:
        return 'rgba(0, 0, 0, 0.05)';
    }
  };

  const handleDownloadReceipt = async (receiptUrl) => {
    if (!receiptUrl) {
      Toast.show('Receipt not available');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(receiptUrl);
      
      if (supported) {
        await Linking.openURL(receiptUrl);
        Toast.show('Opening receipt...');
      } else {
        Toast.show('Unable to open receipt');
      }
    } catch (error) {
      console.error('Error opening receipt:', error);
      Toast.show('Failed to open receipt');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleDownloadReceipt(item.receipt_url)}
      activeOpacity={0.7}
    >
      <Box style={styles.historyCard}>
        <VStack space={2}>
          {/* Header: Month & Status */}
          <HStack justifyContent="space-between" alignItems="center">
            <Text style={styles.monthText}>{item.month}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBgColor(item.status) }
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.status) }
                ]}
              >
                {item.status}
              </Text>
            </View>
          </HStack>

          {/* Property Info */}
          <Text style={styles.propertyText} numberOfLines={1}>
            {item.property_name || 'N/A'}
          </Text>

          {/* Amount & Payment Details */}
          <HStack justifyContent="space-between" alignItems="flex-end" mt={1}>
            <VStack>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.amountText}>₹{item.amount}</Text>
            </VStack>
            
            <VStack alignItems="flex-end">
              <Text style={styles.detailLabel}>Paid on</Text>
              <Text style={styles.detailText}>{item.paid_date}</Text>
            </VStack>
          </HStack>

          {/* Payment Mode & Receipt */}
          <HStack justifyContent="space-between" alignItems="center" mt={2}>
            <HStack space={1} alignItems="center">
              <AppIcon name={icons.Wallet} height={hp(1.8)} width={hp(1.8)} />
              <Text style={styles.paymentModeText}>{item.payment_mode}</Text>
            </HStack>
            
            {item.receipt_url && (
              <HStack space={1} alignItems="center">
                <AppIcon name={icons.Download} height={hp(1.8)} width={hp(1.8)} />
                <Text style={styles.receiptText}>Receipt</Text>
              </HStack>
            )}
          </HStack>

          {/* Transaction ID */}
          {item.transaction_id && (
            <Text style={styles.transactionText}>
              Transaction ID: {item.transaction_id}
            </Text>
          )}
        </VStack>
      </Box>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <Box style={styles.emptyContainer}>
      <AppIcon name={icons.Document} height={hp(8)} width={hp(8)} />
      <Text style={styles.emptyTitle}>No Rent History</Text>
      <Text style={styles.emptySubtitle}>
        Your rent payment history will appear here
      </Text>
    </Box>
  );

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
            onPress={() => dispatch(getRentHistory())}
            style={styles.retryButton}
          >
            <Text color={Colors.red} fontSize={hp(1.8)}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rentHistory}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.transaction_id || index.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: hp(1.5) }} />}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
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
  listContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    paddingBottom: hp(10)
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
    color: "#000"
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
