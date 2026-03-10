import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { useDispatch, useSelector } from 'react-redux';
import { submitContractorServices } from '../../Redux/ContractorServices/services';
import { contractorSelectors } from '../../Redux/ContractorServices/contractorSlice';
import Toast from 'react-native-simple-toast';

const SelectServices = ({ navigation, route }) => {
  const dispatch = useDispatch();
  
  // Get loading state from contractor slice
  const servicesData = useSelector(contractorSelectors.getServicesData);
  const submitting = servicesData?.loading || false;
  
  // Get token from Redux as fallback
  const loginData = useSelector(state => state.loginData || {});
  const reduxToken = loginData?.accessToken || loginData?.idToken || loginData?.token;

  const [selectedServices, setSelectedServices] = useState([]);

  const serviceIcons = {
    Electrical: icons.electrical,
    Plumbing: icons.plumbing,
    Carpentry: icons.carpentry,
    HVAC: icons.hvac,
    Painting: icons.painting,
    Cleaning: icons.cleaning,
    Landscaping: icons.landscaping,
    Appliance: icons.appliances,
  };

  const availableServices = Object.keys(serviceIcons);

  const toggleService = (service) => {
    setSelectedServices(prev => {
      if (prev.includes(service)) {
        return prev.filter(s => s !== service);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleContinue = async () => {
    if (selectedServices.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one service');
      return;
    }

    // Try multiple sources for token
    const accessToken = route?.params?.accessToken ||
                       route?.params?.token ||
                       reduxToken;

    console.log('🔍 Checking token sources:');
    console.log('  - route.params.accessToken:', route?.params?.accessToken ? 'Found' : 'Not found');
    console.log('  - route.params.token:', route?.params?.token ? 'Found' : 'Not found');
    console.log('  - Redux token:', reduxToken ? 'Found' : 'Not found');

    if (!accessToken) {
      Alert.alert(
        'Authentication Error',
        'Authentication token missing. Please login again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          }
        ]
      );
      console.error('❌ No access token available from any source');
      return;
    }

    try {
      console.log('📤 Submitting services:', selectedServices);
      console.log('🔐 Using token (first 20 chars):', accessToken.substring(0, 20) + '...');

      // Submit services to API
      const result = await dispatch(
        submitContractorServices({
          services: selectedServices,
          token: accessToken,
        })
      ).unwrap();

      console.log('✅ Services submitted successfully:', result);
      Toast.show('Services registered successfully!');

      // Navigate to next screen
      navigation.navigate('UploadDocuments', {
        accessToken,
        selectedServices,
      });

    } catch (error) {
      console.error('❌ Failed to submit services:', error);
      Alert.alert(
        'Submission Failed',
        error?.toString() || 'Failed to submit services. Please try again.',
        [
          {
            text: 'Retry',
            onPress: handleContinue,
          },
          {
            text: 'Skip',
            onPress: () => {
              // Navigate anyway if user wants to skip
              navigation.navigate('UploadDocuments', {
                accessToken,
                selectedServices,
              });
            },
            style: 'cancel',
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <AppIcon name={icons.logo} size={wp(6)} />
            <Text style={styles.logoText}>DWELL PROPERTIES</Text>
          </View>
        </View>

        {/* Header */}
        <Text style={styles.heading}>Choose</Text>
        <Text style={styles.heading}>your Services</Text>
        <Text style={styles.description}>
          Please select the services you are at it's best.
        </Text>

        {/* Services Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.servicesGrid}>
            {availableServices.map((service) => (
              <TouchableOpacity
                key={service}
                style={[
                  styles.serviceCard,
                  selectedServices.includes(service) && styles.serviceCardSelected
                ]}
                onPress={() => toggleService(service)}
                activeOpacity={0.7}
                disabled={submitting}
              >
                {selectedServices.includes(service) && (
                  <View style={styles.checkBadge}>
                    <AppIcon name={icons.ok} size={wp(5)} color={Colors.red} />
                  </View>
                )}

                <AppIcon
                  name={serviceIcons[service]}
                  size={wp(20)}
                  color={selectedServices.includes(service) ? Colors.red : Colors.black}
                />
                <Text style={styles.serviceName}>{service}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (selectedServices.length === 0 || submitting) && styles.buttonDisabled
          ]}
          onPress={handleContinue}
          disabled={submitting || selectedServices.length === 0}
          activeOpacity={0.8}
        >
          {submitting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.white} size="small" />
              <Text style={styles.loadingText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {selectedServices.length > 0 && !submitting && (
          <Text style={styles.selectedCount}>
            {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(2),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: hp(4),
    marginTop: hp(5),
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
    fontSize: hp(2),
    fontFamily: getFontFamily('bold'),
    color: Colors.red,
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
    fontSize: hp(1.6),
    fontFamily: getFontFamily('regular'),
    color: '#666',
    textAlign: 'center',
    marginTop: hp(1),
    marginBottom: hp(4),
    paddingHorizontal: wp(8),
    lineHeight: hp(3),
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  serviceCard: {
    width: wp(28),
    height: hp(18),
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: hp(1),
  },
  serviceCardSelected: {
    borderColor: Colors.red,
  },
  checkBadge: {
    position: 'absolute',
    top: wp(2),
    right: wp(2),
    zIndex: 1,
  },
  serviceName: {
    fontSize: hp(2),
    fontFamily: getFontFamily('semibold'),
    color: Colors.black,
    textAlign: 'center',
    marginTop: hp(1),
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: wp(5),
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  continueButton: {
    backgroundColor: Colors.red || '#E53935',
    paddingVertical: hp(2),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  continueButtonText: {
    fontSize: hp(2.2),
    fontFamily: getFontFamily('bold'),
    color: Colors.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  loadingText: {
    fontSize: hp(2.2),
    fontFamily: getFontFamily('bold'),
    color: Colors.white,
  },
  selectedCount: {
    textAlign: 'center',
    marginTop: hp(1),
    fontSize: hp(1.8),
    fontFamily: getFontFamily('medium'),
    color: Colors.red,
  },
});

export default SelectServices;
