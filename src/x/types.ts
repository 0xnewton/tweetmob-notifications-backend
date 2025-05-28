export interface InternalTweetBundle {
  data: InternalTweetInterface;
  raw: TweetFromXApi;
}

export interface InternalTweetInterface {
  userId: string;
  tweetId: string;
  text: string;
  createdAt: string; // ISO 8601 format
  lang: string;
}

export interface TwitterApiResponse {
  pinned: TweetFromXApi;
  timeline: TweetFromXApi[];
  next_cursor: string;
  prev_cursor: string;
  status: "ok" | string;
  user: UserProfile;
}

export interface TweetFromXApi {
  tweet_id: string;
  conversation_id: string;
  created_at: string;
  bookmarks: number;
  favorites: number;
  text: string;
  lang: string;
  views: string;
  quotes?: number;
  replies: number;
  retweets: number;
  media?: Media;
  author: Author;
  entities?: Entities;
  quoted?: TweetFromXApi;
  retweeted?: { id: string };
  retweeted_tweet?: TweetFromXApi;
}

export type Media = MediaGroup | PhotoMedia[];

export interface MediaGroup {
  photo?: PhotoMedia[];
  video?: VideoMedia[];
}

export interface PhotoMedia {
  id: string;
  media_url_https: string;
  sizes?: Record<string, MediaSize>;
  original_info?: OriginalInfo;
  // other optional properties as needed
  [key: string]: any;
}

export interface VideoMedia {
  id: string;
  media_url_https: string;
  variants: VideoVariant[];
  aspect_ratio: [number, number];
  original_info: OriginalInfo;
}

export interface VideoVariant {
  bitrate?: number;
  content_type: string;
  url: string;
}

export interface MediaSize {
  w: number;
  h: number;
  resize: string;
}

export interface OriginalInfo {
  height: number;
  width: number;
  focus_rects: FocusRect[];
}

export interface FocusRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Author {
  rest_id: string;
  name: string;
  screen_name: string;
  avatar: string;
  blue_verified: boolean;
}

export interface Entities {
  hashtags: any[];
  symbols: any[];
  timestamps: any[];
  urls: any[];
  user_mentions: UserMention[];
  media?: any[];
}

export interface UserMention {
  id_str: string;
  name: string;
  screen_name: string;
}

export interface UserProfile {
  status: string;
  profile: string;
  rest_id: string;
  blue_verified: boolean;
  affiliates: Affiliates;
  business_account: any[];
  avatar: string;
  header_image: string;
  desc: string;
  name: string;
  protected: null;
  location: string;
  friends: number;
  sub_count: number;
  statuses_count: number;
  media_count: number;
  created_at: string;
  pinned_tweet_ids_str: string[];
  id: string;
}

export interface Affiliates {
  label: AffiliateLabel;
}

export interface AffiliateLabel {
  url: {
    url: string;
    urlType: string;
  };
  badge: {
    url: string;
  };
  description: string;
  userLabelType: string;
  userLabelDisplayType: string;
}
