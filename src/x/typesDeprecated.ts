export interface UserTweetRootObject {
  data?: {
    user?: {
      result?: {
        timeline_v2?: {
          timeline?: {
            instructions?: Instruction[];
          };
        };
      };
    };
  };
}

interface Instruction {
  type?: string;
  entries?: Entry[];
}

interface Entry {
  entryId?: string;
  sortIndex?: string;
  content?: EntryContent;
}

interface EntryContent {
  entryType?: string;
  __typename?: string;
  itemContent?: ItemContent;
}

interface ItemContent {
  itemType?: string;
  __typename?: string;
  tweet_results?: TweetResults;
  tweetDisplayType?: string;
  ruxContext?: string;
}

interface TweetResults {
  result?: Tweet;
}

interface Tweet {
  __typename?: string;
  rest_id?: string;
  core?: {
    user_results?: {
      result?: UserResult;
    };
  };
  legacy?: TweetLegacy;
}

interface UserResult {
  __typename?: string;
  id?: string;
  rest_id?: string;
  affiliates_highlighted_label?: {
    label?: AffiliatesHighlightedLabel;
  };
  is_blue_verified?: boolean;
  profile_image_shape?: string;
  legacy?: UserLegacy;
}

interface AffiliatesHighlightedLabel {
  url?: {
    url?: string;
    urlType?: string;
  };
  badge?: {
    url?: string;
  };
  description?: string;
  userLabelType?: string;
  userLabelDisplayType?: string;
}

interface UserLegacy {
  created_at?: string;
  description?: string;
  entities?: {
    description?: {
      urls?: [];
    };
    url?: {
      urls?: UrlEntity[];
    };
  };
  followers_count?: number;
  friends_count?: number;
  screen_name?: string;
}

interface UrlEntity {
  display_url?: string;
  expanded_url?: string;
  url?: string;
  indices?: number[];
}

export interface TweetLegacy {
  user_id_str?: string;
  created_at?: string;
  full_text?: string;
  id_str?: string;
  favorite_count?: number;
  retweet_count?: number;
  entities?: {
    media?: MediaEntity[]; // Media added here
    user_mentions?: UserMention[];
    urls?: UrlEntity[];
  };
  extended_entities?: {
    media?: MediaEntity[]; // Extended media for videos, etc.
  };
}

interface MediaEntity {
  display_url?: string;
  expanded_url?: string;
  id_str?: string;
  media_url_https?: string;
  type?: "photo" | "video" | "animated_gif";
  url?: string;
  features?: Record<string, unknown>;
  sizes?: {
    thumb?: MediaSize;
    large?: MediaSize;
    medium?: MediaSize;
    small?: MediaSize;
  };
  original_info?: {
    height?: number;
    width?: number;
  };
  video_info?: {
    aspect_ratio?: [number, number];
    duration_millis?: number;
    variants?: {
      bitrate?: number;
      content_type?: string;
      url?: string;
    }[];
  };
}

interface MediaSize {
  h?: number; // Height
  w?: number; // Width
  resize?: string; // "crop" or "fit"
}

interface UserMention {
  id_str?: string;
  name?: string;
  screen_name?: string;
  indices?: number[];
}

export interface ParsedTweetLegacy extends TweetLegacy {
  url: string;
  userIdString: string;
}
