import moment from 'moment';
import { showMessage } from 'react-native-flash-message';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  ToastAndroid,
} from 'react-native';
import LocationServicesDialogBox from 'react-native-android-location-services-dialog-box';
import fileExt from 'file-extension';
import base64 from 'react-native-base64';
import RNFS from 'react-native-fs';
import Geolocation from 'react-native-geolocation-service';
import { v1 as uuidv1 } from 'uuid';

var monthMapping = [
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
var monthMapping1 = [
  'January',
  'Febuary',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
function findDayMessage() {
  var data = [
      [0, 4, 'Night'],
      [5, 12, 'Morning'],
      [13, 17, 'Afternoon'],
      [18, 24, 'Night'],
    ],
    hr = new Date().getHours();

  for (var i = 0; i < data.length; i++) {
    if (hr >= data[i][0] && hr <= data[i][1]) {
      return data[i][2];
    }
  }
}

const removeDuplicateData = data => {
  let mapping = {};
  data.map(obj => {
    if (obj.id != null) {
      if (!mapping[obj.id]) {
        mapping[obj.id] = obj;
      }
    }
  });

  let result = [];

  Object.keys(mapping).map(key => {
    result.push(mapping[key]);
  });

  return result;
};

// ✅ MIGRATED: native-base Toast → react-native-flash-message
// Make sure <FlashMessage /> is mounted once at the root of your app (in App.jsx)
// import FlashMessage from 'react-native-flash-message';
// Add <FlashMessage position="top" /> just before the closing </NativeBaseProvider> or root View
function showToast({
  message = '',
  duration = 1500,
  position = 'top',
}) {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravity(
      message,
      ToastAndroid.SHORT,
      ToastAndroid.TOP,
    );
  } else {
    showMessage({
      message,
      duration,
      position,
      type: 'default',
    });
  }
}

function isToday(timestamp) {
  var today = new Date();
  var dateParameter = new Date(timestamp);
  return (
    dateParameter.getDate() === today.getDate() &&
    dateParameter.getMonth() === today.getMonth() &&
    dateParameter.getFullYear() === today.getFullYear()
  );
}

function removeArrFromList(arr, toRemove) {
  let myArray = arr;
  for (let i = myArray.length - 1; i >= 0; i--) {
    for (let j = 0; j < toRemove.length; j++) {
      if (myArray[i] && myArray[i].id === toRemove[j].id) {
        myArray.splice(i, 1);
      }
    }
  }
  return JSON.stringify(myArray);
}

async function openLocationDialogBox() {
  let isLocationOn = false;
  try {
    isLocationOn =
      await LocationServicesDialogBox.checkLocationServicesIsEnabled({
        message: `<h4 color=${'#D71E22B3'}>Turn On Location? </h4`,
        style: {
          backgroundColor: 'white',
        },
        ok: 'YES',
        cancel: 'NO',
        enableHighAccuracy: true,
        showDialog: true,
        openLocationServices: true,
        preventOutSideTouch: false,
        preventBackClick: false,
        providerListener: false,
      });
  } catch (error) {
    // silent
  }

  return isLocationOn;
}

async function requestLocation() {
  var geolocation;
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'App needs access to your location.',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        geolocation = await getGeolocation();
      } else {
        geolocation = 'DENIED';
      }
    } catch (error) {
      if (error.code == 2) {
        const isLocationOn = await openLocationDialogBox();
        if (!isLocationOn) {
          Alert.alert('Please turn On GPS and try again.');
          geolocation = null;
        } else {
          geolocation = await getGeolocation();
        }
      }
    }
  } else if (Platform.OS === 'ios') {
    geolocation = await getGeolocation();
  }

  return geolocation;
}

async function requestLocationPermission() {
  let Permission = false;
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Storage Permission',
          message: 'App needs access to your Location.',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        Permission = true;
      } else {
        Permission = false;
      }
    } catch (err) {
      Permission = false;
    }
  } else if (Platform.OS === 'ios') {
    Permission = true;
  }

  return Permission;
}

async function requestStoragePermission() {
  let storagePermission = false;
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message:
            'App needs access to your Storage to access and store photos.',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        storagePermission = true;
      } else {
        storagePermission = false;
      }
    } catch (err) {
      storagePermission = false;
    }
  } else if (Platform.OS === 'ios') {
    storagePermission = true;
  }

  return storagePermission;
}

function getGeolocation() {
  try {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          const location = position;
          resolve({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        },
        error => {
          if (Platform.OS === 'ios') {
            Alert.alert('Cant get Location, Make sure GPS is on.');
            reject(error);
          } else if (Platform.OS === 'android') {
            reject(error);
          }
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    });
  } catch (err) {
    reject(err);
  }
}

