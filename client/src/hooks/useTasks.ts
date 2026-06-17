import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { getSocket } from '../api/socket';
import { Task, QuadrantKey } from '../types';
import { getEffectiveQuadrant } from '../utils/urgency';

export function useTasks(teamId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const params: any = {};
      if (teamId) params.teamId = teamId;
      const res = await client.get('/tasks', { params });
      setTasks(res.data.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Socket listener for real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskUpdate = (data: any) => {
      if (data.type === 'deleted') {
        setTasks(prev => prev.filter(t => t.id !== data.task.id));
      } else if (data.type === 'created') {
        setTasks(prev => [data.task, ...prev]);
      } else if (data.type === 'updated') {
        setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
      }
    };

    socket.on('task:updated', handleTaskUpdate);
    return () => { socket.off('task:updated', handleTaskUpdate); };
  }, []);

  const createTask = async (data: Partial<Task>) => {
    const res = await client.post('/tasks', data);
    return res.data.data;
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    const res = await client.put(`/tasks/${id}`, data);
    return res.data.data;
  };

  const deleteTask = async (id: string) => {
    await client.delete(`/tasks/${id}`);
  };

  const toggleComplete = async (id: string) => {
    const res = await client.patch(`/tasks/${id}/complete`);
    return res.data.data;
  };

  const getQuadrantTasks = (quadrant: QuadrantKey) => {
    return tasks
      .filter(t => t.status === 'pending' && !t.parentId)
      .filter(t => getEffectiveQuadrant(t) === quadrant)
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        return 0;
      });
  };

  return { tasks, loading, fetchTasks, createTask, updateTask, deleteTask, toggleComplete, getQuadrantTasks };
}
