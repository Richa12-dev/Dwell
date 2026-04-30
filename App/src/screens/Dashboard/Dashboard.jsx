import React, { useState, useEffect, useRef  } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import { useNavigation } from "@react-navigation/native";
import Container from "../../components/Container/Container";
import { useSelector, useDispatch } from "react-redux";
import { getMaintenanceRequests } from "../../Redux/Maintenance/services";
import { maintenanceSelectors } from "../../Redux/Maintenance/maintenanceSlice";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { getMyProperties } from "../../Redux/Tenants/services";
import { tenantsSelectors } from "../../Redux/Tenants/tenantsSlice";

import { getProperty } from "../../Redux/Properties/services";
import { propertiesSelectors , clearCurrentProperty} from "../../Redux/Properties/propertiesSlice";


import { getUpcomingRents, createRent, getTenantRentHistory } from "../../Redux/Rent/services";
import { rentSelectors, clearRentData } from "../../Redux/Rent/rentSlice";
// ✅ Invite: auto-accept pending invite after login so getMyProperties returns data
import { acceptInvitation } from "../../Redux/Invite/inviteServices";
import { inviteSelectors, clearResolvedInvite } from "../../Redux/Invite/inviteSlice";


// calls PATCH /api/invited-users/{inviteId}/accept → backend links tenantId
// to the property-tenant record → getMyProperties now returns the property.
const useAutoAcceptInvite = (dispatch) => {
  const resolvedInvite = useSelector(inviteSelectors.getResolvedInvite);
  const hasRun         = useRef(false);
 
  useEffect(() => {
    const inviteId = resolvedInvite?.inviteId;
    if (!inviteId || hasRun.current) return;
    hasRun.current = true;
 
    dispatch(acceptInvitation(inviteId)).then((result) => {
      if (acceptInvitation.fulfilled.match(result)) {
        console.log('✅ Invite accepted — fetching properties');
        dispatch(getMyProperties());
      } else {
        console.warn('⚠️ Invite accept failed:', result.payload);
      }
      dispatch(clearResolvedInvite());
    });
  }, [resolvedInvite?.inviteId]);
};



const normalizeRentForCard = (item) => ({
  id:               item?.id || item?.rent_id,
  amount:           item?.amount ?? item?.rent_amount ?? item?.rentAmount ?? null,
  dueDate:          item?.due_date || item?.dueDate || item?.due_on || null,
  currency:         item?.currency_symbol || item?.currency || '$',
  status:           item?.status || item?.payment_status || 'pending',
  month:            item?.month,
  year:             item?.year,

  // ✅ FIXED
  propertyTenantId:
    item?.propertyTenantId ||
    item?.property_tenant_id ||
    item?.property?.id || null,
});

const Dashboard = () => {
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);
  const [paying, setPaying] = useState(false);
  const navigation = useNavigation();
  const dispatch = useDispatch();
    // ✅ Auto-accept pending invite right after login
  useAutoAcceptInvite(dispatch);

  // Auth
  const loginData  = useSelector((state) => state.loginData || {});
  const token      = loginData?.accessToken;
  const tenant_sub =
    loginData?.tenantId ||
    loginData?.userData?.tenantId ||
    loginData?.user?.id ||
    null;

  // All property-tenant assignments for this tenant
  const myProperties = useSelector(tenantsSelectors.getMyProperties);

  // Full property detail (includes monthlyRent).
  // ✅ MUST be declared before assignedMonthlyRent which references it.
  const { currentProperty } = useSelector(propertiesSelectors.getPropertiesData);

  // Find the ACTIVE lease for this tenant
  const activeLease = myProperties?.find(
    (r) =>
      (r.leaseStatus === 'occupied' || r.status === 'active') &&
      (r.tenantId === tenant_sub || !r.tenantId)
  ) || myProperties?.[0];

const propertyTenantId = activeLease?.propertyId || null;

  const activePropertyId =
    activeLease?.propertyId ||
    activeLease?.property?.id ||
    null;

