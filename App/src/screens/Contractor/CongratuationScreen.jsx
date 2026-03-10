
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { resetRoot } from '../../navigation/RouterServices';

const CongratulationsScreen = ({ navigation }) => {
  const handleGoToDashboard = () => {
    resetRoot('ContractorHome');
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" translucent barStyle="dark-content" />
      
    
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <AppIcon name={icons.logo} size={wp(6)} />
            <Text style={styles.logoText}>DWELL PROPERTIES</Text>
          </View>
        </View>

        {/* Main Content Card with Glass Effect */}
        <View style={styles.contentCard}>
          {/* Certification Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
            <AppIcon name= {icons.congragulation}   size={wp(55)}/>
              
            </View>
          </View>

          {/* Congratulations Text */}
          <Text style={styles.congratsTitle}>Congratulations!</Text>
          <Text style={styles.congratsSubtitle}>
            You are now a Dwell Certified Professional. Get Ready to grab more opportunities.
          </Text>

          {/* Benefits Section */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Benefits of Certification</Text>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <AppIcon name={icons.ok} size={wp(5)} color={Colors.primary || '#E53935'} />
                <Text style={styles.benefitText}>Access to premium project listings</Text>
              </View>

              <View style={styles.benefitItem}>
                <AppIcon name={icons.ok} size={wp(5)} color={Colors.primary || '#E53935'} />
                <Text style={styles.benefitText}>Verified badge on your profile</Text>
              </View>

              <View style={styles.benefitItem}>
                <AppIcon name={icons.ok} size={wp(5)} color={Colors.primary || '#E53935'} />
                <Text style={styles.benefitText}>Priority customer support</Text>
              </View>

              <View style={styles.benefitItem}>
                <AppIcon name={icons.ok} size={wp(5)} color={Colors.primary || '#E53935'} />
                <Text style={styles.benefitText}>Higher visibility in search results</Text>
              </View>
            </View>
          </View>

          {/* Go to Dashboard Button */}
          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={handleGoToDashboard}
            activeOpacity={0.8}
          >
            <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
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

  logoContainer: {
    alignItems: 'center',
    marginTop: hp(6),
    marginBottom: hp(6),
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: wp(18),
    paddingVertical: hp(1.5),
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.red ,
    gap: wp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: hp(1.8),
    fontFamily: getFontFamily('bold'),
    color: Colors.red || '#E53935',
  },
  contentCard: {
    marginHorizontal: wp(5),
      marginTop: hp(5),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: wp(6),
    paddingTop: hp(17),
     height: hp(70),
    // Glass effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
badgeContainer: {
  position: 'absolute',
  top: '8%',
  left: '60%',
  transform: [{ translateX: -0.5 * 181 }, { translateY: -0.5 * 247.66 }],
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  width: 181,
  height: 247.66,
},

 
  congratsTitle: {
    fontSize: hp(3.5),
    fontFamily: getFontFamily('bold'),
   
    color: Colors.black,
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  congratsSubtitle: {
    fontSize: hp(2.2),
    fontFamily: getFontFamily('regular'),
    color: '#666',
    textAlign: 'center',
    lineHeight: hp(2.8),
    marginBottom: hp(3),
    paddingHorizontal: wp(2),
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.1)',
    marginBottom: hp(3),
  },
  benefitsTitle: {
    fontSize: hp(2),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    marginBottom: hp(2),
  },
  benefitsList: {
    gap: hp(1.5),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  benefitText: {
    fontSize: hp(1.8),
    fontFamily: getFontFamily('regular'),
    color: '#333',
    flex: 1,
  },
  dashboardButton: {
    backgroundColor: Colors.red || '#E53935',
    paddingVertical: hp(2),
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary || '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dashboardButtonText: {
    fontSize: hp(2.2),
    fontFamily: getFontFamily('bold'),
    color: Colors.white,
  },
});

export default CongratulationsScreen;
