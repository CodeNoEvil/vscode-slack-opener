/** Slack p-timestamp: p1788460005447479 → 1788460005.447479 */
export function permalinkToMessageTs(raw: string): string {
  const digits = raw.replace(/^p/i, "");
  if (digits.length <= 6) {
    return digits;
  }
  return `${digits.slice(0, -6)}.${digits.slice(-6)}`;
}

const ARCHIVE =
  /^https?:\/\/(?:[a-z0-9-]+\.)?slack\.com\/archives\/([A-Z0-9]+)(?:\/p(\d+))?/i;
const APP_CLIENT =
  /^https?:\/\/app\.slack\.com\/client\/(T[A-Z0-9]+)(?:\/([A-Z0-9]+))?/i;
const WORKSPACE =
  /^https?:\/\/([a-z0-9-]+)\.slack\.com\/?(\?.*)?$/i;

function channelUri(
  team: string | undefined,
  channel: string | undefined,
  message?: string,
): string | undefined {
  const t = team?.trim();
  const c = channel?.trim();
  if (!t || !c) {
    return undefined;
  }
  const parts = [
    `team=${encodeURIComponent(t)}`,
    `id=${encodeURIComponent(c)}`,
  ];
  if (message) {
    parts.push(`message=${encodeURIComponent(message)}`);
  }
  return `slack://channel?${parts.join("&")}`;
}

/**
 * Turn a Slack web permalink or slack:// URI into a native slack:// app URI.
 * Returns undefined when the string is not a Slack link we understand.
 */
export function toSlackAppUri(
  raw: string,
  defaultTeamId: string,
  defaultChannelId = "",
): string | undefined {
  const s = raw.trim();
  if (!s) {
    return undefined;
  }
  if (/^slack:/i.test(s)) {
    return s;
  }

  const client = s.match(APP_CLIENT);
  if (client) {
    return channelUri(client[1], client[2] || defaultChannelId);
  }

  const archive = s.match(ARCHIVE);
  if (archive) {
    let url: URL;
    try {
      url = new URL(s);
    } catch {
      return undefined;
    }
    const team =
      url.searchParams.get("team") || defaultTeamId.trim() || undefined;
    const p = archive[2];
    return channelUri(
      team,
      archive[1],
      p ? permalinkToMessageTs(p) : undefined,
    );
  }

  if (WORKSPACE.test(s) && !/^https?:\/\/app\.slack\.com/i.test(s)) {
    return channelUri(defaultTeamId, defaultChannelId);
  }

  return undefined;
}

/** Find slack:// and slack.com archive / client links in a line of text. */
export function findSlackLinks(line: string): { start: number; end: number; raw: string }[] {
  const out: { start: number; end: number; raw: string }[] = [];
  const re =
    /(?:slack:[^\s)>\]]+)|(?:https?:\/\/(?:app\.slack\.com\/client\/[^\s)>\]]+|[a-z0-9-]+\.slack\.com\/archives\/[^\s)>\]]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, raw: m[0] });
  }
  return out;
}
