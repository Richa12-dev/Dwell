import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { uploadProfileImage, fetchUserProfile } from '../../Redux/Users/userServices';
import { resetAIState } from '../../Redux/Ai/aiSlice';
import { logout } from '../../Redux/Login/loginservices';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { icons } from '../../Assets';
import { AppIcon } from '../../components/AppIcon';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Container from '../../components/Container/Container';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Dialog from 'react-native-dialog';

// ✅ Same file that property images use — just a different hook exported from it
import { useSignedProfileImage } from '../../commonFunction/useSignedImageUrls';

const ProfileHome = ({ navigation }) => {
  const dispatch = useDispatch();

  // ── Auth state ────────────────────────────────────────────────────────────────
  const { token, is_logged: isLogged, userData } = useSelector(
    (state) => ({
      token:     state.loginData?.accessToken || state.loginData?.token || null,
      is_logged: state.loginData?.is_logged   || false,
      userData:  state.loginData?.userData    || null,
    }),
    shallowEqual,
  );

  // ── Profile detail for name / role / email display ────────────────────────────
  const { data: profileDetail, loading: profileDetailLoading } = useSelector(
    (state) => ({
      data:    state.users?.profileDetail        || null,
      loading: state.users?.profileDetailLoading || false,
    }),
    shallowEqual,
  );

  const isUploadLoading = useSelector((state) => state.users?.uploadLoading || false);

  // ── Upload counter — incrementing this triggers useSignedProfileImage to re-sign ──
  const [uploadVersion,         setUploadVersion]         = useState(0);
  const [showDialog,            setShowDialog]            = useState(false);
  const [showImagePickerDialog, setShowImagePickerDialog] = useState(false);

  // ── Fetch fresh profile on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (isLogged && token) {
      dispatch(fetchUserProfile());
    }
  }, [isLogged, token]);

  // ── Profile image — resolved exactly like property images ─────────────────────
  //
  // useSignedProfileImage:
  //   1. Calls fetchProfileImageKey() → GET /users/profiledetail → raw filename
  //   2. Passes just the filename to GET /s3/download-url (backend adds "uploads/")
  //   3. Caches the presigned URL for 50 min
  //   4. Re-fetches when uploadVersion changes (after new upload)
  //
  // Used like: const { signedUrls } = useSignedImageUrls(images, token)  ← properties
  //            const { signedUrl  } = useSignedProfileImage(token, deps)  ← profile
  const { signedUrl: profileImageUri, loading: imageLoading } = useSignedProfileImage(
    token,
    [uploadVersion],
  );

  // ── Derived display values ────────────────────────────────────────────────────
  const displayData = profileDetail || userData;

  const userId =
    displayData?.id        ||
    userData?.landlordId   ||
    userData?.tenantId     ||
    userData?.contractorId ||
    'N/A';

  const fullName =
    displayData?.firstName && displayData?.lastName
      ? `${displayData.firstName} ${displayData.lastName}`
      : displayData?.name || 'N/A';

  const userRole  = displayData?.role  || 'N/A';
  const userEmail = displayData?.email || 'N/A';
    const userPhone = displayData?.phone || 'N/A';

  // ── Image source ──────────────────────────────────────────────────────────────
  const profileImageSource = profileImageUri
    ? { uri: profileImageUri }
    : require('../../Assets/Image/dwellProperties/person.png');

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const backButton = () => navigation.goBack();

  const handlePickImage = useCallback(
    (type) => {
      setShowImagePickerDialog(false);

      if (userId === 'N/A') {
        Alert.alert('Error', 'Could not determine your user ID. Please try again.');
        return;
      }

      const options = {
        mediaType: 'photo',
        maxWidth:  800,
        maxHeight: 800,
        quality:   0.8,
      };

      const callback = (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to pick image.');
          return;
        }
        const asset = response.assets?.[0];
        if (!asset?.uri) return;

        dispatch(
          uploadProfileImage({
            fileUri:     asset.uri,
            fileName:    `profile_${Date.now()}.jpg`,
            contentType: 'image/jpeg',
            userId,
          }),
        )
          .unwrap()
          .then(() => {
            // Refresh profile data then increment counter so hook re-signs new image
            dispatch(fetchUserProfile()).finally(() => {
              setUploadVersion((v) => v + 1);
            });
          })
          .catch((err) => {
            console.error('Upload error:', err);
            Alert.alert('Upload Issue', 'Photo may not be saved. Please try again.');
          });
      };

      setTimeout(() => {
        if (type === 'camera') { launchCamera(options, callback); }
        else                   { launchImageLibrary(options, callback); }
      }, 500);
    },
    [dispatch, userId],
  );
  
  const handleLogout = async () => {
    try {
      setShowDialog(false);
      dispatch(resetAIState());
      await dispatch(logout({ token })).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────────
  if (!isLogged || (!userData && !profileDetail)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary || '#2196F3'} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
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

          {/* Avatar with Upload Button */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              onPress={() => setShowImagePickerDialog(true)}
              activeOpacity={0.8}
              disabled={isUploadLoading || imageLoading}
            >
              <View style={styles.imageWrapper}>
                {/*
                  key={uploadVersion} forces a full Image remount after upload,
                  bypassing React Native's image cache — same technique used elsewhere.
                */}
                <Image
                  key={uploadVersion}
                  style={styles.profileImage}
                  source={profileImageSource}
                  onError={(e) => console.warn('[Profile] Image load error:', e.nativeEvent.error)}
                />

                {(isUploadLoading || imageLoading) ? (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                ) : (
                  <View style={styles.cameraIconContainer}>
                    <AppIcon name={icons.photo} size={16} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Name and Role */}
          <View style={styles.nameSection}>
            {profileDetailLoading ? (
              <ActivityIndicator size="small" color={Colors.primary || '#2196F3'} />
            ) : (
              <>
                <Text style={styles.userName}>{fullName}</Text>
                <Text style={styles.userRole}>{userRole}</Text>
              </>
            )}
          </View>

          {/* Info List */}
          <View style={styles.infoList}>
            <InfoItem label="Full Name" value={fullName}  />
            <InfoItem label="Role"      value={userRole}  />
           
            <InfoItem label="Email ID"  value={userEmail} />
            <InfoItem label="Phone No."  value={userPhone} />
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => setShowDialog(true)}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Logout Confirmation Dialog */}
      <Dialog.Container visible={showDialog}>
        <Dialog.Title>Logout</Dialog.Title>
        <Dialog.Description>Are you sure you want to logout?</Dialog.Description>
        <Dialog.Button label="Cancel" onPress={() => setShowDialog(false)} />
        <Dialog.Button label="Logout" onPress={handleLogout} />
      </Dialog.Container>

      {/* Image Picker Dialog */}
      <Dialog.Container visible={showImagePickerDialog}>
        <Dialog.Title>Update Profile Photo</Dialog.Title>
        <Dialog.Description>Choose how you want to update your profile photo.</Dialog.Description>
        <Dialog.Button label="Camera"  onPress={() => handlePickImage('camera')} />
        <Dialog.Button label="Gallery" onPress={() => handlePickImage('gallery')} />
        <Dialog.Button label="Cancel"  onPress={() => setShowImagePickerDialog(false)} />
      </Dialog.Container>

    </Container>
  );
};

