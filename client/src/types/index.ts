export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export type TaskStatus = 'pending' | 'done';
export type Importance = 'high' | 'medium' | 'low';
export type Urgency = 'high' | 'medium' | 'low';
export type RecurrenceType = 'none' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number;
  startTime?: string;
  dueTime?: string;
  weekdaysOnly?: boolean;
  days?: number[];
  day?: number;
  due?: string;
  startOffsetDays?: number;
  visibleAfter?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  importance: Importance;
  urgency: Urgency;
  effectiveUrgency?: Urgency;
  isOverdue?: boolean;
  parentId?: string;
  startAt?: string;
  dueAt?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  assigneeId?: string;
  assignee?: User;
  creatorId: string;
  creator?: User;
  teamId?: string;
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  _count?: { members: number };
}

export type QuadrantKey = 'q1' | 'q2' | 'q3' | 'q4';
