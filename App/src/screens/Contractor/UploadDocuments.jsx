import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  ScrollView,
  ImageBackground,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import Toast from 'react-native-simple-toast';

const UploadDocuments = ({ navigation, route }) => {
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const accessToken = route?.params?.accessToken;
  const selectedServices = route?.params?.selectedServices || [];

  const handleFileUpload = async (type) => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      if (result[0]) {
        type === 'insurance'
          ? setInsuranceFile(result[0])
          : setLicenseFile(result[0]);

        Toast.show(`${type === 'insurance' ? 'Insurance' : 'License'} uploaded`);
      }
    } catch (err) {
      console.log('DocumentPicker Error:', err);
    }
  };

  const handleSubmit = () => {
    // Add your submit logic here
    console.log('Submitting documents...');
      navigation.navigate('CongratuationScreen')
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />

      {/* Background Image - Positioned absolutely */}
   
              <ImageBackground
            source={require('../../Assets/Image/uploadImage.png')}
            style={styles.backgroundImage}
            imageStyle={styles.imageStyle}
             resizeMode="contain" >

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <AppIcon name={icons.logo} size={wp(5.5)} />
            <Text style={styles.logoText}>DWELL PROPERTIES</Text>
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Upload</Text>
        <Text style={styles.heading}>your Credentials</Text>

        <Text style={styles.description}>
          Please provide your Professional Insurance & License Documents
        </Text>

        {/* Cards Container */}
        <View style={styles.cardContainer}>
          
          {/* Professional Insurance Card */}
          <View style={styles.docCard}>
            <View style={styles.docHeader}>
              <AppIcon name={icons.insurence} size={wp(6)} />
              <View style={styles.docTextContainer}>
                <Text style={styles.docTitle}>Professional Insurance</Text>
                <Text style={styles.docSubtitle}>
                  Upload proof of liability insurance (PDF or image format)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                insuranceFile && styles.uploadButtonSelected
              ]}
              onPress={() => handleFileUpload('insurance')}
            >
              <AppIcon
                name={insuranceFile ? icons.ok : icons.download}
                size={wp(4)}
                color={insuranceFile ? Colors.red : '#666'}
              />
              <Text
                style={[
                  styles.uploadButtonText,
                  insuranceFile && styles.uploadButtonTextSelected
                ]}
                numberOfLines={1}
              >
                {insuranceFile ? insuranceFile.name : 'Choose file'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Professional License Card */}
          <View style={styles.docCard}>
            <View style={styles.docHeader}>
              <AppIcon name={icons.insurence} size={wp(6)} />
              <View style={styles.docTextContainer}>
                <Text style={styles.docTitle}>Professional License</Text>
                <Text style={styles.docSubtitle}>
                  Upload your contractor's license (PDF or image format)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                licenseFile && styles.uploadButtonSelected
              ]}
              onPress={() => handleFileUpload('license')}
            >
              <AppIcon
                name={licenseFile ? icons.ok : icons.download}
                size={wp(4)}
                color={licenseFile ? Colors.red : '#666'}
              />
              <Text
                style={[
                  styles.uploadButtonText,
                  licenseFile && styles.uploadButtonTextSelected
                ]}
                numberOfLines={1}
              >
                {licenseFile ? licenseFile.name : 'Choose file'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && (
              <AppIcon name={icons.ok} size={wp(4)} color={Colors.white} />
            )}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the Dwell Service Standards (SLA) and commit to maintaining
            professional quality and timely communication with clients
          </Text>
        </TouchableOpacity>

        {/* Spacer for bottom button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Button - Fixed at bottom */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!insuranceFile || !licenseFile || !agreedToTerms) && styles.buttonDisabled
          ]}
         // disabled={!insuranceFile || !licenseFile || !agreedToTerms || loading}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit for Review</Text>
          )}
        </TouchableOpacity>
        
      </View>
                      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  
backgroundImage: {
    flex: 1,
    width: wp(100),
    height: hp(100),
},

imageStyle: {
    width: wp(100),
    height: hp(60),
    top: hp(25),
    left: wp(5),
    opacity: 0.5,
},


  scrollContent: {
    paddingBottom: hp(12),
  },

  logoContainer: {
    alignItems: 'center',
    marginTop: hp(5),
    marginBottom: hp(1),
    zIndex: 1,
  },

  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: wp(18),
    paddingVertical: hp(1.5),
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.red,
    gap: wp(4),
  },

  logoText: {
    fontFamily: getFontFamily('bold'),
    fontSize: hp(1.8),
    color: Colors.red,
    letterSpacing: 0.5,
  },

  heading: {
    fontSize: hp(3.5),
    fontFamily: getFontFamily('semibold'),
    color: Colors.black,
    textAlign: 'center',
    lineHeight: hp(5),
  letterSpacing: 0,
    },

  description: {
    textAlign: 'center',
    paddingHorizontal: wp(10),
    fontFamily: getFontFamily('regular'),
    color: '#666',
    fontSize: hp(1.85),
    marginTop: hp(1.5),
    lineHeight: hp(2.5),
    zIndex: 1,
  },

  cardContainer: {
    marginTop: hp(3),
    alignItems: 'center',
    gap: hp(2),
    paddingHorizontal: wp(6),
    zIndex: 1,
  },

  docCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // More opaque to stand out
    padding: wp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  docHeader: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(2),
    alignItems: 'flex-start',
  },

  docTextContainer: {
    flex: 1,
  },

  docTitle: {
    fontFamily: getFontFamily('bold'),
    fontSize: hp(2),
    color: '#000',
    marginBottom: hp(0.5),
  },

  docSubtitle: {
    fontFamily: getFontFamily('regular'),
    fontSize: hp(1.6),
    color: '#666',
    lineHeight: hp(2.2),
  },

  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CCC',
    borderRadius: 8,
    paddingVertical: hp(1.6),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },

  uploadButtonSelected: {
    backgroundColor: '#FFF5F5',
    borderColor: Colors.red,
    borderStyle: 'solid',
  },

  uploadButtonText: {
    fontFamily: getFontFamily('medium'),
    color: '#666',
    fontSize: hp(1.8),
    maxWidth: '70%',
  },

  uploadButtonTextSelected: {
    color: Colors.red,
  },

  checkboxContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(8),
    marginTop: hp(3),
    gap: wp(3),
    alignItems: 'flex-start',
    zIndex: 1,
  },

  checkbox: {
    width: wp(5.5),
    height: wp(5.5),
    borderWidth: 2,
    borderColor: '#CCC',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(0.2),
  },

  checkboxChecked: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },

  checkboxText: {
    flex: 1,
    fontFamily: getFontFamily('regular'),
    color: '#444',
    fontSize: hp(1.7),
    lineHeight: hp(2.3),
  },

  bottomSpacer: {
    height: hp(2),
  },

  bottomArea: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    zIndex: 2,
  },

  submitButton: {
    backgroundColor: Colors.red,
    paddingVertical: hp(1.8),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    backgroundColor: '#CCC',
  },

  submitText: {
    textAlign: 'center',
    color: '#fff',
    fontFamily: getFontFamily('bold'),
    fontSize: hp(2),
  },
});

export default UploadDocuments;
