export type ParsedNotification = ExtractedUser[];

export interface ExtractedUser {
  rest_id: string;
  id?: string;
  name: string;
  screen_name: string;
}

// API response types
export interface NotificationResponse {
  data: {
    viewer_v2: ViewerV2;
  };
}

export interface ViewerV2 {
  user_results: ViewerUserResults;
}

export interface ViewerUserResults {
  result: ViewerUser;
}

/**
 * Minimal user for the notificationTimeline owner
 */
export interface ViewerUser {
  __typename: "User";
  rest_id: string;
  notification_timeline: NotificationTimeline;
}

export interface NotificationTimeline {
  id: string;
  timeline: Timeline;
}

export interface Timeline {
  instructions: Instruction[];
}

type Instruction =
  | TimelineClearCache
  | TimelineRemoveEntries
  | TimelineAddEntries
  | TimelineClearEntriesUnreadState
  | TimelineMarkEntriesUnreadGreaterThanSortIndex;

export interface TimelineClearCache {
  type: "TimelineClearCache";
}
export interface TimelineRemoveEntries {
  type: "TimelineRemoveEntries";
  entry_ids: string[];
}
export interface TimelineAddEntries {
  type: "TimelineAddEntries";
  entries: Entry[];
}
export interface TimelineClearEntriesUnreadState {
  type: "TimelineClearEntriesUnreadState";
}
export interface TimelineMarkEntriesUnreadGreaterThanSortIndex {
  type: "TimelineMarkEntriesUnreadGreaterThanSortIndex";
  sort_index: string;
}

export interface Entry {
  entryId: string;
  sortIndex: string;
  content: EntryContent;
  clientEventInfo?: ClientEventInfo;
}

export type EntryContent = TimelineCursor | TimelineItemEntryContent;

export interface TimelineCursor {
  entryType: "TimelineTimelineCursor";
  __typename: "TimelineTimelineCursor";
  value: string;
  cursorType: "Top" | "Bottom";
}

export interface TimelineItemEntryContent {
  entryType: "TimelineTimelineItem";
  __typename: "TimelineTimelineItem";
  itemContent: TimelineNotification;
}

export interface TimelineNotification {
  itemType: "TimelineNotification";
  __typename: "TimelineNotification";
  id: string;
  notification_icon: string;
  rich_message: RichMessage;
  notification_url: NotificationUrl;
  template: NotificationTemplate;
  timestamp_ms?: string;
}

export interface RichMessage {
  rtl: boolean;
  text: string;
  entities: RichEntity[];
}

export interface RichEntity {
  fromIndex: number;
  toIndex: number;
  ref: RichRef;
}

export type RichRef = TimelineRichTextUserRef | TimelineRichTextMentionRef;

/**
 * Detailed user record with core metadata
 */
export interface ProfileUser {
  __typename: "User";
  id: string;
  rest_id: string;
  core: {
    created_at: string;
    name: string;
    screen_name: string;
  };
  [key: string]: any;
}

export interface TimelineRichTextUserRef {
  type: "TimelineRichTextUser";
  user_results: { result: ProfileUser };
}

export interface TimelineRichTextMentionRef {
  type: "TimelineRichTextMention";
  screen_name: string;
  mention_results: {
    result: {
      __typename: string;
      core: { screen_name: string };
      rest_id: string;
    };
  };
}

export interface NotificationUrl {
  url: string;
  urlType: string;
  urtEndpointOptions?: { cacheId: string; title: string };
}

export interface NotificationTemplate {
  __typename: string;
  target_objects: any[];
  from_users: NotificationUserRef[];
}

export interface NotificationUserRef {
  __typename: string;
  user_results: { result: ProfileUser };
}

export interface ClientEventInfo {
  component: string;
  element: string;
  details: { notificationDetails: { impressionId: string; metadata: string } };
}
