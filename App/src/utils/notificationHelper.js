// App/src/utils/notificationHelper.js

export const getScreenFromNotification = (data = {}, role = 'tenant') => {
  const type  = data.type;
  const title = (data.title || '').toLowerCase();

  if (type === 'property_created' || type === 'property_updated' ||
      title.includes('property')) {
    return {
      tabNavigator: role === 'landlord' ? 'ProfileFooter' : null,
      screen:       'PropertiesDetails',
      params:       { propertyId: data.propertyId },
    };
  }

  if (type === 'maintenance_request' || type === 'maintenance_updated' ||
      title.includes('maintenance')) {
    if (role === 'contractor') {
      return { tabNavigator: 'ContractorHome', screen: 'ContractorSupport', params: { id: data.maintenanceId } };
    }
    return {
      tabNavigator: role === 'landlord' ? 'ProfileFooter' : 'BottomFotter',
      screen:       'MaintenanceDetails',
      params:       { id: data.maintenanceId },
    };
  }

  if (type === 'payment_due' || type === 'payment_received' ||
      type === 'rent_reminder' || title.includes('payment') ||
      title.includes('rent')) {
    if (role === 'landlord') {
      return { tabNavigator: 'ProfileFooter', screen: 'RentCollection', params: {} };
    }
    return { tabNavigator: 'BottomFotter', screen: 'TenantPayments', params: {} };
  }

  // ── Fallback by backend screen string ─────────────────────────────
  const screenMap = {
    'property_details':    { screen: 'PropertiesDetails',  tabNavigator: role === 'landlord' ? 'ProfileFooter' : null },
    'maintenance_details': { screen: 'LandlordTicketDetails', tabNavigator: role === 'landlord' ? 'ProfileFooter' : 'BottomFotter' },
    'tenant_payments':     { screen: 'TenantPayments',     tabNavigator: 'BottomFotter' },
    'rent_collection':     { screen: 'RentCollection',     tabNavigator: 'ProfileFooter' },
    'contractor_support':  { screen: 'ContractorSupport',  tabNavigator: 'ContractorHome' },
  };

  if (data.screen && screenMap[data.screen]) {
    const mapped = screenMap[data.screen];
    return { tabNavigator: mapped.tabNavigator, screen: mapped.screen, params: { propertyId: data.propertyId, id: data.maintenanceId } };
  }

  return { tabNavigator: null, screen: 'TenantNotification', params: {} };
};

// ── Single navigate function used everywhere ──────────────────────────────────
export const navigateFromNotification = (data = {}, role = 'tenant', navigationRef) => {
  if (!navigationRef) return;
  const { screen, params } = getScreenFromNotification(data, role);
  if (!screen || screen === 'TenantNotification') return;

  // ✅ Direct root stack navigation — works for all cases
  navigationRef.navigate(screen, params);
};
