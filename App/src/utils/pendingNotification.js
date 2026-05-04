// Stores notification navigation intent across the Splash auth flow
let pending = null;

export const setPendingNotification = (screen, params, tabNavigator = null) => {
  pending = { screen, params, tabNavigator };
};

export const getPendingNotification = () => pending;

export const clearPendingNotification = () => {
  pending = null;
};
