// src/screens/ContractorSupport/ContractorSupport.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-simple-toast';

import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import Container from '../../components/Container/Container';
import JobRequestCard from './JobRequestCard';
import JobDetailsModal from './JobDetailsModal';

import {
  getAllContractorJobs,
  acceptContractorJob,
  declineContractorJob,
  getContractorJob,
  getContractorInvoice,
  completeContractorJob,
  getOfferedJobs,
} from '../../Redux/ContractorServices/services';
import {
  contractorSelectors,
  addPendingJob,
  removePendingJob,
  updateJobLocally,
  markJobAcceptedByOther,
  clearPendingJobs,
} from '../../Redux/ContractorServices/contractorSlice';
import { loginDataSelectors } from '../../Redux/Login/loginSlice';
import { emitJobEvent, onJobEvent, JOB_EVENTS } from '../../utils/Jobeventbus';


const DECLINED_STATES = new Set(['DENIED', 'DECLINED', 'REJECTED']);

const DEFAULT_FILTERS = {
  status: null,
  offered_only: false,
  unassigned_only: false,
  limit: 20,
};

// ─── Pure helpers (no hooks) ──────────────────────────────────────────────────

/**
 * Derive the display status for a job from its raw API fields.
 * This is the single source of truth for which tab a job belongs to.
 */
const getUIStatus = (job) => {
  if (!job) return 'New';
  const status = job?.status?.toUpperCase();
  const state  = job?.contractor_assignment?.state?.toUpperCase();

  if (status === 'COMPLETED' || state === 'COMPLETED') return 'Complete';
  if (job.completed_at || job.completion_notes)        return 'Complete';
  if (DECLINED_STATES.has(state))                      return 'Declined';
  if (
    state === 'UNASSIGNED' &&
    job?.contractor_rejections &&
    Object.keys(job.contractor_rejections).length > 0
  ) return 'Declined';

  if (state === 'ACCEPTED' || state === 'IN_PROGRESS') return 'In Progress';
  return 'New';
};

/**
 * Enrich a raw API job object with normalised fields expected by the UI.
 * Pure function — safe to call in useMemo / renderItem.
 */
