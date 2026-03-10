import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Box, Text, VStack, HStack, Image, Pressable } from 'native-base';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";

const PropertyCard = React.memo(
  ({ property, onViewDetails, onEdit, onDelete, onToggleFavorite, isFavorite }) => {
    
    const propertyInfo = useMemo(
      () => ({
        bedrooms: property?.bedrooms || "N/A",
        bathrooms: property?.bathrooms || "N/A",
        rent: property?.monthly_rent ? `$${property.monthly_rent}` : "$0",
      }),
      [property]
    );

    const address = useMemo(() => {
      const parts = [];
      if (property?.street) parts.push(property.street);
      if (property?.city) parts.push(property.city);
      if (property?.state) parts.push(`(${property.state})`);
      if (property?.zipcode) parts.push(property.zipcode);
      return parts.join(", ") || "No address provided";
    }, [property]);

    const renderPropertyImage = useMemo(() => {
  try {
    const image =
      property?.media?.photos_preview?.[0]?.url ||
      property?.media?.photos?.[0]?.url ||
      property?.images?.[0] ||
      property?.image_urls?.[0] ||
      null;

    if (!image) {
      return (
        <Image
          source={require("../../Assets/Image/empty-box.png")}
          alt="Property"
          w="100%"
          h="100%"
          resizeMode="cover"
        />
      );
    }

    // DO NOT MODIFY PRESIGNED URL
    const uri = image.trim();

    return (
      <Image
        source={{ uri }}
        alt="Property"
        w="100%"
        h="100%"
        resizeMode="cover"
        fallbackSource={require("../../Assets/Image/empty-box.png")}
      />
    );
  } catch (error) {
    return (
      <Image
        source={require("../../Assets/Image/empty-box.png")}
        alt="Property"
        w="100%"
        h="100%"
        resizeMode="cover"
      />
    );
  }
}, [property?.media, property?.images, property?.image_urls]);


    // ✅ FIXED: Get property ID correctly
    const propertyId = property?.property_id || property?.propertyId || property?.id || property?.ID;
    const propertyType = property?.property_type || "Apartment";
        const name = property?.name || "Apartment";
    name

    // ✅ FIXED: Better occupation status logic
    const isOccupied =
      property?.availability === "occupied" ||
      property?.availability_status === "occupied" ||
      property?.is_available === false ||
      (property?.tenants && Array.isArray(property.tenants) && property.tenants.length > 0);

    const status = isOccupied ? "Occupied" : "Vacant";

    // ✅ FIXED: Handle delete with confirmation
    const handleDelete = () => {
      if (!propertyId) {
        Alert.alert('Error', 'Invalid property ID');
        return;
      }

      Alert.alert(
        'Delete Property',
        `Are you sure you want to delete "${property?.name || 'this property'}"? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              console.log('🗑️ Deleting property:', propertyId);
              // ✅ Pass the entire property object
              onDelete(property);
            }
          }
        ],
        { cancelable: true }
      );
    };

    return (
      <Pressable onPress={() => onViewDetails(property)} mb={4}>
        <Box style={styles.cardContainer}>
          <HStack height={hp(20)}>
            
            {/* LEFT – IMAGE */}
            <Box style={styles.imageContainer}>
              {renderPropertyImage}

              {/* FAVORITE BUTTON */}
              <Pressable
                style={styles.favoriteButton}
                onPress={(e) => {
                  // ✅ Prevent card press event
                  e?.stopPropagation?.();
                  onToggleFavorite(propertyId);
                }}
              >
                {/* ✅ FIXED: Safe icon rendering */}
                {icons?.redHeart && icons?.heart && (
                  <AppIcon name={isFavorite ? icons.redHeart : icons.heart} size={24} />
                )}
              </Pressable>
            </Box>

            {/* RIGHT – DETAILS */}
            <VStack style={styles.contentContainer}>
              
              {/* Property Type with Status Badge */}
           <HStack alignItems="center" justifyContent="space-between">
  {/* NAME */}
  <Text
    style={[styles.propertyType, { flex: 1 }]}
    numberOfLines={3}
    ellipsizeMode="tail"
  >
    {name}
  </Text>

  {/* STATUS BADGE */}
  <Box
    style={[
      styles.statusBadge,
      status === "Occupied" ? styles.occupied : styles.vacant,
    ]}
  >
    <Text style={styles.statusText}>{status}</Text>
  </Box>
</HStack>


              {/* Address */}
              <Text style={styles.address} numberOfLines={1}>
                {address}
              </Text>

              {/* INFO ROW */}
              <HStack style={styles.infoRow}>
                <VStack style={styles.infoItem}>
                  <Text style={styles.infoLabel}>No. Tenant</Text>
                  <Text style={styles.infoValue}>
                    {property?.tenant_count ||
                     property?.tenants?.length ||
                     (isOccupied ? "01" : "00")}
                  </Text>
                </VStack>

                <VStack style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Rent</Text>
                  <Text style={styles.infoValue}>
                    {propertyInfo.rent}/month
                  </Text>
                </VStack>
              </HStack>

              {/* ACTION ROW */}
              <HStack style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onViewDetails(property);
                  }}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onEdit(property);
                  }}
                >
                  {/* ✅ FIXED: Safe icon rendering */}
                  {icons?.editIcon ? (
                    <AppIcon name={icons.editIcon} size={24} />
                  ) : (
                    <MaterialIcons name="edit" size={24} color="#666" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    handleDelete();
                  }}
                >
                  {/* ✅ FIXED: Safe icon rendering with fallback */}
                  {icons?.deleteIcon ? (
                    <AppIcon name={icons.deleteIcon} size={24} />
                  ) : (
                    <MaterialIcons name="delete" size={24} color="#E53935" />
                  )}
                </TouchableOpacity>
              </HStack>

            </VStack>
          </HStack>
        </Box>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  cardContainer: {
    width: wp(92),
    height: hp(21),
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: wp(35),
    height: "100%",
    position: "relative",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  propertyType: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginRight: 8,
      },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  occupied: {
    backgroundColor: "#E53935",
  },
  vacant: {
    backgroundColor: "#4CAF50",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  address: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "column",
  },
  infoLabel: {
    fontSize: 11,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewDetailsButton: {
    backgroundColor: "#E53935",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PropertyCard;
