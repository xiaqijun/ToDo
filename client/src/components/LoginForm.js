import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
export default function LoginForm() {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin)
                await login(email, password);
            else
                await register(email, password, displayName);
        }
        catch (err) {
            setError(err.response?.data?.error || '操作失败');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "flex items-center justify-center h-screen bg-bg-primary", children: _jsxs("div", { className: "w-72 p-6 bg-bg-secondary border border-border rounded-xl", children: [_jsx("h1", { className: "text-lg font-bold text-text-primary mb-4", children: "\uD83D\uDCCB TodoFlow" }), _jsxs("form", { onSubmit: handleSubmit, children: [!isLogin && (_jsx("input", { type: "text", value: displayName, onChange: e => setDisplayName(e.target.value), placeholder: "\u6635\u79F0", required: true, className: "w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue" })), _jsx("input", { type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "\u90AE\u7BB1", required: true, className: "w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue" }), _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "\u5BC6\u7801\uFF08\u81F3\u5C116\u4F4D\uFF09", required: true, minLength: 6, className: "w-full mb-2 px-3 py-2 bg-bg-input border border-border rounded-md text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-blue" }), error && _jsx("p", { className: "text-accent-red text-xs mb-2", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "w-full py-2 bg-accent-green text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity", children: loading ? '...' : isLogin ? '登录' : '注册' })] }), _jsxs("p", { className: "text-text-secondary text-xs text-center mt-3", children: [isLogin ? '没有账号？' : '已有账号？', _jsx("button", { onClick: () => { setIsLogin(!isLogin); setError(''); }, className: "text-accent-blue ml-1 hover:underline", children: isLogin ? '注册' : '登录' })] })] }) }));
}