const transformJobData = (item, invoicesMap = {}) => {
  if (!item) return null;

  const property = item.contractor_job_snapshot?.property || {};
  const tenant   = item.contractor_job_snapshot?.tenant   || {};
  const ids      = item.contractor_job_snapshot?.ids      || {};

  const addressParts = [
    property.name, property.street, property.city,
    property.state, property.pincode,
  ].filter(Boolean);

  const address =
    item.address ||
    (addressParts.length ? addressParts.join(', ') : item.location || 'Location not specified');

  const invoiceData =
    invoicesMap[item.ticket_id] ||
    item.invoice                ||
    item.contractor_assignment?.invoice ||
    null;

  return {
    ...item,
    id:           item.ticket_id,
    address,
    title:        item.title || 'Maintenance Request',
    offered_at:
      item.offered_at                          ||
      item.contractor_assignment?.offered_at   ||
      item.contractor_assignment?.created_at   ||
      item.created_at                          ||
      null,
    date:
      item.date ||
      (item.preferred_window?.start_utc
        ? new Date(item.preferred_window.start_utc).toLocaleString('en-US', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : 'Date not specified'),
    status:        getUIStatus(item),
    description:   item.description  || item.title || 'No description',
    tenant_name:   item.tenant_name  || tenant.name,
    tenant_phone:  item.tenant_phone || tenant.phone,
    tenant_email:  item.tenant_email || tenant.email,
    property_name: item.property_name || property.name,
    has_invoice:   !!(invoiceData || item.has_invoice),
    invoice:       invoiceData,
    property_id:   item.property_id || ids.property_id  || property.property_id,
    tenant_id:     item.tenant_id   || ids.tenant_id    || tenant.tenant_id,
    landlord_id:   item.landlord_id || ids.landlord_id  || property.landlord_id,
    contractor_job_snapshot: item.contractor_job_snapshot,
    image_urls:
      item.image_urls                           ||
      item.attachments?.photos                  ||
      item.attachments?.image_urls              ||
      item.media?.photos                        ||
      item.contractor_job_snapshot?.image_urls  ||
      [],
    property_lat:
      item.property_lat ?? property.latitude ?? property.lat  ?? null,
    property_lng:
      item.property_lng ?? property.longitude ?? property.lng ?? null,
  };
};

/**
 * Merge multiple job arrays into one deduplicated list.
 * Later arrays take priority (last-write-wins per ticket_id).
 */
const mergeAndDedup = (...arrays) => {
  const map = new Map();
  for (const arr of arrays) {
    for (const job of arr || []) {
      if (job?.ticket_id) map.set(job.ticket_id, job);
    }
  }
  return Array.from(map.values());
};

// ─── Component ────────────────────────────────────────────────────────────────

const ContractorSupport = ({ navigation, route }) => {
  const dispatch = useDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const { lat: contractorAddressLat, lng: contractorAddressLng } =
    useSelector(loginDataSelectors.getAddressVerification);

  const authToken = useSelector(
    (state) =>
      state.loginData?.idToken     ||
      state.loginData?.accessToken ||
      state.login?.idToken         ||
      state.login?.accessToken     ||
      state.login?.token           ||
      null,
  );

  const { jobs, pendingJobs, offeredJobs, declinedJobs, loading, appliedFilters } =
    useSelector(contractorSelectors.getContractorData);

  // ── Local state ─────────────────────────────────────────────────────────────
  const [selectedJob,     setSelectedJob]    = useState(null);
  const [modalVisible,    setModalVisible]   = useState(false);
  const [showAll,         setShowAll]        = useState(false);
  const [activeFilter,    setActiveFilter]   = useState(null);
  const [loadingInvoices, setLoadingInvoices]= useState(false);
  const [invoicesMap,     setInvoicesMap]    = useState({});
  const [acceptingJobId,  setAcceptingJobId] = useState(null);

  const expiredJobsRef    = useRef(new Set());
  const pendingPollRef    = useRef(null);
  const appStateRef       = useRef(AppState.currentState);
  // Track the ticket currently being accepted so polls/watchers ignore it
  const acceptingJobIdRef = useRef(null);

  // ── Re-validate when app comes to foreground ────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        dispatch(getAllContractorJobs(DEFAULT_FILTERS));
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [dispatch]);

  // ── Derived data (memoised) ─────────────────────────────────────────────────

  // IDs already accepted so we can exclude them from offeredJobs
  const acceptedIds = useMemo(
    () => new Set((jobs || []).map((j) => j.ticket_id)),
    [jobs],
  );

  // Offered jobs that have NOT been accepted yet
  const newOfferedJobs = useMemo(
    () => (offeredJobs || []).filter((j) => !acceptedIds.has(j.ticket_id)),
    [offeredJobs, acceptedIds],
  );

  // "New" bucket = push-notification jobs + not-yet-accepted offered jobs
  const newJobsBucket = useMemo(
    () => mergeAndDedup(pendingJobs, newOfferedJobs),
    [pendingJobs, newOfferedJobs],
  );

  // IDs in the new bucket — used to prevent double-counting in activeJobs
  const newJobIds = useMemo(
    () => new Set(newJobsBucket.map((j) => j.ticket_id)),
    [newJobsBucket],
  );

  // "Active" jobs from API (already filtered of declined in the slice),
  // minus anything already showing in the New bucket
  const activeJobs = useMemo(
    () => (jobs || []).filter((j) => !newJobIds.has(j.ticket_id)),
    [jobs, newJobIds],
  );

  // "Declined" bucket — only populated when the server CONFIRMED the decline
  const declinedBucket = useMemo(() => declinedJobs || [], [declinedJobs]);

  // "All" tab = new + active + declined (fully deduplicated)
  const allJobs = useMemo(
    () => mergeAndDedup(newJobsBucket, activeJobs, declinedBucket),
    [newJobsBucket, activeJobs, declinedBucket],
  );

  // ── Stats — always derived from buckets, never independently recounted ──────
  const stats = useMemo(() => {
    const newCount       = newJobsBucket.length;
    const inProgressCount = activeJobs.filter((j) => getUIStatus(j) === 'In Progress').length;
    const completedCount  = activeJobs.filter((j) => getUIStatus(j) === 'Complete').length;
    const declinedCount   = declinedBucket.length;
    const totalCount      = newCount + inProgressCount + completedCount + declinedCount;

    const totalEarnings = activeJobs.reduce((sum, job) => {
      const isCompleted =
        job?.contractor_assignment?.state?.toUpperCase() === 'COMPLETED' ||
        job?.status?.toUpperCase() === 'COMPLETED';
      if (!isCompleted) return sum;
      const invoiceTotal = invoicesMap[job.ticket_id]?.total ?? job?.invoice?.total;
      return typeof invoiceTotal === 'number' ? sum + invoiceTotal : sum;
    }, 0);

    return {
      totalJobs:      totalCount,
      newJobs:        newCount,
      inProgressJobs: inProgressCount,
      completedJobs:  completedCount,
      declinedJobs:   declinedCount,
      totalEarnings,
    };
  }, [newJobsBucket, activeJobs, declinedBucket, invoicesMap]);

  // ── Filtered total (for "Show More" label) ──────────────────────────────────
  const filteredTotal = useMemo(() => {
    if (activeFilter === null)         return allJobs.length;
    if (activeFilter === 'New')        return newJobsBucket.length;
    if (activeFilter === 'Declined')   return declinedBucket.length;
    return activeJobs.filter((j) => getUIStatus(j) === activeFilter).length;
  }, [activeFilter, allJobs, newJobsBucket, activeJobs, declinedBucket]);

  // ── Visible jobs for FlatList ────────────────────────────────────────────────
  const visibleJobs = useMemo(() => {
    let source;
    if      (activeFilter === null)        source = allJobs;
    else if (activeFilter === 'New')       source = newJobsBucket;
    else if (activeFilter === 'Declined')  source = declinedBucket;
    else source = activeJobs.filter((j) => getUIStatus(j) === activeFilter);

    // Merge in any locally-fetched invoice data
    const withInvoices = source.map((job) =>
      invoicesMap[job.ticket_id]
        ? { ...job, invoice: invoicesMap[job.ticket_id], has_invoice: true }
        : job,
    );

    return showAll ? withInvoices : withInvoices.slice(0, 2);
  }, [showAll, activeFilter, allJobs, newJobsBucket, activeJobs, declinedBucket, invoicesMap]);

  // ── Load invoices for active / completed jobs ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const jobsToCheck = activeJobs.filter((job) => {
        const state = job?.contractor_assignment?.state?.toUpperCase();
        return (
          ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(state) ||
          job?.status?.toUpperCase() === 'COMPLETED'
        );
      });

      if (jobsToCheck.length === 0) return;

      setLoadingInvoices(true);
      const newMap = { ...invoicesMap };

      await Promise.allSettled(
        jobsToCheck.map(async (job) => {
          if (newMap[job.ticket_id]) return; // already cached
          try {
            const result = await dispatch(
              getContractorInvoice({ ticket_id: job.ticket_id }),
            ).unwrap();
            if (result?.invoice) newMap[job.ticket_id] = result.invoice;
          } catch {
            // no invoice yet — silently skip
          }
        }),
      );

      setInvoicesMap(newMap);
      setLoadingInvoices(false);
    };

    load();
    // Re-run only when the number of active jobs changes (avoids infinite loops)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobs.length]);

  // ── Listen for "another contractor accepted this job" events ────────────────
  useEffect(() => {
    const subscription = onJobEvent(JOB_EVENTS.JOB_ACCEPTED_BY_OTHER, ({ ticket_id }) => {
      // Ignore if THIS device just accepted this job — emitJobEvent fires on
      // the same process so DeviceEventEmitter delivers it here too.
      if (acceptingJobIdRef.current === ticket_id) return;

      dispatch(markJobAcceptedByOther({ ticket_id }));

      setSelectedJob((prev) => {
        if (prev?.ticket_id === ticket_id) {
          setModalVisible(false);
          Toast.show('This job was accepted by another contractor.');
          return null;
        }
        return prev;
      });
    });

    return () => subscription.remove();
  }, [dispatch]);

  // ── Initial data load ────────────────────────────────────────────────────────
  //
  // getAllContractorJobs.fulfilled in the slice reconciles pendingJobs:
  // any pendingJob whose ticket_id is absent from the response was taken by
  // another contractor and is moved to declinedJobs automatically.
  useEffect(() => {
    dispatch(getAllContractorJobs(DEFAULT_FILTERS));
  }, [dispatch]);

  // ── Poll every 10s using getAllContractorJobs ─────────────────────────────────
  //
  // offered_only=1 always returns [] — the backend delivers jobs via push
  // notifications directly, not through an "offered" queue. So we poll the full
  // job list instead. The slice's getAllContractorJobs.fulfilled reconciles
  // pendingJobs: any pendingJob absent from the response = taken by another
  // contractor and moved to declinedJobs automatically.
  const prevOfferedIdsRef = useRef(new Set());

  useEffect(() => {
    const interval = setInterval(
      () => dispatch(getAllContractorJobs(DEFAULT_FILTERS)),
      10_000,
    );
    return () => clearInterval(interval);
  }, [dispatch]);

  // ── Per-pendingJob status check every 8s ────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const snapshot = pendingJobs || [];
      if (snapshot.length === 0) return;

      const ownId = (jobs || [])
        .find((j) => j.contractor_assignment?.accepted_by)
        ?.contractor_assignment?.accepted_by ?? null;

      const ownAcceptedIds = new Set((jobs || []).map((j) => j.ticket_id));

      for (const pJob of snapshot) {
        const tid = pJob.ticket_id;
        if (!tid || ownAcceptedIds.has(tid)) continue;

        // Skip any job currently being accepted on this device
        if (acceptingJobIdRef.current === tid) continue;

        try {
          const result = await dispatch(
            getContractorJob({ ticket_id: tid }),
          ).unwrap();

          const assignedTo = result?.assigned_contractor_id
            || result?.contractor_assignment?.accepted_by;

          // Only flag as taken-by-other when we KNOW our own ID and it doesn't match
          if (assignedTo && ownId && assignedTo !== ownId) {
            dispatch(markJobAcceptedByOther({ ticket_id: tid }));
          }
        } catch {
          // 404 or network error — leave the job in pendingJobs;
          // the next getAllContractorJobs poll will reconcile if needed
        }
      }
    }, 8_000);

    return () => clearInterval(interval);
  }, [pendingJobs, jobs, dispatch]);

  // ── Close modal if selected job was just moved to declined ──────────────────
  useEffect(() => {
    if (!selectedJob || !modalVisible) return;

    // Do NOT close the modal while we are in the middle of accepting this job.
    // The accept flow: pendingJob → briefly absent from pendingJobs before
    // getAllContractorJobs fires → could trigger this watcher prematurely.
    if (acceptingJobIdRef.current === selectedJob.ticket_id) return;

    const wasDeclined = (declinedJobs || []).some(
      (j) => j.ticket_id === selectedJob.ticket_id,
    );
    if (wasDeclined) {
      setModalVisible(false);
      setSelectedJob(null);
      Toast.show('This job was accepted by another contractor.');
    }
  }, [declinedJobs, selectedJob, modalVisible]);

  // ── Handle deep-link / push-notification job ─────────────────────────────────
  useEffect(() => {
    if (route?.params?.newJobTicketId) {
      fetchAndShowNewJob(route.params.newJobTicketId);
      navigation.setParams({ newJobTicketId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.newJobTicketId]);

  const fetchAndShowNewJob = useCallback(
    async (ticketId) => {
      try {
        const result = await dispatch(
          getContractorJob({ ticket_id: ticketId }),
        ).unwrap();
        if (result) {
          dispatch(addPendingJob(result));
          setSelectedJob(transformJobData(result, invoicesMap));
          setModalVisible(true);
          Toast.show('New job request received!');
        }
      } catch {
        Toast.show('Failed to load job details');
      }
    },
    [dispatch, invoicesMap],
  );

  // ── Handle return from AddInvoiceScreen ──────────────────────────────────────
  useEffect(() => {
    if (route?.params?.invoiceSubmitted && route?.params?.ticket_id) {
      const { ticket_id, invoice } = route.params;

      if (invoice) {
        setInvoicesMap((prev) => ({ ...prev, [ticket_id]: invoice }));
      }
      if (selectedJob?.ticket_id === ticket_id) {
        setSelectedJob((prev) => ({ ...prev, has_invoice: true, invoice }));
      }

      dispatch(getAllContractorJobs(DEFAULT_FILTERS));
      navigation.setParams({
        invoiceSubmitted: undefined,
        ticket_id:        undefined,
        invoice:          undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.invoiceSubmitted]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleJobPress = useCallback((transformedJob) => {
    setSelectedJob(transformedJob);
    setModalVisible(true);
  }, []);

  const handleAddInvoiceFromCard = useCallback(
    (job) => navigation.navigate('AddInvoiceScreen', { job }),
    [navigation],
  );

  const handleAcceptJob = useCallback(async () => {
    if (!selectedJob) return;
    const ticketId = selectedJob.ticket_id;
    if (acceptingJobId === ticketId) return; // prevent double-tap

    try {
      setAcceptingJobId(ticketId);
      acceptingJobIdRef.current = ticketId; // block polls/watchers for this job

      const result = await dispatch(
        acceptContractorJob({ ticket_id: ticketId }),
      ).unwrap();

      dispatch(
        updateJobLocally({
          ticket_id: ticketId,
          contractor_assignment: {
            ...result.contractor_assignment,
            state: result.contractor_assignment?.state || 'ACCEPTED',
          },
        }),
      );
      dispatch(removePendingJob({ ticket_id: ticketId }));

      // 🔔 Broadcast to OTHER contractor devices that have this job open.
      // The listener on THIS device checks acceptingJobIdRef and ignores it.
      emitJobEvent(JOB_EVENTS.JOB_ACCEPTED_BY_OTHER, { ticket_id: ticketId });

      await dispatch(getAllContractorJobs(DEFAULT_FILTERS));

      setModalVisible(false);
      setAcceptingJobId(null);
      acceptingJobIdRef.current = null;
      Toast.show('Job accepted! You can now create an invoice.');
    } catch (error) {
      setAcceptingJobId(null);
      acceptingJobIdRef.current = null;
      const msg = error?.message || error?.toString() || '';

      const takenByOther =
        msg.includes('already assigned') ||
        msg.includes('ConditionalCheckFailed') ||
        msg.includes('already accepted');

      if (takenByOther) {
        dispatch(markJobAcceptedByOther({ ticket_id: ticketId }));
        setModalVisible(false);
        Toast.show('This job was already accepted by another contractor.');
        dispatch(getAllContractorJobs(DEFAULT_FILTERS));
      } else {
        Toast.show(msg || 'Failed to accept job. Please try again.');
      }
    }
  }, [selectedJob, acceptingJobId, dispatch]);

  const handleDeclineJob = useCallback(
    async (reason) => {
      if (!selectedJob) return;
      const ticketId = selectedJob.ticket_id;

      try {
        await dispatch(
          declineContractorJob({ ticket_id: ticketId, reason: reason || 'Not available' }),
        ).unwrap();

        // .unwrap() throws if the thunk rejected (including body-level errors),
        // so reaching this line guarantees the server confirmed the decline.
        dispatch(removePendingJob({ ticket_id: ticketId }));
        setModalVisible(false);
        await dispatch(getAllContractorJobs(DEFAULT_FILTERS));
        Toast.show('Job declined');
      } catch (error) {
        // Server returned an error (e.g. Decimal serialization) — do NOT modify
        // declinedJobs locally; just inform the user.
        const msg = error?.message || 'Failed to decline job';
        Toast.show(msg);
      }
    },
    [selectedJob, dispatch],
  );

  const handleMarkComplete = useCallback(async () => {
    if (!selectedJob) return;

    if (!selectedJob.has_invoice) {
      Alert.alert(
        'Invoice Required',
        'Please create an invoice before marking this job as complete.',
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Complete Job',
      'Are you sure you want to mark this job as complete? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Complete',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(
                completeContractorJob({
                  ticket_id:        selectedJob.ticket_id,
                  completion_notes: 'Job completed successfully',
                }),
              ).unwrap();

              dispatch(
                updateJobLocally({
                  ticket_id: selectedJob.ticket_id,
                  contractor_assignment: {
                    ...selectedJob.contractor_assignment,
                    state: 'COMPLETED',
                  },
                  status:       'COMPLETED',
                  completed_at: result.ticket?.completed_at || new Date().toISOString(),
                }),
              );

              await dispatch(getAllContractorJobs(DEFAULT_FILTERS));
              Toast.show('Job marked as completed successfully!');
              setModalVisible(false);
            } catch (error) {
              Alert.alert('Error', error?.message || 'Failed to mark job complete', [{ text: 'OK' }]);
            }
          },
        },
      ],
    );
  }, [selectedJob, dispatch]);

  /**
   * Auto-expire handler — called by JobRequestCard when the 10-min timer fires.
   * Guards against running twice for the same ticket via the ref.
   */
  const handleJobExpired = useCallback(
    (ticketId) => {
      if (expiredJobsRef.current.has(ticketId)) return;

      const currentJob = [...newJobsBucket, ...activeJobs].find(
        (j) => j.ticket_id === ticketId,
      );
      if (getUIStatus(currentJob) !== 'New') return;

      expiredJobsRef.current.add(ticketId);

      dispatch(
        declineContractorJob({
          ticket_id: ticketId,
          reason:    'Offer expired – no response within 10 minutes',
        }),
      )
        .unwrap()
        .then(() => {
          dispatch(removePendingJob({ ticket_id: ticketId }));
          dispatch(getAllContractorJobs(DEFAULT_FILTERS));
          Toast.show('Job offer expired and has been declined automatically.');
        })
        .catch(() => {
          // Server error on auto-expire — still remove from pending locally
          dispatch(removePendingJob({ ticket_id: ticketId }));
          dispatch(getAllContractorJobs(DEFAULT_FILTERS));
        });
    },
    [dispatch, newJobsBucket, activeJobs],
  );

  const handleTabPress = useCallback((tabValue) => {
    setActiveFilter(tabValue);
    setShowAll(false);
  }, []);

  // ── Render helpers ────────────────────────────────────────────────────────────

  const keyExtractor = useCallback((item) => item.ticket_id, []);

  const renderJobCard = useCallback(
    ({ item }) => {
      const transformed = transformJobData(item, invoicesMap);
      return (
        <JobRequestCard
          job={transformed}
          onPress={() => handleJobPress(transformed)}
          onAddInvoice={handleAddInvoiceFromCard}
          onJobExpired={handleJobExpired}
          navigation={navigation}
        />
      );
    },
    [handleJobPress, handleAddInvoiceFromCard, handleJobExpired, invoicesMap, navigation],
  );

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading && allJobs.length === 0) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading jobs…</Text>
        </View>
      </Container>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Container>
      <ScrollView
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
      >
        <View style={styles.container}>

          {/* ── Stats card ─────────────────────────────────────────────────── */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <AppIcon name={icons.activeJob} size={wp(5)} color="#1976D2" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>TOTAL JOBS</Text>
                <Text style={styles.statValue}>
                  {stats.totalJobs.toString().padStart(2, '0')}
                </Text>
              </View>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <AppIcon name={icons.dollar} size={wp(5)} color="#388E3C" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>TOTAL EARNINGS</Text>
                <Text style={styles.statValue}>
                  ${stats.totalEarnings.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Section header ─────────────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Jobs Request{appliedFilters ? ' (Filtered)' : ''}
            </Text>
            {loadingInvoices && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
          </View>

          {/* ── Filter tabs ─────────────────────────────────────────────────── */}
          <View style={styles.statusSummary}>

            {/* All */}
            <TouchableOpacity
              style={[styles.summaryItem, activeFilter === null && styles.summaryItemActive]}
              onPress={() => handleTabPress(null)}
              activeOpacity={0.75}
            >
              <Text style={[styles.summaryNumber, activeFilter === null && { color: Colors.black }]}>
                {stats.totalJobs.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.summaryLabel}>All</Text>
              {activeFilter === null && (
                <View style={[styles.activeBar, { backgroundColor: Colors.black }]} />
              )}
            </TouchableOpacity>

            {/* New */}
            <TouchableOpacity
              style={[styles.summaryItem, activeFilter === 'New' && styles.summaryItemActive]}
              onPress={() => handleTabPress('New')}
              activeOpacity={0.75}
            >
              <Text style={[styles.summaryNumber, { color: '#1976D2' }]}>
                {stats.newJobs.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.summaryLabel}>New Request</Text>
              {activeFilter === 'New' && (
                <View style={[styles.activeBar, { backgroundColor: '#1976D2' }]} />
              )}
            </TouchableOpacity>

            {/* In Progress */}
            <TouchableOpacity
              style={[styles.summaryItem, activeFilter === 'In Progress' && styles.summaryItemActive]}
              onPress={() => handleTabPress('In Progress')}
              activeOpacity={0.75}
            >
              <Text style={[styles.summaryNumber, { color: '#F57C00' }]}>
                {stats.inProgressJobs.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.summaryLabel}>In Progress</Text>
              {activeFilter === 'In Progress' && (
                <View style={[styles.activeBar, { backgroundColor: '#F57C00' }]} />
              )}
            </TouchableOpacity>

            {/* Completed */}
            <TouchableOpacity
              style={[styles.summaryItem, activeFilter === 'Complete' && styles.summaryItemActive]}
              onPress={() => handleTabPress('Complete')}
              activeOpacity={0.75}
            >
              <Text style={[styles.summaryNumber, { color: '#388E3C' }]}>
                {stats.completedJobs.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.summaryLabel}>Completed</Text>
              {activeFilter === 'Complete' && (
                <View style={[styles.activeBar, { backgroundColor: '#388E3C' }]} />
              )}
            </TouchableOpacity>

            {/* Declined */}
            <TouchableOpacity
              style={[styles.summaryItem, activeFilter === 'Declined' && styles.summaryItemActive]}
              onPress={() => handleTabPress('Declined')}
              activeOpacity={0.75}
            >
              <Text style={[styles.summaryNumber, { color: '#D32F2F' }]}>
                {stats.declinedJobs.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.summaryLabel}>Declined</Text>
              {activeFilter === 'Declined' && (
                <View style={[styles.activeBar, { backgroundColor: '#D32F2F' }]} />
              )}
            </TouchableOpacity>

          </View>

          {/* ── Job list ────────────────────────────────────────────────────── */}
          {filteredTotal === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeFilter === 'New'
                  ? 'No new job requests'
                  : activeFilter
                  ? `No ${activeFilter} jobs`
                  : 'No jobs available'}
              </Text>
              <Text style={styles.emptySubText}>
                {activeFilter === 'New'
                  ? 'New jobs will appear here when a tenant submits a maintenance request'
                  : activeFilter
                  ? 'Try selecting a different category'
                  : appliedFilters
                  ? 'Try adjusting your filters'
                  : 'New jobs will appear here'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={visibleJobs}
              renderItem={renderJobCard}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
              removeClippedSubviews
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={2}
              extraData={[invoicesMap, activeFilter]}
              ListFooterComponent={
                <>
                  {!showAll && filteredTotal > 2 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAll(true)}
                    >
                      <Text style={styles.showMoreText}>
                        Show More ({filteredTotal - 2})
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showAll && filteredTotal > 2 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAll(false)}
                    >
                      <Text style={styles.showMoreText}>Show Less</Text>
                      <AppIcon name={icons.arrowUp} size={wp(4)} color={Colors.red} />
                    </TouchableOpacity>
                  )}
                </>
              }
            />
          )}

        </View>
      </ScrollView>

      <JobDetailsModal
        visible={modalVisible}
        job={selectedJob}
        authToken={authToken}
        onClose={() => setModalVisible(false)}
        onAccept={handleAcceptJob}
        onDecline={handleDeclineJob}
        onMarkComplete={handleMarkComplete}
        onJobExpired={handleJobExpired}
        isAccepting={acceptingJobId === selectedJob?.ticket_id}
        // contractorLat = contractorAddressLat
// contractorLng = contractorAddressLng
       contractorLat={24.494354}
contractorLng={86.677177}
      />
    </Container>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: wp(4), paddingVertical: hp(2) },

  statsCard: {
    backgroundColor:  'rgba(255,255,255,0.6)',
    borderRadius:     16,
    padding:          wp(4),
    flexDirection:    'row',
    justifyContent:   'space-around',
    alignItems:       'center',
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.1,
    shadowRadius:     4,
    elevation:        3,
    marginBottom:     hp(2),
  },
  statItem:        { flexDirection: 'row', alignItems: 'center', gap: wp(3) },
  statContent:     { gap: hp(0.5) },
  statLabel:       { fontSize: wp(2.5), color: '#666', fontFamily: getFontFamily('semibold') },
  statValue:       { fontSize: wp(5), fontFamily: getFontFamily('bold'), color: Colors.black },
  verticalDivider: { width: 1, height: hp(5), backgroundColor: '#E0E0E0' },

  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   hp(2),
  },
  sectionTitle: { fontSize: wp(4.5), fontFamily: getFontFamily('bold'), color: Colors.black },

  statusSummary: {
    flexDirection:    'row',
    justifyContent:   'space-around',
    backgroundColor:  'rgba(255,255,255,0.6)',
    borderRadius:     12,
    paddingVertical:  hp(1.5),
    paddingHorizontal:wp(2),
    marginBottom:     hp(2),
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.05,
    shadowRadius:     2,
    elevation:        2,
  },
  summaryItem: {
    alignItems:       'center',
    paddingHorizontal: wp(1.5),
    paddingBottom:    hp(0.5),
    position:         'relative',
    borderRadius:     8,
  },
  summaryItemActive: { backgroundColor: 'rgba(0,0,0,0.04)' },
  summaryNumber:     { fontSize: wp(5), fontFamily: getFontFamily('bold'), color: Colors.black },
  summaryLabel:      {
    fontSize:    wp(2.4),
    color:       '#666',
    fontFamily:  getFontFamily('medium'),
    marginTop:   hp(0.3),
    textAlign:   'center',
  },
  activeBar: {
    position:     'absolute',
    bottom:       0,
    left:         wp(1.5),
    right:        wp(1.5),
    height:       3,
    borderRadius: 2,
  },

  showMoreButton: {
    flexDirection:  'row',
    alignSelf:      'center',
    alignItems:     'center',
    paddingVertical: hp(1.5),
    gap:            wp(2),
  },
  showMoreText: { fontSize: wp(3.5), fontFamily: getFontFamily('bold'), color: Colors.red },

  loadingContainer: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    paddingVertical: hp(20),
  },
  loadingText: { marginTop: hp(2), fontSize: wp(4), color: Colors.placeholder },

  emptyContainer: { alignItems: 'center', paddingVertical: hp(10) },
  emptyText:      { fontSize: wp(4), fontFamily: getFontFamily('bold'), color: Colors.placeholder },
  emptySubText:   {
    fontSize:          wp(3.5),
    color:             Colors.placeholder,
    marginTop:         hp(1),
    textAlign:         'center',
    paddingHorizontal: wp(6),
  },
});

export default ContractorSupport;
