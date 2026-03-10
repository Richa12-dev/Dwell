import React from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {icons} from '../../Assets';
import {HelperService} from '../../commonFunction/HelperService';
import {InfoCard, StatusCard} from '../../components/DisbursalComponent';
import Header from '../../components/Header';
import Separator from '../../components/Separator';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const PayoutDetail = ({navigation, route}) => {
  // Static data instead of API
  const data = {
    invoiceNo: 'INV123456',
    appId: 'APP7890',
    utr: 'UTR456789',
    currentStatus: 'Paid',
    invoiceRaisedDate: '2023-09-15',
    l1appStatus: 'approved',
    l2appStatus: 'approved',
    paymentDate: '2023-09-20',
    disbCount: 2,
    disbursalAmount: 50000,
    invoiceAmount: 55000,
    paymentAmount: 50000,
    eSigned: 'Yes',
    rejectRemarks: '',
    product: 'Personal Loan',
  };

  return (
    <View style={styles.container3}>
      <View style={styles.container}>
        <Header title={'Payout Details'} container={{marginLeft: -10}} />

        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          style={{paddingHorizontal: 16}}>
          <View style={{flexDirection: 'row', marginTop: 8}}>
            <View style={{flex: 1}}>
              <Text style={styles.applicationIdTextStyle}>
                {data?.appId ? data?.appId : data?.invoiceNo}
              </Text>
              <Text style={{fontFamily: getFontFamily('bold')}}>
                {data.utr ? data.utr : '-'}
              </Text>
            </View>

            <View style={styles.container2}>
              <View
                style={[
                  styles.labelContainer,
                  {
                    backgroundColor:
                      data?.currentStatus == 'NotPaid' ? '#f6c345' : '#50ab5c',
                  },
                ]}>
                <Text style={[styles.labelText]}>{data?.currentStatus}</Text>
              </View>
              <View
                style={[
                  styles.tail,
                  {
                    borderBottomColor:
                      data?.currentStatus == 'NotPaid' ? '#ae2828' : '#2b8238',
                  },
                ]}
              />
            </View>
          </View>

          <View style={{marginVertical: hp(4), backgroundColor: 'white'}}>
            <StatusCard
              title={'Invoice Raised'}
              show={true}
              icon={icons.disbursedLogin}
              date={
                data?.invoiceRaisedDate
                  ? HelperService.payoutformatDate(data?.invoiceRaisedDate)
                  : ''
              }
            />
            <StatusCard
              title={'L1 Approved'}
              icon={icons.disbursedApprovedLogo}
              show={true}
            />
            <StatusCard
              title={'L2 Approved'}
              icon={icons.disbursedApprovedLogo}
              show={true}
            />
            <StatusCard
              title={'Payout Released'}
              icon={icons.disbursedDetaillogo}
              show={false}
              date={
                data?.paymentDate
                  ? HelperService.convertDate(data?.paymentDate)
                  : ''
              }
            />
          </View>

          <Separator />

          <Text
            style={{
              fontSize: 19,
              fontFamily: getFontFamily('bold'),
              color: '#174137',
            }}>
            Invoice Details
          </Text>
          <InfoCard
            title1={'Disbursed count'}
            value1={data?.disbCount}
            title2={'Disbursed value'}
            value2={
              '₹ ' +
              HelperService.formatIndianCurrency(
                HelperService.formatNumberWithCommas(data?.disbursalAmount),
              )
            }
          />
          <InfoCard
            title1={'Invoice raised amount'}
            value1={
              '₹ ' +
              HelperService.formatIndianCurrency(
                HelperService.formatNumberWithCommas(data?.invoiceAmount),
              )
            }
            title2={'Approved Amount'}
            value2={
              '₹ ' +
              HelperService.formatIndianCurrency(
                HelperService.formatNumberWithCommas(data?.invoiceAmount),
              )
            }
          />
          <InfoCard
            title1={'Payout Amount'}
            value1={
              '₹ ' +
              HelperService.formatIndianCurrency(
                HelperService.formatNumberWithCommas(data?.paymentAmount),
              )
            }
            title2={'Esigned'}
            value2={data?.eSigned}
          />
          <InfoCard
            title1={'Reject Remarks'}
            value1={data?.rejectRemarks ? data?.rejectRemarks : '-'}
            title2={'Product'}
            value2={data?.product}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default PayoutDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray',
    marginVertical: 8,
  },
  applicationIdTextStyle: {
    fontFamily: getFontFamily('bold'),
    fontSize: wp(3.8),
    color: '#174135',
  },
  container2: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelContainer: {
    backgroundColor: '#4CAF50',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 0,
  },
  labelText: {
    color: 'white',
    fontSize: 16,
    fontFamily: getFontFamily('bold'),
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderBottomWidth: 8,
    right: 3,
    top: 19,
    elevation: 3,
    borderLeftColor: 'transparent',
    borderBottomColor: '#3a8842',
    transform: [{rotate: '180deg'}],
  },
  scrollViewContent: {
    paddingBottom: 200,
  },
  container3: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? 0 : StatusBar.currentHeight,
    ...Platform.select({
      ios: {
        paddingTop: hp(7),
      },
    }),
  },
});
