import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
// import { authReducer } from './Authentication/authentication'
import { persistReducer, persistStore } from 'redux-persist';
import { loginReducer } from './Login/loginSlice';
// import { chatReducer } from './Ai/aiSlice';
import aiReducer from './Ai/aiSlice';
import { propertiesReducer } from './Properties/propertiesSlice';
//import queriesReducer from './Queries/queriesSlice';
import maintenanceReducer from './Maintenance/maintenanceSlice';
import { tenantsReducer } from './Tenants/tenantsSlice';
import contractorReducer from './ContractorServices/contractorSlice';

import notificationReducer from './NotificationServices/notificationSlice';
import { rentReducer } from './Rent/rentSlice';
import mainChatbotReducer from './MainChatbot/mainChatbotSlice';
import { documentsReducer } from './Documents/documentsSlice';
import { inviteReducer } from './Invite/inviteSlice';


const persistConfig = {
  key: '@studyApp',
  storage: AsyncStorage,
  // ✅ FIXED: 'loginData' removed from blacklist.
  // loginData has its OWN nested persistReducer (loginPersistConfig) which
  // whitelists ['accessToken', 'token', 'userData', 'is_logged'].
  // If loginData is in the ROOT blacklist, redux-persist skips it entirely —
  // the nested config never rehydrates, so accessToken is always null after
  // app restart → every authenticated request gets a 401 → "Session expired".
  blacklist: ['properties'],
};

// Separate persist config for properties (only persist the actual data)
const propertiesPersistConfig = {
  key: 'properties',
  storage: AsyncStorage,
  blacklist: ['loading', 'error'], // Don't persist loading and error states
};

// Separate persist config for AI chat
const aiPersistConfig = {
  key: 'ai',
  storage: AsyncStorage,
  whitelist: ['currentSessionId', 'messages'], // Only keep relevant data
};

const loginPersistConfig = {
  key: 'login',
  storage: AsyncStorage,
  whitelist: ['accessToken', 'token', 'userData', 'is_logged','refreshToken','profilePhoto'],
};

const invitePersistConfig = {
  key: 'invites',
  storage: AsyncStorage,
  blacklist: ['loading', 'sendLoading', 'resolveLoading', 'error', 'sendSuccess'],
};



const rootReducer = combineReducers({
//    loginData: persistReducer(loginPersistConfig, loginReducer),

    loginData: persistReducer(loginPersistConfig, loginReducer),
  // chat: chatReducer,
//    ai: aiReducer,
//      queries: queriesReducer,
    ai: persistReducer(aiPersistConfig, aiReducer),
   properties: persistReducer(propertiesPersistConfig, propertiesReducer),
    invites: persistReducer(invitePersistConfig, inviteReducer),
    maintenance: maintenanceReducer,
    tenants: tenantsReducer,
    contractor: contractorReducer,
    notifications: notificationReducer,
    rent: rentReducer,
    mainChatbot: mainChatbotReducer,
    documents: documentsReducer,


});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    // getDefaultMiddleware({ serializableCheck: false }),
   getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      }
    }),
});

export const persistor = persistStore(store);
