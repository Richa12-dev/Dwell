import GenericIcon from './GenericIcon';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';
import {Colors} from '../Theme';
import {getFontFamily} from '../utils';


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
          selectedEndDate:
            selectedEndDate.unix() * 1000 + 5.5 * 60 * 60 * 1000,
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
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    let date = dateObj.getDate();
    let month = dateObj.getMonth();
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
  }

  render() {
    const {selectedStartDate, selectedEndDate} = this.state;

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
        show={true}
      />
    );
    if (children) {
      toggleNode = children;
    }

    return (
      <View style={{height: hp(6), backgroundColor: 'transparent'}}>
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
                    selectedStartDate={selectedStartDate}
                    selectedEndDate={selectedEndDate}
                    monthTitleStyle={Style.headerTextstyle}
                    yearTitleStyle={Style.headerTextstyle}
                    previousTitleStyle={Style.headerTextstyle}
                    nextTitleStyle={Style.headerTextstyle}
                    onDateChange={this.onDateChange}
                    minDate={minDate ? moment(minDate) : ''}
                    maxDate={maxDate ? moment(maxDate) : ''}
                    textStyle={{
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
  allowRangeSelection: PropTypes.bool,
  selectedStartDate: PropTypes.number,
  selectedEndDate: PropTypes.number,
  styles: PropTypes.object,
  onDateChange: PropTypes.func,
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
    backgroundColor: 'rgba(255,255,255,1)',
    borderRadius: 5,
    elevation: 10,
    alignItems: 'center',
    width: '100%',
    paddingBottom: 20,
  },
  action: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 60,
    marginRight: 60,
    marginTop: 30,
    fontSize: 17,
    fontFamily: getFontFamily('medium'),
    color: Colors.primary,
  },
  button: {
    width: 120,
  },
  icon: {},
  iconActive: {},
  toggleButton: {
    elevation: 0,
    borderWidth: 0,
  },
  headerTextstyle: {
    fontSize: 15,
    fontFamily: getFontFamily('medium'),
    color: Colors.primary,
  },
});
