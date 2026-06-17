import { jsx as _jsx } from "react/jsx-runtime";
import { useAuth } from './hooks/useAuth';
import FloatWindow from './components/FloatWindow';
import LoginForm from './components/LoginForm';
export default function App() {
    const { user, loading } = useAuth();
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-[#0d1117] text-[#8b949e] text-sm", children: "\u52A0\u8F7D\u4E2D..." }));
    }
    if (!user)
        return _jsx(LoginForm, {});
    return _jsx(FloatWindow, {});
}
