import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import Fonts from "../../Theme/fonts";
import MaintenanceDetails from "./MaintenanceDetails";
import MaintenanceFilters from '../../components/MaintenanceFilters/MaintenanceFilters';
import Modal from "react-native-modal";
import Toast from "react-native-simple-toast";
import { useSelector, useDispatch } from "react-redux";
import Container from "../../components/Container/Container";
import { getMaintenanceRequests } from "../../Redux/Maintenance/services";
import { maintenanceSelectors } from "../../Redux/Maintenance/maintenanceSlice";
// GET /api/property-tenants/my-properties
import { getMyProperties } from "../../Redux/Tenants/services";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";

const Support = ({ navigation }) => {
  const dispatch = useDispatch();
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState(null);

  // ✅ NEW: holds the result of /api/property-tenants/my-properties
  const [myProperties, setMyProperties] = useState([]);
  const [myPropertiesLoading, setMyPropertiesLoading] = useState(false);

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loginData = useSelector((state) => state.loginData || {});
  const token = loginData?.accessToken || loginData?.token || null;

  // tenantId from login state
  const tenant_sub = loginData?.tenantId || loginData?.userData?.tenantId;

  const {
    requests,
    loading: maintenanceLoading,
  } = useSelector(maintenanceSelectors.getMaintenanceData);

  // ─────────────────────────────────────────────────────────────
  // Fetch maintenance requests on mount / when auth changes
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (token && tenant_sub) {
      dispatch(
        getMaintenanceRequests({
          tenantId: tenant_sub,
          token,
        })
      );
    }
  }, [dispatch, token, tenant_sub]);

  // ─────────────────────────────────────────────────────────────
  // ✅ NEW: Fetch the tenant's assigned property/unit.
  // This lets us resolve propertyInfo for brand-new tenants who
  // haven't raised a single ticket yet.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        setMyPropertiesLoading(true);
        const result = await dispatch(getMyProperties({ token })).unwrap();
        if (!cancelled) {
          setMyProperties(Array.isArray(result) ? result : []);
        }
      } catch (err) {
        console.warn('⚠️ getMyProperties failed:', err);
        if (!cancelled) setMyProperties([]);
      } finally {
        if (!cancelled) setMyPropertiesLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dispatch, token]);

  // ─────────────────────────────────────────────────────────────
  // Resolve propertyInfo.
  //
  // Priority order:
  //   1. /api/property-tenants/my-properties  (authoritative, works
  //      from day 1 — no ticket required)
  //   2. Nested `property` object on existing tickets (fallback)
  //
  // Shape returned by my-properties (confirmed from console logs):
  //   {
  //     id, propertyId, unitId, tenantId, leaseStatus, status,
  //     property: {
  //       id, name, streetAddress, city, state, zipCode,
  //       propertyType, landlordId, ...
  //     },
  //     tenant: { ... }
  //   }
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let resolved = null;

    // ── Source A: my-properties (primary) ─────────────────────
    if (myProperties.length > 0) {
      const mp   = myProperties[0];          // first active lease
      const prop = mp.property || {};
      const unit = mp.unit     || {};


      resolved = {
        property_id:
          mp.propertyId || prop.id || prop.propertyId || null,
        property_name: prop.name || 'My Property',
        landlord_id:
          prop.landlordId || prop.landlord_id ||
          mp.landlordId   || mp.landlord_id   || null,
        tenant_id:     tenant_sub,
        unit_id:       mp.unitId || unit.id || null,
        unit_number:   unit.unitNumber || unit.number || null,
        street:        prop.streetAddress || prop.street || '',
        city:          prop.city  || '',
        state:         prop.state || '',
        zipcode:       prop.zipCode || prop.zipcode || '',
        property_type: prop.propertyType || '',
      };
    }

    // ── Source B: tickets (fallback when my-properties is empty) ──
    if (!resolved?.property_id && Array.isArray(requests) && requests.length > 0) {
      for (const ticket of requests) {
        const prop = ticket.property || {};
        const unit = ticket.unit     || {};

        const landlordId =
          prop.landlordId  ||
          prop.landlord_id ||
          ticket.landlordId ||
          ticket.landlord_id ||
          null;

        const propertyId =
          prop.id          ||
          prop.propertyId  ||
          ticket.propertyId ||
          ticket.property_id ||
          null;

        if (propertyId) {
          console.log('🔍 Resolving propertyInfo from ticket fallback:', {
            ticket_id: ticket.ticket_id || ticket.id,
            propertyId,
          });

          resolved = {
            property_id:   propertyId,
            property_name: prop.name || 'My Property',
            landlord_id:   landlordId,
            tenant_id:     tenant_sub,
            unit_id:       unit.id || null,
            unit_number:   unit.unitNumber || null,
            street:        prop.streetAddress || prop.street || '',
            city:          prop.city          || '',
            state:         prop.state         || '',
            zipcode:       prop.zipCode       || prop.zipcode || '',
            property_type: prop.propertyType  || '',
          };
          break;
        }
      }
    }

    if (resolved) {
      console.log('✅ propertyInfo resolved:', JSON.stringify(resolved));
      setPropertyInfo(resolved);
    } else {
      console.warn('⚠️ Could not resolve propertyInfo from any source.');
      console.warn('   myProperties:', myProperties);
      console.warn('   requests[0]:', requests?.[0]);
      setPropertyInfo(null);
    }
  }, [myProperties, requests, tenant_sub]);

  // ─────────────────────────────────────────────────────────────
  // Status helpers
  // ─────────────────────────────────────────────────────────────
  const getDisplayStatus = (item) => {
    const assignmentState = item?.contractor_assignment?.state?.toUpperCase();
    const jobStatus = item?.status?.toUpperCase();

    if (
      assignmentState === 'COMPLETED' ||
      jobStatus === 'COMPLETED' ||
      jobStatus === 'CLOSED' ||
      jobStatus === 'RESOLVED'
    ) return 'Completed';

    if (item.completed_at || item.completion_notes) return 'Completed';

    if (assignmentState === 'ACCEPTED' || assignmentState === 'IN_PROGRESS') return 'In Progress';

    if (
      assignmentState === 'OFFERED' ||
      assignmentState === 'PENDING' ||
      jobStatus === 'OPEN' ||
      jobStatus === 'NEW'
    ) return 'Open';

    return 'Pending';
  };

  const getStatusStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed' || s === 'closed' || s === 'resolved')
      return { backgroundColor: '#DBEAFE', color: '#2563EB' };
    if (s === 'in progress' || s === 'inprogress')
      return { backgroundColor: '#D1FAE5', color: '#059669' };
    if (s === 'open' || s === 'new')
      return { backgroundColor: '#FEF3C7', color: '#D97706' };
    return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  };

  // ─────────────────────────────────────────────────────────────
  // Memoised filter / sort
  // ─────────────────────────────────────────────────────────────
  const statusCounts = useMemo(() =>
    requests.reduce((acc, req) => {
      const s = getDisplayStatus(req).toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {}),
  [requests]);

  const categoryCounts = useMemo(() =>
    requests.reduce((acc, req) => {
      const c = (req.category || 'other').toLowerCase();
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {}),
  [requests]);

  const filteredRequests = useMemo(() =>
    requests.filter(req => {
      const statusMatch =
        selectedStatus === 'all' ||
        getDisplayStatus(req).toLowerCase() === selectedStatus;
      const categoryMatch =
        selectedCategory === 'all' ||
        (req.category || 'other').toLowerCase() === selectedCategory;
      return statusMatch && categoryMatch;
    }),
  [requests, selectedStatus, selectedCategory]);

  const sortedRequests = useMemo(() =>
    [...filteredRequests].sort((a, b) =>
      (a.title || 'Untitled Request')
        .toLowerCase()
        .localeCompare((b.title || 'Untitled Request').toLowerCase())
    ),
  [filteredRequests]);

  const visibleRequests = showAll ? sortedRequests : sortedRequests.slice(0, 3);

  // ─────────────────────────────────────────────────────────────
  // Date helpers
  // ─────────────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatScheduledWindow = (startUtc, endUtc) => {
    if (!startUtc || !endUtc) return 'Scheduled';
    const start = new Date(startUtc);
    const end   = new Date(endUtc);
    const now   = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let dayLabel = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (start >= today && start < tomorrow) dayLabel = 'Today';
    else if (start >= tomorrow && start < new Date(tomorrow.getTime() + 86400000))
      dayLabel = 'Tomorrow';

    const fmt = (d) => d.toLocaleTimeString('en-GB', { hour: 'numeric', hour12: true });
    return `Scheduled ${dayLabel} ${fmt(start)}–${fmt(end)}`;
  };

  // ─────────────────────────────────────────────────────────────
  // Modal handlers
  // ─────────────────────────────────────────────────────────────
  const handleCloseModal = () => {
    setShowModal(false);
    if (token && tenant_sub) {
      dispatch(getMaintenanceRequests({ tenantId: tenant_sub, token }));
    }
  };

  const handleOpenModal = () => {
    // Wait for either source to finish loading
    if (maintenanceLoading || myPropertiesLoading) {
      Toast.show('Loading property information...');
      return;
    }

    // Must have a resolved property before opening the form
    if (!propertyInfo?.property_id) {
      Toast.show('No property assigned. Please contact your landlord.');
      console.warn('propertyInfo missing. myProperties:', myProperties,
                   '| requests[0]:', requests?.[0]);
      return;
    }

    setShowModal(true);
  };

  // ─────────────────────────────────────────────────────────────
  // Render ticket card
  // ─────────────────────────────────────────────────────────────
  const renderRequest = ({ item }) => {
    const title         = item.title       || 'Untitled Request';
    const description   = item.description || 'No description provided';
    const location      = item.location    || 'Location not specified';
    const category      = item.category    || '';
    const priority      = item.priority    || 'Medium';
    const displayStatus = getDisplayStatus(item);
    const createdAt     = item.created_at  || new Date().toISOString();
    const preferredWindow = item.preferred_window || null;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('QueryDetails', { data: item })}
      >
        <View style={styles.glassContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(displayStatus).backgroundColor }]}>
              <Text style={[styles.statusText, { color: getStatusStyle(displayStatus).color }]}>
                {displayStatus}
              </Text>
            </View>
          </View>

          <Text style={styles.cardCategory}>
          
            {category ? ` • ${category}` : ''}
            {priority ? ` • ${priority} Priority` : ''}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <AppIcon name={icons.calender} height={hp(2)} width={hp(2)} color={Colors.inputText} />
              <Text style={styles.footerText}>{formatDate(createdAt)}</Text>
            </View>
            {preferredWindow?.start_utc && (
              <View style={styles.footerItem}>
                <AppIcon name={icons.calender} height={hp(2)} width={hp(2)} color={Colors.inputText} />
                <Text style={styles.footerText}>
                  {formatScheduledWindow(preferredWindow.start_utc, preferredWindow.end_utc)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <Container scroll={false}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <AppIcon name={icons.arrowBack} height={hp(2.5)} width={hp(2.5)} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>
            Maintenance Requests ({filteredRequests.length})
          </Text>
        </View>
      </View>

      {requests.length > 0 && (
        <MaintenanceFilters
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          statusCounts={statusCounts}
          categoryCounts={categoryCounts}
          totalRequests={requests.length}
        />
      )}

      {maintenanceLoading && requests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="clipboard-text-outline" size={80} color={Colors.borderLine} />
          <Text style={styles.emptyText}>No maintenance requests yet</Text>
          <Text style={styles.emptySubText}>Tap + to create your first request</Text>
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={styles.emptyFilterContainer}>
          <Icon name="filter-off-outline" size={60} color={Colors.borderLine} />
          <Text style={styles.emptyText}>No requests match your filters</Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSelectedStatus('all');
              setSelectedCategory('all');
            }}
          >
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleRequests}
          renderItem={renderRequest}
          keyExtractor={(item, index) =>
            (item.ticket_id || item.request_id || item.id || index).toString()
          }
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {!showAll && sortedRequests.length > 3 && (
                <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAll(true)}>
                  <Text style={styles.showMoreText}>Show More ({sortedRequests.length - 3})</Text>
                </TouchableOpacity>
              )}
              {showAll && sortedRequests.length > 3 && (
                <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAll(false)}>
                  <Text style={styles.showMoreText}>Show Less</Text>
                </TouchableOpacity>
              )}
            </>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleOpenModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        isVisible={showModal}
        onBackdropPress={handleCloseModal}
        onSwipeComplete={handleCloseModal}
        swipeDirection={['down']}
        style={styles.modalStyle}
        backdropOpacity={0.5}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationInTiming={300}
        animationOutTiming={300}
      >
        <MaintenanceDetails
          onClose={handleCloseModal}
          property={propertyInfo}
          landlordId={propertyInfo?.landlord_id}
          tenant_sub={tenant_sub}
        />
      </Modal>
    </Container>
  );
};

export default Support;

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: Fonts.popbold,
    color: Colors.black,
    fontWeight: 'bold',
  },
  glassContainer: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    backgroundColor: Colors.backgroundColor,
    borderWidth: 1,
    borderColor: Colors.borderLine,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.popsemiBold,
    fontSize: hp(1.8),
    lineHeight: hp(3),
    color: Colors.black,
    width: wp(62),
    height: hp(3),
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  cardCategory: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.grey,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.clr66,
    marginBottom: 12,
  },
  cardFooter: { flexDirection: 'row', gap: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.inputText,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.red,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyFilterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.grey,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.inputText,
    marginTop: 8,
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.red,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: Colors.black,
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  fab: {
    position: 'absolute',
    bottom: hp(11),
    right: wp(5),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: Colors.white,
    fontSize: 28,
    lineHeight: 28,
    fontFamily: Fonts.light,
  },
  modalStyle: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});
