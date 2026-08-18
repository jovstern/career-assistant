import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

/** Delete a resume and clear any application references pointing at it. */
export async function deleteResume(uid: string, resumeId: string): Promise<void> {
  const refs = await getDocs(
    query(collection(db, 'users', uid, 'applications'), where('resumeId', '==', resumeId))
  )
  await Promise.all(refs.docs.map((d) => updateDoc(d.ref, { resumeId: deleteField() })))
  await deleteDoc(doc(db, 'users', uid, 'resumes', resumeId))
}

/** Persist a manual edit to a resume's markdown content. */
export async function updateResumeMarkdown(
  uid: string,
  resumeId: string,
  markdown: string
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'resumes', resumeId), { markdown })
}
