// Transport to the Onboarding Copilot agent through the Microsoft Copilot Studio connector.
// ExecuteCopilotAsyncV2 ("Execute agent and wait") is the only operation that returns the agent's reply
// synchronously; its generated return type is void, so the payload is read defensively.
import { MicrosoftCopilotStudioService } from '../generated/services/MicrosoftCopilotStudioService';

export const AGENT_NAME = 'onb_onboardingCopilot';

type Loose = Record<string, unknown>;
const pick = (o: Loose, ...keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null);

export async function askAgent(message: string, conversationId?: string): Promise<{ text: string; conversationId?: string }> {
  const res = await MicrosoftCopilotStudioService.ExecuteCopilotAsyncV2(
    AGENT_NAME,
    { message, notificationUrl: 'https://notificationurlplaceholder' }, // required by the API, unused
    conversationId,
  );
  if (!res.success) throw new Error((res as { error?: { message?: string } }).error?.message ?? 'Copilot did not respond');

  const data = ((res as unknown as { data?: unknown }).data ?? {}) as Loose;
  const responses = pick(data, 'responses', 'Responses');
  const list = Array.isArray(responses) ? responses.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))) : [];
  const last = pick(data, 'lastResponse', 'LastResponse');
  // The agent answers with one JSON object; if it sent several messages, the last complete one wins
  const text = (list.length ? list[list.length - 1] : typeof last === 'string' ? last : '') ?? '';
  const conv = pick(data, 'conversationId', 'ConversationId', 'conversationID');
  return { text, conversationId: typeof conv === 'string' ? conv : conversationId };
}
