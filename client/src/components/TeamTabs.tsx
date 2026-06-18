import { useTeams } from '../hooks/useTeams';

export default function TeamTabs() {
  const { teams, activeTeamId, setActiveTeamId } = useTeams();

  return (
    <div className="flex gap-px bg-bg-input rounded p-0.5 no-drag">
      <button
        onClick={() => setActiveTeamId(undefined)}
        className={`px-2 py-1 rounded text-[10px] transition-colors ${!activeTeamId ? 'bg-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
      >
        我的
      </button>
      {teams.map(team => (
        <button
          key={team.id}
          onClick={() => setActiveTeamId(team.id)}
          className={`px-2 py-1 rounded text-[10px] transition-colors ${activeTeamId === team.id ? 'bg-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
}
