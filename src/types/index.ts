export const STAGES = ['saved', 'applied', 'interviewing', 'offer', 'rejected'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

export interface UserProfile {
  name: string
  title: string
  seniority: 'junior' | 'mid' | 'senior' | 'staff' | 'principal'
  skills: string[]
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

export interface Application {
  id: string
  company: string
  jobTitle: string
  location?: string
  url?: string
  description?: string
  stage: Stage
  notes: string
  source: 'manual' | 'agent'
  resumeId?: string
  skillGap?: SkillGap
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
