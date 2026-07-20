import {
  BrainCircuit,
  RefreshCcw,
  Loader2,
  Database,
  X,
  MessageSquare,
  Trash2,
  TriangleAlert,
  Bot,
  Clock,
  Plus,
  Send,
} from 'lucide-react';
import PromptSelector from './PromptSelector';

const SESSION_STORAGE_KEY = 'nexcart:advisorSessionId';

export function AdvisorTranscriptHeader({ showHistory, setShowHistory, handleNewChat }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-300">
          Advisor Transcript
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Session-linked conversation memory stays attached to this browser session.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className={`rounded-full p-2 transition ${
            showHistory
              ? 'bg-amber-400/20 text-amber-300'
              : 'text-zinc-400 hover:bg-zinc-850 hover:text-white'
          }`}
          title="Conversation History"
        >
          <Clock className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleNewChat}
          className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-850 hover:text-white"
          title="New Chat"
        >
          <Plus className="h-5 w-5" />
        </button>
        <span className="w-px h-5 bg-zinc-800 mx-1" />
        <Bot className="h-5 w-5 text-amber-400" />
      </div>
    </div>
  );
}

export function AdvisorChatInput({
  query,
  setQuery,
  handleSubmit,
  isSending,
  isLoadingContext,
  businessContext,
}) {
  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-800 bg-zinc-950/30 p-4">
      <div className="relative flex flex-col rounded-[22px] border border-zinc-800 bg-zinc-950/80 p-2.5 focus-within:border-amber-500/40 transition-all">
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          aria-label="Ask the business advisor a question"
          placeholder="Ask about inventory pressure, retention risk, performance, or strategy..."
          className="w-full resize-none bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 px-1">
          <span className="text-[11px] text-zinc-500 select-none">
            Press Enter to send, Shift+Enter for new line
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSending || isLoadingContext || !query.trim() || !businessContext}
            className="inline-flex h-8 items-center justify-center rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    </form>
  );
}

export function AdvisorHeaderHero({
  user,
  isLoadingContext,
  isIngesting,
  ingestMessage,
  fetchBusinessContext,
  handleIngest,
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.24),_transparent_35%),linear-gradient(135deg,_#18181b_0%,_#09090b_52%,_#111827_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),transparent)] blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
            <BrainCircuit className="mr-2 h-4 w-4" />
            Metrics-First Advisor
          </div>
          <div>
            <h1 className="font-serif text-3xl font-black tracking-tight text-white sm:text-4xl">
              NexCart Business Advisor
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
              Ask about sales health, inventory pressure, retention risk, or operational strategy.
              The advisor starts with your live business metrics and only reaches for the knowledge
              base when external guidance is actually needed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fetchBusinessContext({ current: true })}
            disabled={isLoadingContext}
            className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoadingContext ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
          {user?.role === 'SUPER_ADMIN' ? (
            <button
              type="button"
              onClick={handleIngest}
              disabled={isIngesting}
              className="inline-flex items-center rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isIngesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Ingest Documents
            </button>
          ) : null}
        </div>
      </div>

      {ingestMessage ? (
        <div className="relative mt-5 rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-3 text-sm text-amber-100">
          {ingestMessage}
        </div>
      ) : null}
    </section>
  );
}

export function AdvisorHistoryDrawer({
  showHistory,
  setShowHistory,
  sessions,
  sessionId,
  setSessionId,
  handleSessionKeyDown,
  handleDeleteSession,
}) {
  return (
    <div
      className={`absolute inset-y-0 left-0 z-20 w-72 border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-md transition-transform duration-300 ease-in-out ${
        showHistory ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-300">
          Chat History
        </span>
        <button
          type="button"
          aria-label="Close chat history panel"
          onClick={() => setShowHistory(false)}
          className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">No recent conversations</div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="relative group w-full">
              <button
                type="button"
                className={`flex items-center justify-between rounded-xl p-3 text-left text-sm transition-all cursor-pointer w-full ${
                  s.id === sessionId
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    : 'border border-transparent text-zinc-300 hover:bg-zinc-900'
                }`}
                onClick={() => {
                  setSessionId(s.id);
                  localStorage.setItem(SESSION_STORAGE_KEY, s.id);
                  setShowHistory(false);
                }}
                onKeyDown={(event) => handleSessionKeyDown(event, s.id)}
              >
                <div className="flex items-center overflow-hidden pr-6">
                  <MessageSquare className="mr-2 h-4 w-4 shrink-0 text-zinc-500 group-hover:text-amber-400" />
                  <span className="truncate font-medium">{s.title}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(s.id);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-opacity cursor-pointer z-10"
                aria-label="Delete session"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdvisorSidebarAside({ businessContext, setQuery }) {
  return (
    <aside className="space-y-6">
      <div className="rounded-[28px] border border-zinc-700 bg-[#141414] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-zinc-300">
          Metric Snapshot
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-200">
          {businessContext?.generatedAt
            ? `Metrics were generated at ${new Date(businessContext.generatedAt).toLocaleString()}.`
            : 'Metrics will appear here once the advisor context loads.'}
        </p>
        <div className="mt-4 rounded-[20px] border border-zinc-700 bg-zinc-900/50 p-4 text-sm text-zinc-300">
          The advisor prioritizes live business metrics first, rule-based insights second, and
          document knowledge only when the question needs it.
        </div>
      </div>

      <PromptSelector onSelectPrompt={(prompt) => setQuery(prompt)} />

      <div className="rounded-[28px] border border-zinc-700 bg-[#141414] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
            <TriangleAlert className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-zinc-200">Guardrails</p>
        </div>
        <p className="mt-4 text-sm leading-7 text-zinc-300">
          The advisor will not fabricate data. If revenue, inventory, customer, or document facts
          are unavailable, it says so directly rather than guessing.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Grounded in live metrics first
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Knowledge base used only when needed
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Refuses to hallucinate missing data
          </div>
        </div>
      </div>
    </aside>
  );
}
