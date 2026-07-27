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
exports.fetchJobsNow = exports.dailyJobFetch = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const jobProvider_1 = require("./jobProvider");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const provider = new jobProvider_1.MockJobProvider();
async function fetchMatchesForUser(uid, criteria) {
    const jobs = await provider.search(criteria);
    let newMatches = 0;
    for (const job of jobs) {
        await db.collection('jobs').doc(job.id).set({ ...job, fetchedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        const matchRef = db.collection('users').doc(uid).collection('matches').doc(job.id);
        const [matchSnap, existingApp] = await Promise.all([
            matchRef.get(),
            db.collection('users').doc(uid).collection('applications')
                .where('company', '==', job.company).where('jobTitle', '==', job.title).limit(1).get(),
        ]);
        if (matchSnap.exists || !existingApp.empty)
            continue;
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
        });
        newMatches++;
    }
    return { found: jobs.length, newMatches };
}
function criteriaFromProfile(profile) {
    const prefs = profile?.preferences;
    if (!prefs || (!prefs.roles?.length && !prefs.locations?.length))
        return null;
    return {
        roles: prefs.roles ?? [],
        locations: prefs.locations ?? [],
        remote: prefs.remote ?? 'any',
        minSalary: prefs.minSalary ?? undefined,
    };
}
exports.dailyJobFetch = (0, scheduler_1.onSchedule)({ schedule: 'every day 06:00', timeZone: 'Asia/Jerusalem' }, async () => {
    const users = await db.collection('users').get();
    for (const userDoc of users.docs) {
        const criteria = criteriaFromProfile(userDoc.data());
        if (!criteria)
            continue;
        const result = await fetchMatchesForUser(userDoc.id, criteria);
        logger.info(`dailyJobFetch uid=${userDoc.id} found=${result.found} new=${result.newMatches}`);
    }
});
exports.fetchJobsNow = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const profile = (await db.collection('users').doc(uid).get()).data();
    const criteria = criteriaFromProfile(profile);
    if (!criteria) {
        throw new https_1.HttpsError('failed-precondition', 'Set target roles or locations in your profile first');
    }
    const result = await fetchMatchesForUser(uid, criteria);
    logger.info(`fetchJobsNow uid=${uid} found=${result.found} new=${result.newMatches}`);
    return result;
});
//# sourceMappingURL=index.js.map