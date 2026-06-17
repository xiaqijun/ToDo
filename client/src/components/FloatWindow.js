import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useTeams } from '../hooks/useTeams';
import QuadrantView from './QuadrantView';
import TaskForm from './TaskForm';
import TeamTabs from './TeamTabs';
const QUADRANTS = [
    { key: 'q1', defaultOpen: true },
    { key: 'q2', defaultOpen: true },
    { key: 'q3', defaultOpen: false },
    { key: 'q4', defaultOpen: false },
];
export default function FloatWindow() {
    const { logout } = useAuth();
    const { createTask, updateTask } = useTasks();
    const { activeTeamId } = useTeams();
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState();
    const handleSave = useCallback(async (data) => {
        if (editingTask) {
            await updateTask(editingTask.id, { ...data, teamId: activeTeamId });
        }
        else {
            await createTask({ ...data, teamId: activeTeamId });
        }
        setShowForm(false);
        setEditingTask(undefined);
    }, [editingTask, createTask, updateTask, activeTeamId]);
    const handleEdit = useCallback((task) => {
        setEditingTask(task);
        setShowForm(true);
    }, []);
    return (_jsxs("div", { className: "h-screen bg-bg-secondary text-text-primary flex flex-col overflow-hidden drag-region", children: [_jsxs("div", { className: "flex items-center gap-2 px-2.5 py-2 border-b border-border-subtle no-drag", children: [_jsx("span", { className: "font-semibold text-xs", children: "\uD83D\uDCCB TodoFlow" }), _jsx(TeamTabs, {}), _jsx("button", { onClick: logout, className: "text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-tertiary transition-colors ml-auto", children: "\u9000\u51FA" })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-2 py-1 no-drag", children: QUADRANTS.map(q => (_jsx(QuadrantView, { quadrant: q.key, defaultOpen: q.defaultOpen, onEditTask: handleEdit }, q.key))) }), _jsx("div", { className: "px-2 pb-2 border-t border-border-subtle no-drag", children: !showForm ? (_jsx("div", { className: "flex gap-1 mt-1", children: _jsx("input", { placeholder: "+ \u6DFB\u52A0...", onFocus: () => setShowForm(true), className: "flex-1 bg-bg-input border border-border rounded px-2 py-1.5 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent-blue" }) })) : (_jsx(TaskForm, { task: editingTask, onSave: handleSave, onCancel: () => { setShowForm(false); setEditingTask(undefined); } })) })] }));
}
