import { useState } from 'react';
import { Task, QuadrantKey } from '../types';
import { useTasks } from '../hooks/useTasks';
import { QUADRANT_CONFIG } from '../utils/urgency';
import TaskItem from './TaskItem';

interface Props {
  quadrant: QuadrantKey;
  defaultOpen?: boolean;
  onEditTask: (task: Task) => void;
}

export default function QuadrantView({ quadrant, defaultOpen = true, onEditTask }: Props) {
  const { getQuadrantTasks } = useTasks();
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const config = QUADRANT_CONFIG[quadrant];
  const tasks = getQuadrantTasks(quadrant);

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 w-full px-1 py-1.5 hover:bg-bg-tertiary rounded text-[10px] font-semibold sticky top-0 bg-bg-secondary z-10"
      >
        <span className={`text-[8px] text-text-muted transition-transform ${collapsed ? '-rotate-90' : ''}`}>▼</span>
        <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: config.color }}></span>
        <span style={{ color: config.color }}>{config.label}</span>
        <span className="ml-auto text-[9px] text-text-secondary">{tasks.length}</span>
      </button>

      {!collapsed && (
        <div>
          {tasks.map(task => (
            <div key={task.id}>
              <TaskItem task={task} onEdit={onEditTask} />
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="ml-4">
                  {task.subtasks.map(st => (
                    <TaskItem key={st.id} task={st} isSubtask onEdit={onEditTask} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-[10px] text-text-muted px-1.5 py-1">暂无任务</p>
          )}
        </div>
      )}
    </div>
  );
}
