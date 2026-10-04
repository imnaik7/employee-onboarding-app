// Fictional seed data for demo mode (vite --mode demo). Never used by the live app.
import { DEFAULT_TASKS, computeBreakup } from '../services/onboarding';

export const CANDIDATES_LIST = '8cb9a8c5-8425-40b8-b22c-81c8fc0979a4';
export const TASKS_LIST = 'fa747535-e3fe-4ad9-9cdb-3199bf31f307';
export const INTERVIEWS_LIST = '1875f8d9-d39d-44fa-84f5-29961ae91d5c';

export const DEMO_USER = { Email: 'hr.lead@powerplatformai.demo', Title: 'Navaneet Naik' };

type Row = Record<string, unknown>;

const DAY = 86_400_000;
const iso = (offsetDays: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const dateOnly = (offsetDays: number) => iso(offsetDays).slice(0, 10);

interface Seed {
  name: string;
  email: string;
  position: string;
  department: string;
  status: string;
  ctc?: number;
  start?: number; // days from today
  createdAgo: number; // days ago
  company: string;
  years: number;
  skills: string;
  summary: string;
  location: string;
  manager?: [string, string];
  rounds?: [string, string, number | null, string][]; // round, result, rating, feedback
  nextRound?: [string, number, number]; // round scheduled: dayOffset, hour
  offerSentAgo?: number;
  respondedAgo?: number;
  declineReason?: string;
  tasksDone?: number;
}

const ME: [string, string] = ['Navaneet Naik', DEMO_USER.Email];

const SEEDS: Seed[] = [
  {
    name: 'Arjun Rao', email: 'arjun.rao@example.com', position: 'Solution Architect', department: 'Engineering', status: 'Selected',
    ctc: 3200000, start: 30, createdAgo: 26, company: 'Infosys', years: 9, location: 'Bengaluru, India', manager: ME,
    skills: 'Azure, Power Platform, Solution Design, Dataverse, .NET, Integration, DevOps, TOGAF',
    summary: 'Solution architect with 9 years designing enterprise platforms on Azure and Power Platform. Led 20+ delivery teams across BFSI and retail. Strong in integration architecture and governance.',
    rounds: [['Tech 1', 'Pass', 5, 'Excellent system design depth; clear trade-off thinking.'], ['Tech 2', 'Pass', 4, 'Strong on Dataverse modelling and ALM.'], ['HR', 'Pass', 5, 'Great culture fit, aligned on expectations.']],
  },
  {
    name: 'Priya Nair', email: 'priya.nair@example.com', position: 'Senior React Developer', department: 'Engineering', status: 'Interviewing',
    createdAgo: 12, company: 'Freshworks', years: 6, location: 'Chennai, India', manager: ME,
    skills: 'React, TypeScript, Fluent UI, Node.js, GraphQL, Jest, Accessibility',
    summary: 'Front-end engineer building design systems and high-traffic React apps. Passionate about accessibility and performance.',
    rounds: [['Tech 1', 'Pass', 5, 'Outstanding React fundamentals and hooks knowledge.']],
    nextRound: ['Tech 2', 0, 15],
  },
  {
    name: 'Rohan Gupta', email: 'rohan.gupta@example.com', position: 'Power Platform Developer', department: 'Digital', status: 'Interviewing',
    createdAgo: 9, company: 'TCS', years: 4, location: 'Pune, India', manager: ME,
    skills: 'Power Apps, Power Automate, Dataverse, PCF, Copilot Studio, SharePoint',
    summary: 'Power Platform developer shipping canvas and model-driven apps for HR and finance teams.',
    nextRound: ['Tech 1', -1, 11],
  },
  {
    name: 'Sneha Kulkarni', email: 'sneha.kulkarni@example.com', position: 'Cloud Engineer', department: 'Infrastructure', status: 'Interviewing',
    createdAgo: 18, company: 'Wipro', years: 5, location: 'Hyderabad, India',
    skills: 'Azure, Terraform, Kubernetes, Bicep, Monitoring, Networking',
    summary: 'Cloud engineer automating Azure landing zones with Terraform and Bicep.',
    rounds: [['Tech 1', 'Pass', 4, 'Solid IaC skills.'], ['Tech 2', 'Pass', 4, 'Good troubleshooting under pressure.']],
    nextRound: ['HR', 1, 12],
  },
  {
    name: 'Ananya Iyer', email: 'ananya.iyer@example.com', position: 'Frontend Developer', department: 'Engineering', status: 'Applied',
    createdAgo: 2, company: 'Zoho', years: 3, location: 'Coimbatore, India',
    skills: 'React, CSS, Figma, TypeScript, Storybook', summary: 'UI developer with a strong eye for design and motion.',
  },
  {
    name: 'Karan Mehta', email: 'karan.mehta@example.com', position: 'Data Analyst', department: 'Analytics', status: 'Applied',
    createdAgo: 4, company: 'Mu Sigma', years: 2, location: 'Mumbai, India',
    skills: 'Power BI, SQL, Python, DAX, Excel', summary: 'Analyst turning messy data into crisp Power BI stories.',
  },
  {
    name: 'Meera Joshi', email: 'meera.joshi@example.com', position: 'QA Lead', department: 'Engineering', status: 'Selected',
    ctc: 2100000, start: 21, createdAgo: 22, company: 'Accenture', years: 8, location: 'Pune, India',
    skills: 'Playwright, Test Strategy, Automation, Azure DevOps, API Testing',
    summary: 'QA lead who built automation-first testing practices for three product lines.',
    rounds: [['Tech 1', 'Pass', 4, 'Strong automation strategy.'], ['Tech 2', 'Pass', 4, 'Good leadership examples.'], ['HR', 'Pass', 4, 'Ready to join in 3 weeks.']],
  },
  {
    name: 'Vikram Singh', email: 'vikram.singh@example.com', position: 'DevOps Engineer', department: 'Infrastructure', status: 'Offer Sent',
    ctc: 2400000, start: 18, createdAgo: 34, company: 'HCL', years: 6, location: 'Noida, India', offerSentAgo: 1,
    skills: 'Azure DevOps, GitHub Actions, Docker, Kubernetes, Terraform',
    summary: 'DevOps engineer focused on reliable CI/CD and platform engineering.',
    rounds: [['Tech 1', 'Pass', 4, ''], ['Tech 2', 'Pass', 5, ''], ['HR', 'Pass', 4, '']],
  },
  {
    name: 'Divya Menon', email: 'divya.menon@example.com', position: 'Product Designer', department: 'Design', status: 'Accepted',
    ctc: 2600000, start: 6, createdAgo: 41, company: 'Swiggy', years: 7, location: 'Bengaluru, India', manager: ME, offerSentAgo: 9, respondedAgo: 6, tasksDone: 3,
    skills: 'Figma, Design Systems, UX Research, Prototyping, Accessibility',
    summary: 'Product designer who led the design system for a 40M-user consumer app.',
    rounds: [['Tech 1', 'Pass', 5, ''], ['Tech 2', 'Pass', 5, ''], ['HR', 'Pass', 5, '']],
  },
  {
    name: 'Aditya Sharma', email: 'aditya.sharma@example.com', position: 'Backend Developer', department: 'Engineering', status: 'Accepted',
    ctc: 2200000, start: 2, createdAgo: 48, company: 'Paytm', years: 5, location: 'Gurugram, India', manager: ME, offerSentAgo: 14, respondedAgo: 12, tasksDone: 6,
    skills: '.NET, C#, Azure Functions, SQL, Microservices',
    summary: 'Backend developer building payment-grade APIs on Azure.',
    rounds: [['Tech 1', 'Pass', 4, ''], ['Tech 2', 'Pass', 4, ''], ['HR', 'Pass', 5, '']],
  },
  {
    name: 'Kavya Reddy', email: 'kavya.reddy@example.com', position: 'Business Analyst', department: 'Digital', status: 'Onboarded',
    ctc: 1800000, start: -10, createdAgo: 55, company: 'Deloitte', years: 4, location: 'Hyderabad, India', offerSentAgo: 30, respondedAgo: 28, tasksDone: 7,
    skills: 'Requirements, Process Mapping, Power BI, Agile, Stakeholder Management',
    summary: 'Business analyst bridging HR stakeholders and delivery teams.',
    rounds: [['Tech 1', 'Pass', 4, ''], ['Tech 2', 'Pass', 4, ''], ['HR', 'Pass', 5, '']],
  },
  {
    name: 'Rahul Verma', email: 'rahul.verma@example.com', position: 'Full-stack Developer', department: 'Engineering', status: 'Declined',
    ctc: 2300000, start: 15, createdAgo: 37, company: 'Fabrikam', years: 7, location: 'Pune, India', offerSentAgo: 6, respondedAgo: 3,
    declineReason: 'Accepted a counter-offer from my current employer.',
    skills: 'C#, .NET, React, TypeScript, Azure, SQL Server',
    summary: 'Full-stack developer with 7 years across .NET and React.',
    rounds: [['Tech 1', 'Pass', 4, ''], ['Tech 2', 'Pass', 4, ''], ['HR', 'Pass', 4, '']],
  },
  {
    name: 'Nikhil Bansal', email: 'nikhil.bansal@example.com', position: 'Data Engineer', department: 'Analytics', status: 'Not Selected',
    createdAgo: 20, company: 'Fractal', years: 3, location: 'Mumbai, India',
    skills: 'Spark, Python, Azure Data Factory, SQL', summary: 'Data engineer working on batch pipelines.',
    rounds: [['Tech 1', 'Fail', 2, 'Gaps in data modelling fundamentals.']],
  },
  {
    name: 'Ishita Das', email: 'ishita.das@example.com', position: 'HR Business Partner', department: 'People', status: 'Interviewing',
    createdAgo: 6, company: 'Flipkart', years: 6, location: 'Kolkata, India',
    skills: 'Talent Management, Employee Relations, Workday, HR Analytics',
    summary: 'HRBP partnering with engineering leadership on talent programs.',
    nextRound: ['Tech 1', 2, 14],
  },
];

const INTERVIEWERS = [
  ['Sanjay Patel', 'sanjay.patel@powerplatformai.demo'],
  ['Lakshmi Rao', 'lakshmi.rao@powerplatformai.demo'],
  ['Navaneet Naik', DEMO_USER.Email],
];

export function buildDemoData(): Record<string, Row[]> {
  const candidates: Row[] = [];
  const interviews: Row[] = [];
  const tasks: Row[] = [];
  let ivId = 1;
  let taskId = 1;

  SEEDS.forEach((s, i) => {
    const id = i + 1;
    const breakup = s.ctc ? computeBreakup(s.ctc, s.ctc > 2500000 ? 10 : 0) : null;
    const created = iso(-s.createdAgo, 9 + (i % 6));
    candidates.push({
      ID: id,
      Title: s.name,
      Email: s.email,
      Phone: `+91 98${String(10000000 + i * 7919).slice(0, 8)}`,
      Position: s.position,
      Department: s.department,
      HiringManager: (s.manager ?? ['Lakshmi Rao'])[0],
      ManagerEmail: (s.manager ?? ['', 'lakshmi.rao@powerplatformai.demo'])[1],
      Salary: s.ctc ?? null,
      SalBasic: breakup?.basic ?? 0,
      SalHRA: breakup?.hra ?? 0,
      SalSpecial: breakup?.special ?? 0,
      SalEmployerPF: breakup?.employerPf ?? 0,
      SalGratuity: breakup?.gratuity ?? 0,
      SalVariable: breakup?.variable ?? 0,
      StartDate: s.start !== undefined ? dateOnly(s.start) : null,
      WorkLocation: s.location,
      EmploymentType: { Value: 'Full-time' },
      CurrentCompany: s.company,
      ExperienceYears: s.years,
      Skills: s.skills,
      AiSummary: s.summary,
      ResumeFileName: `${s.name.replace(' ', '_')}_CV.pdf`,
      ResumeUrl: 'https://example.com/resume.pdf',
      Source: i % 3 === 0 ? 'Mobile app' : 'Web app',
      Status: { Value: s.status },
      EnvelopeId: s.offerSentAgo !== undefined ? `demo-${id}-7f3a` : '',
      OfferSentOn: s.offerSentAgo !== undefined ? iso(-s.offerSentAgo, 11) : null,
      RespondedOn: s.respondedAgo !== undefined ? iso(-s.respondedAgo, 16) : null,
      DeclineReason: s.declineReason ?? '',
      SignedOfferUrl: s.respondedAgo !== undefined ? 'https://example.com/offer.pdf' : '',
      Notes: '',
      Created: created,
      Modified: iso(-Math.min(s.respondedAgo ?? s.offerSentAgo ?? s.createdAgo, s.createdAgo) + 0, 12),
    });

    (s.rounds ?? []).forEach(([round, result, rating, feedback], r) => {
      const who = INTERVIEWERS[(i + r) % INTERVIEWERS.length]!;
      interviews.push({
        ID: ivId++, Title: `${round} – ${s.name}`, CandidateId: id, Round: { Value: round },
        InterviewerName: who[0], InterviewerEmail: who[1],
        ScheduledStart: iso(-s.createdAgo + 3 + r * 3, 10 + r), DurationMinutes: 60,
        MeetingLink: 'https://teams.microsoft.com/l/meetup-join/demo', EventId: '',
        Result: { Value: result }, Rating: rating, Feedback: feedback,
      });
    });
    if (s.nextRound) {
      const [round, day, hour] = s.nextRound;
      const who = INTERVIEWERS[(i + 2) % INTERVIEWERS.length]!;
      interviews.push({
        ID: ivId++, Title: `${round} – ${s.name}`, CandidateId: id, Round: { Value: round },
        InterviewerName: who[0], InterviewerEmail: who[1],
        ScheduledStart: iso(day, hour), DurationMinutes: 45,
        MeetingLink: 'https://teams.microsoft.com/l/meetup-join/demo', EventId: '',
        Result: { Value: 'Scheduled' }, Rating: null, Feedback: '',
      });
    }
    if (s.tasksDone !== undefined && s.start !== undefined) {
      DEFAULT_TASKS.forEach((t, k) => {
        tasks.push({
          ID: taskId++, Title: t.title, CandidateId: id, Category: { Value: t.category },
          DueDate: dateOnly(s.start! + t.dayOffset), IsDone: k < (s.tasksDone ?? 0), TaskOwner: t.owner,
        });
      });
    }
  });

  return { [CANDIDATES_LIST]: candidates, [INTERVIEWS_LIST]: interviews, [TASKS_LIST]: tasks };
}

export const DEMO_RESUME = {
  fullName: 'Neha Kapoor',
  email: 'neha.kapoor@example.com',
  phone: '+91 98765 43210',
  currentCompany: 'Microsoft',
  currentTitle: 'Senior Power Platform Consultant',
  experienceYears: 7,
  skills: 'Power Apps, Power Automate, Copilot Studio, Dataverse, AI Builder, Azure, React, TypeScript',
  location: 'Bengaluru, India',
  summary:
    'Senior Power Platform consultant with 7 years delivering enterprise low-code solutions. Built AI-assisted HR and finance automations used by 50,000+ employees. Combines strong architecture skills with hands-on React and Azure experience.',
};

export const DAY_MS = DAY;
