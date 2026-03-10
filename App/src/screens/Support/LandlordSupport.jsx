// screens/LandlordSupport.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Container from '../../components/Container/Container';
import { getMaintenanceRequests } from '../../Redux/Maintenance/services';
import { maintenanceSelectors } from '../../Redux/Maintenance/maintenanceSlice';
import { Colors } from '../../Theme';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FilterModal from '../../components/FilterModal/FilterModal';
import LandlordSupportCard from '../../components/LandlordSupportCard/LandlordSupportCard';
import { getFontFamily } from '../../utils';
import {
  contractorSelectors,
} from '../../Redux/ContractorServices/contractorSlice';

const LandlordSupport = ({ navigation }) => {
  const dispatch = useDispatch();
  const [showAll, setShowAll] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'All',
    priority: 'All',
    level: 'All',
  });

  // ✅ Get landlord data from Redux
  const loginData = useSelector(s => s.loginData || {});
  const token = loginData?.idToken || loginData?.accessToken;
  const landlord_id = loginData?.userData?.sub || loginData?.user?.sub;

  const { requests, loading, totalRequests, openRequests, closedRequests } = useSelector(maintenanceSelectors.getMaintenanceData);
  const jobs = useSelector(contractorSelectors.getAllJobs);

  useEffect(() => {
    // ✅ Fetch maintenance requests for landlord
    if (token && landlord_id) {
      console.log('📡 Fetching maintenance requests for landlord:', landlord_id);
      dispatch(getMaintenanceRequests({
        landlord_id: landlord_id,
        token: token,
      }));
    }
  }, [dispatch, token, landlord_id]);

  // ✅ FIXED: Improved getDisplayStatus to check multiple status indicators
  const getDisplayStatus = (item) => {
    console.log('🔍 Checking status for ticket:', item.ticket_id, {
      main_status: item.status,
      assignment_state: item.contractor_assignment?.state,
      completed_at: item.completed_at,
      completion_notes: item.completion_notes,
    });

    // ✅ Priority 1: Check contractor_assignment.state for COMPLETED
    if (item.contractor_assignment?.state?.toUpperCase() === 'COMPLETED') {
      console.log('✅ Status: Resolved (from contractor_assignment.state)');
      return 'Resolved';
    }

    // ✅ Priority 2: Check main status field
    const mainStatus = item.status?.toLowerCase();
    if (mainStatus === 'completed' || mainStatus === 'closed' || mainStatus === 'resolved') {
      console.log('✅ Status: Resolved (from status field)');
      return 'Resolved';
    }

    // ✅ Priority 3: Check for completion indicators
    if (item.completed_at || item.completion_notes) {
      console.log('✅ Status: Resolved (from completion indicators)');
      return 'Resolved';
    }

    // ✅ Check for In Progress
    if (item.contractor_assignment?.state?.toUpperCase() === 'ACCEPTED' ||
        item.contractor_assignment?.state?.toUpperCase() === 'IN_PROGRESS') {
      console.log('⏳ Status: In Progress');
      return 'In Progress';
    }

    // ✅ Check for New Request
    if (mainStatus === 'open' || mainStatus === 'new') {
      console.log('🆕 Status: New Request');
      return 'New Request';
    }

    console.log('⚠️ Status: Pending (default)');
    return 'Pending';
  };

  const getTenantNameForSort = (ticket) => {
    return (
      ticket?.contractor_job_snapshot?.tenant?.name ||
      ticket?.tenant?.name ||
      ticket?.tenant_name ||
      'Unknown Tenant'
    );
  };

  // ✅ Apply filters with display status
  const filteredRequests = requests.filter(item => {
    const displayStatus = getDisplayStatus(item);
    let statusMatch = filters.status === 'All' || displayStatus.toLowerCase() === filters.status.toLowerCase();
    let priorityMatch = filters.priority === 'All' || item.priority?.toLowerCase() === filters.priority.toLowerCase();
    let levelMatch = filters.level === 'All' || item.level === filters.level;
    return statusMatch && priorityMatch && levelMatch;
  })
  .sort((a, b) => {
    const nameA = getTenantNameForSort(a).toLowerCase();
    const nameB = getTenantNameForSort(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const visible = showAll ? filteredRequests : filteredRequests.slice(0, 3);
  
  // ✅ FIXED: Calculate counts using getDisplayStatus function
  const newRequestCount = filteredRequests.filter(r =>
    getDisplayStatus(r) === 'New Request'
  ).length;

  const inProgressCount = filteredRequests.filter(r =>
    getDisplayStatus(r) === 'In Progress'
  ).length;

  const completedCount = filteredRequests.filter(r =>
    getDisplayStatus(r) === 'Resolved'
  ).length;

  console.log('📊 Landlord Dashboard Stats:', {
    total: filteredRequests.length,
    new: newRequestCount,
    inProgress: inProgressCount,
    completed: completedCount
  });

  const handleOpenTicket = (ticket) => {
    navigation.navigate('LandlordTicketDetails', {
      ticketId: ticket.ticket_id || ticket.id,
      ticket: ticket
    });
  };
  
  const calculateInvoiceMetrics = () => {
    let inProgressInvoiceCount = 0;
    let totalMaintenanceCost = 0;

    filteredRequests.forEach(request => {
      const displayStatus = getDisplayStatus(request);
      const hasInvoice = request.has_invoice || request.invoice;
      const invoice = request.invoice;

      // Count invoices for In Progress requests
      if (displayStatus === 'In Progress' && hasInvoice) {
        inProgressInvoiceCount++;
      }

      // Sum total cost from completed requests with invoices
      if (displayStatus === 'Resolved' && invoice) {
        const invoiceTotal = parseFloat(invoice.total_amount || invoice.total || 0);
        totalMaintenanceCost += invoiceTotal;
      }
    });

    return {
      inProgressInvoiceCount,
      totalMaintenanceCost,
    };
  };
  
  const { inProgressInvoiceCount, totalMaintenanceCost } = calculateInvoiceMetrics();

  console.log('📊 Landlord Dashboard Stats:', {
    total: filteredRequests.length,
    new: newRequestCount,
    inProgress: inProgressCount,
    completed: completedCount,
    inProgressInvoices: inProgressInvoiceCount,
    totalCost: totalMaintenanceCost,
  });
  
   const formatCurrency = (amount) => {
    return `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleRefresh = () => {
    if (token && landlord_id) {
      dispatch(getMaintenanceRequests({
        landlord_id: landlord_id,
        token: token,
      }));
    }
  };

  // ✅ Render Header Component
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ left: 20, right: 20 }}>
          <AppIcon name={icons.arrowBack} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Dashboard</Text>
      </View>

      {/* Status Cards */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          {/* New Request */}
          <View style={styles.statusItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.5) }}>
              <AppIcon name={icons.totalProperties} size={hp(3)} style={{ marginRight: wp(2) }} />
              <Text style={styles.statusNumber}>{newRequestCount.toString().padStart(2, '0')}</Text>
            </View>
            <Text style={styles.statusLabel}>New Request</Text>
          </View>

          {/* In Progress */}
          <View style={styles.statusItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.5) }}>
              <AppIcon name={icons.ok} size={hp(3)} style={{ marginRight: wp(2) }} />
              <Text style={styles.statusNumber}>
                {inProgressCount.toString().padStart(2, '0')}
              </Text>
            </View>
            <Text style={styles.statusLabel}>In Progress</Text>
          </View>

          {/* Resolved */}
          <View style={styles.statusItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.5) }}>
              <AppIcon name={icons.closes} size={hp(3)} style={{ marginRight: wp(2) }} />
              <Text style={styles.statusNumber}>
                {completedCount.toString().padStart(2, '0')}
              </Text>
            </View>
            <Text style={styles.statusLabel}>Resolved</Text>
          </View>
        </View>
      </View>
      
      
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
    <AppIcon name={icons.dollar} size={hp(3)} style={{ marginRight: wp(2) }} />
          <Text style={styles.paymentTitle}>Payment Overview</Text>
        </View>
        
        <View style={styles.paymentRow}>
          {/* Payment In Progress */}
          <View style={styles.paymentItem}>
            <View style={styles.paymentIconContainer}>
            <AppIcon name={icons.closes} size={hp(3)} style={{ marginRight: wp(2) }} />
            </View>
            <View style={styles.paymentContent}>
              <Text style={styles.paymentNumber}>
                {inProgressInvoiceCount.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.paymentLabel}>Payment In Progress</Text>
            </View>
          </View>

          {/* Total Maintenance Cost */}
          <View style={styles.paymentItem}>
            <View style={styles.paymentIconContainer}>
            <AppIcon name={icons.ok} size={hp(3)} style={{ marginRight: wp(2) }} />
            </View>
            <View style={styles.paymentContent}>
              <Text style={styles.paymentAmount}>
                {formatCurrency(totalMaintenanceCost)}
              </Text>
              <Text style={styles.paymentLabel}>Total Maintenance Cost</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Controls */}
      <View style={[styles.controls, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppIcon name={icons.totalTicket} size={hp(3)} />
          <Text style={styles.controlsTitle}>
            Support Tickets ({filteredRequests.length})
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: wp(2) }}>
          {/* Filter button */}
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => setFilterVisible(true)}
          >
            <AppIcon name={icons.progresses} size={hp(3)} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // ✅ Render Empty Component
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="clipboard-text-outline" size={hp(10)} color={Colors.grey} />
      <Text style={styles.emptyText}>No tickets found</Text>
      <Text style={styles.emptySubText}>
        {requests.length > 0 ? 'Try adjusting your filters' : 'No support tickets yet'}
      </Text>
    </View>
  );

  // ✅ Render Footer Component
  const renderFooter = () => {
    if (filteredRequests.length === 0) return null;
    
    return (
      <>
        {!showAll && filteredRequests.length > 3 && (
          <TouchableOpacity onPress={() => setShowAll(true)} style={styles.showMore}>
            <Text style={styles.showMoreText}>Show More ({filteredRequests.length - 3})</Text>
          </TouchableOpacity>
        )}
        {showAll && filteredRequests.length > 3 && (
          <TouchableOpacity onPress={() => setShowAll(false)} style={styles.showMore}>
            <Text style={styles.showMoreText}>Show Less</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  // ✅ Render Item Component with displayStatus
  const renderItem = ({ item }) => {
    const displayStatus = getDisplayStatus(item);
    console.log('🎨 Rendering card for:', item.ticket_id, 'with status:', displayStatus);
    
    return (
      <LandlordSupportCard
        ticket={{
          ...item,
          displayStatus: displayStatus
        }}
        onPress={handleOpenTicket}
      />
    );
  };

  return (
    <Container scroll={false}>
      {loading && requests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i, idx) => i.ticket_id || i.id || String(idx)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          onRefresh={handleRefresh}
          refreshing={loading}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(appliedFilters) => {
          setFilters(appliedFilters);
          setFilterVisible(false);
        }}
      />
    </Container>
  );
};

export default LandlordSupport;

// =================== Styles ===================
const styles = StyleSheet.create({
  flatListContent: {
    flexGrow: 1,
    paddingBottom: hp(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
  },
  headerTitle: {
    fontSize: hp(2.6),
    fontWeight: 'bold',
    color: Colors.black,
    marginLeft: 10,
    fontFamily: getFontFamily('bold'),
  },

  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: wp(4),
    padding: wp(5),
    marginBottom: hp(2),
    marginHorizontal: wp(4),
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statusItem: {
    alignItems: 'center',
    flex: 1
  },
  statusNumber: {
    fontSize: hp(3),
    fontWeight: 'bold',
    fontFamily: getFontFamily('bold'),
    color: Colors.black
  },
  statusLabel: {
    fontSize: hp(1.4),
    fontFamily: getFontFamily('regular'),
    color: Colors.grey,
    marginTop: hp(0.5)
  },
  // ✅ NEW: Payment Card Styles
  paymentCard: {
    backgroundColor: Colors.white,
    borderRadius: wp(4),
    padding: wp(5),
    marginBottom: hp(2),
    marginHorizontal: wp(4),
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#E5E5E5',
  },
  paymentTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    fontFamily: getFontFamily('semibold'),
    color: Colors.black,
    marginLeft: wp(2),
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(3),
  },
  paymentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGrey || '#F8F9FA',
    padding: wp(3),
    borderRadius: wp(3),
  },
  paymentIconContainer: {
    marginRight: wp(2.5),
  },
  paymentContent: {
    flex: 1,
  },
  paymentNumber: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    marginBottom: hp(0.3),
  },
  paymentAmount: {
    fontSize: hp(2),
    fontWeight: 'bold',
    fontFamily: getFontFamily('bold'),
    color: Colors.black || '#28A745',
    marginBottom: hp(0.3),
  },
  paymentLabel: {
    fontSize: hp(1.3),
    fontFamily: getFontFamily('regular'),
    color: Colors.grey,
    flexWrap: 'wrap',
  },

  totalTicketsTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    fontFamily: getFontFamily('semibold'),
    color: Colors.black,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
    paddingHorizontal: wp(4)
  },
  controlsTitle: {
    marginLeft: wp(2),
    fontSize: hp(2),
    fontWeight: '500',
    fontFamily: getFontFamily('medium'),
    color: Colors.black
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.red,
    padding: wp(2.5),
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3.5)
  },
  filterBtnText: {
    color: Colors.white,
    marginLeft: wp(1.5),
    fontWeight: '600',
    fontFamily: getFontFamily('semibold'),
    fontSize: hp(1.75),
  },
  refreshBtn: {
    padding: wp(2.5),
    backgroundColor: Colors.white,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  showMore: {
    alignSelf: 'center',
    padding: wp(2.5),
    marginVertical: hp(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  showMoreText: {
    color: Colors.black,
    fontWeight: '700',
    fontFamily: getFontFamily('bold'),
    fontSize: hp(1.75),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(5),
  },
  loadingText: {
    marginTop: hp(1.25),
    fontSize: hp(1.75),
    fontFamily: getFontFamily('regular'),
    color: Colors.grey,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(7.5),
  },
  emptyText: {
    fontSize: hp(2),
    fontWeight: '600',
    fontFamily: getFontFamily('semibold'),
    color: Colors.grey,
    marginTop: hp(2),
  },
  emptySubText: {
    fontSize: hp(1.75),
    fontFamily: getFontFamily('regular'),
    color: Colors.titleColor,
    marginTop: hp(1),
  },
});
