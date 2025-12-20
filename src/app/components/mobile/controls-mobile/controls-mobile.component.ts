import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ControlsMobileOptions {
  algorithm: string;
  palette: string;
  scale: number;
  contrast: number;
  midtones: number;
  highlights: number;
  blur: number;
  hdMode: boolean;
}

@Component({
  selector: 'app-controls-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="controls-mobile">
      <!-- Collapsible sections -->
      <div class="control-section">
        <button class="section-header" (click)="toggleSection('style')">
          <span class="section-title">🎨 Style</span>
          <span class="chevron" [class.expanded]="expandedSection() === 'style'">▼</span>
        </button>
        
        @if (expandedSection() === 'style') {
          <div class="section-content">
            <div class="control-group">
              <label>Algorithm</label>
              <select [(ngModel)]="localOptions.algorithm" (ngModelChange)="emitChange()">
                @for (alg of algorithms(); track alg.id) {
                  <option [value]="alg.id">{{ alg.name }}</option>
                }
              </select>
            </div>
            
            <div class="control-group">
              <label>Palette</label>
              <select [(ngModel)]="localOptions.palette" (ngModelChange)="emitChange()">
                @for (pal of palettes(); track pal.id) {
                  <option [value]="pal.id">{{ pal.name }}</option>
                }
              </select>
            </div>
          </div>
        }
      </div>

      <div class="control-section">
        <button class="section-header" (click)="toggleSection('size')">
          <span class="section-title">📐 Size & Output</span>
          <span class="chevron" [class.expanded]="expandedSection() === 'size'">▼</span>
        </button>
        
        @if (expandedSection() === 'size') {
          <div class="section-content">
            <div class="control-group">
              <label>Scale: {{ localOptions.scale }}x</label>
              <input type="range" min="1" max="8" 
                     [(ngModel)]="localOptions.scale" 
                     (ngModelChange)="emitChange()">
            </div>
            
            <div class="control-group">
              <label>Blur: {{ localOptions.blur }}</label>
              <input type="range" min="0" max="10" 
                     [(ngModel)]="localOptions.blur" 
                     (ngModelChange)="emitChange()">
            </div>
            
            <div class="control-group checkbox-group">
              <label class="checkbox-container">
                <input type="checkbox" [(ngModel)]="localOptions.hdMode" (ngModelChange)="emitChange()">
                <span class="checkbox-label">HD Mode (Higher Quality)</span>
              </label>
              <small class="helper-text">Large files, slower export</small>
            </div>
          </div>
        }
      </div>

      <div class="control-section">
        <button class="section-header" (click)="toggleSection('adjust')">
          <span class="section-title">🎚️ Adjustments</span>
          <span class="chevron" [class.expanded]="expandedSection() === 'adjust'">▼</span>
        </button>
        
        @if (expandedSection() === 'adjust') {
          <div class="section-content">
            <div class="control-group">
              <label>Contrast: {{ localOptions.contrast }}</label>
              <input type="range" min="0" max="100" 
                     [(ngModel)]="localOptions.contrast" 
                     (ngModelChange)="emitChange()">
            </div>
            
            <div class="control-group">
              <label>Midtones: {{ localOptions.midtones }}</label>
              <input type="range" min="0" max="100" 
                     [(ngModel)]="localOptions.midtones" 
                     (ngModelChange)="emitChange()">
            </div>
            
            <div class="control-group">
              <label>Highlights: {{ localOptions.highlights }}</label>
              <input type="range" min="0" max="100" 
                     [(ngModel)]="localOptions.highlights" 
                     (ngModelChange)="emitChange()">
            </div>
          </div>
        }
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        <button class="btn-action btn-reset" (click)="resetControls()">
          🔄 Reset
        </button>
        <button class="btn-action btn-apply" (click)="applyChanges()">
          ✓ Apply
        </button>
      </div>
    </div>
  `,
  styles: [`
    .controls-mobile {
      background: var(--theme-background, #0a1d0a);
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
    }

    .control-section {
      border-bottom: 1px solid var(--theme-border, rgba(0, 255, 0, 0.2));
    }

    .section-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: var(--theme-surface, #1a2d1a);
      border: none;
      color: var(--theme-primary, #00ff00);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      min-height: 56px;
      -webkit-tap-highlight-color: transparent;
    }

    .section-header:active {
      background: var(--theme-accent, #005500);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .chevron {
      transition: transform 0.3s ease;
      font-size: 0.8rem;
    }

    .chevron.expanded {
      transform: rotate(-180deg);
    }

    .section-content {
      padding: 1rem 1.5rem 1.5rem;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .control-group {
      margin-bottom: 1.5rem;
    }

    .control-group:last-child {
      margin-bottom: 0;
    }

    .control-group label {
      display: block;
      margin-bottom: 0.75rem;
      color: var(--theme-text, #90ee90);
      font-size: 1rem;
      font-weight: 500;
    }

    .control-group select {
      width: 100%;
      min-height: 48px;
      padding: 0 1rem;
      font-size: 1rem;
      background: var(--theme-surface, #1a2d1a);
      border: 2px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      border-radius: 8px;
      color: var(--theme-text, #90ee90);
      cursor: pointer;
    }

    .control-group input[type="range"] {
      width: 100%;
      height: 48px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
    }

    .control-group input[type="range"]::-webkit-slider-track {
      height: 8px;
      background: linear-gradient(90deg, 
        var(--theme-surface, #1a2d1a) 0%, 
        var(--theme-accent, #005500) 100%);
      border-radius: 4px;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
    }

    .control-group input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 32px;
      height: 32px;
      background: var(--theme-primary, #00ff00);
      border: 3px solid var(--theme-background, #0a1d0a);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6),
                  0 0 12px var(--theme-glow-color, rgba(0, 255, 0, 0.6));
    }

    .control-group input[type="range"]::-moz-range-track {
      height: 8px;
      background: linear-gradient(90deg, 
        var(--theme-surface, #1a2d1a) 0%, 
        var(--theme-accent, #005500) 100%);
      border-radius: 4px;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
    }

    .control-group input[type="range"]::-moz-range-thumb {
      width: 32px;
      height: 32px;
      background: var(--theme-primary, #00ff00);
      border: 3px solid var(--theme-background, #0a1d0a);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6),
                  0 0 12px var(--theme-glow-color, rgba(0, 255, 0, 0.6));
    }

    .action-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 1.5rem;
      background: var(--theme-surface, #1a2d1a);
      border-top: 2px solid var(--theme-primary, #00ff00);
      position: sticky;
      bottom: 0;
      z-index: 10;
    }

    .btn-action {
      min-height: 56px;
      font-size: 1.1rem;
      font-weight: 600;
      border: 2px solid var(--theme-primary, #00ff00);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
    }

    .btn-reset {
      background: var(--theme-surface, #1a2d1a);
      color: var(--theme-text, #90ee90);
    }

    .btn-reset:active {
      transform: scale(0.98);
      background: var(--theme-background, #0a1d0a);
    }

    .btn-apply {
      background: linear-gradient(180deg, 
        var(--theme-accent, #005500) 0%,
        var(--theme-surface, #003300) 100%);
      color: var(--theme-primary, #00ff00);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4),
                  0 0 20px var(--theme-glow-color, rgba(0, 255, 0, 0.2));
    }

    .btn-apply:active {
      transform: scale(0.98);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4),
                  0 0 15px var(--theme-glow-color, rgba(0, 255, 0, 0.3));
    }
  `]
})
export class ControlsMobileComponent implements OnInit {
  options = input.required<ControlsMobileOptions>();
  algorithms = input<any[]>([]);
  palettes = input<any[]>([]);

  optionsChange = output<ControlsMobileOptions>();
  reset = output<void>();
  apply = output<void>();

  expandedSection = signal<'style' | 'size' | 'adjust' | null>('style');
  localOptions: ControlsMobileOptions = {
    algorithm: '',
    palette: '',
    scale: 3,
    contrast: 50,
    midtones: 50,
    highlights: 50,
    blur: 0,
    hdMode: false
  };

  ngOnInit(): void {
    // Initialize local copy of options
    this.localOptions = { ...this.options() };
  }

  toggleSection(section: 'style' | 'size' | 'adjust'): void {
    if (this.expandedSection() === section) {
      this.expandedSection.set(null);
    } else {
      this.expandedSection.set(section);
    }
  }

  emitChange(): void {
    this.optionsChange.emit({ ...this.localOptions });
  }

  resetControls(): void {
    this.reset.emit();
  }

  applyChanges(): void {
    this.apply.emit();
  }
}
