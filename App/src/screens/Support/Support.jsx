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
import { getTenantProperties } from '../../Redux/Properties/services';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";


const Support = ({ navigation }) => {
  const dispatch = useDispatch();
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  
  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loginData = useSelector((state) => state.loginData || {});
  const token = loginData?.idToken;
  const tenant_sub = loginData?.userData?.tenantId;
  const accessToken = loginData?.accessToken;

  const {
    requests,
    loading: maintenanceLoading,
    totalRequests,
    openRequests,
    closedRequests
  } = useSelector(maintenanceSelectors.getMaintenanceData);

  useEffect(() => {
    const fetchPropertyInfo = async () => {
      if (!accessToken || !tenant_sub) {
        console.error(' Missing tenant_sub or token');
        setLoadingProperty(false);
        return;
      }

      try {
        setLoadingProperty(true);
    
        const result = await dispatch(getTenantProperties({ tenantId: tenant_sub, token: accessToken })).unwrap();
        

        if (result && Array.isArray(result) && result.length > 0) {
          const assignedProperty = result[0];
          
          const extractedPropertyInfo = {
            property_id: assignedProperty.propertyId || assignedProperty.property_id,
            property_name: assignedProperty.name || assignedProperty.property_name || 'My Property',
            landlord_id: assignedProperty.landlord_id || assignedProperty.landlordId,
            tenant_id: tenant_sub,
            street: assignedProperty.street || '',
            city: assignedProperty.city || '',
            state: assignedProperty.state || '',
            zipcode: assignedProperty.zipcode || '',
          };
          
          if (!extractedPropertyInfo.property_id || !extractedPropertyInfo.landlord_id) {
            setPropertyInfo(null);
            return;
          }

          setPropertyInfo(extractedPropertyInfo);
        } else {
          console.warn('No properties assigned to this tenant');
          setPropertyInfo(null);
        }
      } catch (error) {
        console.error('Failed to fetch tenant properties:', error);
        Toast.show('Failed to load property information');
        setPropertyInfo(null);
      } finally {
        setLoadingProperty(false);
      }
    };

    fetchPropertyInfo();
  }, [dispatch, accessToken, tenant_sub]);

  useEffect(() => {
    if (token && tenant_sub) {
      dispatch(
        getMaintenanceRequests({
          tenant_id: tenant_sub,
          token: token,
        })
      );
    }
  }, [dispatch, token, tenant_sub]);

  const getDisplayStatus = (item) => {
    console.log('🔍 Checking status for ticket:', item.ticket_id, {
      main_status: item.status,
      assignment_state: item.contractor_assignment?.state,
      completed_at: item.completed_at,
      completion_notes: item.completion_notes,
    });

    const assignmentState = item?.contractor_assignment?.state?.toUpperCase();
    const jobStatus = item?.status?.toUpperCase();

    if (
      assignmentState === 'COMPLETED' ||
      jobStatus === 'COMPLETED' ||
      jobStatus === 'CLOSED' ||
      jobStatus === 'RESOLVED'
    ) {
      return 'Completed';
    }

    if (item.completed_at || item.completion_notes) {
      return 'Completed';
    }

    if (
      assignmentState === 'ACCEPTED' ||
      assignmentState === 'IN_PROGRESS'
    ) {
      return 'In Progress';
    }

    if (
      assignmentState === 'OFFERED' ||
      assignmentState === 'PENDING' ||
      jobStatus === 'OPEN' ||
      jobStatus === 'NEW'
    ) {
      return 'Open';
    }
    return 'Pending';
  };

  const statusCounts = useMemo(() => {
    const counts = requests.reduce((acc, req) => {
      const displayStatus = getDisplayStatus(req);
      const status = displayStatus.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return counts;
  }, [requests]);

  const categoryCounts = useMemo(() => {
    return requests.reduce((acc, req) => {
      const category = (req.category || 'other').toLowerCase();
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const displayStatus = getDisplayStatus(req).toLowerCase();
      const category = (req.category || 'other').toLowerCase();

      const statusMatch = selectedStatus === 'all' || displayStatus === selectedStatus;
      const categoryMatch = selectedCategory === 'all' || category === selectedCategory;

      return statusMatch && categoryMatch;
    });
  }, [requests, selectedStatus, selectedCategory]);

  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      const titleA = (a.title || 'Untitled Request').toLowerCase();
      const titleB = (b.title || 'Untitled Request').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [filteredRequests]);

  const visibleRequests = showAll ? sortedRequests : sortedRequests.slice(0, 3);

  const getStatusStyle = (status) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower === 'completed' || statusLower === 'closed' || statusLower === 'resolved') {
      return { backgroundColor: "#DBEAFE", color: "#2563EB" };
    } else if (statusLower === 'in progress' || statusLower === 'inprogress') {
      return { backgroundColor: "#D1FAE5", color: "#059669" };
    } else if (statusLower === 'open' || statusLower === 'new') {
      return { backgroundColor: "#FEF3C7", color: "#D97706" };
    } else if (statusLower === 'pending') {
      return { backgroundColor: "#F3F4F6", color: "#6B7280" };
    }
    return { backgroundColor: "#F3F4F6", color: "#6B7280" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };
  
  const formatScheduledWindow = (startUtc, endUtc) => {
    if (!startUtc || !endUtc) return "Scheduled";

    const start = new Date(startUtc);
    const end = new Date(endUtc);
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let dayLabel = start.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    if (start >= today && start < tomorrow) {
      dayLabel = "Today";
    } else if (
      start >= tomorrow &&
      start < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
    ) {
      dayLabel = "Tomorrow";
    }

    const formatTime = (date) =>
      date.toLocaleTimeString("en-GB", {
        hour: "numeric",
        hour12: true,
      });

    return `Scheduled ${dayLabel} ${formatTime(start)}–${formatTime(end)}`;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (token && tenant_sub) {
      dispatch(getMaintenanceRequests({
        tenant_id: tenant_sub,
        token: token,
      }));
    }
  };

  const handleOpenModal = () => {
    if (loadingProperty) {
      Toast.show("Loading property information...");
      return;
    }

    if (!propertyInfo) {
      Toast.show("No property assigned. Please contact your landlord.");
      return;
    }
    
    if (!propertyInfo.property_id) {
      Toast.show("Property ID missing. Please contact support.");
      console.error(' Property Info:', propertyInfo);
      return;
    }
    
    if (!propertyInfo.landlord_id) {
      Toast.show("Landlord information missing. Please contact support.");
      console.error(' Property Info:', propertyInfo);
      return;
    }
    
    setShowModal(true);
  };

  const renderRequest = ({ item }) => {
    const ticketId = item.ticket_id || item.request_id || item.id || 'N/A';
    const title = item.title || 'Untitled Request';
    const description = item.description || 'No description provided';
    const location = item.location || 'Location not specified';
    const category = item.category || '';
    const priority = item.priority || 'Medium';
    const displayStatus = getDisplayStatus(item);
    const createdAt = item.created_at || new Date().toISOString();
    const preferredWindow = item.preferred_window || null;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          navigation.navigate("QueryDetails", { data: item });
        }}
      >
        <View style={styles.glassContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusStyle(displayStatus).backgroundColor },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusStyle(displayStatus).color },
                ]}
              >
                {displayStatus}
              </Text>
            </View>
          </View>

          <Text style={styles.cardCategory}>
            {location}
            {category ? ` • ${category}` : ''}
            {priority ? ` • ${priority} Priority` : ''}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <AppIcon
                name={icons.calender}
                height={hp(2)}
                width={hp(2)}
                color={Colors.inputText}
              />
              <Text style={styles.footerText}>{formatDate(createdAt)}</Text>
            </View>
            {preferredWindow?.start_utc && (
              <View style={styles.footerItem}>
                <AppIcon
                  name={icons.calender}
                  height={hp(2)}
                  width={hp(2)}
                  color={Colors.inputText}
                />
                <Text style={styles.footerText}>
                  {formatScheduledWindow(
                    preferredWindow.start_utc,
                    preferredWindow.end_utc
                  )}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const loading = maintenanceLoading || loadingProperty;

  return (
    <Container scroll={false}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <AppIcon
              name={icons.arrowBack}
              height={hp(2.5)}
              width={hp(2.5)}
            />
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

      {loading && requests.length === 0 ? (
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
          keyExtractor={(item, index) => (item.ticket_id || item.request_id || item.id || index).toString()}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {!showAll && sortedRequests.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAll(true)}
                >
                  <Text style={styles.showMoreText}>
                    Show More ({sortedRequests.length - 3})
                  </Text>
                </TouchableOpacity>
              )}
              {showAll && sortedRequests.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAll(false)}
                >
                  <Text style={styles.showMoreText}>Show Less</Text>
                </TouchableOpacity>
              )}
            </>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenModal}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        isVisible={showModal}
        onBackdropPress={handleCloseModal}
        onSwipeComplete={handleCloseModal}
        swipeDirection={["down"]}
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
    flexDirection: "row",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: Fonts.popbold,
    color: Colors.black,
     fontWeight: "bold",
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
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.popsemiBold,
    fontSize: hp(1.8),
    lineHeight: hp(3),
    letterSpacing: 0,
    color: Colors.black,
    width: wp(62),
    height: hp(3),
    opacity: 1,
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
  cardFooter: { flexDirection: "row", gap: 16 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.inputText,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
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
    justifyContent: "center",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyFilterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    position: "absolute",
    bottom: hp(11),
    right: wp(5),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
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
    justifyContent: "flex-end",
    margin: 0,
  },
});
