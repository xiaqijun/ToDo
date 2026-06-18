import { useAuth } from './hooks/useAuth';
import FloatWindow from './components/FloatWindow';
import KeyLogin from './components/KeyLogin';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117] text-[#8b949e] text-sm">
        加载中...
      </div>
    );
  }

  if (!user) return <KeyLogin />;
  return <FloatWindow />;
}
