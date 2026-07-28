import { HttpsError, onCall } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { callAI, loadAISettings, parseJson } from './providers'

interface ImportedJob {
  jobTitle: string
  company: string
  location: string
  description: string
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

/** LinkedIn (and most job boards) embed a schema.org JobPosting as JSON-LD. */
function fromJsonLd(html: string): ImportedJob | null {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const [, raw] of blocks) {
    try {
      const data = JSON.parse(raw.trim()) as Record<string, unknown>
      const nodes = Array.isArray(data) ? data : [data]
      for (const node of nodes as Record<string, unknown>[]) {
        if (node['@type'] !== 'JobPosting') continue
        const org = node.hiringOrganization as { name?: string } | undefined
        const loc = node.jobLocation as
          | { address?: { addressLocality?: string; addressCountry?: string } }
          | { address?: { addressLocality?: string; addressCountry?: string } }[]
          | undefined
        const firstLoc = Array.isArray(loc) ? loc[0] : loc
        const locality = firstLoc?.address?.addressLocality ?? ''
        const country = firstLoc?.address?.addressCountry ?? ''
        return {
          jobTitle: String(node.title ?? ''),
          company: org?.name ?? '',
          location: [locality, country].filter(Boolean).join(', '),
          description: stripHtml(String(node.description ?? '')).slice(0, 6000),
        }
      }
    } catch {
      continue
    }
  }
  return null
}

/** LinkedIn guest job pages: no JSON-LD, but og:title + a description div. */
function fromLinkedInMarkup(html: string): ImportedJob | null {
  const og = html.match(/property="og:title" content="([^"]+)"/)?.[1]
  if (!og) return null
  const m = og.match(/^(.+?) hiring (.+?) in (.+?) \| LinkedIn$/)
  const [company, jobTitle, location] = m ? [m[1], m[2], m[3]] : ['', og.replace(/ \| LinkedIn$/, ''), '']
  if (!jobTitle) return null
  const descHtml = html.match(
    /<div class="show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/
  )?.[1]
  return {
    jobTitle: jobTitle.trim(),
    company: company.trim(),
    location: location.trim(),
    description: descHtml ? stripHtml(descHtml).slice(0, 6000) : '',
  }
}

async function fromAI(uid: string, pageText: string): Promise<ImportedJob | null> {
  const settings = await loadAISettings(uid)
  if (!settings) return null

  const text = await callAI(settings, {
    maxTokens: 4096,
    system:
      'Extract the job posting details from the page text. Respond with ONLY valid JSON, no prose and no code fences: ' +
      '{"jobTitle": "...", "company": "...", "location": "...", "description": "<the full job description, plain text>"}. ' +
      'If a field is not present, use an empty string.',
    user: pageText.slice(0, 20000),
  })
  return parseJson<ImportedJob>(text)
}

export const importJobFromUrl = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const url = request.data?.url as string | undefined
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new HttpsError('invalid-argument', 'A valid job URL is required')
  }

  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    throw new HttpsError('unavailable', `Couldn't fetch that page (${err instanceof Error ? err.message : 'error'}). Fill the fields manually.`)
  }

  if (/authwall|join now to see|sign in to view/i.test(html.slice(0, 5000)) && !fromJsonLd(html)) {
    throw new HttpsError('unavailable', 'LinkedIn is asking for a login for this page. Try the public job link, or fill the fields manually.')
  }

  let job = fromJsonLd(html) ?? fromLinkedInMarkup(html)
  if (!job || !job.jobTitle) {
    job = await fromAI(uid, stripHtml(html))
  }
  if (!job || !job.jobTitle) {
    throw new HttpsError('not-found', "Couldn't extract job details from that page. Fill the fields manually.")
  }

  logger.info(`importJobFromUrl uid=${uid} title="${job.jobTitle}" company="${job.company}"`)
  return { ...job, description: job.description.slice(0, 6000) }
})
