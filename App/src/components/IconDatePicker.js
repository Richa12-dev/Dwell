import GenericIcon from './GenericIcon';
// import {HelperService} from '../commonFunction/HelperService';
// import { ApplicationStyles, Colors } from 'App/Theme';
import moment from 'moment';
import {Text} from 'native-base';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Modal, StyleSheet, TouchableOpacity, View} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';
import {Colors} from '../Theme';
import {getFontFamily} from '../utils';

//HOW TO CALL THIS COMPONENT:
//<DatePicker
//   allowRangeSelection={true}
//   selectedStartDate={(new Date()).getTime()}
//   selectedEndDate={(new Date()).getTime()}
//   onDateChange={(params) => console.log(params)}
// />

export default class IconDatePicker extends Component {
  constructor(props) {
    super(props);
    const {selectedStartDate, selectedEndDate, value} = props;
    this.state = {
      selectedStartDate: selectedStartDate ? moment(selectedStartDate) : null,
      selectedEndDate: selectedEndDate ? moment(selectedEndDate) : null,
      openCalender: false,
    };

    this.onDateChange = this.onDateChange.bind(this);
  }

  onDateChange(date, type) {
    if (type === 'END_DATE') {
      this.setState({
        selectedEndDate: date,
      });
    } else {
      this.setState({
        selectedStartDate: date,
        selectedEndDate: null,
      });
    }
  }

  toggleCalender() {
    this.setState({
      openCalender: !this.state.openCalender,
    });
  }

  closePicker() {
    const {selectedStartDate, selectedEndDate} = this.props;

    this.setState({
      selectedStartDate: selectedStartDate ? moment(selectedStartDate) : null,
      selectedEndDate: selectedEndDate ? moment(selectedEndDate) : null,
      openCalender: false,
    });
  }

  onSubmit() {
    const {iconStyle, allowRangeSelection, onDateChange} = this.props;

    const {selectedStartDate, selectedEndDate} = this.state;

    if (allowRangeSelection) {
      if (selectedStartDate && selectedEndDate) {
        onDateChange({
          selectedStartDate:
            selectedStartDate.unix() * 1000 + 5.5 * 60 * 60 * 1000,
          selectedEndDate: selectedEndDate.unix() * 1000 + 5.5 * 60 * 60 * 1000,
        });
        this.toggleCalender();
      } else {
        alert('Please Select valid Start and End Dates.');
      }
    } else {
      if (selectedStartDate) {
        onDateChange(
          this.dateReadableFormat2(
            selectedStartDate.unix() * 1000 + 5.5 * 60 * 60 * 1000,
          ),
        );
        this.toggleCalender();
      } else {
        alert('Please valid Date.');
      }
    }
  }

  dateReadableFormat2(timestamp) {
    console.log(timestamp);
    let dateObj = timestamp ? new Date(timestamp) : new Date();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // let dateObj = new Date(timestamp);
    let date = dateObj.getDate();
    let month = dateObj.getMonth();
    console.log(month, 'hhh');
    let year = dateObj.getFullYear();
    date = date < 10 ? '0' + date : date;

    return `${date}-${monthNames[month]}-${year}`;
  }

  dateReadableFormatWithHyphen(timestamp) {
    let dateObj = timestamp ? new Date(timestamp) : new Date();
    let date = dateObj.getDate();
    let month = dateObj.getMonth() + 1;
    let year = dateObj.getFullYear();
    date = date < 10 ? '0' + date : date;
    month = month < 10 ? '0' + month : month;
    return `${date}-${month}-${year}`;

    // return `${year}-${month}-${date}`;
  }

