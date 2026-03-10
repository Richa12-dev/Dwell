
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Box, VStack, HStack, Badge, Spinner } from 'native-base';
import Toast from 'react-native-simple-toast';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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

const RentCollection = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

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

  const rentCollections = useMemo(() => {
    return tenants.map(tenant => ({
      tenant_id: tenant?.tenant_id || tenant?.id,
      tenant_name: tenant?.name || tenant?.tenant_name ||
                   `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim(),
      property_address: tenant?.address || tenant?.property_address ||
                       tenant?.property?.address || '909-1/2 E 49th LA, (CA)..',
      due_date: tenant?.due_date || tenant?.rent_due_date || '8 Oct, 2025',
      paid_date: tenant?.paid_date || tenant?.rent_paid_date || '10 Oct, 2025',
      rent_status: tenant?.status || tenant?.payment_status || 'Paid',
      payment_mode: tenant?.payment_mode || tenant?.payment_method || 'Bank Transfer',
      monthly_rent: tenant?.monthly_rent || tenant?.rent_amount || '$2600',
      avatar: tenant?.avatar || tenant?.profile_image || tenant?.photo || null,
    }));
  }, [tenants]);

  const getStatusColor = (status) => {
    const statusLower = (status || 'pending').toLowerCase();
    switch (statusLower) {
      case 'paid':
        return '#4CAF50';
      case 'overdue':
        return '#E53935';
      case 'pending':
        return '#FF9800';
      default:
        return '#999';
    }
  };

  const renderRentCard = ({ item }) => {
    return (
      <View style={styles.rentCard}>
        <HStack alignItems="center" space={3} mb={3}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.tenant_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <VStack flex={1}>
            <Text style={styles.tenantName}>{item.tenant_name}</Text>
            <Text style={styles.propertyAddress} numberOfLines={1}>
              {item.property_address}
            </Text>
          </VStack>
        </HStack>

        <HStack justifyContent="space-between" mb={2}>
          <VStack flex={1}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{item.due_date}</Text>
          </VStack>
          <VStack flex={1}>
            <Text style={styles.label}>Paid Date</Text>
            <Text style={styles.value}>{item.paid_date}</Text>
          </VStack>
          <VStack flex={1} alignItems="flex-end">
            <Text style={styles.label}>Rent Status</Text>
            <Badge
              bg={getStatusColor(item.rent_status)}
              rounded="md"
              px={2}
              py={0.5}
              _text={{
                fontSize: 'xs',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {item.rent_status}
            </Badge>
          </VStack>
        </HStack>

        <HStack justifyContent="space-between">
          <VStack flex={1}>
            <Text style={styles.label}>Payment Mode</Text>
            <Text style={styles.value}>{item.payment_mode}</Text>
          </VStack>
          <VStack flex={1} alignItems="flex-end">
            <Text style={styles.label}>Monthly Rent</Text>
            <Text style={styles.rentAmount}>{item.monthly_rent}</Text>
          </VStack>
        </HStack>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <Container>
        <Box flex={1} justifyContent="center" alignItems="center" px={6}>
          <MaterialIcons name="lock-outline" size={64} color="#E53935" />
          <Text style={styles.errorTitle}>Authentication Required</Text>
          <Text style={styles.errorSubtitle}>
            Please login to view rent collection
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
        <Text style={styles.headerTitle}>Rent Collection</Text>
        <View style={{ width: 24 }} />
      </HStack>

      {/* Subtitle */}
      <Box bg="white" px={4} py={3}>
        <Text style={styles.subtitle}>List of previous month rent collection</Text>
      </Box>

      {/* Rent Collection List */}
      <FlatList
        data={rentCollections}
        keyExtractor={(item, index) =>
          String(item?.tenant_id || item?.id || index)
        }
        renderItem={renderRentCard}
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
                <Text style={styles.loadingText}>Loading rent collection...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="receipt-long" size={80} color="#E0E0E0" />
                <Text style={styles.emptyTitle}>No rent collection records</Text>
                <Text style={styles.emptySubtitle}>
                  Rent collection data will appear here
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
  subtitle: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('regular'),
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: hp(2),
  },
  rentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: wp(4.2),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
  },
  propertyAddress: {
    fontSize: wp(3.2),
    fontFamily: getFontFamily('regular'),
    color: '#666',
    marginTop: 2,
  },
  label: {
    fontSize: wp(3),
    fontFamily: getFontFamily('regular'),
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('semibold'),
    color: Colors.black,
  },
  rentAmount: {
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
    color: '#E53935',
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

export default RentCollection;
