import { onSchedule } from 'firebase-functions/v2/scheduler'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { MockJobProvider } from './jobProvider'
import type { JobSearchCriteria } from './jobProvider'

initializeApp()
const db = getFirestore()

export { generateResume, analyzeSkillGap } from './ai'
export { importJobFromUrl } from './importJob'
const provider = new MockJobProvider()

interface FetchResult {
  found: number
  newMatches: number
}

async function fetchMatchesForUser(uid: string, criteria: JobSearchCriteria): Promise<FetchResult> {
  const jobs = await provider.search(criteria)
  let newMatches = 0

  for (const job of jobs) {
    await db.collection('jobs').doc(job.id).set({ ...job, fetchedAt: FieldValue.serverTimestamp() }, { merge: true })

    const matchRef = db.collection('users').doc(uid).collection('matches').doc(job.id)
    const [matchSnap, existingApp] = await Promise.all([
      matchRef.get(),
      db.collection('users').doc(uid).collection('applications')
        .where('company', '==', job.company).where('jobTitle', '==', job.title).limit(1).get(),
    ])
    if (matchSnap.exists || !existingApp.empty) continue

    await matchRef.set({
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote,
      url: job.url,
      description: job.description,
      salaryMin: job.salaryMin ?? null,
      status: 'new',
      createdAt: Date.now(),
    })
    newMatches++
  }

  return { found: jobs.length, newMatches }
}

function criteriaFromProfile(profile: FirebaseFirestore.DocumentData | undefined): JobSearchCriteria | null {
  const prefs = profile?.preferences
  if (!prefs || (!prefs.roles?.length && !prefs.locations?.length)) return null
  return {
    roles: prefs.roles ?? [],
    locations: prefs.locations ?? [],
    remote: prefs.remote ?? 'any',
    minSalary: prefs.minSalary ?? undefined,
  }
}

export const dailyJobFetch = onSchedule(
  { schedule: 'every day 06:00', timeZone: 'Asia/Jerusalem' },
  async () => {
    const users = await db.collection('users').get()
    for (const userDoc of users.docs) {
      const criteria = criteriaFromProfile(userDoc.data())
      if (!criteria) continue
      const result = await fetchMatchesForUser(userDoc.id, criteria)
      logger.info(`dailyJobFetch uid=${userDoc.id} found=${result.found} new=${result.newMatches}`)
    }
  }
)

export const fetchJobsNow = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')

  const profile = (await db.collection('users').doc(uid).get()).data()
  const criteria = criteriaFromProfile(profile)
  if (!criteria) {
    throw new HttpsError('failed-precondition', 'Set target roles or locations in your profile first')
  }

  const result = await fetchMatchesForUser(uid, criteria)
  logger.info(`fetchJobsNow uid=${uid} found=${result.found} new=${result.newMatches}`)
  return result
})
