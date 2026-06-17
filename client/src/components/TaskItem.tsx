import { Task } from '../types';
import { useTasks } from '../hooks/useTasks';

interface Props {
  task: Task;
  isSubtask?: boolean;
  onEdit?: (task: Task) => void;
}

export default function TaskItem({ task, isSubtask = false, onEdit }: Props) {
  const { toggleComplete } = useTasks();

  const recurrenceLabel = (): string | null => {
    if (!task.isRecurring || !task.recurrenceRule) return null;
    const r = task.recurrenceRule;
    switch (r.type) {
      case 'hourly': return '每小时';
      case 'daily': return '每天';
      case 'weekly': return '每周';
      case 'monthly': return '每月';
      case 'quarterly': return '每季度';
      default: return null;
    }
  };

  const isDone = task.status === 'done';

  return (
    <div
      onClick={() => onEdit?.(task)}
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-bg-tertiary cursor-pointer text-xs ${isDone ? 'opacity-50' : ''}`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }}
        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] flex-shrink-0 transition-colors ${
          isDone ? 'bg-accent-green border-accent-green text-white' : 'border-border hover:border-accent-blue'
        }`}
      >
        {isDone && '✓'}
      </button>

      <span className={`flex-1 truncate ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>
        {!isSubtask && task.isOverdue && <span className="text-accent-red mr-1">🔴</span>}
        {task.title}
      </span>

      <div className="flex gap-1 flex-shrink-0">
        {recurrenceLabel() && (
          <span className="text-[8px] px-1.5 py-px rounded-full bg-accent-purple/15 text-accent-purple whitespace-nowrap">
            {recurrenceLabel()}
          </span>
        )}
        {task.assignee && (
          <span className="text-[8px] px-1.5 py-px rounded-full bg-accent-blue/10 text-accent-blue whitespace-nowrap">
            @{task.assignee.displayName}
          </span>
        )}
      </div>
    </div>
  );
}
