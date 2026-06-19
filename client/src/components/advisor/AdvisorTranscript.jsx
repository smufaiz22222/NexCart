import { useEffect, useRef } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';

const renderAssistantText = (text) => {
  const content = typeof text === 'string' ? text : '';
  const lines = content.split('\n');

  return lines.map((line, lineIndex) => {
    const segments = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={`line-${lineIndex}`}>
        {segments.map((segment, segmentIndex) => {
          const isBold = /^\*\*.+\*\*$/.test(segment);
          const cleaned = isBold ? segment.slice(2, -2) : segment;
          if (!cleaned) return null;

          return isBold ? (
            <strong
              key={`segment-${lineIndex}-${segmentIndex}`}
              className="font-extrabold text-white"
            >
              {cleaned}
            </strong>
          ) : (
            <span key={`segment-${lineIndex}-${segmentIndex}`}>{cleaned}</span>
          );
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
};

export default function AdvisorTranscript({ messages, isLoadingHistory, isSending, historyError }) {
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={transcriptRef}
      className="h-[500px] space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(24,24,27,0.5),rgba(9,9,11,0.9))] p-5"
    >
      {historyError && !messages.length ? (
        <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {historyError}
        </div>
      ) : null}

      {isLoadingHistory ? (
        <div className="flex h-full items-center justify-center">
          <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
            Restoring previous conversation...
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-700 bg-black/20 px-6 text-center">
          <BrainCircuit className="h-10 w-10 text-amber-400" />
          <h2 className="mt-4 font-serif text-2xl font-black text-white">
            Ask the advisor what matters now.
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Try questions like “How is my business performing?”, “What inventory issues should I
            focus on?”, or “What is inventory turnover?”
          </p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-3xl rounded-[24px] border px-4 py-4 ${
              message.role === 'user'
                ? 'ml-auto border-amber-400/30 bg-amber-400/10 text-amber-50'
                : message.isError
                  ? 'border-red-500/20 bg-red-500/10 text-red-100'
                  : 'border-zinc-800 bg-zinc-900/90 text-zinc-100'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-400">
              {message.role === 'user' ? 'You' : 'Advisor'}
            </p>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {message.role === 'assistant' && !message.isError
                ? renderAssistantText(message.text)
                : message.text}
            </div>
            {message.sources?.length ? (
              <div className="mt-4 border-t border-zinc-800/80 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                  Sources
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.sources.map((source) => (
                    <span
                      key={`${source.file}-${source.page}`}
                      className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200"
                    >
                      {source.file} · Page {source.page}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}

      {isSending ? (
        <div className="max-w-xl rounded-[24px] border border-zinc-800 bg-zinc-900/90 px-4 py-4 text-zinc-200">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Advisor</p>
          <div className="mt-3 flex items-center text-sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
            Thinking through your metrics and knowledge base...
          </div>
        </div>
      ) : null}
    </div>
  );
}
