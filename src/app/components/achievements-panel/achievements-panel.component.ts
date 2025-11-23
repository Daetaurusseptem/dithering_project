import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AchievementService } from '../../services/achievement.service';
import { Achievement } from '../../models/achievement.interface';

@Component({
  selector: 'app-achievements-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="achievements-overlay" (click)="close()">
      <div class="achievements-modal" (click)="$event.stopPropagation()">
        <div class="achievements-header">
          <h2>🏆 Achievements</h2>
          <button class="close-btn" (click)="close()">✕</button>
        </div>
        
        <div class="progress-section">
          <div class="level-badge">
            <div class="level-icon">⭐</div>
            <div class="level-info">
              <div class="level-number">Level {{ achievementService.userProgress().level }}</div>
              <div class="level-title">{{ getLevelTitle() }}</div>
            </div>
          </div>
          
          <div class="xp-bar-container">
            <div class="xp-bar">
              <div 
                class="xp-fill" 
                [style.width.%]="getXPPercentage()"
              ></div>
            </div>
            <div class="xp-text">
              {{ achievementService.userProgress().currentXP }} / 
              {{ achievementService.userProgress().xpToNextLevel }} XP
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ achievementService.userProgress().stats.imagesProcessed }}</div>
              <div class="stat-label">Images Processed</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ achievementService.userProgress().stats.gifsCreated }}</div>
              <div class="stat-label">GIFs Created</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ getUnlockedCount() }} / {{ getTotalCount() }}</div>
              <div class="stat-label">Achievements</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ getProgress() }}%</div>
              <div class="stat-label">Completion</div>
            </div>
          </div>
        </div>
        
        <div class="achievements-tabs">
          <button 
            *ngFor="let category of categories"
            class="tab-btn"
            [class.active]="selectedCategory === category"
            (click)="selectedCategory = category"
          >
            {{ getCategoryName(category) }}
          </button>
        </div>
        
        <div class="achievements-list">
          <!-- Dailies Section -->
          @if (selectedCategory === 'dailies') {
            <div class="dailies-section">
              <div class="dailies-header">
                <h3>📅 Daily Challenges</h3>
                <div class="dailies-timer">
                  Reset in: {{ getTimeUntilReset() }}
                </div>
              </div>
              
              <div class="streak-badge" *ngIf="getDailyChallenges().dailyStreak > 0">
                🔥 {{ getDailyChallenges().dailyStreak }} Day Streak!
              </div>
              
              <div class="dailies-grid">
                @for (daily of getDailyChallenges().challenges; track daily.id) {
                  <div class="daily-card" [class.completed]="daily.completed">
                    <div class="daily-icon">{{ daily.icon }}</div>
                    <div class="daily-content">
                      <div class="daily-name">{{ daily.name }}</div>
                      <div class="daily-description">{{ daily.description }}</div>
                      <div class="daily-progress-bar">
                        <div class="daily-progress-fill" 
                             [style.width.%]="(daily.current / daily.target) * 100">
                        </div>
                      </div>
                      <div class="daily-footer">
                        <span class="daily-counter">{{ daily.current }} / {{ daily.target }}</span>
                        <span class="daily-reward">+{{ daily.xpReward }} XP</span>
                      </div>
                    </div>
                    @if (daily.completed) {
                      <div class="daily-check">✓</div>
                    }
                  </div>
                }
              </div>
              
              <div class="dailies-stats">
                <div class="dailies-stat">
                  <span class="stat-value">{{ getDailyChallenges().completedToday }}</span>
                  <span class="stat-label">Completed Today</span>
                </div>
                <div class="dailies-stat">
                  <span class="stat-value">{{ getDailyChallenges().dailyStreak }}</span>
                  <span class="stat-label">Day Streak</span>
                </div>
              </div>
            </div>
          }
          
          <!-- Regular Achievements -->
          <div 
            *ngFor="let achievement of getFilteredAchievements()"
            class="achievement-item"
            [class.unlocked]="achievement.unlocked"
            [class.locked]="!achievement.unlocked"
          >
            <div class="achievement-icon">
              {{ achievement.unlocked ? achievement.icon : '🔒' }}
            </div>
            <div class="achievement-details">
              <div class="achievement-name">
                {{ achievement.name }}
                <span class="xp-reward" *ngIf="achievement.unlocked">+{{ achievement.xpReward }} XP</span>
              </div>
              <div class="achievement-description">
                {{ achievement.unlocked ? achievement.description : '???' }}
              </div>
              <div class="achievement-progress" *ngIf="!achievement.unlocked">
                <div class="progress-bar-small">
                  <div 
                    class="progress-fill-small"
                    [style.width.%]="getAchievementProgress(achievement)"
                  ></div>
                </div>
                <div class="progress-text-small">
                  {{ achievement.requirement.current }} / {{ achievement.requirement.target }}
                </div>
              </div>
              <div class="achievement-unlocked-date" *ngIf="achievement.unlocked && achievement.unlockedAt">
                Unlocked: {{ formatDate(achievement.unlockedAt) }}
              </div>
            </div>
          </div>
          
          <div *ngIf="getFilteredAchievements().length === 0" class="empty-category">
            <p>No achievements in this category yet.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .achievements-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.15s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .achievements-modal {
      background: #c0c0c0;
      border: 3px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      width: 90vw;
      max-width: 1000px;
      height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
      animation: modalPop 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      font-family: 'MS Sans Serif', 'Segoe UI', sans-serif;
    }
    
    @keyframes modalPop {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .achievements-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      background: linear-gradient(90deg, #000080, #1084d0);
      color: white;
      border-bottom: 2px solid #000000;
    }
    
    .achievements-header h2 {
      margin: 0;
      font-size: 14px;
      font-weight: bold;
      font-family: 'MS Sans Serif', sans-serif;
    }
    
    .close-btn {
      background: #c0c0c0;
      border: 2px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      width: 24px;
      height: 22px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    
    .close-btn:hover {
      background: #d8d8d8;
    }
    
    .close-btn:active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
    }
    
    .progress-section {
      padding: 16px;
      background: linear-gradient(180deg, #f0f0f0, #d4d4d4);
      border-bottom: 2px solid #808080;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .level-badge {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: var(--theme-surface);
      border: 2px solid;
      border-color: var(--theme-accent) var(--theme-shadow-color) var(--theme-shadow-color) var(--theme-accent);
      box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.8), 2px 2px 0 rgba(0, 0, 0, 0.2);
    }
    
    .level-icon {
      font-size: 48px;
      animation: iconRotate 3s linear infinite;
    }
    
    @keyframes iconRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .level-info {
      flex: 1;
    }
    
    .level-number {
      font-size: 28px;
      font-weight: bold;
      color: #000080;
      text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.8);
    }
    
    .level-title {
      font-size: 13px;
      color: #008000;
      font-weight: bold;
    }
    
    .xp-bar-container {
      margin-bottom: 16px;
    }
    
    .xp-bar {
      height: 24px;
      background: var(--theme-surface);
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.3);
      margin-bottom: 6px;
      overflow: hidden;
    }
    
    .xp-fill {
      height: 100%;
      background: repeating-linear-gradient(
        90deg,
        #0000ff,
        #0000ff 8px,
        #00ffff 8px,
        #00ffff 16px
      );
      transition: width 0.5s ease-out;
      box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.5);
      animation: xpShimmer 0.8s linear infinite;
    }
    
    @keyframes xpShimmer {
      0% { background-position: 0 0; }
      100% { background-position: 32px 0; }
    }
    
    .xp-text {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      color: #000000;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    
    .stat-item {
      background: var(--theme-surface);
      padding: 10px;
      border: 2px solid;
      border-color: #ffffff #808080 #808080 #ffffff;
      text-align: center;
      box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.8);
    }
    
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #0000ff;
    }
    
    .stat-label {
      font-size: 9px;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .achievements-tabs {
      display: flex;
      background: #c0c0c0;
      border-bottom: 2px solid #808080;
    }
    
    .tab-btn {
      flex: 1;
      padding: 10px;
      background: #c0c0c0;
      border: none;
      border-right: 2px solid #808080;
      cursor: pointer;
      font-size: 11px;
      font-weight: bold;
      font-family: 'MS Sans Serif', sans-serif;
      transition: all 0.1s;
      border-top: 2px solid;
      border-top-color: #ffffff #808080 #808080 #ffffff;
    }
    
    .tab-btn:last-child {
      border-right: none;
    }
    
    .tab-btn.active {
      background: var(--theme-surface);
      border-top-color: #808080;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .tab-btn:hover:not(.active) {
      background: #d8d8d8;
    }
    
    .tab-btn:active:not(.active) {
      box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.2);
    }
    
    .achievements-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      background: var(--theme-surface);
      border-top: 2px solid #808080;
    }
    
    .achievement-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background: #f0f0f0;
      border: 2px solid;
      border-color: #ffffff #808080 #808080 #ffffff;
      box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.2);
      transition: all 0.15s;
    }
    
    .achievement-item.unlocked {
      background: linear-gradient(180deg, #fffacd 0%, #f0e68c 100%);
      border-color: #ffd700 #b8860b #b8860b #ffd700;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.2);
    }
    
    .achievement-item.locked {
      opacity: 0.6;
      filter: grayscale(0.5);
    }
    
    .achievement-item:hover {
      transform: translateX(2px);
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
    }
    
    .achievement-icon {
      font-size: 36px;
      min-width: 36px;
      text-align: center;
      filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.3));
    }
    
    .achievement-details {
      flex: 1;
    }
    
    .achievement-name {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #000000;
    }
    
    .xp-reward {
      font-size: 10px;
      color: #008000;
      font-weight: bold;
      background: #ffff00;
      padding: 2px 6px;
      border: 1px solid #808080;
    }
    
    .achievement-description {
      font-size: 11px;
      color: #000000;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    
    .achievement-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    
    .progress-bar-small {
      flex: 1;
      height: 12px;
      background: var(--theme-surface);
      border: 1px solid #808080;
      box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    
    .progress-fill-small {
      height: 100%;
      background: repeating-linear-gradient(
        90deg,
        var(--theme-primary, #00ff00),
        var(--theme-primary, #00ff00) 6px,
        var(--theme-accent, #00cc00) 6px,
        var(--theme-accent, #00cc00) 12px
      );
      transition: width 0.3s ease-out;
      animation: progressMove 0.6s linear infinite;
    }
    
    @keyframes progressMove {
      0% { background-position: 0 0; }
      100% { background-position: 24px 0; }
    }
    
    .progress-text-small {
      font-size: 10px;
      color: #000000;
      min-width: 60px;
      text-align: right;
      font-weight: bold;
    }
    
    .achievement-unlocked-date {
      font-size: 9px;
      color: #808080;
      margin-top: 4px;
    }
    
    .empty-category {
      text-align: center;
      padding: 60px 20px;
      color: #808080;
    }
    
    /* Dailies Section */
    .dailies-section {
      padding: 12px;
    }
    
    .dailies-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px;
      background: linear-gradient(180deg, #f0f0f0, #d4d4d4);
      border: 2px solid;
      border-color: #ffffff #808080 #808080 #ffffff;
    }
    
    .dailies-header h3 {
      margin: 0;
      font-size: 14px;
      color: #000080;
    }
    
    .dailies-timer {
      font-size: 11px;
      font-weight: bold;
      color: #ff0000;
      background: #ffff00;
      padding: 4px 8px;
      border: 1px solid #808080;
    }
    
    .streak-badge {
      text-align: center;
      padding: 12px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%);
      color: white;
      font-weight: bold;
      font-size: 16px;
      border: 2px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      box-shadow: 0 0 10px rgba(255, 107, 0, 0.5);
      animation: streakPulse 2s ease-in-out infinite;
    }
    
    @keyframes streakPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    
    .dailies-grid {
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .daily-card {
      position: relative;
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #f0f0f0;
      border: 2px solid;
      border-color: #ffffff #808080 #808080 #ffffff;
      box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.2);
      transition: all 0.15s;
    }
    
    .daily-card:hover {
      transform: translateX(2px);
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
    }
    
    .daily-card.completed {
      background: linear-gradient(180deg, #d4ffcd 0%, #b8f5a8 100%);
      border-color: var(--theme-primary, #00ff00) var(--theme-accent-dark, #008000) var(--theme-accent-dark, #008000) var(--theme-primary, #00ff00);
      box-shadow: 0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.5));
    }
    
    .daily-icon {
      font-size: 48px;
      min-width: 48px;
      text-align: center;
      filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3));
    }
    
    .daily-content {
      flex: 1;
    }
    
    .daily-name {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #000000;
    }
    
    .daily-description {
      font-size: 11px;
      color: #000000;
      margin-bottom: 8px;
    }
    
    .daily-progress-bar {
      height: 16px;
      background: var(--theme-surface);
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.2);
      margin-bottom: 6px;
      overflow: hidden;
    }
    
    .daily-progress-fill {
      height: 100%;
      background: repeating-linear-gradient(
        45deg,
        #0000ff,
        #0000ff 8px,
        #00ffff 8px,
        #00ffff 16px
      );
      transition: width 0.5s ease-out;
      animation: diagonalMove 1s linear infinite;
    }
    
    @keyframes diagonalMove {
      0% { background-position: 0 0; }
      100% { background-position: 22.6px 22.6px; }
    }
    
    .daily-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: bold;
    }
    
    .daily-counter {
      color: #000000;
    }
    
    .daily-reward {
      color: #008000;
      background: #ffff00;
      padding: 2px 6px;
      border: 1px solid #808080;
    }
    
    .daily-check {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: var(--theme-primary, #00ff00);
      border: 2px solid var(--theme-accent-dark, #008000);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      animation: checkPop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    @keyframes checkPop {
      from { transform: scale(0) rotate(-180deg); }
      to { transform: scale(1) rotate(0); }
    }
    
    .dailies-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 12px;
      background: linear-gradient(180deg, #f0f0f0, #d4d4d4);
      border: 2px solid;
      border-color: #ffffff #808080 #808080 #ffffff;
    }
    
    .dailies-stat {
      text-align: center;
      padding: 12px;
      background: var(--theme-surface);
      border: 2px solid;
      border-color: #ffffff #808080 #808080 #ffffff;
    }
    
    .dailies-stat .stat-value {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #0000ff;
      margin-bottom: 4px;
    }
    
    .dailies-stat .stat-label {
      font-size: 10px;
      color: #000000;
      text-transform: uppercase;
    }
  `]
})
export class AchievementsPanelComponent {
  selectedCategory: 'dailies' | 'beginner' | 'intermediate' | 'advanced' | 'secret' = 'dailies';
  categories: Array<'dailies' | 'beginner' | 'intermediate' | 'advanced' | 'secret'> = 
    ['dailies', 'beginner', 'intermediate', 'advanced', 'secret'];
  
  constructor(public achievementService: AchievementService) {}
  
  close(): void {
    // Emitir evento de cierre o usar un service
    const event = new CustomEvent('close-achievements');
    window.dispatchEvent(event);
  }
  
  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      dailies: '🗓️ Daily',
      beginner: '🌱 Beginner',
      intermediate: '⚡ Intermediate',
      advanced: '💎 Advanced',
      secret: '🎭 Secret'
    };
    return names[category] || category;
  }
  
  getFilteredAchievements(): Achievement[] {
    if (this.selectedCategory === 'dailies') {
      return []; // Dailies se renderizan diferente
    }
    return this.achievementService.getAchievementsByCategory(this.selectedCategory);
  }
  
  getDailyChallenges() {
    return this.achievementService.getDailyProgress();
  }
  
  getTimeUntilReset(): string {
    return this.achievementService.getTimeUntilReset();
  }
  
  getXPPercentage(): number {
    const progress = this.achievementService.userProgress();
    return (progress.currentXP / progress.xpToNextLevel) * 100;
  }
  
  getAchievementProgress(achievement: Achievement): number {
    return (achievement.requirement.current / achievement.requirement.target) * 100;
  }
  
  getUnlockedCount(): number {
    return this.achievementService.getUnlockedAchievements().length;
  }
  
  getTotalCount(): number {
    return this.achievementService.userProgress().achievements.length;
  }
  
  getProgress(): number {
    return this.achievementService.getProgress();
  }
  
  getLevelTitle(): string {
    const level = this.achievementService.userProgress().level;
    if (level < 5) return 'Novice Ditherer';
    if (level < 10) return 'Pixel Apprentice';
    if (level < 15) return 'Retro Artist';
    if (level < 20) return 'Dithering Expert';
    if (level < 30) return 'Pixel Master';
    return 'Legendary Creator';
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
