import type { NotificationPayload } from "../types.js";

export interface ClickHandlerResult {
  readonly clickUrl: string;
  readonly deepLink: string;
  readonly log: string;
}

function normalizeUrl(url: string): string {
  return url.startsWith("/") ? `https://app.local${url}` : url;
}

export function attachClickHandler(payload: NotificationPayload): ClickHandlerResult {
  const clickUrl = normalizeUrl(payload.data.url);
  const deepLink = `${clickUrl}${clickUrl.includes("?") ? "&" : "?"}source=push&event=${encodeURIComponent(payload.data.event)}`;

  return {
    clickUrl,
    deepLink,
    log: `Click handler attached for ${deepLink}`,
  };
}
