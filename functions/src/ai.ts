import { HttpsError, onCall } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import { callAI, parseJson } from './providers'
import type { AISettings } from './providers'

const db = () => getFirestore()

async function loadContext(uid: string, applicationId: string) {
  const [profileSnap, appSnap, settingsSnap] = await Promise.all([
    db().collection('users').doc(uid).get(),
    db().collection('users').doc(uid).collection('applications').doc(applicationId).get(),
    db().collection('users').doc(uid).collection('settings').doc('ai').get(),
  ])
  const profile = profileSnap.data()
  const application = appSnap.data()
  const settings = settingsSnap.data() as AISettings | undefined
  if (!profile) throw new HttpsError('failed-precondition', 'Fill in your profile first')
  if (!application) throw new HttpsError('not-found', 'Application not found')
  if (!settings?.apiKey || !settings.provider) {
    throw new HttpsError('failed-precondition', 'Choose an AI provider and add your API key in Settings')
  }
  return { profile, application, settings }
}

export const generateResume = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const applicationId = request.data?.applicationId as string | undefined
  if (!applicationId) throw new HttpsError('invalid-argument', 'applicationId is required')

  const { profile, application, settings } = await loadContext(uid, applicationId)

  const markdown = await callAI(settings, {
    maxTokens: 8192,
    system:
      'You are an expert resume writer for tech professionals. Produce a complete, tailored resume in clean Markdown. ' +
      'Use the candidate profile for the header, title, and skills. Tailor the professional summary and skill emphasis to the target job. ' +
      'The profile has no work history: create an Experience section with 2-3 placeholder roles clearly marked like "[Company — add your role details]", ' +
      'with bullet points suggesting achievements that would resonate for this specific job so the candidate can adapt them. ' +
      'Output ONLY the resume markdown, no preamble.',
    user: `Candidate profile:\n${JSON.stringify(profile, null, 2)}\n\nTarget job:\nTitle: ${application.jobTitle}\nCompany: ${application.company}\nDescription: ${application.description || '(none provided)'}`,
  })

  const now = Date.now()
  const resumeRef = await db().collection('users').doc(uid).collection('resumes').add({
    applicationId,
    jobTitle: application.jobTitle,
    company: application.company,
    markdown,
    createdAt: now,
  })
  await db()
    .collection('users').doc(uid)
    .collection('applications').doc(applicationId)
    .update({ resumeId: resumeRef.id, updatedAt: now })

  logger.info(`generateResume uid=${uid} provider=${settings.provider} app=${applicationId} resume=${resumeRef.id}`)
  return { resumeId: resumeRef.id }
})

interface SkillGapResult {
  summary: string
  items: { skill: string; priority: 'high' | 'medium' | 'low'; suggestion: string }[]
}

export const analyzeSkillGap = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const applicationId = request.data?.applicationId as string | undefined
  if (!applicationId) throw new HttpsError('invalid-argument', 'applicationId is required')

  const { profile, application, settings } = await loadContext(uid, applicationId)

  const text = await callAI(settings, {
    maxTokens: 4096,
    system:
      'You analyze the gap between a candidate\'s current skills and a target job. ' +
      'List only skills that are genuinely missing or weak relative to the job — not skills the candidate already has. ' +
      'Keep the list focused: 3-8 items, most important first. ' +
      'Respond with ONLY valid JSON, no prose and no code fences, matching exactly: ' +
      '{"summary": "<two-sentence fit assessment>", "items": [{"skill": "<name>", "priority": "high|medium|low", "suggestion": "<one concrete way to close this gap>"}]}',
    user: `Candidate skills: ${JSON.stringify(profile.skills ?? [])}\nCandidate title/seniority: ${profile.title} (${profile.seniority})\n\nTarget job:\nTitle: ${application.jobTitle}\nCompany: ${application.company}\nDescription: ${application.description || '(none provided)'}`,
  })

  const gap = parseJson<SkillGapResult>(text)

  const now = Date.now()
  await db()
    .collection('users').doc(uid)
    .collection('applications').doc(applicationId)
    .update({
      skillGap: {
        summary: gap.summary,
        items: gap.items.map((i) => ({ ...i, done: false })),
        analyzedAt: now,
      },
      updatedAt: now,
    })

  logger.info(`analyzeSkillGap uid=${uid} provider=${settings.provider} app=${applicationId} items=${gap.items.length}`)
  return { summary: gap.summary, itemCount: gap.items.length }
})
