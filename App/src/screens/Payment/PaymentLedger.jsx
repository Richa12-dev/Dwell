import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Container from '../../components/Container/Container';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';

const PaymentLedger = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [statusDropdown, setStatusDropdown] = useState('All Status');
  const [timeDropdown, setTimeDropdown] = useState('All Time');

  const ledgerData = [
    { jobId: '1042', address: '123, Palm Street', amount: 1200, date: '15/10/2025', status: 'Paid' },
    { jobId: '1043', address: '123, Palm Street', amount: 2200, date: '15/10/2025', status: 'Pending' },
    { jobId: '1044', address: '123, Palm Street', amount: 2500, date: '15/10/2025', status: 'In Process' },
    { jobId: '1045', address: '456, Oak Avenue', amount: 1800, date: '14/10/2025', status: 'Pending' },
    { jobId: '1046', address: '789, Maple Drive', amount: 3200, date: '13/10/2025', status: 'Paid' },
  ];

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Paid':
        return { backgroundColor: '#DBEAFE', color: '#1D4ED8' };
      case 'Pending':
        return { backgroundColor: '#FEE2E2', color: '#DC2626' };
      case 'In Process':
        return { backgroundColor: '#DCFCE7', color: '#16A34A' };
      default:
        return { backgroundColor: '#E5E7EB', color: '#6B7280' };
    }
  };

  return (
    <Container>
      {/* Background Glow Effects */}
      <View style={styles.backgroundContainer}>
        <View style={styles.topGlow} />
        <View style={styles.bottomGlow} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={styles.backButton}
          >
            <AppIcon name={icons.arrowBack} size={wp(6)} color={Colors.black} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Payment Ledger</Text>
        </View>

        <Text style={styles.subtitle}>Complete payment transaction history</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <AppIcon name={icons.search} size={wp(5)} color="#9CA3AF" />
          <TextInput
            placeholder="Search by Job ID or Property..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterBox}>
            <Text style={styles.filterText}>{statusDropdown}</Text>
            <AppIcon name={icons.dropdown} size={wp(4)} color={Colors.black} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterBox}>
            <Text style={styles.filterText}>{timeDropdown}</Text>
            <AppIcon name={icons.dropdown} size={wp(4)} color={Colors.black} />
          </TouchableOpacity>
        </View>

        {/* Payment Cards */}
        <View style={styles.cardsWrapper}>
          {ledgerData.map((item, index) => {
            const badge = getStatusBadgeStyle(item.status);
            return (
              <TouchableOpacity
                key={index}
                style={styles.paymentCard}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.jobId}>JOB ID: {item.jobId}</Text>
                  <Text style={styles.amount}>${item.amount.toLocaleString()}</Text>
                </View>

                <Text style={styles.address}>{item.address}</Text>

                <View style={styles.cardFooter}>
                  <View style={styles.dateContainer}>
                    <AppIcon name={icons.calendar} size={wp(4)} color="#6B7280" />
                    <Text style={styles.date}>{item.date}</Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.backgroundColor }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.showMoreBtn}>
          <Text style={styles.showMoreText}>Show More Details</Text>
          <AppIcon name={icons.arrowDown} size={wp(4)} color={Colors.red} />
        </TouchableOpacity>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({

  scrollContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(3),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
    gap: wp(3),
  },
  backButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageTitle: {
    fontSize: hp(2.0),
    fontFamily: 'Nunito-Bold',
    color: Colors.black,
  },
  subtitle: {
    fontSize: hp(1.4),
    color: '#6B7280',
    marginTop: hp(0.5),
    marginBottom: hp(2.5),
    fontFamily: 'Nunito-Regular',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: wp(4),
    borderRadius: 12,
    height: hp(6),
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    marginLeft: wp(3),
    flex: 1,
    fontSize: hp(1.4),
    fontFamily: 'Nunito-Regular',
    color: Colors.black,
  },
  filterRow: {
    marginTop: hp(2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(3),
  },
  filterBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: hp(1.4),
    color: Colors.black,
  },
  cardsWrapper: {
    marginTop: hp(3),
    gap: hp(1.5),
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.15)',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  jobId: {
    fontSize: hp(1.4),
    fontFamily: 'Nunito-Bold',
    color: Colors.black,
  },
  amount: {
    fontSize: hp(2.0),
    fontFamily: 'Nunito-Bold',
    color: Colors.red,
  },
  address: {
    fontSize: hp(1.6),
    color: '#6B7280',
    marginBottom: hp(1.2),
    fontFamily: 'Nunito-Regular',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  date: {
    fontSize: hp(1.6),
    color: '#6B7280',
    fontFamily: 'Nunito-Regular',
  },
  statusBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: 8,
  },
  statusText: {
    fontSize: hp(1.6),
    fontFamily: 'Nunito-Bold',
  },
  showMoreBtn: {
    marginTop: hp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingVertical: hp(1.5),
  },
  showMoreText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: hp(1.6),
    color: Colors.red,
  },
});

export default PaymentLedger;
