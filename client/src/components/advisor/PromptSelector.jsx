export default function PromptSelector({ onSelectPrompt }) {
  const prompts = [
    'How is my business performing?',
    'What inventory issues should I focus on?',
    'What does my repeat customer rate indicate?',
    'What is inventory turnover?',
  ];

  return (
    <div className="rounded-[28px] border border-zinc-700 bg-[#141414] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-zinc-300">
        Suggested Prompts
      </p>
      <div className="mt-4 space-y-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="w-full rounded-[18px] border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-left text-sm text-zinc-200 transition hover:border-amber-400/40 hover:bg-zinc-800/60 hover:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
