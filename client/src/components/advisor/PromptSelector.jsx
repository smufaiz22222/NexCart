export default function PromptSelector({ onSelectPrompt }) {
  const prompts = [
    'How is my business performing?',
    'What inventory issues should I focus on?',
    'What does my repeat customer rate indicate?',
    'What is inventory turnover?',
  ];

  return (
    <div className="rounded-[28px] border border-zinc-800 bg-[#141414] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-zinc-500">
        Suggested Prompts
      </p>
      <div className="mt-4 space-y-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="w-full rounded-[18px] border border-zinc-800 bg-black/20 px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-amber-400/30 hover:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
