/**
 * useSocket.js
 * Custom hook — call this in your role-specific screens (Landlord, Tenant, Contractor).
 * Connects socket on mount, joins room, listens to events, disconnects on unmount.
 *
 * Example usage in LandlordTicketDetails.jsx:
 *
 *   import { useSocket } from '../../hooks/useSocket';
 *
 *   const LandlordTicketDetails = () => {
 *     useSocket({
 *       events: {
 *         newTicket:      (data) => { dispatch(addTicket(data)); },
 *         ticketUpdated:  (data) => { dispatch(updateTicket(data)); },
 *       },
 *     });
 *     ...
 *   };
 */

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'react-native';
import socketService from '../services/socketService';
import { loginDataSelectors } from '../Redux/Login/loginSlice';

/**
 * @param {Object} options
 * @param {Object} options.events   - { eventName: handlerFn } map
 * @param {boolean} options.enabled - optionally disable (default true)
 */
export const useSocket = ({ events = {}, enabled = true } = {}) => {
  const { isLogged } = useSelector(loginDataSelectors.getLoginStatus);
  const userId       = useSelector(state => state.loginData?.userId);

  useEffect(() => {
    if (!isLogged || !userId || !enabled) return;

    // Connect + join room
    socketService.connect(userId);

    // Register all event listeners
    Object.entries(events).forEach(([event, handler]) => {
      socketService.on(event, handler);
    });

    // Reconnect socket when app comes back to foreground
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !socketService.isConnected()) {
        socketService.connect(userId);
        Object.entries(events).forEach(([event, handler]) => {
          socketService.on(event, handler);
        });
      }
    });

    return () => {
      // Remove only this screen's listeners (don't disconnect globally)
      Object.entries(events).forEach(([event, handler]) => {
        socketService.off(event, handler);
      });
      sub.remove();
    };
  }, [isLogged, userId, enabled]);

  return { emit: socketService.emit.bind(socketService) };
};
