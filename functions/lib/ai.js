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
exports.adviseGrowthItem = exports.analyzeRejection = exports.analyzeSkillGap = exports.refineResume = exports.generateResume = exports.testAIConnection = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const providers_1 = require("./providers");
const db = () => (0, firestore_1.getFirestore)();
async function loadContext(uid, applicationId) {
    const [profileSnap, appSnap, settings] = await Promise.all([
        db().collection('users').doc(uid).get(),
        db().collection('users').doc(uid).collection('applications').doc(applicationId).get(),
        (0, providers_1.loadAISettings)(uid),
    ]);
    const profile = profileSnap.data();
    const application = appSnap.data();
    if (!profile)
        throw new https_1.HttpsError('failed-precondition', 'Fill in your profile first');
    if (!application)
        throw new https_1.HttpsError('not-found', 'Application not found');
    if (!settings) {
        throw new https_1.HttpsError('failed-precondition', 'Choose an AI provider and add your API key in Settings');
    }
    return { profile, application, settings };
}
exports.testAIConnection = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const { provider, apiKey, model } = (request.data ?? {});
    if (!provider)
        throw new https_1.HttpsError('invalid-argument', 'Provider is required');
    // Test either the key typed in the form, or (if none) the stored key.
    let settings;
    if (apiKey?.trim()) {
        settings = { provider, apiKey: apiKey.trim(), model };
    }
    else {
        const stored = await (0, providers_1.loadAISettings)(uid);
        if (!stored)
            throw new https_1.HttpsError('invalid-argument', 'Enter an API key first');
        settings = { ...stored, provider, model: model ?? stored.model };
    }
    const text = await (0, providers_1.callAI)(settings, {
        maxTokens: 1000,
        system: 'You are a connectivity test. Reply with the single word: OK',
        user: 'ping',
    });
    logger.info(`testAIConnection uid=${uid} provider=${provider} ok`);
    return { ok: true, reply: text.trim().slice(0, 40) };
});
exports.generateResume = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const applicationId = request.data?.applicationId;
    if (!applicationId)
        throw new https_1.HttpsError('invalid-argument', 'applicationId is required');
    const { profile, application, settings } = await loadContext(uid, applicationId);
    const baseResume = typeof profile.baseResume === 'string' ? profile.baseResume.trim() : '';
    const { baseResume: _omit, ...profileRest } = profile;
    const markdown = await (0, providers_1.callAI)(settings, {
        maxTokens: 8192,
        system: 'You are an expert resume writer for tech professionals. Produce a complete, tailored resume in clean Markdown. ' +
            (baseResume
                ? 'Rework the candidate\'s existing resume for the target job: keep all real experience, employers, and dates truthful and intact, ' +
                    'but reorder, reword, and re-emphasize achievements and skills to match what this job values. Sharpen the professional summary for this role. ' +
                    'Never invent employers, roles, or accomplishments that are not in the source resume. '
                : 'The candidate has no stored resume: use the profile for the header, title, and skills, and create an Experience section with 2-3 placeholder roles ' +
                    'clearly marked like "[Company — add your role details]", with bullet points suggesting achievements that would resonate for this specific job. ') +
            'Output ONLY the resume markdown, no preamble.',
        user: `Candidate profile:\n${JSON.stringify(profileRest, null, 2)}\n\n` +
            (baseResume ? `Candidate's current resume:\n${baseResume.slice(0, 30000)}\n\n` : '') +
            `Target job:\nTitle: ${application.jobTitle}\nCompany: ${application.company}\nDescription: ${application.description || '(none provided)'}`,
    });
    const now = Date.now();
    const resumeRef = await db().collection('users').doc(uid).collection('resumes').add({
        applicationId,
        jobTitle: application.jobTitle,
        company: application.company,
        markdown,
        createdAt: now,
    });
    await db()
        .collection('users').doc(uid)
        .collection('applications').doc(applicationId)
        .update({ resumeId: resumeRef.id, updatedAt: now });
    logger.info(`generateResume uid=${uid} provider=${settings.provider} app=${applicationId} resume=${resumeRef.id}`);
    return { resumeId: resumeRef.id };
});
exports.refineResume = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const { resumeId, instruction } = (request.data ?? {});
    if (!resumeId)
        throw new https_1.HttpsError('invalid-argument', 'resumeId is required');
    if (!instruction?.trim())
        throw new https_1.HttpsError('invalid-argument', 'Tell the AI what to change');
    const [resumeSnap, settings] = await Promise.all([
        db().collection('users').doc(uid).collection('resumes').doc(resumeId).get(),
        (0, providers_1.loadAISettings)(uid),
    ]);
    const resume = resumeSnap.data();
    if (!resume)
        throw new https_1.HttpsError('not-found', 'Resume not found');
    if (!settings) {
        throw new https_1.HttpsError('failed-precondition', 'Choose an AI provider and add your API key in Settings');
    }
    const markdown = await (0, providers_1.callAI)(settings, {
        maxTokens: 8192,
        system: 'You are an expert resume editor. Revise the resume below according to the user\'s instruction. ' +
            'Keep everything truthful — never invent employers, roles, dates, or accomplishments. ' +
            'Apply only the requested change plus whatever small adjustments it strictly requires; leave the rest untouched. ' +
            'Output ONLY the complete revised resume markdown, no preamble.',
        user: `Current resume:\n${resume.markdown}\n\nInstruction: ${instruction.trim()}`,
    });
    await resumeSnap.ref.update({ markdown, updatedAt: Date.now() });
    logger.info(`refineResume uid=${uid} provider=${settings.provider} resume=${resumeId}`);
    return { markdown };
});
exports.analyzeSkillGap = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const applicationId = request.data?.applicationId;
    if (!applicationId)
        throw new https_1.HttpsError('invalid-argument', 'applicationId is required');
    const { profile, application, settings } = await loadContext(uid, applicationId);
    const text = await (0, providers_1.callAI)(settings, {
        maxTokens: 4096,
        system: 'You analyze the gap between a candidate\'s current skills and a target job. ' +
            'List only skills that are genuinely missing or weak relative to the job — not skills the candidate already has. ' +
            'Keep the list focused: 3-8 items, most important first. ' +
            'Respond with ONLY valid JSON, no prose and no code fences, matching exactly: ' +
            '{"summary": "<two-sentence fit assessment>", "items": [{"skill": "<name>", "priority": "high|medium|low", "suggestion": "<one concrete way to close this gap>"}]}',
        user: `Candidate skills: ${JSON.stringify(profile.skills ?? [])}\nCandidate title/seniority: ${profile.title} (${profile.seniority})\n\nTarget job:\nTitle: ${application.jobTitle}\nCompany: ${application.company}\nDescription: ${application.description || '(none provided)'}`,
    });
    const gap = (0, providers_1.parseJson)(text);
    const now = Date.now();
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
    });
    logger.info(`analyzeSkillGap uid=${uid} provider=${settings.provider} app=${applicationId} items=${gap.items.length}`);
    return { summary: gap.summary, itemCount: gap.items.length };
});
exports.analyzeRejection = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const applicationId = request.data?.applicationId;
    if (!applicationId)
        throw new https_1.HttpsError('invalid-argument', 'applicationId is required');
    const { profile, application, settings } = await loadContext(uid, applicationId);
    if (application.stage !== 'rejected') {
        throw new https_1.HttpsError('failed-precondition', 'Mark this application as rejected first');
    }
    const reasonText = typeof application.rejection?.reasonText === 'string'
        ? application.rejection.reasonText.trim()
        : '';
    const text = await (0, providers_1.callAI)(settings, {
        maxTokens: 4096,
        system: 'You help a job seeker understand why they were rejected and what to work on. ' +
            (reasonText
                ? 'The candidate has told you what they know about the reason — treat it as ground truth and expand on it into concrete, actionable weaknesses. '
                : 'The candidate does not know why they were rejected — infer the most likely reasons from the gap between their profile and the target job, and hedge appropriately since this is inference, not fact. ') +
            'Keep the list focused: 2-6 items, most important first. Each item should be something the candidate can actually work on. ' +
            'Respond with ONLY valid JSON, no prose and no code fences, matching exactly: ' +
            '{"summary": "<two-sentence assessment>", "items": [{"title": "<short weakness, e.g. \'System design depth\'>", "priority": "high|medium|low", "suggestedActions": ["<one or two concrete next steps>"]}]}',
        user: `Candidate title/seniority: ${profile.title} (${profile.seniority})\nCandidate skills: ${JSON.stringify(profile.skills ?? [])}\n\n` +
            `Job:\nTitle: ${application.jobTitle}\nCompany: ${application.company}\nDescription: ${application.description || '(none provided)'}\n\n` +
            `What the candidate knows about the rejection: ${reasonText || '(nothing — infer from the job/profile gap)'}`,
    });
    const result = (0, providers_1.parseJson)(text);
    const now = Date.now();
    const growthCol = db().collection('users').doc(uid).collection('growthItems');
    const batch = db().batch();
    for (const item of result.items) {
        const ref = growthCol.doc();
        batch.set(ref, {
            title: item.title,
            priority: item.priority,
            suggestedActions: item.suggestedActions ?? [],
            source: 'ai',
            relatedApplicationIds: [applicationId],
            done: false,
            createdAt: now,
            updatedAt: now,
        });
    }
    await batch.commit();
    logger.info(`analyzeRejection uid=${uid} provider=${settings.provider} app=${applicationId} items=${result.items.length}`);
    return { summary: result.summary, itemCount: result.items.length };
});
exports.adviseGrowthItem = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const itemId = request.data?.itemId;
    if (!itemId)
        throw new https_1.HttpsError('invalid-argument', 'itemId is required');
    const [profileSnap, itemSnap, settings] = await Promise.all([
        db().collection('users').doc(uid).get(),
        db().collection('users').doc(uid).collection('growthItems').doc(itemId).get(),
        (0, providers_1.loadAISettings)(uid),
    ]);
    const profile = profileSnap.data();
    const item = itemSnap.data();
    if (!profile)
        throw new https_1.HttpsError('failed-precondition', 'Fill in your profile first');
    if (!item)
        throw new https_1.HttpsError('not-found', 'Growth item not found');
    if (!settings) {
        throw new https_1.HttpsError('failed-precondition', 'Choose an AI provider and add your API key in Settings');
    }
    const text = await (0, providers_1.callAI)(settings, {
        maxTokens: 2048,
        system: 'You give a job seeker concrete, specific advice on a single growth area they are actively working on. ' +
            'If they already wrote their own notes, build on those directly — reference what they said, don\'t repeat generic advice they already know. ' +
            'Keep it practical and specific to their seniority. ' +
            'Respond with ONLY valid JSON, no prose and no code fences, matching exactly: ' +
            '{"suggestedActions": ["<one specific, actionable step>", "..."]}, with 2-4 items.',
        user: `Candidate title/seniority: ${profile.title} (${profile.seniority})\n\n` +
            `Growth area: ${item.title}\nTheir own notes: ${item.notes || '(nothing written yet)'}`,
    });
    const result = (0, providers_1.parseJson)(text);
    await itemSnap.ref.update({ suggestedActions: result.suggestedActions, updatedAt: Date.now() });
    logger.info(`adviseGrowthItem uid=${uid} provider=${settings.provider} item=${itemId}`);
    return { suggestedActions: result.suggestedActions };
});
//# sourceMappingURL=ai.js.map