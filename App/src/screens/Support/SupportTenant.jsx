
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Box, Text, VStack, HStack, Button } from "native-base";
import Modal from "react-native-modal";
import LinearGrad from "react-native-linear-gradient";
import { Colors } from "../../Theme";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import CollectionNavBar from "../../components/CollectionNavBar/CollectionNavBar";
import MaintenanceDetails from "./MaintenanceDetails";

const SupportTenant = () => {
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [maintenanceItems, setMaintenanceItems] = useState([
    { title: "Leaky faucet in Kitchen", location: "Austin, TX ABC Plumbing", date: "Sep 27", status: "New" },
    { title: "Air conditioner not cooling", location: "Austin, TX Cool Air HVAC", date: "Oct 2", status: "In Progress" },
    { title: "Broken window latch", location: "Austin, TX Window Repair Co", date: "Oct 5", status: "Completed" },
  ]);

  const upcomingMaintenance = showAllMaintenance
    ? maintenanceItems
    : maintenanceItems.slice(0, 2);

  const handleAddMaintenance = (newItem) => {
    setMaintenanceItems([newItem, ...maintenanceItems]);
    setShowModal(false);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Background gradient */}
      <View style={styles.backgroundContainer}>
        <LinearGrad
          colors={["rgba(229,57,53,0.15)", "transparent"]}
          style={styles.topGlow}
        />
      </View>

      <CollectionNavBar />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Box bg="white" p={5} rounded="2xl" shadow={2} mt={4}>
          <Text fontSize="lg" bold mb={4}>
            Upcoming Maintenance
          </Text>

          <VStack space={3}>
            {upcomingMaintenance.map((item, index) => (
              <HStack justifyContent="space-between" key={index}>
                <VStack>
                  <Text bold>{item.title}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {item.location}
                  </Text>
                </VStack>
                <Text color="gray.600">{item.date}</Text>
              </HStack>
            ))}
          </VStack>

          <Button
            variant="ghost"
            mt={4}
            onPress={() => setShowAllMaintenance(!showAllMaintenance)}
          >
            {showAllMaintenance ? "Show less ▲" : "Show more ▼"}
          </Button>
        </Box>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        isVisible={showModal}
        onBackdropPress={() => setShowModal(false)}
        style={{ justifyContent: "flex-end", margin: 0 }}
        swipeDirection={["down"]}
        backdropOpacity={0.5}
      >
        <MaintenanceDetails
          onClose={() => setShowModal(false)}
          onSubmit={handleAddMaintenance}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  topGlow: {
    position: "absolute",
    width: wp("90%"),
    height: hp("50%"),
    borderRadius: 220,
    top: hp("-6%"),
    left: wp("20%"),
    backgroundColor: "rgba(229, 57, 53, 0.15)",
  },
  fabButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fabText: {
    color: "white",
    fontSize: 28,
  },
});

export default SupportTenant;



import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {useSelector} from 'react-redux';
import {queriesSelectors} from '../../Redux/Queries/queriesSlice';
import {icons} from '../../Assets';
import {AppIcon} from '../../components/AppIcon';
import GenericIcon from '../../components/GenericIcon';
import BottomSheet from '../../components/SupportButton';
import SupportComponent from '../../components/SupportComponent';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import CollectionNavBar from '../../components/CollectionNavBar/CollectionNavBar';
import LinearGrad from 'react-native-linear-gradient'; // ✅ gradient background

const Support = ({navigation}) => {
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [type, setType] = useState('');

  const quaryListData = useSelector(queriesSelectors.getQueries);
  const isFocused = useIsFocused();

  useEffect(() => {
    fetchData();
  }, [isFocused]);

  const fetchData = () => {
    setLoading(false);
    setAssociates(null);
  };

  const handleAddClick = () => {
    navigation.navigate('Query');
  };

  const renderFooterComponent = () => <View style={styles.footerComponent} />;

  const closeBottomSheet = () => {
    setBottomSheetVisible(false);
    setSelectedItem(null);
  };

  const submitFeedBack = text => {
    setType(text);
  };

  const fetchData2 = () => {
    fetchData();
    setSelectedItem(null);
  };

  const onFeedbackPress = item => {
    setSelectedItem(item);
    setBottomSheetVisible(true);
  };


  // FIX: Navigate with only queryId instead of full data object
  const handleQueryPress = (item) => {
    navigation.navigate('QueryDetails', {
      queryId: item.queryId
    });
  };
  
  const renderItem = ({item}) => (
    <SupportComponent
      data={item}
      fetchdata={fetchData}
      navigation={navigation}
         onPress={() => handleQueryPress(item)}
      onFeedbackPress={() => onFeedbackPress(item)}
      name={item.queryType}
      id={item.queryId}
      status={item.queryStatusL1}
      level={`| Level ${item.queryStatusL2 ? 2 : 1}`}
      subject={item.querySubject}
    />
  );

  const renderEmptyComponent = () => (
    <View style={styles.centeredContent}>
      <AppIcon name={icons.nOrecordFound} size={80} />
      <Text style={styles.noRecordText}>No record found</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container2}
      behavior={Platform.OS === 'ios' ? 'padding' : ''}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100}>
      <View style={styles.container}>
        <StatusBar backgroundColor={Colors.black} barStyle="light-content" />

        <CollectionNavBar />

        {/* 🔴 Background Gradient Circles (same as Dashboard) */}
        <View style={styles.backgroundContainer}>
          <LinearGrad
            colors={['rgba(255, 99, 99, 0.25)', 'transparent']}
            style={styles.circleTopLeft}
          />
          <LinearGrad
            colors={['rgba(255, 140, 140, 0.3)', 'transparent']}
            style={styles.circleBottomRight}
          />
        </View>

        {/* 🧩 Main Content */}
        <Text style={styles.manageText}>Support</Text>

        <FlatList
          data={quaryListData}
          ListFooterComponent={renderFooterComponent}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          ListEmptyComponent={renderEmptyComponent}
          refreshing={loading}
          onRefresh={fetchData}
        />

        {/* ➕ Floating Add Button */}
                      <TouchableOpacity
                         onPress={handleAddClick}
                         style={styles.floatingButton}>
              >
                <Text style={styles.fabText}>+</Text>
              </TouchableOpacity>
      </View>

      {/* 🪟 Feedback Bottom Sheet */}
      <BottomSheet
        isVisible={isBottomSheetVisible}
        onClose={closeBottomSheet}
        onSubmit={fetchData2}
        onchangetext={submitFeedBack}
        value={type}
        data={false}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container2: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? 0 : StatusBar.currentHeight,
    ...Platform.select({
      ios: {
        paddingTop: hp(7),
      },
    }),
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  circleTopLeft: {
    position: 'absolute',
    width: 294.879,
    height: 430.828,
    borderRadius: 215,
    top: -50,
    left: 135,
    backgroundColor: '#E5393526', // fallback in case gradient fails
  },
  circleBottomRight: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -60,
    right: -60,
  },
  manageText: {
    fontSize: wp('6%'),
    fontFamily: getFontFamily('bold'),
    marginHorizontal: 15,
    marginBottom: 7,
    color: Colors.black,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    width: wp(15),
    height: wp(15),
    backgroundColor: Colors.black,
    borderRadius: wp(12.5),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
    fabText: {
    color: 'white',
    fontSize: 28,
    lineHeight: 28,
  },
  footerComponent: {
    height: hp(10),
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 200,
  },
  noRecordText: {
    fontFamily: getFontFamily('bold'),
    fontSize: 15,
  },
});

export default Support;

