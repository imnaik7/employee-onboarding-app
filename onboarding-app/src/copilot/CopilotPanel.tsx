import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, Spinner, Textarea, Tooltip } from '@fluentui/react-components';
import {
  ArrowClockwise16Regular, Checkmark16Regular, Dismiss20Regular, ErrorCircle16Regular, Send20Filled, Sparkle20Filled, Sparkle24Filled,
} from '@fluentui/react-icons';
import { useAppData } from '../state/appDataContext';
import { errorText, useToast } from '../hooks/useToast';
import type { Navigate, View } from '../state/nav';
import { askAgent } from './agent';
import { buildSnapshot, parseReply, type AgentAction } from './protocol';
import { describe, runAction } from './actions';
import { Markdown } from './Markdown';

interface Msg {
  id: number;
  role: 'user' | 'agent' | 'system';
  text: string;
  actions?: AgentAction[];
  suggestions?: string[];
  error?: boolean;
}

type ActionState = 'idle' | 'running' | 'done' | 'failed';

const STARTERS: Record<string, string[]> = {
  dashboard: ['What needs my attention today?', 'Who is joining in the next 2 weeks?', 'Summarise the hiring pipeline'],
  candidates: ['Which candidates are ready for an offer?', 'Who has been stuck in Interviewing the longest?', 'Compare the Selected candidates'],
  interviews: ['Which interviews are waiting for feedback?', 'What interviews are coming up this week?', 'Average rating by round'],
  onboarding: ['Which joiners have overdue tasks?', 'What is left for next week’s joiners?', 'Who owns the most open tasks?'],
  detail: ['Summarise this candidate', 'Schedule their next round tomorrow at 3 pm', 'Is this candidate ready for an offer?'],
};