const callNumber = phone => {

  let phoneNumber = `tel:${phone}`;

  Linking.canOpenURL(phoneNumber)
    .then(supported => {
      if (!supported) {
        Alert.alert('Phone number is not available');
      } else {
        return Linking.openURL(phoneNumber);
      }
    })
    .catch(err => console.log(err));
};

const showDirectionInGoogleMaps = (lat, lng, searchLabel) => {
  const scheme = Platform.select({ios: 'maps:0,0?q=', android: 'geo:0,0?q='});
  const latLng = `${lat},${lng}`;
  const label = searchLabel || 'Direction';
  const url = Platform.select({
    ios: `${scheme}${label}@${latLng}`,
    android: `${scheme}${latLng}(${label})`,
  });

  Linking.openURL(url);
};

function showElapsedTime(timestamp) {
  timestamp = Number(timestamp);
  try {
    if (timestamp) {
      const since = timestamp,
        elapsed = (new Date().getTime() - since) / 1000;

      if (elapsed >= 0) {
        let hours = Math.floor((elapsed / 3600) % 24);
        let minutes = Math.floor((elapsed / 60) % 60);
        let seconds = Math.floor(elapsed % 60);

        hours = hours < 10 ? `0${hours}` : hours;
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        seconds = seconds < 10 ? `0${seconds}` : seconds;
        return `${hours} : ${minutes} : ${seconds}`;
      } else {
        return '00 : 00 : 00';
      }
    }
  } catch (error) {
    return '00 : 00 : 00';
  }
}

function convertToSearchableListFormat(params) {
  let list = params.list;
  let id_key = params.id_key;
  let label_key = params.label_key;

  if (id_key == null && label_key == null) {
    list = list.map((obj, index) => {
      return {
        id: obj,
        name: obj,
      };
    });
  } else {
    list = list.map(obj => {
      return {
        id: obj[id_key],
        name: obj[label_key],
      };
    });
  }
  return list;
}

function convertToSearchableListFormatLabel(params) {
  let list = params.list;
  let id_key = params.id_key;
  let label_key = params.label_key;

  list = list.map(obj => {
    return {
      value: obj[id_key],
      label: obj[label_key],
    };
  });

  return list;
}

function convertToSearchableListPjpFormat(params) {
  let list = params.list;
  let id_key = params.id_key;
  let label_key = params.label_key;

  list1 = [];
  list.map(obj => {
    if (obj[id_key] && obj[label_key])
      list1.push({
        id: obj[id_key],
        name: obj[label_key],
      });
  });

  return list1;
}

function getAreaName(params) {
  let allAreas = params.areas;
  let selectedId = params.id;
  let selectedAreaName = '';
  allAreas.map(area => {
    if (area.id == selectedId) {
      selectedAreaName = area.name;
    }
  });

  return selectedAreaName;
}

function getNameFromSFID(list, sfid, field = '') {
  let name = '';
  if (sfid) {
    if (field !== '') {
      list.map(item => {
        if (item.sfid == sfid) {
          name = item[field];
        }
      });
    } else {
      list.map(item => {
        if (item.sfid === sfid) {
          name = item.name;
        }
      });
    }
  }
  if (name === '') {
    return 'None';
  }
  return name;
}

function getSFIDFromName(list, name, field = '') {
  let sfid = '';
  if (name) {
    if (field !== '')
      list.map(item => {
        if (item.name === name) {
          sfid = item[field];
        }
      });
    else {
      list.map(item => {
        if (item.name === name) {
          sfid = item.id;
        }
      });
    }
  }
  if (sfid === '') {
    return 'None';
  }
  return sfid;
}

function getRemovedObjArrList(list, toRemove, field) {
  let index = [];
  function findIndexInData(data, property, value) {
    for (let i = 0, l = data.length; i < l; i++) {
      if (data[i][property] === value) {
        return i;
      }
    }
    return -1;
  }

  for (let i in toRemove) {
    let value = findIndexInData(list, field, toRemove[i][field]);
    if (value !== -1) {
      index.push(value);
    }
  }

  for (let i = 0; i < index.length; i++) {
    if (i === 0) {
      list.splice(index[i], 1);
    } else {
      index[i] = index[i] - 1;
      list.splice(index[i], 1);
    }
  }

  return list;
}

function convertArrToRNPickerObj(list, field) {
  let transformList = [];
  list.map((item, id) => {
    return transformList.push({id: item.sfid || id, name: item[`${field}`]});
  });
  return transformList;
}

function getCompetitorName(params) {
  let data = params.data;
  let selectedId = params.id;
  let selectedName = '';
  data.map(obj => {
    if (obj.id == selectedId) {
      selectedName = obj.name;
    }
  });

  return selectedName;
}

