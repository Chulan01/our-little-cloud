import { Cloud } from "./Shapes";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl bg-white/60 p-8 text-center shadow-cloud">
      <Cloud className="mx-auto mb-4 h-16 w-24 text-white drop-shadow" />
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/70">{description}</p>
    </div>
  );
}
