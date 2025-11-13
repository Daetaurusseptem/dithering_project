import { Injectable, signal } from '@angular/core';
import { Achievement, UserProgress, UserStats, DailyChallenge, DailyProgress, ACHIEVEMENT_DEFINITIONS, getXPForLevel, getLevelFromXP } from '../models/achievement.interface';

export interface AchievementUnlockedEvent {
  achievement: Achievement;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private readonly STORAGE_KEY = 'dithering_user_progress';
  private readonly STATS_KEY = 'dithering_user_stats';
  private readonly DAILY_KEY = 'dithering_dailies';
  
  // Signals para reactividad
  userProgress = signal<UserProgress>(this.loadProgress());
  unlockedAchievement = signal<AchievementUnlockedEvent | null>(null);
  dailyProgress = signal<DailyProgress>(this.loadDailies());
  
  constructor() {
    this.initializeSession();
    this.checkDailyReset();
  }
  
  private initializeSession(): void {
    const stats = this.loadStats();
    stats.totalSessions++;
    stats.sessionStarted = new Date();
    
    // Check streak
    const lastActive = new Date(stats.lastActiveDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      stats.currentStreak++;
      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
    } else if (daysDiff > 1) {
      stats.currentStreak = 1;
    }
    
    stats.lastActiveDate = today;
    this.saveStats(stats);
  }
  
  private loadProgress(): UserProgress {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Reconstruct Achievement objects from stored data
      const achievements = ACHIEVEMENT_DEFINITIONS.map(def => {
        const saved = data.achievements?.find((a: Achievement) => a.id === def.id);
        return saved ? { ...def, ...saved } : { ...def };
      });
      
      // Reconstruct stats with Sets
      let stats = data.stats || this.getDefaultStats();
      if (data.stats) {
        stats = {
          ...data.stats,
          palettesUsed: new Set(data.stats.palettesUsed || []),
          algorithmsUsed: new Set(data.stats.algorithmsUsed || []),
          sessionStarted: new Date(data.stats.sessionStarted),
          lastActiveDate: new Date(data.stats.lastActiveDate)
        };
      }
      
      return {
        level: data.level || 1,
        currentXP: data.currentXP || 0,
        xpToNextLevel: getXPForLevel((data.level || 1) + 1),
        totalXP: data.totalXP || 0,
        achievements,
        stats
      };
    }
    
