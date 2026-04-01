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

const MaintenanceFilters = ({
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  statusCounts = {},
  categoryCounts = {},
  totalRequests = 0,
}) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in progress' },
    { label: 'Completed', value: 'completed' },
  ];

  const categoryOptions = [
    { label: 'All Categories', value: 'all' },
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'Electrical', value: 'electrical' },
    { label: 'Carpentry', value: 'carpentry' },
    { label: 'Painting', value: 'painting' },
    { label: 'HVAC', value: 'hvac' },
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Landscaping', value: 'landscaping' },
    { label: 'Appliances', value: 'appliances' },
    { label: 'Other', value: 'other' },
  ];

  const CountBadge = ({ count, isSelected }) => (
    <View style={[styles.badge, isSelected ? styles.badgeSelected : styles.badgeDefault]}>
      <Text style={[styles.badgeText, { color: isSelected ? '#E53935' : '#333' }]}>
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
              const count = counts ? counts[option.value] : 0;
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
                    <Text style={[styles.optionText, { color: isSelected ? '#E53935' : '#333' }]}>
                      {option.label}
                    </Text>
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

  const statusCountsWithAll = {
    all: totalRequests,
    ...statusCounts,
  };

  const categoryCountsWithAll = {
    all: totalRequests,
    ...categoryCounts,
  };

  return (
    <View style={[styles.vstack, { marginHorizontal: wp(5.5), marginBottom: hp(1) }]}>

      {/* Filter Buttons */}
      <View style={styles.hstackRow}>
        <AppIcon name={icons.progresses} size={wp(6)} />
        <FilterButton
          label="Status"
          onPress={() => setShowStatusModal(true)}
        />
        <FilterButton
          label="Category"
          onPress={() => setShowCategoryModal(true)}
        />
      </View>

      {/* Status Filter Modal */}
      <FilterModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Filter by Status"
        options={statusOptions}
        selectedValue={selectedStatus}
        onSelect={onStatusChange}
        counts={statusCountsWithAll}
      />

      {/* Category Filter Modal */}
      <FilterModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Filter by Category"
        options={categoryOptions}
        selectedValue={selectedCategory}
        onSelect={onCategoryChange}
        counts={categoryCountsWithAll}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  vstack: {
    flexDirection: 'column',
  },
  hstackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: wp(3),
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
  optionText: {
    fontSize: hp(1.9),
    flex: 1,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
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

export default MaintenanceFilters;
