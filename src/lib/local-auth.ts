export const LOCAL_AUTH_COOKIE = "olc_local_user";

export type LocalUser = {
  id: string;
  login: string;
  displayName: string;
};

export function localUserId(login: string): string {
  return login.trim().toLowerCase() === "максим" ? "local-maxim" : "local-vika";
}

function displayNameFor(login: string): string {
  return login.trim().toLowerCase() === "максим" ? "максимка" : "вика";
}

export function getLocalUsers(): Array<{ login: string; password: string }> {
  const raw = process.env.LOCAL_AUTH_USERS ?? "";
  return raw
    .split(",")
    .map((pair) => {
      const [login, password] = pair.split(":");
      return login && password ? { login: login.trim(), password: password.trim() } : null;
    })
    .filter((user): user is { login: string; password: string } => Boolean(user));
}

export function verifyLocalUser(login: string, password: string): LocalUser | null {
  const user = getLocalUsers().find((candidate) => candidate.login === login.trim() && candidate.password === password);
  return user ? { id: localUserId(user.login), login: user.login, displayName: displayNameFor(user.login) } : null;
}

export function isLocalAuthEnabled(): boolean {
  // Vercel serverless has a read-only filesystem, so the local JSON store cannot work there.
  if (process.env.VERCEL === "1") return false;
  return Boolean(process.env.NEXT_PUBLIC_LOCAL_AUTH_ENABLED === "true" && process.env.LOCAL_AUTH_USERS);
}

export function getLocalProfiles() {
  return getLocalUsers().map((user) => ({
    id: localUserId(user.login),
    couple_id: "local-couple",
    display_name: displayNameFor(user.login),
    avatar_url: null,
    // The local demo has hard-coded roles. Real couples would set this in
    // onboarding; local-store just mirrors the names the user typed in
    // `.env` (Максим / Вика) so the hug widget grammar matches production.
    gender: user.login.trim().toLowerCase() === "вика" ? "female" : "male",
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  }));
}
