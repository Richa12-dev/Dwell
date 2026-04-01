import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {icons} from '../../Assets';
import {loginDataSelectors} from '../../Redux/Login/loginSlice';
import {feedBackQuary, quaryList} from '../../Redux/Login/services';
import {Colors} from '../../Theme';
import {AppIcon} from '../../components/AppIcon';
import {CommonStatusCard} from '../../screens/Payout/local_molecules';
import {getFontFamily} from '../../utils';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const SupportComponent = ({data, fetchdata, onFeedbackPress, navigation}) => {
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('');
  const [isFeedbackSent, setIsFeedbackSent] = useState(false);
  const dispatch = useDispatch();

  const {
    userData,
    token,
    feedBackUrlData,
    feedBackQuaryUrlLoading,
    changeProduct,
  } = useSelector(loginDataSelectors.getData);

  const fetchData2 = () => {
    setLoading(false);
    setAssociates(null);

    dispatch(
      feedBackQuary({
        supportID: data.queryId,
        data: {
          dealerCode: userData?.dealerCode,
          productCode: changeProduct,
          feedback: type,
        },
        token,
      }),
    );
    dispatch(
      quaryList({
        dealerCode: userData?.dealerCode,
        productCode: changeProduct,
        token,
      }),
    );
  };

  const openBottomSheet = associate => {
    setSelectedItem(associate);
    setBottomSheetVisible(true);
  };

  const closeBottomSheet = () => {
    setBottomSheetVisible(false);
    setSelectedItem(null);
  };

  const handleCardPress = item => {
    const queryDetailsData = {
      selectedProduct: item.queryType,
      queryText: item.subject,
      queryText2: item.description,
      queryID: item.queryId,
      queryStatus: item.queryStatusL1,
      queryRaiseDate: item.queryRaisedTime,
      queryRaiseSecondDate: item.queryStatusTimeL2,
      queryLevel: item.queryStatusL2 ? 2 : 1,
    };
    console.log(queryDetailsData);
    navigation.navigate('QueryDeatils', {data: item});
  };

  const getStatusText = () => {
    if (data.queryStatusL2 !== null) {
      return data.queryStatusL2;
    } else if (data.queryStatusL1 !== null) {
      return data.queryStatusL1;
    }
    return 'No Status';
  };

  const feedback = getStatusText();

  const submitFeedBack = text => {
    console.log(text, 'texttexttext');
    setType(text);
  };

  return (
    <View
      style={{
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 15,
      }}>
      <TouchableOpacity
        onPress={() => handleCardPress(data)}
        style={{
          borderWidth: 0.5,
          borderColor: Colors.border,
          borderRadius: 15,
          backgroundColor: 'white',
          paddingVertical: 20,
          elevation: 5,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 16,
          }}>
          <Text style={styles.boxName}>{data.queryType}</Text>
          <CommonStatusCard
            status={feedback}
            style={{
           backgroundColor: String(feedback).includes('Closed')

                ? '#ff0000'
                : '#50ab5c',
            }}
            textStyle={{
              color: 'white',
            }}
            trainglestyle={{
              borderBottomColor: String(feedback).includes('Closed')? '#b22222' : '',
            }}
          />
        </View>
        <View style={{marginLeft: 16, flexDirection: 'row'}}>
          <Text style={styles.boxID}>{data.queryId}</Text>
          <View
            style={{
              width: 2,
              backgroundColor: Colors.primary,
              height: '50%',
              alignSelf: 'center',
            }}></View>
          <Text style={styles.levelID}>
            {data.queryStatusL2 !== null ? 'Level 2' : 'Level 1'}
          </Text>
        </View>
        <View style={{marginLeft: 16}}>
          <Text style={styles.subjectID}>{data.querySubject}</Text>
        </View>
        {(data.queryStatusL2 === 'Closed' ||
          data.queryStatusL1 === 'Closed') && (
          <TouchableOpacity
            onPress={onFeedbackPress}
            style={styles.feedbackContainer}
            disabled={data?.queryFeedback !== null ? true : false}>
            <AppIcon
              name={
                data?.queryFeedback !== null
                  ? icons.disablefeedback
                  : icons.feedback
              }
              size={wp('5%')}
            />
            <Text
              style={
                (styles.additionalText,
                {
                  color:
                    data?.queryFeedback !== null ? '#a1a1a1' : Colors.primary,
                  fontFamily: getFontFamily('medium'),
                  fontSize: wp('4.5%'),
                  marginLeft: wp('2%'),
                })
              }>
              {data?.queryFeedback !== null
                ? 'Feedback Submitted'
                : 'Give Feedback'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'white',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    marginBottom: 10,
  },
  completedBox: {},
  closedBox: {},
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 15,
  },
  boxName: {
    fontSize: wp('5%'),
    fontFamily: getFontFamily('heavy'),
    color: '#1b4339',
  },
  idLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxID: {
    fontSize: wp('4%'),
    fontFamily: getFontFamily('bold'),
    color: '#1b4339',
    marginLeft: -10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  levelID: {
    fontSize: wp('4%'),
    fontFamily: getFontFamily('bold'),
    color: '#1b4339',
    marginLeft: 10,
    paddingVertical: 5,
  },
  subjectID: {
    fontSize: wp('4%'),
    fontFamily: getFontFamily('bold'),
    color: '#174035',
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginLeft: 14,
  },
  statusWrapper: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    paddingVertical: 4,
    paddingRight: -1,
    marginRight: -20,
    zIndex: 10,
  },
  defaultLabelContainer: {
    backgroundColor: '#47EE40',
  },
  completedLabelContainer: {
    backgroundColor: '#47EE40',
  },
  closedLabelContainer: {
    backgroundColor: '#ff4747',
  },
  defaultLabelText: {
    color: '#EDFFE8',
  },
  completedLabelText: {
    color: '#EDFFE8',
  },
  closedLabelText: {
    color: 'white',
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    position: 'absolute',
    bottom: -10,
    right: -15,
    transform: [{rotate: '180deg'}],
  },
  defaultTail: {
    borderBottomColor: '#174035',
  },
  completedTail: {
    borderBottomColor: '#2b8238',
  },
  defaultTailRed: {
    borderBottomColor: 'red',
  },
  completedTailRed: {
    borderBottomColor: 'green',
  },
  closedTail: {
    borderBottomColor: '#ff4747',
  },
  statusText: {
    fontSize: 14,
    fontFamily: getFontFamily('bold'),
    color: 'black',
    backgroundColor: 'red',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  additionalText: {
    fontSize: 16,
    fontFamily: getFontFamily('bold'),
    color: '#174035',
    marginLeft: 8,
  },
});

export default SupportComponent;
