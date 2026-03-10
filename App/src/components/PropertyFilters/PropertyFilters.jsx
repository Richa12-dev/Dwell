import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Box, Text, VStack, HStack, Badge } from 'native-base';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { Colors } from "../../Theme";

const PropertyFilters = ({
  activeTab,
  // Properties filters
  selectedPropertyType,
  onPropertyTypeChange,
  selectedAvailability,
  onAvailabilityChange,
  propertyTypeCounts = {},
  vacantCount = 0,
  occupiedCount = 0,
  // Tenants filters
  selectedTenantStatus,
  onTenantStatusChange,
  tenantStatusCounts = {},
}) => {
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showTenantStatusModal, setShowTenantStatusModal] = useState(false);

  const propertyTypes = [
   { label: 'All Properties', value: 'all' },
    { label: 'Apartment', value: 'apartment' },
    { label: 'Complex', value: 'complex' },
    { label: 'House', value: 'house' },
    { label: 'Villa', value: 'villa' },
    { label: 'Condo', value: 'condo' },
    { label: 'Townhouse', value: 'townhouse' },
    { label: 'Duplex', value: 'duplex' },
    { label: 'Studio', value: 'studio' },
    { label: 'Penthouse', value: 'penthouse' },
  ];

  const availabilityOptions = [
    { label: 'All', value: 'all' },
    { label: 'Vacant', value: 'vacant' },
    { label: 'Occupied', value: 'occupied' },
  ];

  const tenantStatusOptions = [
    { label: 'All Tenants', value: 'all' },
    { label: 'In Progress', value: 'in progress' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
  ];

  const FilterModal = ({ visible, onClose, title, options, selectedValue, onSelect, counts }) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <AppIcon name={icons.arrowDown} size={wp(5)} color={Colors.black} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: hp(50) }}>
            <VStack>
              {options.map((option, index) => {
                const isSelected = selectedValue === option.value;
                const count = counts ? counts[option.value] : undefined;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      onClose();
                    }}
                  >
                    <Box
                      bg={isSelected ? 'red.50' : 'white'}
                      px={4}
                      py={hp(1.8)}
                      borderBottomWidth={index < options.length - 1 ? 1 : 0}
                      borderBottomColor="gray.200"
                    >
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text style={{ fontSize: hp(1.9), color: isSelected ? 'red' : '#333' }}>
                          {option.label}
                        </Text>
                        {count !== undefined && (
                          <Badge
                            bg={isSelected ? 'red.100' : 'gray.200'}
                            rounded="full"
                            px={2}
                            py={0.5}
                            _text={{ fontSize: hp(1.5), color: isSelected ? 'red' : '#333' }}
                          >
                            {count}
                          </Badge>
                        )}
                        {isSelected && (
                          <AppIcon name={icons.checkCircle} size={wp(4)} color={Colors.red600} />
                        )}
                      </HStack>
                    </Box>
                  </TouchableOpacity>
                );
              })}
            </VStack>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const FilterButton = ({ label, onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} >
      <View style={styles.glassCard}>
        <Box style={styles.filterButtonInner}>
          <HStack justifyContent="space-between" alignItems="center"   space={wp(1)} >
            <Text fontSize={hp(1.8)} fontWeight="500" color="gray.700"  numberOfLines={1}>
              {label}
            </Text>
            <AppIcon name={icons.arrowDown} size={wp(3)} color={Colors.black} />
          </HStack>
        </Box>
      </View>
    </TouchableOpacity>
  );

  // Prepare counts for availability
  const availabilityCounts = {
    all: vacantCount + occupiedCount,
    vacant: vacantCount,
    occupied: occupiedCount,
  };

  // Prepare counts for property types
  const propertyTypeCountsWithAll = {
    all: Object.values(propertyTypeCounts).reduce((sum, count) => sum + count, 0),
    ...propertyTypeCounts,
  };

  // Prepare counts for tenant status
  const tenantStatusCountsWithAll = {
    all: Object.values(tenantStatusCounts).reduce((sum, count) => sum + count, 0),
    ...tenantStatusCounts,
  };

  // Render based on active tab
  if (activeTab === 'properties') {
    return (
      <VStack mx={wp(4.5)} mb={hp(0.5)}>
        {/* Properties Filter Buttons */}
        <HStack
        alignItems="center"
  flexDirection="row"
  flexWrap="nowrap"
  space={wp(1)}>
        <AppIcon name={icons.progresses} size={wp(6)} />
          <FilterButton
            label="Property Type"
            onPress={() => setShowTypeModal(true)}
          />
          <FilterButton
            label="Availability"
            onPress={() => setShowAvailabilityModal(true)}
          />
        </HStack>

        {/* Properties Filter Modals */}
        <FilterModal
          visible={showTypeModal}
          onClose={() => setShowTypeModal(false)}
          title="Select Property Type"
          options={propertyTypes}
          selectedValue={selectedPropertyType}
          onSelect={onPropertyTypeChange}
          counts={propertyTypeCountsWithAll}
        />
        <FilterModal
          visible={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
          title="Select Availability"
          options={availabilityOptions}
          selectedValue={selectedAvailability}
          onSelect={onAvailabilityChange}
          counts={availabilityCounts}
        />
      </VStack>
    );
  }

  if (activeTab === 'tenants') {
    return (
      <VStack mx={wp(4.5)} mb={hp(1)}>
        {/* Tenants Filter Button */}
        <HStack>
          <FilterButton
            label="Tenant Status"
            onPress={() => setShowTenantStatusModal(true)}
          />
        </HStack>

        {/* Tenants Filter Modal */}
        <FilterModal
          visible={showTenantStatusModal}
          onClose={() => setShowTenantStatusModal(false)}
          title="Filter by Status"
          options={tenantStatusOptions}
          selectedValue={selectedTenantStatus}
          onSelect={onTenantStatusChange}
          counts={tenantStatusCountsWithAll}
        />
      </VStack>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: wp(4),
    width: wp(90),
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  filterButtonInner: {
    padding: hp(1),
  },
});

export default PropertyFilters;
