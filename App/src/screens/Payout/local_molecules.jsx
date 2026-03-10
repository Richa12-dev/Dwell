import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {icons} from '../../Assets';
import {HelperService} from '../../commonFunction/HelperService';
import {AppIcon} from '../../components/AppIcon';
import {navigate} from '../../navigation/RouterServices';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const Chip = ({item, isSelected, onSelect, ...props}) => {
  return (
    <TouchableOpacity
      onPress={() => onSelect(item)}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? Colors.primary : Colors.white,
        },
      ]}>
      <Text
        style={{
          color: isSelected ? Colors.white : Colors.primary,
          fontFamily: getFontFamily('bold'),
        }}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

const PayoutCard = ({item, navigation}) => {
  return (
    <View
      style={{
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 15,
      }}>
      <TouchableOpacity
        onPress={() => navigate('PayoutDetail', {data: item})}
        style={{
          borderWidth: 0.5,
          borderColor: Colors.border,
          borderRadius: 15,
          backgroundColor: 'white',
          paddingVertical: 15,
          elevation: 5,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingleft: 16,
          }}>
          {/* <View
            style={{
              width: '15%',

              alignItems: 'center',
            }}>
            <Text
              style={{
                backgroundColor: '#edffe9',
                paddingHorizontal: 10,
                paddingVertical: 9,
                borderRadius: 100,
              }}>
              As
            </Text>
          </View> */}
          <View style={{width: '58%', marginLeft: 10}}>
            <Text style={styles.invoiceCardTitle}>
              {item?.invoiceNo ? `Invoice ID: ${item.invoiceNo}` : ''}
            </Text>
            <Text style={styles.invoiceCardTitle}>
              {item?.utr ? `UTR: ${item.utr}` : ''}
            </Text>
          </View>

          <CommonStatusCard
            status={item?.currentStatus}
            style={{
              backgroundColor:
                item?.currentStatus == 'NotPaid' ? '#f6c345' : '#50ab5c',
            }}
            textStyle={{
              color: item?.currentStatus == 'NotPaid' ? '#98772b' : 'white',
            }}
            trainglestyle={{
              borderBottomColor:
                item?.currentStatus == 'NotPaid' ? '#ae2828' : '#2b8238',
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: wp(2),
            paddingVertical: 15,
            justifyContent: 'space-between',
          }}>
          <Text
            style={{
              fontFamily: getFontFamily('medium'),
              color: Colors.titleColor,
              fontSize: wp(3.8),
            }}>
            Raised Amount
          </Text>
          <Text
            style={{
              fontFamily: getFontFamily('medium'),
              color: Colors.titleColor,
              paddingRight: wp(0),
              fontSize: wp(3.8),
            }}>
            Payout Amount
          </Text>
        </View>
        <View style={{paddingHorizontal: wp(2)}}>
          <View style={{flexDirection: 'row'}}>
            <View style={{width: '33%'}}>
              <Text
                style={{
                  fontFamily: getFontFamily('bold'),
                  color: Colors.primary,
                  // fontSize: 15,
                  fontSize: wp(4),
                }}>
                <Text
                  style={{
                    fontFamily: getFontFamily('regular'),
                    fontSize: wp(4),
                  }}>
                  ₹{' '}
                </Text>
                {item?.invoiceAmount
                  ? HelperService.formatIndianCurrency(
                      HelperService.format2Decimals(item?.invoiceAmount),
                    )
                  : '-'}
              </Text>
              <Text
                style={{
                  fontFamily: getFontFamily('medium'),
                  color: Colors.primary,
                  fontSize: wp(3.7),
                  // marginTop: 1,
                }}>
                {item?.invoiceRaisedDate
                  ? HelperService.convertDate(item?.invoiceRaisedDate)
                  : '-'}
              </Text>
            </View>
            <View
              style={{
                width: '28%',
                alignItems: 'center',
              }}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: 100,
                  padding: 5,
                  marginTop: -10,
                  zIndex: 1,
                }}>
                <AppIcon
                  name={
                    item?.currentStatus == 'Paid' ||
                    item?.currentStatus == 'PAID'
                      ? icons.payoutPaidIcon
                      : icons.payoutPendingIcon
                  }
                  size={wp(8)}
                />
              </View>
            </View>
            <View style={{width: '36%', paddingLeft: 15}}>
              <Text
                style={{
                  fontFamily: getFontFamily('bold'),
                  color: Colors.primary,
                  fontSize: wp(3.8),
                }}>
                <Text
                  style={{
                    fontFamily: getFontFamily('regular'),
                    fontSize: wp(3.8),
                  }}>
                  {(item?.invoiceAmount && item?.currentStatus == 'Paid') ||
                  item?.currentStatus == 'PAID'
                    ? '₹ '
                    : '-'}
                </Text>
                {(item?.paymentAmount && item?.currentStatus == 'Paid') ||
                item?.currentStatus == 'PAID'
                  ? HelperService.formatIndianCurrency(
                      HelperService.format2Decimals(item?.paymentAmount),
                    )
                  : ''}
              </Text>
              <Text
                style={{
                  fontFamily: getFontFamily('medium'),
                  color: Colors.primary,
                  fontSize: wp(3.4),
                  marginTop: 1,
                }}>
                {item?.paymentDate
                  ? HelperService.convertDate(item?.paymentDate)
                  : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* <Text>{HelperService.formatToINR(65000)}</Text> */}
      </TouchableOpacity>
    </View>
  );
};

const RightAngleTriangle = ({style}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.triangle, style]} />
    </View>
  );
};

const CommonStatusCard = ({status, style, trainglestyle, textStyle}) => {
  return (
    <View
      style={[
        {
          position: 'absolute',
          backgroundColor: '#50ab5c',
          // padding: 10,
          // paddingLeft: 20,
          justifyContent: 'center',
          right: -4,
          top: 2,
          elevation: 0,
          borderTopLeftRadius: 3,
          borderBottomLeftRadius: 3,
        },
        style,
      ]}>
      <Text
        style={[
          {
            fontFamily: getFontFamily('medium'),
            textAlign: 'center',
            paddingTop: 5,
            paddingHorizontal: 15,
          },
          textStyle,
        ]}>
        {status}
      </Text>
      <RightAngleTriangle style={trainglestyle} />
    </View>
  );
};

export {Chip, CommonStatusCard, PayoutCard, RightAngleTriangle};

const styles = StyleSheet.create({
  chip: {
    margin: 4,
    padding: 10,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: Colors.primary,
    display: 'flex',
    flexDirection: 'row',
  },
  invoiceCardTitle: {
    color: Colors.primary,
    fontFamily: getFontFamily('medium'),
    fontSize: wp(3.8),
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderBottomWidth: 8,
    right: 0,
    top: 8,
    elevation: 10,
    borderLeftColor: 'transparent',
    borderBottomColor: '#3a8842',
    transform: [{rotate: '180deg'}],
  },
});
