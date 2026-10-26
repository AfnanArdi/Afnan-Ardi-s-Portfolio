import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Send,
  Trash2,
  Edit3,
  Pin,
  Check,
  Moon,
  Sun,
  Eye,
  PenTool,
  Upload,
  X,
  Search,
  Sparkles,
  Download,
  RotateCcw,
  Copy,
  ChevronRight,
  Maximize2,
  Lock,
  LogOut,
  Key,
  ExternalLink,
  ShieldAlert,
  Type,
  Image as ImageIcon,
  Video,
  Play,
  Palette,
  AlignLeft,
  AlignCenter,
  Bold,
  Italic,
  Highlighter,
  Plus,
  Camera,
  Layers,
  Sparkle
} from 'lucide-react';
import { Post, Comment, CreatorProfile, FeedFilter, TextFontSize, TextFontFamily, TextAlign } from './types.ts';
import { DEFAULT_PROFILE, INITIAL_POSTS, DEFAULT_TAGS, PRESET_IMAGES } from './mockData.ts';

const STORAGE_KEYS = {
  POSTS: 'vibelog_posts_v5',
  LIKES: 'vibelog_likes_v5',
  SAVED: 'vibelog_saved_v5',
  PROFILE: 'vibelog_profile_v5',
  THEME: 'vibelog_theme_v5',
  AUTH: 'vibelog_creator_auth_v5',
  TAGS: 'vibelog_tags_v5',
};

// In-memory fallback if localStorage is blocked by iframe security or quota
const memoryStore: Record<string, string> = {};

const safeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(key);
        if (item) return JSON.parse(item);
      }
    } catch (e) {
      console.warn(`[VibeLog Storage Read Warning for ${key}]:`, e);
    }
    try {
      if (memoryStore[key]) return JSON.parse(memoryStore[key]);
    } catch {}
    return fallback;
  },
  set(key: string, value: any): boolean {
    const serialized = JSON.stringify(value);
    memoryStore[key] = serialized;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, serialized);
        return true;
      }
    } catch (e: any) {
      console.warn(`[VibeLog Storage Write Warning for ${key}]:`, e);
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
        try {
          if (Array.isArray(value)) {
            const trimmed = value.map((p: Post, idx: number) => {
              if (idx > 2 && p.imageUrl && p.imageUrl.startsWith('data:')) {
                return { ...p, imageUrl: undefined };
              }
              return p;
            });
            localStorage.setItem(key, JSON.stringify(trimmed));
            return true;
          }
        } catch {}
      }
    }
    return false;
  }
};