  render() {
    const {selectedStartDate, selectedEndDate} = this.state;
    // console.log('selectedStartDate', selectedStartDate);

    const {iconStyle, allowRangeSelection, children, minDate, label, maxDate} =
      this.props;

    const startDate = selectedStartDate
      ? this.dateReadableFormat2(selectedStartDate)
      : '';
    const endDate = selectedEndDate ? selectedEndDate.toString() : '';
    let toggleNode = (
      <GenericIcon
        name={'calendar-month-outline'}
        style={{
          ...Style.icon,
          ...Style.iconActive,
          ...iconStyle,

          fontSize: hp(3),
        }}
        // style={{...Style.icon, ...Style.iconActive, ...iconStyle}}
        show={true}
      />
    );
    if (children) {
      toggleNode = children;
    }
    return (
      <View style={{height: hp(6), backgroundColor: 'transparent'}}>
        {/*  */}
        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'center',
            justifyContent: 'space-between',
            alignItems: 'center',

            borderRadius: 6,
            borderWidth: 1,
            borderColor: 'transparent',
          }}>
          <TouchableOpacity
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
            transparent
            onPress={() => this.toggleCalender()}>
            {toggleNode}
          </TouchableOpacity>
          {this.state.openCalender ? (
            <Modal
              animationType={'fade'}
              transparent={false}
              visible={this.state.openCalender}>
              <View style={Style.container}>
                <View style={Style.calenderContainer}>
                  <CalendarPicker
                    startFromMonday={true}
                    allowRangeSelection={allowRangeSelection}
                    todayBackgroundColor={Colors.primary}
                    selectedDayTextColor={'white'}
                    // selectedDayColor={Colors.button}
                    selectedStartDate={selectedStartDate}
                    selectedEndDate={selectedEndDate}
                    monthTitleStyle={Style.headerTextstyle}
                    yearTitleStyle={Style.headerTextstyle}
                    previousTitleStyle={Style.headerTextstyle}
                    nextTitleStyle={Style.headerTextstyle}
                    // selectedDayTextColor={Colors.white}
                    onDateChange={this.onDateChange}
                    minDate={minDate ? moment(minDate) : ''}
                    maxDate={maxDate ? moment(maxDate) : ''}
                    textStyle={{
                      // fontFamily: ApplicationStyles.textFont,
                      fontSize: 13,
                      fontFamily: getFontFamily('medium'),
                    }}
                  />
                  <View style={Style.action}>
                    <Text
                      style={Style.actionText}
                      onPress={() => this.closePicker()}>
                      {'CANCEL'}
                    </Text>
                    <Text
                      style={Style.actionText}
                      onPress={() => this.onSubmit()}>
                      {'DONE'}
                    </Text>
                  </View>
                </View>
              </View>
            </Modal>
          ) : (
            []
          )}
        </View>
      </View>
    );
  }
}

IconDatePicker.propTypes = {
  allowRangeSelection: PropTypes.bool, //flag to allow range selection or not
  selectedStartDate: PropTypes.number, //unix timestamp in milliseconds
  selectedEndDate: PropTypes.number, //unix timestamp in milliseconds
  styles: PropTypes.object, //custom styles for icon
  onDateChange: PropTypes.func, //custom styles for icon
};
const Style = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 2,
    width: '100%',
    height: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(23,65,53,.8)',
  },
  calenderContainer: {
    // flex: 0.5,
    backgroundColor: 'rgba(255,255,255,1)',
    borderRadius: 5,
    elevation: 10,

    alignItems: 'center',
    width: '100%',
    paddingBottom: 20,

    // marginHorizontal:'5%'
  },
  action: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionText: {
    // fontFamily: ApplicationStyles.textMsgFont,
    marginLeft: 60,
    marginRight: 60,
    marginTop: 30,
    fontSize: 17,
    fontFamily: getFontFamily('medium'),
    color: Colors.primary,
    // color: Colors.button,
  },
  button: {
    // ...Metrics.smallBottomMargin,
    width: 120,
  },
  icon: {
    // color: Colors.button,
    // color: 'black',
  },
  iconActive: {
    // color: 'black',
  },
  toggleButton: {
    // backgroundColor: Colors.button,
    elevation: 0,
    borderWidth: 0,
  },
  headerTextstyle: {
    fontSize: 15,
    fontFamily: getFontFamily('medium'),
    color: Colors.primary,
  },
});
