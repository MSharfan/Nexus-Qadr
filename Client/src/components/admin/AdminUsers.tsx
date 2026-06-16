import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { userApi } from "../../config/api";
import ConfirmModal from "../shared/ConfirmModal";

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filterRole, setFilterRole] = React.useState<string>("all");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await userApi.adminList();
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // New shape: roles can be array of objects { role: string, is_blocked: boolean }
  const getRolesFromUser = (u: any): Array<{ role: string; is_blocked?: boolean }> => {
    const out: Array<{ role: string; is_blocked?: boolean }> = [];

    if (!u) return out;

    // If roles is array of objects
    if (Array.isArray(u.roles) && u.roles.length > 0 && typeof u.roles[0] === 'object') {
      for (const r of u.roles) {
        if (!r) continue;
        out.push({ role: String(r.role || r).toLowerCase(), is_blocked: !!r.is_blocked });
      }
      return out;
    }

    // If roles is array of strings
    if (Array.isArray(u.roles)) {
      for (const r of u.roles) out.push({ role: String(r).toLowerCase() });
      return out;
    }

    // If roles is a JSON string
    if (typeof u.roles === 'string') {
      try {
        const parsed = JSON.parse(u.roles);
        if (Array.isArray(parsed)) {
          for (const r of parsed) out.push({ role: String(r).toLowerCase() });
          return out;
        }
      } catch {}
    }

    // Single role string field
    if (u.role) out.push({ role: String(u.role).toLowerCase() });

    return out;
  };

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<{ id: string; name?: string; blocked?: boolean } | null>(null);
  const [actionRole, setActionRole] = React.useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = React.useState(false);

  const openConfirm = (id: string, name?: string, blocked?: boolean) => {
    setConfirmTarget({ id, name, blocked });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      // Determine whether to block entire account or a specific role
      const roleToAct = actionRole ?? '__account__';
      if (roleToAct === '__account__') {
        // Entire account
        await userApi.adminBlock(confirmTarget.id, !confirmTarget.blocked);
      } else {
        // Role-specific
        await userApi.adminBlockRole(confirmTarget.id, roleToAct, !confirmTarget.blocked);
      }
      await load();
      setConfirmOpen(false);
      setActionRole(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update user status");
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading users…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  const filteredUsers = users.filter((u) => {
    if (filterRole === 'all') return true;
    const roles = getRolesFromUser(u).map(r => r.role);
    return roles.includes(filterRole);
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            {/* Dynamic title that shows the current filter and count */}
            <h1 className="text-3xl">
              {filterRole === 'all'
                ? `All users (${filteredUsers.length})`
                : filterRole === 'admin'
                ? `Admins (${filteredUsers.length})`
                : filterRole === 'seller'
                ? `Sellers (${filteredUsers.length})`
                : `Customers (${filteredUsers.length})`}
            </h1>
            <div className="flex items-center gap-4">
              <label className="text-sm text-muted-foreground">Filter role:</label>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2 rounded border border-border bg-secondary">
                <option value="all">All</option>
                <option value="admin">Admins</option>
                <option value="seller">Sellers</option>
                <option value="customer">Customers</option>
              </select>
              <button onClick={() => navigate('/admin')} className="px-4 py-2 rounded bg-[#f3f4f6] dark:bg-neutral-800 text-gray-800 dark:text-white">Back</button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-muted-foreground">
                  <th className="py-2">Email</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Roles</th>
                  <th className="py-2">Signed Up</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="py-3 text-sm">{u.email}</td>
                    <td className="py-3 text-sm">{u.name ?? '—'}</td>
                    <td className="py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRolesFromUser(u).map((r, i: number) => {
                          const role = String(r.role).toLowerCase();
                          const cls = role === 'admin' ? 'bg-red-100 text-red-700 border-red-200' : role === 'seller' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                          return (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${cls} flex items-center gap-2`}>{role}{r.is_blocked ? <span className="ml-1 text-[10px] px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded">blocked</span> : null}</span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 text-sm">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    <td className="py-3 text-sm">
                      {Boolean(u.is_blocked || u.blocked) ? (
                        <button
                          onClick={() => { setActionRole('__account__'); openConfirm(u.id, u.name, true); }}
                          aria-label={`Unblock ${u.name ?? u.email}`}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white hover:shadow-lg text-sm font-medium"
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => { setConfirmTarget({ id: u.id, name: u.name, blocked: false }); setConfirmOpen(true); setActionRole(null); }}
                          aria-label={`Block ${u.name ?? u.email}`}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white hover:shadow-lg text-sm font-medium"
                        >
                          Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
      <ConfirmModal
        open={confirmOpen}
        title={
          actionRole
            ? `${confirmTarget?.blocked ? 'Unblock' : 'Block'} ${actionRole} role`
            : confirmTarget?.blocked
            ? 'Unblock user'
            : 'Block user'
        }
        description={confirmTarget?.blocked ? 'This will restore access.' : 'Select which role to block or block the entire account.'}
        confirmLabel={confirmTarget?.blocked ? 'Unblock' : 'Block'}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={() => { setConfirmOpen(false); setActionRole(null); }}
      >
        {/* Modal content: role selector when blocking (not unblocking full account) */}
        {!confirmTarget?.blocked && (
          <div className="mb-4">
            <label className="block mb-2 text-sm">Select role</label>
            <select
              value={actionRole ?? '__account__'}
              onChange={(e) => setActionRole(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-secondary"
            >
              <option value="__account__">Entire account</option>
              {confirmTarget && users.find(u=>u.id===confirmTarget.id) && getRolesFromUser(users.find(u=>u.id===confirmTarget.id)).map(r=> (
                <option key={r.role} value={r.role}>{r.role}</option>
              ))}
            </select>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

export default AdminUsers;
