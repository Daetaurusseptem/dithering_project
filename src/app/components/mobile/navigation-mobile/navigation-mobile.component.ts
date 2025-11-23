import { Component, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MobileNavigationTab = 'upload' | 'canvas' | 'composition' | 'gif' | 'gallery' | 'settings';

@Component({
  selector: 'app-navigation-mobile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="mobile-nav">
      <button 
        class="nav-tab"
        [class.active]="activeTab() === 'upload'"
        (click)="selectTab('upload')">
        <span class="nav-icon">📤</span>
        <span class="nav-label">Upload</span>
      </button>
      
      <button 
        class="nav-tab"
        [class.active]="activeTab() === 'canvas'"
        (click)="selectTab('canvas')">
        <span class="nav-icon">🖼️</span>
        <span class="nav-label">Canvas</span>
      </button>
      
      <button 
        class="nav-tab"
        [class.active]="activeTab() === 'composition'"
        (click)="selectTab('composition')">
        <span class="nav-icon">🎨</span>
        <span class="nav-label">Compose</span>
      </button>
      
      <button 
        class="nav-tab"
        [class.active]="activeTab() === 'gif'"
        (click)="selectTab('gif')">
        <span class="nav-icon">🎬</span>
        <span class="nav-label">GIF</span>
      </button>
      
      <button 
        class="nav-tab"
        [class.active]="activeTab() === 'gallery'"
        (click)="selectTab('gallery')">
        <span class="nav-icon">🖼️</span>
        <span class="nav-label">Gallery</span>
      </button>
      
      <button 
        class="nav-tab"
        [class.active]="activeTab() === 'settings'"
        (click)="selectTab('settings')">
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">Settings</span>
      </button>
    </nav>
  `,
  styles: [`
    .mobile-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      height: 64px;
      background: var(--theme-surface);
      border-top: 2px solid var(--theme-border);
      box-shadow: 
        0 -4px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 var(--theme-highlight);
      z-index: 1000;
      padding-bottom: env(safe-area-inset-bottom);
    }

    .nav-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-width: 64px;
      min-height: 48px;
      background: transparent;
      border: none;
      color: var(--theme-text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 8px;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-tab:active {
      transform: translateY(1px);
    }

    .nav-icon {
      font-size: 1.4rem;
      display: inline-block;
      filter: grayscale(0.5) brightness(0.8) saturate(0.5) opacity(0.85);
      transition: all 0.15s ease;
    }

    .nav-label {
      font-size: 0.6rem;
      font-weight: 600;
      font-family: var(--font-mono);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      opacity: 0.5;
      transition: all 0.15s ease;
    }

    .nav-tab.active {
      color: var(--theme-primary);
    }

    .nav-tab.active .nav-icon {
      filter: grayscale(0.2) brightness(0.95) saturate(0.8) opacity(1);
      transform: scale(1.05);
    }

    .nav-tab.active .nav-label {
      opacity: 1;
      font-weight: 700;
    }

    .nav-tab:not(.active):active .nav-icon {
      filter: grayscale(0.3);
    }
  `]
})
export class NavigationMobileComponent {
  activeTab = input<MobileNavigationTab>('upload');
  tabChange = output<MobileNavigationTab>();

  selectTab(tab: MobileNavigationTab): void {
    this.tabChange.emit(tab);
  }
}
