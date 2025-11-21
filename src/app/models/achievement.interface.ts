export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji o icon class
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: Date;
  category: 'beginner' | 'intermediate' | 'advanced' | 'secret';
  requirement: {
    type: 'count' | 'combo' | 'specific' | 'streak';
    target: number;
    current: number;
  };
}

export interface GalleryItem {
  id: string;
  name: string;
  thumbnail: string; // base64 thumbnail pequeño
  fullImage: string; // base64 imagen completa
  createdAt: Date;
  settings: DitheringSettings;
  favorite: boolean;
  tags: string[];
  stats?: {
    likes?: number; // para futuro
    views?: number;
  };
}

export interface DitheringSettings {
  algorithm: string;
  palette: string;
  scale: number;
  contrast: number;
  midtones: number;
  highlights: number;
  blur: number;
  effectLayers?: any[]; // EffectLayer[] - evitamos circular dependency
  // Composition mode specific
  isComposition?: boolean;
  compositionLayersCount?: number;
}

export interface UserProgress {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  achievements: Achievement[];
  stats: UserStats;
}

export interface UserStats {
  imagesProcessed: number;
  gifsCreated: number;
  palettesUsed: Set<string>;
  algorithmsUsed: Set<string>;
  effectLayersUsed: number;
  favoriteGalleryItems: number;
  sessionStarted: Date;
  totalSessions: number;
  longestStreak: number;
  currentStreak: number;
  lastActiveDate: Date;
  // Combos y especiales
  threeLayerCombos: number;
  fiftyAdjustments: number;
  waifuInteractions: number;
}

export interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  type: 'process' | 'gif' | 'palette' | 'combo' | 'save';
  target: number;
  current: number;
  completed: boolean;
  expiresAt: Date;
}

export interface DailyProgress {
  challenges: DailyChallenge[];
  lastReset: Date;
  dailyStreak: number;
  completedToday: number;
}

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Beginner
  {
    id: 'first-dither',
    name: '🎨 First Dither',
    description: 'Process your first image',
    icon: '🎨',
    xpReward: 10,
    unlocked: false,
    category: 'beginner',
    requirement: { type: 'count', target: 1, current: 0 }
  },
  {
    id: 'gif-starter',
    name: '🎬 GIF Starter',
    description: 'Create your first animated GIF',
    icon: '🎬',
    xpReward: 20,
    unlocked: false,
    category: 'beginner',
    requirement: { type: 'count', target: 1, current: 0 }
  },
  {
    id: 'palette-curious',
    name: '🎨 Palette Curious',
    description: 'Try 3 different color palettes',
    icon: '🌈',
    xpReward: 15,
    unlocked: false,
    category: 'beginner',
    requirement: { type: 'count', target: 3, current: 0 }
  },
  {
    id: 'save-first',
    name: '💾 First Save',
    description: 'Save your first design to gallery',
    icon: '💾',
    xpReward: 10,
    unlocked: false,
    category: 'beginner',
    requirement: { type: 'count', target: 1, current: 0 }
  },
  
  // Intermediate
  {
    id: 'gif-master',
    name: '🎬 GIF Master',
    description: 'Create 10 animated GIFs',
    icon: '🎥',
    xpReward: 50,
    unlocked: false,
    category: 'intermediate',
    requirement: { type: 'count', target: 10, current: 0 }
  },
  {
    id: 'palette-explorer',
    name: '🌟 Palette Explorer',
    description: 'Use all available palettes',
    icon: '🎨',
    xpReward: 100,
    unlocked: false,
    category: 'intermediate',
    requirement: { type: 'specific', target: 8, current: 0 } // ajustar según paletas disponibles
  },
  {
    id: 'effect-combo',
    name: '✨ Effect Combo Master',
    description: 'Combine 3 or more effect layers in one GIF',
    icon: '✨',
    xpReward: 75,
    unlocked: false,
    category: 'intermediate',
    requirement: { type: 'combo', target: 3, current: 0 }
  },
  {
    id: 'perfectionist',
    name: '🔧 Pixel Perfectionist',
    description: 'Adjust settings 50 times in a session',
    icon: '🔧',
    xpReward: 40,
    unlocked: false,
    category: 'intermediate',
    requirement: { type: 'count', target: 50, current: 0 }
  },
  {
    id: 'gallery-curator',
    name: '🖼️ Gallery Curator',
    description: 'Save 10 designs to your gallery',
    icon: '🖼️',
    xpReward: 60,
    unlocked: false,
    category: 'intermediate',
    requirement: { type: 'count', target: 10, current: 0 }
  },
  
  // Advanced
  {
    id: 'speed-runner',
    name: '⚡ Speed Runner',
    description: 'Process 5 images in under 2 minutes',
    icon: '⚡',
    xpReward: 100,
    unlocked: false,
    category: 'advanced',
    requirement: { type: 'streak', target: 5, current: 0 }
  },
  {
    id: 'production-master',
    name: '🏭 Production Master',
    description: 'Process 100 images total',
    icon: '🏭',
    xpReward: 200,
    unlocked: false,
    category: 'advanced',
    requirement: { type: 'count', target: 100, current: 0 }
  },
  {
    id: 'gif-factory',
    name: '🎞️ GIF Factory',
    description: 'Create 50 animated GIFs',
    icon: '🎞️',
    xpReward: 250,
    unlocked: false,
    category: 'advanced',
    requirement: { type: 'count', target: 50, current: 0 }
  },
  
  // Secret
  {
    id: 'waifu-friend',
    name: '💖 Waifu\'s Friend',
    description: 'Interact with the waifu 20 times',
    icon: '💖',
    xpReward: 50,
    unlocked: false,
    category: 'secret',
    requirement: { type: 'count', target: 20, current: 0 }
  },
  {
    id: 'night-owl',
    name: '🌙 Night Owl',
    description: 'Switch to dark theme',
    icon: '🌙',
    xpReward: 25,
    unlocked: false,
    category: 'secret',
    requirement: { type: 'specific', target: 1, current: 0 }
  },
  {
    id: 'retro-enthusiast',
    name: '🕹️ Retro Enthusiast',
    description: 'Use Game Boy palette 10 times',
    icon: '🕹️',
    xpReward: 30,
    unlocked: false,
    category: 'secret',
    requirement: { type: 'count', target: 10, current: 0 }
  }
];

// Sistema de niveles (XP requerida por nivel)
export function getXPForLevel(level: number): number {
  // Fórmula: 100 * level^1.5
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  let xpNeeded = 0;
  
  while (xpNeeded <= totalXP) {
    level++;
    xpNeeded += getXPForLevel(level);
  }
  
  return level - 1;
}
