// userSlice.js
import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  uploadProfileImage,
  getDocumentUploadUrl,
  uploadDocument,
  getSupportedFileTypes,
  findUserByPhone,
  fetchUserProfile,
} from './userServices';

const initialState = {
  users:          [],
  currentUser:    null,
  foundUser:      null,

  profileDetail:        null,
  profileDetailLoading: false,
  profileDetailError:   null,

  documentUploadUrl:   null,
  uploadedProfileUrl:  null,
  uploadedDocumentUrl: null,

  supportedFileTypes: { imageTypes: [], documentTypes: [] },

  loading:          false,
  createLoading:    false,
  updateLoading:    false,
  uploadLoading:    false,
  urlLoading:       false,
  findLoading:      false,
  fileTypesLoading: false,

  createSuccess: false,
  updateSuccess: false,

  error: null,
};

const upsertUser = (arr, user) => {
  const id = user?.id || user?._id;
  if (!id) return;
  const idx = arr.findIndex((u) => (u.id || u._id) === id);
  if (idx !== -1) { arr[idx] = user; } else { arr.push(user); }
};


const userSlice = createSlice({
  name: 'users',
  initialState,

  reducers: {
    clearError:           (state) => { state.error = null; },
    clearCreateSuccess:   (state) => { state.createSuccess = false; },
    clearUpdateSuccess:   (state) => { state.updateSuccess = false; },
    clearCurrentUser:     (state) => { state.currentUser = null; },
    clearFoundUser:       (state) => { state.foundUser = null; },
    clearUploadUrls:      (state) => { state.documentUploadUrl = null; },
    clearUploadedUrls:    (state) => { state.uploadedProfileUrl = null; state.uploadedDocumentUrl = null; },
    clearProfileDetail:   (state) => { state.profileDetail = null; state.profileDetailError = null; },
    setCurrentUser:       (state, action) => { state.currentUser = action.payload; },
  },

  extraReducers: (builder) => {
    builder

      // 1. CREATE USER
      .addCase(createUser.pending,   (state) => { state.createLoading = true; state.error = null; state.createSuccess = false; })
      .addCase(createUser.fulfilled, (state, { payload }) => {
        state.createLoading = false; state.createSuccess = true;
        if (payload?.id || payload?._id) upsertUser(state.users, payload);
      })
      .addCase(createUser.rejected,  (state, { payload, error }) => {
        state.createLoading = false;
        state.error = payload || error.message || 'Failed to create user';
      })

      // 2. GET ALL USERS
      .addCase(getAllUsers.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(getAllUsers.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.users = Array.isArray(payload) ? payload : [];
      })
      .addCase(getAllUsers.rejected,  (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to fetch users';
      })

      // 3. GET USER BY ID
      .addCase(getUserById.pending,   (state) => { state.loading = true; state.error = null; state.currentUser = null; })
      .addCase(getUserById.fulfilled, (state, { payload }) => {
        state.loading = false; state.currentUser = payload;
        if (payload) upsertUser(state.users, payload);
      })
      .addCase(getUserById.rejected,  (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to fetch user';
      })

      // 4. UPDATE USER
      .addCase(updateUser.pending,   (state) => { state.updateLoading = true; state.error = null; state.updateSuccess = false; })
      .addCase(updateUser.fulfilled, (state, { payload }) => {
        state.updateLoading = false; state.updateSuccess = true;
        state.currentUser = payload;
        if (payload) upsertUser(state.users, payload);
        if (payload && state.profileDetail) {
          const sameUser =
            payload.id  === state.profileDetail.id ||
            payload._id === state.profileDetail._id;
          if (sameUser) {
            state.profileDetail = {
              ...state.profileDetail,
              ...payload,
              // Preserve existing image — PATCH response may omit profileImage
              profileImage: state.profileDetail?.profileImage,
            };
          }
        }
      })
      .addCase(updateUser.rejected,  (state, { payload, error }) => {
        state.updateLoading = false;
        state.error = payload || error.message || 'Failed to update user';
      })

      // 5. UPLOAD PROFILE IMAGE
      // The thunk saves 'fileUrl' (full S3 URL) to DB and returns { fileUrl }.
      // We do NOT update profileDetail.profileImage here because the GET endpoint
      // may return a signed variant. ProfileHome calls fetchUserProfile right
      // after this resolves to get the fresh URL.
      .addCase(uploadProfileImage.pending,   (state) => { state.uploadLoading = true; state.error = null; })
      .addCase(uploadProfileImage.fulfilled, (state, { payload }) => {
        state.uploadLoading      = false;
        state.uploadedProfileUrl = payload?.fileUrl || null;
      })
      .addCase(uploadProfileImage.rejected,  (state, { payload, error }) => {
        state.uploadLoading = false;
        state.error = payload || error.message || 'Failed to upload profile image';
      })

      // 6. GET DOCUMENT UPLOAD URL
      .addCase(getDocumentUploadUrl.pending,   (state) => { state.urlLoading = true; state.error = null; state.documentUploadUrl = null; })
      .addCase(getDocumentUploadUrl.fulfilled, (state, { payload }) => { state.urlLoading = false; state.documentUploadUrl = payload; })
      .addCase(getDocumentUploadUrl.rejected,  (state, { payload, error }) => {
        state.urlLoading = false;
        state.error = payload || error.message || 'Failed to get document upload URL';
      })

      // 7. UPLOAD DOCUMENT
      .addCase(uploadDocument.pending,   (state) => { state.uploadLoading = true; state.error = null; state.uploadedDocumentUrl = null; })
      .addCase(uploadDocument.fulfilled, (state, { payload }) => { state.uploadLoading = false; state.uploadedDocumentUrl = payload?.fileUrl || null; })
      .addCase(uploadDocument.rejected,  (state, { payload, error }) => {
        state.uploadLoading = false;
        state.error = payload || error.message || 'Failed to upload document';
      })

      // 8. GET SUPPORTED FILE TYPES
      .addCase(getSupportedFileTypes.pending,   (state) => { state.fileTypesLoading = true; state.error = null; })
      .addCase(getSupportedFileTypes.fulfilled, (state, { payload }) => {
        state.fileTypesLoading = false;
        state.supportedFileTypes = {
          imageTypes:    payload?.imageTypes    || [],
          documentTypes: payload?.documentTypes || [],
        };
      })
      .addCase(getSupportedFileTypes.rejected,  (state, { payload, error }) => {
        state.fileTypesLoading = false;
        state.error = payload || error.message || 'Failed to fetch file types';
      })

      // 9. FIND USER BY PHONE
      .addCase(findUserByPhone.pending,   (state) => { state.findLoading = true; state.error = null; state.foundUser = null; })
      .addCase(findUserByPhone.fulfilled, (state, { payload }) => { state.findLoading = false; state.foundUser = payload; })
      .addCase(findUserByPhone.rejected,  (state, { payload, error }) => {
        state.findLoading = false;
        state.error       = payload || error.message || 'Failed to find user';
        state.foundUser   = null;
      })

      // 10. FETCH USER PROFILE (GET /users/profiledetail)
      //
      // The backend returns profileImage as a direct S3 URL or presigned URL
      // because we now store the full fileUrl in DB. sanitizeProfileImageUrl
      // passes through valid https:// URLs and returns null for legacy plain keys.
      .addCase(fetchUserProfile.pending,   (state) => {
        state.profileDetailLoading = true;
        state.profileDetailError   = null;
      })
      // ✅ AFTER — pass profileImage through as-is, ProfileHome handles signing
      .addCase(fetchUserProfile.fulfilled, (state, { payload }) => {
        state.profileDetailLoading = false;
        state.profileDetail = { ...payload }; // store raw, don't sanitize
      })
      .addCase(fetchUserProfile.rejected,  (state, { payload, error }) => {
        state.profileDetailLoading = false;
        state.profileDetailError   = payload || error.message || 'Failed to fetch profile';
      });
  },
});

