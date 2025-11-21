import { Component, signal, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface GifAdvancedSettings {
  frameCount: number;
  frameDelay: number;
  loopCount: number;
}

@Component({
  selector: 'app-gif-advanced-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-window" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>⚙️ Advanced GIF Settings</h3>
          <button class="btn-close" (click)="onCancel()">✕</button>
        </div>

        <div class="modal-body">
          <!-- Frame Count -->
          <div class="control-group">
            <label class="control-label">
              <span class="control-name">📊 Frame Count</span>
              <span class="control-value">{{ settings().frameCount }} frames</span>
            </label>
            <input type="range" min="5" max="60" step="5" class="slider" 
                   [(ngModel)]="localSettings.frameCount"
                   title="Number of frames in the animation">
            <div class="slider-values">
              <span>5</span>
              <span>60</span>
            </div>
            <div class="control-hint">More frames = smoother animation (but larger file)</div>
          </div>

          <!-- Frame Delay (en ms) -->
          <div class="control-group">
            <label class="control-label">
              <span class="control-name">⏱️ Frame Delay</span>
              <span class="control-value">{{ localSettings.frameDelay }} ms/frame</span>
            </label>
            <input type="range" min="20" max="500" step="10" class="slider" 
                   [(ngModel)]="localSettings.frameDelay"
                   title="Duration of each frame in milliseconds">
            <div class="slider-values">
              <span>20ms</span>
              <span>500ms</span>
            </div>
            <div class="control-hint">
              <span class="fps-display">{{ getFPS() }} FPS</span> • 
              <span class="duration-display">Total: {{ getTotalDuration() }}s</span>
            </div>
          </div>

          <!-- Animation Info Display -->
          <div class="animation-info-box">
            <div class="info-row">
              <span class="info-label">🎞️ Animation:</span>
              <span class="info-value">{{ localSettings.frameCount }} frames × {{ localSettings.frameDelay }}ms</span>
            </div>
            <div class="info-row">
              <span class="info-label">⚡ Speed:</span>
              <span class="info-value">{{ getFPS() }} FPS</span>
            </div>
            <div class="info-row">
              <span class="info-label">⏲️ Duration:</span>
              <span class="info-value">{{ getTotalDuration() }}s per loop</span>
            </div>
          </div>

          <!-- Loop Count -->
          <div class="control-group">
            <label class="control-label">
              <span class="control-name">🔁 Loop Mode</span>
            </label>
            <select class="select-input" [(ngModel)]="localSettings.loopCount">
              <option [value]="0">♾️ Loop Forever (Seamless)</option>
              <option [value]="-1">🔚 Play Once (No Loop)</option>
              <option [value]="2">↻ Loop 2 times</option>
              <option [value]="3">↻ Loop 3 times</option>
              <option [value]="5">↻ Loop 5 times</option>
              <option [value]="10">↻ Loop 10 times</option>
            </select>
            <div class="control-hint">How many times the GIF repeats</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="onCancel()">Cancel</button>
          <button class="btn-primary" (click)="onApply()">Apply Settings</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-in;
      user-select: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-window {
      background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
      border: 2px solid #00ff41;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 255, 65, 0.3);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      background: linear-gradient(145deg, #1a1a1a, #0a0a0a);
      border-bottom: 1px solid #00ff41;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #00ff41;
      text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #ff4444;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-close:hover {
      color: #ff0000;
      transform: rotate(90deg);
    }

    .modal-body {
      padding: 24px 20px;
      overflow-y: auto;
      flex: 1;
    }

    .control-group {
      margin-bottom: 24px;
    }

    .control-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .control-name {
      color: #00ff41;
      font-weight: 600;
    }

    .control-value {
      color: #888;
      font-size: 12px;
      background: rgba(0, 255, 65, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      outline: none;
      appearance: none;
      cursor: pointer;
    }

    .slider::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #00ff41;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
      transition: all 0.2s;
    }

    .slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 15px rgba(0, 255, 65, 0.8);
    }

    .slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #00ff41;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
      transition: all 0.2s;
    }

    .slider::-moz-range-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 15px rgba(0, 255, 65, 0.8);
    }

    .slider-values {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    .control-hint {
      font-size: 11px;
      color: #666;
      margin-top: 6px;
      font-style: italic;
    }

    .fps-display, .duration-display {
      color: #00ff41;
      font-weight: 600;
    }

    .select-input {
      width: 100%;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(0, 255, 65, 0.3);
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      max-height: 300px;
      overflow-y: auto;
    }

    .select-input:hover {
      border-color: rgba(0, 255, 65, 0.5);
      background: rgba(255, 255, 255, 0.08);
    }

    .select-input:focus {
      outline: none;
      border-color: #00ff41;
      box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
    }

    .animation-info-box {
      background: rgba(0, 255, 65, 0.05);
      border: 1px solid rgba(0, 255, 65, 0.2);
      border-radius: 6px;
      padding: 12px;
      margin: 16px 0;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }

    .info-row:not(:last-child) {
      border-bottom: 1px solid rgba(0, 255, 65, 0.1);
    }

    .info-label {
      color: #888;
      font-size: 13px;
    }

    .info-value {
      color: #00ff41;
      font-weight: 600;
      font-size: 13px;
    }

    .modal-footer {
      border-top: 1px solid rgba(0, 255, 65, 0.2);
      padding: 16px 20px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      background: rgba(0, 0, 0, 0.3);
    }

    .btn-secondary, .btn-primary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ccc;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .btn-primary {
      background: linear-gradient(145deg, #00ff41, #00cc33);
      color: #000;
      box-shadow: 0 4px 12px rgba(0, 255, 65, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 255, 65, 0.5);
    }

    .btn-primary:active {
      transform: translateY(0);
    }
  `]
})
export class GifAdvancedSettingsComponent implements OnInit {
  settings = input.required<GifAdvancedSettings>();
  settingsChange = output<GifAdvancedSettings>();
  cancel = output<void>();

  localSettings: GifAdvancedSettings = {
    frameCount: 20,
    frameDelay: 100,
    loopCount: 0
  };

  ngOnInit() {
    // Initialize local copy of settings
    this.localSettings = { ...this.settings() };
  }

  getFPS(): number {
    return Math.round(1000 / this.localSettings.frameDelay);
  }

  getTotalDuration(): number {
    return ((this.localSettings.frameCount * this.localSettings.frameDelay) / 1000).toFixed(2) as any;
  }

  onApply(): void {
    this.settingsChange.emit(this.localSettings);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
