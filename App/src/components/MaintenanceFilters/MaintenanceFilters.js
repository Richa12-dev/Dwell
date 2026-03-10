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
                const count = counts ? counts[option.value] : 0;
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
                        <Text style={{ fontSize: hp(1.9), color: isSelected ? '#E53935' : '#333' }}>
                          {option.label}
                        </Text>
                        <HStack space={2} alignItems="center">
                          {count !== undefined && (
                            <Badge
                              bg={isSelected ? 'red.100' : 'gray.200'}
                              rounded="full"
                              px={2}
                              py={0.5}
                              _text={{ fontSize: hp(1.5), color: isSelected ? '#E53935' : '#333' }}
                            >
                              {count}
                            </Badge>
                          )}
                          {isSelected && (
                            <AppIcon name={icons.checkCircle} size={wp(4)} color={Colors.red600} />
                          )}
                        </HStack>
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.glassCard}>
        <Box style={styles.filterButtonInner}>
          <HStack justifyContent="space-between" alignItems="center" space={wp(1)}>
            <Text fontSize={hp(1.8)} fontWeight="500" color="gray.700" numberOfLines={1}>
              {label}
            </Text>
            <AppIcon name={icons.arrowDown} size={wp(3)} color={Colors.black} />
          </HStack>
        </Box>
      </View>
    </TouchableOpacity>
  );

  // Prepare counts with 'all' option
  const statusCountsWithAll = {
    all: totalRequests,
    ...statusCounts,
  };

  const categoryCountsWithAll = {
    all: totalRequests,
    ...categoryCounts,
  };

  return (
    <VStack mx={wp(5.5)} mb={hp(1)}>
      {/* Filter Buttons */}
      <HStack
        alignItems="center"
        flexDirection="row"
        flexWrap="nowrap"
        space={wp(3)}
      >
        <AppIcon name={icons.progresses} size={wp(6)} />
        <FilterButton
          label="Status"
          onPress={() => setShowStatusModal(true)}
        />
        <FilterButton
          label="Category"
          onPress={() => setShowCategoryModal(true)}
        />
      </HStack>

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
    </VStack>
  );
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

export default MaintenanceFilters;
