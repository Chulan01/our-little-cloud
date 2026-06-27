import { Heart } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-cloud">
        <Heart className="h-7 w-7 text-petal" aria-hidden />
      </div>
      <h1 className="font-display text-4xl text-ink">Войти в облачко</h1>
      <p className="mt-4 leading-7 text-ink/75">Тихое место только для вас двоих.</p>
      <LoginForm />
    </main>
  );
}
