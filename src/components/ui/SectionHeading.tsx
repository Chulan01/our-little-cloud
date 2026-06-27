export function SectionHeading({ kicker, title, description }: { kicker?: string; title: string; description?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      {kicker ? <p className="font-script text-2xl text-petal">{kicker}</p> : null}
      <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>
      {description ? <p className="mt-4 leading-7 text-ink/72">{description}</p> : null}
    </div>
  );
}