const pageName = (v: View) => (v.page === 'detail' || v.page === 'edit' ? 'detail' : v.page === 'new' ? 'candidates' : v.page);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Floating "Ask Copilot" launcher + side panel chat with the Onboarding Copilot agent. */
export function CopilotPanel({ view, onNavigate }: { view: View; onNavigate: Navigate }) {
  const { candidates, interviews, tasks, me, refresh } = useAppData();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(1);

  // Ctrl/⌘+J toggles the panel anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'j' || e.key === 'J') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  const ctx = { candidates: candidates ?? [], interviews, tasks, navigate: onNavigate };
  const focused = view.page === 'detail' || view.page === 'edit' ? candidates?.find((c) => c.id === view.id) : undefined;

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;
      setInput('');
      setMsgs((m) => [...m, { id: seq.current++, role: 'user', text: q }]);
      setBusy(true);
      try {
        const payload = {
          question: q,
          page: { name: pageName(view), ...(focused ? { candidateId: focused.id, candidateName: focused.fullName } : {}) },
          me: me ? { name: me.name, email: me.email } : undefined,
          today: today(),
          data: buildSnapshot(q, candidates ?? [], interviews, tasks),
        };
        const res = await askAgent(JSON.stringify(payload), conversationId);
        if (res.conversationId) setConversationId(res.conversationId);
        const reply = parseReply(res.text);
        setMsgs((m) => [...m, { id: seq.current++, role: 'agent', text: reply.answer, actions: reply.actions, suggestions: reply.suggestions }]);
      } catch (e) {
        setMsgs((m) => [...m, { id: seq.current++, role: 'agent', text: `I couldn't reach Copilot: ${errorText(e)}`, error: true }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, view, focused, me, candidates, interviews, tasks, conversationId],
  );

  const run = async (msgId: number, idx: number, a: AgentAction) => {
    const key = `${msgId}-${idx}`;
    setActionState((s) => ({ ...s, [key]: 'running' }));
    try {
      const result = await runAction(a, ctx);
      setActionState((s) => ({ ...s, [key]: 'done' }));
      if (a.type !== 'openCandidate') {
        setMsgs((m) => [...m, { id: seq.current++, role: 'system', text: result }]);
        notify('Done', result);
        await refresh();
      }
    } catch (e) {
      setActionState((s) => ({ ...s, [key]: 'failed' }));
      notify('Action failed', errorText(e), 'error');
    }
  };

  const reset = () => {
    setMsgs([]);
    setConversationId(undefined);
    setActionState({});
  };

  const starters = STARTERS[pageName(view)] ?? STARTERS.dashboard!;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            className="copilot-fab"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Ask Copilot (Ctrl+J)"
          >
            <Sparkle24Filled />
            <span>Ask Copilot</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            className="copilot-panel"
            role="complementary"
            aria-label="Onboarding Copilot"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          >
            <header className="copilot-head">
              <span className="copilot-logo">
                <Sparkle20Filled />
              </span>
              <div className="grow">
                <strong>Onboarding Copilot</strong>
                <span className="muted small block">{focused ? `Looking at ${focused.fullName}` : 'Knows your candidates, interviews & tasks'}</span>
              </div>
              {msgs.length > 0 && (
                <Tooltip content="New chat" relationship="label">
                  <button className="icon-btn" onClick={reset}>
                    <ArrowClockwise16Regular />
                  </button>
                </Tooltip>
              )}
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close Copilot">
                <Dismiss20Regular />
              </button>
            </header>

            <div className="copilot-msgs" ref={listRef}>
              {msgs.length === 0 && (
                <div className="copilot-hello">
                  <motion.div className="copilot-orb" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
                  <h3>Hi{me?.name ? ` ${me.name.split(' ')[0]}` : ''}, how can I help?</h3>
                  <p className="muted small">Ask about candidates, interviews or onboarding. I can also schedule rounds, send offers and tick tasks — you confirm first.</p>
                  <div className="copilot-starters">
                    {starters.map((s) => (
                      <button key={s} className="copilot-chip" onClick={() => ask(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m) => (
                <motion.div key={m.id} className={`bubble ${m.role} ${m.error ? 'err' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {m.role === 'agent' ? <Markdown text={m.text} /> : m.role === 'system' ? <span><Checkmark16Regular /> {m.text}</span> : m.text}

                  {m.actions && m.actions.length > 0 && (
                    <div className="agent-actions">
                      {m.actions.map((a, i) => {
                        const d = describe(a, ctx);
                        const st = actionState[`${m.id}-${i}`] ?? 'idle';
                        return (
                          <div key={i} className={`agent-action ${st}`}>
                            <div className="grow">
                              <strong>{d.title}</strong>
                              {d.detail && <span className="muted small block">{d.detail}</span>}
                              {d.blocker && (
                                <span className="c-warn small block">
                                  <ErrorCircle16Regular /> {d.blocker}
                                </span>
                              )}
                            </div>
                            <Button
                              size="small"
                              appearance={a.type === 'openCandidate' ? 'secondary' : 'primary'}
                              disabled={!!d.blocker || st === 'running' || st === 'done'}
                              icon={st === 'running' ? <Spinner size="extra-tiny" /> : st === 'done' ? <Checkmark16Regular /> : undefined}
                              onClick={() => run(m.id, i, a)}
                            >
                              {st === 'done' ? 'Done' : a.type === 'openCandidate' ? 'Open' : 'Confirm'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {m.suggestions && m.suggestions.length > 0 && m.id === msgs[msgs.length - 1]?.id && (
                    <div className="copilot-starters">
                      {m.suggestions.map((s) => (
                        <button key={s} className="copilot-chip" onClick={() => ask(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {busy && (
                <div className="bubble agent typing" aria-live="polite">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            <form
              className="copilot-input"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <Textarea
                resize="none"
                rows={2}
                placeholder="Ask anything… (Enter to send)"
                value={input}
                onChange={(_, d) => setInput(d.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
              />
              <Button type="submit" appearance="primary" icon={<Send20Filled />} disabled={!input.trim() || busy} aria-label="Send" />
            </form>
            <p className="copilot-foot muted small">AI-generated answers can be wrong — actions always ask before changing anything.</p>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
