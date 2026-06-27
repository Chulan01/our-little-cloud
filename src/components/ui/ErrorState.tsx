import { AlertCircle } from "lucide-react";

export function ErrorState({ message = "Что-то пошло не так, но мы аккуратно попробуем еще раз." }: { message?: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-6 text-center text-ink shadow-cloud">
      <AlertCircle className="mx-auto mb-3 h-7 w-7 text-petal" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
