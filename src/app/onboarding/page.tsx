import { Cloud, Heart } from "@/components/ui/Shapes";
import { OnboardingForms } from "@/components/auth/OnboardingForms";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 pb-28 text-center">
      <div className="relative mb-8">
        <Cloud className="h-28 w-44 text-white drop-shadow-xl" />
        <Heart className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-petal" />
      </div>
      <h1 className="font-display text-5xl text-ink">Создай ваше облачко</h1>
      <p className="mt-4 leading-7 text-ink/72">
        Здесь frontend оставлен легким: реальные формы могут вызвать server actions `createCouple` и `joinCouple`.
      </p>
      <OnboardingForms />
    </main>
  );
}
