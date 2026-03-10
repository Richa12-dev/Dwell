
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Box, VStack, HStack, Badge, Spinner, Pressable } from 'native-base';
import Toast from 'react-native-simple-toast';
import { useNavigation } from '@react-navigation/native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

import Container from '../../components/Container/Container';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { getFontFamily } from '../../utils';
import { Colors } from '../../Theme';
import { getLandlordTenants } from '../../Redux/Tenants/services';
import { tenantsSelectors } from '../../Redux/Tenants/tenantsSlice';

const TenantManagement = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const tenantsData = useSelector(tenantsSelectors.getTenantsData) || {};
  const {
    landlordTenants: tenants = [],
    loading = false,
    error = null,
    totalTenants = 0,
  } = tenantsData;

  const authData = useSelector(state => state?.loginData || state?.login || {});
  const authToken = authData?.accessToken || authData?.token || null;
  const landlordId = authData?.landlordId || authData?.userData?.landlordId || authData?.user?.landlordId || null;

  const isAuthenticated = Boolean(landlordId && authToken);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getLandlordTenants({ landlordId, token: authToken }));
    }
  }, [dispatch, landlordId, authToken, isAuthenticated]);

  const handleRefresh = useCallback(() => {
    if (isAuthenticated) {
      dispatch(getLandlordTenants({ landlordId, token: authToken }));
    } else {
      Toast.show('Please login again');
    }
  }, [dispatch, landlordId, authToken, isAuthenticated]);

  const statusCounts = useMemo(() => {
    const counts = { all: tenants.length, paid: 0, overdue: 0, pending: 0, inProgress: 0 };
    tenants.forEach(tenant => {
      const status = (tenant?.status || tenant?.payment_status || 'pending').toLowerCase();
      if (status === 'paid') counts.paid++;
      else if (status === 'overdue') counts.overdue++;
      else if (status === 'pending') counts.pending++;
      else if (status === 'in progress') counts.inProgress++;
    });
    return counts;
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    let filtered = tenants;

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(tenant => {
        const status = (tenant?.status || tenant?.payment_status || 'pending').toLowerCase();
        if (selectedFilter === 'inProgress') return status === 'in progress';
        return status === selectedFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tenant => {
        const name = (tenant?.name || tenant?.tenant_name || '').toLowerCase();
        const address = (tenant?.address || tenant?.property_address || '').toLowerCase();
        return name.includes(query) || address.includes(query);
      });
    }

    return filtered;
  }, [tenants, selectedFilter, searchQuery]);

  const getStatusColor = (status) => {
    const statusLower = (status || 'pending').toLowerCase();
    switch (statusLower) {
      case 'paid':
        return '#4CAF50';
      case 'overdue':
        return '#E53935';
      case 'pending':
        return '#FF9800';
      case 'in progress':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  const renderTenantCard = ({ item }) => {
    const status = item?.status || item?.payment_status || 'Pending';
    const tenantName = item?.name || item?.tenant_name || `${item?.firstName || ''} ${item?.lastName || ''}`.trim();
    const address = item?.address || item?.property_address || item?.property?.address || 'No address';
    const avatar = item?.avatar || item?.profile_image || item?.photo || null;

    return (
      <TouchableOpacity
        style={styles.tenantCard}
        onPress={() => {
          // Navigate to tenant details if needed
          Toast.show(`Viewing ${tenantName}`);
        }}
      >
        <HStack alignItems="center" space={3}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {tenantName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <VStack flex={1}>
            <Text style={styles.tenantName}>{tenantName}</Text>
            <Text style={styles.tenantAddress} numberOfLines={1}>
              {address}
            </Text>
          </VStack>

          <Badge
            bg={getStatusColor(status)}
            rounded="md"
            px={3}
            py={1}
            _text={{
              fontSize: 'xs',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            {status}
          </Badge>
        </HStack>
      </TouchableOpacity>
    );
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: statusCounts.all },
    { key: 'inProgress', label: 'In Progress', count: statusCounts.inProgress },
    { key: 'overdue', label: 'Overdue', count: statusCounts.overdue },
    { key: 'pending', label: 'Pending', count: statusCounts.pending },
    { key: 'paid', label: 'Paid', count: statusCounts.paid },
  ];

  if (!isAuthenticated) {
    return (
      <Container>
        <Box flex={1} justifyContent="center" alignItems="center" px={6}>
         <AppIcon name={icons.lock} size={64} color="#E53935" />

          <Text style={styles.errorTitle}>Authentication Required</Text>
          <Text style={styles.errorSubtitle}>
            Please login to view your tenants
          </Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container scroll={false}>
    
          {/* Header */}
      <HStack
     
        px={4}
        py={3}
        alignItems="center"
        justifyContent="flex-start"
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
                       <AppIcon name={icons.arrowBack} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Tenants</Text>
        <TouchableOpacity onPress={() => setShowFilterMenu(!showFilterMenu)}>
        
        </TouchableOpacity>
      </HStack>

      {/* Filter Menu */}
      {showFilterMenu && (
        <Box bg="white" shadow={2} p={2}>
          {filterOptions.map(option => (
            <Pressable
              key={option.key}
              onPress={() => {
                setSelectedFilter(option.key);
                setShowFilterMenu(false);
              }}
              style={styles.filterOption}
            >
              <HStack justifyContent="space-between" alignItems="center">
                <Text
                  style={[
                    styles.filterLabel,
                    selectedFilter === option.key && styles.filterLabelActive,
                  ]}
                >
                  {option.label} ({option.count})
                </Text>
               {selectedFilter === option.key && (
  <AppIcon name={icons.ok} size={18} color="#E53935" />
)}

              </HStack>
            </Pressable>
          ))}
        </Box>
      )}

      {/* Search Bar */}
      <Box bg="white" px={4} py={3}>
        <HStack
          bg="#F5F5F5"
          borderRadius={8}
          px={3}
          py={2}
          alignItems="center"
        >

          <TextInput
            style={styles.searchInput}
            placeholder="Search tenants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
        <AppIcon name={icons.close} size={18} />

            </TouchableOpacity>
          )}
        </HStack>
      </Box>

      {/* Tenants List */}
      <FlatList
        data={filteredTenants}
        keyExtractor={(item, index) =>
          String(item?.tenant_id || item?.id || item?.ID || index)
        }
        renderItem={renderTenantCard}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor="#E53935"
            colors={['#E53935']}
          />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Box alignItems="center" justifyContent="center" py={10}>
            {loading ? (
              <>
                <Spinner color="#E53935" size="lg" />
                <Text style={styles.loadingText}>Loading tenants...</Text>
              </>
            ) : (
              <>
            
                <Text style={styles.emptyTitle}>No tenants found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || selectedFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No tenants available'}
                </Text>
              </>
            )}
          </Box>
        }
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: wp(5),
    fontFamily: getFontFamily('bold'),
    color:Colors.black,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: wp(3.8),
    fontFamily: getFontFamily('regular'),
    color: Colors.black,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterLabel: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily('regular'),
    color: '#666',
  },
  filterLabelActive: {
    fontFamily: getFontFamily('bold'),
    color: '#E53935',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: hp(2),
  },
  tenantCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: wp(5),
    fontFamily: getFontFamily('bold'),
    color: 'white',
  },
  tenantName: {
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
  },
  tenantAddress: {
    fontSize: wp(3.2),
    fontFamily: getFontFamily('regular'),
    color: '#666',
    marginTop: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: wp(3.8),
    fontFamily: getFontFamily('regular'),
    color: '#666',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: wp(4.5),
    fontFamily: getFontFamily('bold'),
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('regular'),
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: wp(4.5),
    fontFamily: getFontFamily('bold'),
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('regular'),
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TenantManagement;
