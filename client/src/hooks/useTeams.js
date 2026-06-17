import { useState, useEffect } from 'react';
import client from '../api/client';
export function useTeams() {
    const [teams, setTeams] = useState([]);
    const [activeTeamId, setActiveTeamId] = useState();
    useEffect(() => {
        client.get('/teams')
            .then(res => setTeams(res.data.data))
            .catch(err => console.error('Failed to fetch teams:', err));
    }, []);
    return { teams, activeTeamId, setActiveTeamId };
}