// URL Parsers for YouTube & Google Drive
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function normalizeGoogleDriveUrl(url: string): string {
  if (!url || !url.includes('drive.google.com')) return url;
  const idMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1600`;
  }
  return url;
}

// Offscreen Canvas image compressor
function compressImageFile(file: File, maxDimension = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// Brand SVG Icons
function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// Markdown Formatter for Bios & Text
function renderFormattedBio(text: string) {
  if (!text) return null;
  // Parse **bold**, *italic*, ==highlight==
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==|\n)/g);
  return (
    <span>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part === '\n') {
          return <br key={index} />;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-neutral-100">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index} className="italic text-neutral-200">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('==') && part.endsWith('==')) {
          return (
            <span key={index} className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-medium">
              {part.slice(2, -2)}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return safeStorage.get(STORAGE_KEYS.THEME, true);
  });

  // Creator Authentication state
  const [isCreatorAuthenticated, setIsCreatorAuthenticated] = useState<boolean>(() => {
    return safeStorage.get(STORAGE_KEYS.AUTH, false);
  });

  // Auth Modal state
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Creator profile state
  const [profile, setProfile] = useState<CreatorProfile>(() => {
    return safeStorage.get(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  });

  // Tags state (Supports adding & deleting tags)
  const [tags, setTags] = useState<string[]>(() => {
    return safeStorage.get<string[]>(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
  });
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Posts state
  const [posts, setPosts] = useState<Post[]>(() => {
    const loaded = safeStorage.get<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    return Array.isArray(loaded) && loaded.length > 0 ? loaded : INITIAL_POSTS;
  });

  // User likes & saves
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => {
    const arr = safeStorage.get<string[]>(STORAGE_KEYS.LIKES, ['post-1', 'post-5']);
    return new Set(Array.isArray(arr) ? arr : ['post-1', 'post-5']);
  });

  const [savedPosts, setSavedPosts] = useState<Set<string>>(() => {
    const arr = safeStorage.get<string[]>(STORAGE_KEYS.SAVED, ['post-1']);
    return new Set(Array.isArray(arr) ? arr : ['post-1']);
  });

  // Views & Filters
  const [activeView, setActiveView] = useState<'visitor' | 'creator'>('visitor');
  const [creatorTab, setCreatorTab] = useState<'publish' | 'manage' | 'tags' | 'profile'>('publish');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption: string } | null>(null);

  // Active comment drawer for post
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [commentAuthor, setCommentAuthor] = useState<string>('Visitor');

  // Share Dialog State (Instagram Story vs Anywhere Else)
  const [sharePostItem, setSharePostItem] = useState<Post | null>(null);
  const [storyCardView, setStoryCardView] = useState<boolean>(false);
  const storyCanvasRef = useRef<HTMLCanvasElement>(null);

  // Delete & Reset confirmation modals
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Composer State
  const [composerPostType, setComposerPostType] = useState<'visual' | 'text'>('visual');
  const [composerText, setComposerText] = useState<string>('');
  const [composerMediaInput, setComposerMediaInput] = useState<string>('');
  const [composerImage, setComposerImage] = useState<string>('');
  const [composerYouTubeId, setComposerYouTubeId] = useState<string>('');
  const [composerMediaType, setComposerMediaType] = useState<'image' | 'youtube'>('image');
  const [composerAspectRatio, setComposerAspectRatio] = useState<'1:1' | '4:5' | '16:9' | 'auto'>('auto');
  
  // Text formatting controls for text-only thoughts
  const [textFontSize, setTextFontSize] = useState<TextFontSize>('lg');
  const [textFontFamily, setTextFontFamily] = useState<TextFontFamily>('sans');
  const [textColor, setTextColor] = useState<string>('#f8fafc');
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [cardGradient, setCardGradient] = useState<string>('from-amber-500/10 via-transparent to-purple-500/10');

  const [composerTag, setComposerTag] = useState<string>(tags[0] || '#thoughts');
  const [composerIsPinned, setComposerIsPinned] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile edit state
  const [editProfileName, setEditProfileName] = useState<string>(profile.name);
  const [editProfileHandle, setEditProfileHandle] = useState<string>(profile.handle);
  const [editProfileBio, setEditProfileBio] = useState<string>(profile.bio);
  const [editProfileAvatar, setEditProfileAvatar] = useState<string>(profile.avatar);
  const [editProfileFacebook, setEditProfileFacebook] = useState<string>(profile.facebookUrl || 'https://facebook.com/afnan.ardi.92');
  const [editProfileInstagram, setEditProfileInstagram] = useState<string>(profile.instagramUrl || 'https://instagram.com/afnan.ardi');
  const [editProfilePin, setEditProfilePin] = useState<string>(profile.creatorPin || '1234');

  // Persistence effects
  useEffect(() => { safeStorage.set(STORAGE_KEYS.POSTS, posts); }, [posts]);
  useEffect(() => { safeStorage.set(STORAGE_KEYS.LIKES, Array.from(likedPosts)); }, [likedPosts]);
  useEffect(() => { safeStorage.set(STORAGE_KEYS.SAVED, Array.from(savedPosts)); }, [savedPosts]);
  useEffect(() => { safeStorage.set(STORAGE_KEYS.PROFILE, profile); }, [profile]);
  useEffect(() => { safeStorage.set(STORAGE_KEYS.TAGS, tags); }, [tags]);
  useEffect(() => {
    safeStorage.set(STORAGE_KEYS.THEME, isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);
  useEffect(() => { safeStorage.set(STORAGE_KEYS.AUTH, isCreatorAuthenticated); }, [isCreatorAuthenticated]);

  // Show quick toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => { setToastMessage(null); }, 2500);
  };

  // Creator Authentication
  const handleCreatorUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = profile.creatorPin || '1234';
    if (pinInput.trim() === correctPin) {
      setIsCreatorAuthenticated(true);
      setShowAuthModal(false);
      setPinInput('');
      setAuthError('');
      setActiveView('creator');
      setCreatorTab('publish');
      showToast('Creator Studio unlocked! Welcome back.');
    } else {
      setAuthError('Incorrect PIN. (Default: 1234)');
    }
  };

  const handleCreatorLogout = () => {
    setIsCreatorAuthenticated(false);
    setActiveView('visitor');
    showToast('Locked Creator Studio.');
  };

  // Profile Avatar Upload Handler
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }
    try {
      showToast('Optimizing avatar photo...');
      const compressed = await compressImageFile(file, 400, 0.82);
      setEditProfileAvatar(compressed);
      showToast('Profile photo uploaded & ready');
    } catch {
      showToast('Error uploading avatar');
    }
  };

  // Tag Management Handlers
  const handleAddTag = () => {
    const formatted = newTagInput.trim().startsWith('#')
      ? newTagInput.trim()
      : `#${newTagInput.trim()}`;
    if (!newTagInput.trim()) return;
    if (tags.includes(formatted)) {
      showToast('Tag already exists');
      return;
    }
    const updated = [...tags, formatted];
    setTags(updated);
    setNewTagInput('');
    showToast(`Added ${formatted}`);
  };

  const handleDeleteTag = (tagToDelete: string) => {
    if (tags.length <= 1) {
      showToast('You must keep at least one tag');
      return;
    }
    const updated = tags.filter((t) => t !== tagToDelete);
    setTags(updated);
    if (selectedTag === tagToDelete) setSelectedTag('all');
    if (composerTag === tagToDelete) setComposerTag(updated[0]);
    showToast(`Deleted ${tagToDelete}`);
  };

  // Handle Media URL Input (Auto-detect YouTube vs Google Drive vs Image)
  const handleMediaUrlChange = (val: string) => {
    setComposerMediaInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setComposerImage('');
      setComposerYouTubeId('');
      setComposerMediaType('image');
      return;
    }

    // Check for YouTube
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      setComposerYouTubeId(ytId);
      setComposerMediaType('youtube');
      setComposerImage('');
      showToast('YouTube video preview detected');
      return;
    }

    // Check for Google Drive Image
    const driveUrl = normalizeGoogleDriveUrl(trimmed);
    setComposerImage(driveUrl);
    setComposerYouTubeId('');
    setComposerMediaType('image');
    showToast('Image link processed');
  };

  // Dispatch Image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCreatorAuthenticated) {
      showToast('Only creator can upload photos');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      showToast('Compressing photo...');
      const compressedDataUrl = await compressImageFile(file, 1000, 0.72);
      setComposerImage(compressedDataUrl);
      setComposerYouTubeId('');
      setComposerMediaType('image');
      setComposerMediaInput('');
      showToast('Photo optimized & preview ready');
    } catch {
      showToast('Failed to process image');
    } finally {
      setIsCompressing(false);
    }
  };

  // Publish / Edit Post
  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreatorAuthenticated) return;

    if (composerPostType === 'text' && !composerText.trim()) {
      showToast('Please type your thought before publishing');
      return;
    }
    if (composerPostType === 'visual' && !composerImage && !composerYouTubeId && !composerText.trim()) {
      showToast('Please provide an image, video link, or caption');
      return;
    }

    if (editingPostId) {
      setPosts((current) =>
        current.map((p) => {
          if (p.id === editingPostId) {
            return {
              ...p,
              content: composerText.trim(),
              postType: composerPostType,
              imageUrl: composerPostType === 'visual' ? (composerImage || undefined) : undefined,
              mediaType: composerPostType === 'visual' ? composerMediaType : undefined,
              youtubeId: composerPostType === 'visual' && composerMediaType === 'youtube' ? composerYouTubeId : undefined,
              imageAspectRatio: composerAspectRatio,
              fontSize: textFontSize,
              fontFamily: textFontFamily,
              textColor: textColor,
              textAlign: textAlign,
              cardGradient: cardGradient,
              tag: composerTag,
              isPinned: composerIsPinned,
            };
          }
          return p;
        })
      );
      showToast('Dispatch updated successfully');
      setEditingPostId(null);
    } else {
      const newPost: Post = {
        id: `post-${Date.now()}`,
        authorName: profile.name,
        authorHandle: profile.handle,
        authorAvatar: profile.avatar,
        content: composerText.trim(),
        postType: composerPostType,
        imageUrl: composerPostType === 'visual' ? (composerImage || undefined) : undefined,
        mediaType: composerPostType === 'visual' ? composerMediaType : undefined,
        youtubeId: composerPostType === 'visual' && composerMediaType === 'youtube' ? composerYouTubeId : undefined,
        imageAspectRatio: composerAspectRatio,
        fontSize: textFontSize,
        fontFamily: textFontFamily,
        textColor: textColor,
        textAlign: textAlign,
        cardGradient: cardGradient,
        tag: composerTag,
        timestamp: 'Just now',
        createdAt: Date.now(),
        likes: 0,
        comments: [],
        isPinned: composerIsPinned,
      };

      setPosts((current) => [newPost, ...current]);
      showToast('New dispatch published to feed!');
    }

    // Reset composer
    setComposerText('');
    setComposerImage('');
    setComposerYouTubeId('');
    setComposerMediaInput('');
    setComposerIsPinned(false);
    setActiveView('visitor');
  };

  // Start Edit Post
  const handleStartEdit = (post: Post) => {
    if (!isCreatorAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setEditingPostId(post.id);
    setComposerPostType(post.postType || (post.imageUrl || post.youtubeId ? 'visual' : 'text'));
    setComposerText(post.content || '');
    setComposerImage(post.imageUrl || '');
    setComposerYouTubeId(post.youtubeId || '');
    setComposerMediaType(post.mediaType || 'image');
    setComposerAspectRatio(post.imageAspectRatio || 'auto');
    if (post.fontSize) setTextFontSize(post.fontSize);
    if (post.fontFamily) setTextFontFamily(post.fontFamily);
    if (post.textColor) setTextColor(post.textColor);
    if (post.textAlign) setTextAlign(post.textAlign);
    if (post.cardGradient) setCardGradient(post.cardGradient);
    setComposerTag(post.tag || tags[0]);
    setComposerIsPinned(!!post.isPinned);
    setActiveView('creator');
    setCreatorTab('publish');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete Post
  const confirmDeletePost = () => {
    if (!postToDelete) return;
    setPosts((current) => current.filter((p) => p.id !== postToDelete));
    setPostToDelete(null);
    showToast('Dispatch deleted');
  };

  // Likes & Saves
  const handleToggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      const isLiked = next.has(postId);
      if (isLiked) {
        next.delete(postId);
        setPosts((current) =>
          current.map((p) => (p.id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p))
        );
      } else {
        next.add(postId);
        setPosts((current) =>
          current.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
        );
      }
      return next;
    });
  };

  const handleToggleSave = (postId: string) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        showToast('Removed from saved collection');
      } else {
        next.add(postId);
        showToast('Saved dispatch to collection');
      }
      return next;
    });
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    if (!commentInput.trim()) return;
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: commentAuthor.trim() || 'Visitor',
      text: commentInput.trim(),
      timestamp: 'Just now',
    };
    setPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p))
    );
    setCommentInput('');
    showToast('Thought posted to dispatch');
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CreatorProfile = {
      ...profile,
      name: editProfileName.trim() || profile.name,
      handle: editProfileHandle.trim() || profile.handle,
      bio: editProfileBio.trim() || profile.bio,
      avatar: editProfileAvatar.trim() || profile.avatar,
      facebookUrl: editProfileFacebook.trim() || 'https://facebook.com/afnan.ardi.92',
      instagramUrl: editProfileInstagram.trim() || 'https://instagram.com/afnan.ardi',
      creatorPin: editProfilePin.trim() || '1234',
    };
    setProfile(updated);
    setPosts((current) =>
      current.map((p) => ({
        ...p,
        authorName: updated.name,
        authorHandle: updated.handle,
        authorAvatar: updated.avatar,
      }))
    );
    showToast('Creator profile updated');
  };

  // Instagram Story Card Download using Canvas
  const handleDownloadStoryCard = (post: Post) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (Deep Liquid iOS 27 gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#0f0f14');
    bgGrad.addColorStop(0.5, '#161622');
    bgGrad.addColorStop(1, '#0a0a0d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative ambient glow orbs
    const glow1 = ctx.createRadialGradient(250, 400, 50, 250, 400, 600);
    glow1.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    glow1.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1080, 1920);

    const glow2 = ctx.createRadialGradient(850, 1400, 50, 850, 1400, 600);
    glow2.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
    glow2.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1080, 1920);

    // Header VibeLog watermark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('VibeLog', 120, 180);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('vibelog.app · Daily Dispatch', 120, 225);

    // Main Glass Card
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 3;
    
    // Rounded rect
    const rx = 100, ry = 300, rw = 880, rh = 1320, radius = 48;
    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + rw - radius, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    ctx.lineTo(rx + rw, ry + rh - radius);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    ctx.lineTo(rx + radius, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Author info inside card
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(post.authorName + ' ✓', 160, 390);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 26px "JetBrains Mono", monospace';
    ctx.fillText(post.authorHandle + ' · ' + post.tag, 160, 435);

    // Content text rendering
    ctx.fillStyle = post.textColor || '#f8fafc';
    const isSerif = post.fontFamily === 'serif';
    ctx.font = isSerif ? 'italic 46px "Playfair Display", Georgia, serif' : '500 38px "Plus Jakarta Sans", sans-serif';

    // Wrap text into lines
    const words = (post.content || '').split(' ');
    let line = '';
    let yPos = 530;
    const maxLineW = 760;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineW && i > 0) {
        ctx.fillText(line, 160, yPos);
        line = words[i] + ' ';
        yPos += isSerif ? 64 : 54;
        if (yPos > 1400) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 160, yPos);

    // Bottom Story CTA
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Tap to read full reflection on VibeLog ↗', 160, 1540);

    // Download trigger
    const link = document.createElement('a');
    link.download = `vibelog-story-${post.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Instagram Story card downloaded! Ready to share.');
  };

  // Filter posts
  const filteredPosts = posts
    .filter((post) => {
      if (feedFilter === 'visuals' && !post.imageUrl && !post.youtubeId) return false;
      if (feedFilter === 'thoughts' && (post.imageUrl || post.youtubeId)) return false;
      if (feedFilter === 'saved' && !savedPosts.has(post.id)) return false;
      if (selectedTag !== 'all' && post.tag !== selectedTag) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesContent = (post.content || '').toLowerCase().includes(query);
        const matchesTag = (post.tag || '').toLowerCase().includes(query);
        const matchesAuthor = (post.authorName || '').toLowerCase().includes(query);
        return matchesContent || matchesTag || matchesAuthor;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
  const totalVisuals = posts.filter((p) => !!p.imageUrl || !!p.youtubeId).length;

  const facebookLink = profile.facebookUrl || 'https://facebook.com/afnan.ardi.92';
  const instagramLink = profile.instagramUrl || 'https://instagram.com/afnan.ardi';

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden selection:bg-amber-500/20 selection:text-amber-200 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0d] text-neutral-100' : 'bg-[#f4f5f8] text-neutral-900'
      }`}
    >
      {/* iOS 27 Ambient Liquid Glow Lights (Refracts through frosted glass) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[130px] animate-pulse"></div>
        <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[150px]"></div>
        <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] bg-cyan-500/10 dark:bg-cyan-600/12 rounded-full blur-[140px]"></div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 ios-glass text-xs font-semibold rounded-full shadow-2xl flex items-center gap-2 animate-fade-in text-white border border-white/20">
          <Sparkle className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVIGATION BAR (iOS Liquid Glass) */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 border-b ${
          isDark
            ? 'bg-[#0a0a0d]/70 backdrop-blur-2xl border-white/10'
            : 'bg-white/75 backdrop-blur-2xl border-neutral-300/60'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 h-15 flex items-center justify-between gap-4">
          {/* Wordmark & Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveView('visitor');
                setFeedFilter('all');
                setSelectedTag('all');
              }}
              className="text-left group cursor-pointer flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                <span className="text-white text-xs font-black tracking-tight">V</span>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-neutral-100 to-neutral-400 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                VibeLog
              </span>
            </button>
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${
                activeView === 'creator'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : isDark
                  ? 'bg-white/5 text-neutral-400 border-white/10'
                  : 'bg-neutral-200 text-neutral-600 border-neutral-300'
              }`}
            >
              {activeView === 'creator' ? 'Creator Studio' : 'Public Feed'}
            </span>
          </div>

          {/* Navigation Mode Switcher with Creator Lock */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl ios-glass">
            <button
              onClick={() => setActiveView('visitor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeView === 'visitor'
                  ? isDark
                    ? 'bg-white/15 text-white shadow-sm border border-white/10'
                    : 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Public Feed</span>
            </button>

            {isCreatorAuthenticated ? (
              <button
                onClick={() => {
                  setActiveView('creator');
                  setCreatorTab('publish');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  activeView === 'creator'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Creator Studio</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                title="Creator Login to upload & publish"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-neutral-400 hover:text-amber-400 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Creator Access</span>
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {isCreatorAuthenticated && (
              <button
                onClick={handleCreatorLogout}
                title="Lock Creator Studio"
                className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsDark(!isDark)}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8 relative z-10">
        {/* ========================================================================= */}
        {/* 1. PUBLIC VISITOR FEED */}
        {/* ========================================================================= */}
        {activeView === 'visitor' && (
          <div className="max-w-xl mx-auto space-y-6">
            {/* Creator Profile Card (iOS Glass) */}
            <div
              className={`p-6 rounded-3xl transition-all duration-200 ${
                isDark ? 'ios-glass' : 'ios-glass-light'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-18 h-18 rounded-2xl object-cover ring-2 ring-white/20 shadow-xl"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80';
                    }}
                  />
                  {isCreatorAuthenticated && (
                    <button
                      onClick={() => {
                        setActiveView('creator');
                        setCreatorTab('profile');
                      }}
                      title="Change photo in Settings"
                      className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h1 className="text-base font-bold tracking-tight flex items-center gap-1.5">
                        <span>{profile.name}</span>
                        <span className="w-4 h-4 bg-amber-500 text-neutral-950 rounded-full text-[10px] text-center font-bold leading-4">
                          ✓
                        </span>
                      </h1>
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">{profile.handle}</p>
                    </div>

                    {isCreatorAuthenticated ? (
                      <button
                        onClick={() => {
                          setActiveView('creator');
                          setCreatorTab('publish');
                        }}
                        className="text-xs px-3.5 py-1.5 rounded-full font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="text-[11px] px-3 py-1 rounded-full text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Creator</span>
                      </button>
                    )}
                  </div>

                  {/* Formatted Bio with Rich Typography */}
                  <div className="mt-2.5 text-xs text-neutral-300 leading-relaxed font-normal">
                    {renderFormattedBio(profile.bio)}
                  </div>

                  {/* Facebook & Instagram Profile Buttons directly under name */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                    <a
                      href={facebookLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold ios-glass-button text-neutral-200 hover:text-white transition-all shadow-xs group"
                    >
                      <FacebookIcon className="w-4 h-4 text-[#1877F2] group-hover:scale-110 transition-transform" />
                      <span>Facebook</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>

                    <a
                      href={instagramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold ios-glass-button text-neutral-200 hover:text-white transition-all shadow-xs group"
                    >
                      <InstagramIcon className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                      <span>Instagram</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                  </div>

                  {/* Micro Metadata Metrics */}
                  <div className="mt-3.5 flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>{posts.length} Dispatches</span>
                    <span aria-hidden="true">·</span>
                    <span>{totalVisuals} Media</span>
                    <span aria-hidden="true">·</span>
                    <span>{totalLikes} Hearts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar & Search */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 rounded-2xl ios-glass text-xs">
                  <button
                    onClick={() => setFeedFilter('all')}
                    className={`px-3 py-1.5 font-semibold rounded-xl transition-all ${
                      feedFilter === 'all'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFeedFilter('visuals')}
                    className={`px-3 py-1.5 font-semibold rounded-xl transition-all ${
                      feedFilter === 'visuals'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Visuals
                  </button>
                  <button
                    onClick={() => setFeedFilter('thoughts')}
                    className={`px-3 py-1.5 font-semibold rounded-xl transition-all ${
                      feedFilter === 'thoughts'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Thoughts
                  </button>
                  <button
                    onClick={() => setFeedFilter('saved')}
                    className={`px-3 py-1.5 font-semibold rounded-xl transition-all ${
                      feedFilter === 'saved'
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Saved ({savedPosts.size})
                  </button>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search thoughts & tags..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-2xl ios-glass text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Tag Filter Carousel */}
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <button
                    onClick={() => setSelectedTag('all')}
                    className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                      selectedTag === 'all'
                        ? 'bg-white text-neutral-900 font-bold'
                        : 'ios-glass text-neutral-400 hover:text-white'
                    }`}
                  >
                    #all
                  </button>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
                      className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                        selectedTag === tag
                          ? 'bg-white text-neutral-900 font-bold'
                          : 'ios-glass text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* FEED STREAM */}
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl ios-glass">
                <p className="text-xs text-neutral-400">No dispatches match the selected filter.</p>
                <button
                  onClick={() => {
                    setFeedFilter('all');
                    setSelectedTag('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-xs text-amber-400 underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredPosts.map((post) => {
                  const isLiked = likedPosts.has(post.id);
                  const isSaved = savedPosts.has(post.id);
                  const isCommentsOpen = activeCommentPostId === post.id;
                  const isTextOnly = post.postType === 'text' || (!post.imageUrl && !post.youtubeId);

                  // Formatting classes for pure text thought dispatches
                  const fontClass =
                    post.fontFamily === 'serif'
                      ? 'font-editorial'
                      : post.fontFamily === 'mono'
                      ? 'font-code'
                      : 'font-sans';

                  const sizeClass =
                    post.fontSize === '2xl'
                      ? 'text-2xl font-bold tracking-tight leading-snug'
                      : post.fontSize === 'xl'
                      ? 'text-xl font-bold leading-normal'
                      : post.fontSize === 'lg'
                      ? 'text-lg font-medium leading-relaxed'
                      : post.fontSize === 'sm'
                      ? 'text-xs leading-relaxed'
                      : 'text-[14px] leading-relaxed';

                  return (
                    <article
                      key={post.id}
                      className={`rounded-3xl transition-all duration-200 overflow-hidden ${
                        isDark ? 'ios-glass' : 'ios-glass-light'
                      } ${post.cardGradient ? `bg-gradient-to-br ${post.cardGradient}` : ''}`}
                    >
                      {/* Post Header */}
                      <div className="p-5 pb-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.authorAvatar}
                            alt={post.authorName}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80';
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold tracking-tight">{post.authorName}</span>
                              {post.isPinned && (
                                <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center gap-1">
                                  <Pin className="w-2.5 h-2.5 fill-amber-400" />
                                  <span>PINNED</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                              <span>{post.timestamp}</span>
                              <span>·</span>
                              <span className="text-neutral-400 font-medium">{post.tag}</span>
                            </div>
                          </div>
                        </div>

                        {isCreatorAuthenticated && (
                          <button
                            onClick={() => handleStartEdit(post)}
                            title="Edit this dispatch"
                            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Post Content (Formatted if text thought, or caption) */}
                      {post.content && (
                        <div className="px-5 pb-3">
                          <p
                            className={`${sizeClass} ${fontClass} ${
                              post.textAlign === 'center' ? 'text-center' : 'text-left'
                            } whitespace-pre-line`}
                            style={{ color: post.textColor || undefined }}
                          >
                            {post.content}
                          </p>
                        </div>
                      )}

                      {/* YouTube Player Preview */}
                      {post.mediaType === 'youtube' && post.youtubeId && (
                        <div className="px-5 pb-3">
                          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-lg">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}`}
                              title="YouTube Video Dispatch"
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        </div>
                      )}

                      {/* Image Preview */}
                      {post.imageUrl && post.mediaType !== 'youtube' && (
                        <div className="px-5 pb-3">
                          <div
                            onClick={() =>
                              setLightboxImage({
                                url: post.imageUrl!,
                                caption: post.content,
                              })
                            }
                            className={`group relative overflow-hidden rounded-2xl bg-black cursor-pointer border border-white/10 ${
                              post.imageAspectRatio === '1:1'
                                ? 'aspect-square'
                                : post.imageAspectRatio === '4:5'
                                ? 'aspect-[4/5]'
                                : post.imageAspectRatio === '16:9'
                                ? 'aspect-video'
                                : 'max-h-[500px]'
                            }`}
                          >
                            <img
                              src={post.imageUrl}
                              alt="Visual Dispatch"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute bottom-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions Bar (Likes, Comments, Share to Story / Anywhere) */}
                      <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleToggleLike(post.id)}
                            className="flex items-center gap-1.5 font-medium transition-colors group text-neutral-400 hover:text-white"
                          >
                            <Heart
                              className={`w-4 h-4 transition-transform group-active:scale-125 ${
                                isLiked ? 'text-rose-500 fill-rose-500' : ''
                              }`}
                            />
                            <span className={isLiked ? 'text-rose-500 font-bold' : ''}>
                              {post.likes}
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              setActiveCommentPostId(isCommentsOpen ? null : post.id)
                            }
                            className="flex items-center gap-1.5 text-neutral-400 hover:text-white"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments?.length || 0}</span>
                          </button>

                          {/* Share Button (Opens Instagram Story + Share Dialog) */}
                          <button
                            onClick={() => setSharePostItem(post)}
                            title="Share Dispatch"
                            className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                            <span className="text-[11px]">Share</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleSave(post.id)}
                          title={isSaved ? 'Remove Bookmark' : 'Save Dispatch'}
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          <Bookmark
                            className={`w-4 h-4 ${
                              isSaved ? 'text-amber-400 fill-amber-400' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Comments Drawer */}
                      {isCommentsOpen && (
                        <div className="px-5 py-4 border-t border-white/10 bg-black/20 space-y-3">
                          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            Thoughts & Reflections ({post.comments?.length || 0})
                          </h4>

                          {post.comments && post.comments.length > 0 ? (
                            <div className="space-y-2">
                              {post.comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="text-xs p-3 rounded-2xl ios-glass border border-white/10"
                                >
                                  <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
                                    <span className="font-semibold text-neutral-200">
                                      {comment.author}
                                    </span>
                                    <span>{comment.timestamp}</span>
                                  </div>
                                  <p className="text-neutral-300 leading-normal">{comment.text}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 italic">No reflections left yet.</p>
                          )}

                          <div className="pt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={commentAuthor}
                              onChange={(e) => setCommentAuthor(e.target.value)}
                              placeholder="Your name"
                              className="w-1/3 px-3 py-1.5 text-xs rounded-xl ios-glass text-white focus:outline-none"
                            />
                            <input
                              type="text"
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              placeholder="Leave a reflection..."
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl ios-glass text-white focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              disabled={!commentInput.trim()}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-neutral-900 disabled:opacity-40"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CREATOR STUDIO DASHBOARD */}
        {/* ========================================================================= */}
        {activeView === 'creator' && isCreatorAuthenticated && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Creator Sub-Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl ios-glass text-xs">
                <button
                  onClick={() => setCreatorTab('publish')}
                  className={`px-3 py-1.5 font-semibold rounded-xl transition-colors ${
                    creatorTab === 'publish'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {editingPostId ? 'Edit Dispatch' : 'New Dispatch'}
                </button>
                <button
                  onClick={() => setCreatorTab('tags')}
                  className={`px-3 py-1.5 font-semibold rounded-xl transition-colors ${
                    creatorTab === 'tags'
                      ? 'bg-white/20 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Tags Manager ({tags.length})
                </button>
                <button
                  onClick={() => setCreatorTab('manage')}
                  className={`px-3 py-1.5 font-semibold rounded-xl transition-colors ${
                    creatorTab === 'manage'
                      ? 'bg-white/20 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Manage ({posts.length})
                </button>
                <button
                  onClick={() => setCreatorTab('profile')}
                  className={`px-3 py-1.5 font-semibold rounded-xl transition-colors ${
                    creatorTab === 'profile'
                      ? 'bg-white/20 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Settings & Bio
                </button>
              </div>

              <button
                onClick={() => setActiveView('visitor')}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
              >
                <span>Live Feed</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* TAB 1: NEW DISPATCH COMPOSER (Photo vs Pure Text + Formatting) */}
            {creatorTab === 'publish' && (
              <form onSubmit={handlePublish} className="p-6 rounded-3xl ios-glass space-y-5">
                {/* Author Preview Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                    />
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {profile.name}
                        <span className="text-[9px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          CREATOR
                        </span>
                      </p>
                      <p className="text-[10px] text-neutral-400 font-mono">Publishing to {profile.handle}</p>
                    </div>
                  </div>

                  {editingPostId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPostId(null);
                        setComposerText('');
                        setComposerImage('');
                        setComposerYouTubeId('');
                      }}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {/* 2 COMPOSER OPTIONS: (a) Photo/Media vs (b) Pure Text */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Select Dispatch Type:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl ios-glass">
                    <button
                      type="button"
                      onClick={() => setComposerPostType('visual')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        composerPostType === 'visual'
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Post with Photo / Media</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerPostType('text')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        composerPostType === 'text'
                          ? 'bg-white text-neutral-900 font-bold shadow-md'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      <span>Pure Text Thought</span>
                    </button>
                  </div>
                </div>

                {/* OPTION B: TEXT FORMATTING OPTIONS (Font Size, Colors, Fonts, Alignment) */}
                {composerPostType === 'text' && (
                  <div className="p-4 rounded-2xl ios-glass border border-white/15 space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5" />
                        <span>Text Styling & Formatting Controls</span>
                      </span>
                    </div>

                    {/* Font Size Selector */}
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                        Font Scale:
                      </label>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {(['sm', 'base', 'lg', 'xl', '2xl'] as const).map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setTextFontSize(s)}
                            className={`px-3 py-1 rounded-xl font-medium transition-all ${
                              textFontSize === s
                                ? 'bg-white text-neutral-900 font-bold'
                                : 'ios-glass text-neutral-400 hover:text-white'
                            }`}
                          >
                            {s === 'sm' ? 'Small' : s === 'base' ? 'Normal' : s === 'lg' ? 'Large' : s === 'xl' ? 'Bold Heading' : 'Display 2X'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                          Font Style / Family:
                        </label>
                        <div className="flex gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setTextFontFamily('sans')}
                            className={`flex-1 py-1.5 rounded-xl font-sans transition-all ${
                              textFontFamily === 'sans'
                                ? 'bg-white text-neutral-900 font-bold'
                                : 'ios-glass text-neutral-400 hover:text-white'
                            }`}
                          >
                            Modern Sans
                          </button>
                          <button
                            type="button"
                            onClick={() => setTextFontFamily('serif')}
                            className={`flex-1 py-1.5 rounded-xl font-editorial transition-all ${
                              textFontFamily === 'serif'
                                ? 'bg-white text-neutral-900 font-bold'
                                : 'ios-glass text-neutral-400 hover:text-white'
                            }`}
                          >
                            Editorial Serif
                          </button>
                          <button
                            type="button"
                            onClick={() => setTextFontFamily('mono')}
                            className={`flex-1 py-1.5 rounded-xl font-code text-[11px] transition-all ${
                              textFontFamily === 'mono'
                                ? 'bg-white text-neutral-900 font-bold'
                                : 'ios-glass text-neutral-400 hover:text-white'
                            }`}
                          >
                            Mono Code
                          </button>
                        </div>
                      </div>

                      {/* Text Alignment */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                          Alignment:
                        </label>
                        <div className="flex gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setTextAlign('left')}
                            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
                              textAlign === 'left' ? 'bg-white text-neutral-900 font-bold' : 'ios-glass text-neutral-400'
                            }`}
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                            <span>Left</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTextAlign('center')}
                            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
                              textAlign === 'center' ? 'bg-white text-neutral-900 font-bold' : 'ios-glass text-neutral-400'
                            }`}
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                            <span>Center</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Color Swatches */}
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                        Font Color Palette:
                      </label>
                      <div className="flex items-center gap-2">
                        {[
                          { name: 'Pure White', color: '#ffffff' },
                          { name: 'Warm Amber', color: '#fbbf24' },
                          { name: 'Rose Coral', color: '#fb7185' },
                          { name: 'Mint Emerald', color: '#34d399' },
                          { name: 'Sky Cyan', color: '#38bdf8' },
                          { name: 'Soft Purple', color: '#c084fc' },
                          { name: 'Nordic Slate', color: '#94a3b8' },
                        ].map((c) => (
                          <button
                            type="button"
                            key={c.color}
                            onClick={() => setTextColor(c.color)}
                            title={c.name}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                              textColor === c.color ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                            }`}
                            style={{ backgroundColor: c.color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Ambient Card Mood Tint */}
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                        Card Atmospheric Tint:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                        {[
                          { name: 'Clean Minimal', grad: 'from-white/5 to-transparent' },
                          { name: 'Sunset Aura', grad: 'from-amber-500/15 via-rose-500/5 to-transparent' },
                          { name: 'Violet Cyber', grad: 'from-purple-500/15 via-cyan-500/5 to-transparent' },
                          { name: 'Emerald Calm', grad: 'from-emerald-500/15 via-transparent to-transparent' },
                        ].map((g) => (
                          <button
                            type="button"
                            key={g.name}
                            onClick={() => setCardGradient(g.grad)}
                            className={`p-2 rounded-xl text-center truncate border ${
                              cardGradient === g.grad ? 'border-amber-400 bg-white/10 font-bold text-white' : 'border-white/10 text-neutral-400'
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TEXT EDITOR AREA */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    {composerPostType === 'text' ? 'Write Your Micro-Blog / Thought:' : 'Caption & Context (Optional):'}
                  </label>
                  <textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    rows={composerPostType === 'text' ? 5 : 3}
                    placeholder={
                      composerPostType === 'text'
                        ? 'Type your short blog, design reflection, or philosophical dispatch...'
                        : 'Add caption or story context for this photo...'
                    }
                    className={`w-full p-4 text-sm rounded-2xl ios-glass text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-y ${
                      composerPostType === 'text' && textFontFamily === 'serif' ? 'font-editorial' : ''
                    }`}
                    style={composerPostType === 'text' ? { color: textColor } : {}}
                  />
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                    <span>Supports multi-line dispatches</span>
                    <span>{composerText.length} characters</span>
                  </div>
                </div>

                {/* OPTION A: MEDIA SECTION (Photo Upload, Google Drive, YouTube link preview) */}
                {composerPostType === 'visual' && (
                  <div className="space-y-3 pt-1">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Upload Photo or Paste Link (Google Drive, YouTube, Web URL):
                    </label>

                    {/* Live Preview If Media Exists */}
                    {composerYouTubeId ? (
                      <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-black aspect-video shadow-lg">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${composerYouTubeId}`}
                          title="YouTube Preview"
                          className="w-full h-full border-0"
                          allowFullScreen
                        ></iframe>
                        <button
                          type="button"
                          onClick={() => {
                            setComposerYouTubeId('');
                            setComposerMediaInput('');
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-black"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : composerImage ? (
                      <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-black shadow-lg">
                        <div
                          className={`flex items-center justify-center ${
                            composerAspectRatio === '1:1'
                              ? 'aspect-square'
                              : composerAspectRatio === '4:5'
                              ? 'aspect-[4/5]'
                              : composerAspectRatio === '16:9'
                              ? 'aspect-video'
                              : 'max-h-72'
                          }`}
                        >
                          <img src={composerImage} alt="Composer" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setComposerImage('');
                            setComposerMediaInput('');
                          }}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 text-white hover:bg-black"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="p-2.5 bg-black/70 backdrop-blur-md text-white flex items-center justify-between text-xs border-t border-white/10">
                          <span className="text-[11px] text-neutral-400">Aspect Ratio:</span>
                          <div className="flex items-center gap-1">
                            {(['auto', '1:1', '4:5', '16:9'] as const).map((r) => (
                              <button
                                type="button"
                                key={r}
                                onClick={() => setComposerAspectRatio(r)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                  composerAspectRatio === r ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Media Input and Upload Controls */
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isCompressing}
                            onClick={() => fileInputRef.current?.click()}
                            className="p-5 rounded-2xl border border-dashed border-white/20 hover:border-amber-400/60 ios-glass flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                          >
                            <Upload className="w-5 h-5 text-amber-400 mb-1" />
                            <span className="text-xs font-bold text-white">
                              {isCompressing ? 'Compressing photo...' : 'Upload Photo from Device'}
                            </span>
                            <span className="text-[10px] text-neutral-400 mt-0.5">
                              Auto-compressed for fast loading
                            </span>
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />

                          {/* Link Input supporting YouTube & Google Drive */}
                          <div className="p-4 rounded-2xl ios-glass flex flex-col justify-between">
                            <div>
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-purple-400" />
                                <span>Paste Image / YouTube / Google Drive</span>
                              </span>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                Automatically detects YouTube videos & Drive photos
                              </p>
                            </div>
                            <div className="mt-2 flex gap-1.5">
                              <input
                                type="url"
                                value={composerMediaInput}
                                onChange={(e) => handleMediaUrlChange(e.target.value)}
                                placeholder="https://youtube.com/... or drive.google.com/..."
                                className="flex-1 px-3 py-1.5 text-xs rounded-xl ios-glass text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Presets */}
                        <div>
                          <span className="text-[11px] font-medium text-neutral-400 block mb-1.5">
                            Or pick a curated aesthetic photo:
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {PRESET_IMAGES.map((preset) => (
                              <button
                                type="button"
                                key={preset.name}
                                onClick={() => {
                                  setComposerImage(preset.url);
                                  setComposerYouTubeId('');
                                  setComposerMediaType('image');
                                  setComposerTag(`#${preset.category.toLowerCase()}`);
                                }}
                                className="group relative rounded-xl overflow-hidden aspect-square border border-white/10 hover:ring-2 hover:ring-amber-500 transition-all text-left"
                              >
                                <img
                                  src={preset.url}
                                  alt={preset.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                                  <span className="text-[9px] text-white font-medium truncate">
                                    {preset.name}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tag Selection & Pin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Dispatch Tag
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tags.map((t) => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setComposerTag(t)}
                          className={`px-3 py-1 text-xs rounded-full transition-all ${
                            composerTag === t
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'ios-glass text-neutral-400 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center sm:justify-end">
                    <label className="text-xs text-neutral-300 flex items-center gap-2 cursor-pointer mt-4 sm:mt-0">
                      <input
                        type="checkbox"
                        checked={composerIsPinned}
                        onChange={(e) => setComposerIsPinned(e.target.checked)}
                        className="rounded border-white/20 text-amber-500"
                      />
                      <span>Pin this dispatch to top of feed</span>
                    </label>
                  </div>
                </div>

                {/* Submit Controls */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerText('');
                      setComposerImage('');
                      setComposerYouTubeId('');
                      setComposerMediaInput('');
                    }}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Clear Form
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveView('visitor')}
                      className="px-4 py-2 text-xs font-medium rounded-xl ios-glass text-neutral-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCompressing}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 hover:opacity-90 shadow-md flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{editingPostId ? 'Save Changes' : 'Publish Dispatch'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: TAGS MANAGER (Add & Delete Tags) */}
            {creatorTab === 'tags' && (
              <div className="p-6 rounded-3xl ios-glass space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Dispatch Tags Manager</h3>
                    <p className="text-xs text-neutral-400">
                      Add, organize, and delete tags used for categorizing your dispatches.
                    </p>
                  </div>
                </div>

                {/* Add New Tag Input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="e.g. #tokyo, #designsystems, #filmphoto"
                      className="w-full px-4 py-2.5 text-xs rounded-xl ios-glass text-white placeholder-neutral-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-amber-500 text-neutral-950 hover:bg-amber-400 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tag</span>
                  </button>
                </div>

                {/* Existing Tags List with Delete */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-medium text-neutral-400">Current Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const postCount = posts.filter((p) => p.tag === tag).length;
                      return (
                        <div
                          key={tag}
                          className="px-3 py-1.5 rounded-xl ios-glass border border-white/15 flex items-center gap-2 text-xs"
                        >
                          <span className="font-semibold text-white">{tag}</span>
                          <span className="text-[10px] text-neutral-400">({postCount})</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(tag)}
                            title={`Delete ${tag}`}
                            className="p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MANAGE POSTS */}
            {creatorTab === 'manage' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 rounded-2xl ios-glass">
                    <p className="text-lg font-bold font-mono">{posts.length}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">Posts</p>
                  </div>
                  <div className="p-3 rounded-2xl ios-glass">
                    <p className="text-lg font-bold font-mono text-rose-500">{totalLikes}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">Likes</p>
                  </div>
                  <div className="p-3 rounded-2xl ios-glass">
                    <p className="text-lg font-bold font-mono">{totalComments}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">Comments</p>
                  </div>
                  <div className="p-3 rounded-2xl ios-glass">
                    <p className="text-lg font-bold font-mono">{totalVisuals}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">Media</p>
                  </div>
                </div>

                <div className="rounded-3xl ios-glass divide-y divide-white/10 overflow-hidden">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {post.imageUrl ? (
                          <img
                            src={post.imageUrl}
                            alt="thumb"
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                          />
                        ) : post.youtubeId ? (
                          <div className="w-12 h-12 rounded-xl bg-purple-900/60 flex items-center justify-center shrink-0 text-white">
                            <Play className="w-4 h-4 fill-white" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-neutral-300 text-[10px] uppercase font-bold">
                            Text
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate max-w-sm text-white">
                            {post.content.slice(0, 50) || 'Visual Dispatch'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                            <span>{post.timestamp}</span>
                            <span>·</span>
                            <span>{post.tag}</span>
                            <span>·</span>
                            <span>{post.likes} likes</span>
                            {post.isPinned && <span className="text-amber-400 font-bold">· Pinned</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStartEdit(post)}
                          className="p-2 rounded-xl ios-glass text-neutral-400 hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPostToDelete(post.id)}
                          className="p-2 rounded-xl ios-glass text-neutral-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS, AVATAR UPLOAD & BIO FORMATTING */}
            {creatorTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl ios-glass space-y-5">
                <div className="border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white">Creator Identity & Bio Formatting</h3>
                  <p className="text-xs text-neutral-400">
                    Customize your profile avatar, name, social buttons, and formatted bio.
                  </p>
                </div>

                {/* 1. PROFILE PHOTO UPLOAD */}
                <div className="p-4 rounded-2xl ios-glass space-y-3">
                  <label className="block text-xs font-semibold text-white">
                    Profile Photo / Avatar:
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={editProfileAvatar}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/20 shadow-md shrink-0"
                    />
                    <div className="space-y-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-100 flex items-center gap-1.5 shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Upload New Profile Photo</span>
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                      <input
                        type="url"
                        value={editProfileAvatar}
                        onChange={(e) => setEditProfileAvatar(e.target.value)}
                        placeholder="Or enter direct image URL..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl ios-glass text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. NAME & HANDLE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editProfileName}
                      onChange={(e) => setEditProfileName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl ios-glass text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Handle</label>
                    <input
                      type="text"
                      value={editProfileHandle}
                      onChange={(e) => setEditProfileHandle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl ios-glass text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. BIO & TAGLINE WITH FORMATTING TOOLBAR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-white">Bio & Tagline Formatting:</label>
                    {/* Formatting buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditProfileBio((prev) => prev + ' **bold** ')}
                        className="px-2 py-0.5 rounded-md ios-glass text-xs text-neutral-300 hover:text-white flex items-center gap-0.5"
                        title="Add bold text"
                      >
                        <Bold className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditProfileBio((prev) => prev + ' *italic* ')}
                        className="px-2 py-0.5 rounded-md ios-glass text-xs text-neutral-300 hover:text-white flex items-center gap-0.5"
                        title="Add italic text"
                      >
                        <Italic className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditProfileBio((prev) => prev + ' ==highlight== ')}
                        className="px-2 py-0.5 rounded-md ios-glass text-xs text-neutral-300 hover:text-white flex items-center gap-0.5"
                        title="Add highlight text"
                      >
                        <Highlighter className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={editProfileBio}
                    onChange={(e) => setEditProfileBio(e.target.value)}
                    placeholder="Use **bold**, *italic*, ==highlight==, and newlines..."
                    className="w-full p-3 text-xs rounded-xl ios-glass text-white focus:outline-none"
                  />

                  {/* Realtime Formatted Bio Live Preview */}
                  <div className="mt-2 p-3 rounded-xl ios-glass border border-white/10">
                    <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">
                      Live Preview in Public Feed:
                    </span>
                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {renderFormattedBio(editProfileBio)}
                    </p>
                  </div>
                </div>

                {/* 4. SOCIAL LINKS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                      <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                      <span>Facebook Profile URL</span>
                    </label>
                    <input
                      type="url"
                      value={editProfileFacebook}
                      onChange={(e) => setEditProfileFacebook(e.target.value)}
                      placeholder="https://facebook.com/afnan.ardi.92"
                      className="w-full px-3 py-2 text-xs rounded-xl ios-glass text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
                      <InstagramIcon className="w-3.5 h-3.5 text-rose-500" />
                      <span>Instagram Profile URL</span>
                    </label>
                    <input
                      type="url"
                      value={editProfileInstagram}
                      onChange={(e) => setEditProfileInstagram(e.target.value)}
                      placeholder="https://instagram.com/afnan.ardi"
                      className="w-full px-3 py-2 text-xs rounded-xl ios-glass text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* PIN Code */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Creator PIN Code</span>
                  </label>
                  <input
                    type="text"
                    value={editProfilePin}
                    onChange={(e) => setEditProfilePin(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 text-xs rounded-xl ios-glass text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* SHARE MODAL (Instagram Story Ready Card vs Share Anywhere Else) */}
      {sharePostItem && (
        <div
          onClick={() => {
            setSharePostItem(null);
            setStoryCardView(false);
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full p-6 rounded-3xl ios-glass border border-white/20 shadow-2xl text-white space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Share Dispatch</span>
              </h3>
              <button
                onClick={() => {
                  setSharePostItem(null);
                  setStoryCardView(false);
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Story Card Preview is Active */}
            {storyCardView ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/60 border border-white/15 aspect-[9/14] flex flex-col justify-between overflow-hidden relative shadow-2xl">
                  {/* Watermark header */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold tracking-tight text-white">VibeLog</span>
                    <span className="text-[10px] text-neutral-400">Instagram Story Ready</span>
                  </div>

                  {/* Card Centerpiece */}
                  <div className="my-auto space-y-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={sharePostItem.authorAvatar}
                        alt="Author"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-white leading-none">
                          {sharePostItem.authorName}
                        </p>
                        <p className="text-[10px] text-neutral-400">{sharePostItem.authorHandle}</p>
                      </div>
                    </div>

                    {sharePostItem.imageUrl && (
                      <div className="rounded-xl overflow-hidden aspect-video border border-white/10">
                        <img
                          src={sharePostItem.imageUrl}
                          alt="Story Visual"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <p
                      className={`text-xs leading-relaxed ${
                        sharePostItem.fontFamily === 'serif' ? 'font-editorial' : ''
                      }`}
                      style={{ color: sharePostItem.textColor || '#ffffff' }}
                    >
                      "{sharePostItem.content}"
                    </p>
                  </div>

                  {/* Footer CTA */}
                  <div className="pt-2 border-t border-white/10 text-center text-[10px] text-amber-400 font-semibold">
                    Read more on vibelog.app ↗
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadStoryCard(sharePostItem)}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-500 via-rose-500 to-amber-500 text-white flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Story PNG</span>
                  </button>
                  <button
                    onClick={() => setStoryCardView(false)}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl ios-glass text-neutral-300"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              /* TWO SHARING OPTIONS */
              <div className="space-y-3">
                {/* 1. INSTAGRAM STORY OPTION */}
                <button
                  type="button"
                  onClick={() => setStoryCardView(true)}
                  className="w-full p-4 rounded-2xl ios-glass hover:bg-white/15 border border-white/15 flex items-center gap-3 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-md">
                    <InstagramIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Create Instagram Story Post</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold">
                        9:16 Story Ready
                      </span>
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Formats into a gorgeous 9:16 vertical card with photo, typography & handle.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white" />
                </button>

                {/* 2. SHARE ANYWHERE ELSE OPTION */}
                <div className="p-4 rounded-2xl ios-glass border border-white/15 space-y-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Share Anywhere Else</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        const linkText = `${sharePostItem.content.slice(0, 80)}... — ${sharePostItem.authorName} on VibeLog`;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(linkText);
                          showToast('Quote copied to clipboard!');
                        }
                      }}
                      className="py-2 px-3 rounded-xl ios-glass text-xs font-semibold hover:bg-white/15 flex items-center justify-center gap-1.5 text-neutral-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Quote</span>
                    </button>

                    <button
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('Feed link copied!');
                        }
                      }}
                      className="py-2 px-3 rounded-xl ios-glass text-xs font-semibold hover:bg-white/15 flex items-center justify-center gap-1.5 text-neutral-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        `"${sharePostItem.content.slice(0, 100)}" by ${sharePostItem.authorName} on VibeLog`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <span>Share on X</span> ↗
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                        window.location.href
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <span>Share on Facebook</span> ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATOR ACCESS AUTH MODAL */}
      {showAuthModal && (
        <div
          onClick={() => setShowAuthModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-sm w-full p-6 rounded-3xl ios-glass border border-white/20 shadow-2xl text-white space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Creator Studio Access</h3>
                  <p className="text-[10px] text-neutral-400">Exclusive creator publishing mode</p>
                </div>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatorUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Enter Creator PIN Code
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter PIN..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setAuthError('');
                  }}
                  className="w-full px-4 py-2.5 text-sm rounded-xl ios-glass text-white font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                {authError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{authError}</span>
                  </p>
                )}
                <p className="text-[11px] text-neutral-400 mt-2 text-center">
                  Default PIN: <strong className="text-amber-400 font-mono">1234</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="flex-1 py-2 text-xs font-medium rounded-xl ios-glass text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  Unlock Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {postToDelete && (
        <div
          onClick={() => setPostToDelete(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-sm w-full p-5 rounded-3xl ios-glass border border-white/20 shadow-2xl text-white space-y-3"
          >
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Delete Dispatch?</span>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Are you sure you want to permanently delete this dispatch? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl ios-glass text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePost}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 text-neutral-400 hover:text-white p-2 rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img
              src={lightboxImage.url}
              alt="Zoom"
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            {lightboxImage.caption && (
              <p className="mt-4 text-xs text-neutral-300 max-w-lg text-center font-normal leading-relaxed">
                {lightboxImage.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-16 py-8 border-t border-white/10 text-center text-xs text-neutral-500 relative z-10">
        <p className="tracking-tight font-medium text-neutral-400">VibeLog — Minimalist Social Publishing Platform</p>
        <p className="text-[11px] text-neutral-500 mt-1">
          iOS Liquid Glass Aesthetics · Story Ready · Quota Protected
        </p>
      </footer>
    </div>
  );
}
