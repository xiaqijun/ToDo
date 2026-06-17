export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
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
  due?: 'quarter_end' | 'quarter_start';
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
  parentId?: string;
  startAt?: string;
  dueAt?: string;
  remindAt?: string;
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
  effectiveUrgency?: Urgency;
  isOverdue?: boolean;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  memberCount?: number;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  user?: User;
  joinedAt: string;
}

export type NotificationType = 'reminder' | 'assigned' | 'completed';

export interface Notification {
  id: string;
  userId: string;
  taskId: string;
  task?: Task;
  type: NotificationType;
  readAt?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
