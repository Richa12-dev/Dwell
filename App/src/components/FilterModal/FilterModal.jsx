import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { Dropdown } from 'react-native-element-dropdown';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';

const FilterModal = ({ visible, filters, onClose, onApply }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const statusData = [
    { label: 'All', value: 'All' },
    { label: 'Open', value: 'Open' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Closed', value: 'Closed' },
  ];

  const priorityData = [
    { label: 'All', value: 'All' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ];

  const levelData = [
    { label: 'All', value: 'All' },
    { label: 'Level 1', value: 'L1' },
    { label: 'Level 2', value: 'L2' },
  ];

  const handleApply = () => onApply(localFilters);

  const handleReset = () => {
    setLocalFilters({
      status: 'All',
      priority: 'All',
      level: 'All',
    });
  };

  const updateFilter = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalWrapper}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                {/* Handle bar */}
                <View style={styles.handleBar} />
                
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Filter Tickets</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                {/* Filters Container */}
                <View style={styles.filtersContainer}>
                  
                  {/* Status */}
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Status</Text>
                    <Dropdown
                      style={styles.dropdown}
                      containerStyle={styles.dropdownContainer}
                      data={statusData}
                      labelField="label"
                      valueField="value"
                      placeholder="Select Status"
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      itemTextStyle={styles.dropdownItemText}
                      value={localFilters.status}
                      onChange={(item) => updateFilter('status', item.value)}
                      renderRightIcon={() => <Text style={styles.dropdownIcon}>▼</Text>}
                      maxHeight={150}
                      dropdownPosition="auto"
                    />
                  </View>

                  {/* Priority Level */}
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Priority Level</Text>
                    <Dropdown
                      style={styles.dropdown}
                      containerStyle={styles.dropdownContainer}
                      data={priorityData}
                      labelField="label"
                      valueField="value"
                      placeholder="Select Priority Level"
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      itemTextStyle={styles.dropdownItemText}
                      value={localFilters.priority}
                      onChange={(item) => updateFilter('priority', item.value)}
                      renderRightIcon={() => <Text style={styles.dropdownIcon}>▼</Text>}
                      maxHeight={150}
                      dropdownPosition="auto"
                    />
                  </View>

                  {/* Support Level */}
                  <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Support Level</Text>
                    <Dropdown
                      style={styles.dropdown}
                      containerStyle={styles.dropdownContainer}
                      data={levelData}
                      labelField="label"
                      valueField="value"
                      placeholder="Select Support Level"
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      itemTextStyle={styles.dropdownItemText}
                      value={localFilters.level}
                      onChange={(item) => updateFilter('level', item.value)}
                      renderRightIcon={() => <Text style={styles.dropdownIcon}>▼</Text>}
                      maxHeight={150}
                      dropdownPosition="auto"
                    />
                  </View>

                </View>

                {/* Buttons Section */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleReset}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApply}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: hp(1),
    paddingBottom: Platform.OS === 'ios' ? hp(4) : hp(2),
  },
  handleBar: {
    width: wp(12),
    height: hp(0.5),
    backgroundColor: '#D1D5DB',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: hp(1.5),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontFamily: getFontFamily('bold'),
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: wp(8),
    height: wp(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: hp(4),
    color: '#6B7280',
    fontWeight: '300',
  },
  filtersContainer: {
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
  },
  filterRow: {
    marginBottom: hp(2),
  },
  filterLabel: {
    fontSize: hp(1.8),
    fontFamily: getFontFamily('semiBold'),
    fontWeight: '600',
    color: '#374151',
    marginBottom: hp(1),
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: '#FFFFFF',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: hp(0.5),
  },
  dropdownPlaceholder: {
    fontSize: hp(1.8),
    color: '#9CA3AF',
    fontFamily: getFontFamily('regular'),
  },
  dropdownSelectedText: {
    fontSize: hp(1.8),
    color: '#111827',
    fontFamily: getFontFamily('medium'),
  },
  dropdownItemText: {
    fontSize: hp(1.8),
    color: '#374151',
    fontFamily: getFontFamily('regular'),
    paddingVertical: hp(1),
  },
  dropdownIcon: {
    fontSize: hp(1.2),
    color: '#6B7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    gap: wp(3),
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: hp(1.8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: hp(1.9),
    fontFamily: getFontFamily('semiBold'),
    fontWeight: '600',
    color: '#374151',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: hp(1.8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: hp(1.9),
    fontFamily: getFontFamily('semiBold'),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FilterModal;
