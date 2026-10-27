// Administrative User Management Page:
// - Paginated users table (name, email, role, status, actions)
// - Search by name/email, role filter, status filter integrated with backend pagination
// - Create new user via UserFormModal
// - Edit user profile via UserFormModal
// - Toggle user role with confirmation dialog & self-demotion protection
// - Toggle user status (active/inactive) with confirmation dialog & self-deactivation protection
// - Backend error handling (self-demotion, last-active-admin lockout)
// - Loading, error, and empty states

import { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon,
  Plus,
  Search,
  X,
  Pencil,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  RotateCcw,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Pagination from '../components/common/Pagination.jsx';
import UserFormModal from '../components/users/UserFormModal.jsx';
import { EMPTY_USER_FORM } from '../constants/formConstants.js';
import { useToast } from '../context/useToast.js';
import { useAuth } from '../context/useAuth.js';
import { userService } from '../services/userService.js';
import { formatDate } from '../utils/formatters.js';

const PAGE_SIZE = 10;

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function UsersPage() {
  const { showSuccess, showError } = useToast();
  const { user: currentUser } = useAuth();

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Data Fetching State
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Action States
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Role Confirmation Dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState(null);
  const [submittingRole, setSubmittingRole] = useState(false);

  // Status Confirmation Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTargetUser, setStatusTargetUser] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userService.fetchUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setUsers(result.items || []);
      setMeta(result.meta || { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilterChange = (val) => {
    setRoleFilter(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || roleFilter || statusFilter);

  // Create User Workflow
  const openCreateModal = () => {
    setSelectedUser(null);
    setFormMode('create');
    setFormOpen(true);
  };

  // Edit User Profile Workflow
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setSubmittingForm(true);
    try {
      if (formMode === 'create') {
        const created = await userService.createUser(formData);
        showSuccess(`User "${created.name}" created successfully`);
      } else {
        const updated = await userService.updateUser(selectedUser._id, formData);
        showSuccess(`User "${updated.name}" updated successfully`);
      }
      setFormOpen(false);
      loadUsers();
    } catch (err) {
      showError(err.message || 'Operation failed');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Role Change Confirmation Workflow
  const openRoleDialog = (user) => {
    setRoleTargetUser(user);
    setRoleDialogOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!roleTargetUser) return;
    const nextRole = roleTargetUser.role === 'admin' ? 'viewer' : 'admin';
    setSubmittingRole(true);
    try {
      await userService.updateUserRole(roleTargetUser._id, nextRole);
      showSuccess(`User "${roleTargetUser.name}" role updated to ${nextRole}`);
      setRoleDialogOpen(false);
      setRoleTargetUser(null);
      loadUsers();
    } catch (err) {
      showError(err.message || 'Failed to update user role');
    } finally {
      setSubmittingRole(false);
    }
  };

  // Status Change Confirmation Workflow
  const openStatusDialog = (user) => {
    setStatusTargetUser(user);
    setStatusDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTargetUser) return;
    const nextStatus = statusTargetUser.status === 'active' ? 'inactive' : 'active';
    setSubmittingStatus(true);
    try {
      await userService.updateUserStatus(statusTargetUser._id, nextStatus);
      showSuccess(
        `User "${statusTargetUser.name}" account ${nextStatus === 'active' ? 'activated' : 'deactivated'}`
      );
      setStatusDialogOpen(false);
      setStatusTargetUser(null);
      loadUsers();
    } catch (err) {
      showError(err.message || 'Failed to update user account status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and administrative access permissions"
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition shadow-sm"
          >
            <Plus size={16} />
            <span>Add User</span>
          </button>
        }
      />

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search users by name or email"
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            aria-label="Filter by role"
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            aria-label="Filter by account status"
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Loader label="Loading user directory…" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadUsers} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users found"
          description={
            hasActiveFilters
              ? 'No user accounts match your search or filter criteria. Try clearing filters.'
              : 'No users have been registered in the system yet.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Clear all filters
              </button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Users directory table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="px-5 py-3.5">
                    User
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3.5 hidden sm:table-cell">
                    Created
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => {
                  const isSelf = currentUser && (currentUser._id === u._id || currentUser.id === u._id);
                  const isAdminRole = u.role === 'admin';
                  const isActiveStatus = u.status === 'active';

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/75 transition-colors">
                      {/* Name & Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-semibold text-xs shrink-0">
                            {u.name
                              ? u.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)
                              : 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                            isAdminRole
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isAdminRole && <Shield size={12} className="text-purple-600" />}
                          {isAdminRole ? 'Admin' : 'Viewer'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                            isActiveStatus
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActiveStatus ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {isActiveStatus ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 hidden sm:table-cell">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* Edit Profile Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                            title={`Edit profile for ${u.name}`}
                            aria-label={`Edit profile for ${u.name}`}
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Role Toggle Button */}
                          <button
                            type="button"
                            onClick={() => openRoleDialog(u)}
                            disabled={isSelf && isAdminRole}
                            className={`p-1.5 rounded-lg transition ${
                              isSelf && isAdminRole
                                ? 'text-slate-300 cursor-not-allowed'
                                : isAdminRole
                                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                            }`}
                            title={
                              isSelf && isAdminRole
                                ? 'You cannot demote your own account'
                                : isAdminRole
                                ? `Demote ${u.name} to Viewer`
                                : `Promote ${u.name} to Admin`
                            }
                            aria-label={
                              isSelf && isAdminRole
                                ? 'You cannot demote your own account'
                                : isAdminRole
                                ? `Demote ${u.name} to Viewer`
                                : `Promote ${u.name} to Admin`
                            }
                          >
                            {isAdminRole ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
                          </button>

                          {/* Status Toggle Button */}
                          <button
                            type="button"
                            onClick={() => openStatusDialog(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg transition ${
                              isSelf
                                ? 'text-slate-300 cursor-not-allowed'
                                : isActiveStatus
                                ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                            title={
                              isSelf
                                ? 'You cannot deactivate your own account'
                                : isActiveStatus
                                ? `Deactivate ${u.name}'s account`
                                : `Activate ${u.name}'s account`
                            }
                            aria-label={
                              isSelf
                                ? 'You cannot deactivate your own account'
                                : isActiveStatus
                                ? `Deactivate ${u.name}'s account`
                                : `Activate ${u.name}'s account`
                            }
                          >
                            {isActiveStatus ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <Pagination
              page={meta.page}
              pages={meta.pages}
              total={meta.total}
              limit={meta.limit}
              onChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      )}

      {/* User Create / Edit Modal */}
      <UserFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={
          selectedUser
            ? {
                name: selectedUser.name || '',
                email: selectedUser.email || '',
              }
            : EMPTY_USER_FORM
        }
        mode={formMode}
        submitting={submittingForm}
      />

      {/* Role Change Confirmation Dialog */}
      {roleTargetUser && (
        <ConfirmDialog
          isOpen={roleDialogOpen}
          onCancel={() => {
            setRoleDialogOpen(false);
            setRoleTargetUser(null);
          }}
          onConfirm={handleConfirmRoleChange}
          busy={submittingRole}
          danger={roleTargetUser.role === 'admin'}
          confirmLabel={
            roleTargetUser.role === 'admin' ? 'Demote to Viewer' : 'Promote to Admin'
          }
          title={
            roleTargetUser.role === 'admin'
              ? `Demote ${roleTargetUser.name}?`
              : `Promote ${roleTargetUser.name}?`
          }
          message={
            roleTargetUser.role === 'admin'
              ? `Are you sure you want to demote ${roleTargetUser.name} to a Viewer? They will lose all administrative permissions, including user and department management.`
              : `Are you sure you want to promote ${roleTargetUser.name} to an Administrator? They will be granted full administrative permissions across the system.`
          }
        />
      )}

      {/* Status Change Confirmation Dialog */}
      {statusTargetUser && (
        <ConfirmDialog
          isOpen={statusDialogOpen}
          onCancel={() => {
            setStatusDialogOpen(false);
            setStatusTargetUser(null);
          }}
          onConfirm={handleConfirmStatusChange}
          busy={submittingStatus}
          danger={statusTargetUser.status === 'active'}
          confirmLabel={
            statusTargetUser.status === 'active' ? 'Deactivate Account' : 'Activate Account'
          }
          title={
            statusTargetUser.status === 'active'
              ? `Deactivate ${statusTargetUser.name}'s Account?`
              : `Activate ${statusTargetUser.name}'s Account?`
          }
          message={
            statusTargetUser.status === 'active'
              ? `Are you sure you want to deactivate ${statusTargetUser.name}'s account? Their active session will be terminated immediately, and they will not be able to log in.`
              : `Are you sure you want to activate ${statusTargetUser.name}'s account? They will be able to sign in and access the system immediately.`
          }
        />
      )}
    </div>
  );
}