function currencyValue(value) {
  if (!value) return '';
  return '$' + value;
}

function FixedcurrencyValue(value) {
  if (!value) return '';
  return '$' + value.toFixed(2);
}

function FixedDecimalValue(value) {
  if (typeof value !== 'number') return 0;
  return value.toFixed(2);
}

function calculateDiscount(value) {
  if (!value) return '';
  return '$' + value;
}

function getCurrentDate() {
  return new Date().getDate();
}

function dateReadableFormat(timestamp) {
  if (!timestamp) return '';
  let dateObj = new Date(timestamp);
  let date = dateObj.getDate();
  let month = dateObj.getMonth() + 1;
  let year = dateObj.getFullYear();
  date = date < 10 ? '0' + date : date;
  month = month < 10 ? '0' + month : month;
  return `${date}-${month}-${year}`;
}
function dateReadableFormat1(timestamp) {
  if (!timestamp) return '';
  let dateObj = new Date(timestamp);
  let date = dateObj.getDate();
  let month = dateObj.getMonth() + 1;
  let year = dateObj.getFullYear();
  date = date < 10 ? '0' + date : date;
  month = month < 10 ? '0' + month : month;
  return `${year}-${month}-${date}`;
}

function dateReadableFormatCreate(timestamp) {
  if (!timestamp) return '';
  let dateObj = new Date(timestamp);
  let date = dateObj.getDate();
  let month = dateObj.getMonth() + 1;
  let year = dateObj.getFullYear();
  date = date < 10 ? '0' + date : date;
  month = month < 10 ? '0' + month : month;
  return `${year}-${monthMapping[month]}-${date}`;
}
function dateReadableFormat2(timestamp) {
  if (!timestamp) return '';
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  let dateObj = new Date(timestamp);
  let date = dateObj.getDate();
  let month = dateObj.getMonth();
  let year = dateObj.getFullYear();
  date = date < 10 ? '0' + date : date;

  return `${date}-${monthNames[month]}-${year}`;
}

function dateReadableFormatYear(timestamp) {
  if (!timestamp) return '';
  let dateObj = new Date(timestamp);
  let year = dateObj.getFullYear();
  return `${year}`;
}

function searchTextListFilter(list, field, searchText, field2) {
  let text = searchText.toLowerCase();
  if (!text || text === '') {
    return list;
  }

  let filteredList = [];

  if (field2) {
    filteredList = list.filter(item => {
      if (item[field] && item[field][field2]) {
        return item[field][field2].toLowerCase().match(text);
      } else {
        return false;
      }
    });
  } else {
    filteredList = list.filter(item => {
      if (item[field]) {
        return item[field].toLowerCase().match(text);
      } else {
        return false;
      }
    });
  }

  if (!Array.isArray(filteredList) && !filteredList.length) {
    return [];
  }

  return filteredList;
}

function multiFieldSearchText(list, searchText) {
  searchText = String(searchText).toLowerCase();
  return list.filter(o =>
    Object.entries(o).some(entry =>
      String(entry[1]).toLowerCase().includes(searchText),
    ),
  );
}

function searchArrayListFilter(list, searchArray, field) {
  if (!searchArray) return list;

  if (!searchArray.length) return list;

  let filteredList = list.filter(item => {
    return item[field] && searchArray.indexOf(item[field]) > -1;
  });

  if (!Array.isArray(filteredList) && !filteredList.length) {
    return [];
  }

  return filteredList;
}

function searchTextListFilterForProductDetails(list, field, searchText, field2) {
  let text = searchText.toUpperCase();
  if (!text || text === '') {
    return list;
  }

  let filteredList = [];

  if (field2) {
    filteredList = list.filter(item => {
      if (item[field] && item[field][field2]) {
        return item[field][field2].toLowerCase().match(text);
      } else {
        return false;
      }
    });
  } else {
    filteredList = list.filter(item => {
      if (item[field]) {
        return item[field].toUpperCase().match(text);
      } else {
        return false;
      }
    });
  }

  if (!Array.isArray(filteredList) && !filteredList.length) {
    return [];
  }

  return filteredList;
}

function searchInList(list, value, field) {
  if (!list) return '';
  if (!list.length) return '';
  if (!value) return '';

  let filteredList = list.filter(item => {
    return item[field] == value;
  });

  if (!Array.isArray(filteredList) && !filteredList.length) {
    return [];
  }

  return filteredList[0];
}

