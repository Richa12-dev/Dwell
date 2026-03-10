import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  FlatList,
} from "react-native";
import { Box, Text, VStack, HStack } from "native-base";
import { useSelector, useDispatch } from "react-redux";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import Toast from "react-native-simple-toast";
import Container from "../../components/Container/Container";
import { useNavigation } from '@react-navigation/native';
import { getRentDocuments } from "../../Redux/Rent/services";
import { rentSelectors } from "../../Redux/Rent/rentSlice";

const RentDocuments = () => {
  const dispatch = useDispatch();
    const navigation = useNavigation();
  const [downloading, setDownloading] = useState(null);

  const { documents = [], loading, error } = useSelector(
    rentSelectors.getRentData
  );

  /* -------------------- API CALL -------------------- */
  useEffect(() => {
    dispatch(getRentDocuments());
  }, [dispatch]);

  /* -------------------- HELPERS -------------------- */
  const handleDownload = async (doc) => {
    if (!doc?.download_url) {
      Toast.show("Download URL not available");
      return;
    }

    try {
      setDownloading(doc.key);
      const supported = await Linking.canOpenURL(doc.download_url);

      if (supported) {
        await Linking.openURL(doc.download_url);
      } else {
        Toast.show("Unable to open this document");
      }
    } catch (err) {
      Toast.show("Failed to open document");
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* -------------------- LOADING -------------------- */
  if (loading) {
    return (
      <Container>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text mt={3} color={Colors.textGray}>
            Loading documents...
          </Text>
        </View>
      </Container>
    );
  }

  /* -------------------- ERROR -------------------- */
  if (error) {
    return (
      <Container>
        <View style={styles.center}>
          <Text color="red.500" textAlign="center">
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(getRentDocuments())}
          >
            <Text color={Colors.red}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  /* -------------------- EMPTY -------------------- */
  if (!documents.length) {
    return (
      <Container>
        <View style={styles.center}>
          <AppIcon name={icons.Document} height={hp(6)} width={hp(6)} />
          <Text mt={3} fontSize={hp(2)} color={Colors.textGray}>
            No documents available
          </Text>
          <Text fontSize={hp(1.5)} color={Colors.textGray}>
            Uploaded rent documents will appear here
          </Text>
        </View>
      </Container>
    );
  }

  /* -------------------- UI -------------------- */
  return (
    <Container scroll={false}>
              {/* Header */}
            <View style={styles.headerContainer}>
        <HStack alignItems="center" justifyContent="flex-start" space={2}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
          </TouchableOpacity>

          <Text style={styles.title}>Rent Documents</Text>
        </HStack>
      </View>
      
      <FlatList
        data={documents}
        keyExtractor={(item, index) => item?.key || String(index)}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={{ height: hp(1.4) }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleDownload(item)}
            disabled={downloading === item.key}
          >
            <View style={styles.card}>
              <HStack alignItems="center" space={3}>
                {/* Icon */}
                <View style={styles.iconBox}>
                  <AppIcon
                    name={icons.Document}
                    height={hp(2.4)}
                    width={hp(2.4)}
                  />
                </View>

                {/* Content */}
                <VStack flex={1}>
                  <Text
                    fontSize={hp(1.9)}
                    fontWeight="600"
                    color={Colors.black}
                    numberOfLines={1}
                  >
                    {item.filename}
                  </Text>

                  <Text
                    fontSize={hp(1.4)}
                    color={Colors.textGray}
                    mt={0.5}
                  >
                    {formatFileSize(item.size)} •{" "}
                    {formatDate(item.last_modified)}
                  </Text>
                </VStack>

                {/* Action */}
                {downloading === item.key ? (
                  <ActivityIndicator size="small" color={Colors.red} />
                ) : (
                  <AppIcon
                    name={icons.Download}
                    height={hp(2.2)}
                    width={hp(2.2)}
                  />
                )}
              </HStack>
            </View>
          </TouchableOpacity>
        )}
      />

      <Box mt={hp(1)}>
        <Text
          textAlign="center"
          fontSize={hp(1.4)}
          color={Colors.textGray}
        >
          Tap a document to view or download
        </Text>
      </Box>
    </Container>
  );
};

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: hp(2),
    paddingBottom: hp(2),
    paddingHorizontal: wp(5),
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: "#000"
  },
  subtitle: {
    fontSize: hp(1.6),
    color: Colors.textGray,
    marginTop: hp(0.3)
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(6),
  },

  listContainer: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(2),
  },

  card: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: hp(2),
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  iconBox: {
    backgroundColor: "rgba(229,57,53,0.12)",
    padding: hp(1.3),
    borderRadius: 12,
  },

  retryBtn: {
    marginTop: hp(2),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(10),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.red,
  },
});

export default RentDocuments;
