import { useState } from 'react';
import { Task, RecurrenceType } from '../types';
import SubtaskList from './SubtaskList';

interface SubtaskEntry {
  title: string;
  assigneeId: string;
}

interface Props {
  task?: Task;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function TaskForm({ task, onSave, onCancel }: Props) {
  const isEditing = !!task;

  // Determine initial quadrant from existing task or default
  const getInitialQuadrant = (): string => {
    if (!task) return 'q2';
    const u = task.urgency;
    const i = task.importance;
    if (u === 'high' && i === 'high') return 'q1';
    if (i === 'high') return 'q2';
    if (u === 'high') return 'q3';
    return 'q4';
  };

  const [title, setTitle] = useState(task?.title || '');
  const [quadrant, setQuadrant] = useState(getInitialQuadrant());
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || '');
  const [startAt, setStartAt] = useState(task?.startAt?.slice(0, 16) || '');
  const [dueAt, setDueAt] = useState(task?.dueAt?.slice(0, 16) || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrenceRule?.type || 'none');
  const [recurVal, setRecurVal] = useState('1');
  const [weekdaysOnly, setWeekdaysOnly] = useState(task?.recurrenceRule?.weekdaysOnly || false);
  const [recurStartTime, setRecurStartTime] = useState(task?.recurrenceRule?.startTime || '09:00');
  const [recurEndTime, setRecurEndTime] = useState(task?.recurrenceRule?.dueTime || '18:00');
  const [subtasks, setSubtasks] = useState<SubtaskEntry[]>(
    task?.subtasks?.map(st => ({ title: st.title, assigneeId: st.assigneeId || '' })) || []
  );
  const [saving, setSaving] = useState(false);

  const quadrantToUrgencyImportance = (q: string) => {
    switch (q) {
      case 'q1': return { urgency: 'high', importance: 'high' };
      case 'q2': return { urgency: 'medium', importance: 'high' };
      case 'q3': return { urgency: 'high', importance: 'medium' };
      case 'q4': return { urgency: 'low', importance: 'low' };
      default: return { urgency: 'medium', importance: 'medium' };
    }
  };

  const buildRecurrenceRule = () => {
    if (recurrence === 'none') return undefined;
    const rule: any = { type: recurrence, weekdaysOnly: weekdaysOnly || undefined };
    switch (recurrence) {
      case 'hourly': rule.interval = parseInt(recurVal) || 1; break;
      case 'daily': break;
      case 'weekly': rule.days = recurVal.split(',').map((d: string) => {
        const map: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
        return map[d.trim()] ?? parseInt(d);
      }); break;
      case 'monthly': rule.day = parseInt(recurVal) || 1; break;
      case 'quarterly': rule.startOffsetDays = -(parseInt(recurVal) || 7); rule.due = 'quarter_end'; break;
    }
    return rule;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { urgency, importance } = quadrantToUrgencyImportance(quadrant);
    try {
      await onSave({
        title: title.trim(), urgency, importance,
        assigneeId: assigneeId || undefined,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        dueAt: dueAt ? (recurrence === 'hourly' ? new Date().toISOString().slice(0, 11) + dueAt + ':00' : new Date(dueAt).toISOString()) : undefined,
        isRecurring: recurrence !== 'none',
        recurrenceRule: buildRecurrenceRule(),
        subtasks: subtasks.filter(st => st.title.trim()).map(st => ({
          title: st.title.trim(), assigneeId: st.assigneeId || undefined,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  const recurParams = () => {
    const label = recurrence === 'hourly' ? '间隔' : recurrence === 'weekly' ? '星期' : recurrence === 'monthly' ? '每' : recurrence === 'quarterly' ? '提前' : '';
    const unit = recurrence === 'hourly' ? '小时' : recurrence === 'monthly' ? '号' : recurrence === 'quarterly' ? '天' : '';
    const showWeekday = recurrence === 'hourly' || recurrence === 'daily';

    return (
      <div className="text-[9px] text-text-secondary py-1">
        <span>{label}</span>
        <input
          type={recurrence === 'weekly' ? 'text' : 'number'}
          value={recurVal} onChange={e => setRecurVal(e.target.value)}
          className="w-10 mx-1 bg-bg-input border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary outline-none focus:border-accent-blue"
          min={1} max={recurrence === 'monthly' ? 31 : recurrence === 'quarterly' ? 30 : undefined} placeholder={recurrence === 'weekly' ? '一,三,五' : ''}
        />
        <span>{unit}</span>
        {showWeekday && (
          <label className="ml-2 cursor-pointer">
            <input type="checkbox" checked={weekdaysOnly} onChange={e => setWeekdaysOnly(e.target.checked)} className="w-3 h-3 accent-accent-blue align-middle mr-1" />
            仅工作日
          </label>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mt-1.5 p-2 bg-bg-tertiary border border-border rounded-lg">
      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="任务名称" autoFocus
        className="w-full bg-bg-input border border-border rounded px-2 py-1.5 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent-blue mb-1.5"
      />

      <div className="flex gap-1 mb-1.5">
        <select value={quadrant} onChange={e => setQuadrant(e.target.value)}
          className="flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none">
          <option value="q1">🔴 马上做</option>
          <option value="q2">🟡 计划做</option>
          <option value="q3">🔵 委派</option>
          <option value="q4">⚫ 暂缓</option>
        </select>
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
          className="flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none">
          <option value="">自己</option>
        </select>
        <select value={recurrence} onChange={e => setRecurrence(e.target.value as RecurrenceType)}
          className="flex-1 bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none">
          <option value="none">不循环</option>
          <option value="hourly">每小时</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
          <option value="quarterly">每季度</option>
        </select>
      </div>

      <div className="flex gap-1 mb-1.5">
        <div className="flex-1">
          <label className="text-[9px] text-text-secondary uppercase block">开始时间</label>
          <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)}
            className="w-full bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none focus:border-accent-blue" />
        </div>
        <div className="flex-1">
          <label className="text-[9px] text-text-secondary uppercase block">截止时间</label>
          <input type={recurrence === 'hourly' ? 'time' : 'datetime-local'} value={dueAt} onChange={e => setDueAt(e.target.value)}
            className="w-full bg-bg-input border border-border rounded px-1 py-1.5 text-[10px] text-text-primary outline-none focus:border-accent-blue" />
        </div>
      </div>

      {recurrence !== 'none' && recurParams()}

      <SubtaskList subtasks={subtasks} onChange={setSubtasks} />

      <div className="flex justify-end gap-1 mt-2">
        <button type="button" onClick={onCancel}
          className="px-3 py-1 bg-bg-input border border-border rounded text-[10px] text-text-primary hover:bg-border transition-colors">取消</button>
        <button type="submit" disabled={saving}
          className="px-3 py-1 bg-accent-green text-white rounded text-[10px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
          {isEditing ? '保存' : '添加'}
        </button>
      </div>
    </form>
  );
}
