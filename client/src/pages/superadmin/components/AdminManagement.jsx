// pages/superadmin/components/AdminManagement.jsx

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdmins, createAdmin, updateAdmin,
  deleteAdmin as deleteAdminThunk,
  toggleAdminStatus, clearActionError,
} from "../../../store/slices/adminSlices";
import {
  Search, Download, Eye, Edit, Trash2, Plus, UserPlus,
  CheckCircle, XCircle, RefreshCw, X, AlertCircle, Loader2,
} from "lucide-react";

const DEPARTMENTS = ['Data Bricks', 'Service Now'];

// ─── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { 
    const t = setTimeout(onClose, 3500); 
    return () => clearTimeout(t); 
  }, [onClose]);

  return (
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-5 py-3
      rounded-xl shadow-2xl text-sm font-semibold border
      ${type === "success"
        ? "bg-green-50 border-green-200 text-green-800"
        : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success"
        ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
        : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// ─── ADD / EDIT MODAL ──────────────────────────────────────────────────────────
const AdminFormModal = ({ editAdmin, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const { loading, actionError } = useSelector(s => s.admins);
  const isEdit = !!editAdmin;

  const [form, setForm] = useState({
    email:           editAdmin?.email      || "",
    department:      editAdmin?.department || "",
    password:        "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (actionError) setErrors(p => ({ ...p, _api: actionError }));
  }, [actionError]);

  useEffect(() => () => dispatch(clearActionError()), [dispatch]);

  const validate = () => {
    const e = {};
    if (!form.email.trim())                                     e.email           = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))                 e.email           = "Invalid email";
    if (!form.department)                                       e.department      = "Department is required";
    if (!isEdit && !form.password)                              e.password        = "Password is required";
    if (!isEdit && form.password && form.password.length < 6)  e.password        = "Min 6 characters";
    if (!isEdit && form.password !== form.confirmPassword)      e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const body = { email: form.email.trim(), department: form.department };
    if (!isEdit || form.password) body.password = form.password;

    if (isEdit) {
      const res = await dispatch(updateAdmin({ id: editAdmin._id, body }));
      if (res.meta.requestStatus === "fulfilled") onSaved("updated");
    } else {
      const res = await dispatch(createAdmin(body));
      if (res.meta.requestStatus === "fulfilled") onSaved("created");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Admin" : "Add New Admin"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors._api && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errors._api}
            </div>
          )}

          <Field label="Email Address" required error={errors.email}>
            <input 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange}
              placeholder="admin@example.com" 
              disabled={loading}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500
                ${errors.email ? "border-red-400" : "border-gray-300"}`} 
            />
          </Field>

          <Field label="Department" required error={errors.department}>
            <select 
              name="department" 
              value={form.department} 
              onChange={handleChange}
              disabled={loading}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500
                ${errors.department ? "border-red-400" : "border-gray-300"}`}
            >
              <option value="">— Select Department —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={isEdit ? "New Password (optional)" : "Password"} required={!isEdit} error={errors.password}>
              <input 
                type="password" 
                name="password" 
                value={form.password}
                onChange={handleChange} 
                placeholder="••••••••" 
                disabled={loading}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.password ? "border-red-400" : "border-gray-300"}`} 
              />
            </Field>
            {!isEdit && (
              <Field label="Confirm Password" required error={errors.confirmPassword}>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  value={form.confirmPassword}
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  disabled={loading}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.confirmPassword ? "border-red-400" : "border-gray-300"}`} 
                />
              </Field>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
            <span>ℹ️</span>
            One admin per department. The admin will manage students only in their assigned department.
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? "Saving…" : "Creating…"}</>
                : <><UserPlus className="w-4 h-4" />{isEdit ? "Save Changes" : "Create Admin"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── VIEW MODAL ────────────────────────────────────────────────────────────────
const ViewModal = ({ admin, onClose, onEdit }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Admin Details</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {(admin.name || admin.email || "A")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{admin.name || "—"}</p>
            <p className="text-sm text-gray-500">{admin.email}</p>
            <span className={`inline-flex items-center gap-1.5 mt-1 text-xs font-bold px-2.5 py-1 rounded-full
              ${admin.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${admin.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
              {admin.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Department", val: admin.department || "—" },
            { label: "Join Date",  val: admin.joinDate   || "—" },
            { label: "Admin ID",   val: admin._id ? admin._id.toString().slice(-8).toUpperCase() : "—" },
          ].map(({ label, val }) => (
            <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-semibold text-gray-800 text-sm">{val}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 border-t pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
          <button 
            onClick={() => { onClose(); onEdit(admin); }}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            Edit Admin
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── DELETE MODAL ──────────────────────────────────────────────────────────────
const DeleteModal = ({ admin, onClose, onDeleted }) => {
  const dispatch = useDispatch();
  const { loading, actionError } = useSelector(s => s.admins);

  useEffect(() => () => dispatch(clearActionError()), [dispatch]);

  const confirm = async () => {
    const res = await dispatch(deleteAdminThunk(admin._id));
    if (res.meta.requestStatus === "fulfilled") onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-center text-gray-800 mb-2">Delete Admin</h2>
        <p className="text-gray-500 text-center text-sm mb-5">
          Are you sure you want to delete <strong>{admin.name || admin.email}</strong>? 
          This action cannot be undone.
        </p>
        {actionError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">
            {actionError}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={confirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const AdminManagement = () => {
  const dispatch = useDispatch();
  const { list: admins, loading, error } = useSelector(s => s.admins);

  const [toast,        setToast]      = useState(null);
  const [addOpen,      setAddOpen]    = useState(false);
  const [editAdmin,    setEditAdmin]  = useState(null);
  const [viewAdmin,    setViewAdmin]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search,       setSearch]     = useState("");
  const [deptFilter,   setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page,         setPage]       = useState(1);

  const PER_PAGE = 5;

  useEffect(() => { 
    dispatch(fetchAdmins()); 
  }, [dispatch]);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const handleSaved = (action) => {
    setAddOpen(false);
    setEditAdmin(null);
    showToast(action === "created" ? "Admin created successfully!" : "Admin updated successfully!");
  };

  const handleDeleted = () => {
    setDeleteTarget(null);
    showToast("Admin deleted successfully!");
  };

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === "active" ? "inactive" : "active";
    const res = await dispatch(toggleAdminStatus({ id: admin._id, status: newStatus }));
    if (res.meta.requestStatus === "fulfilled") {
      showToast(`Admin marked as ${newStatus}.`);
    } else {
      showToast(res.payload || "Failed to update status.", "error");
    }
  };

  // Filter + Paginate
  const filtered = admins.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || (a.name || "").toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    const matchDept   = deptFilter === "all" || a.department === deptFilter;
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetFilters = () => {
    setSearch(""); 
    setDeptFilter("all"); 
    setStatusFilter("all"); 
    setPage(1);
  };

  // Stats (Updated - removed student/exam counts)
  const activeCount = admins.filter(a => a.status === "active").length;
  const deptCount   = new Set(admins.map(a => a.department).filter(Boolean)).size;

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage department administrators</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => dispatch(fetchAdmins())}
            className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button 
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Add Admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Admins", val: loading ? "—" : admins.length, color: "text-gray-800", bg: "bg-gray-50" },
          { label: "Active Admins", val: loading ? "—" : activeCount, color: "text-green-700", bg: "bg-green-50" },
          { label: "Departments", val: loading ? "—" : deptCount, color: "text-blue-700", bg: "bg-blue-50" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} border border-gray-100 rounded-2xl p-5`}>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Global Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => dispatch(fetchAdmins())} className="ml-auto text-xs text-red-600 underline font-medium">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-3 shadow-sm">
        <div className="flex-1 min-w-[200px] flex items-center border border-gray-200 rounded-xl px-3 py-2.5 gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…" 
            className="flex-1 outline-none text-sm bg-transparent" 
          />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>

        <select 
          value={deptFilter} 
          onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select 
          value={statusFilter} 
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button onClick={resetFilters} className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>

        <button 
          onClick={() => {
            const csv = [
              ["Email", "Department", "Status", "Join Date"],
              ...filtered.map(a => [a.email, a.department, a.status, a.joinDate])
            ].map(r => r.join(",")).join("\n");
            
            const el = document.createElement("a");
            el.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            el.download = "admins.csv"; 
            el.click();
          }} 
          className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            <p className="text-sm">Loading admins…</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <p className="font-semibold">No admins found</p>
            <p className="text-sm mt-1">
              {search || deptFilter !== "all" || statusFilter !== "all" ? "Try different filters" : "Click 'Add Admin' to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  {["Admin", "Department", "Join Date", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageItems.map(admin => (
                  <tr key={admin._id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Admin */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {(admin.name || admin.email || "A")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{admin.name || "—"}</p>
                          <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold">
                        {admin.department || "—"}
                      </span>
                    </td>

                    {/* Join Date */}
                    <td className="px-5 py-4 text-xs text-gray-500">{admin.joinDate || "—"}</td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <button 
                        onClick={() => handleToggleStatus(admin)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer
                          ${admin.status === "active"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                      >
                        {admin.status === "active"
                          ? <><CheckCircle className="w-3 h-3" /> Active</>
                          : <><XCircle className="w-3 h-3" /> Inactive</>}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => setViewAdmin(admin)} title="View" className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditAdmin(admin)} title="Edit" className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(admin)} title="Delete" className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setPage(p => Math.max(p-1, 1))} 
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i+1)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors
                    ${page === i+1 ? "bg-blue-600 text-white font-bold" : "border border-gray-200 hover:bg-gray-100"}`}
                >
                  {i+1}
                </button>
              ))}
              <button 
                onClick={() => setPage(p => Math.min(p+1, totalPages))} 
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {addOpen && <AdminFormModal editAdmin={null} onClose={() => setAddOpen(false)} onSaved={handleSaved} />}
      {editAdmin && <AdminFormModal editAdmin={editAdmin} onClose={() => setEditAdmin(null)} onSaved={handleSaved} />}
      {viewAdmin && <ViewModal admin={viewAdmin} onClose={() => setViewAdmin(null)} onEdit={setEditAdmin} />}
      {deleteTarget && <DeleteModal admin={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
    </div>
  );
};

export default AdminManagement;