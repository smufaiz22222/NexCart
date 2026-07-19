import { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  Loader2,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  TriangleAlert,
  AlertOctagon,
  Check,
  Copy,
  User,
} from 'lucide-react';

const LOADING_STEPS = [
  'Classifying query domain & validating guardrails',
  'Analyzing real-time metrics context (revenue, stock pressure, retention)',
  'Searching vector database (RAG) for matching knowledge docs',
  'Synthesizing recommendation and generating response text',
];

// ==========================================
// Custom Markdown/Rich Text Parser Components
// ==========================================

const InlineText = ({ text }) => {
  if (!text) return null;
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const segments = text.split(regex);

  return (
    <>
      {segments.map((seg, pos) => {
        const key = `inline-${pos}-${seg}`;
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return (
            <strong key={key} className="font-extrabold text-white">
              {seg.slice(2, -2)}
            </strong>
          );
        } else if (seg.startsWith('*') && seg.endsWith('*')) {
          return (
            <em key={key} className="italic text-zinc-100">
              {seg.slice(1, -1)}
            </em>
          );
        } else if (seg.startsWith('`') && seg.endsWith('`')) {
          return (
            <code
              key={key}
              className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-amber-400"
            >
              {seg.slice(1, -1)}
            </code>
          );
        }
        return seg;
      })}
    </>
  );
};

const CodeBlock = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-sans">
      <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-900/60 px-4 py-2 text-xs font-mono text-zinc-400">
        <span className="uppercase text-[10px] font-bold tracking-wider">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const AlertCallout = ({ type, content }) => {
  let styleClass;
  let IconComponent;
  let title;

  switch (type) {
    case 'TIP':
      styleClass = 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200';
      IconComponent = Sparkles;
      title = 'Tip';
      break;
    case 'WARNING':
      styleClass = 'border-amber-500/20 bg-amber-500/5 text-amber-200';
      IconComponent = TriangleAlert;
      title = 'Warning';
      break;
    case 'CAUTION':
      styleClass = 'border-red-500/20 bg-red-500/5 text-red-200';
      IconComponent = AlertOctagon;
      title = 'Caution';
      break;
    case 'NOTE':
    default:
      styleClass = 'border-blue-500/20 bg-blue-500/5 text-blue-200';
      IconComponent = Info;
      title = 'Note';
      break;
  }

  return (
    <div className={`my-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${styleClass}`}>
      <IconComponent className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-bold uppercase tracking-wider text-[10px]">{title}</p>
        <div className="mt-1 whitespace-pre-line leading-relaxed">{content}</div>
      </div>
    </div>
  );
};

