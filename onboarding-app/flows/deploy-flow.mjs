// Creates or updates a solution-aware cloud flow in the EmployeeOnboarding solution and turns it on.
// Usage: node flows/deploy-flow.mjs flows/<flow>.json
// The JSON file holds { name, description, connectors: ["sharepointonline", ...], definition }.
// Each connector maps to the solution connection reference onb_<connector>.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ENV = 'https://orgbc4fa1b4.crm.dynamics.com';
const SOLUTION = 'EmployeeOnboarding';
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const token = execSync(`az account get-access-token --resource ${ENV} --query accessToken -o tsv`, { encoding: 'utf8' }).trim();
async function api(method, path, body) {
  const res = await fetch(`${ENV}/api/data/v9.2/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'MSCRM.SolutionUniqueName': SOLUTION,
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 1500)}`);
  return text ? JSON.parse(text) : null;
}

const connectionReferences = Object.fromEntries(
  spec.connectors.map((c) => [
    `shared_${c}`,
    { runtimeSource: 'embedded', connection: { connectionReferenceLogicalName: `onb_${c}` }, api: { name: `shared_${c}` } },
  ]),
);
const definition = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  contentVersion: '1.0.0.0',
  parameters: {
    $connections: { defaultValue: {}, type: 'Object' },
    $authentication: { defaultValue: {}, type: 'SecureObject' },
  },
  outputs: {},
  ...spec.definition,
};
const clientdata = JSON.stringify({ properties: { connectionReferences, definition }, schemaVersion: '1.0.0.0' });

const existing = await api('GET', `workflows?$select=workflowid,statecode&$filter=name eq '${spec.name.replace(/'/g, "''")}' and category eq 5`);
let id = existing.value[0]?.workflowid;
if (id) {
  // Must be off to update the definition
  if (existing.value[0].statecode === 1) await api('PATCH', `workflows(${id})`, { statecode: 0, statuscode: 1 });
  await api('PATCH', `workflows(${id})`, { clientdata, description: spec.description });
  console.log(`Updated ${spec.name} (${id})`);
} else {
  const created = await api('POST', 'workflows', {
    name: spec.name,
    description: spec.description,
    category: 5,
    type: 1,
    primaryentity: 'none',
    clientdata,
  });
  id = created.workflowid;
  console.log(`Created ${spec.name} (${id})`);
}
await api('PATCH', `workflows(${id})`, { statecode: 1, statuscode: 2 });
console.log(`Activated ${spec.name}`);
