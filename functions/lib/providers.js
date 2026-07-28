"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODELS = void 0;
exports.callAI = callAI;
exports.parseJson = parseJson;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const https_1 = require("firebase-functions/v2/https");
exports.DEFAULT_MODELS = {
    claude: 'claude-opus-5',
    gemini: 'gemini-2.5-pro',
    openai: 'gpt-5',
};
async function callAI(settings, req) {
    const model = settings.model?.trim() || exports.DEFAULT_MODELS[settings.provider];
    try {
        switch (settings.provider) {
            case 'claude':
                return await callClaude(settings.apiKey, model, req);
            case 'gemini':
                return await callGemini(settings.apiKey, model, req);
            case 'openai':
                return await callOpenAI(settings.apiKey, model, req);
            default:
                throw new https_1.HttpsError('failed-precondition', 'Unknown AI provider — check Settings');
        }
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        const msg = err instanceof Error ? err.message : String(err);
        if (/401|invalid.*key|unauthorized|API key/i.test(msg)) {
            throw new https_1.HttpsError('failed-precondition', 'Your AI API key was rejected — check it in Settings');
        }
        throw new https_1.HttpsError('internal', `AI request failed: ${msg}`);
    }
}
async function callClaude(apiKey, model, req) {
    const client = new sdk_1.default({ apiKey });
    // Server-side refusal fallbacks: if the model's safety classifiers decline,
    // the API retries on Anthropic's recommended fallback model in the same call.
    // (Typed loosely — SDK typings lag the `fallbacks: "default"` parameter.)
    const fallbackOpts = {
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
    };
    const response = await client.beta.messages.create({
        model,
        max_tokens: req.maxTokens,
        ...fallbackOpts,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
    });
    if (response.stop_reason === 'refusal') {
        throw new https_1.HttpsError('unavailable', 'The AI declined this request. Try rephrasing the job description.');
    }
    return response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
}
async function callGemini(apiKey, model, req) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: req.system }] },
            contents: [{ role: 'user', parts: [{ text: req.user }] }],
            generationConfig: { maxOutputTokens: req.maxTokens },
        }),
    });
    if (!res.ok)
        throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = (await res.json());
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text)
        throw new Error('Gemini returned an empty response');
    return text;
}
async function callOpenAI(apiKey, model, req) {
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
    });
    if (!res.ok)
        throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = (await res.json());
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text)
        throw new Error('OpenAI returned an empty response');
    return text;
}
/** Strip markdown code fences and parse the first JSON object in the text. */
function parseJson(text) {
    const cleaned = text.replace(/```(?:json)?/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1)
        throw new Error('AI response contained no JSON');
    return JSON.parse(cleaned.slice(start, end + 1));
}
//# sourceMappingURL=providers.js.map