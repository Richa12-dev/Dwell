import React, { useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  View,
  Text,
  Image,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { useNavigation } from '@react-navigation/native';

const PropertyCard = React.memo(
  ({ property, onViewDetails, onEdit, onDelete, onToggleFavorite, isFavorite }) => {
      const navigation = useNavigation();

    const propertyInfo = useMemo(
      () => ({
        bedrooms: property?.bedrooms || 'N/A',
        bathrooms: property?.bathrooms || 'N/A',
        rent: property?.monthly_rent ? `$${property.monthly_rent}` : '$0',
      }),
      [property]
    );

    const address = useMemo(() => {
      const parts = [];
      if (property?.street) parts.push(property.street);
      if (property?.city) parts.push(property.city);
      if (property?.state) parts.push(`(${property.state})`);
      if (property?.zipcode) parts.push(property.zipcode);
      return parts.join(', ') || 'No address provided';
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
              source={require('../../Assets/Image/empty-box.png')}
              alt="Property"
              style={styles.propertyImage}
              resizeMode="cover"
            />
          );
        }

        const uri = image.trim();

        return (
          <Image
            source={{ uri }}
            alt="Property"
            style={styles.propertyImage}
            resizeMode="cover"
            onError={() => {}}
          />
        );
      } catch (error) {
        return (
          <Image
            source={require('../../Assets/Image/empty-box.png')}
            alt="Property"
            style={styles.propertyImage}
            resizeMode="cover"
          />
        );
      }
    }, [property?.media, property?.images, property?.image_urls]);

    const propertyId =
      property?.property_id || property?.propertyId || property?.id || property?.ID;
    const name = property?.name || 'Apartment';

    const isOccupied =
      property?.availability === 'occupied' ||
      property?.availability_status === 'occupied' ||
      property?.is_available === false ||
      (property?.tenants && Array.isArray(property.tenants) && property.tenants.length > 0);

    const status = isOccupied ? 'Occupied' : 'Vacant';

    const handleDelete = () => {
      if (!propertyId) {
        Alert.alert('Error', 'Invalid property ID');
        return;
      }
      Alert.alert(
        'Delete Property',
        `Are you sure you want to delete "${property?.name || 'this property'}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onDelete(property);
            },
          },
        ],
        { cancelable: true }
      );
    };

    return (
      <Pressable onPress={() => onViewDetails(property)} style={styles.pressable}>
        <View style={styles.cardContainer}>
          <View style={[styles.row, { height: hp(20) }]}>

            {/* LEFT – IMAGE */}
            <View style={styles.imageContainer}>
              {renderPropertyImage}

              {/* FAVORITE BUTTON */}
              <Pressable
                style={styles.favoriteButton}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onToggleFavorite(propertyId);
                }}
              >
                {icons?.redHeart && icons?.heart && (
                  <AppIcon name={isFavorite ? icons.redHeart : icons.heart} size={24} />
                )}
              </Pressable>
            </View>

            {/* RIGHT – DETAILS */}
            <View style={styles.contentContainer}>

              {/* Name + Status Badge */}
              <View style={styles.row}>
                <Text
                  style={[styles.propertyType, { flex: 1 }]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {name}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    status === 'Occupied' ? styles.occupied : styles.vacant,
                  ]}
                >
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              </View>

              {/* Address */}
              <Text style={styles.address} numberOfLines={1}>
                {address}
              </Text>

              {/* INFO ROW */}
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>No. Tenant</Text>
                  <Text style={styles.infoValue}>
                    {property?.tenant_count ||
                      property?.tenants?.length ||
                      (isOccupied ? '01' : '00')}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Rent</Text>
                  <Text style={styles.infoValue}>{propertyInfo.rent}/month</Text>
                </View>
              </View>

              {/* ACTION ROW */}
              <View style={styles.actionRow}>
              
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
    navigation.navigate('PropertyDocuments', { propertyId, propertyName: name });
  }}
>
  {icons?.document ? (
    <AppIcon name={icons.document} size={24} />
  ) : (
    <MaterialIcons name="description" size={24} color="#666" />
  )}
</TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onEdit(property);
                  }}
                >
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
                  {icons?.deleteIcon ? (
                    <AppIcon name={icons.deleteIcon} size={24} />
                  ) : (
                    <MaterialIcons name="delete" size={24} color="#E53935" />
                  )}
                </TouchableOpacity>
                
                
              </View>

            </View>
          </View>
        </View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 16,
  },
  cardContainer: {
    width: wp(92),
    height: hp(21),
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: wp(35),
    height: '100%',
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  propertyType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  occupied: {
    backgroundColor: '#E53935',
  },
  vacant: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewDetailsButton: {
    backgroundColor: '#E53935',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PropertyCard;
