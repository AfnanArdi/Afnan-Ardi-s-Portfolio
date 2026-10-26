export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  avatar?: string;
}

export type TextFontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type TextFontFamily = 'sans' | 'serif' | 'mono';
export type TextAlign = 'left' | 'center';

export interface Post {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  postType?: 'visual' | 'text';
  imageUrl?: string;
  imageAspectRatio?: '1:1' | '4:5' | '16:9' | 'auto';
  mediaType?: 'image' | 'youtube';
  youtubeId?: string;
  
  // Text formatting options (for text-only dispatches)
  fontSize?: TextFontSize;
  textColor?: string;
  fontFamily?: TextFontFamily;
  textAlign?: TextAlign;
  cardGradient?: string;

  tag: string;
  timestamp: string;
  createdAt: number;
  likes: number;
  comments: Comment[];
  isPinned?: boolean;
}

export interface CreatorProfile {
  name: string;
  handle: string;
  bio: string;
  avatar: string;
  location?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  creatorPin?: string;
}

export type FeedFilter = 'all' | 'visuals' | 'thoughts' | 'saved';
