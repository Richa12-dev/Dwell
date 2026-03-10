import React, {useEffect, useState} from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import FlashMessage, {showMessage} from 'react-native-flash-message';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from 'react-native-responsive-screen';
import {useDispatch, useSelector} from 'react-redux';
import {icons} from '../../Assets';
import {HelperService} from '../../commonFunction/HelperService';
import {AppIcon} from '../../components/AppIcon';
import GenericIcon from '../../components/GenericIcon';
import Header from '../../components/Header';
import IconDatePicker from '../../components/IconDatePicker';
import SearchBar from '../../components/SearchBar';
import {loginDataSelectors} from '../../Redux/Login/loginSlice';
// import {payoutDataSelectors} from '../../Redux/Payout/payoutSlice';
// import {getPayoutByDate} from '../../Redux/Payout/services';
// import {ChipSkeleton, PayoutSkeleton} from '../../Skeletons';
import {Colors} from '../../Theme';
import {calculateDate, getFontFamily} from '../../utils';
import {Chip, PayoutCard} from './local_molecules';
const Payout = ({navigation}) => {
  const dispatch = useDispatch();
  const {userData, token} = useSelector(loginDataSelectors.getData);
  // const {getPayoutByDateData, getPayoutByDateLoading} = useSelector(
  //   payoutDataSelectors.getData,
  // );
  const [text, setText] = useState('');

  const [showBar, setShowBar] = useState(false);
  const statusData = [
    {id: 'All', name: 'All'},
    {id: 'Paid', name: 'Paid'},
    {id: 'Pending', name: 'Pending'},
  ];

  const [selectedItem, setSelectedItem] = useState('All');

  const handleSelect = item => {
    setSelectedItem(item.id);
  };

  console.log(selectedItem, 'selectedItemselectedItem');
  useEffect(() => {
    setSelectedItem(selectedItem);
  }, [selectedItem]);

  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = () => {
    const dd = calculateDate('3');
    // dispatch(
    //   getPayoutByDate({
    //     startDate: '01-03-2023',
    //     endDate: HelperService.dateReadableFormat(new Date()),
    //     groupBy: 'month',
    //     dealerCode: userData?.dealerCode,

    //     token: token,
    //   }),
    // );
  };
  const renderItem = ({item, index}) => (
    <PayoutCard item={item} onpress={navigation} />
  );
  const renderFooter = () => {
    return <View style={{height: heightPercentageToDP(10)}} />;
  };

  const filterData = data => {
    let filterData = data;

    if (selectedItem === 'Paid' && data?.length > 0) {
      filterData = filterData?.filter(
        obj => obj?.currentStatus === 'Paid' || obj?.currentStatus === 'PAID',
      );
    }
    if (selectedItem === 'Pending' && data?.length > 0) {
      filterData = filterData?.filter(
        obj =>
          obj?.currentStatus === 'Pending' ||
          obj?.currentStatus === 'NotPaid' ||
          obj?.currentStatus === 'NOTPAID' ||
          obj?.currentStatus === 'PENDING',
      );
    }

    filterData = HelperService.searchTextListFilter(
      filterData,
      'invoiceNo',
      text,
    );
    return filterData;
  };

  const handleDateChange = value => {
    dispatch(
      getPayoutByDate({
        startDate: HelperService.dateReadableFormat(value.selectedStartDate),
        endDate: HelperService.dateReadableFormat(value.selectedEndDate),
        groupBy: 'month',
        dealerCode: userData?.dealerCode,
        token: token,
      }),
    );
  };
  const handleDonePress = () => {
    if (text.length > 0) {
      setText('');
      Keyboard.dismiss();
    }
  };

  const renderEmptyComponent = () => (
    <View style={styles.centeredContent}>
      <Image
        source={require('../../Assets/Image/no-record-found.png')}
        style={styles.noRecordIcon}
      />
      <Text style={styles.noRecordText}>No record found</Text>
    </View>
  );
  const show = () => {
    showMessage({
      message: 'Payout data displayed is for last 6 months',
      type: 'info',
      titleStyle: {
        fontSize: heightPercentageToDP(1.8),
        fontFamily: getFontFamily('regular'),
        color: 'white',
        padding: 1,
      },
      style: {
        margin: 10,
        borderRadius: 10,

        justifyContent: 'center',
        backgroundColor: Colors.primary,
      },
    });
  };

  return (
    <View style={styles.container2}>
      <View style={styles.container}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Header
            title={
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                }}>
                <Text
                  style={{
                    fontSize: widthPercentageToDP(5),
                    fontWeight: '600',
                    color: Colors.primary,
                    fontFamily: getFontFamily('bold'),
                  }}>
                  Payout
                </Text>
                <View>
                  <TouchableOpacity
                    onPress={show}
                    style={{marginTop: 5, marginLeft: 3}}>
                    <AppIcon
                      name={icons.helpIcon}
                      size={widthPercentageToDP(6)}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            }
            container={{
              marginLeft: -10,
              width: widthPercentageToDP(80),
            }}
          />

          <TouchableOpacity
            style={{marginLeft: 12}}
            onPress={() =>
              showBar == true ? setShowBar(false) : setShowBar(true)
            }>
            <GenericIcon
              name={'search'}
              style={{
                color: Colors.secondPrimary,
                fontSize: 28,
              }}
            />
          </TouchableOpacity>

          <View style={{position: 'absolute', top: 12, right: 12}}>
            <IconDatePicker
              allowRangeSelection={true}
              maxDate={new Date()}
              minDate={new Date(1990, 1, 1)}
              onDateChange={handleDateChange}
              iconStyle={{color: Colors.secondPrimary}}
            />
          </View>
        </View>
        <FlashMessage position="top" />
        {showBar && (
          <View style={{paddingHorizontal: 5, marginBottom: 10}}>
            <SearchBar
              style={styles.searchContainer}
              placeholder={'Search by invoice no'}
              handleDonePress={handleDonePress}
              value={text}
              onChangeText={value => setText(value)}
            />
          </View>
        )}

        {getPayoutByDateLoading ? (
          <ChipSkeleton />
        ) : (
          <View style={{flexDirection: 'row', paddingHorizontal: 10}}>
            {statusData.map(item => (
              <Chip
                key={item.id}
                item={item}
                isSelected={selectedItem === item.id}
                onSelect={handleSelect}
              />
            ))}
          </View>
        )}
        <View
          style={{
            paddingHorizontal: 0,
            marginTop: 10,
            alignItems: 'center',
            flex: 1,
          }}>
          {getPayoutByDateLoading ? (
            <ScrollView style={{flex: 1, backgroundColor: 'white'}}>
              {[...Array(6)].map((_, index) => (
                <PayoutSkeleton />
              ))}
            </ScrollView>
          ) : (
            <FlatList
              data={getPayoutByDateData ? filterData(getPayoutByDateData) : []}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              onRefresh={() => fetchData()}
              refreshing={getPayoutByDateLoading}
              ListEmptyComponent={renderEmptyComponent}
              ListFooterComponent={renderFooter}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default Payout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 200,
  },
  noRecordText: {
    fontFamily: getFontFamily('bold'),
    fontSize: 15,
  },
  searchContainer: {
    flex: 1,
    height: 50,
    borderColor: Colors.border,
    marginTop: 10,
    marginHorizontal: 10,
  },
  container2: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? 0 : StatusBar.currentHeight,
    // Adjust as per your design
    // Additional styles specific to iOS
    ...Platform.select({
      ios: {
        paddingTop: heightPercentageToDP(7), // Adjust as per your design
        // Adjust as per your design
      },
    }),
  },
});
