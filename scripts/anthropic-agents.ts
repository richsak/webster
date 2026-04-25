const API_BASE = process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com";
const API = `${API_BASE.replace(/\/$/, "")}/v1`;
const BETA = "managed-agents-2026-04-01";
const VERSION = "2023-06-01";

function headers(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": VERSION,
    "anthropic-beta": BETA,
  };
}

export async function findAgentByName(apiKey: string, name: string): Promise<string | null> {
  let url = `${API}/agents`;

  while (url) {
    const res = await fetch(url, { headers: headers(apiKey) });
    if (!res.ok) {
      throw new Error(`agent list failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as {
      data?: { id: string; name: string }[];
      next_page?: string | null;
      has_more?: boolean;
      last_id?: string | null;
    };
    const match = data.data?.find((agent) => agent.name === name);
    if (match) {
      return match.id;
    }

    if (data.next_page) {
      url = data.next_page.startsWith("http") ? data.next_page : `${API}${data.next_page}`;
    } else if (data.has_more && data.last_id) {
      const nextUrl = new URL(url);
      nextUrl.searchParams.set("after_id", data.last_id);
      url = nextUrl.toString();
    } else {
      url = "";
    }
  }

  return null;
}
