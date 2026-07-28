export default function ProductGridSkeleton() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-[#e2e8f0]/60 bg-white p-3.5"
        >
          <div className="aspect-square rounded-xl bg-[#f1f5f9]" />
          <div className="mt-3.5 h-3 w-16 rounded bg-[#f1f5f9]" />
          <div className="mt-2 h-4 rounded bg-[#f1f5f9]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#f1f5f9]" />
          <div className="mt-3 h-5 w-1/2 rounded bg-[#f1f5f9]" />
        </div>
      ))}
    </div>
  );
}
