export interface XNotification {
  globalObjects: GlobalObjects;
  timeline: Timeline;
}

interface GlobalObjects {
  users: Record<string, XUser>;
  tweets: Record<string, XTweet>;
  notifications: Record<string, XNotificationItem>;
}

export interface XUser {
  id: number;
  id_str: string;
  name: string;
  screen_name: string;
  location?: string;
  description?: string;
  url?: string;
  entities?: Entities;
  followers_count: number;
  friends_count: number;
  listed_count: number;
  favourites_count: number;
  statuses_count: number;
  created_at: string;
  profile_image_url_https?: string;
  verified: boolean;
}

interface Entities {
  url?: UrlEntities;
  description?: UrlEntities;
}

interface UrlEntities {
  urls: Url[];
}

interface Url {
  url: string;
  expanded_url: string;
  display_url: string;
  indices: [number, number]; // Array with exactly two numbers
}

export interface XTweet {
  id: number;
  id_str: string;
  text: string;
  user_id: number;
  created_at: string;
  retweet_count: number;
  favorite_count: number;
  entities?: TweetEntities;
}

interface TweetEntities {
  hashtags?: Hashtag[];
  symbols?: Symbol[];
  user_mentions?: UserMention[];
  urls?: Url[];
}

interface Hashtag {
  text: string;
  indices: [number, number];
}

interface Symbol {
  text: string;
  indices: [number, number];
}

interface UserMention {
  screen_name: string;
  name: string;
  id: number;
  id_str: string;
  indices: [number, number];
}

interface Timeline {
  instructions: Instruction[];
}

interface Instruction {
  type: string;
  entries?: Entry[];
}

interface Entry {
  entryId: string;
  sortIndex: string;
  content: Content;
}

interface Content {
  entryType: string;
  itemType?: string; // Explicit for specific content items
  tweet?: XTweet; // Reference to a tweet if applicable
}

export interface XNotificationItem {
  id: string;
  timestampMs: string;
  icon: {
    id: string;
  };
  message: {
    text: string;
    entities: MessageEntity[];
    rtl: boolean;
  };
  template?: {
    aggregateUserActionsV1?: {
      targetObjects: TargetObject[];
      fromUsers: { user: { id: string } }[];
      showAllLinkText?: string;
    };
  };
}

interface MessageEntity {
  fromIndex: number;
  toIndex: number;
  ref: {
    user: {
      id: string;
    };
  };
}

interface TargetObject {
  tweet: {
    id: string;
  };
}
