interface Subtask {
  title: string;
  assigneeId: string;
}

interface Props {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export default function SubtaskList({ subtasks, onChange }: Props) {
  const add = () => onChange([...subtasks, { title: '', assigneeId: '' }]);
  const remove = (i: number) => onChange(subtasks.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Subtask, value: string) => {
    onChange(subtasks.map((st, idx) => idx === i ? { ...st, [field]: value } : st));
  };

  return (
    <div className="mt-1">
      <label className="text-[9px] text-text-secondary uppercase">子任务</label>
      {subtasks.map((st, i) => (
        <div key={i} className="flex items-center gap-1 mt-1">
          <input
            value={st.title} onChange={e => update(i, 'title', e.target.value)}
            placeholder="名称" className="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-[10px] text-text-primary outline-none focus:border-accent-blue"
          />
          <select
            value={st.assigneeId} onChange={e => update(i, 'assigneeId', e.target.value)}
            className="w-16 bg-bg-input border border-border rounded px-1 py-1 text-[10px] text-text-primary outline-none"
          >
            <option value="">自己</option>
          </select>
          <button onClick={() => remove(i)} className="text-text-muted hover:text-accent-red text-xs">✕</button>
        </div>
      ))}
      <button onClick={add} className="text-[9px] text-accent-blue mt-1 hover:underline">+ 子任务</button>
    </div>
  );
}
