import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Dropdown} from 'react-native-element-dropdown';
import {TextInput} from 'react-native-paper';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {useSelector, useDispatch} from 'react-redux';
import {loginDataSelectors} from '../../Redux/Login/loginSlice';
import {addQuery} from '../../Redux/Queries/queriesSlice';
import {Colors} from '../../Theme';
import CustomButton from '../../components/CustomButton';
import Header from '../../components/Header';
import {getFontFamily} from '../../utils';
import CollectionNavBar from '../../components/CollectionNavBar/CollectionNavBar';

export default function Query({navigation}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [querySubject, setQuerySubject] = useState('');
  const [queryText2, setQueryText2] = useState('');
  const [onFocus, setOnFocus] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [dropDownFocused, setDropDownFocused] = useState(false);
  const [mobileNumberFocused, setMobileNumberFocused] = useState(false);

  const dispatch = useDispatch();
  
  // Get user data
  const {
    userData,
    token,
    changeProduct,
  } = useSelector(loginDataSelectors.getData);

  // Add check for queries state with fallback
  const queriesState = useSelector(state => {
    console.log('Current Redux state:', state);
    return state?.queries || { queries: [], tickets: [] };
  });

  const [dropdownData] = useState([
   { value: '1', label: 'Tenant Support' },
  { value: '2', label: 'Landlord Support' },
  { value: '3', label: 'Property Management' },
  { value: '4', label: 'Payments & Payouts' },
  { value: '5', label: 'Other Queries' },
  ]);

  const handleDropdownChange = item => {
    setSelectedProduct(item);
  };

  const handleButtonPress = () => {
    try {
      console.log('About to dispatch addQuery');
      console.log('Selected product:', selectedProduct);
      console.log('User data:', userData);
      console.log('Queries state before dispatch:', queriesState);

      // Validate required fields
      if (!selectedProduct || !selectedProduct.label) {
        console.error('Selected product is invalid');
        return;
      }

      if (!querySubject.trim() || !queryText2.trim()) {
        console.error('Query subject or description is empty');
        return;
      }

      const queryData = {
        selectedProduct,
        querySubject,
        queryText2,
        tenantName: userData?.email || 'Unknown Tenant',
        tenantId: userData?.tenantId || `tenant-${Date.now()}`,
      };

      console.log('Dispatching with data:', queryData);

      // Dispatch the new query to Redux store
      dispatch(addQuery(queryData));

      setModalMessage(
        'Query Submitted Successfully to L1 ! \n If your query is not resolved within 4 working days, you can escalate to L2'
      );
      setModalVisible(true);
    } catch (error) {
      console.error('Error in handleButtonPress:', error);
    }
  };

  const isLoginDisabled = () => {
    return (
      !selectedProduct ||
      !selectedProduct.label ||
      querySubject.trim() === '' ||
      queryText2.trim() === ''
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    // Clear the form
    setSelectedProduct(null);
    setQuerySubject('');
    setQueryText2('');
    navigation.navigate('BottomFotter', {screen: 'Menu'});
  };

  const handlesetMobileNumberFocus = () => {
    setMobileNumberFocused(true);
  };

  const handlesetMobileNumberBlur = () => {
    setMobileNumberFocused(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container2}
      behavior={Platform.OS === 'ios' ? 'padding' : ''}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100}
    >
        <CollectionNavBar />
      <View style={{flex: 1, backgroundColor: 'white'}}>
        <Header title="Raise a Query" style={{backgroundColor: 'red'}} />
        <ScrollView>
          <View style={styles.subHeader}>
            <Text style={styles.textSubHeader}>
              Please complete the form below to raise your concern or suggestion
            </Text>
            <View>
              {selectedProduct && (
                <Text style={styles.dropdownLabel}>
                  Select type of query
                  {dropDownFocused ? null : <Text style={{color: 'red'}}> </Text>}
                </Text>
              )}
              <Dropdown
                style={[styles.dropdown, styles.dropdownBorder]}
                selectedTextStyle={styles.selectedTextStyle}
                placeholderStyle={styles.placeholderStyle}
                imageStyle={styles.imageStyle}
                iconStyle={styles.iconStyle}
                maxHeight={200}
                containerStyle={{
                  borderWidth: 1,
                  color: '#174135',
                  borderColor: 'black',
                  marginTop: -4,
                  borderBottomLeftRadius: 7,
                  borderBottomRightRadius: 7,
                }}
                value={selectedProduct}
                fontFamily={getFontFamily('medium')}
                itemTextStyle={{color: '#174035', fontSize: 16}}
                data={dropdownData}
                valueField="value"
                labelField="label"
                placeholder={
                  <Text style={styles.titleStyledropdown}>
                    Select type of query
                    {dropDownFocused ? null : <Text style={{color: 'red'}}></Text>}
                  </Text>
                }
                searchPlaceholder="Search..."
                onChange={handleDropdownChange}
                renderItem={(item, selected) => (
                  <View
                    style={[
                      styles.dropdownOption,
                      selected && styles.dropdownOptionSelected,
                    ]}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        selected && styles.dropdownOptionTextSelected,
                      ]}>
                      {item.label}
                    </Text>
                  </View>
                )}
              />
            </View>
          </View>
          <View style={{paddingHorizontal: 20}}>
            <TextInput
              style={[styles.input, styles.dropdownBorder]}
              onChangeText={text => setQuerySubject(text)}
              mode="outlined"
              value={querySubject}
              onFocus={handlesetMobileNumberFocus}
              onBlur={handlesetMobileNumberBlur}
              label={
                <Text
                  style={{
                    color:
                      mobileNumberFocused || querySubject
                        ? Colors.black
                        : '#a1a1a1',
                    fontFamily: getFontFamily('medium'),
                  }}
                >
                  Query Subject
                  <Text style={{color: 'red'}}></Text>
                </Text>
              }
              outlineStyle={{borderColor: Colors.primary}}
              theme={{colors: {primary: '#1b4339', underlineColor: '#1b4339'}}}
              maxLength={30}
              contentStyle={styles.inputTextStyles}
              multiline={true}
            />
            <Text style={styles.helloText}>Max 30 Characters</Text>
            <View>
              {queryText2 || onFocus ? null : (
                <Text
                  style={{
                    ...styles.titleStyle,
                    textAlign: 'left',
                    position: 'absolute',
                    top: 32,
                    left: 15,
                    zIndex: 10,
                    fontSize: 16,
                    color: 'grey',
                  }}
                >
                  Enter your concern or suggestion
                </Text>
              )}
              <TextInput
                style={[styles.input, styles.dropdownBorder, {height: 150}]}
                onChangeText={text => setQueryText2(text)}
                mode="outlined"
                label={
                  onFocus ? (
                    <Text style={{...styles.titleStyle}}>
                      Enter your concern or suggestion
                    </Text>
                  ) : (
                    ''
                  )
                }
                value={queryText2}
                onFocus={() => setOnFocus(true)}
                onBlur={() => setOnFocus(false)}
                outlineStyle={{borderColor: Colors.primary}}
                contentStyle={styles.inputTextStyle}
                theme={{colors: {primary: '#1b4339', underlineColor: '#1b4339'}}}
                maxLength={250}
                multiline={true}
              />
              <Text style={styles.helloText}>Max 250 Characters</Text>
            </View>
          </View>
          <View style={{height: hp(30)}} />
        </ScrollView>
        <View style={styles.buttonContainer}>
          <CustomButton
            style={{borderRadius: 50}}
            title={' Escalate to Level 1'}
            size={18}
            action={handleButtonPress}
            disabled={isLoginDisabled()}
            color={isLoginDisabled() ? '#7B8A85' : Colors.primary}
            textColor={isLoginDisabled() ? '#a1a1a1' : Colors.white}
            align={'center'}
          />
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <TouchableOpacity
            style={styles.centeredView}
            activeOpacity={1}
            onPressOut={() => setModalVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalView}>
                <Text style={styles.modalText}>{modalMessage}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeModal}
                >
                  <Text style={styles.closeButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

// Keep all your existing styles
const styles = StyleSheet.create({
  contentContainer: {},
  subHeader: {
    padding: 20,
  },
  textSubHeader: {
    fontSize: wp('4%'),
    color: '#174035',
    fontFamily: getFontFamily('medium'),
    bottom: 10,
  },
  titleStyledropdown: {
    color: 'grey',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#174135',
    borderRadius: 5,
    marginTop: 10,
    paddingHorizontal: 20,
    height: 60,
    marginBottom: -18,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: getFontFamily('bold'),
    marginLeft: 10,
  },
  placeholderStyle: {
    color: Colors.primary,
  },
  dropdownOption: {
    padding: 10,
    backgroundColor: 'white',
    borderBottomColor: '#eee',
  },
  helloText: {
    marginTop: 4,
    fontSize: wp('4%'),
    color: '#a8a8a8',
    textAlign: 'right',
    fontFamily: getFontFamily('medium'),
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  buttonCheck: {
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  button: {
    width: '100%',
    height: 55,
    marginBottom: 10,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: getFontFamily('bold'),
  },
  buttonText: {
    fontSize: 18,
    color: '#EDFFE8]',
    fontFamily: getFontFamily('medium'),
  },
  dropdownBorder: {
    borderColor: Colors.primary,
  },
  selectedTextStyle: {
    color: Colors.primary,
    fontSize: 16,
  },
  input: {
    marginTop: 10,
    borderColor: '#1b4339',
    backgroundColor: 'white',
  },
  inputTextStyle: {
    fontFamily: getFontFamily('medium'),
    lineHeight: 16,
    color: Colors.primary,
  },
  inputTextStyles: {
    fontFamily: getFontFamily('medium'),
    color: Colors.primary,
  },
  titleStyle: {
    fontFamily: getFontFamily('medium'),
    textAlign: 'center',
    color: Colors.primary,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    height: hp(35),
    width: wp(80),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: getFontFamily('medium'),
    color: Colors.black,

  },
  closeButton: {
    marginTop: 10,
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 50,
    backgroundColor: Colors.red,
    position: 'absolute',
    bottom: 30,
  },
  closeButtonText: {
    color: 'white',
    fontFamily: getFontFamily('medium'),
    fontSize: 16,
  },
  dropdownLabel: {
    fontFamily: getFontFamily('medium'),
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'white',
    fontSize: 12.5,
    top: 2,
    left: 10,
    color: Colors.primary,
    paddingHorizontal: 5,
  },
  container2: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingTop: Platform.OS === 'android' ? 0 : StatusBar.currentHeight,
    ...Platform.select({
      ios: {
        paddingTop: hp(7),
      },
    }),
  },
});