import { useState, useEffect } from 'react';
import client from '../api/client';
import { Team } from '../types';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | undefined>();

  useEffect(() => {
    client.get('/teams')
      .then(res => setTeams(res.data.data))
      .catch(err => console.error('Failed to fetch teams:', err));
  }, []);

  return { teams, activeTeamId, setActiveTeamId };
}
