"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.importJobFromUrl = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const providers_1 = require("./providers");
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
function stripHtml(html) {
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
        .trim();
}
/** LinkedIn (and most job boards) embed a schema.org JobPosting as JSON-LD. */
function fromJsonLd(html) {
    const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, raw] of blocks) {
        try {
            const data = JSON.parse(raw.trim());
            const nodes = Array.isArray(data) ? data : [data];
            for (const node of nodes) {
                if (node['@type'] !== 'JobPosting')
                    continue;
                const org = node.hiringOrganization;
                const loc = node.jobLocation;
                const firstLoc = Array.isArray(loc) ? loc[0] : loc;
                const locality = firstLoc?.address?.addressLocality ?? '';
                const country = firstLoc?.address?.addressCountry ?? '';
                return {
                    jobTitle: String(node.title ?? ''),
                    company: org?.name ?? '',
                    location: [locality, country].filter(Boolean).join(', '),
                    description: stripHtml(String(node.description ?? '')).slice(0, 6000),
                };
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
/** LinkedIn guest job pages: no JSON-LD, but og:title + a description div. */
function fromLinkedInMarkup(html) {
    const og = html.match(/property="og:title" content="([^"]+)"/)?.[1];
    if (!og)
        return null;
    const m = og.match(/^(.+?) hiring (.+?) in (.+?) \| LinkedIn$/);
    const [company, jobTitle, location] = m ? [m[1], m[2], m[3]] : ['', og.replace(/ \| LinkedIn$/, ''), ''];
    if (!jobTitle)
        return null;
    const descHtml = html.match(/<div class="show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    return {
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        location: location.trim(),
        description: descHtml ? stripHtml(descHtml).slice(0, 6000) : '',
    };
}
async function fromAI(uid, pageText) {
    const settings = await (0, providers_1.loadAISettings)(uid);
    if (!settings)
        return null;
    const text = await (0, providers_1.callAI)(settings, {
        maxTokens: 4096,
        system: 'Extract the job posting details from the page text. Respond with ONLY valid JSON, no prose and no code fences: ' +
            '{"jobTitle": "...", "company": "...", "location": "...", "description": "<the full job description, plain text>"}. ' +
            'If a field is not present, use an empty string.',
        user: pageText.slice(0, 20000),
    });
    return (0, providers_1.parseJson)(text);
}
exports.importJobFromUrl = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const url = request.data?.url;
    if (!url || !/^https?:\/\//i.test(url)) {
        throw new https_1.HttpsError('invalid-argument', 'A valid job URL is required');
    }
    let html;
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
            redirect: 'follow',
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        html = await res.text();
    }
    catch (err) {
        throw new https_1.HttpsError('unavailable', `Couldn't fetch that page (${err instanceof Error ? err.message : 'error'}). Fill the fields manually.`);
    }
    if (/authwall|join now to see|sign in to view/i.test(html.slice(0, 5000)) && !fromJsonLd(html)) {
        throw new https_1.HttpsError('unavailable', 'LinkedIn is asking for a login for this page. Try the public job link, or fill the fields manually.');
    }
    let job = fromJsonLd(html) ?? fromLinkedInMarkup(html);
    if (!job || !job.jobTitle) {
        job = await fromAI(uid, stripHtml(html));
    }
    if (!job || !job.jobTitle) {
        throw new https_1.HttpsError('not-found', "Couldn't extract job details from that page. Fill the fields manually.");
    }
    logger.info(`importJobFromUrl uid=${uid} title="${job.jobTitle}" company="${job.company}"`);
    return { ...job, description: job.description.slice(0, 6000) };
});
//# sourceMappingURL=importJob.js.map