    return {
      level: 1,
      currentXP: 0,
      xpToNextLevel: getXPForLevel(2),
      totalXP: 0,
      achievements: ACHIEVEMENT_DEFINITIONS.map(a => ({ ...a })),
      stats: this.getDefaultStats()
    };
  }
  
  private loadStats(): UserStats {
    const stored = localStorage.getItem(this.STATS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Reconstruct Sets
      data.palettesUsed = new Set(data.palettesUsed || []);
      data.algorithmsUsed = new Set(data.algorithmsUsed || []);
      data.sessionStarted = new Date(data.sessionStarted);
      data.lastActiveDate = new Date(data.lastActiveDate);
      return data;
    }
    return this.getDefaultStats();
  }
  
  private getDefaultStats(): UserStats {
    return {
      imagesProcessed: 0,
      gifsCreated: 0,
      palettesUsed: new Set<string>(),
      algorithmsUsed: new Set<string>(),
      effectLayersUsed: 0,
      favoriteGalleryItems: 0,
      sessionStarted: new Date(),
      totalSessions: 0,
      longestStreak: 0,
      currentStreak: 0,
      lastActiveDate: new Date(),
      threeLayerCombos: 0,
      fiftyAdjustments: 0,
      waifuInteractions: 0
    };
  }
  
  private saveProgress(): void {
    const progress = this.userProgress();
    // Convert Sets to arrays for storage
    const toSave = {
      ...progress,
      stats: {
        ...progress.stats,
        palettesUsed: Array.from(progress.stats.palettesUsed),
        algorithmsUsed: Array.from(progress.stats.algorithmsUsed)
      }
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
  }
  
  private saveStats(stats: UserStats): void {
    const toSave = {
      ...stats,
      palettesUsed: Array.from(stats.palettesUsed),
      algorithmsUsed: Array.from(stats.algorithmsUsed)
    };
    localStorage.setItem(this.STATS_KEY, JSON.stringify(toSave));
  }
  
  // Public methods para trackear acciones
  trackImageProcessed(algorithm: string, palette: string): void {
    const progress = this.userProgress();
    progress.stats.imagesProcessed++;
    progress.stats.algorithmsUsed.add(algorithm);
    progress.stats.palettesUsed.add(palette);
    
    this.userProgress.set(progress);
    this.saveProgress();
    this.saveStats(progress.stats);
    
    // Check achievements
    this.checkAchievement('first-dither', progress.stats.imagesProcessed);
    this.checkAchievement('production-master', progress.stats.imagesProcessed);
    this.checkAchievement('palette-curious', progress.stats.palettesUsed.size);
    this.checkAchievement('palette-explorer', progress.stats.palettesUsed.size);
    
    // Secret: Game Boy palette
    if (palette === 'gameboy') {
      const gbCount = this.getCustomStat('gameboy-count', 0) + 1;
      this.setCustomStat('gameboy-count', gbCount);
      this.checkAchievement('retro-enthusiast', gbCount);
    }
    
    // 🗓️ Track dailies
    this.trackDaily('process');
    this.trackDaily('palette');
  }
  
  trackGifCreated(effectLayerCount: number): void {
    const progress = this.userProgress();
    progress.stats.gifsCreated++;
    
    if (effectLayerCount >= 3) {
      progress.stats.threeLayerCombos++;
      this.checkAchievement('effect-combo', 1, true); // Trigger on first combo
      // 🗓️ Track daily combo
      this.trackDaily('combo');
    }
    
    this.userProgress.set(progress);
    this.saveProgress();
    this.saveStats(progress.stats);
    
    this.checkAchievement('gif-starter', progress.stats.gifsCreated);
    this.checkAchievement('gif-master', progress.stats.gifsCreated);
    this.checkAchievement('gif-factory', progress.stats.gifsCreated);
    
    // 🗓️ Track daily GIF
    this.trackDaily('gif');
  }
  
  trackSettingAdjustment(): void {
    const progress = this.userProgress();
    progress.stats.fiftyAdjustments++;
    
    this.userProgress.set(progress);
    this.saveStats(progress.stats);
    
    this.checkAchievement('perfectionist', progress.stats.fiftyAdjustments);
  }
  
  trackWaifuInteraction(): void {
    const progress = this.userProgress();
    progress.stats.waifuInteractions++;
    
    this.userProgress.set(progress);
    this.saveStats(progress.stats);
    
    this.checkAchievement('waifu-friend', progress.stats.waifuInteractions);
  }
  
  trackThemeSwitch(isDark: boolean): void {
    if (isDark) {
      this.checkAchievement('night-owl', 1, true);
    }
  }
  
  trackGallerySave(): void {
    const progress = this.userProgress();
    const galleryCount = this.getGalleryItemCount();
    
    this.checkAchievement('save-first', galleryCount);
    this.checkAchievement('gallery-curator', galleryCount);
    
    // 🗓️ Track daily save
    this.trackDaily('save');
  }
  
  trackSpeedRun(count: number): void {
    this.checkAchievement('speed-runner', count);
  }
  
  private checkAchievement(achievementId: string, currentValue: number, forceUnlock: boolean = false): void {
    const progress = this.userProgress();
    const achievement = progress.achievements.find(a => a.id === achievementId);
    
    if (!achievement || achievement.unlocked) return;
    
    achievement.requirement.current = currentValue;
    
    const shouldUnlock = forceUnlock || currentValue >= achievement.requirement.target;
    
    if (shouldUnlock) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();
      
      // Add XP
      this.addXP(achievement.xpReward);
      
      // Trigger notification
      this.unlockedAchievement.set({
        achievement: { ...achievement },
        timestamp: new Date()
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        if (this.unlockedAchievement()?.achievement.id === achievementId) {
          this.unlockedAchievement.set(null);
        }
      }, 5000);
      
      this.saveProgress();
    }
  }
  
  private addXP(amount: number): void {
    const progress = this.userProgress();
    progress.currentXP += amount;
    progress.totalXP += amount;
    
    // Check for level up
    while (progress.currentXP >= progress.xpToNextLevel) {
      progress.currentXP -= progress.xpToNextLevel;
      progress.level++;
      progress.xpToNextLevel = getXPForLevel(progress.level + 1);
      
      // TODO: Trigger level up notification
      console.log(`🎉 Level Up! Now level ${progress.level}`);
    }
    
    this.userProgress.set(progress);
    this.saveProgress();
  }
  
  // Helper methods
  getAchievementsByCategory(category: 'beginner' | 'intermediate' | 'advanced' | 'secret'): Achievement[] {
    return this.userProgress().achievements.filter(a => a.category === category);
  }
  
  getUnlockedAchievements(): Achievement[] {
    return this.userProgress().achievements.filter(a => a.unlocked);
  }
  
  getProgress(): number {
    const total = this.userProgress().achievements.length;
    const unlocked = this.getUnlockedAchievements().length;
    return Math.round((unlocked / total) * 100);
  }
  
  private getGalleryItemCount(): number {
    const stored = localStorage.getItem('dithering_gallery');
    if (stored) {
      const gallery = JSON.parse(stored);
      return gallery.length || 0;
    }
    return 0;
  }
  
  // Custom stat helpers for specific tracking
  private getCustomStat(key: string, defaultValue: number): number {
    const stored = localStorage.getItem(`stat_${key}`);
    return stored ? parseInt(stored, 10) : defaultValue;
  }
  
  private setCustomStat(key: string, value: number): void {
    localStorage.setItem(`stat_${key}`, value.toString());
  }
  
  // Reset (for testing/debugging)
  resetProgress(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STATS_KEY);
    localStorage.removeItem(this.DAILY_KEY);
    this.userProgress.set(this.loadProgress());
    this.dailyProgress.set(this.loadDailies());
  }
  
  /**
   * ===== DAILY CHALLENGES SYSTEM =====
   */
  
  private loadDailies(): DailyProgress {
    const stored = localStorage.getItem(this.DAILY_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return {
          ...data,
          lastReset: new Date(data.lastReset),
          challenges: data.challenges.map((c: any) => ({
            ...c,
            expiresAt: new Date(c.expiresAt)
          }))
        };
      } catch (e) {
        return this.generateDailyChallenges();
      }
    }
    return this.generateDailyChallenges();
  }
  
  private saveDailies(): void {
    localStorage.setItem(this.DAILY_KEY, JSON.stringify(this.dailyProgress()));
  }
  
  private checkDailyReset(): void {
    const progress = this.dailyProgress();
    const now = new Date();
    const lastReset = new Date(progress.lastReset);
    
    // Check if it's a new day (UTC)
    const isNewDay = now.toDateString() !== lastReset.toDateString();
    
    if (isNewDay) {
      // Check if streak continues (logged in yesterday)
      const daysDiff = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1 && progress.completedToday === progress.challenges.length) {
        // Streak continues
        progress.dailyStreak++;
      } else if (daysDiff > 1) {
        // Streak broken
        progress.dailyStreak = 0;
      }
      
      // Generate new dailies
      const newProgress = this.generateDailyChallenges();
      newProgress.dailyStreak = progress.dailyStreak;
      this.dailyProgress.set(newProgress);
      this.saveDailies();
    }
  }
  
  private generateDailyChallenges(): DailyProgress {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // Pool de posibles challenges
    const challengePool: Omit<DailyChallenge, 'current' | 'completed' | 'expiresAt'>[] = [
      {
        id: 'daily-process-3',
        name: '🎨 Triple Threat',
        description: 'Process 3 images',
        icon: '🎨',
        xpReward: 30,
        type: 'process',
        target: 3
      },
      {
        id: 'daily-process-5',
        name: '🎨 Image Marathon',
        description: 'Process 5 images',
        icon: '🖼️',
        xpReward: 50,
        type: 'process',
        target: 5
      },
      {
        id: 'daily-gif-2',
        name: '🎬 GIF Maker',
        description: 'Create 2 GIFs',
        icon: '🎬',
        xpReward: 40,
        type: 'gif',
        target: 2
      },
      {
        id: 'daily-palette-3',
        name: '🌈 Palette Explorer',
        description: 'Try 3 different palettes',
        icon: '🎨',
        xpReward: 25,
        type: 'palette',
        target: 3
      },
      {
        id: 'daily-combo-1',
        name: '✨ Effect Master',
        description: 'Use 3+ effect layers in a GIF',
        icon: '✨',
        xpReward: 50,
        type: 'combo',
        target: 1
      },
      {
        id: 'daily-save-2',
        name: '💾 Gallery Curator',
        description: 'Save 2 designs to gallery',
        icon: '💾',
        xpReward: 30,
        type: 'save',
        target: 2
      }
    ];
    
    // Seleccionar 3 challenges aleatorios
    const shuffled = [...challengePool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3).map(challenge => ({
      ...challenge,
      current: 0,
      completed: false,
      expiresAt: tomorrow
    }));
    
    return {
      challenges: selected,
      lastReset: now,
      dailyStreak: 0,
      completedToday: 0
    };
  }
  
  // Track daily challenge progress
  trackDaily(type: 'process' | 'gif' | 'palette' | 'combo' | 'save', amount: number = 1): void {
    const progress = this.dailyProgress();
    let hasUpdate = false;
    
    progress.challenges.forEach(challenge => {
      if (challenge.type === type && !challenge.completed) {
        challenge.current += amount;
        
        if (challenge.current >= challenge.target) {
          challenge.completed = true;
          challenge.current = challenge.target;
          progress.completedToday++;
          
          // Add XP reward
          this.addXP(challenge.xpReward);
          
          // Show notification
          this.unlockedAchievement.set({
            achievement: {
              id: challenge.id,
              name: `Daily: ${challenge.name}`,
              description: challenge.description,
              icon: challenge.icon,
              xpReward: challenge.xpReward,
              unlocked: true,
              category: 'beginner',
              requirement: { type: 'count', target: challenge.target, current: challenge.current }
            },
            timestamp: new Date()
          });
          
          setTimeout(() => {
            if (this.unlockedAchievement()?.achievement.id === challenge.id) {
              this.unlockedAchievement.set(null);
            }
          }, 5000);
        }
        
        hasUpdate = true;
      }
    });
    
    if (hasUpdate) {
      this.dailyProgress.set({ ...progress });
      this.saveDailies();
    }
  }
  
  getDailyProgress(): DailyProgress {
    return this.dailyProgress();
  }
  
  getTimeUntilReset(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }
}
