import { useState, useCallback } from 'react';
import { Task, QuadrantKey } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useTeams } from '../hooks/useTeams';
import QuadrantView from './QuadrantView';
import TaskForm from './TaskForm';
import TeamTabs from './TeamTabs';
import AdminPanel from './AdminPanel';

const QUADRANTS: { key: QuadrantKey; defaultOpen: boolean }[] = [
  { key: 'q1', defaultOpen: true },
  { key: 'q2', defaultOpen: true },
  { key: 'q3', defaultOpen: false },
  { key: 'q4', defaultOpen: false },
];

export default function FloatWindow() {
  const { user, logout } = useAuth();
  const { createTask, updateTask } = useTasks();
  const { activeTeamId } = useTeams();
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const handleSave = useCallback(async (data: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, { ...data, teamId: activeTeamId });
    } else {
      await createTask({ ...data, teamId: activeTeamId });
    }
    setShowForm(false);
    setEditingTask(undefined);
  }, [editingTask, createTask, updateTask, activeTeamId]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  return (
    <div className="h-screen bg-bg-secondary text-text-primary flex flex-col overflow-hidden drag-region">
      {/* Header — draggable area */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border-subtle drag-region">
        <span className="font-semibold text-xs">📋 TodoFlow</span>
        <TeamTabs />
        <div className="flex items-center gap-1 ml-auto">
          {user?.role === 'admin' && (
            <button onClick={() => setShowAdmin(true)}
              className="text-text-muted hover:text-text-primary text-xs px-1 py-0.5 rounded hover:bg-bg-tertiary transition-colors"
              title="用户管理">
              ⚙️
            </button>
          )}
          <span className="text-[10px] text-text-muted">{user?.displayName}</span>
          <button onClick={logout} className="text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-tertiary transition-colors">
            退出
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 no-drag">
        {QUADRANTS.map(q => (
          <QuadrantView key={q.key} quadrant={q.key} defaultOpen={q.defaultOpen} onEditTask={handleEdit} />
        ))}
      </div>

      {/* Add bar */}
      <div className="px-2 pb-2 border-t border-border-subtle no-drag">
        {!showForm ? (
          <div className="flex gap-1 mt-1">
            <input
              placeholder="+ 添加..."
              onFocus={() => setShowForm(true)}
              className="flex-1 bg-bg-input border border-border rounded px-2 py-1.5 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent-blue"
            />
          </div>
        ) : (
          <TaskForm
            task={editingTask}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingTask(undefined); }}
          />
        )}
      </div>
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
