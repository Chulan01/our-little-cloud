# Наше Облачко

Приватное Next.js 14 + Supabase приложение для пары: романтический дневник, воспоминания, причины любви, капсулы времени, счётчики и тайные сообщения.

## Быстрый старт (локальная разработка)

```bash
npm install
cp .env.example .env.local
# отредактируй .env.local (Supabase URL + anon key)
npm run dev
```

Запускается на http://localhost:3000.

Переменные окружения (`./env.example`):

| Var | Обязательна? | Описание |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | да (на Vercel) | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | да (на Vercel) | anon-ключ Supabase |
| `NEXT_PUBLIC_SITE_URL` | нет | Базовый URL magic-link (на Vercel авто-определяется) |
| `NEXT_PUBLIC_LOCAL_AUTH_ENABLED` | нет | `true` — локальный режим (только для self-host) |
| `LOCAL_AUTH_USERS` | если выше `true` | `login1:pass1,login2:pass2` |

---

## 🚀 Деплой на Vercel (production)

1. **Создай Supabase-проект** на https://app.supabase.com.
2. **Примени миграции** из `supabase/migrations/` по порядку:
   - `0001_init.sql` — таблицы, индексы, триггеры.
   - `0002_rls.sql` — RLS-политики.
   - `0003_storage.sql` — bucket `couple-media`.
   - `0004_join_couple_rpc.sql` — RPC `join_couple_by_invite`.
   - `0005_seed_demo.sql` (опционально) — функция `seed_demo(...)` для инициализации пары.
3. **Включи Magic Link** в Supabase → Authentication → Providers → Email.
   В **URL Configuration → Redirect URLs** добавь:
   - `https://<домен>.vercel.app/callback`
   - `http://localhost:3000/callback` (для локальной отладки).
4. **Подключи репо к Vercel** (https://vercel.com/new). Build: `npm run build`.
5. **Задай env-переменные** в Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (опционально) `NEXT_PUBLIC_SITE_URL` — иначе URL определится автоматически.
6. **Деплой**. Smoke-check: `curl https://<домен>/api/health`.

### Seed демо-пары «Максим + Вика»

После того как оба зарегались через magic-link на `/login` и ушли на `/onboarding`, можно одним вызовом наполнить БД стартовыми данными (parallel восстановлению локальной версии).

1. Оба пользователя должны иметь реальные Supabase-аккаунты — создаются через `/login` (email magic link).
2. После того как profile у обоих появился в БД (можно проверить `SELECT * FROM profiles`), вызовите seed в **SQL Editor**:

```sql
SELECT public.seed_demo('maksi@example.com', 'vika@example.com');
```

Подставь реальные email-адреса, которые вы использовали для входа. Функция:
- Создаёт (или переиспользует) `couples` с `name='Наше Облачко'`, `anniversary_date='2026-06-08'`, `invite_code='OUR-CLOUD-2026'`.
- Привязывает оба `auth.users.id` к записям в `profiles` (`display_name='максимка'`, `'вика'`).
- Засевает воспоминание «Знакомство», счётчик «Прогулок под дождем» и секретное сообщение «Я люблю тебя».
- Идемпотентна — повторный вызов безвреден.

3. После seed перезайти в `/memories`, `/counters`, `/secret` — данные будут на месте.

Если хотите начать с нуля (свежая пара, без исторических данных), используйте обычный flow через `/onboarding`: один создаёт пару через форму **«Создать пару»** (получает invite-code), второй — **«Войти по коду»**.

---

## 🐳 Self-host (Docker / VPS) с локальным режимом

Локальный режим (auth через пароли из env, данные в `work/local-data.json`) удобен для личного демо на своём сервере.

```bash
npm install
npm run build

export NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true
export LOCAL_AUTH_USERS="Максим:mypass,Вика:mypass"
export PORT=3000

npm start
```

Том: прокиньте `work/` через Docker volume, чтобы сообщения/воспоминания не терялись.

> На Vercel локальный режим автоматически отключён (fs read-only).

---

## Production behavior

- Static routes: `/login`, `/onboarding`, `/_not-found`, `/api/health`.
- Dynamic SSR: остальные.
- Health: `GET /api/health` → `{ status, supabase, localStoreDisabled }`.
- Security headers на каждом ответе: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`.
- HugWidget и панель «Я скучаю» отображаются только когда в паре есть второй человек (`partnerName` в state).
