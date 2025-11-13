import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AchievementUnlockedEvent } from '../../services/achievement.service';

@Component({
  selector: 'app-achievement-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (event) {
      <div class="achievement-notification" 
           [class.show]="visible"
           [class.slide-out]="slideOut">
        <div class="achievement-content">
          <div class="achievement-icon">{{ event.achievement.icon }}</div>
          <div class="achievement-details">
            <div class="achievement-title">Achievement Unlocked!</div>
            <div class="achievement-name">{{ event.achievement.name }}</div>
            <div class="achievement-xp">+{{ event.achievement.xpReward }} XP</div>
          </div>
        </div>
        <div class="achievement-progress-bar">
          <div class="achievement-progress-fill" [style.width.%]="progressWidth"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .achievement-notification {
      position: fixed;
      top: -300px;
      right: 20px;
      width: 350px;
      background: #c0c0c0;
      border: 3px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
      z-index: 10000;
      transition: all 0.4s ease-out;
      font-family: 'MS Sans Serif', 'Segoe UI', sans-serif;
    }
    
    .achievement-notification.show {
      top: 20px;
      animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    .achievement-notification.slide-out {
      top: -300px;
      opacity: 0;
      transition: all 0.3s ease-in;
    }
    
    @keyframes bounceIn {
      0% {
        transform: translateY(-100px) scale(0.9);
        opacity: 0;
      }
      50% {
        transform: translateY(10px) scale(1.05);
      }
      100% {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    
    .achievement-content {
      display: flex;
      align-items: center;
      padding: 12px;
      gap: 12px;
      background: linear-gradient(180deg, #f0f0f0 0%, #d4d4d4 100%);
      border-bottom: 2px solid #808080;
    }
    
    .achievement-icon {
      font-size: 48px;
      min-width: 48px;
      text-align: center;
      animation: iconPulse 0.8s ease-in-out infinite alternate;
      filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3));
    }
    
    @keyframes iconPulse {
      from { transform: scale(1); }
      to { transform: scale(1.1); }
    }
    
    .achievement-details {
      flex: 1;
    }
    
    .achievement-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000080;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .achievement-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #000000;
      text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.8);
    }
    
    .achievement-xp {
      font-size: 13px;
      color: #008000;
      font-weight: bold;
      background: #ffff00;
      padding: 2px 8px;
      display: inline-block;
      border: 1px solid #808080;
      box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.5);
    }
    
    .achievement-progress-bar {
      height: 6px;
      background: #808080;
      overflow: hidden;
      border-top: 1px solid #000000;
    }
    
    .achievement-progress-fill {
      height: 100%;
      background: repeating-linear-gradient(
        90deg,
        #0000ff,
        #0000ff 10px,
        #00ffff 10px,
        #00ffff 20px
      );
      transition: width 5s linear;
      box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.5);
      animation: progressShimmer 1s linear infinite;
    }
    
    @keyframes progressShimmer {
      0% { background-position: 0 0; }
      100% { background-position: 40px 0; }
    }
  `]
})
export class AchievementNotificationComponent implements OnChanges {
  @Input() event: AchievementUnlockedEvent | null = null;
  
  visible = false;
  slideOut = false;
  progressWidth = 100;
  private hideTimeout: any;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event'] && this.event) {
      this.show();
    }
  }
  
  private show(): void {
    // Clear any existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    
    // Reset state
    this.slideOut = false;
    this.progressWidth = 100;
    
    // Show notification
    setTimeout(() => {
      this.visible = true;
    }, 10);
    
    // Start progress bar animation
    setTimeout(() => {
      this.progressWidth = 0;
    }, 50);
    
    // Hide after 5 seconds
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 5000);
  }
  
  private hide(): void {
    this.slideOut = true;
    setTimeout(() => {
      this.visible = false;
    }, 500);
  }
}
