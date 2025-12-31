// Domain types.

export type Role = 'ADMIN' | 'TRAINER' | 'CLIENT';

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface User {
  id?: string;
  _id?: string;
  username: string;
  email: string;
  role: Role;
  profile: UserProfile;
  isActive?: boolean;
}

export interface TrainerProfile {
  _id?: string;
  userId: string | { _id: string; username: string; email?: string };
  certification?: string;
  specialties: string[];
  avatarUrl?: string;
  documentUrls: string[];
  validatedByAdmin: boolean;
  validatedAt?: string;
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  rejectedAt?: string;
  rating?: number;
  hourlyRate?: number;
}

export interface ClientProfile {
  _id?: string;
  userId: string | { _id: string; username: string; email: string; profile?: UserProfile };
  trainerId?: string | null;
  joinedAt?: string;
  goals?: string;
  injuries?: string;
  preferences?: string;
}

export interface TrainingPlan {
  _id?: string;
  clientId: string;
  trainerId: string;
  title: string;
  description?: string;
  frequencyPerWeek: 3 | 4 | 5;
  startDate: string;
  endDate?: string;
}

export interface Exercise {
  _id?: string;
  name: string;
  sets: number;
  reps: number;
  notes?: string;
  mediaUrl?: string;
}

export interface TrainingSession {
  _id?: string;
  planId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  order?: number;
  notes?: string;
  exercises: Exercise[];
}

export type CompletionStatus = 'DONE' | 'MISSED';

export interface CompletionLog {
  _id?: string;
  clientId: string;
  trainerId: string;
  planId: string;
  sessionId: string;
  date: string;
  status: CompletionStatus;
  reason?: string;
  proofImage?: string;
}

export interface Conversation {
  _id?: string;
  participants: string[];
  clientId?: string;
  trainerId?: string;
  lastMessageAt?: string;
  lastMessageText?: string;
}

export interface Message {
  _id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: string[];
  readAt?: string;
  createdAt?: string;
}

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'MISSED_WORKOUT'
  | 'WORKOUT_DONE'
  | 'NEW_PLAN'
  | 'NEW_CLIENT'
  | 'TRAINER_CHANGE_REQUEST'
  | 'TRAINER_CHANGE_DECIDED'
  | 'TRAINER_APPROVED'
  | 'TRAINER_REJECTED'
  | 'ALERT';

export interface Notification {
  _id?: string;
  recipientId: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt?: string;
}

export type TrainerChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TrainerChangeRequest {
  _id?: string;
  clientId: string;
  currentTrainerId?: string;
  requestedTrainerId: string;
  reason?: string;
  status: TrainerChangeStatus;
  decidedByAdminId?: string;
  decidedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  total?: number;
  pages?: number;
}
