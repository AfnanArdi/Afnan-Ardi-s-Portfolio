import { Post, CreatorProfile } from './types.ts';

export const DEFAULT_PROFILE: CreatorProfile = {
  name: 'Afnan Ardi',
  handle: '@afnan.vibe',
  bio: 'Visual curator & digital craftsman. Exploring the space between tactile architecture, calm computing, and daily micro-dispatches.',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
  location: 'Tokyo / Remote',
  facebookUrl: 'https://facebook.com/afnan.ardi.92',
  instagramUrl: 'https://instagram.com/afnan.ardi',
  creatorPin: '1234',
};

export const DEFAULT_TAGS = [
  '#thoughts',
  '#visuals',
  '#architecture',
  '#workspace',
  '#minimalism',
  '#rituals'
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    authorName: 'Afnan Ardi',
    authorHandle: '@afnan.vibe',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    content: 'Morning stillness in the pavilion. The way natural light cuts across raw cast-concrete reminds me why physical presence matters in an increasingly synthetic world. Designing software should feel just as calm and tactile.',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    imageAspectRatio: '16:9',
    tag: '#architecture',
    timestamp: '2 hours ago',
    createdAt: Date.now() - 7200000,
    likes: 42,
    comments: [
      {
        id: 'c1',
        author: 'Elena Rostova',
        text: 'The tonal contrast here is pristine. Truly feels like modern Japanese brutalism.',
        timestamp: '1h ago',
      },
      {
        id: 'c2',
        author: 'Marcus Vance',
        text: 'Love the intersection of architecture philosophy and UI design.',
        timestamp: '45m ago',
      }
    ],
    isPinned: true,
  },
  {
    id: 'post-2',
    authorName: 'Afnan Ardi',
    authorHandle: '@afnan.vibe',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    content: 'Social platforms used to feel like personal courtyards. Somewhere along the way they mutated into algorithmic malls with flashing billboards and infinite slot machines.\n\nVibeLog is an intentional rebellion: no metrics anxiety, no algorithmic feed manipulation, just visual atmosphere and quiet words.',
    tag: '#thoughts',
    timestamp: '5 hours ago',
    createdAt: Date.now() - 18000000,
    likes: 88,
    comments: [
      {
        id: 'c3',
        author: 'Kai Soren',
        text: 'Subscribing to this energy. Calm feeds bring sanity back to reading.',
        timestamp: '3h ago',
      }
    ],
    isPinned: false,
  },
  {
    id: 'post-3',
    authorName: 'Afnan Ardi',
    authorHandle: '@afnan.vibe',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    content: 'The 06:30 ritual. Hand-ground Ethiopian Yirgacheffe, ceramic dripper, no screens for the first 45 minutes of dawn. Clarity is something you carve out before the day claims your attention.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
    imageAspectRatio: '4:5',
    tag: '#rituals',
    timestamp: 'Yesterday',
    createdAt: Date.now() - 86400000,
    likes: 64,
    comments: [],
    isPinned: false,
  },
  {
    id: 'post-4',
    authorName: 'Afnan Ardi',
    authorHandle: '@afnan.vibe',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    content: 'Late night desk arrangement. Ambient 2700K lamp, mechanical keyboard, dark terminal. Working on typography rhythms for the next design system sprint.',
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
    imageAspectRatio: '16:9',
    tag: '#workspace',
    timestamp: '2 days ago',
    createdAt: Date.now() - 172800000,
    likes: 51,
    comments: [],
    isPinned: false,
  },
  {
    id: 'post-5',
    authorName: 'Afnan Ardi',
    authorHandle: '@afnan.vibe',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    content: 'Simplicity is not a starting point. It is the reward for ruthlessly understanding what can be removed without losing the soul of the work.',
    tag: '#minimalism',
    timestamp: '3 days ago',
    createdAt: Date.now() - 259200000,
    likes: 95,
    comments: [
      {
        id: 'c4',
        author: 'Sophia Chen',
        text: 'Needed to read this today while trimming features from our release.',
        timestamp: '2d ago',
      }
    ],
    isPinned: false,
  }
];

export const PRESET_IMAGES = [
  {
    name: 'Cast Concrete',
    category: 'Architecture',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Coffee Ritual',
    category: 'Rituals',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Ambient Studio',
    category: 'Workspace',
    url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Tokyo Rain',
    category: 'City',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Minimalist Interior',
    category: 'Design',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Pacific Mist',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  }
];
