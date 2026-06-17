import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { QUADRANT_CONFIG } from '../utils/urgency';
import TaskItem from './TaskItem';
export default function QuadrantView({ quadrant, defaultOpen = true, onEditTask }) {
    const { getQuadrantTasks } = useTasks();
    const [collapsed, setCollapsed] = useState(!defaultOpen);
    const config = QUADRANT_CONFIG[quadrant];
    const tasks = getQuadrantTasks(quadrant);
    return (_jsxs("div", { className: "mb-0.5", children: [_jsxs("button", { onClick: () => setCollapsed(!collapsed), className: "flex items-center gap-1.5 w-full px-1 py-1.5 hover:bg-bg-tertiary rounded text-[10px] font-semibold sticky top-0 bg-bg-secondary z-10", children: [_jsx("span", { className: `text-[8px] text-text-muted transition-transform ${collapsed ? '-rotate-90' : ''}`, children: "\u25BC" }), _jsx("span", { className: "w-1.5 h-1.5 rounded-sm flex-shrink-0", style: { backgroundColor: config.color } }), _jsx("span", { style: { color: config.color }, children: config.label }), _jsx("span", { className: "ml-auto text-[9px] text-text-secondary", children: tasks.length })] }), !collapsed && (_jsxs("div", { children: [tasks.map(task => (_jsxs("div", { children: [_jsx(TaskItem, { task: task, onEdit: onEditTask }), task.subtasks && task.subtasks.length > 0 && (_jsx("div", { className: "ml-4", children: task.subtasks.map(st => (_jsx(TaskItem, { task: st, isSubtask: true, onEdit: onEditTask }, st.id))) }))] }, task.id))), tasks.length === 0 && (_jsx("p", { className: "text-[10px] text-text-muted px-1.5 py-1", children: "\u6682\u65E0\u4EFB\u52A1" }))] }))] }));
}
