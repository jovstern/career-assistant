import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY')
const MODEL = 'claude-opus-5'

const db = () => getFirestore()

async function loadContext(uid: string, applicationId: string) {
  const [profileSnap, appSnap] = await Promise.all([
    db().collection('users').doc(uid).get(),
    db().collection('users').doc(uid).collection('applications').doc(applicationId).get(),
  ])
  const profile = profileSnap.data()
  const application = appSnap.data()
  if (!profile) throw new HttpsError('failed-precondition', 'Fill in your profile first')
  if (!application) throw new HttpsError('not-found', 'Application not found')
  return { profile, application }
}

function claude() {
  return new Anthropic({ apiKey: anthropicApiKey.value() })
}

// Server-side refusal fallbacks are enabled by default: if claude-opus-5's
// safety classifiers decline a request, the API retries it on Anthropic's
// recommended fallback model in the same call.
// (typed loosely — SDK typings lag the `fallbacks: "default"` parameter)
const FALLBACK_OPTS = {
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
} as unknown as Record<string, never>

export const generateResume = onCall({ secrets: [anthropicApiKey] }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const applicationId = request.data?.applicationId as string | undefined
  if (!applicationId) throw new HttpsError('invalid-argument', 'applicationId is required')

  const { profile, application } = await loadContext(uid, applicationId)

  const response = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: 8192,
    ...FALLBACK_OPTS,
    system:
      'You are an expert resume writer for tech professionals. Produce a complete, tailored resume in clean Markdown. ' +
      'Use the candidate profile for the header, title, and skills. Tailor the professional summary and skill emphasis to the target job. ' +
      'The profile has no work history: create an Experience section with 2-3 placeholder roles clearly marked like "[Company — add your role details]", ' +
      'with bullet points suggesting achievements that would resonate for this specific job so the candidate can adapt them. ' +
      'Output ONLY the resume markdown, no preamble.',
    messages: [
      {
        role: 'user',
        content: `Candidate profile:\n${JSON.stringify(profile, null, 2)}\n\nTarget job:\nTitle: ${application.jobTitle}\nCompany: ${application.company}\nDescription: ${application.description || '(none provided)'}`,
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new HttpsError('unavailable', 'The AI declined this request. Try rephrasing the job description.')
  }

  const markdown = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')

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

  logger.info(`generateResume uid=${uid} app=${applicationId} resume=${resumeRef.id}`)
  return { resumeId: resumeRef.id }
})

const SKILL_GAP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'items'],
  properties: {
    summary: { type: 'string', description: 'Two-sentence overall fit assessment' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['skill', 'priority', 'suggestion'],
        properties: {
          skill: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          suggestion: { type: 'string', description: 'One concrete way to close this gap' },
        },
      },
    },
  },
} as const

export const analyzeSkillGap = onCall({ secrets: [anthropicApiKey] }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const applicationId = request.data?.applicationId as string | undefined
  if (!applicationId) throw new HttpsError('invalid-argument', 'applicationId is required')

  const { profile, application } = await loadContext(uid, applicationId)

  const response = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: 4096,
    ...FALLBACK_OPTS,
    output_config: { format: { type: 'json_schema', schema: SKILL_GAP_SCHEMA } },
    system:
      'You analyze the gap between a candidate\'s current skills and a target job. ' +
      'List only skills that are genuinely missing or weak relative to the job — not skills the candidate already has. ' +
      'Keep the list focused: 3-8 items, most important first.',
    messages: [
      {
        role: 'user',
        content: `Candidate skills: ${JSON.stringify(profile.skills ?? [])}\nCandidate title/seniority: ${profile.title} (${profile.seniority})\n\nTarget job:\nTitle: ${application.jobTitle}\nCompany: ${application.company}\nDescription: ${application.description || '(none provided)'}`,
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new HttpsError('unavailable', 'The AI declined this request. Try rephrasing the job description.')
  }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')
  const gap = JSON.parse(text) as {
    summary: string
    items: { skill: string; priority: string; suggestion: string }[]
  }

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

  logger.info(`analyzeSkillGap uid=${uid} app=${applicationId} items=${gap.items.length}`)
  return { summary: gap.summary, itemCount: gap.items.length }
})
