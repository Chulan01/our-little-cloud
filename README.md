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

Переменные окружения (см. `.env.example`):

| Var | Обязательна? | Описание |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | да на Vercel | Базовый URL magic-link (`https://<domain>`) |
| `NEXT_PUBLIC_SUPABASE_URL` | да | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | да | anon-ключ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | только для миграций | service-role обходит RLS — **никогда не экспонировать на клиенте** |
| `NEXT_PUBLIC_LOCAL_AUTH_ENABLED` | нет | `true` — локальный режим (только для self-host, не Vercel) |
| `LOCAL_AUTH_USERS` | если локальный режим | `login1:pass1,login2:pass2` |

> На Vercel без `NEXT_PUBLIC_SITE_URL` код в `src/lib/env.ts` **выбросит ошибку** при попытке отправить magic-link — это защищает от случайного редиректа на `localhost:3000`.

---

## 🚀 Деплой на Vercel (production, только для Максима и Вики)

### 1. Supabase Dashboard

1. Создай проект на https://app.supabase.com.
2. **Authentication → Providers → Email**: оставь **magic link / email password** включённым, отключи публичный sign-up (**"Allow new users to sign up" = OFF**) — пользователей создадим вручную.
3. **Authentication → URL Configuration**:
   - **Site URL** → твой прод-домен, например `https://our-little-cloud.vercel.app`.
   - **Redirect URLs** (allowlist) — все, что Supabase должен принимать в `emailRedirectTo`:
     ```
     https://our-little-cloud.vercel.app
     https://our-little-cloud.vercel.app/**
     http://localhost:3000
     http://localhost:3000/**
     ```
4. **SQL Editor** → выполни миграции из `supabase/migrations/` по порядку:
   ```
   0001_init.sql          -- таблицы, индексы, триггер handle_new_user
   0002_rls.sql           -- RLS-политики
   0003_storage.sql       -- bucket couple-media (для фото)
   0004_join_couple_rpc.sql -- RPC join_couple_by_invite
   0005_seed_demo.sql     -- функция seed_demo для пары
   0006_hugs.sql          -- таблица hug_signals + RLS
   ```
5. **Authentication → Users → Add user** — создай двух пользователей руками (email + пароль):
   - `максим@твой-домен.com` / пароль (запомни)
   - `вика@твой-домен.com` / пароль (запомни)

### 2. Подключи репо к Vercel

1. https://vercel.com/new → **Import** → выбери репозиторий (если ещё не подключен — `git push` и вернись сюда).
2. Framework Preset: **Next.js** (Vercel определит автоматически).
3. **Settings → Environment Variables** (для Production, Preview, Development):
   - `NEXT_PUBLIC_SUPABASE_URL` — из Supabase Project Settings → API → **Project URL**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — оттуда же → **anon public**
   - `NEXT_PUBLIC_SITE_URL` — твой прод-домен: `https://our-little-cloud.vercel.app`
4. **Deploy**.

### 3. Seed «Максим + Вика»

После деплоя зайди в **Supabase → SQL Editor** и выполни:

```sql
SELECT public.seed_demo('максим@твой-домен.com', 'вика@твой-домен.com');
```

Что делает функция:
- Создаёт (или переиспользует) `couples` с `name='Наше Облачко'`, `anniversary_date='2026-06-08'`.
- Привязывает оба `auth.users.id` к `profiles` (`display_name='максимка'` и `'вика'`).
- Засевает воспоминание «Знакомство», счётчик «Прогулок под дождём» и сообщение «Я люблю тебя».
- Идемпотентна — повторный вызов безвреден.

### 4. Перенос локальных данных из `work/local-data.json`

Если до этого сайт крутился в локальном режиме и в `work/local-data.json` есть воспоминания/счётчики/сообщения/объятия — подключись к Supabase service-role и запусти один раз:

```bash
# Загрузи service-role key из Supabase Project Settings -> API -> service_role
export SUPABASE_URL=https://xxxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ... # НЕ коммить и НЕ экспонируй

# Сначала dry-run (покажет, что именно будет вставлено — без записи):
pnpm tsx scripts/migrate-local-data.mjs \
  --max-email=максим@твой-домен.com \
  --vika-email=вика@твой-домен.com

# Если строка вывода ок — apply:
pnpm tsx scripts/migrate-local-data.mjs \
  --max-email=максим@твой-домен.com \
  --vika-email=вика@твой-домен.com \
  --apply
```

Скрипт идемпотентен (upsert по uuid), повторный запуск безопасен.

> ⚠️ **Не запускай `seed_demo` и скрипт одновременно** — оба создают запись «Знакомство» / «Прогулок под дождём» / «Я люблю тебя». Выбери один путь: либо `seed_demo` (для пустой БД), либо скрипт (для переноса старого `work/local-data.json`). После переноса спрячь `work/local-data.json` в бэкап, чтобы случайно не запустить снова.

### 6. Подгонка display_name

`seed_demo` ставит Максиму `display_name='максим'`, Вике — `'вика'`. Если хочешь восстановить старые ласковые формы:

```sql
UPDATE public.profiles SET display_name = 'максимка' WHERE display_name = 'максим';
UPDATE public.profiles SET display_name = 'вика' WHERE display_name = 'вика'; -- уже ок
```

После этого облачка на главной странице покажут «максимка» и «вика» как раньше.

### 5. Smoke-check

```bash
curl https://our-little-cloud.vercel.app/api/health
# {"status":"ok","supabase":true,"localStoreDisabled":true}
```

Логин в продакшене: **email + пароль**, который ты задал на шаге 1.5.

---

## 🔒 Lock-down (только Максим и Вика)

- **Supabase**: `Allow new users to sign up = OFF` гарантирует регистрацию через magic-link только для тех, кто приглашён вручную (создал пользователя в Dashboard).
- **В коде**: middleware перенаправляет на `/onboarding`, если у пользователя нет `couple_id`. Из-за RLS другие пары не увидят ваши данные.
- **Полезные SQL-проверки**:
  ```sql
  -- Список всех auth-пользователей (должно быть ровно 2)
  SELECT id, email, created_at FROM auth.users ORDER BY created_at;

  -- Подтверди, что в profiles у обоих есть couple_id
  SELECT id, display_name, couple_id FROM public.profiles;
  ```

---

## 🐳 Self-host (Docker / VPS) с локальным режимом

Локальный режим (auth через пароли из env, данные в `work/local-data.json`) удобен для личного демо на своём сервере. **Не используется на Vercel** — там fs read-only.

```bash
npm install
npm run build

export NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true
export LOCAL_AUTH_USERS="Максим:mypass,Вика:mypass"
export PORT=3000

npm start
```

Если у тебя уже есть данные в `work/local-data.json` и ты переезжаешь на Vercel — выполни шаг 4 выше, чтобы перенести их в Supabase **перед** отключением локального режима.

---

## Production behavior

- Static routes: `/login`, `/onboarding`, `/_not-found`, `/api/health`.
- Dynamic SSR: остальные.
- Health: `GET /api/health` → `{ status, supabase, localStoreDisabled }`.
- Security headers на каждом ответе: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`.
- `src/lib/env.ts:resolveSiteUrl()` — на Vercel без явного `NEXT_PUBLIC_SITE_URL` бросает ошибку, чтобы magic-link случайно не уехал на `localhost:3000`.
- HugWidget и панель «Я скучаю» отображаются только когда в паре есть второй человек (`partnerName` в state).