export const {
  clearError,
  clearCreateSuccess,
  clearUpdateSuccess,
  clearCurrentUser,
  clearFoundUser,
  clearUploadUrls,
  clearUploadedUrls,
  clearProfileDetail,
  setCurrentUser,
} = userSlice.actions;

export const userReducer = userSlice.reducer;

const selectUsersState = (state) => state.users || {};

export const userSelectors = {
  getUserData: createSelector(
    [selectUsersState],
    (s) => ({
      users:                s.users              || [],
      currentUser:          s.currentUser,
      foundUser:            s.foundUser,
      profileDetail:        s.profileDetail,
      profileDetailLoading: s.profileDetailLoading || false,
      profileDetailError:   s.profileDetailError   || null,
      documentUploadUrl:    s.documentUploadUrl,
      uploadedProfileUrl:   s.uploadedProfileUrl,
      uploadedDocumentUrl:  s.uploadedDocumentUrl,
      supportedFileTypes:   s.supportedFileTypes || { imageTypes: [], documentTypes: [] },
      loading:              s.loading            || false,
      createLoading:        s.createLoading      || false,
      updateLoading:        s.updateLoading      || false,
      uploadLoading:        s.uploadLoading      || false,
      urlLoading:           s.urlLoading         || false,
      findLoading:          s.findLoading        || false,
      fileTypesLoading:     s.fileTypesLoading   || false,
      createSuccess:        s.createSuccess      || false,
      updateSuccess:        s.updateSuccess      || false,
      error:                s.error,
    })
  ),

  getProfileDetail: createSelector(
    [selectUsersState],
    (s) => ({
      data:    s.profileDetail        || null,
      loading: s.profileDetailLoading || false,
      error:   s.profileDetailError   || null,
    })
  ),

  isUploadLoading: createSelector([selectUsersState], (s) => s.uploadLoading || false),

  getUsers:       createSelector([selectUsersState], (s) => s.users || []),
  getCurrentUser: createSelector([selectUsersState], (s) => s.currentUser),
  getFoundUser:   createSelector([selectUsersState], (s) => s.foundUser),
  isFoundUserRegistered: createSelector(
    [selectUsersState],
    (s) => s.foundUser !== null && s.foundUser !== undefined,
  ),

  getDocumentUploadUrl:     createSelector([selectUsersState], (s) => s.documentUploadUrl),
  getUploadedProfileUrl:    createSelector([selectUsersState], (s) => s.uploadedProfileUrl),
  getUploadedDocumentUrl:   createSelector([selectUsersState], (s) => s.uploadedDocumentUrl),

  getSupportedFileTypes:     createSelector([selectUsersState], (s) => s.supportedFileTypes || { imageTypes: [], documentTypes: [] }),
  getSupportedImageTypes:    createSelector([selectUsersState], (s) => s.supportedFileTypes?.imageTypes    || []),
  getSupportedDocumentTypes: createSelector([selectUsersState], (s) => s.supportedFileTypes?.documentTypes || []),

  isLoading:          createSelector([selectUsersState], (s) => s.loading          || false),
  isCreateLoading:    createSelector([selectUsersState], (s) => s.createLoading    || false),
  isUpdateLoading:    createSelector([selectUsersState], (s) => s.updateLoading    || false),
  isUrlLoading:       createSelector([selectUsersState], (s) => s.urlLoading       || false),
  isFindLoading:      createSelector([selectUsersState], (s) => s.findLoading      || false),
  isFileTypesLoading: createSelector([selectUsersState], (s) => s.fileTypesLoading || false),

  isCreateSuccess: createSelector([selectUsersState], (s) => s.createSuccess || false),
  isUpdateSuccess: createSelector([selectUsersState], (s) => s.updateSuccess || false),

  getError: createSelector([selectUsersState], (s) => s.error),
};

export default userSlice.reducer;
