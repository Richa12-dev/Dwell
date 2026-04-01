import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { RefreshControl, FlatList, StyleSheet, TouchableOpacity, View, Text, ActivityIndicator, Animated } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-simple-toast';
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
      await dispatch(deleteProperty({ propertyId, token: authToken, landlordId })).unwrap();
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
    { title: "Add New Property", icon: icons.newProperites, action: () => handleAddProperty() },
    { title: "Tenant Management", icon: icons.TenantManagement, action: () => navigation.navigate("TenantManagement") },
    { title: "Rent Collection", icon: icons.rentCollection, action: () => navigation.navigate("RentCollection") },
    { title: "Maintenance Request", icon: icons.mantenanceRequest, action: () => navigation.navigate("LandlordSupport") },
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
    const vacant = landlordProperties.filter(p => isPropertyAvailable(p)).length;
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

    const extractedTenants = [];
    landlordProperties.forEach(property => {
      if (property.tenant_ids && property.tenant_ids.length > 0) {
        property.tenant_ids.forEach((tenantId, index) => {
          const tenantName = property.tenant_names?.[index] || 'Unknown Tenant';
          const address = [property.street, property.city, property.state, property.zipcode]
            .filter(Boolean).join(', ') || 'No address';
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

  const filteredTenants = useMemo(() => {
    if (selectedTenantStatus === 'all') return formattedTenants;
    return formattedTenants.filter(tenant => {
      const tenantStatus = (tenant?.payment_status || 'pending').toLowerCase();
      return tenantStatus === selectedTenantStatus.toLowerCase();
    });
  }, [selectedTenantStatus, formattedTenants]);

  const currentLoading = activeTab === 'properties' ? loading : tenantsLoading;

  // Authentication Required
  if (!isAuthenticated) {
    return (
      <Container>
        <View style={styles.centerContainer}>
          <MaterialIcons name="lock-outline" size={64} color="#E53935" />
          <Text style={styles.errorTitle}>Authentication Required</Text>
          <Text style={styles.errorSubtitle}>
            Please login to view your {activeTab}
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

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
          renderItem={({ item }) =>
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
              <TenantCard tenant={item} onPress={() => handleTenantPress(item)} />
            )
          }
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
            <View style={styles.headerContainer}>
              {/* Quick Links */}
              <View style={styles.quickLinksContainer}>
                <Text style={styles.sectionTitle}>Quick Links</Text>
                <View style={styles.quickLinksRow}>
                  {quickLinks.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.linkCard} onPress={item.action}>
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
              <View style={styles.tabSwitcher}>
                {/* Sliding background */}
                <View
                  style={[
                    styles.tabSlider,
                    { left: activeTab === 'properties' ? 0 : '50%' },
                  ]}
                />
                {[
                  { key: 'properties', label: 'Properties', count: totalProperties || landlordProperties.length },
                  { key: 'tenants', label: 'Tenants', count: totalTenants || tenants.length },
                ].map(tab => {
                  const isActive = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={styles.tabItem}
                      onPress={() => setActiveTab(tab.key)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.tabInner}>
                        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                          {tab.label}
                        </Text>
                        <View style={[styles.tabBadge, isActive ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
                          <Text style={[styles.tabBadgeText, isActive ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive]}>
                            {tab.count}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

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
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {currentLoading ? (
                <>
                  <ActivityIndicator color="#E53935" size="large" />
                  <Text style={styles.loadingText}>
                    Loading {activeTab === 'properties' ? 'properties' : 'tenants'}...
                  </Text>
                </>
              ) : (
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
                      <TouchableOpacity
                        style={styles.clearFiltersBtn}
                        onPress={() => {
                          setSelectedPropertyType('all');
                          setSelectedAvailability('all');
                        }}
                      >
                        <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
                      </TouchableOpacity>
                    )}
                  {activeTab === 'tenants' && selectedTenantStatus !== 'all' && (
                    <TouchableOpacity
                      style={styles.clearFiltersBtn}
                      onPress={() => setSelectedTenantStatus('all')}
                    >
                      <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          }
        />
      </Container>

      {activeTab === 'properties' && (
        <TouchableOpacity style={styles.fabButton} onPress={handleAddProperty}>
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
        <AddPropertiesScreen onClose={handleCloseModal} propertyData={editPropertyData} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: hp(12),
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  quickLinksContainer: {
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  sectionTitle: {
    fontSize: wp(4.5),
    fontWeight: "bold",
    fontFamily: getFontFamily("Semibold"),
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
    borderColor: Colors.lightRed,
    borderWidth: 1.5,
  },
  linkText: {
    fontSize: wp(3),
    fontFamily: getFontFamily("medium"),
    textAlign: "center",
    color: Colors.black,
  },
  // Tab Switcher
  tabSwitcher: {
    width: 370,
    height: 50,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.7)",
    flexDirection: "row",
    alignSelf: "center",
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  tabSlider: {
    position: "absolute",
    top: 0,
    width: "50%",
    height: "100%",
    backgroundColor: "#E53935",
    borderRadius: 100,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tabBadgeActive: {
    backgroundColor: "#FFFFFF",
  },
  tabBadgeInactive: {
    backgroundColor: "#D1D5DB",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  tabBadgeTextActive: {
    color: "#E53935",
  },
  tabBadgeTextInactive: {
    color: "#4B5563",
  },
  // Auth / Empty / Loading
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(10),
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
  loginBtn: {
    marginTop: 24,
    backgroundColor: "#E53935",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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
  clearFiltersBtn: {
    marginTop: 16,
    backgroundColor: "#E53935",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
});

export default LandlordDashboardView;
