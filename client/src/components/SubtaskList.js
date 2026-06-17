import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function SubtaskList({ subtasks, onChange }) {
    const add = () => onChange([...subtasks, { title: '', assigneeId: '' }]);
    const remove = (i) => onChange(subtasks.filter((_, idx) => idx !== i));
    const update = (i, field, value) => {
        onChange(subtasks.map((st, idx) => idx === i ? { ...st, [field]: value } : st));
    };
    return (_jsxs("div", { className: "mt-1", children: [_jsx("label", { className: "text-[9px] text-text-secondary uppercase", children: "\u5B50\u4EFB\u52A1" }), subtasks.map((st, i) => (_jsxs("div", { className: "flex items-center gap-1 mt-1", children: [_jsx("input", { value: st.title, onChange: e => update(i, 'title', e.target.value), placeholder: "\u540D\u79F0", className: "flex-1 bg-bg-input border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none focus:border-accent-blue" }), _jsx("select", { value: st.assigneeId, onChange: e => update(i, 'assigneeId', e.target.value), className: "w-16 bg-bg-input border border-border rounded px-1 py-1 text-[10px] text-text-primary outline-none", children: _jsx("option", { value: "", children: "\u81EA\u5DF1" }) }), _jsx("button", { onClick: () => remove(i), className: "text-text-muted hover:text-accent-red text-xs", children: "\u2715" })] }, i))), _jsx("button", { onClick: add, className: "text-[9px] text-accent-blue mt-1 hover:underline", children: "+ \u5B50\u4EFB\u52A1" })] }));
}
