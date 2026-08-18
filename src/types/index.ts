export const STAGES = ['applied', 'phoneScreen', 'interviewing', 'offer', 'rejected'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  phoneScreen: 'Phone Screen',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

export interface UserProfile {
  name: string
  title: string
  seniority: 'junior' | 'mid' | 'senior' | 'staff' | 'principal'
  skills: string[]
  /** Plain text of the user's own resume — the base the AI builder tailors from. */
  baseResume?: string
  preferences: {
    roles: string[]
    locations: string[]
    remote: 'remote' | 'hybrid' | 'onsite' | 'any'
    minSalary?: number
  }
}

export interface SkillGapItem {
  skill: string
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  done: boolean
}

export interface SkillGap {
  summary: string
  items: SkillGapItem[]
  analyzedAt: number
}

export interface InterviewStep {
  id: string
  label: string
  done: boolean
}

export interface RejectionInfo {
  reasonText: string
}

export interface Application {
  id: string
  company: string
  jobTitle: string
  location?: string
  workMode?: 'onsite' | 'hybrid' | 'remote'
  url?: string
  description?: string
  stage: Stage
  notes: string
  contactEmail?: string
  contactPhone?: string
  source: 'manual' | 'agent'
  resumeId?: string
  skillGap?: SkillGap
  interviewSteps?: InterviewStep[]
  rejection?: RejectionInfo
  createdAt: number
  updatedAt: number
}

/** A single entry in the user's unified growth list — weaknesses to work on,
 * whether typed in directly or found by AI analyzing a rejection. */
export interface GrowthItem {
  id: string
  title: string
  notes?: string
  priority: 'high' | 'medium' | 'low'
  suggestedActions?: string[]
  source: 'manual' | 'ai'
  relatedApplicationIds: string[]
  done: boolean
  createdAt: number
  updatedAt: number
}

export interface Resume {
  id: string
  applicationId: string
  jobTitle: string
  company: string
  markdown: string
  createdAt: number
}
