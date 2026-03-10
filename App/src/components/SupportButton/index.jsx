import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import CustomButton from '../CustomButton';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const BottomSheet = ({
  isVisible,
  onClose,
  onSubmit,
  onchangetext,
  value,
  data,
}) => {
  const [feedback, setFeedback] = useState(value);

  const handleChangeText = text => {
    setFeedback(text);
    onchangetext(text);
  };

  const handleSubmit = () => {
    onSubmit(feedback);
    setFeedback('');
    onClose();
  };
  const isLoginDisabled = () => {
    return feedback.length === 0;
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={{justifyContent: 'flex-end', margin: 0, zIndex: 999}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : ''} // Adjust behavior based on platform
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100} // Optional offset for more precise adjustment
      >
        <View style={styles.container}>
          <Text style={styles.headerText}>Write a Feedback</Text>
          <TextInput
            style={styles.input}
            value={feedback}
            onChangeText={handleChangeText}
            placeholder="Enter your feedback"
            multiline
            maxLength={250}
          />
          <Text style={styles.footer}>Max 250 Characters</Text>

          <View style={{marginTop: 20}}>
            <CustomButton
              style={{borderRadius: 50}}
              title={'Submit'}
              size={wp(4)}
              action={handleSubmit}
              disabled={isLoginDisabled()}
              color={isLoginDisabled() ? '#7B8A85' : Colors.primary}
              textColor={isLoginDisabled() ? '#a1a1a1' : Colors.white}
              align={'center'}
              loading={data}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,

    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'white',
    zIndex: 10,
  },
  headerText: {
    fontSize: 24,
    fontFamily: getFontFamily('bold'),
    color: '#004135',
    textAlign: 'left',
    marginBottom: 20,
  },
  input: {
    height: wp(30),
    borderColor: '#004135',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: wp(4),
    fontFamily: getFontFamily('medium'),
    textAlignVertical: 'top',
    zIndex: 10,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#004135',
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: getFontFamily('medium'),
  },
  footer: {
    textAlign: 'right',
    fontFamily: getFontFamily('medium'),
    top: 6,
    color: '#a1a1a1',
    fontSize: wp(4),
  },
});

export default BottomSheet;
