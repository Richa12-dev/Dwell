import React, {useState}  from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { resetAIState } from '../../Redux/Ai/aiSlice';
import { Colors } from '../../Theme';
import CollectionNavBar from '../../components/CollectionNavBar/CollectionNavBar';
import { getFontFamily } from '../../utils';
import { icons } from '../../Assets';
import { AppIcon } from '../../components/AppIcon';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Container from '../../components/Container/Container';
import {logout} from '../../Redux/Login/services';
import {useNavigation} from '@react-navigation/native';
import Dialog from 'react-native-dialog';



const ProfileHome = ({ navigation }) => {
  const dispatch = useDispatch();
  const {token} = useSelector(loginDataSelectors.getData);
  const [showDialog, setShowDialog] = useState(false);
  const loginData = useSelector(loginDataSelectors.getLoginStatus);

  const { userData = null, isLogged = false } = loginData;

  const backButton = () => {
    navigation.goBack();
  };

  if (!isLogged || !userData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>
          {!isLogged ? 'Please login to view profile' : 'Loading profile...'}
        </Text>
      </View>
    );
  }

const userId = userData?.landlordId || userData?.tenantId || userData?.contractorId || 'N/A';

const fullName = userData?.firstName && userData?.lastName
     ? `${userData.firstName} ${userData.lastName}`
     : userData?.name || 'N/A';
     
     
const handleLogout = async () => {
    try {
      setShowDialog(false);
      dispatch(resetAIState());
      console.log('✅ AI state reset successfully');

      await dispatch(logout({token})).unwrap();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
     <Container>

        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={backButton} style={styles.backButton}>
          <AppIcon name={icons.arrowBack} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Image
                style={styles.profileImage}
                source={require('../../Assets/Image/dwellProperties/person.png')}
              />
            </View>

            {/* Name and Role */}
            <View style={styles.nameSection}>
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.userRole}>{userData.role || 'Contractor'}</Text>
            </View>

            {/* Info List (Only Name, Role, ID, Email) */}
            <View style={styles.infoList}>
              <InfoItem label="Full Name" value={fullName} />
              <InfoItem label="Role" value={userData.role || 'Contractor'} />
              <InfoItem label="User ID" value={userId} />
              <InfoItem label="Email ID" value={userData.email || 'N/A'} />
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton}
                    onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
</Container>
  );
};

// ✅ Reusable Info Item
const InfoItem = ({ label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: getFontFamily('bold'),
    color: '#000',
  },
  profileSection: {
    paddingHorizontal: wp('5%'),
    marginTop: hp('3%'),
  },
  profileCard: {
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: 20,
    paddingBottom: hp('3%'),
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -50,
  },
  profileImage: {
    width: wp('28%'),
    height: wp('28%'),
    borderRadius: wp('14%'),
    borderWidth: 4,
    borderColor: '#E3F2FD',
    backgroundColor: '#E3F2FD',
  },
  nameSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 25,
  },
  userName: {
    fontSize: 24,
    fontFamily: getFontFamily('bold'),
    color: '#000',
  },
  userRole: {
    fontSize: 16,
    fontFamily: getFontFamily('regular'),
    color: '#666',
    marginTop: 4,
  },
  infoList: {
    paddingHorizontal: wp('5%'),
  },
  infoItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: getFontFamily('medium'),
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: getFontFamily('semibold'),
    color: '#000',
  },
  logoutButton: {
    backgroundColor: '#E53E3E',
    marginHorizontal: wp('5%'),
    marginTop: hp('3%'),
    paddingVertical: hp('2%'),
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#E53E3E',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  logoutText: {
    fontSize: 18,
    fontFamily: getFontFamily('bold'),
    color: '#FFF',
  },
});

export default ProfileHome;
