import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { Box, Text, VStack, HStack } from "native-base";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { useNavigation } from "@react-navigation/native";
import Container from "../../components/Container/Container"; // ✅ using Container

const TenantPayments = () => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const navigation = useNavigation();

  return (
    <Container>
      {/* 🔹 Rent Due Section */}
      <VStack alignItems="center" mt={hp(2)}>
        <Text fontSize={hp(2)} color={Colors.textGray}>
          Your Rent is Due
        </Text>

        <Text fontSize={hp(5)} bold color={Colors.black}>
          $2600
        </Text>

        <TouchableOpacity style={styles.payBtn}>
          <Text style={styles.payBtnText}>Pay Rent Now</Text>
        </TouchableOpacity>

        <Text fontSize={hp(1.8)} mt={hp(1)} color={Colors.textGray}>
          Next Due Date: <Text bold>28 Feb 2025</Text>
        </Text>
      </VStack>

      {/* 🔹 Rent Breakdown */}
      <Box bg="white" shadow={2} rounded="2xl" p={4} mt={hp(2)} mx={wp(5)}>
        <Text fontSize={hp(2)} bold mb={hp(1)}>
          Rent Breakdown
        </Text>

        <HStack justifyContent="space-between" mb={2}>
          <Text>Base Rent</Text>
          <Text bold>$2400</Text>
        </HStack>
        <HStack justifyContent="space-between" mb={2}>
          <Text>Utilities</Text>
          <Text bold>$200</Text>
        </HStack>
        <HStack justifyContent="space-between">
          <Text bold>Total Rent</Text>
          <Text bold>$2600</Text>
        </HStack>
      </Box>

      {/* 🔹 Quick Links */}
      <VStack mt={hp(4)} mx={wp(5)} alignItems="center">
        <Text fontSize={hp(2.2)} bold mb={hp(1)}>
          Quick Links
        </Text>
        <HStack justifyContent="space-around" mt={hp(1)} space={wp(2)}>
          <QuickLink
            icon={icons.LandlordRent}
            label="Contact Landlord"
                     onPress={() => navigation.navigate("ContactLandlord")}
          />
          <QuickLink
            icon={icons.RentHistory}
            label={"Rent" + "\n" + "History"}
            onPress={() => navigation.navigate("RentHistory")}
          />
          <QuickLink
            icon={icons.RentDocument}
            label="Rent Documents"
                      onPress={() => navigation.navigate("RentDocuments")}
          />
        </HStack>
      </VStack>

      {/* 🔹 Contact Landlord Modal */}
      <Modal
        visible={showContactModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Contact Landlord</Text>

            <VStack space={4} mt={hp(3)}>
              <InfoBox
                icon={icons.person}
                label="Full Name"
                value="Henry Cooper"
              />
              <InfoBox
                icon={icons.email}
                label="Email ID"
                value="henrycooper@gmail.com"
              />
              <InfoBox
                icon={icons.phone}
                label="Phone Number"
                value="+1 5555 5555 55"
              />
            </VStack>
          </View>
        </View>
      </Modal>

      {/* 🔹 Rent Documents Modal */}
      <Modal
        visible={showDocumentsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDocumentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowDocumentsModal(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Rent Documents</Text>

            <VStack space={4} mt={hp(3)}>
              <DocumentItem label="Rent Agreement" />
              <DocumentItem label="Inspection Reports" />
              <DocumentItem label="Insurance Policies" />
            </VStack>
          </View>
        </View>
      </Modal>
    </Container>
  );
};

const QuickLink = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickLink} onPress={onPress}>
    <View style={styles.iconCircle}>
      <AppIcon name={icon} height={hp(4)} width={hp(4)} />
    </View>
    <Text
      fontSize={hp(1.9)}
      color={Colors.textGray}
      style={styles.quickLinkText}
      numberOfLines={2}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const InfoBox = ({ icon, label, value }) => (
  <Box style={styles.infoBox}>
    <HStack space={3} alignItems="center">
      <AppIcon name={icon} height={hp(2)} width={hp(2)} />
      <VStack>
        <Text fontSize={hp(1.6)} color={Colors.textGray}>
          {label}
        </Text>
        <Text fontSize={hp(2)}>{value}</Text>
      </VStack>
    </HStack>
  </Box>
);

const DocumentItem = ({ label }) => (
  <TouchableOpacity style={styles.docItem}>
    <HStack justifyContent="space-between" alignItems="center">
      <HStack space={3} alignItems="center">
        <AppIcon name={icons.document} height={hp(3)} width={hp(3)} />
        <VStack>
          <Text fontSize={hp(1.8)} bold>
            Download
          </Text>
          <Text fontSize={hp(1.8)}>{label}</Text>
        </VStack>
      </HStack>
      <View style={styles.downloadBtn}>
        <AppIcon name={icons.download} height={hp(2.5)} width={hp(2.5)} />
      </View>
    </HStack>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  payBtn: {
    backgroundColor: Colors.red,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(20),
    borderRadius: 12,
    marginTop: hp(2),
  },
  payBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: hp(2),
  },
  quickLink: {
    alignItems: "center",
    width: wp(22),
  },
  quickLinkText: {
    fontFamily: "Nunito",
    fontWeight: "600",
    fontSize: hp(1.7),
    textAlign: "center",
    color: "#222222",
    width: wp(22),
    marginTop: hp(0.5),
  },
  iconCircle: {
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: hp(1.5),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: Colors.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    minHeight: hp(50),
  },
  modalHandle: {
    width: wp(15),
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: hp(2),
  },
  closeBtn: {
    position: "absolute",
    right: wp(5),
    top: hp(2),
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeText: {
    fontSize: hp(2.5),
    color: "#6B7280",
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: "#000",
    marginTop: hp(1),
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    padding: hp(2),
    borderRadius: 12,
  },
  docItem: {
    backgroundColor: "#F9FAFB",
    padding: hp(2),
    borderRadius: 12,
  },
  downloadBtn: {
    backgroundColor: "#FEE2E2",
    padding: hp(1),
    borderRadius: 8,
  },
});

export default TenantPayments;