function sortAsc(list, field) {
  let filteredList = [...list];
  filteredList.sort((a, b) => {
    const valueA = typeof a[field] === 'string' ? a[field].toLowerCase() : a[field];
    const valueB = typeof b[field] === 'string' ? b[field].toLowerCase() : b[field];
    return valueA > valueB ? 1 : valueB > valueA ? -1 : 0;
  });
  return filteredList;
}

function sortDesc(list, field) {
  let filteredList = [...list];
  filteredList.sort((a, b) => {
    const valueA = typeof a[field] === 'string' ? a[field].toLowerCase() : a[field];
    const valueB = typeof b[field] === 'string' ? b[field].toLowerCase() : b[field];
    return valueA < valueB ? 1 : valueB < valueA ? -1 : 0;
  });
  return filteredList;
}

function sortListFilter(list, field, sortType) {
  let filteredList = list;

  if (!filteredList.length) {
    return [];
  }

  if (!field || !sortType) {
    return filteredList;
  }

  filteredList =
    sortType == 'ASC'
      ? sortAsc(filteredList, field)
      : sortDesc(filteredList, field);
  return filteredList;
}

const decorateWithLocalId = payload => ({
  local_id: uuidv1(),
  ...payload,
});

function getCurrentTimestamp() {
  return new Date().getTime();
}

function getPlanvisitSelectedday() {
  let timestamp = new Date().getTime();
  return timestamp + 1 * 24 * 60 * 60 * 1000;
}

function convertStringToDate(timestring) {
  return moment(timestring).unix() * 1000;
}

function convertDateToString(timestamp) {
  return new Date(timestamp).toDateString();
}

function getPreviousNDayTimestamp(days, timestamp) {
  if (!timestamp) {
    timestamp = getCurrentTimestamp();
  }
  return timestamp - days * 24 * 60 * 60 * 1000;
}

function getNextNDayTimestamp(days, timestamp) {
  if (!timestamp) {
    timestamp = getCurrentTimestamp();
  }
  return timestamp + days * 24 * 60 * 60 * 1000;
}

function getPrevious7DayTimestamp() {
  return getCurrentTimestamp() - 7 * 24 * 60 * 60 * 1000;
}

function getNext7DayTimestamp() {
  return getCurrentTimestamp() + 7 * 24 * 60 * 60 * 1000;
}

function removeField(obj, fieldName) {
  delete obj[fieldName];
  return obj;
}

function interChangeValue(obj, fieldName, value) {
  obj[fieldName] = value;
  return obj;
}

function getMonthMappingName(index) {
  return monthMapping[index];
}

function getMonthMappingNameFull(index) {
  return monthMapping1[index];
}

function getMonthName(date) {
  let dateObj = new Date();
  if (date) {
    dateObj = new Date(date);
  }
  return monthMapping[dateObj.getMonth()];
}

function getPreviousMonth(month) {
  let currentMonth = month;
  if (currentMonth == 0) {
    currentMonth = monthMapping.length - 1;
  } else {
    currentMonth = currentMonth - 1;
  }
  return currentMonth;
}

function getNextMonth(month) {
  if (typeof month === 'string' || month instanceof String) {
    month = parseInt(month);
  }
  let currentMonth = month;
  if (currentMonth == 11) {
    currentMonth = 0;
  } else {
    currentMonth = currentMonth + 1;
  }
  return currentMonth;
}

function findMatchingKeyValueInList(list, matchingKey, matchingValue, matchingValueKey) {
  let result = [];
  result = list.filter(obj => obj[matchingKey] == matchingValue);

  if (result && result[0]) {
    return result[0][matchingValueKey];
  }
  return '';
}

function getMonthStartAndEndDateTimestamp(
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
) {
  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);
  return [firstDay.getTime(), lastDay.getTime()];
}

function getFirstName(name) {
  return name.split(' ').slice(0, 1).join(' ');
}

function getLastName(name) {
  return name.split(' ').slice(1).join(' ');
}

function showAlert({heading, message, onSuccess}) {
  return new Promise((resolve, reject) => {
    Alert.alert(
      heading,
      message,
      [
        {
          text: 'Cancel',
          onPress: () => reject('canceled'),
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: onSuccess ? onSuccess : () => resolve('confirmed'),
        },
      ],
      {cancelable: false},
    );
  });
}

const datesAreOnSameDay = (first, second) => {
  first = new Date(Number(first));
  second = new Date(Number(second));
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

const datesAreOnRangeLess = (first, second) => {
  first = new Date(Number(first));
  second = new Date(Number(second));
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() <= second.getDate()
  );
};

const datesAreOnRangeMore = (first, second) => {
  first = new Date(Number(first));
  second = new Date(Number(second));
  return second.getDate() <= first.getDate();
};

