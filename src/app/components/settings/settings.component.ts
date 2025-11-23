import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService, Language } from '../../services/i18n.service';
import { ThemeService, ThemeId } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-overlay" (click)="close()">
      <div class="settings-modal" (click)="$event.stopPropagation()">
        <div class="settings-header">
          <h2>⚙️ Settings</h2>
          <button class="close-btn" (click)="close()">✕</button>
        </div>
        
        <div class="settings-body">
          <!-- Language Section -->
          <div class="settings-section">
            <h3>🌐 Language / Idioma / 言語</h3>
            
            <div class="language-options">
              <button 
                class="language-btn"
                [class.active]="i18nService.currentLanguage() === 'en'"
                (click)="setLanguage('en')">
                <span class="flag">🇺🇸</span>
                <span>English</span>
              </button>
              
              <button 
                class="language-btn"
                [class.active]="i18nService.currentLanguage() === 'es'"
                (click)="setLanguage('es')">
                <span class="flag">🇪🇸</span>
                <span>Español</span>
              </button>
              
              <button 
                class="language-btn"
                [class.active]="i18nService.currentLanguage() === 'ja'"
                (click)="setLanguage('ja')">
                <span class="flag">🇯🇵</span>
                <span>日本語</span>
              </button>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <!-- Theme Section -->
          <div class="settings-section">
            <h3>🎨 Theme / Tema / テーマ</h3>
            
            <div class="theme-options">
              @for (theme of availableThemes; track theme.id) {
                <button 
                  class="theme-btn"
                  [class.active]="themeService.currentTheme() === theme.id"
                  (click)="setTheme(theme.id)">
                  <span class="theme-preview" [attr.data-theme]="theme.id"></span>
                  <span>{{ theme.name }}</span>
                </button>
              }
            </div>
          </div>
          
          <div class="divider"></div>
          
          <!-- Info Section -->
          <div class="settings-section info-section">
            <h3>ℹ️ About</h3>
            <p><strong>Ditheroid</strong></p>
            <p>Version 1.0.0</p>
            <p>Advanced creative error diffusion editor</p>
            <p class="credits">Made with 💚 by the community</p>
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="btn-primary" (click)="close()">
            {{ i18nService.t('button.apply') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .settings-modal {
      background: var(--theme-surface, #1a2d1a);
      border: 2px solid var(--theme-border, #00ff00);
      width: 90vw;
      max-width: 600px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 30px var(--theme-shadow-color, rgba(0, 255, 0, 0.3));
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(145deg, var(--theme-surface, #1a2d1a) 0%, var(--theme-background, #0f1f0f) 100%);
      border-bottom: 2px solid var(--theme-border, #00ff00);
    }
    
    .settings-header h2 {
      margin: 0;
      font-size: 18px;
      color: var(--theme-primary, #00ff00);
      text-shadow: 0 0 10px var(--theme-glow-color, rgba(0, 255, 0, 0.6));
      font-family: 'Press Start 2P', monospace;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: var(--theme-danger, #ff6666);
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    
    .close-btn:hover {
      transform: scale(1.2);
    }
    
    .settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    .settings-section {
      margin-bottom: 24px;
    }
    
    .settings-section h3 {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: var(--theme-primary, #00ff00);
      font-family: 'Press Start 2P', monospace;
    }
    
    .language-options,
    .theme-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .language-btn,
    .theme-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid var(--theme-border, #00ff00);
      color: var(--theme-text, #00ff00);
      cursor: pointer;
      transition: all 0.2s;
      font-family: 'Press Start 2P', monospace;
      font-size: 11px;
    }
    
    .language-btn:hover,
    .theme-btn:hover {
      background: rgba(0, 255, 0, 0.1);
      box-shadow: 0 0 15px var(--theme-shadow-color, rgba(0, 255, 0, 0.3));
    }
    
    .language-btn.active,
    .theme-btn.active {
      background: linear-gradient(145deg, rgba(0, 255, 0, 0.2) 0%, rgba(0, 255, 0, 0.1) 100%);
      border-color: var(--theme-accent, #00ffcc);
      box-shadow: 0 0 20px var(--theme-accent-glow, rgba(0, 255, 204, 0.5));
    }
    
    .flag {
      font-size: 24px;
    }
    
    .theme-preview {
      width: 24px;
      height: 24px;
      border: 2px solid var(--theme-border, #00ff00);
      border-radius: 2px;
    }
    
    .theme-preview[data-theme="retro-green"] {
      background: linear-gradient(135deg, #00ff00 0%, #90ee90 100%);
    }
    
    .theme-preview[data-theme="retro-amber"] {
      background: linear-gradient(135deg, #ffaa00 0%, #ffcc66 100%);
    }
    
    .theme-preview[data-theme="win98"] {
      background: linear-gradient(135deg, #000080 0%, #0000aa 100%);
    }
    
    .theme-preview[data-theme="cyberpunk"] {
      background: linear-gradient(135deg, #ff00ff 0%, #00ffff 100%);
    }
    
    .theme-preview[data-theme="vaporwave"] {
      background: linear-gradient(135deg, #ff6ad5 0%, #00d4ff 100%);
    }
    
    .divider {
      height: 1px;
      background: var(--theme-border, #00ff00);
      opacity: 0.3;
      margin: 24px 0;
    }
    
    .info-section {
      text-align: center;
      color: var(--theme-text-secondary, rgba(0, 255, 0, 0.6));
      font-size: 10px;
      font-family: 'Courier New', monospace;
    }
    
    .info-section p {
      margin: 8px 0;
    }
    
    .info-section strong {
      color: var(--theme-primary, #00ff00);
      font-size: 12px;
    }
    
    .credits {
      margin-top: 16px !important;
      font-style: italic;
    }
    
    .settings-footer {
      padding: 16px 20px;
      border-top: 2px solid var(--theme-border, #00ff00);
      display: flex;
      justify-content: center;
    }
    
    .btn-primary {
      padding: 12px 24px;
      background: linear-gradient(180deg, var(--theme-primary, #00ff00) 0%, var(--theme-secondary, #90ee90) 100%);
      border: 2px solid var(--theme-border, #00ff00);
      color: var(--theme-background, #0f1f0f);
      cursor: pointer;
      font-family: 'Press Start 2P', monospace;
      font-size: 11px;
      transition: all 0.2s;
      box-shadow: 0 0 10px var(--theme-shadow-color, rgba(0, 255, 0, 0.3));
    }
    
    .btn-primary:hover {
      box-shadow: 0 0 20px var(--theme-glow-color, rgba(0, 255, 0, 0.6));
      transform: translateY(-2px);
    }
    
    .btn-primary:active {
      transform: translateY(0);
    }
  `]
})
export class SettingsComponent {
  @Output() closed = new EventEmitter<void>();
  
  i18nService = inject(I18nService);
  themeService = inject(ThemeService);
  
  availableThemes = this.themeService.getAvailableThemes();
  
  setLanguage(lang: Language): void {
    this.i18nService.setLanguage(lang);
  }
  
  setTheme(themeId: ThemeId): void {
    this.themeService.setTheme(themeId);
  }
  
  close(): void {
    this.closed.emit();
  }
}
