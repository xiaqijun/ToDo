import { AuthProvider, useAuth } from './contexts/AuthContext';
import FloatWindow from './components/FloatWindow';
import KeyLogin from './components/KeyLogin';

function AppContent() {
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
