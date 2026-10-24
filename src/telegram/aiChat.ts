import type { TelegramMessage } from "./types";
import { TelegramClient } from "./client";

const MAX_PROMPT_LENGTH = 3_500;
const MAX_REPLY_LENGTH = 3_800;

/** Return a prompt only for the explicit /chat command (optionally addressed to a bot). */
export function extractChatPrompt(text: string): string | null {
  const match = text.match(/^\/chat(?:@[a-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  return match ? (match[1] ?? "").trim() : null;
}

/**
 * Handles only explicit /chat commands in a human user's private chat.
 * Channel posts and all non-command messages never enter the model request.
 */
export async function handlePrivateChatCommand(
  client: TelegramClient,
  env: Env,
  message: TelegramMessage,
): Promise<void> {
  if (message.chat.type !== "private" || !message.from || message.from.is_bot || !message.text) return;

  const prompt = extractChatPrompt(message.text);
  if (prompt === null) return;

  if (!prompt) {
    await client.sendMessage(message.chat.id, "用法：/chat 你的问题");
    return;
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    await client.sendMessage(message.chat.id, "这条消息太长了，请把 /chat 内容控制在 3500 个字符以内。");
    return;
  }

  const apiKey = env.CHAT_API_KEY?.trim();
  const model = env.CHAT_MODEL?.trim();
  const baseUrl = (env.CHAT_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  if (!apiKey || !model) {
    await client.sendMessage(message.chat.id, "AI 聊天尚未配置；管理员需要在 Cloudflare Worker Secrets 中设置 CHAT_API_KEY，并配置 CHAT_MODEL。");
    return;
  }

  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl}/chat/completions`);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      throw new Error("CHAT_API_BASE_URL must be an HTTPS URL without embedded credentials");
    }
  } catch {
    await client.sendMessage(message.chat.id, "AI 接口地址配置无效；管理员需要检查 CHAT_API_BASE_URL。");
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 900,
        messages: [
          { role: "system", content: env.CHAT_SYSTEM_PROMPT?.trim() || "You are a helpful assistant. Reply clearly and concisely." },
          { role: "user", content: prompt },
        ],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      await client.sendMessage(message.chat.id, "AI 服务暂时未能完成请求，请稍后再试或检查模型服务配置。");
      return;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      await client.sendMessage(message.chat.id, "AI 服务返回了空答复，请检查模型配置后再试。");
      return;
    }

    const reply = content.trim();
    await client.sendMessage(
      message.chat.id,
      reply.length > MAX_REPLY_LENGTH ? `${reply.slice(0, MAX_REPLY_LENGTH - 1)}…` : reply,
    );
  } catch {
    // Never log prompts, provider response bodies, or the API key.
    await client.sendMessage(message.chat.id, "暂时无法连接 AI 服务，请稍后重试。").catch(() => undefined);
  }
}