const getVisitsDisplayDate = timestamp => {
  if (!timestamp) return '';
  let dateObj = new Date(timestamp);
  let date = dateObj.getDate();
  let month = dateObj.getMonth();
  date = date < 10 ? '0' + date : date;
  return isToday(timestamp)
    ? `Today (${date} ${monthMapping[month]})`
    : `(${date} ${monthMapping[month]})`;
};

const getDashboardDisplayDate = (start, end) => {
  return getDisplayDate(start) + '-' + getDisplayDate(end);
};

const getDisplayDate = timestamp => {
  if (!timestamp) return '';
  let dateObj = new Date(timestamp);
  let date = dateObj.getDate();
  let month = dateObj.getMonth();
  let year = dateObj.getFullYear();
  date = date < 10 ? '0' + date : date;
  return `${date}` + '-' + `${month}` + '-' + `${year}`;
};

const getmonthDate = timestamp => {
  if (!timestamp) return '';
  let dateObj = new Date(timestamp);
  let date = dateObj.getDate();
  let month = dateObj.getMonth();
  date = date < 10 ? '0' + date : date;
  return `${monthMapping[month]}`;
};

const getPreviousDayTimestamp = timestamp => {
  return timestamp - 1 * 24 * 60 * 60 * 1000;
};

const getNextDayTimestamp = timestamp => {
  return timestamp + 1 * 24 * 60 * 60 * 1000;
};

const convertMomentObjectToUnix = momentObj => {
  return momentObj.unix() * 1000 + 5.5 * 60 * 60 * 1000;
};

const convertMomentDateToTimestamp = date => {
  return moment(date).valueOf();
};

const getBase64DecodeValue = data => {
  if (data) {
    return base64.decode(data);
  }
  return '';
};

function dateReadableFormatWithHyphen(timestamp) {
  let dateObj = timestamp ? new Date(timestamp) : new Date();
  let date = dateObj.getDate();
  let month = dateObj.getMonth() + 1;
  let year = dateObj.getFullYear();
  date = date < 10 ? '0' + date : date;
  month = month < 10 ? '0' + month : month;
  const monthName = monthMapping[month - 1];
  const ordinalSuffix = getDaySuffix(date);
  return `${date}${ordinalSuffix} ${monthName} ${year}`;
}

function dateyear(timestamp) {
  let dateObj = timestamp ? new Date(timestamp) : new Date();
  let year = dateObj.getFullYear();
  return `${year}`;
}

function monthDateFormat(item) {
  const day = new Date(item);
  const month = monthMapping[day.getMonth()];
  const date = day.getDate();
  return `${month}'${date}`;
}

function monthDateFormat2(item) {
  const day = new Date(item);
  const month = monthMapping[day.getMonth()];
  const year = day.getFullYear().toString().substr(-2);
  const date = day.getDate();
  return `${month}'${year}`;
}

function monthDateFormat3(item) {
  const [day, month, year] = item.split('-');
  const date = new Date(`${year}-${month}-${day}`);
  const options = {month: 'short'};
  const monthName = new Intl.DateTimeFormat('en-US', options).format(date);
  const shortYear = year.slice(-2);
  return `${monthName}'${shortYear}`;
}

function removeTimestringFromDate(date) {
  if (!date) {
    return '';
  }
  date = date.split('T');
  return date[0];
}

const moveFileToAbsolutePath = (fileUrl, name) => {
  let abspath = RNFS.DocumentDirectoryPath;
  let ext = fileExt(fileUrl);
  return `${abspath}/${name}.${ext}`;
};

const removeDuplicateVisits = data => {
  let mapping = {};
  data.map(obj => {
    if (!mapping[obj.sfid]) {
      mapping[obj.sfid] = obj;
    }
  });

  let visits = [];
  Object.keys(mapping).map(key => {
    visits.push(mapping[key]);
  });

  return visits;
};

const removeDuplicateAreas = data => {
  let mapping = {};
  data.map(obj => {
    if (obj.id != null) {
      if (!mapping[obj.id]) {
        mapping[obj.id] = obj;
      }
    }
  });

  let areas = [];
  Object.keys(mapping).map(key => {
    areas.push(mapping[key]);
  });

  return areas;
};

const removeSfidNullitem = data => {
  let mapping = {};
  data.map(obj => {
    if (obj.sfid) {
      mapping[obj.sfid] = obj;
    }
  });

  let items = [];
  Object.keys(mapping).map(key => {
    items.push(mapping[key]);
  });

  return items;
};

const removeDuplicateitem = data => {
  let mapping = {};
  data.map(obj => {
    if (!mapping[obj.sfid] || !obj.sfid) {
      mapping[obj.sfid] = obj;
    }
  });

  let items = [];
  Object.keys(mapping).map(key => {
    items.push(mapping[key]);
  });

  return items;
};

