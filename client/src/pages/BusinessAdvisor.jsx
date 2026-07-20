import { useEffect, useState } from 'react';
import { Bot, Clock, Plus, Send } from 'lucide-react';
import apiClient from '../api/axios';
import aiAdvisorClient from '../api/aiAdvisor';
import AdvisorTranscript from '../components/advisor/AdvisorTranscript';
import {
  AdvisorHeaderHero,
  AdvisorHistoryDrawer,
  AdvisorSidebarAside,
  AdvisorTranscriptHeader,
  AdvisorChatInput,
} from '../components/advisor/AdvisorSubComponents';
import useAuthStore from '../store/authStore';

const SESSION_STORAGE_KEY = 'nexcart:advisorSessionId';

const generateSessionId = () => {
  return globalThis.crypto?.randomUUID?.() || `advisor-${Date.now()}`;
};

const getSessionId = () => {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const nextSessionId = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
};

export default function BusinessAdvisor() {
  const user = useAuthStore((state) => state.user);
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

  const [sessionId, setSessionId] = useState(() => getSessionId());
  const [sessions, setSessions] = useState(() => {
    const stored = localStorage.getItem('nexcart:advisorSessions:v1');
    if (!stored) {
      const oldStored = localStorage.getItem('nexcart:advisorSessions');
      if (oldStored) {
        localStorage.removeItem('nexcart:advisorSessions');
        localStorage.setItem('nexcart:advisorSessions:v1', oldStored);
        try {
          return JSON.parse(oldStored);
        } catch (e) {
          console.error(e);
        }
      }
      return [];
    }

    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

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
    localStorage.setItem('nexcart:advisorSessions:v1', JSON.stringify(sessions));
  }, [sessions]);

  const updateSessions = (updater) => {
    setSessions((currentSessions) => {
      return typeof updater === 'function' ? updater(currentSessions) : updater;
    });
  };

  const ensureSessionRecorded = (firstMessageText, targetSessionId = sessionId) => {
    const title = firstMessageText.slice(0, 45) + (firstMessageText.length > 45 ? '...' : '');

    updateSessions((currentSessions) => {
      if (currentSessions.some((session) => session.id === targetSessionId)) {
        return currentSessions;
      }

      return [
        {
          id: targetSessionId,
          title,
          timestamp: Date.now(),
        },
        ...currentSessions,
      ];
    });
  };

  const handleNewChat = () => {
    const nextSessionId = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
    setSessionId(nextSessionId);
    setMessages([]);
  };

  const handleDeleteSession = (idToDelete) => {
    updateSessions((currentSessions) =>
      currentSessions.filter((session) => session.id !== idToDelete)
    );

    if (idToDelete === sessionId) {
      handleNewChat();
    }
  };

  const handleSessionKeyDown = (event, nextSessionId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSessionId(nextSessionId);
      localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
      setShowHistory(false);
    }
  };

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

    ensureSessionRecorded(nextQuery);

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

  return (
    <div className="space-y-6 text-white">
      <AdvisorHeaderHero
        user={user}
        isLoadingContext={isLoadingContext}
        isIngesting={isIngesting}
        ingestMessage={ingestMessage}
        fetchBusinessContext={fetchBusinessContext}
        handleIngest={handleIngest}
      />

      {error && !messages.length ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative flex flex-col overflow-hidden rounded-[28px] border border-zinc-800 bg-[#101010] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <AdvisorHistoryDrawer
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            sessions={sessions}
            sessionId={sessionId}
            setSessionId={setSessionId}
            handleSessionKeyDown={handleSessionKeyDown}
            handleDeleteSession={handleDeleteSession}
          />

          <AdvisorTranscriptHeader
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            handleNewChat={handleNewChat}
          />

          <AdvisorTranscript
            messages={messages}
            isLoadingHistory={isLoadingHistory}
            isSending={isSending}
            historyError={historyError}
          />

          <AdvisorChatInput
            query={query}
            setQuery={setQuery}
            handleSubmit={handleSubmit}
            isSending={isSending}
            isLoadingContext={isLoadingContext}
            businessContext={businessContext}
          />
        </div>

        <AdvisorSidebarAside businessContext={businessContext} setQuery={setQuery} />
      </section>
    </div>
  );
}
