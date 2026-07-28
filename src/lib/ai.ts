import { getFunctions, httpsCallable } from 'firebase/functions'

export async function generateResume(applicationId: string): Promise<string> {
  const fn = httpsCallable<{ applicationId: string }, { resumeId: string }>(
    getFunctions(),
    'generateResume'
  )
  const res = await fn({ applicationId })
  return res.data.resumeId
}

export interface ImportedJob {
  jobTitle: string
  company: string
  location: string
  description: string
}

export async function importJobFromUrl(url: string): Promise<ImportedJob> {
  const fn = httpsCallable<{ url: string }, ImportedJob>(getFunctions(), 'importJobFromUrl')
  const res = await fn({ url })
  return res.data
}

export async function analyzeSkillGap(applicationId: string): Promise<void> {
  const fn = httpsCallable<{ applicationId: string }, { summary: string; itemCount: number }>(
    getFunctions(),
    'analyzeSkillGap'
  )
  await fn({ applicationId })
}