const assignedMonthlyRent = Number(
  activeLease?.property?.monthlyRent ??
  activeLease?.property?.monthly_rent ??
  currentProperty?.monthlyRent ??
  currentProperty?.monthly_rent ??
  0
);

  // Maintenance
  const {
    requests,
    loading: maintenanceLoading,
  } = useSelector(maintenanceSelectors.getMaintenanceData);

  // ✅ Upcoming rents from Redux
  const upcomingRentsRaw = useSelector(rentSelectors.getUpcomingRents);

  // also read rent history — used as fallback if upcoming is empty
  const rentHistoryRaw = useSelector(rentSelectors.getRentHistory);

  const rentLoading = useSelector(rentSelectors.isLoading);
 

  
  const pendingRent = (() => {
  const ptId = propertyTenantId;

  // ✅ filter upcoming rents
  const validUpcoming = upcomingRentsRaw?.find(
    (r) =>
      (r.propertyTenantId || r.property_tenant_id) === ptId
  );

  if (validUpcoming) {
    return normalizeRentForCard(validUpcoming);
  }

  // ✅ fallback to history (filtered)
  const historyPending = rentHistoryRaw?.find(
    (r) =>
      (r.propertyTenantId || r.property_tenant_id) === ptId &&
      (r.status || r.payment_status || '').toLowerCase() === 'pending'
  );

  if (historyPending) {
    return normalizeRentForCard(historyPending);
  }

  return null;
})();


  const nextRentDate = (() => {
    const latest = (rentHistoryRaw || []).reduce(
      (max, r) => {
        const y = Number(r.year)  || 0;
        const m = Number(r.month) || 0;
        return y > max.year || (y === max.year && m > max.month)
          ? { month: m, year: y }
          : max;
      },
      { month: 0, year: 0 }
    );

    if (latest.month > 0 && latest.year > 0) {
      return {
        month: latest.month === 12 ? 1 : latest.month + 1,
        year:  latest.month === 12 ? latest.year + 1 : latest.year,
      };
    }
    // No history yet — fall back to the pending rent's own month/year
  const today = new Date();

return {
  month: today.getMonth() + 1, // 1–12
  year: today.getFullYear(),
};
  })();

const rentAmount =
  pendingRent?.amount
    ? `${pendingRent.currency}${pendingRent.amount}`
    : assignedMonthlyRent > 0
    ? `$${assignedMonthlyRent}`
    : '--';

  // Due date is always the 1st of the next month to be created
  const rentDueDate = (() => {
    const { month, year } = nextRentDate;
    if (!month || !year) return '--';
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  })();

  // Step 1 — fetch tenant's property assignments on mount
  useEffect(() => {
    dispatch(getMyProperties());
  }, [dispatch]);

  // Step 2 — once active lease is found, fetch full property detail (has monthlyRent)
  useEffect(() => {
    if (activePropertyId && token) {
      dispatch(getProperty({ propertyId: activePropertyId, token }));
    }
  }, [dispatch, activePropertyId, token]);

  // Fetch maintenance requests
  useEffect(() => {
    if (token && tenant_sub) {
      dispatch(getMaintenanceRequests({ tenant_id: tenant_sub, token }));
    }
  }, [dispatch, token, tenant_sub]);
  
  

 
useEffect(() => {
  if (!tenant_sub) return;
  dispatch(clearRentData());
  dispatch(clearCurrentProperty());
  dispatch(getUpcomingRents());
  dispatch(getTenantRentHistory());
}, [dispatch, tenant_sub]);

console.log("🔍 pendingRent:", pendingRent);
console.log("🔍 assignedMonthlyRent:", assignedMonthlyRent);
console.log("🔍 activeLease:", activeLease);

