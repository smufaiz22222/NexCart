export default function AlertRow({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className={`rounded-[18px] border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className="mt-0.5 h-4 w-4" />
          <div>
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-1 text-xs leading-5 opacity-80">{detail}</p>
          </div>
        </div>
        <span className="text-lg font-black">{value}</span>
      </div>
    </div>
  );
}
