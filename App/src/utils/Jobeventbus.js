// src/utils/jobEventBus.js
//
// Lightweight event bus using React Native's DeviceEventEmitter.
// Used to broadcast cross-contractor job events (e.g. "another contractor
// accepted this job") so every active ContractorSupport screen and
// JobDetailsModal can react immediately — without waiting for the next
// API poll.
//
// Events
// ──────
//   JOB_ACCEPTED_BY_OTHER  { ticket_id: string }
//     Emitted by ContractorSupport.handleAcceptJob() after the server
//     confirms acceptance.  All *other* contractor sessions should:
//       • stop the countdown timer for that ticket
//       • move the job from pendingJobs → declinedJobs with reason
//         "Accepted by another contractor"

import { DeviceEventEmitter } from 'react-native';

export const JOB_EVENTS = {
  JOB_ACCEPTED_BY_OTHER: 'JOB_ACCEPTED_BY_OTHER',
};

/**
 * Emit an event so every listener in the app is notified.
 * @param {string} event  - one of JOB_EVENTS
 * @param {object} payload
 */
export const emitJobEvent = (event, payload) => {
  DeviceEventEmitter.emit(event, payload);
};

/**
 * Subscribe to a job event.
 * Returns the subscription object — call subscription.remove() to clean up.
 * @param {string}   event    - one of JOB_EVENTS
 * @param {function} handler  - (payload) => void
 */
export const onJobEvent = (event, handler) => {
  return DeviceEventEmitter.addListener(event, handler);
};