const handlePayRent = async () => {
  if (pendingRent) {
    console.log("⚠️ Rent already exists, redirect to payment flow");
    
    // 👉 Ideally navigate to payment screen instead
    // navigation.navigate("Payment", { rentId: pendingRent.id });

    return;
  }

  const ptId = propertyTenantId;
  const { month, year } = nextRentDate;

  if (!ptId || !month || !year) return;

  setPaying(true);

  await dispatch(createRent({
    propertyTenantId: ptId,
    month,
    year,
  }));

  dispatch(getUpcomingRents());
  dispatch(getTenantRentHistory());

  setPaying(false);
};
  // ── Maintenance helpers ───────────────────────────────────────────────────
  const getDisplayStatus = (item) => {
    if (item.contractor_assignment?.state?.toUpperCase() === "COMPLETED") return "Resolved";
    const mainStatus = item.status?.toLowerCase();
    if (mainStatus === "completed" || mainStatus === "closed" || mainStatus === "resolved") return "Resolved";
    if (item.completed_at || item.completion_notes) return "Resolved";
    if (
      item.contractor_assignment?.state?.toUpperCase() === "ACCEPTED" ||
      item.contractor_assignment?.state?.toUpperCase() === "IN_PROGRESS"
    ) return "In Progress";
    if (mainStatus === "open" || mainStatus === "new") return "New Request";
    return "Pending";
  };

  const newRequestCount = requests.filter((r) => getDisplayStatus(r) === "New Request").length;
  const inProgressCount = requests.filter((r) => getDisplayStatus(r) === "In Progress").length;
  const completedCount  = requests.filter((r) => getDisplayStatus(r) === "Resolved").length;

  const getUpcomingMaintenance = () => {
    const now   = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    return requests
      .filter((item) => {
        if (!item.preferred_window?.start_utc) return false;
        const scheduledDate = new Date(item.preferred_window.start_utc);
        return (
          scheduledDate >= today &&
          item.status?.toLowerCase() !== "closed" &&
          item.status?.toLowerCase() !== "resolved"
        );
      })
      .sort((a, b) =>
        new Date(a.preferred_window.start_utc) - new Date(b.preferred_window.start_utc)
      );
  };

  const upcomingMaintenance = getUpcomingMaintenance();
  const displayedItems = showAllMaintenance
    ? upcomingMaintenance
    : upcomingMaintenance.slice(0, 1);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const formatTimeWindow = (startUtc, endUtc) => {
    if (!startUtc || !endUtc) return "";
    const fmt = (d) =>
      new Date(d).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true,
      });
    return `${fmt(startUtc)} - ${fmt(endUtc)}`;
  };

  return (
    <Container scroll={false}>
      {/* Quick Links Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.quickLinksRow}>
          <QuickLink
            icon={icons.LandlordRent}
            label="Contact Landlord"
            onPress={() => navigation.navigate("ContactLandlord")}
          />
          <QuickLink
            icon={icons.RentHistory}
            label={"Rent\nHistory"}
            onPress={() => navigation.navigate("RentHistory")}
          />
          <QuickLink
            icon={icons.RentDocument}
            label="Rent Documents"
            onPress={() => navigation.navigate("RentDocuments")}
          />
          <QuickLink
            icon={icons.redMessages}
            label={"Report\nIssue"}
            onPress={() => navigation.navigate("AIAssistant", { hideSuggestions: true })}
          />
        </View>
      </View>

     {/* Rent Payment Card */}
<View style={styles.rentCardWrapper}>
  <View style={styles.glassCard}>
    <View style={styles.rentCardInner}>
      {/* ✅ Show assigned property name */}


      <View style={styles.row}>
        <View style={styles.rentIconBox}>
          <AppIcon name={icons.RentHistory} height={hp(3)} width={hp(3)} />
        </View>
        <View style={styles.rentTextBlock}>
          {rentLoading ? (
            <ActivityIndicator size="small" color={Colors.red} />
          ) : (
            <Text style={styles.rentAmount}>{rentAmount}</Text>
          )}
          <Text style={styles.rentSubText}>Monthly Rent</Text>
        </View>
        <TouchableOpacity
          style={[styles.payRentBtn, paying && { opacity: 0.7 }]}
          onPress={handlePayRent}
        disabled={paying || !propertyTenantId || !!pendingRent}
        >
          {paying
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.payRentBtnText}>Pay Rent</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.row, { marginTop: hp(1.5) }]}>
        <AppIcon name={icons.calendar} height={hp(2)} width={hp(2)} />
        <Text style={[styles.rentSubText, { marginLeft: 6 }]}>
          Next Due Date:{' '}
          {rentLoading
            ? <Text style={styles.boldBlack}>--</Text>
            : <Text style={styles.boldBlack}>{rentDueDate}</Text>}
        </Text>
      </View>
    </View>
  </View>
