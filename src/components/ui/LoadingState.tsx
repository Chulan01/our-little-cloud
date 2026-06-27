export function LoadingState({ label = "Облачко собирает нежность..." }: { label?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center text-ink/70">
      <div className="relative h-16 w-24 animate-breathe rounded-full bg-white/80 shadow-cloud">
        <div className="absolute -left-3 top-5 h-9 w-9 rounded-full bg-white/90" />
        <div className="absolute left-5 -top-2 h-12 w-12 rounded-full bg-white" />
        <div className="absolute right-2 top-3 h-11 w-11 rounded-full bg-white/95" />
      </div>
      <p>{label}</p>
    </div>
  );
}
