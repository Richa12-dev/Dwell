// queriesSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  queries: [],
  loading: false,
  error: null,
};

const queriesSlice = createSlice({
  name: 'queries',
  initialState,
  reducers: {
    // your reducers
  },
  extraReducers: (builder) => {
    // your async reducers
  },
});

// ✅ Make sure these exports exist
export const queriesReducer = queriesSlice.reducer;
export default queriesSlice.reducer;

// ✅ Export selectors
export const queriesSelectors = {
  getAllQueries: (state) => state.queries?.queries || [],
  isLoading: (state) => state.queries?.loading || false,
  getError: (state) => state.queries?.error,
};