function numberWithCommas(x) {
  x = Number(x);
  if (x % 1) {
    return x;
  }

  x = x.toString();
  var lastThree = x.substring(x.length - 3);
  var otherNumbers = x.substring(0, x.length - 3);
  if (otherNumbers != '') lastThree = ',' + lastThree;
  var res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return res;
}

const removeDuplicateBeat = data => {
  let mapping = {};
  data.map(obj => {
    if (!mapping[obj.id] && obj.id != null) {
      mapping[obj.id] = obj;
    }
  });

  let beats = [];
  Object.keys(mapping).map(key => {
    beats.push(mapping[key]);
  });

  return beats;
};

const removeDuplicateLabel = data => {
  let mapping = {};
  data.map(obj => {
    if (!mapping[obj.label] && obj.label != null) {
      mapping[obj.label] = obj;
    }
  });

  let beats = [];
  Object.keys(mapping).map(key => {
    beats.push(mapping[key]);
  });

  return beats;
};

const removeDuplicateProduct = data => {
  let mapping = {};
  data.map(obj => {
    if (!mapping[obj.name] && obj.id != null) {
      mapping[obj.name] = obj;
    }
  });

  let beats = [];
  Object.keys(mapping).map(key => {
    beats.push(mapping[key]);
  });

  return beats;
};

const visitTypeToAvatarTextAndBgColorMapping = {
  Retailer: { text: 'R', bgColor: '#f0aad9' },
  Dealer: { text: 'D', bgColor: '#87a0f5' },
  Sites: { text: 'L', bgColor: '#8fb870' },
  Influencer: { text: 'I', bgColor: '#b89b70' },
};

const getAvatarTextAndBgColorForVisitType = visitType => {
  return visitTypeToAvatarTextAndBgColorMapping[visitType];
};

async function requestMultipleStoragePermission() {
  let storagePermission = false;
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);

      if (
        granted['android.permission.READ_EXTERNAL_STORAGE'] &&
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted'
      ) {
        storagePermission = true;
      } else {
        storagePermission = false;
      }
    } catch (err) {
      storagePermission = false;
    }
  } else if (Platform.OS === 'ios') {
    storagePermission = true;
  }

  return storagePermission;
}

function getDateTimestamp(date) {
  return new Date(date).getTime();
}

async function requestCameraPermission() {
  let Permission = false;
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera.',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        Permission = true;
      } else {
        Permission = false;
      }
    } catch (err) {
      Permission = false;
    }
  } else if (Platform.OS === 'ios') {
    Permission = true;
  }

  return Permission;
}

function searchProductArrayListFilter(list, searchArray, field) {
  if (!searchArray) return list;
  if (!searchArray.length) return list;

  let filteredList = list.filter(item => {
    return item[field] === searchArray;
  });

  if (!Array.isArray(filteredList) && !filteredList.length) {
    return [];
  }

  return filteredList;
}

function convertArrayToSearchableListFormat(array) {
  let list = array;
  list = list.map(value => {
    return {
      id: value,
      name: value,
    };
  });

  return list;
}

function showAppUpdatePromptAndroid(latest_version) {
  Alert.alert(
    'New Version Available',
    'Please, update app to new version to continue',
    [
      {
        text: 'Update',
        onPress: () =>
          Linking.openURL(
            'https://play.google.com/store/apps/details?id=com.paragonapp1',
          ),
      },
    ],
    {cancelable: false},
  );
}

function watchLocation({callback}) {
  try {
    _watchId = Geolocation.watchPosition(
      position => {
        const {latitude, longitude} = position.coords;
        callback({latitude, longitude});
      },
      error => {
        return null;
      },
      {
        enableHighAccuracy: true,
        forceRequestLocation: true,
        distanceFilter: 100,
        interval: 180000,
      },
    );
  } catch (err) {
    reject(error);
  }
}

const getAccountType = data => {
  let mapping = {};
  data.map(obj => {
    if (!mapping[obj.account_type__c]) {
      mapping[obj.account_type__c] = obj.account_type__c;
    }
  });

  let types = [];
  Object.keys(mapping).map(key => {
    types.push(mapping[key]);
  });

  return types;
};

function applySearch(list, searchIndex, searchInputRef) {
  const data = [];
  list.map(dataItem => {
    let available = false;
    searchIndex &&
      searchIndex.map(index => {
        if (
          String(dataItem[index])
            .toLowerCase()
            .includes(searchInputRef.toLowerCase())
        )
          available = true;
      });
    if (available) data.push(dataItem);
  });

  if (searchInputRef.length === 0) {
    return list;
  } else {
    return data;
  }
}