const TextBlock = ({ text }) => {
  const lines = text.split('\n');
  const elements = [];
  let currentList = null; // { type: 'ul'|'ol', items: [] }
  let currentAlert = null; // { type: 'NOTE'|'TIP'|'WARNING'|'CAUTION', lines: [] }

  const flushList = (key) => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const listClasses =
      currentList.type === 'ul'
        ? 'list-disc pl-6 space-y-1.5 my-2 text-zinc-300'
        : 'list-decimal pl-6 space-y-1.5 my-2 text-zinc-300';
    elements.push(
      <ListTag key={key} className={listClasses}>
        {currentList.items.map((item, pos) => (
          <li key={`list-item-${pos}-${item}`}>
            <InlineText text={item} />
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  const flushAlert = (key) => {
    if (!currentAlert) return;
    elements.push(
      <AlertCallout key={key} type={currentAlert.type} content={currentAlert.lines.join('\n')} />
    );
    currentAlert = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `line-${i}`;

    // Blockquote & Alerts
    if (line.startsWith('>')) {
      flushList(`flush-list-before-alert-${i}`);
      const content = line.slice(1).trim();
      if (!currentAlert) {
        let type = 'NOTE';
        let cleanedContent = content;
        if (content.startsWith('[!NOTE]')) {
          type = 'NOTE';
          cleanedContent = content.slice(7).trim();
        } else if (content.startsWith('[!TIP]')) {
          type = 'TIP';
          cleanedContent = content.slice(6).trim();
        } else if (content.startsWith('[!WARNING]')) {
          type = 'WARNING';
          cleanedContent = content.slice(10).trim();
        } else if (content.startsWith('[!CAUTION]')) {
          type = 'CAUTION';
          cleanedContent = content.slice(10).trim();
        }
        currentAlert = { type, lines: [cleanedContent] };
      } else {
        currentAlert.lines.push(content);
      }
      continue;
    } else {
      flushAlert(`flush-alert-before-text-${i}`);
    }

    // Bullet Lists
    const bulletMatch = line.match(/^[\s]*[-*]\s+(.*)$/);
    if (bulletMatch) {
      const itemContent = bulletMatch[1];
      if (!currentList || currentList.type !== 'ul') {
        flushList(`flush-list-change-${i}`);
        currentList = { type: 'ul', items: [itemContent] };
      } else {
        currentList.items.push(itemContent);
      }
      continue;
    }

    // Numbered Lists
    const numMatch = line.match(/^[\s]*\d+\.\s+(.*)$/);
    if (numMatch) {
      const itemContent = numMatch[1];
      if (!currentList || currentList.type !== 'ol') {
        flushList(`flush-list-change-${i}`);
        currentList = { type: 'ol', items: [itemContent] };
      } else {
        currentList.items.push(itemContent);
      }
      continue;
    }

    // Flush active list on text line
    flushList(`flush-list-text-${i}`);

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={key}
          className="text-sm font-black uppercase tracking-wider text-zinc-100 mt-4 mb-2"
        >
          <InlineText text={line.slice(4)} />
        </h4>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key} className="text-base font-black tracking-tight text-white mt-5 mb-2">
          <InlineText text={line.slice(3)} />
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={key} className="text-lg font-black tracking-tight text-white mt-6 mb-2.5">
          <InlineText text={line.slice(2)} />
        </h2>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />);
    } else {
      elements.push(
        <p key={key} className="text-sm leading-relaxed text-zinc-300 my-1">
          <InlineText text={line} />
        </p>
      );
    }
  }

  flushList('flush-list-end');
  flushAlert('flush-alert-end');

  return <div className="space-y-0.5">{elements}</div>;
};

const MarkdownRenderer = ({ content }) => {
  if (typeof content !== 'string') return null;
  const codeBlockRegex = /(```[a-zA-Z]*\n[\s\S]*?```)/g;
  const blocks = content.split(codeBlockRegex);

  return (
    <div className="space-y-3 font-sans">
      {blocks.map((block, pos) => {
        const key = `markdown-block-${pos}`;
        if (block.startsWith('```')) {
          const lines = block.split('\n');
          const firstLine = lines[0];
          const lang = firstLine.slice(3).trim() || 'code';
          const code = lines.slice(1, -1).join('\n');
          return <CodeBlock key={key} code={code} lang={lang} />;
        } else {
          return <TextBlock key={key} text={block} />;
        }
      })}
    </div>
  );
};

// ==========================================
// Collapsible Thought Process Block
// ==========================================

const ThoughtProcess = ({ message }) => {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    { id: 'classify', name: 'Classified query domain & validated guardrails', status: 'done' },
    { id: 'scan-metrics', name: 'Scanned active wholesaler metrics context', status: 'done' },
  ];

  if (message.sources && message.sources.length > 0) {
    steps.push({
      id: 'query-vector',
      name: `Queried vector database & retrieved ${message.sources.length} matching documentation chunk(s)`,
      status: 'done',
    });
  } else {
    steps.push({
      id: 'evaluate-heuristics',
      name: 'Evaluated rule-based heuristics (RAG lookup skipped)',
      status: 'done',
    });
  }

  steps.push({ id: 'synthesize', name: 'Synthesized tailored advisor response', status: 'done' });

  return (
    <div className="mb-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 overflow-hidden font-sans">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:bg-zinc-900/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Thought Process
        </span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && (
        <div className="border-t border-zinc-900/60 bg-zinc-950/60 px-4 py-3 text-[11px] space-y-2.5 font-mono text-zinc-400">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-2">
              <span className="text-emerald-400 shrink-0 select-none">✓</span>
              <span>{step.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Main Transcript Component
// ==========================================

export default function AdvisorTranscript({ messages, isLoadingHistory, isSending, historyError }) {
  const transcriptRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  const updateActiveStep = (step) => {
    setActiveStep(step);
  };

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [messages, isSending]);

  useEffect(() => {
    if (!isSending) return;

    const timer1 = setTimeout(() => updateActiveStep(1), 600);
    const timer2 = setTimeout(() => updateActiveStep(2), 1200);
    const timer3 = setTimeout(() => updateActiveStep(3), 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      updateActiveStep(0);
    };
  }, [isSending]);

  return (
    <div
      ref={transcriptRef}
      className="h-[550px] space-y-6 overflow-y-auto bg-zinc-900/10 p-6 custom-scrollbar flex flex-col"
    >
      {historyError && !messages.length ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          {historyError}
        </div>
      ) : null}

      {isLoadingHistory ? (
        <div className="flex h-full flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-300 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            Restoring advisor conversation context...
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-800/80 bg-zinc-950/20 p-8 text-center my-auto">
          <BrainCircuit className="h-12 w-12 text-amber-500/60" />
          <h2 className="mt-4 font-bold text-lg text-white">Ask the advisor what matters now.</h2>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
            Query metrics like sales, low stock pressure, retention risks, or standard industry
            models (e.g. inventory turnover).
          </p>
        </div>
      ) : (
        messages.map((message, pos) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id || `${message.role}-${pos}-${message.text.slice(0, 15)}`}
              className={isUser ? 'w-full flex justify-end' : 'w-full flex justify-start'}
            >
              {isUser ? (
                // User Message Card
                <div className="max-w-[85%] rounded-[20px] rounded-tr-[4px] border border-zinc-800/80 bg-zinc-900/40 p-4 text-zinc-200 shadow-sm animate-fade-in-up">
                  <div className="flex items-center justify-between gap-6 mb-2 border-b border-zinc-900/60 pb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">
                      YOU
                    </span>
                    <User className="h-3.5 w-3.5 rounded-full bg-zinc-800 p-0.5 text-zinc-400 shrink-0" />
                  </div>
                  <div className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
                    {message.text}
                  </div>
                </div>
              ) : (
                // Assistant Message Card
                <div
                  style={{ borderLeftColor: 'var(--brand-accent)' }}
                  className={`relative max-w-[85%] rounded-[20px] rounded-tl-[4px] border-l-4 border border-zinc-800/80 bg-zinc-900/20 p-5 text-zinc-200 shadow-sm animate-fade-in-up ${
                    message.isError ? 'border-l-red-500 border-red-500/20 bg-red-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-6 mb-3 border-b border-zinc-900/60 pb-2">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-300">
                        NEXCART ADVISOR
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider select-none">
                        AGENT
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 select-none">
                      {message.sources?.length ? 'RAG Mode' : 'Metrics Mode'}
                    </span>
                  </div>

                  {!message.isError && <ThoughtProcess message={message} />}

                  <div className="text-sm leading-relaxed">
                    {message.isError ? (
                      <p className="text-red-300 font-medium">{message.text}</p>
                    ) : (
                      <MarkdownRenderer content={message.text} />
                    )}
                  </div>

                  {message.sources?.length ? (
                    <div className="mt-4 border-t border-zinc-900/80 pt-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 select-none">
                        Retrieved Sources
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.sources.map((source) => (
                          <span
                            key={`${source.file}-${source.page}`}
                            className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            📄 {source.file} (Page {source.page})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })
      )}

      {isSending ? (
        // Active Subagent Loading steps
        <div className="w-full flex justify-start">
          <div
            style={{ borderLeftColor: 'var(--brand-accent)' }}
            className="w-[85%] rounded-[20px] rounded-tl-[4px] border-l-4 border border-zinc-800 bg-zinc-900/20 p-5 shadow-sm animate-fade-in-up"
          >
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-900/60 pb-2">
              <BrainCircuit className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-300">
                NEXCART ADVISOR
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-400 border border-amber-500/20 uppercase tracking-wider select-none animate-pulse">
                THINKING
              </span>
            </div>

            <div className="space-y-3 font-mono text-[11px] text-zinc-400">
              {LOADING_STEPS.map((step, pos) => {
                const isCompleted = pos < activeStep;
                const isActive = pos === activeStep;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2.5 transition-all duration-300 ${
                      isActive
                        ? 'text-amber-400 font-bold'
                        : isCompleted
                          ? 'text-zinc-400'
                          : 'text-zinc-600'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
                    ) : (
                      <span className="w-3.5 text-center text-zinc-700 shrink-0">•</span>
                    )}
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
