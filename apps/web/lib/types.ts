export type ProjectType =
  | 'internship'
  | 'part_time'
  | 'freelance'
  | 'full_time';

export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface Project {
  id: string;
  title: string;
  description: string;
  type: ProjectType;
  budget?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  skillsRequired: string[];
  location?: string | null;
  remote: boolean;
  status: string;
  createdAt: string;
  employer?: {
    id: string;
    companyName?: string | null;
    user?: { name: string };
  } | null;
}

export interface MatchedProject extends Project {
  matchScore: number;
  skillMatches: string[];
}

export interface Application {
  id: string;
  projectId: string;
  studentId: string;
  coverLetter?: string | null;
  proposedBudget?: number | null;
  status: ApplicationStatus;
  stage?: string;
  createdAt: string;
  project?: Project;
  student?: {
    id: string;
    user?: { name: string; email: string };
  };
}

export const TYPE_LABELS: Record<ProjectType, string> = {
  internship: 'Internship',
  part_time: 'Part-time',
  freelance: 'Freelance',
  full_time: 'Full-time',
};

export type ProjectStatus =
  | 'draft'
  | 'open'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'expired';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  open: 'Published',
  paused: 'Paused',
  completed: 'Closed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

// Badge variant per status for the jobs board.
export const PROJECT_STATUS_VARIANT: Record<ProjectStatus, 'primary' | 'secondary' | 'neutral' | 'outline'> = {
  draft: 'neutral',
  open: 'primary',
  paused: 'outline',
  completed: 'secondary',
  cancelled: 'neutral',
  expired: 'neutral',
};

// Allowed lifecycle transitions (mirrors the API).
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['paused', 'completed', 'cancelled', 'expired'],
  paused: ['open', 'cancelled'],
  completed: ['open'],
  cancelled: ['draft', 'open'],
  expired: ['open', 'draft'],
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export type ApplicationStage =
  | 'applied'
  | 'screening'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'hired';

export const STAGE_ORDER: ApplicationStage[] = [
  'applied',
  'screening',
  'shortlisted',
  'interview',
  'offer',
  'hired',
];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
};
