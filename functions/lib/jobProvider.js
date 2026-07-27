"use strict";
/**
 * Job source abstraction. `MockJobProvider` is the only implementation for now;
 * swap in a real aggregator (JSearch/Adzuna) later without touching callers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockJobProvider = void 0;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const TEMPLATES = [
    { title: 'Senior Frontend Engineer', company: 'Wix', location: 'Tel Aviv', remote: 'hybrid', salaryMin: 42000, stack: ['React', 'TypeScript', 'CSS'], blurb: 'Own core editor surfaces used by millions of site builders.' },
    { title: 'Frontend Engineer', company: 'monday.com', location: 'Tel Aviv', remote: 'hybrid', salaryMin: 35000, stack: ['React', 'TypeScript', 'GraphQL'], blurb: 'Build board views and dashboard widgets on the core platform.' },
    { title: 'Senior Full-Stack Developer', company: 'Lemonade', location: 'Tel Aviv', remote: 'hybrid', salaryMin: 45000, stack: ['React', 'Node.js', 'PostgreSQL'], blurb: 'Ship customer-facing insurance flows end to end.' },
    { title: 'Full-Stack Engineer', company: 'Fiverr', location: 'Tel Aviv', remote: 'onsite', salaryMin: 38000, stack: ['React', 'Node.js', 'Redis'], blurb: 'Marketplace checkout and seller tooling.' },
    { title: 'Senior Frontend Engineer', company: 'Gong', location: 'Ramat Gan', remote: 'hybrid', salaryMin: 44000, stack: ['React', 'TypeScript', 'Zustand'], blurb: 'Revenue-intelligence dashboards and call-review UI.' },
    { title: 'Staff Frontend Engineer', company: 'Snyk', location: 'Remote (EMEA)', remote: 'remote', salaryMin: 50000, stack: ['React', 'TypeScript', 'Design systems'], blurb: 'Lead the design-system effort across product squads.' },
    { title: 'Senior Backend Engineer', company: 'Riskified', location: 'Tel Aviv', remote: 'hybrid', salaryMin: 43000, stack: ['Node.js', 'Kafka', 'PostgreSQL'], blurb: 'Fraud-decisioning pipeline, high-throughput services.' },
    { title: 'Backend Engineer', company: 'AppsFlyer', location: 'Herzliya', remote: 'hybrid', salaryMin: 37000, stack: ['Go', 'Kafka', 'ClickHouse'], blurb: 'Attribution ingestion at billions of events per day.' },
    { title: 'Data Scientist', company: 'Riskified', location: 'Tel Aviv', remote: 'hybrid', salaryMin: 40000, stack: ['Python', 'scikit-learn', 'SQL'], blurb: 'Fraud models with direct revenue impact.' },
    { title: 'Senior Data Scientist', company: 'Lightricks', location: 'Jerusalem', remote: 'hybrid', salaryMin: 46000, stack: ['Python', 'PyTorch', 'Computer Vision'], blurb: 'Generative-media models for creative tools.' },
    { title: 'Machine Learning Engineer', company: 'Mobileye', location: 'Jerusalem', remote: 'onsite', salaryMin: 45000, stack: ['Python', 'C++', 'TensorFlow'], blurb: 'Perception models for autonomous driving.' },
    { title: 'Full-Stack Developer', company: 'Melio', location: 'Tel Aviv', remote: 'hybrid', salaryMin: 36000, stack: ['React', 'Node.js', 'TypeScript'], blurb: 'B2B payment flows for small businesses.' },
    { title: 'Senior Frontend Engineer', company: 'Papaya Global', location: 'Remote (IL)', remote: 'remote', salaryMin: 41000, stack: ['React', 'TypeScript', 'Micro-frontends'], blurb: 'Payroll platform UI across 160 countries.' },
    { title: 'Frontend Engineer', company: 'Similarweb', location: 'Givatayim', remote: 'hybrid', salaryMin: 34000, stack: ['React', 'TypeScript', 'D3'], blurb: 'Data-heavy analytics visualizations.' },
];
const roleMatches = (jobTitle, roles) => {
    if (roles.length === 0)
        return true;
    const title = jobTitle.toLowerCase();
    return roles.some((role) => {
        const words = role.toLowerCase().split(/\s+/).filter((w) => !['senior', 'junior', 'staff', 'principal', 'lead'].includes(w));
        return words.every((w) => title.includes(w));
    });
};
const locationMatches = (job, locations) => {
    if (locations.length === 0)
        return true;
    const loc = job.location.toLowerCase();
    return locations.some((l) => {
        const wanted = l.toLowerCase();
        if (wanted === 'remote')
            return job.remote === 'remote';
        return loc.includes(wanted);
    });
};
class MockJobProvider {
    async search(criteria) {
        return TEMPLATES.filter((t) => {
            if (!roleMatches(t.title, criteria.roles))
                return false;
            if (!locationMatches(t, criteria.locations))
                return false;
            if (criteria.remote !== 'any' && t.remote !== criteria.remote)
                return false;
            if (criteria.minSalary && t.salaryMin < criteria.minSalary)
                return false;
            return true;
        }).map((t) => {
            const id = slug(`${t.company}-${t.title}`);
            return {
                id,
                title: t.title,
                company: t.company,
                location: t.location,
                remote: t.remote,
                url: `https://www.linkedin.com/jobs/view/mock-${id}`,
                description: `${t.blurb}\n\nStack: ${t.stack.join(', ')}.`,
                salaryMin: t.salaryMin,
                source: 'mock',
            };
        });
    }
}
exports.MockJobProvider = MockJobProvider;
//# sourceMappingURL=jobProvider.js.map