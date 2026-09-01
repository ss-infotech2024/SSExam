// store/slices/adminSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchAdmins = createAsyncThunk(
  "admins/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/superadmin/admins");
      return res.data.admins;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch admins");
    }
  }
);

export const createAdmin = createAsyncThunk(
  "admins/create",
  async (body, { rejectWithValue }) => {
    try {
      const res = await API.post("/superadmin/create-admin", body);
      return res.data.admin;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create admin");
    }
  }
);

export const updateAdmin = createAsyncThunk(
  "admins/update",
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/superadmin/admins/${id}`, body);
      return res.data.admin;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update admin");
    }
  }
);

export const deleteAdmin = createAsyncThunk(
  "admins/delete",
  async (id, { rejectWithValue }) => {
    try {
      await API.delete(`/superadmin/admins/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete admin");
    }
  }
);

export const toggleAdminStatus = createAsyncThunk(
  "admins/toggleStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      await API.patch(`/superadmin/admins/${id}/status`, { status });
      return { id, status };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update status");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminSlice = createSlice({
  name: "admins",
  initialState: {
    list:      [],
    loading:   false,
    error:     null,
    actionError: null,   // error from create/update/delete
  },
  reducers: {
    clearActionError: (state) => { state.actionError = null; },
    clearError:       (state) => { state.error = null; },
  },
  extraReducers: (builder) => {

    // ── fetchAdmins ───────────────────────────────────────────────────────────
    builder
      .addCase(fetchAdmins.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.list    = action.payload;
      })
      .addCase(fetchAdmins.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── createAdmin ───────────────────────────────────────────────────────────
    builder
      .addCase(createAdmin.pending,   (state) => { state.loading = true;  state.actionError = null; })
      .addCase(createAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);   // add to top of list
      })
      .addCase(createAdmin.rejected,  (state, action) => {
        state.loading     = false;
        state.actionError = action.payload;
      });

    // ── updateAdmin ───────────────────────────────────────────────────────────
    builder
      .addCase(updateAdmin.pending,   (state) => { state.loading = true;  state.actionError = null; })
      .addCase(updateAdmin.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.list.findIndex(a => a._id === action.payload._id);
        if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
      })
      .addCase(updateAdmin.rejected,  (state, action) => {
        state.loading     = false;
        state.actionError = action.payload;
      });

    // ── deleteAdmin ───────────────────────────────────────────────────────────
    builder
      .addCase(deleteAdmin.pending,   (state) => { state.loading = true;  state.actionError = null; })
      .addCase(deleteAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.list    = state.list.filter(a => a._id !== action.payload);
      })
      .addCase(deleteAdmin.rejected,  (state, action) => {
        state.loading     = false;
        state.actionError = action.payload;
      });

    // ── toggleAdminStatus ─────────────────────────────────────────────────────
    builder
      .addCase(toggleAdminStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const admin = state.list.find(a => a._id === id);
        if (admin) admin.status = status;
      })
      .addCase(toggleAdminStatus.rejected, (state, action) => {
        state.actionError = action.payload;
      });
  },
});

export const { clearActionError, clearError } = adminSlice.actions;
export default adminSlice.reducer;