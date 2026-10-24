interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string;
  AUTH_SECRET?: string;
  ALLOW_OPEN_ACCESS?: string;
  CHAT_API_BASE_URL?: string;
  CHAT_API_KEY?: string;
  CHAT_MODEL?: string;
  CHAT_SYSTEM_PROMPT?: string;
}
