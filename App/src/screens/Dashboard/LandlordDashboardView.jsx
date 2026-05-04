import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  RefreshControl, FlatList, StyleSheet, TouchableOpacity,
  View, Text, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-simple-toast';
import Modal from 'react-native-modal';
import { Colors } from '../../Theme';
import { getLandlordProperties, deleteProperty } from '../../Redux/Properties/servicesNode';
import { propertiesSelectors } from '../../Redux/Properties/propertiesSlice';
import { tenantsSelectors } from '../../Redux/Tenants/tenantsSlice';

import { getPropertyTenants } from '../../Redux/Tenants/services';

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
import { fetchSignedUrl } from "../../commonFunction/useSignedImageUrls";

// ─────────────────────────────────────────────────────────────
// PropertyCardWrapper — resolves signed thumbnail per card
// ─────────────────────────────────────────────────────────────
const PropertyCardWrapper = React.memo(({
  property, token,
  onViewDetails, onEdit, onDelete, onToggleFavorite, isFavorite,
}) => {
  const [signedThumb, setSignedThumb] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const images = property?.images || property?.image_urls || [];
    const first = images.find(i => typeof i === 'string' && i.trim());
    if (!first || !token) { setSignedThumb(null); return; }

    if (first.includes('X-Amz-Algorithm')) { setSignedThumb(first); return; }

    let key = null;

    const doubleMatch = first.match(/uploads\/https?%3A\/\/|uploads\/https?:\/\//i);
    if (doubleMatch) {
      const inner = decodeURIComponent(first.substring(doubleMatch.index + 'uploads/'.length));
      const m = inner.match(/\.amazonaws\.com\/(.+)/);
      key = m ? m[1].split('?')[0] : null;
    }

    if (!key) {
      const s3Match = first.match(/\.amazonaws\.com\/(.+)/);
      if (s3Match) key = s3Match[1].split('?')[0];
    }

    if (!key && !first.startsWith('http')) key = first;
    if (key) key = key.replace(/^uploads\//, '');
    if (!key) { setSignedThumb(null); return; }

    fetchSignedUrl(key, token)
      .then(url => { if (!cancelled) setSignedThumb(url); })
      .catch(() => { if (!cancelled) setSignedThumb(null); });

    return () => { cancelled = true; };
  }, [JSON.stringify(property?.images || property?.image_urls || []), token]);

  const propertyWithSignedImage = useMemo(() => {
    if (!signedThumb) return property;
    return { ...property, images: [signedThumb], image_urls: [signedThumb] };
  }, [property, signedThumb]);

  return (
    <PropertyCard
      property={propertyWithSignedImage}
      onViewDetails={onViewDetails}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleFavorite={onToggleFavorite}
      isFavorite={isFavorite}
    />
  );
});

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const LandlordDashboardView = () => {
  const dispatch   = useDispatch();
  const navigation = useNavigation();

  const [showModal,            setShowModal]            = useState(false);
  const [editPropertyData,     setEditPropertyData]     = useState(null);
  const [activeTab,            setActiveTab]            = useState('properties');
  const [favorites,            setFavorites]            = useState([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [selectedTenantStatus, setSelectedTenantStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Properties from Redux ────────────────────────────────────────────────
  const propertiesData = useSelector(propertiesSelectors.getPropertiesData) || {};
  const {
    landlordProperties = [],
    loading            = false,
    totalProperties    = 0,
  } = propertiesData;

  // ── Tenants from Redux (TENANTS slice — same slice TenantManagement reads) ─
  const tenantsData = useSelector(tenantsSelectors.getTenantsData) || {};
  const {
    landlordTenants: tenants = [],
    loading: tenantsLoading  = false,
    totalTenants             = 0,
  } = tenantsData;

  // ── Auth ─────────────────────────────────────────────────────────────────
  const authData        = useSelector(state => state?.loginData || {});
  const authToken       = authData?.accessToken || null;
  const landlordId      = authData?.userData?.landlordId || null;
  const isAuthenticated = Boolean(authToken && landlordId);

  // ── Fetch on mount ───────────────────────────────────────────────────────
  // ✅ FIX: dispatch getPropertyTenants → writes to tenantsSlice.landlordTenants
  //    This is the exact same thunk TenantManagement.jsx dispatches, so Redux
  //    already has the data when the user opens the Tenants tab or navigates
  //    to TenantManagement — no extra network call needed.
  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(getLandlordProperties({ token: authToken }));
    dispatch(getPropertyTenants({ landlordId, token: authToken }));
  }, [dispatch, landlordId, authToken, isAuthenticated]);

  // ── Refresh ──────────────────────────────────────────────────────────────
 const handleRefresh = useCallback(async () => {
  if (!isAuthenticated) { Toast.show('Please login again'); return; }
  setIsRefreshing(true);
  try {
    await Promise.all([
      dispatch(getLandlordProperties({ token: authToken })).unwrap(),
      dispatch(getPropertyTenants({ landlordId, token: authToken })).unwrap(),
    ]);
  } catch (_) {
    // errors are handled in thunks
  } finally {
    setIsRefreshing(false);
  }
}, [dispatch, landlordId, authToken, isAuthenticated]);

  const handleAddProperty    = () => { setEditPropertyData(null); setShowModal(true); };
  const handleCloseModal     = () => { setShowModal(false); setEditPropertyData(null); handleRefresh(); };
  const handleToggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleViewDetails = useCallback((property) => {
    const propertyId = property?.property_id || property?.id || property?.propertyId;
    navigation.navigate('PropertiesDetails', { propertyId });
  }, [navigation]);

  const handleEdit = (property) => { setEditPropertyData(property); setShowModal(true); };

  const handleDeleteProperty = async (property) => {
    if (!isAuthenticated) { Toast.show('Please login again'); return; }
    const propertyId = property?.property_id || property?.propertyId || property?.id;
    if (!propertyId) { Toast.show('Invalid property ID'); return; }
    try {
      await dispatch(deleteProperty({ propertyId, token: authToken, landlordId })).unwrap();
      Toast.show('Property deleted successfully');
      handleRefresh();
    } catch (err) {
      Toast.show(err?.message || err || 'Failed to delete property');
    }
  };

  const handleTenantPress = (tenant) => { console.log('Tenant pressed:', tenant); };

  const quickLinks = [
    { title: "Add New Property",    icon: icons.newProperites,     action: handleAddProperty },
    { title: "Tenant Management",   icon: icons.TenantManagement,  action: () => navigation.navigate("TenantManagement") },
    { title: "Rent Collection",     icon: icons.rentCollection,    action: () => navigation.navigate("RentCollection") },
    { title: "Maintenance Request", icon: icons.mantenanceRequest, action: () => navigation.navigate("Support") },
  ];

  // ── Derived stats ────────────────────────────────────────────────────────
  const propertyTypeCounts = useMemo(() => (
    landlordProperties.reduce((acc, prop) => {
      const type    = (prop?.property_type || 'Other').toLowerCase();
      const display = type.charAt(0).toUpperCase() + type.slice(1);
      acc[display]  = (acc[display] || 0) + 1;
      return acc;
    }, {})
  ), [landlordProperties]);

  const isPropertyAvailable = (p) => {
    const av = (p?.availability || p?.availabilityStatus || '').toLowerCase();
    return av === 'vacant' || av === 'available soon';
  };

  const availabilityCounts = useMemo(() => ({
    vacant:   landlordProperties.filter(p =>  isPropertyAvailable(p)).length,
    occupied: landlordProperties.filter(p => !isPropertyAvailable(p)).length,
  }), [landlordProperties]);

  const tenantStatusCounts = useMemo(() => (
    tenants.reduce((acc, t) => {
      const s = (t?.status || t?.payment_status || 'pending').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ), [tenants]);

  const filteredAndSortedProperties = useMemo(() => (
    landlordProperties
      .filter(prop => {
        const propType   = (prop?.property_type || prop?.propertyType || '').toLowerCase();
        const typeMatch  = selectedPropertyType === 'all' || propType === selectedPropertyType.toLowerCase();
        const isAvail    = isPropertyAvailable(prop);
        const availMatch =
          selectedAvailability === 'all'                              ||
          (selectedAvailability === 'vacant'   &&  isAvail)          ||
          (selectedAvailability === 'available' && isAvail)          ||
          (selectedAvailability === 'occupied' && !isAvail);
        return typeMatch && availMatch;
      })
      .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))
  ), [landlordProperties, selectedPropertyType, selectedAvailability]);

  // ── Format tenants for TenantCard (same shape as TenantManagement.jsx) ──
  const formattedTenants = useMemo(() => {
    if (tenants?.length > 0) {
      return tenants.map(t => ({
        tenant_id:        t?.tenant_id || t?.id,
       tenant_name: t?.tenant
        ? `${t.tenant.firstName || ''} ${t.tenant.lastName || ''}`.trim()
        : 'No Tenant Assigned',
        property_address: `${t?.property?.streetAddress || ''}, ${t?.property?.city || ''} ${t?.property?.state || ''} ${t?.property?.zipCode || ''}`.trim(),
        payment_status:   t?.leaseStatus || t?.status || 'Pending',
        avatar:           t?.tenant?.avatar || null,
      }));
    }
    // Fallback from properties if tenants slice is still empty
    const extracted = [];
    landlordProperties.forEach(prop => {
      prop.tenant_ids?.forEach((tenantId, i) => {
        extracted.push({
          tenant_id:        tenantId,
          tenant_name:      prop.tenant_names?.[i] || 'Unknown Tenant',
          property_address: [prop.street, prop.city, prop.state, prop.zipcode].filter(Boolean).join(', ') || 'No address',
          payment_status:   'Pending',
          avatar:           null,
        });
      });
    });
    return extracted;
  }, [tenants, landlordProperties]);

  const filteredTenants = useMemo(() => (
    selectedTenantStatus === 'all'
      ? formattedTenants
      : formattedTenants.filter(t =>
          (t?.payment_status || '').toLowerCase() === selectedTenantStatus.toLowerCase()
        )
  ), [selectedTenantStatus, formattedTenants]);

  const currentLoading = activeTab === 'properties' ? loading : tenantsLoading;

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <Container>
        <View style={styles.centerContainer}>
          <MaterialIcons name="lock-outline" size={64} color="#E53935" />
          <Text style={styles.errorTitle}>Authentication Required</Text>
          <Text style={styles.errorSubtitle}>Please login to view your {activeTab}</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <Container scroll={false} >
        <FlatList
          data={activeTab === 'properties' ? filteredAndSortedProperties : filteredTenants}
          keyExtractor={(item, index) => (
            activeTab === 'properties'
              ? String(item?.property_id || item?.propertyId || item?.id || index)
              : String(item?.tenant_id   || item?.id        || index)
          )}
          renderItem={({ item }) =>
            activeTab === 'properties' ? (
              <PropertyCardWrapper
                property={item}
                token={authToken}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteProperty}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.includes(item?.property_id || item?.propertyId || item?.id)}
              />
            ) : (
              <TenantCard tenant={item} onPress={() => handleTenantPress(item)} />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
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
                  {quickLinks.map((link, index) => (
                    <TouchableOpacity key={index} style={styles.linkCard} onPress={link.action}>
                      <View style={styles.iconCircle}>
                        <AppIcon name={link.icon} size={wp(8)} />
                      </View>
                      <Text style={styles.linkText}>{link.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Properties List</Text>

              <StatisticsHeader
                totalProperties={totalProperties || landlordProperties.length}
                vacantCount={availabilityCounts.vacant}
                occupiedCount={availabilityCounts.occupied}
              />

              {/* Tab Switcher */}
              <View style={styles.tabSwitcher}>
                <View style={[styles.tabSlider, { left: activeTab === 'properties' ? 0 : '50%' }]} />
                {[
                  { key: 'properties', label: 'Properties', count: totalProperties || landlordProperties.length },
                  { key: 'tenants',    label: 'Tenants',    count: totalTenants    || tenants.length },
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
                    size={80} color="#E0E0E0"
                  />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'properties' ? 'No properties found' : 'No tenants found'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'properties'
                      ? (selectedPropertyType !== 'all' || selectedAvailability !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Add your first property to get started')
                      : (selectedTenantStatus !== 'all'
                          ? 'Try adjusting your filters'
                          : 'No tenants available at the moment')}
                  </Text>
                  {activeTab === 'properties' && (selectedPropertyType !== 'all' || selectedAvailability !== 'all') && (
                    <TouchableOpacity
                      style={styles.clearFiltersBtn}
                      onPress={() => { setSelectedPropertyType('all'); setSelectedAvailability('all'); }}
                    >
                      <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                  {activeTab === 'tenants' && selectedTenantStatus !== 'all' && (
                    <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => setSelectedTenantStatus('all')}>
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
  listContainer:          { paddingBottom: hp(12), paddingHorizontal: 16 },
  headerContainer:        { marginBottom: 16 },
  quickLinksContainer:    { marginTop: hp(1), marginBottom: hp(1) },
  sectionTitle:           { fontSize: wp(4.5), fontWeight: "bold", fontFamily: getFontFamily("Semibold"), color: Colors.black, marginBottom: hp(0.5) },
  quickLinksRow:          { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" },
  linkCard:               { width: wp(20), alignItems: "center", marginBottom: hp(1) },
  iconCircle:             { width: wp(14), height: wp(14), borderRadius: wp(7), backgroundColor: "#FFF4F4", justifyContent: "center", alignItems: "center", marginBottom: hp(0.5), shadowColor: "#E53935", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderColor: Colors.lightRed, borderWidth: 1.5 },
  linkText:               { fontSize: wp(3), fontFamily: getFontFamily("medium"), textAlign: "center", color: Colors.black },
  tabSwitcher:            { width: 370, height: 30, borderRadius: 100, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.7)", flexDirection: "row", alignSelf: "center", overflow: "hidden", marginBottom: 16, position: "relative" , marginTop: hp(1)},
  tabSlider:              { position: "absolute", top: 0, width: "50%", height: "100%", backgroundColor: "#E53935", borderRadius: 100 },
  tabItem:                { flex: 1, justifyContent: "center", alignItems: "center", zIndex: 1 },
  tabInner:               { flexDirection: "row", alignItems: "center", gap: 4 },
  tabLabel:               { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  tabLabelActive:         { color: "#FFFFFF" },
  tabBadge:               { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  tabBadgeActive:         { backgroundColor: "#FFFFFF" },
  tabBadgeInactive:       { backgroundColor: "#D1D5DB" },
  tabBadgeText:           { fontSize: 12, fontWeight: "bold" },
  tabBadgeTextActive:     { color: "#E53935" },
  tabBadgeTextInactive:   { color: "#4B5563" },
  centerContainer:        { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  emptyContainer:         { alignItems: "center", justifyContent: "center", paddingVertical: hp(10) },
  loadingText:            { marginTop: 16, fontSize: 16, color: '#666' },
  errorTitle:             { marginTop: 16, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  errorSubtitle:          { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
  loginBtn:               { marginTop: 24, backgroundColor: "#E53935", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  loginBtnText:           { color: "#fff", fontWeight: "600", fontSize: 16 },
  emptyTitle:             { fontSize: 18, color: '#666', marginTop: 16 },
  emptySubtitle:          { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  clearFiltersBtn:        { marginTop: 16, backgroundColor: "#E53935", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  clearFiltersBtnText:    { color: "#fff", fontWeight: "600", fontSize: 14 },
  fabButton:              { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
  fabText:                { color: 'white', fontSize: 28 },
});

export default LandlordDashboardView;
