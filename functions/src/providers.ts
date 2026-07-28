import Anthropic from '@anthropic-ai/sdk'
import { HttpsError } from 'firebase-functions/v2/https'

export type AIProvider = 'claude' | 'gemini' | 'openai'

export interface AISettings {
  provider: AIProvider
  apiKey: string
  model?: string
}

export interface AIRequest {
  system: string
  user: string
  maxTokens: number
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-opus-5',
  gemini: 'gemini-2.5-pro',
  openai: 'gpt-5',
}

export async function callAI(settings: AISettings, req: AIRequest): Promise<string> {
  const model = settings.model?.trim() || DEFAULT_MODELS[settings.provider]
  try {
    switch (settings.provider) {
      case 'claude':
        return await callClaude(settings.apiKey, model, req)
      case 'gemini':
        return await callGemini(settings.apiKey, model, req)
      case 'openai':
        return await callOpenAI(settings.apiKey, model, req)
      default:
        throw new HttpsError('failed-precondition', 'Unknown AI provider — check Settings')
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    const msg = err instanceof Error ? err.message : String(err)
    if (/401|invalid.*key|unauthorized|API key/i.test(msg)) {
      throw new HttpsError('failed-precondition', 'Your AI API key was rejected — check it in Settings')
    }
    throw new HttpsError('internal', `AI request failed: ${msg}`)
  }
}

async function callClaude(apiKey: string, model: string, req: AIRequest): Promise<string> {
  const client = new Anthropic({ apiKey })
  // Server-side refusal fallbacks: if the model's safety classifiers decline,
  // the API retries on Anthropic's recommended fallback model in the same call.
  // (Typed loosely — SDK typings lag the `fallbacks: "default"` parameter.)
  const fallbackOpts = {
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  } as unknown as Record<string, never>
  const response = await client.beta.messages.create({
    model,
    max_tokens: req.maxTokens,
    ...fallbackOpts,
    system: req.system,
    messages: [{ role: 'user', content: req.user }],
  })
  if (response.stop_reason === 'refusal') {
    throw new HttpsError('unavailable', 'The AI declined this request. Try rephrasing the job description.')
  }
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')
}

async function callGemini(apiKey: string, model: string, req: AIRequest): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: { maxOutputTokens: req.maxTokens },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new Error('Gemini returned an empty response')
  return text
}

async function callOpenAI(apiKey: string, model: string, req: AIRequest): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_completion_tokens: req.maxTokens,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('OpenAI returned an empty response')
  return text
}

/** Strip markdown code fences and parse the first JSON object in the text. */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI response contained no JSON')
  return JSON.parse(cleaned.slice(start, end + 1)) as T
}
