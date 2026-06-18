import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getServerUrl, setServerUrl } from '../api/client';

export default function KeyLogin() {
  const { connect } = useAuth();
  const [key, setKey] = useState('');
  const [server, setServer] = useState(getServerUrl());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setServerUrl(server);
    try {
      await connect(key.trim());
    } catch (err: any) {
      setError(err.response?.data?.error || '连接失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-bg-primary">
      <div className="w-80 p-6 bg-bg-secondary border border-border rounded-xl">
        <h1 className="text-lg font-bold text-text-primary mb-4">📋 TodoFlow</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text" value={server} onChange={e => setServer(e.target.value)}
            placeholder="服务器地址 (例: http://IP:3001)"
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          <input
            type="password" value={key} onChange={e => setKey(e.target.value)}
            placeholder="请输入密钥" required
            className="w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
          />
          {error && <p className="text-accent-red text-xs mb-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-accent-green text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? '连接中...' : '连接'}
          </button>
        </form>
      </div>
    </div>
  );
}
