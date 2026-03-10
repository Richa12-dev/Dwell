// 📁 screens/Payment/ContractorPayment.jsx
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Container from '../../components/Container/Container';
import { EarningsCard } from '../../components/Payment/EarningsCard';
import { NextPayoutCard } from '../../components/Payment/NextPayoutCard';
import { PaymentLedgerButton } from '../../components/Payment/PaymentLedgerButton';
import { RecentPaymentItem } from '../../components/Payment/RecentPaymentItem';
import { SectionHeader } from '../../components/Payment/SectionHeader';
import { PaymentDetailsModal } from './PaymentDetailsModal';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../Theme';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { getFontFamily } from '../../utils';

const ContractorPayment = () => {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const navigation = useNavigation();

  const paymentsData = [
    {
      id: 1,
      jobId: '1042',
      address: '123, Palm Street',
      amount: 1200,
      date: '15/10/2025',
      status: 'Paid',
      paymentId: 'PAY-1042',
      transactionDate: '15 Sep, 2025',
      timeline: [
        { label: 'Job Completed', date: '15/10/2025', completed: true },
        { label: 'Payment Completed', date: '15/10/2025', completed: true },
      ],
    },
    {
      id: 2,
      jobId: '1043',
      address: '123, Palm Street',
      amount: 2200,
      date: '15/10/2025',
      status: 'Pending',
      paymentId: 'PAY-1043',
      transactionDate: '15 Sep, 2025',
      timeline: [
        { label: 'Job Completed', date: '15/10/2025', completed: true },
        { label: 'Payment Completed', date: '15/10/2025', completed: false },
      ],
    },
    {
      id: 3,
      jobId: '1044',
      address: '123, Palm Street',
      amount: 2500,
      date: '15/10/2025',
      status: 'In Process',
      paymentId: 'PAY-1044',
      transactionDate: '15 Sep, 2025',
      timeline: [
        { label: 'Job Completed', date: '15/10/2025', completed: true },
        { label: 'Payment Completed', date: '15/10/2025', completed: false },
      ],
    },
  ];

  const handlePaymentPress = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleViewLedger = () => {
    navigation.navigate('PaymentLedger');
  };

  return (
    <Container>
      {/* Background Glow Effects */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Payments & Earnings</Text>
          <Text style={styles.subtitle}>Track your earnings and manage payouts</Text>
        </View>

        {/* Earnings Card */}
        <EarningsCard
          totalEarnings={9000}
          upcomingPayouts={4400}
          pendingCount={2}
        />

        {/* Next Payout */}
        <NextPayoutCard amount={1200} date="Oct 28, 2025" />

        {/* View Payment Ledger Button */}
        <PaymentLedgerButton onPress={handleViewLedger} />

        {/* Recent Payments Section */}
        <View style={styles.recentPaymentsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <AppIcon name={icons.recentPayments} size={wp(5.5)} color={Colors.red} />
              <Text style={styles.sectionTitle}>Recent Payments</Text>
            </View>
            <TouchableOpacity style={styles.filterButton}>
              <AppIcon name={icons.filter} size={wp(4.5)} color={Colors.black} />
            </TouchableOpacity>
          </View>

          {paymentsData.map((payment, index) => (
            <RecentPaymentItem
              key={payment.id}
              jobId={payment.jobId}
              address={payment.address}
              amount={payment.amount}
              date={payment.date}
              status={payment.status}
              onPress={() => handlePaymentPress(payment)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        visible={showDetailsModal}
        payment={selectedPayment}
        onClose={() => setShowDetailsModal(false)}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
 
  scrollContent: {
    flexGrow: 1,
    paddingBottom: hp(3),
  },
  titleSection: {
    marginHorizontal: wp(5),
    marginTop: hp(2),
    marginBottom: hp(2.5),
  },
  mainTitle: {
    fontSize: hp(2),
    fontFamily: 'Nunito-Bold',
    color: Colors.black,
  },
  subtitle: {
    fontSize: hp(1.4),
    color: '#6B7280',
    marginTop: hp(0.5),
    fontFamily: 'Nunito-Regular',
  },
  recentPaymentsSection: {
    marginTop: hp(3),
    marginHorizontal: wp(5),
    marginBottom: hp(2),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  sectionTitle: {
    fontSize: hp(1.8),
    fontFamily: 'Nunito-Bold',
    color: Colors.black,
  },
  filterButton: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ContractorPayment;