// ── Reusable Info Item ─────────────────────────────────────────────────────────
const InfoItem = ({ label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: {
    paddingHorizontal: wp('5%'),
    paddingVertical:   hp('2%'),
    flexDirection:     'row',
    alignItems:        'center',
  },
  backButton:  { marginRight: 15 },
  headerTitle: { fontSize: 24, fontFamily: getFontFamily('bold'), color: '#000' },
  profileSection: {
    paddingHorizontal: wp('5%'),
    marginTop:         hp('3%'),
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius:    20,
    paddingBottom:   hp('3%'),
    elevation:       3,
    shadowColor:     '#000',
    shadowOpacity:   0.08,
    shadowOffset:    { width: 0, height: 2 },
    shadowRadius:    8,
  },
  avatarContainer: { alignItems: 'center', marginTop: -50 },
  imageWrapper:    { position: 'relative' },
  profileImage: {
    width:           wp('28%'),
    height:          wp('28%'),
    borderRadius:    wp('14%'),
    borderWidth:     4,
    borderColor:     '#E3F2FD',
    backgroundColor: '#E3F2FD',
  },
  uploadOverlay: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius:    wp('14%'),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  cameraIconContainer: {
    position:    'absolute',
    bottom: 4, right: 4,
    width: 32, height: 32,
    borderRadius:  16,
    justifyContent: 'center',
    alignItems:     'center',
    borderWidth:    2,
    borderColor:    '#FFF',
    elevation:      2,
    shadowColor:    '#000',
    shadowOpacity:  0.2,
    shadowOffset:   { width: 0, height: 1 },
    shadowRadius:   2,
  },
  nameSection:  { alignItems: 'center', marginTop: 12, marginBottom: 25 },
  userName:     { fontSize: 24, fontFamily: getFontFamily('bold'),    color: '#000' },
  userRole:     { fontSize: 16, fontFamily: getFontFamily('regular'), color: '#666', marginTop: 4 },
  infoList:     { paddingHorizontal: wp('5%') },
  infoItem:     { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoContent:  { flex: 1 },
  infoLabel:    { fontSize: 14, fontFamily: getFontFamily('medium'),   color: '#666', marginBottom: 4 },
  infoValue:    { fontSize: 16, fontFamily: getFontFamily('semibold'), color: '#000' },
  logoutButton: {
    backgroundColor:  '#E53E3E',
    marginHorizontal: wp('5%'),
    marginTop:        hp('3%'),
    paddingVertical:  hp('2%'),
    borderRadius:     12,
    alignItems:       'center',
    elevation:        2,
    shadowColor:      '#E53E3E',
    shadowOpacity:    0.3,
    shadowOffset:     { width: 0, height: 2 },
    shadowRadius:     4,
  },
  logoutText: { fontSize: 18, fontFamily: getFontFamily('bold'), color: '#FFF' },
});

export default ProfileHome;
