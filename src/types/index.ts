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
  createdAt: number
  updatedAt: number
}
