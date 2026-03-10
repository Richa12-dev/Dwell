import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";

const Welcome = ({ navigation }) => {
  const benefits = [
    { id: 1, text: 'Get Certified jobs near you' },
    { id: 2, text: 'Guaranteed timely payments' },
    { id: 3, text: 'Earn rewards and grow network' },
  ];

  const handleApplyNow = () => {
    console.log('Apply Now pressed');
    navigation.navigate('SelectServices');
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Image
          source={require('../../Assets/Image/Certification-cuate1.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View>
          <Text style={styles.heading}>Become a</Text>
          <Text style={styles.subHeading}>Dwell Certified Pro</Text>
          <Text style={styles.description}>
            Join our network of trusted service providers and grow your business.
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            {benefits.map((benefit) => (
              <View key={benefit.id} style={styles.benefitItem}>
                <AppIcon name={icons.ok} size={wp(6)} style={styles.checkIcon} />
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Apply Now Button */}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyNow}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#E53935', '#D32F2F']}
            style={styles.buttonGradient}
          >
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  illustrationContainer: {
    width: '100%',
    height: hp(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },

  contentContainer: {
    flex: 1,
    paddingHorizontal: wp(5),
    justifyContent: 'space-between',
    paddingBottom: hp(4),
  },

  heading: {
    fontSize: hp(3.2),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    textAlign: 'center',
    marginBottom: hp(0.5),
  },
  subHeading: {
    fontSize: hp(3.2),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  description: {
    fontSize: hp(1.9),
    fontFamily: getFontFamily('regular'),
    color: '#666',
    textAlign: 'center',
    lineHeight: hp(2.8),
    marginBottom: hp(2),
    paddingHorizontal: wp(2),
  },

  benefitsContainer: {
    width: 361,
    height: 133,
    borderRadius: 20,
    backgroundColor: '#F5F5F5', // optional
    padding: 16,
    alignSelf: 'center',
    marginBottom: hp(2),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIcon: {
    marginRight: 12,
  },
  benefitText: {
    fontSize: hp(2),
    fontFamily: getFontFamily('medium'),
    color: Colors.black,
    flex: 1,
  },

  applyButton: {
    width: 391,
    height: 56,
    borderRadius: 10,
    alignSelf: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  applyButtonText: {
    fontSize: hp(2.2),
    fontFamily: getFontFamily('bold'),
    color: Colors.white,
  },
});

export default Welcome;
