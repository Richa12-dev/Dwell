import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { RefreshControl, FlatList, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-simple-toast';
import { Box, VStack, HStack, Button, Badge, Spinner, Pressable } from 'native-base';
import Modal from 'react-native-modal';
import { Colors } from '../../Theme';
import { getLandlordProperties, deleteProperty } from '../../Redux/Properties/services';
import { propertiesSelectors } from '../../Redux/Properties/propertiesSlice';
import { getLandlordTenants } from '../../Redux/Tenants/services';
import { tenantsSelectors } from '../../Redux/Tenants/tenantsSlice';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Container from '../../components/Container/Container';
import PropertyFilters from '../../components/PropertyFilters/PropertyFilters';
import AddPropertiesScreen from '../Properties/AddPropertiesScreen';
import PropertyCard from '../../components/PropertyCard/PropertyCard';
import TenantCard from '../../components/TenantCard/TenantCard';
import StatisticsHeader from '../../components/StatisticsHeader/StatisticsHeader';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { getFontFamily } from "../../utils";

const LandlordDashboardView = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [showModal, setShowModal] = useState(false);
  const [editPropertyData, setEditPropertyData] = useState(null);
  const [activeTab, setActiveTab] = useState('properties');
  const [favorites, setFavorites] = useState([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [selectedTenantStatus, setSelectedTenantStatus] = useState('all');

  const propertiesData = useSelector(propertiesSelectors.getPropertiesData) || {};
  const {
    landlordProperties = [],
    loading = false,
    error = null,
    totalProperties = 0,
  } = propertiesData;

  const tenantsData = useSelector(tenantsSelectors.getTenantsData) || {};
  const {
    landlordTenants: tenants = [],
    loading: tenantsLoading = false,
    error: tenantsError = null,
    totalTenants = 0,
  } = tenantsData;

  const authData = useSelector(state => state?.loginData || state?.login || {});
  const authToken = authData?.accessToken || authData?.token || null;
  const landlordId = authData?.landlordId || authData?.userData?.landlordId || authData?.user?.landlordId || null;

  const isAuthenticated = Boolean(landlordId && authToken);
  const hasProperties = landlordProperties.length > 0;
  const hasTenants = tenants.length > 0;

  useEffect(() => {
    if (landlordId && authToken) {
      dispatch(getLandlordProperties({ landlordId, token: authToken }));
      dispatch(getLandlordTenants({ landlordId, token: authToken }));
    }
  }, [dispatch, landlordId, authToken]);

  const handleRefresh = useCallback(() => {
    if (isAuthenticated) {
      dispatch(getLandlordProperties({ landlordId, token: authToken }));
      dispatch(getLandlordTenants({ landlordId, token: authToken }));
    } else {
      Toast.show('Please login again');
    }
  }, [dispatch, landlordId, authToken, isAuthenticated]);

  const handleAddProperty = () => {
    setEditPropertyData(null);
    setShowModal(true);
  };

  const handleViewDetails = property => {
    navigation.navigate('PropertiesDetails', { property });
  };

  const handleEdit = property => {
    setEditPropertyData(property);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditPropertyData(null);
    handleRefresh();
  };

  const handleDeleteProperty = async (property) => {
    if (!isAuthenticated) {
      Toast.show('Please login again');
      return;
    }
    
    const propertyId = property?.property_id || property?.propertyId || property?.id || property?.ID;
    
    if (!propertyId) {
      Toast.show('Invalid property ID');
      return;
    }

    try {
      await dispatch(deleteProperty({
        propertyId,
        token: authToken,
        landlordId
      })).unwrap();
      
      Toast.show('Property deleted successfully');
      handleRefresh();
    } catch (err) {
      Toast.show(err?.message || err || 'Failed to delete property');
    }
  };

  const handleToggleFavorite = id => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const quickLinks = [
    {
      title: "Add New Property",
      icon: icons.newProperites,
      action: () => handleAddProperty(),

    },
    {
      title: "Tenant Management",
      icon: icons.TenantManagement,
      action: () => navigation.navigate("TenantManagement"),
    },
    {
      title: "Rent Collection",
      icon: icons.rentCollection,
      action: () => navigation.navigate("RentCollection"),
    },
    {
      title: "Maintenance Request",
      icon: icons.mantenanceRequest,
      action: () => navigation.navigate("LandlordSupport"),
    },
  ];

  const handleTenantPress = (tenant) => {
    console.log('Tenant pressed:', tenant);
  };

  const propertyTypeCounts = useMemo(() => {
    return landlordProperties.reduce((acc, prop) => {
      const type = (prop?.property_type || 'Other').toLowerCase();
      const displayType = type.charAt(0).toUpperCase() + type.slice(1);
      acc[displayType] = (acc[displayType] || 0) + 1;
      return acc;
    }, {});
  }, [landlordProperties]);
  
  const isPropertyAvailable = (p) => {
    const availability = (p?.availability || '').toLowerCase();
    if (availability === "available") return true;
    if (availability === "occupied") return false;
    return true;
  };

  const availabilityCounts = useMemo(() => {
    const vacant = landlordProperties.filter(
      p => isPropertyAvailable(p)
    ).length;
    const occupied = landlordProperties.length - vacant;
    return { vacant, occupied };
  }, [landlordProperties]);

  const tenantStatusCounts = useMemo(() => {
    return tenants.reduce((acc, tenant) => {
      const status = (tenant?.status || tenant?.payment_status || 'pending').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [tenants]);

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = landlordProperties.filter(prop => {
      const propType = (prop?.property_type || '').toLowerCase();
      const selectedType = (selectedPropertyType || 'all').toLowerCase();
      const typeMatch = selectedType === 'all' || propType === selectedType;

      const isAvailable = isPropertyAvailable(prop);

      const availMatch =
        selectedAvailability === 'all' ||
        (selectedAvailability === 'vacant' && isAvailable) ||
        (selectedAvailability === 'occupied' && !isAvailable);

      return typeMatch && availMatch;
    });

    return filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [landlordProperties, selectedPropertyType, selectedAvailability]);


const formattedTenants = useMemo(() => {
  // If you have a separate tenants array from API, use it
  if (tenants && tenants.length > 0) {
    return tenants.map(tenant => ({
      tenant_id: tenant?.tenant_id || tenant?.id,
      tenant_name: tenant?.name || tenant?.tenant_name ||
                   `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim(),
      property_address: tenant?.address || tenant?.property_address ||
                       tenant?.property?.address || 'No address',
      payment_status: tenant?.status || tenant?.payment_status || 'Pending',
      avatar: tenant?.avatar || tenant?.profile_image || tenant?.photo || null,
    }));
  }

  // Fallback: Extract tenants from properties if no separate tenants data
  const extractedTenants = [];
  landlordProperties.forEach(property => {
    if (property.tenant_ids && property.tenant_ids.length > 0) {
      property.tenant_ids.forEach((tenantId, index) => {
        const tenantName = property.tenant_names?.[index] || 'Unknown Tenant';
        const address = [
          property.street,
          property.city,
          property.state,
          property.zipcode
        ].filter(Boolean).join(', ') || 'No address';

        extractedTenants.push({
          tenant_id: tenantId,
          tenant_name: tenantName,
          property_address: address,
          payment_status: property.availability === 'occupied' ? 'Paid' : 'Pending',
          avatar: null,
        });
      });
    }
  });

  return extractedTenants;
}, [tenants, landlordProperties]);

// Update the filteredTenants useMemo to use formattedTenants
const filteredTenants = useMemo(() => {
  if (selectedTenantStatus === 'all') return formattedTenants;
  return formattedTenants.filter(tenant => {
    const tenantStatus = (tenant?.payment_status || 'pending').toLowerCase();
    return tenantStatus === selectedTenantStatus.toLowerCase();
  });
}, [selectedTenantStatus, formattedTenants]);
  const currentLoading = activeTab === 'properties' ? loading : tenantsLoading;
  const hasData = activeTab === 'properties' ? hasProperties : hasTenants;

  // Authentication Required (only show if not authenticated)
  if (!isAuthenticated) {
    return (
      <Container>
        <Box flex={1} justifyContent="center" alignItems="center" px={6}>
          <MaterialIcons name="lock-outline" size={64} color="#E53935" />
          <Text style={styles.errorTitle}>Authentication Required</Text>
          <Text style={styles.errorSubtitle}>
            Please login to view your {activeTab}
          </Text>
          <Button mt={6} bg="#E53935" onPress={() => navigation.navigate('Login')} px={8}>
            Login
          </Button>
        </Box>
      </Container>
    );
  }

  // Always render the main content - no full-screen loaders
  return (
    <View style={{ flex: 1 }}>
      <Container scroll={false}>
        <FlatList
          data={activeTab === 'properties' ? filteredAndSortedProperties : filteredTenants}
          keyExtractor={(item, index) => {
            if (activeTab === 'properties') {
              return String(item?.property_id || item?.propertyId || item?.id || item?.ID || index);
            }
            return String(item?.tenant_id || item?.id || item?.ID || index);
          }}
          renderItem={({ item }) => (
            activeTab === 'properties' ? (
              <PropertyCard
                property={item}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteProperty}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.includes(item?.property_id || item?.propertyId || item?.id || item?.ID)}
              />
            ) : (
              <TenantCard
                tenant={item}
                onPress={() => handleTenantPress(item)}
              />
            )
          )}
          refreshControl={
            <RefreshControl
              refreshing={currentLoading}
              onRefresh={handleRefresh}
              tintColor="#E53935"
              colors={["#E53935"]}
            />
          }
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <VStack space={4} mb={4}>
              {/* Quick Links */}
              <View style={styles.quickLinksContainer}>
                <Text style={styles.sectionTitle}>Quick Links</Text>
                <View style={styles.quickLinksRow}>
                  {quickLinks.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.linkCard}
                      onPress={item.action}
                    >
                      <View style={styles.iconCircle}>
                        <AppIcon name={item.icon} size={wp(8)} />
                      </View>
                      <Text style={styles.linkText}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Properties List Title */}
              <Text style={styles.sectionTitle}>Properties List</Text>

              {/* Statistics Header */}
              <StatisticsHeader
                totalProperties={totalProperties || landlordProperties.length}
                vacantCount={availabilityCounts.vacant}
                occupiedCount={availabilityCounts.occupied}
              />
              
              {/* Tab Switcher */}
              <Box
                width={370}
                height={50}
                borderRadius={100}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.3)"
                bg="rgba(255,255,255,0.7)"
                flexDirection="row"
                alignSelf="center"
                overflow="hidden"
                mb={4}
              >
                <Box
                  position="absolute"
                  top={0}
                  left={activeTab === 'properties' ? 0 : '50%'}
                  width="50%"
                  height="100%"
                  bg="#E53935"
                  borderRadius={100}
                />

                {[
                  { key: 'properties', label: 'Properties', count: totalProperties || landlordProperties.length },
                  { key: 'tenants', label: 'Tenants', count: totalTenants || tenants.length },
                ].map(tab => {
                  const isActive = activeTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      flex={1}
                      onPress={() => setActiveTab(tab.key)}
                      style={{ justifyContent: 'center', alignItems: 'center' }}
                    >
                      <HStack alignItems="center" space={1}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color={isActive ? "white" : "gray.600"}
                        >
                          {tab.label}
                        </Text>
                        <Badge
                          bg={isActive ? "white" : "gray.300"}
                          rounded="full"
                          px={3}
                          _text={{
                            fontSize: "xs",
                            fontWeight: "bold",
                            color: isActive ? "#E53935" : "gray.600"
                          }}
                        >
                          {tab.count}
                        </Badge>
                      </HStack>
                    </Pressable>
                  );
                })}
              </Box>

              {/* Filters */}
              <PropertyFilters
                activeTab={activeTab}
                selectedPropertyType={selectedPropertyType}
                onPropertyTypeChange={setSelectedPropertyType}
                selectedAvailability={selectedAvailability}
                onAvailabilityChange={setSelectedAvailability}
                propertyTypeCounts={propertyTypeCounts}
                vacantCount={availabilityCounts.vacant}
                occupiedCount={availabilityCounts.occupied}
                selectedTenantStatus={selectedTenantStatus}
                onTenantStatusChange={setSelectedTenantStatus}
                tenantStatusCounts={tenantStatusCounts}
              />
            </VStack>
          }
          ListEmptyComponent={
            <Box alignItems="center" justifyContent="center" py={10}>
              {currentLoading ? (
                // Show loading state in empty component
                <>
                  <Spinner color="#E53935" size="lg" />
                  <Text style={styles.loadingText}>
                    Loading {activeTab === 'properties' ? 'properties' : 'tenants'}...
                  </Text>
                </>
              ) : (
                // Show empty state
                <>
                  <MaterialIcons
                    name={activeTab === 'properties' ? 'home-work' : 'people-outline'}
                    size={80}
                    color="#E0E0E0"
                  />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'properties' ? 'No properties found' : 'No tenants found'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'properties'
                      ? (selectedPropertyType !== 'all' || selectedAvailability !== 'all'
                          ? 'Try adjusting your filters to see more results'
                          : 'Add your first property to get started')
                      : (selectedTenantStatus !== 'all'
                          ? 'Try adjusting your filters to see more results'
                          : 'No tenants available at the moment')
                    }
                  </Text>
                  {activeTab === 'properties' &&
                   (selectedPropertyType !== 'all' || selectedAvailability !== 'all') && (
                    <Button
                      mt={4}
                      bg="#E53935"
                      onPress={() => {
                        setSelectedPropertyType('all');
                        setSelectedAvailability('all');
                      }}
                      _text={{ fontSize: "sm", fontWeight: "600" }}
                    >
                      Clear Filters
                    </Button>
                  )}
                  {activeTab === 'tenants' && selectedTenantStatus !== 'all' && (
                    <Button
                      mt={4}
                      bg="#E53935"
                      onPress={() => setSelectedTenantStatus('all')}
                      _text={{ fontSize: "sm", fontWeight: "600" }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </>
              )}
            </Box>
          }
        />
      </Container>

      {activeTab === 'properties' && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleAddProperty}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal
        isVisible={showModal}
        onBackdropPress={handleCloseModal}
        style={{ margin: 0 }}
        animationIn="slideInRight"
        animationOut="slideOutRight"
        backdropOpacity={0.5}
      >
        <AddPropertiesScreen
          onClose={handleCloseModal}
          propertyData={editPropertyData}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
   // paddingTop: hp(2),
    paddingBottom: hp(12),
    paddingHorizontal: 16,
    
  },
  quickLinksContainer: {
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  sectionTitle: {
    fontSize: wp(4.5),
    fontFamily: getFontFamily("bold"),
    color: Colors.black,
    marginBottom: hp(0.5),
  },
  quickLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  linkCard: {
    width: wp(20),
    alignItems: "center",
    marginBottom: hp(1),
  },
  iconCircle: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    backgroundColor: "#FFF4F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp(0.5),
    shadowColor: "#E53935",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  linkText: {
    fontSize: wp(3),
    fontFamily: getFontFamily("medium"),
    textAlign: "center",
    color: Colors.black,
  },
  fabButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fabText: {
    color: 'white',
    fontSize: 28,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default LandlordDashboardView;
