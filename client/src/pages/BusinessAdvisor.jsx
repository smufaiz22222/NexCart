import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  BrainCircuit,
  Database,
  Loader2,
  RefreshCcw,
  Send,
  TriangleAlert,
} from 'lucide-react';
import apiClient from '../api/axios';
import aiAdvisorClient from '../api/aiAdvisor';
import MetricCard from '../components/advisor/MetricCard';
import PromptSelector from '../components/advisor/PromptSelector';
import AdvisorTranscript from '../components/advisor/AdvisorTranscript';

const SESSION_STORAGE_KEY = 'nexcart:advisorSessionId';

const getSessionId = () => {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const nextSessionId = globalThis.crypto?.randomUUID?.() || `advisor-${Date.now()}`;
  localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
};

const formatMetricValue = (key, value) => {
  if (key === 'monthlySales') return `Rs. ${Number(value || 0).toLocaleString()}`;
  if (key === 'repeatCustomerRate') return `${Number(value || 0).toFixed(1)}%`;
  return value ?? 'N/A';
};

export default function BusinessAdvisor() {
  const [businessContext, setBusinessContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [ingestMessage, setIngestMessage] = useState('');

  const sessionId = useMemo(() => getSessionId(), []);

  const fetchBusinessContext = async (active) => {
    try {
      setIsLoadingContext(true);
      const response = await apiClient.get('/stats/advisor-context');
      if (active.current) {
        setBusinessContext(response.data);
        setError('');
      }
    } catch (fetchError) {
      if (active.current) {
        setError(fetchError.response?.data?.error || 'Failed to load advisor business context.');
      }
    } finally {
      if (active.current) {
        setIsLoadingContext(false);
      }
    }
  };

  useEffect(() => {
    const active = { current: true };
    fetchBusinessContext(active);
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const response = await aiAdvisorClient.get('/history', {
          params: { sessionId },
        });
        if (active) {
          setMessages(response.data.messages || []);
          setHistoryError('');
        }
      } catch (fetchError) {
        if (active) {
          setHistoryError(
            fetchError.response?.data?.detail || 'Failed to load previous advisor conversation.'
          );
        }
      } finally {
        if (active) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery || !businessContext || isSending) return;

    const userMessage = { role: 'user', text: nextQuery };
    setMessages((current) => [...current, userMessage]);
    setQuery('');
    setIsSending(true);
    setError('');

    try {
      const response = await aiAdvisorClient.post('/chat', {
        query: nextQuery,
        sessionId,
        businessContext,
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: response.data.answer,
          sources: response.data.sources || [],
        },
      ]);
    } catch (sendError) {
      const message =
        sendError.response?.data?.detail || 'The advisor could not generate a response.';
      setError(message);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: message,
          sources: [],
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleIngest = async () => {
    try {
      setIsIngesting(true);
      setIngestMessage('');
      const response = await aiAdvisorClient.post('/ingest');
      setIngestMessage(response.data.message || 'Knowledge base ingestion complete.');
    } catch (ingestError) {
      setIngestMessage(ingestError.response?.data?.detail || 'Knowledge base ingestion failed.');
    } finally {
      setIsIngesting(false);
    }
  };

  const metricCards = [
    { key: 'monthlySales', label: 'Current Month Sales' },
    { key: 'lowStockProducts', label: 'Low Stock Products' },
    { key: 'unsoldInventory', label: 'Unsold Inventory' },
    { key: 'repeatCustomerRate', label: 'Repeat Customer Rate' },
    { key: 'topSellingCategory', label: 'Top Category' },
    { key: 'totalProducts', label: 'Total Products' },
  ];

  return (
    <div className="space-y-6 text-white">
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
                The advisor starts with your live business metrics and only reaches for the
                knowledge base when external guidance is actually needed.
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
          </div>
        </div>

        {ingestMessage ? (
          <div className="relative mt-5 rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-3 text-sm text-amber-100">
            {ingestMessage}
          </div>
        ) : null}
      </section>

      {error && !messages.length ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            value={formatMetricValue(card.key, businessContext?.[card.key])}
            isLoading={isLoadingContext}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[#101010] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">
                Advisor Transcript
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Session-linked conversation memory stays attached to this browser session.
              </p>
            </div>
            <Bot className="h-5 w-5 text-amber-400" />
          </div>

          <AdvisorTranscript
            messages={messages}
            isLoadingHistory={isLoadingHistory}
            isSending={isSending}
            historyError={historyError}
          />

          <form onSubmit={handleSubmit} className="border-t border-zinc-800 bg-black/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={3}
                placeholder="Ask about inventory pressure, retention risk, performance, or strategy..."
                className="min-h-[104px] flex-1 rounded-[22px] border border-zinc-700 bg-zinc-950/90 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/50"
              />
              <button
                type="submit"
                disabled={isSending || isLoadingContext || !query.trim() || !businessContext}
                className="inline-flex items-center justify-center rounded-[22px] bg-amber-400 px-5 py-4 text-sm font-black text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-40"
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-zinc-800 bg-[#141414] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-zinc-500">
              Metric Snapshot
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {businessContext?.generatedAt
                ? `Metrics were generated at ${new Date(businessContext.generatedAt).toLocaleString()}.`
                : 'Metrics will appear here once the advisor context loads.'}
            </p>
            <div className="mt-4 rounded-[20px] border border-zinc-800 bg-black/25 p-4 text-sm text-zinc-400">
              The advisor prioritizes live business metrics first, rule-based insights second, and
              document knowledge only when the question needs it.
            </div>
          </div>

          <PromptSelector onSelectPrompt={(prompt) => setQuery(prompt)} />

          <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
            <div className="flex items-start">
              <TriangleAlert className="mt-0.5 h-5 w-5 text-red-300" />
              <div className="ml-3">
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-200">
                  Guardrails
                </p>
                <p className="mt-3 text-sm leading-6 text-red-100/90">
                  The advisor will refuse to invent unavailable revenue, inventory, customer, or
                  document facts. If the knowledge base is weak or missing, it will say so directly.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
