import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from "react-native";
import { TextInput } from "react-native-paper";
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { createMaintenanceRequest } from "../../Redux/Maintenance/services";
import Toast from "react-native-simple-toast";
import { useDispatch, useSelector } from "react-redux";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
// import { Recorder, Player } from '@react-native-community/audio-toolkit';  // VOICE COMMENTED OUT
// import RNFS from 'react-native-fs';  // VOICE COMMENTED OUT

import { getFontFamily } from '../../utils';
import { Colors } from "../../Theme";


const MaintenanceDetails = ({ onClose, property, landlordId, tenant_sub }) => {
  const dispatch = useDispatch();

  const loginData = useSelector(state => state.loginData || state.login);
  const token = loginData?.accessToken || loginData?.token || null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  /* ── VOICE COMMENTED OUT ──
  const recorderRef = useRef(null);
  const playerRef = useRef(null);
  */

  const recorderRef = useRef(null);  // kept to avoid ref errors
  const playerRef = useRef(null);    // kept to avoid ref errors

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");

  // Media states
  const [photos, setPhotos] = useState([]);
  // const [voiceNote, setVoiceNote] = useState(null);        // VOICE COMMENTED OUT
  // const [isRecording, setIsRecording] = useState(false);    // VOICE COMMENTED OUT
  // const [recordingDuration, setRecordingDuration] = useState(0); // VOICE COMMENTED OUT
  // const [recordingPath, setRecordingPath] = useState(null); // VOICE COMMENTED OUT

  // Date/Time states - FIXED: Better initial state
  const [preferredStartDate, setPreferredStartDate] = useState(() => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    return start;
  });

  const [preferredEndDate, setPreferredEndDate] = useState(() => {
    const end = new Date();
    end.setHours(10, 0, 0, 0);
    return end;
  });

  // FIXED: Separate picker visibility states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // ✅ Must match MAINTENANCE_CATEGORIES in services.js exactly
  const categories = [
    "Plumbing",
    "Electrical",
    "HVAC",
    "Appliance",
    "Pest Control",
    "Structural",
    "Landscaping",
    "Security",
    "Cleaning",
    "Other",
  ];

  const priorities = ["Emergency", "High", "Moderate", "Low",];

  // ─────────────────────────────────────────────────────────────
  // ✅ Auto-fill location from the `property` prop.
  //
  // Expected shape (from Support.jsx propertyInfo):
  //   { street, city, state, zipcode, property_name, ... }
  //
  // We also defensively check a few alternative field names so the
  // component works if called from another screen that passes a raw
  // API property object (streetAddress / zipCode) instead.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!property) {
      console.log('📍 [MaintenanceDetails] No property prop yet — skipping auto-fill');
      return;
    }

    const street  = property.street      || property.streetAddress || '';
    const city    = property.city        || '';
    const state   = property.state       || '';
    const zipcode = property.zipcode     || property.zipCode       || '';

    const parts = [street, city, state, zipcode].filter(Boolean);
    const propertyLocation = parts.join(', ');

    if (propertyLocation) {
      console.log('📍 [MaintenanceDetails] Auto-filling location:', propertyLocation);
      setLocation(propertyLocation);
    } else {
      const fallback = property.property_name || property.name || '';
      console.log('📍 [MaintenanceDetails] No address parts — falling back to:', fallback);
      setLocation(fallback);
    }
  }, [property]);

  const takePhoto = async () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      saveToPhotos: true,
       quality:           0.8,
    cameraType:        'back',
       presentationStyle: 'fullScreen',
    };

    launchCamera(options, (response) => {
     console.log('[Camera] errorCode:', response.errorCode);
    console.log('[Camera] errorMessage:', response.errorMessage);
      if (response.didCancel) return;

      if (response.errorCode) {
        console.log("Camera error:", response);
        Toast.show("Camera error: " + response.errorMessage);
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        const newPhoto = {
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
        };
        setPhotos(prev => [...prev, newPhoto]);
        Toast.show('Photo captured');
      }
    });
  };

  const pickImageFromGallery = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 5,
      includeBase64: false,
    };

    try {
      const result = await launchImageLibrary(options);

      if (result.didCancel) return;

      if (result.errorCode) {
        Toast.show('Gallery error: ' + result.errorMessage);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
        }));
        setPhotos([...photos, ...newPhotos]);
        Toast.show(`${newPhotos.length} photo(s) added`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show('Failed to pick image');
    }
  };

  const handlePhotoPress = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImageFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    Toast.show('Photo removed');
  };

  /* ── VOICE FUNCTIONS COMMENTED OUT ──
  const recordingIntervalRef = useRef(null);

  const startRecording = async () => {
    try {
      const fileName = `voice_${Date.now()}.mp4`;
      recorderRef.current = new Recorder(fileName, {
        bitrate: 256000,
        channels: 2,
        sampleRate: 44100,
      });

      await recorderRef.current.record();
      setIsRecording(true);
      const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      setRecordingPath(path);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.log("Recording error:", e);
      Toast.show("Failed to start recording");
    }
  };

  const stopRecording = async () => {
    try {
      if (!recorderRef.current) return;

      await recorderRef.current.stop();
      setIsRecording(false);

      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;

      setVoiceNote({
        uri: recordingPath,
        fileName: recordingPath.split('/').pop(),
        type: "audio/mp4",
        duration: recordingDuration,
      });

      Toast.show("Voice note saved");
    } catch (e) {
      console.log("Stop error:", e);
      Toast.show("Failed to stop recording");
    }
  };

  const playVoice = () => {
    if (!voiceNote) return;
    playerRef.current = new Player(voiceNote.uri).prepare((err) => {
      if (err) return console.log("Playback prepare error:", err);
      playerRef.current.play();
    });
  };

  const deleteVoiceNote = async () => {
    if (voiceNote?.uri) {
      await RNFS.unlink(voiceNote.uri);
    }
    clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;

    setVoiceNote(null);
    setRecordingDuration(0);
    recorderRef.current = null;
    playerRef.current = null;
    Toast.show("Voice note removed");
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  ── END VOICE FUNCTIONS COMMENTED OUT ── */

  // FIXED: Date change handlers
  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowStartDatePicker(false);
      return;
    }

    if (selectedDate) {
      const newStartDate = new Date(selectedDate);
      newStartDate.setHours(preferredStartDate.getHours());
      newStartDate.setMinutes(preferredStartDate.getMinutes());

      setPreferredStartDate(newStartDate);

      const newEndDate = new Date(selectedDate);
      newEndDate.setHours(preferredEndDate.getHours());
      newEndDate.setMinutes(preferredEndDate.getMinutes());

      if (newEndDate <= newStartDate) {
        newEndDate.setTime(newStartDate.getTime() + 2 * 60 * 60 * 1000);
      }

      setPreferredEndDate(newEndDate);
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowStartTimePicker(false);
      return;
    }

    if (selectedTime) {
      setPreferredStartDate(selectedTime);
      if (preferredEndDate <= selectedTime) {
        setPreferredEndDate(new Date(selectedTime.getTime() + 2 * 60 * 60 * 1000));
      }
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowEndTimePicker(false);
      return;
    }

    if (selectedTime) {
      if (selectedTime <= preferredStartDate) {
        Toast.show("End time must be after start time");
        return;
      }
      setPreferredEndDate(selectedTime);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectCategory = (item) => {
    setSelectedCategory(item);
    setCategoryModalVisible(false);
  };

  const handleSelectPriority = (item) => {
    setSelectedPriority(item);
    setPriorityModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show("Please enter a title");
      return;
    }

    if (!description.trim()) {
      Toast.show("Please enter a description");
      return;
    }

    if (!selectedCategory) {
      Toast.show("Please select a category");
      return;
    }

    if (!selectedPriority) {
      Toast.show("Please select a priority");
      return;
    }

    if (!location.trim()) {
      Toast.show("Please enter a location");
      return;
    }

    if (!token) {
      Toast.show("Authentication token missing");
      return;
    }

    setIsSubmitting(true);

    // Map UI priority label → API urgency enum (low | medium | high | emergency)
    const urgencyMap = {
      Emergency: 'emergency',
      High:      'high',
      Moderate:  'medium',
      Low:       'low',
    };

    // Pass raw local file objects directly to the thunk.
    // The thunk calls uploadMediaFiles() which:
    //   1. POSTs to /api/s3/batch-upload-urls  → gets S3 pre-signed PUT URLs
    //   2. PUTs each file binary to S3
    //   3. Returns [{ url: <CDN fileUrl>, type, name, size }]
    // and then includes those real S3 URLs in the ticket payload.
    const payload = {
      // IDs
      tenantId:   property?.tenant_id   || tenant_sub,
      propertyId: property?.property_id || null,
      unitId:     property?.unit_id     || null,

      // Ticket fields
      title:         title.trim(),
      description:   description.trim(),
      // ✅ selectedCategory already matches API enum (no mapping needed)
      category:      selectedCategory,
      urgency:       urgencyMap[selectedPriority] || 'medium',
      location:      location.trim(),
      status:        'pending',
      scheduledDate: preferredStartDate.toISOString(),

      // Raw local files — the thunk uploads them to S3 before creating the ticket
      photos,
      // voiceNote,  // VOICE COMMENTED OUT

      // Auth
      token,
    };

    console.log("✅ Submitting Maintenance Request:", JSON.stringify({
      ...payload,
      photos:    photos.map(p => ({ fileName: p.fileName, type: p.type })),
      // voiceNote: voiceNote ? { fileName: voiceNote.fileName } : null,  // VOICE COMMENTED OUT
    }, null, 2));

    try {
      const result = await dispatch(
        createMaintenanceRequest(payload)
      ).unwrap();

      console.log("✅ Maintenance request created successfully:", result);

      Toast.show("Request submitted successfully!");

      setTitle("");
      setDescription("");
      setSelectedCategory("");
      setSelectedPriority("");
      setPreferredStartDate(() => {
        const start = new Date();
        start.setHours(9, 0, 0, 0);
        return start;
      });
      setPreferredEndDate(() => {
        const end = new Date();
        end.setHours(10, 0, 0, 0);
        return end;
      });
      setPhotos([]);
      // setVoiceNote(null);  // VOICE COMMENTED OUT

      onClose();
    } catch (error) {
      console.error("Error submitting maintenance:", error);
      Toast.show(error?.message || error?.toString() || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>New Request</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <AppIcon name={icons.close} height={hp(2.3)} width={hp(2.3)} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp(2) }}
      >
        {/* Title */}
        <Text style={styles.label}>Title*</Text>
        <TextInput
          mode="outlined"
          placeholder="Enter your Issue"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.red}
          editable={!isSubmitting}
        />

        {/* Description */}
        <Text style={styles.label}>Description*</Text>
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={4}
          placeholder="Detail about maintenance issues"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.red}
          editable={!isSubmitting}
        />

        {/* Category & Priority */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Category*</Text>
            <TouchableOpacity
              onPress={() => !isSubmitting && setCategoryModalVisible(true)}
              style={styles.dropdownBox}
              disabled={isSubmitting}
            >
              <Text
                style={{
                  color: selectedCategory ? Colors.black : Colors.placeholder,
                }}
              >
                {selectedCategory || "Select"}
              </Text>
              <AppIcon
                name={icons.arrowDown}
                height={hp(2)}
                width={hp(2)}
                color={Colors.placeholder}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.halfInput}>
            <Text style={styles.label}>Priority*</Text>
            <TouchableOpacity
              onPress={() => !isSubmitting && setPriorityModalVisible(true)}
              style={styles.dropdownBox}
              disabled={isSubmitting}
            >
              <Text
                style={{
                  color: selectedPriority ? Colors.black : Colors.placeholder,
                }}
              >
                {selectedPriority || "Select"}
              </Text>
              <AppIcon
                name={icons.arrowDown}
                height={hp(2)}
                width={hp(2)}
                color={Colors.placeholder}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <Text style={styles.label}>Location* (Auto-filled)</Text>
        <TextInput
          mode="outlined"
          placeholder="Property location"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          editable={!isSubmitting}
        />

        {/* Preferred Schedule */}
        <Text style={styles.label}>Preferred Schedule*</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            onPress={() => !isSubmitting && setShowStartDatePicker(true)}
            style={styles.dateBox}
            disabled={isSubmitting}
          >
            <AppIcon
              name={icons.calender}
              height={hp(2)}
              width={hp(2)}
              color={Colors.placeholder}
            />
            <Text style={styles.dateTimeTextCompact} numberOfLines={1}>
              {formatDate(preferredStartDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => !isSubmitting && setShowStartTimePicker(true)}
            style={styles.timeBox}
            disabled={isSubmitting}
          >
            <AppIcon
              name={icons.clock}
              height={hp(2)}
              width={hp(2)}
              color={Colors.placeholder}
            />
            <Text style={styles.dateTimeTextCompact} numberOfLines={1} ellipsizeMode="clip">
              {formatTime(preferredStartDate)}
            </Text>
          </TouchableOpacity>

          <View style={styles.timeDivider}>
            <Text style={styles.dividerText}>to</Text>
          </View>

          <TouchableOpacity
            onPress={() => !isSubmitting && setShowEndTimePicker(true)}
            style={styles.timeBox}
            disabled={isSubmitting}
          >
            <AppIcon
              name={icons.clock}
              height={hp(2)}
              width={hp(2)}
              color={Colors.placeholder}
            />
            <Text style={styles.dateTimeTextCompact} numberOfLines={1} ellipsizeMode="clip">
              {formatTime(preferredEndDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attachments */}
        <Text style={styles.label}>Attachment</Text>
        <View style={styles.attachRow}>
          <TouchableOpacity
            style={[styles.attachButton, styles.activeAttach]}
            onPress={handlePhotoPress}
            disabled={isSubmitting}
          >
            <AppIcon
              name={icons.photo}
              height={hp(2)}
              width={hp(2)}
              color="#fff"
            />
            <Text style={styles.attachTextActive}>Photos</Text>
          </TouchableOpacity>

          {/* ── VOICE BUTTON COMMENTED OUT ──
          <TouchableOpacity
            style={[
              styles.attachButton,
              (isRecording || voiceNote) && styles.activeAttach
            ]}
            onPress={isRecording ? stopRecording : (voiceNote ? deleteVoiceNote : startRecording)}
            disabled={isSubmitting}
          >
            <AppIcon
              name={icons.voice}
              height={hp(2)}
              width={hp(2)}
              color={(isRecording || voiceNote) ? "#fff" : Colors.placeholder}
            />
            <Text style={(isRecording || voiceNote) ? styles.attachTextActive : styles.attachText}>
              {isRecording ? `Recording ${formatDuration(recordingDuration)}` :
               voiceNote ? `Voice Saved` : 'Voice Note'}
            </Text>
          </TouchableOpacity>
                {/* ── END VOICE BUTTON ── */}
        </View>

        <View style={styles.attachmentPreviewRow}>
          {/* Photo Preview */}
          {photos.length > 0 && (
            <ScrollView horizontal style={styles.photoPreviewContainer}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoPreview}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removePhoto(index)}
                  >
                    <AppIcon name={icons.close} height={hp(2)} width={hp(2)} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* ── VOICE PREVIEW COMMENTED OUT ──
          {voiceNote && (
            <View style={styles.voicePreview}>
              <TouchableOpacity onPress={playVoice} style={styles.voicePlayBtn}>
                <AppIcon name={icons.play} height={hp(2.2)} width={hp(2.2)} color="#fff" />
              </TouchableOpacity>

              <View style={styles.voiceInfo}>
                <Text style={styles.voiceTitle}>Voice Note</Text>
                <Text style={styles.voiceDuration}>
                  {formatDuration(voiceNote.duration || 0)}
                </Text>
              </View>

              <TouchableOpacity onPress={deleteVoiceNote}>
                <AppIcon name={icons.close} height={hp(2)} width={hp(2)} />
              </TouchableOpacity>
            </View>
          )}
          ── END VOICE PREVIEW ── */}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.submitText, { marginLeft: 8 }]}>
                  Submitting...
                </Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FIXED: iOS Date Picker Modal */}
      {Platform.OS === 'ios' && showStartDatePicker && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.iosPickerModal}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowStartDatePicker(false)}
                  style={styles.iosPickerButton}
                >
                  <Text style={styles.iosPickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => setShowStartDatePicker(false)}
                  style={styles.iosPickerButton}
                >
                  <Text style={[styles.iosPickerButtonText, { color: Colors.red }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={preferredStartDate}
                mode="date"
                display="spinner"
                onChange={onStartDateChange}
                minimumDate={new Date()}
                textColor="#000"
                style={styles.iosDatePicker}
              />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* FIXED: Android Date Picker */}
      {Platform.OS === 'android' && showStartDatePicker && (
        <DateTimePicker
          value={preferredStartDate}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* FIXED: iOS Start Time Picker */}
      {Platform.OS === 'ios' && showStartTimePicker && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.iosPickerModal}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowStartTimePicker(false)}
                  style={styles.iosPickerButton}
                >
                  <Text style={styles.iosPickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>Start Time</Text>
                <TouchableOpacity
                  onPress={() => setShowStartTimePicker(false)}
                  style={styles.iosPickerButton}
                >
                  <Text style={[styles.iosPickerButtonText, { color: Colors.red }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={preferredStartDate}
                mode="time"
                display="spinner"
                onChange={onStartTimeChange}
                textColor="#000"
                style={styles.iosDatePicker}
              />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* FIXED: Android Start Time Picker */}
      {Platform.OS === 'android' && showStartTimePicker && (
        <DateTimePicker
          value={preferredStartDate}
          mode="time"
          display="default"
          onChange={onStartTimeChange}
        />
      )}

      {/* FIXED: iOS End Time Picker */}
      {Platform.OS === 'ios' && showEndTimePicker && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.iosPickerModal}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowEndTimePicker(false)}
                  style={styles.iosPickerButton}
                >
                  <Text style={styles.iosPickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>End Time</Text>
                <TouchableOpacity
                  onPress={() => setShowEndTimePicker(false)}
                  style={styles.iosPickerButton}
                >
                  <Text style={[styles.iosPickerButtonText, { color: Colors.red }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={preferredEndDate}
                mode="time"
                display="spinner"
                onChange={onEndTimeChange}
                textColor="#000"
                style={styles.iosDatePicker}
              />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* FIXED: Android End Time Picker */}
      {Platform.OS === 'android' && showEndTimePicker && (
        <DateTimePicker
          value={preferredEndDate}
          mode="time"
          display="default"
          onChange={onEndTimeChange}
        />
      )}

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.selectionOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.selectionContainer}>
            <Text style={styles.selectionTitle}>Select Category</Text>
            <ScrollView style={styles.optionsList}>
              {categories.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.option}
                  onPress={() => handleSelectCategory(item)}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Priority Modal */}
      <Modal
        visible={priorityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPriorityModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.selectionOverlay}
          activeOpacity={1}
          onPress={() => setPriorityModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.selectionContainer}>
            <Text style={styles.selectionTitle}>Select Priority</Text>
            {priorities.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.option}
                onPress={() => handleSelectPriority(item)}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default MaintenanceDetails;

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: wp(6),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    maxHeight: hp(90),
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  header: {
    fontSize: hp(2.6),
    fontWeight: "700",
    color: Colors.black,
  },
  closeButton: {
    backgroundColor: "#F3F3F3",
    borderRadius: 20,
    padding: 5,
  },
  label: {
    fontSize: hp(1.7),
    fontWeight: "500",
    color: Colors.black,
    marginTop: hp(1.5),
    marginBottom: hp(0.5),
  },
  input: {
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  dropdownBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
  },
  dateBox: {
    width: wp(30),
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: wp(2),
    paddingVertical: hp(1),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 4,
  },
  timeBox: {
    width: wp(22),
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: wp(2),
    paddingVertical: hp(1.2),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 2,
  },
  dateTimeTextCompact: {
    fontSize: hp(1.4),
    color: Colors.black,
    flex: 1,
    flexShrink: 1,
  },
  timeDivider: {
    paddingHorizontal: wp(1),
    justifyContent: "center",
    alignItems: "center",
  },
  dividerText: {
    fontSize: hp(1.6),
    color: Colors.placeholder,
    fontWeight: "500",
  },
  attachRow: {
    flexDirection: "row",
    marginTop: hp(1),
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    marginRight: wp(3),
  },
  activeAttach: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  attachText: {
    marginLeft: 5,
    fontSize: hp(1.7),
    color: Colors.black,
  },
  attachTextActive: {
    marginLeft: 5,
    fontSize: hp(1.7),
    color: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: hp(3),
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: hp(1.5),
    marginRight: wp(3),
    alignItems: "center",
  },
  cancelText: {
    color: Colors.black,
    fontSize: hp(1.9),
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.red,
    borderRadius: 8,
    paddingVertical: hp(1.5),
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#fff",
    fontSize: hp(1.9),
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: wp(10),
  },
  selectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: hp(2),
    maxHeight: hp(50),
  },
  selectionTitle: {
    fontSize: hp(2),
    fontWeight: "600",
    marginBottom: hp(1),
    textAlign: "center",
  },
  optionsList: {
    maxHeight: hp(40),
  },
  option: {
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  optionText: {
    textAlign: "center",
    fontSize: hp(1.9),
    color: Colors.black,
  },
  // FIXED: iOS Picker Styles
  pickerWrapper: {
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: hp(2),
},
  iosPickerModal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",

  },
  iosPickerContainer: {
  width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: "#F9F9F9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  iosPickerTitle: {
    fontSize: hp(2),
    fontWeight: "600",
    color: Colors.black,
  },
  iosPickerButton: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
  },
  iosPickerButtonText: {
    fontSize: hp(2),
    fontWeight: "600",
    color: Colors.black,
  },
  iosDatePicker: {
    height: hp(25),
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  photoPreview: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    width: wp(16),
    height: hp(6),
    backgroundColor: '#f0f0f0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 2,
  },
  voicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.8),
    marginLeft: wp(2),
    flex: 1,
  },
  voicePlayBtn: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(3),
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInfo: {
    flex: 1,
    marginLeft: wp(3),
  },
  voiceTitle: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: Colors.black,
  },
  voiceDuration: {
    fontSize: hp(1.4),
    color: Colors.placeholder,
    marginTop: 2,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1),
  }
});
