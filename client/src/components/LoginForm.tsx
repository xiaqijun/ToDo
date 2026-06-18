import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getServerUrl, setServerUrl } from '../api/client';

export default function LoginForm() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [server, setServer] = useState(getServerUrl());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setServerUrl(server);
    try {
      if (isLogin) await login(email, password);
      else await register(email, password, displayName);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-bg-primary">
      <div className="w-72 p-6 bg-bg-secondary border border-border rounded-xl">
        <h1 className="text-lg font-bold text-text-primary mb-4">📋 TodoFlow</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text" value={server} onChange={e => setServer(e.target.value)}
            placeholder="服务器地址 (例: http://IP:3001)"
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          {!isLogin && (
            <input
              type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="昵称" required
              className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
            />
          )}
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="邮箱" required
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="密码（至少6位）" required minLength={6}
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          {error && <p className="text-accent-red text-xs mb-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-accent-green text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? '...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
        <p className="text-text-secondary text-xs text-center mt-3">
          {isLogin ? '没有账号？' : '已有账号？'}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-accent-blue ml-1 hover:underline">
            {isLogin ? '注册' : '登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
