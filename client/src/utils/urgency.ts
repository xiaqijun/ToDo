import { Task, QuadrantKey } from '../types';

export function getQuadrant(urgency: string, importance: string): QuadrantKey {
  if (urgency === 'high' && importance === 'high') return 'q1';
  if (urgency !== 'high' && importance === 'high') return 'q2';
  if (urgency === 'high' && importance !== 'high') return 'q3';
  return 'q4';
}

export function getEffectiveQuadrant(task: Task): QuadrantKey {
  const u = task.effectiveUrgency || task.urgency;
  return getQuadrant(u, task.importance);
}

export const QUADRANT_CONFIG: Record<QuadrantKey, { label: string; color: string }> = {
  q1: { label: '马上做', color: '#f85149' },
  q2: { label: '计划做', color: '#d29922' },
  q3: { label: '委派', color: '#58a6ff' },
  q4: { label: '暂缓', color: '#484f58' },
};
