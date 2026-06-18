import { useState, useEffect } from 'react';
import client from '../api/client';

interface AdminUser {
  id: string;
  displayName: string;
  role: string;
  keyMasked: string;
  createdAt: string;
}

interface NewKey {
  label: string;
  key: string;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [error, setError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    client.get('/admin/users')
      .then(res => setUsers(res.data.data))
      .catch(() => setError('加载用户列表失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await client.post('/admin/users', { displayName: newName, role: newRole });
      setNewKey({ label: newName, key: res.data.key });
      setNewName('');
      setShowCreate(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    }
  };

  const handleRegenerateKey = async (id: string, name: string) => {
    if (!confirm(`确定要为 ${name} 重新生成密钥？旧密钥将立即失效。`)) return;
    try {
      const res = await client.post(`/admin/users/${id}/regenerate-key`);
      setNewKey({ label: name, key: res.data.key });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除用户 ${name}？此操作不可撤销。`)) return;
    try {
      await client.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '删除失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 no-drag">
      <div className="bg-bg-secondary border border-border rounded-xl w-[480px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">用户管理</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">&times;</button>
        </div>

        {/* New key display */}
        {newKey && (
          <div className="mx-4 mt-3 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg">
            <p className="text-xs text-text-secondary mb-1">{newKey.label} 的密钥（仅此一次显示，请复制）：</p>
            <code className="text-xs text-accent-green break-all select-all">{newKey.key}</code>
            <button onClick={() => setNewKey(null)} className="text-xs text-text-muted mt-1 block hover:underline">关闭</button>
          </div>
        )}

        {error && <p className="mx-4 mt-2 text-xs text-accent-red">{error}</p>}

        {/* Toolbar */}
        <div className="px-4 py-2">
          <button onClick={() => setShowCreate(!showCreate)}
            className="text-xs px-3 py-1.5 bg-accent-blue text-white rounded hover:opacity-90">
            + 创建用户
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="mx-4 mb-2 p-3 bg-bg-primary rounded-lg border border-border-subtle">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="显示名称" required
              className="w-full mb-2 px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-text-primary outline-none focus:border-accent-blue" />
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="w-full mb-2 px-2 py-1.5 bg-bg-input border border-border rounded text-sm text-text-primary outline-none">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="text-xs px-3 py-1.5 bg-accent-green text-white rounded hover:opacity-90">创建</button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="text-xs px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-input">取消</button>
            </div>
          </form>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="text-xs text-text-muted text-center py-8">加载中...</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">暂无用户</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-subtle">
                  <th className="text-left py-2 font-medium">名称</th>
                  <th className="text-left py-2 font-medium">角色</th>
                  <th className="text-left py-2 font-medium">密钥</th>
                  <th className="text-right py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border-subtle">
                    <td className="py-2 text-text-primary">{u.displayName}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-bg-tertiary text-text-muted'}`}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-text-muted">{u.keyMasked}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleRegenerateKey(u.id, u.displayName)}
                        className="text-accent-blue hover:underline mr-2">重置密钥</button>
                      <button onClick={() => handleDelete(u.id, u.displayName)}
                        className="text-accent-red hover:underline">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
