import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';

const PropertyFilters = ({
  activeTab,
  selectedPropertyType,
  onPropertyTypeChange,
  selectedAvailability,
  onAvailabilityChange,
  propertyTypeCounts = {},
  vacantCount = 0,
  occupiedCount = 0,
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

  // Badge — replaces NativeBase <Badge>
  const CountBadge = ({ count, isSelected }) => (
    <View style={[styles.badge, isSelected ? styles.badgeSelected : styles.badgeDefault]}>
      <Text style={[styles.badgeText, { color: isSelected ? 'red' : '#333' }]}>
        {count}
      </Text>
    </View>
  );

  const FilterModal = ({ visible, onClose, title, options, selectedValue, onSelect, counts }) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <AppIcon name={icons.arrowDown} size={wp(5)} color={Colors.black} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: hp(50) }}>
            {options.map((option, index) => {
              const isSelected = selectedValue === option.value;
              const count = counts ? counts[option.value] : undefined;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}>
                  <View
                    style={[
                      styles.optionRow,
                      { backgroundColor: isSelected ? '#fff5f5' : 'white' },
                      index < options.length - 1 && styles.optionBorder,
                    ]}>
                    <View style={styles.optionLeft}>
                      <Text style={[styles.optionText, { color: isSelected ? 'red' : '#333' }]}>
                        {option.label}
                      </Text>
                    </View>
                    <View style={styles.optionRight}>
                      {count !== undefined && (
                        <CountBadge count={count} isSelected={isSelected} />
                      )}
                      {isSelected && (
                        <AppIcon name={icons.checkCircle} size={wp(4)} color={Colors.red600} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );

  const FilterButton = ({ label, onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.glassCard}>
        <View style={styles.filterButtonInner}>
          <View style={styles.filterButtonRow}>
            <Text style={styles.filterButtonLabel} numberOfLines={1}>
              {label}
            </Text>
            <AppIcon name={icons.arrowDown} size={wp(3)} color={Colors.black} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const availabilityCounts = {
    all: vacantCount + occupiedCount,
    vacant: vacantCount,
    occupied: occupiedCount,
  };

  const propertyTypeCountsWithAll = {
    all: Object.values(propertyTypeCounts).reduce((sum, count) => sum + count, 0),
    ...propertyTypeCounts,
  };

  const tenantStatusCountsWithAll = {
    all: Object.values(tenantStatusCounts).reduce((sum, count) => sum + count, 0),
    ...tenantStatusCounts,
  };

  if (activeTab === 'properties') {
    return (
      <View style={[styles.vstack, { marginHorizontal: wp(4.5), marginBottom: hp(0.5) }]}>
        <View style={styles.hstackRow}>
          <AppIcon name={icons.progresses} size={wp(6)} />
          <FilterButton
            label="Property Type"
            onPress={() => setShowTypeModal(true)}
          />
          <FilterButton
            label="Availability"
            onPress={() => setShowAvailabilityModal(true)}
          />
        </View>

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
      </View>
    );
  }

  if (activeTab === 'tenants') {
    return (
      <View style={[styles.vstack, { marginHorizontal: wp(4.5), marginBottom: hp(1) }]}>
        <View style={styles.hstackRow}>
          <FilterButton
            label="Tenant Status"
            onPress={() => setShowTenantStatusModal(true)}
          />
        </View>

        <FilterModal
          visible={showTenantStatusModal}
          onClose={() => setShowTenantStatusModal(false)}
          title="Filter by Status"
          options={tenantStatusOptions}
          selectedValue={selectedTenantStatus}
          onSelect={onTenantStatusChange}
          counts={tenantStatusCountsWithAll}
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  vstack: {
    flexDirection: 'column',
  },
  hstackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: wp(1),
  },
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  optionLeft: {
    flex: 1,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  optionText: {
    fontSize: hp(1.9),
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: wp(2),
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: '#fee2e2',
  },
  badgeDefault: {
    backgroundColor: '#e5e5e5',
  },
  badgeText: {
    fontSize: hp(1.5),
    fontWeight: '500',
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
  filterButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: wp(1),
  },
  filterButtonLabel: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#374151',
  },
});

export default PropertyFilters;