</View>

      {/* Request Help Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Help</Text>
        <View style={styles.glassCard}>
          <View style={styles.glassCardInner}>
            {maintenanceLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.statsRow}>
                  {/* New Request */}
                  <View style={styles.statItem}>
                    <View style={styles.row}>
                      <AppIcon name={icons.email} height={hp(2.2)} width={hp(2.2)} />
                      <Text style={[styles.statCount, { marginLeft: 6 }]}>
                        {newRequestCount.toString().padStart(2, "0")}
                      </Text>
                    </View>
                    <Text style={styles.statLabel}>New Request</Text>
                  </View>

                  {/* In Progress */}
                  <View style={styles.statItem}>
                    <View style={styles.row}>
                      <View style={styles.progressIcon}>
                        <Text style={styles.progressIconText}>⏱</Text>
                      </View>
                      <Text style={[styles.statCount, { marginLeft: 6 }]}>
                        {inProgressCount.toString().padStart(2, "0")}
                      </Text>
                    </View>
                    <Text style={styles.statLabel}>In Progress</Text>
                  </View>

                  {/* Completed */}
                  <View style={styles.statItem}>
                    <View style={styles.row}>
                      <View style={styles.completedIcon}>
                        <Text style={styles.completedIconText}>✓</Text>
                      </View>
                      <Text style={[styles.statCount, { marginLeft: 6 }]}>
                        {completedCount.toString().padStart(2, "0")}
                      </Text>
                    </View>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => navigation.navigate("Support")}
                >
                  <Text style={styles.viewDetailsBtnText}>View Details</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Upcoming Maintenance Section */}
      <View style={[styles.section, { marginBottom: hp(3) }]}>
        <Text style={styles.sectionTitle}>Upcoming Maintenance</Text>
        <View style={styles.glassCard}>
          <View style={styles.glassCardInner}>
            {maintenanceLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : upcomingMaintenance.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="calendar-check" size={40} color="#E0E0E0" />
                <Text style={[styles.statLabel, { marginTop: 8, textAlign: "center" }]}>
                  No upcoming maintenance scheduled
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.maintenanceList}>
                  {displayedItems.map((item, index) => (
                    <TouchableOpacity
                      key={item.ticket_id || item.id}
                      onPress={() => navigation.navigate("QueryDetails", { data: item })}
                    >
                      <View
                        style={[
                          styles.maintenanceItem,
                          index < displayedItems.length - 1 && styles.maintenanceItemBorder,
                        ]}
                      >
                        <View style={styles.maintenanceIconBox}>
                          <AppIcon name={icons.maintenance} height={hp(2.5)} width={hp(2.5)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.statLabel}>
                            {formatDate(item.preferred_window?.start_utc)}
                          </Text>
                          <Text style={[styles.boldBlack, { fontSize: hp(1.9), marginTop: 2 }]}>
                            {item.title || "Maintenance Request"}
                          </Text>
                          <Text style={[styles.statLabel, { marginTop: 2 }]}>
                            {item.location || "Location not specified"} •{" "}
                            {formatTimeWindow(
                              item.preferred_window?.start_utc,
                              item.preferred_window?.end_utc
                            )}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {upcomingMaintenance.length > 1 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllMaintenance(!showAllMaintenance)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllMaintenance
                        ? "Show less details ▲"
                        : `Show more details (${upcomingMaintenance.length - 1} more) ▼`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Container>
  );
};

// Quick Link Component (unchanged)
const QuickLink = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickLink} onPress={onPress}>
    <View style={styles.iconCircle}>
      <AppIcon name={icon} height={hp(3.5)} width={hp(3.5)} />
    </View>
    <Text style={styles.quickLinkText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
 
  section: {
    marginHorizontal: wp(4.5),
   
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: hp(1.5),
  },
  quickLinksRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: hp(0.5),
  },
  rentCardWrapper: {
    marginHorizontal: wp(4.5),
    marginTop: hp(1),
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  glassCardInner: { padding: hp(2) },
  rentCardInner:  { padding: hp(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rentIconBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: hp(1.2),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  rentTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  rentAmount: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: Colors.black,
  },
  rentSubText: {
    fontSize: hp(1.5),
    color: Colors.textGray,
  },
  boldBlack: {
    fontWeight: "bold",
    color: Colors.black,
  },
  payRentBtn: {
    backgroundColor: Colors.red,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: 10,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  payRentBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: hp(1.8),
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: hp(2),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statCount: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: Colors.black,
  },
  statLabel: {
    fontSize: hp(1.6),
    color: Colors.textGray,
    marginTop: 4,
  },
  progressIcon: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  progressIconText: { fontSize: hp(1.5) },
  completedIcon: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  completedIconText: {
    fontSize: hp(1.5),
    color: "#059669",
    fontWeight: "bold",
  },
  viewDetailsBtn: {
    borderWidth: 2,
    borderColor: Colors.red,
    paddingVertical: hp(1.5),
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  viewDetailsBtnText: {
    color: Colors.red,
    fontWeight: "bold",
    fontSize: hp(1.8),
  },
  maintenanceList: { gap: 12 },
  maintenanceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: hp(1.5),
    gap: 12,
  },
  maintenanceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  maintenanceIconBox: {
    backgroundColor: "rgba(255, 232, 232, 0.9)",
    padding: hp(1.5),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  showMoreBtn: {
    paddingTop: hp(2),
    alignItems: "center",
  },
  showMoreText: {
    fontSize: hp(1.7),
    color: Colors.textGray,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: hp(2),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: hp(3),
    alignItems: "center",
    justifyContent: "center",
  },
  quickLink: {
    alignItems: "center",
    width: wp(22),
  },
  quickLinkText: {
    fontFamily: "Nunito",
    fontWeight: "600",
    fontSize: hp(1.7),
    textAlign: "center",
    color: Colors.black,
    width: wp(22),
    marginTop: hp(0.5),
    height: hp(4.5),
    lineHeight: hp(2.2),
  },
  iconCircle: {
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: hp(1.5),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: Colors.lightRed,
  },
});

export default Dashboard;
