import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import SubtaskList from './SubtaskList';
export default function TaskForm({ task, onSave, onCancel }) {
    const isEditing = !!task;
    // Determine initial quadrant from existing task or default
    const getInitialQuadrant = () => {
        if (!task)
            return 'q2';
        const u = task.urgency;
        const i = task.importance;
        if (u === 'high' && i === 'high')
            return 'q1';
        if (i === 'high')
            return 'q2';
        if (u === 'high')
            return 'q3';
        return 'q4';
    };
    const [title, setTitle] = useState(task?.title || '');
    const [quadrant, setQuadrant] = useState(getInitialQuadrant());
    const [assigneeId, setAssigneeId] = useState(task?.assigneeId || '');
    const [startAt, setStartAt] = useState(task?.startAt?.slice(0, 16) || '');
    const [dueAt, setDueAt] = useState(task?.dueAt?.slice(0, 16) || '');
    const [recurrence, setRecurrence] = useState(task?.recurrenceRule?.type || 'none');
    const [recurVal, setRecurVal] = useState('1');
    const [weekdaysOnly, setWeekdaysOnly] = useState(task?.recurrenceRule?.weekdaysOnly || false);
    const [subtasks, setSubtasks] = useState(task?.subtasks?.map(st => ({ title: st.title, assigneeId: st.assigneeId || '' })) || []);
    const [saving, setSaving] = useState(false);
    const quadrantToUrgencyImportance = (q) => {
        switch (q) {
            case 'q1': return { urgency: 'high', importance: 'high' };
            case 'q2': return { urgency: 'medium', importance: 'high' };
            case 'q3': return { urgency: 'high', importance: 'medium' };
            case 'q4': return { urgency: 'low', importance: 'low' };
            default: return { urgency: 'medium', importance: 'medium' };
        }
    };
    const buildRecurrenceRule = () => {
        if (recurrence === 'none')
            return undefined;
        const rule = { type: recurrence, weekdaysOnly: weekdaysOnly || undefined };
        switch (recurrence) {
            case 'hourly':
                rule.interval = parseInt(recurVal) || 1;
                break;
            case 'daily': break;
            case 'weekly':
                rule.days = recurVal.split(',').map((d) => {
                    const map = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
                    return map[d.trim()] ?? parseInt(d);
                });
                break;
            case 'monthly':
                rule.day = parseInt(recurVal) || 1;
                break;
            case 'quarterly':
                rule.startOffsetDays = -(parseInt(recurVal) || 7);
                rule.due = 'quarter_end';
                break;
        }
        return rule;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim())
            return;
        setSaving(true);
        const { urgency, importance } = quadrantToUrgencyImportance(quadrant);
        try {
            await onSave({
                title: title.trim(), urgency, importance,
                assigneeId: assigneeId || undefined,
                startAt: startAt ? new Date(startAt).toISOString() : undefined,
                dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
                isRecurring: recurrence !== 'none',
                recurrenceRule: buildRecurrenceRule(),
                subtasks: subtasks.filter(st => st.title.trim()).map(st => ({
                    title: st.title.trim(), assigneeId: st.assigneeId || undefined,
                })),
            });
        }
        finally {
            setSaving(false);
        }
    };
    const recurParams = () => {
        const label = recurrence === 'hourly' ? '间隔' : recurrence === 'weekly' ? '星期' : recurrence === 'monthly' ? '每' : recurrence === 'quarterly' ? '提前' : '';
        const unit = recurrence === 'hourly' ? '小时' : recurrence === 'monthly' ? '号' : recurrence === 'quarterly' ? '天' : '';
        const showWeekday = recurrence === 'hourly' || recurrence === 'daily';
        return (_jsxs("div", { className: "text-[9px] text-text-secondary py-1", children: [_jsx("span", { children: label }), _jsx("input", { type: recurrence === 'weekly' ? 'text' : 'number', value: recurVal, onChange: e => setRecurVal(e.target.value), className: "w-10 mx-1 bg-bg-input border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary outline-none focus:border-accent-blue", min: 1, max: recurrence === 'monthly' ? 31 : recurrence === 'quarterly' ? 30 : undefined, placeholder: recurrence === 'weekly' ? '一,三,五' : '' }), _jsx("span", { children: unit }), showWeekday && (_jsxs("label", { className: "ml-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: weekdaysOnly, onChange: e => setWeekdaysOnly(e.target.checked), className: "w-3 h-3 accent-accent-blue align-middle mr-1" }), "\u4EC5\u5DE5\u4F5C\u65E5"] }))] }));
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "mt-1.5 p-2 bg-bg-tertiary border border-border rounded-lg", children: [_jsx("input", { type: "text", value: title, onChange: e => setTitle(e.target.value), placeholder: "\u4EFB\u52A1\u540D\u79F0", autoFocus: true, className: "w-full bg-bg-input border border-border rounded px-2 py-1.5 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent-blue mb-1.5" }), _jsxs("div", { className: "flex gap-1 mb-1.5", children: [_jsxs("select", { value: quadrant, onChange: e => setQuadrant(e.target.value), className: "flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none", children: [_jsx("option", { value: "q1", children: "\uD83D\uDD34 \u9A6C\u4E0A\u505A" }), _jsx("option", { value: "q2", children: "\uD83D\uDFE1 \u8BA1\u5212\u505A" }), _jsx("option", { value: "q3", children: "\uD83D\uDD35 \u59D4\u6D3E" }), _jsx("option", { value: "q4", children: "\u26AB \u6682\u7F13" })] }), _jsx("select", { value: assigneeId, onChange: e => setAssigneeId(e.target.value), className: "flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none", children: _jsx("option", { value: "", children: "\u81EA\u5DF1" }) }), _jsxs("select", { value: recurrence, onChange: e => setRecurrence(e.target.value), className: "flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none", children: [_jsx("option", { value: "none", children: "\u4E0D\u5FAA\u73AF" }), _jsx("option", { value: "hourly", children: "\u6BCF\u5C0F\u65F6" }), _jsx("option", { value: "daily", children: "\u6BCF\u5929" }), _jsx("option", { value: "weekly", children: "\u6BCF\u5468" }), _jsx("option", { value: "monthly", children: "\u6BCF\u6708" }), _jsx("option", { value: "quarterly", children: "\u6BCF\u5B63\u5EA6" })] })] }), _jsxs("div", { className: "flex gap-1 mb-1.5", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-[9px] text-text-secondary uppercase block", children: "\u5F00\u59CB\u65F6\u95F4" }), _jsx("input", { type: "datetime-local", value: startAt, onChange: e => setStartAt(e.target.value), className: "w-full bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none focus:border-accent-blue" })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-[9px] text-text-secondary uppercase block", children: "\u622A\u6B62\u65F6\u95F4" }), _jsx("input", { type: "datetime-local", value: dueAt, onChange: e => setDueAt(e.target.value), className: "w-full bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none focus:border-accent-blue" })] })] }), recurrence !== 'none' && recurParams(), _jsx(SubtaskList, { subtasks: subtasks, onChange: setSubtasks }), _jsxs("div", { className: "flex justify-end gap-1 mt-2", children: [_jsx("button", { type: "button", onClick: onCancel, className: "px-3 py-1 bg-bg-input border border-border rounded text-[10px] text-text-primary hover:bg-border transition-colors", children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", disabled: saving, className: "px-3 py-1 bg-accent-green text-white rounded text-[10px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity", children: isEditing ? '保存' : '添加' })] })] }));
}
