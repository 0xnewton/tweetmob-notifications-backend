import {
  ExtractedUser,
  NotificationResponse,
  ParsedNotification,
  TimelineItemEntryContent,
} from "./types";

const NEW_POST_PREFIX = "New post notifications for ";

/**
 * Extracts usernames from a message text starting with the defined prefix
 */
export function extractUsernames(text: string): string[] {
  if (!text.startsWith(NEW_POST_PREFIX)) return [];
  return text
    .slice(NEW_POST_PREFIX.length)
    .split(/ and |,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parses the notification payload to find any entries whose rich_message.text
 * begins with the prefix, and returns the matched users.
 */
export function extractUsersFromPayload(
  payload: NotificationResponse
): ParsedNotification {
  const instruction =
    payload.data.viewer_v2.user_results.result.notification_timeline.timeline.instructions.find(
      (inst) => inst.type === "TimelineAddEntries"
    );

  if (!instruction || instruction.type !== "TimelineAddEntries") {
    return [];
  }

  const entries = instruction.entries;

  const users: ExtractedUser[] = [];

  for (const entry of entries) {
    if (entry.content.__typename !== "TimelineTimelineItem") continue;
    const notif = (entry.content as TimelineItemEntryContent).itemContent;
    const text = notif.rich_message.text;
    const names = extractUsernames(text);
    if (!names.length) continue;

    for (const name of names) {
      const ent = notif.rich_message.entities.find(
        (e) =>
          e.ref.type === "TimelineRichTextUser" &&
          e.ref.user_results.result.core.name === name
      );
      if (!ent || ent.ref.type !== "TimelineRichTextUser") continue;
      const u = ent.ref.user_results.result;
      users.push({
        rest_id: u.rest_id,
        id: u.id,
        name: u.core.name,
        screen_name: u.core.screen_name,
      });
    }
  }

  return users;
}
