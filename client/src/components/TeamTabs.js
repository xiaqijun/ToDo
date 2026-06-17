import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTeams } from '../hooks/useTeams';
export default function TeamTabs() {
    const { teams, activeTeamId, setActiveTeamId } = useTeams();
    return (_jsxs("div", { className: "flex gap-px bg-bg-input rounded p-0.5", children: [_jsx("button", { onClick: () => setActiveTeamId(undefined), className: `px-2 py-1 rounded text-[10px] transition-colors ${!activeTeamId ? 'bg-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`, children: "\u6211\u7684" }), teams.map(team => (_jsx("button", { onClick: () => setActiveTeamId(team.id), className: `px-2 py-1 rounded text-[10px] transition-colors ${activeTeamId === team.id ? 'bg-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`, children: team.name }, team.id)))] }));
}