const getVisitsType = data => {
  let mapping = {};
  data.map(obj => {
    if (obj.nature_of_visits__c != null) {
      if (!mapping[obj.nature_of_visits__c]) {
        mapping[obj.nature_of_visits__c] = obj.nature_of_visits__c;
      }
    }
  });

  let types = [];
  Object.keys(mapping).map(key => {
    types.push(mapping[key]);
  });

  return types;
};

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  return `${day}`;
}

function formatSuffix(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const suffix = getDaySuffix(day);
  return `${suffix}`;
}

function formatMonth(dateString) {
  const date = new Date(dateString);
  const month = date.toLocaleString('default', {month: 'short'});
  return `${month}`;
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatNumberWithCommas(number) {
  if (number === null) {
    return '';
  } else {
    return number.toString();
  }
}

function format2Decimals(strNumber) {
  let number = parseFloat(strNumber);
  let formattedNumber = number.toFixed(2);
  return formattedNumber;
}

function formatToINR(number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

function formatName(fullName) {
  const nameParts = fullName.trim().split(' ');
  const firstNameInitial = nameParts[0] ? nameParts[0][0].toUpperCase() : '';
  const lastNameInitial =
    nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toUpperCase() : '';
  return `${firstNameInitial}${lastNameInitial}`;
}

function calculateDayDifference(timestamp1, timestamp2) {
  let date1 = new Date(timestamp1);
  let date2 = new Date(timestamp2);
  let differenceInMilliseconds = Math.abs(date2 - date1);
  let differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);
  let days = differenceInDays + 1;
  return days;
}

function getDateMinusDays(date, days) {
  const currentDate = new Date(date);
  const pastDate = new Date(currentDate.getTime() - days * 24 * 60 * 60 * 1000);
  return pastDate;
}

const convertDate = dateString => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const [day, month, year] = dateString.split('-').map(Number);
  const monthName = months[month - 1];
  const ordinalSuffix = getDaySuffix(day);
  return `${day}${ordinalSuffix} ${monthName} ${year}`;
};

function convertArrWithId(roleNames) {
  return roleNames.map((role, index) => ({
    id: role,
    name: role,
  }));
}

function dateReadableFormatBoth(timestamp) {
  const parts = timestamp.split('-');
  if (parts.length === 3) {
    const [date, month, year] = parts;
    const monthName = monthMapping[parseInt(month, 10) - 1];
    return `${date}-${monthName}-${year}`;
  } else {
    return '';
  }
}

function calculateDateDifference2(date1String, date2String) {
  let date1 = new Date(date1String);
  let date2 = new Date(date2String);
  let differenceMilliseconds = date2.getTime() - date1.getTime();
  let differenceDays = Math.floor(differenceMilliseconds / (1000 * 60 * 60 * 24));

  if (differenceDays < 0) {
    return `0 Days`;
  }
  return `${differenceDays} Days`;
}

function removeDecimal(number) {
  return number | 0;
}

function twlFormatDate(inputDateString) {
  const parts = inputDateString.split('-');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthIndex = monthNames.findIndex(
    month => month.toLowerCase() === parts[1].toLowerCase(),
  );
  const monthNumber =
    monthIndex >= 0 ? (monthIndex + 1).toString().padStart(2, '0') : null;
  return `${parts[2]}-${monthNumber}-${parts[0]}`;
}

function calculateAge(birthdate) {
  var birthdateObj = new Date(birthdate);
  var currentDate = new Date();
  var differenceMs = currentDate - birthdateObj;
  var ageDate = new Date(differenceMs);
  var age = Math.abs(ageDate.getUTCFullYear() - 1970);
  return `${age}`;
}

function getLoanTypeMapping(loanTypes) {
  const loanTypes1 = removeDuplicates(loanTypes);
  const loanTypeMapping = {
    TWL: {id: 'TWL', name: 'Two Wheeler Loan'},
    UBL: {id: 'UBL', name: 'Unsecure Business Loan'},
    UCL: {id: 'UCL', name: 'Used Car Loan'},
    LAP: {id: 'LAP', name: 'Loan Against Property'},
    OMPL: {id: 'OMPL', name: 'Open Market Personal Loan'},
  };

  return loanTypes1
    .map(type => {
      const mapping = loanTypeMapping[type.name];
      return mapping ? {id: mapping.id, name: mapping.name} : null;
    })
    .filter(Boolean);
}

function selectObjectName(array) {
  array.sort((a, b) => a.name.localeCompare(b.name));
  let twlExists = array.some(obj => obj.name === 'TWL');
  return twlExists ? 'TWL' : array[0].name;
}

