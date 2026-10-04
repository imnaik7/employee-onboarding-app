// Creates (or updates) the "Onboarding Copilot" Copilot Studio agent in the EmployeeOnboarding solution,
// sets its instructions + SharePoint knowledge, and publishes it. Idempotent — re-run after editing INSTRUCTIONS.
// Usage: az login  &&  node onboarding-app/copilot/create-agent.mjs
import { api, log } from '../../retail-dataverse/lib.mjs';

const SOLUTION = 'EmployeeOnboarding';
const SCHEMA = 'onb_onboardingCopilot';
const NAME = 'Onboarding Copilot';
const SITE = 'https://imnaik.sharepoint.com/sites/My-SP-Dev';
const call = (method, path, body, extra = {}) => api(method, path, body, { solution: SOLUTION, ...extra });
const one = async (path) => (await api('GET', path, undefined, { solution: null })).value?.[0];

const INSTRUCTIONS = `# Role
You are Onboarding Copilot, the HR assistant inside the "Power Platform AI Solution" Employee Onboarding app. You help HR, interviewers and hiring managers with candidates, interviews, offers and new-joiner onboarding.

# Input format
Every user message is a JSON object with these fields:
- question: the user's request
- page: the screen the user is on (name, and candidateId when a candidate is open)
- me: the signed-in user (name, email)
- today: today's date, YYYY-MM-DD
- data: the live snapshot the user is allowed to see, with candidates, interviews and tasks arrays. Treat it as the source of truth for people, statuses, dates and ratings.
If page.candidateId is set, "this candidate" or "them" means that candidate.
For company policy questions (leave, probation, benefits, onboarding process), use your SharePoint knowledge.

# Output format
ALWAYS reply with ONE JSON object and nothing else (no code fences, no text before or after). Fields:
- answer: markdown text, concise, bullet lists, **bold** names
- actions: array of zero or more action objects (only when the user asks to DO something; the app asks the user to confirm before running them)
- suggestions: array of up to 3 short follow-up questions

Action object shapes (every action also has a short "label" for its button):
- type "openCandidate" with candidateId (number)
- type "scheduleInterview" with candidateId, round ("Tech 1", "Tech 2" or "HR"), start ("YYYY-MM-DDTHH:mm"), durationMins (number), interviewerEmail
- type "sendOffer" with candidateId
- type "completeTask" with taskId (number)

# Rules
- Never invent candidates, IDs, emails or dates that are not in data. If something is missing, say so and ask.
- Interview rounds go in order Tech 1 → Tech 2 → HR. Only propose sendOffer for candidates with status "Selected".
- Salary/CTC figures are confidential: only mention them if the question explicitly asks about compensation.
- Times are in the user's local time; "tomorrow" etc. are relative to "today".
- Keep answers short (under 150 words) unless asked for a summary or report.`;

const configuration = {
  $kind: 'BotConfiguration',
  settings: { GenerativeActionsEnabled: true },
  isAgentConnectable: true,
  gPTSettings: { $kind: 'GPTSettings', defaultSchemaName: `${SCHEMA}.gpt.default` },
  aISettings: { $kind: 'AISettings', useModelKnowledge: true, isFileAnalysisEnabled: true, isSemanticSearchEnabled: true, optInUseLatestModels: false },
  recognizer: { $kind: 'GenerativeAIRecognizer' },
};

// 1) Agent record + provisioning (creates the runtime registration and system topics)
let bot = await one(`bots?$select=botid,statecode&$filter=schemaname eq '${SCHEMA}'`);
if (!bot) {
  const r = await call('POST', 'bots', {
    name: NAME, schemaname: SCHEMA, language: 1033, template: 'default-2.1.0', authenticationmode: 2, accesscontrolpolicy: 1,
    authenticationtrigger: 0, runtimeprovider: 0, configuration: JSON.stringify(configuration),
  }, { headers: { Prefer: 'return=representation' } });
  bot = { botid: r.botid };
  log(`+ agent ${NAME} (${bot.botid})`);
  await call('POST', `bots(${bot.botid})/Microsoft.Dynamics.CRM.PvaProvision`, {});
  log('  provisioned');
} else {
  await call('PATCH', `bots(${bot.botid})`, { configuration: JSON.stringify(configuration) });
  log(`= agent exists (${bot.botid})`);
}

// 2) Components: instructions (GPT) + SharePoint knowledge
async function upsertComponent(schemaname, componenttype, name, data) {
  const existing = await one(`botcomponents?$select=botcomponentid&$filter=schemaname eq '${schemaname}'`);
  if (existing) {
    await call('PATCH', `botcomponents(${existing.botcomponentid})`, { data, name });
    log(`  ~ ${schemaname}`);
  } else {
    await call('POST', 'botcomponents', { schemaname, componenttype, name, data, 'parentbotid@odata.bind': `/bots(${bot.botid})` });
    log(`  + ${schemaname}`);
  }
}

const indent = (s) => s.split('\n').map((l) => (l ? `  ${l}` : '')).join('\n');
await upsertComponent(`${SCHEMA}.gpt.default`, 15, NAME, `kind: GptComponentMetadata\ninstructions: |-\n${indent(INSTRUCTIONS)}\n`);
await upsertComponent(
  `${SCHEMA}.knowledge.hrsite`, 16, 'HR SharePoint site',
  `kind: KnowledgeSourceConfiguration\nsource:\n  kind: SharePointSearchSource\n  site: ${SITE}\n`,
);

// 3) Publish so the Copilot Studio connector (and Teams) can reach it
await call('POST', `bots(${bot.botid})/Microsoft.Dynamics.CRM.PvaPublish`, {});
log('  publish requested');
// Publishing runs asynchronously; it is finished when publishedon moves forward
const startedAt = new Date().toISOString();
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 15_000));
  const b = await one(`bots?$select=publishedon&$filter=botid eq ${bot.botid}`);
  log(`  waiting… last published ${b.publishedon ?? 'never'}`);
  if (b.publishedon && b.publishedon >= startedAt.slice(0, 19)) break;
}
const done = await one(`bots?$select=publishedon,schemaname&$filter=botid eq ${bot.botid}`);
log(`agent ${done.schemaname} published on ${done.publishedon ?? '(pending)'}`);