function removeDuplicates(array) {
  let uniqueNames = new Set();
  return array.filter(obj => {
    if (!uniqueNames.has(obj.name)) {
      uniqueNames.add(obj.name);
      return true;
    }
    return false;
  });
}

function payoutformatDate(dateString) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const [day, monthIndex, year] = dateString.split('-').map(Number);
  const month = months[monthIndex - 1];
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  return `${day}${suffix} ${month} ${year}`;
}

function transformDataBYLabel(data) {
  if (data?.length > 0) {
    return data.map(item => ({
      label: item.name,
      value: item?.id ? item.id : '999',
    }));
  } else {
    return [];
  }
}

const convertDateFormatYY = inputDate => {
  const parts = inputDate.split('-');
  const monthMap = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const day = parts[0];
  const monthAbbreviation = parts[1];
  const year = parts[2];
  const month = monthMap[monthAbbreviation];
  return `${year}-${month}-${day}`;
};

function convertListintoLabel(inputArray) {
  return inputArray.map(item => ({
    value: item.id,
    label: item.name,
  }));
}

function formatIndianCurrency(number) {
  if (number === null || number === undefined) {
    return '';
  }
  return new Intl.NumberFormat('en-IN').format(number);
}

export const HelperService = {
  findDayMessage,
  requestLocation,
  getGeolocation,
  openLocationDialogBox,
  isToday,
  showToast,
  showElapsedTime,
  convertToSearchableListFormat,
  decorateWithLocalId,
  getCurrentTimestamp,
  callNumber,
  getAreaName,
  currencyValue,
  FixedcurrencyValue,
  dateReadableFormat,
  getCompetitorName,
  searchTextListFilter,
  searchArrayListFilter,
  sortListFilter,
  sortAsc,
  sortDesc,
  removeField,
  showDirectionInGoogleMaps,
  datesAreOnSameDay,
  getPrevious7DayTimestamp,
  getNext7DayTimestamp,
  getVisitsDisplayDate,
  getPreviousDayTimestamp,
  getNextDayTimestamp,
  convertMomentObjectToUnix,
  getDisplayDate,
  getPreviousNDayTimestamp,
  getNextNDayTimestamp,
  requestStoragePermission,
  findMatchingKeyValueInList,
  getMonthMappingName,
  getMonthMappingNameFull,
  getNextMonth,
  getPreviousMonth,
  getDashboardDisplayDate,
  getMonthName,
  multiFieldSearchText,
  getFirstName,
  getLastName,
  getNameFromSFID,
  convertMomentDateToTimestamp,
  getMonthStartAndEndDateTimestamp,
  removeArrFromList,
  showAlert,
  convertArrToRNPickerObj,
  getRemovedObjArrList,
  getBase64DecodeValue,
  moveFileToAbsolutePath,
  convertStringToDate,
  convertDateToString,
  searchInList,
  removeDuplicateVisits,
  dateReadableFormatWithHyphen,
  removeTimestringFromDate,
  getAvatarTextAndBgColorForVisitType,
  FixedDecimalValue,
  requestMultipleStoragePermission,
  getDateTimestamp,
  requestCameraPermission,
  getSFIDFromName,
  convertArrayToSearchableListFormat,
  removeDuplicateBeat,
  removeDuplicateProduct,
  removeDuplicateitem,
  numberWithCommas,
  requestLocationPermission,
  watchLocation,
  convertToSearchableListPjpFormat,
  convertToSearchableListFormatLabel,
  removeDuplicateLabel,
  interChangeValue,
  removeSfidNullitem,
  getCurrentDate,
  getAccountType,
  datesAreOnRangeLess,
  datesAreOnRangeMore,
  getPlanvisitSelectedday,
  removeDuplicateAreas,
  removeDuplicateData,
  searchProductArrayListFilter,
  dateReadableFormatCreate,
  applySearch,
  dateyear,
  getVisitsType,
  searchTextListFilterForProductDetails,
  dateReadableFormatYear,
  getmonthDate,
  dateReadableFormat2,
  dateReadableFormat1,
  monthDateFormat,
  formatDate,
  formatSuffix,
  formatMonth,
  monthDateFormat2,
  formatToINR,
  formatName,
  monthDateFormat3,
  calculateDayDifference,
  getDateMinusDays,
  convertDate,
  convertArrWithId,
  dateReadableFormatBoth,
  calculateDateDifference2,
  removeDecimal,
  twlFormatDate,
  formatNumberWithCommas,
  calculateAge,
  getLoanTypeMapping,
  selectObjectName,
  payoutformatDate,
  transformDataBYLabel,
  convertDateFormatYY,
  format2Decimals,
  convertListintoLabel,
  formatIndianCurrency,
};
