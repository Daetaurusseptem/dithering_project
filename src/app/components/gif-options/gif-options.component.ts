import { Component, signal, output, input, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface GifEffectOptions {
  effectType: 'scanline' | 'vhs' | 'noise' | 'phosphor' | 'rgb-split' | 'motion-sense';
  frameCount: number;
  fps: number;
  intensity: number;
  addPulse: boolean;
  addGlitch: boolean;
  quality: number; // 1-30, 1 = Best, 30 = Worst
  loopCount: number; // 0 = infinito, -1 = no loop, n = n veces
}

@Component({
  selector: 'app-gif-options',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="amiga-case">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
          <h2>
            <span class="header-icon">🎬</span>
            <span class="header-text">GIF ANIMATION</span>
            <span class="header-kanji">動画生成</span>
          </h2>
          <button class="close-btn" (click)="onCancel()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="layout-grid">
            <!-- Left side: Options -->
            <div class="options-panel">
              <div class="options-grid">
            <!-- Effect Type -->
            <div class="option-group">
              <label class="option-label">
                <span class="label-icon">🎨</span>
                <span class="label-text">Effect Type</span>
                <span class="label-kanji">効果選択</span>
              </label>
              <select [(ngModel)]="options.effectType" (ngModelChange)="onOptionsChange()" class="select-input">
                <option value="scanline">📺 CRT Scanline</option>
                <option value="vhs">📼 VHS Glitch</option>
                <option value="noise">🎞️ Film Noise</option>
                <option value="phosphor">💚 Phosphor Decay</option>
                <option value="rgb-split">🌈 RGB Split</option>
                <option value="motion-sense">🌀 Motion Sense</option>
              </select>
              <p class="option-description">{{ getEffectDescription() }}</p>
            </div>

            <!-- Frame Count -->
            <div class="option-group">
              <label class="option-label">
                <span class="label-icon">🎞️</span>
                <span class="label-text">Frame Count</span>
                <span class="label-kanji">枚数: {{ options.frameCount }}</span>
              </label>
              <input type="range" min="5" max="40" step="5" 
                [(ngModel)]="options.frameCount" (ngModelChange)="onOptionsChange()" class="slider">
              <div class="slider-info">
                <span>5</span>
                <span class="current-value">{{ options.frameCount }}</span>
                <span>40</span>
              </div>
            </div>

            <!-- FPS -->
            <div class="option-group">
              <label class="option-label">
                <span class="label-icon">⚡</span>
                <span class="label-text">Speed (FPS)</span>
                <span class="label-kanji">速度: {{ options.fps }}</span>
              </label>
              <input type="range" min="5" max="30" step="5" 
                [(ngModel)]="options.fps" (ngModelChange)="onOptionsChange()" class="slider">
              <div class="slider-info">
                <span>Slow</span>
                <span class="current-value">{{ options.fps }}</span>
                <span>Fast</span>
              </div>
            </div>

            <!-- Intensity -->
            <div class="option-group">
              <label class="option-label">
                <span class="label-icon">💫</span>
                <span class="label-text">Intensity</span>
                <span class="label-kanji">強度: {{ (options.intensity * 100).toFixed(0) }}%</span>
              </label>
              <input type="range" min="0.1" max="1.0" step="0.1" 
                [(ngModel)]="options.intensity" (ngModelChange)="onOptionsChange()" class="slider">
              <div class="slider-info">
                <span>Subtle</span>
                <span class="current-value">{{ (options.intensity * 100).toFixed(0) }}%</span>
                <span>Intense</span>
              </div>
            </div>

            <!-- Quality (GIF) -->
            <div class="option-group">
              <label class="option-label">
                <span class="label-icon">💎</span>
                <span class="label-text">Quality</span>
                <span class="label-kanji">品質: {{ options.quality }}</span>
              </label>
              <input type="range" min="1" max="30" step="1" 
                [(ngModel)]="options.quality" (ngModelChange)="onOptionsChange()" class="slider"
                style="direction: rtl"> <!-- RTL because 1 is best, 30 is worst -->
              <div class="slider-info">
                <span>Low Size</span>
                <span class="current-value">{{ options.quality < 11 ? 'High' : (options.quality < 21 ? 'Med' : 'Low') }}</span>
                <span>High Quality</span>
              </div>
            </div>

            <!-- Loop Count -->
            <div class="option-group">
              <label class="option-label">
                <span class="label-icon">🔁</span>
                <span class="label-text">Loop Behavior</span>
                <span class="label-kanji">繰返設定</span>
              </label>
              <select [(ngModel)]="options.loopCount" class="select-input">
                <option [value]="0">♾️ Loop Forever</option>
                <option [value]="-1">🔚 Play Once</option>
                <option [value]="2">2️⃣ Loop 2 Times</option>
                <option [value]="3">3️⃣ Loop 3 Times</option>
                <option [value]="5">5️⃣ Loop 5 Times</option>
              </select>
            </div>

            <!-- Additional Effects -->
            <div class="option-group">
              <label class="option-label">
                <span class="label-icon">✨</span>
                <span class="label-text">Additional Effects</span>
                <span class="label-kanji">追加効果</span>
              </label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="options.addPulse">
                  <span class="checkbox-icon">💓</span>
                  <span>Add Pulse Effect</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="options.addGlitch">
                  <span class="checkbox-icon">⚡</span>
                  <span>Random Glitches</span>
                </label>
              </div>
            </div>

            <!-- Preview Info -->
            <div class="preview-info">
              <h3><span class="info-icon">📊</span> PREVIEW INFO <span class="info-kanji">情報</span></h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Duration</span>
                  <span class="info-value">{{ getDuration() }}s</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Frames</span>
                  <span class="info-value">{{ options.frameCount }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Frame Time</span>
                  <span class="info-value">{{ getFrameTime() }}ms</span>
                </div>
                <div class="info-item">
                  <span class="info-label">File Size</span>
                  <span class="info-value">{{ getEstimatedSize() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

            <!-- Right side: Preview -->
            <div class="preview-panel">
              <div class="preview-header">
                <span class="preview-icon">👁️</span>
                <span>PREVIEW</span>
                <span class="preview-kanji">予告</span>
              </div>
              <div class="preview-container">
                <div class="preview-screen">
                  @if (getCurrentPreviewFrame()) {
                    <img [src]="getCurrentPreviewFrame()" 
                         alt="Preview" 
                         class="preview-image"
                         [style.animation-duration]="(1 / options.fps) + 's'">
                  } @else {
                    <div class="preview-placeholder">
                      <span class="placeholder-icon">🎬</span>
                      <span class="placeholder-text">Loading preview...</span>
                    </div>
                  }
                  <div class="preview-scanlines"></div>
                </div>
                <div class="preview-label">
                  <span>{{ getEffectName() }}</span>
                  <span class="preview-fps">{{ options.fps }} FPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button class="btn-preset" (click)="usePreset('fast')">⚡ Fast</button>
          <button class="btn-preset" (click)="usePreset('smooth')">🎬 Smooth</button>
          <button class="btn-preset" (click)="usePreset('retro')">👾 Retro</button>
          <button class="btn-generate" (click)="onGenerate()">🎨 Generate GIF</button>
        </div>
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
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Amiga Plastic Case */
    .amiga-case {
      background: linear-gradient(145deg, #e8e4d8 0%, #d4d0c4 100%);
      border: 8px solid #c8c4b8;
      border-radius: 16px;
      padding: 12px;
      box-shadow: 
        inset 3px 3px 6px rgba(255, 255, 255, 0.8),
        inset -3px -3px 6px rgba(0, 0, 0, 0.2),
        0 8px 32px rgba(0, 0, 0, 0.6),
        0 16px 64px rgba(0, 0, 0, 0.4);
      position: relative;
      max-width: 1000px;
      width: 92%;
      max-height: 92vh;
    }

    .amiga-case::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      height: 4px;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(255, 102, 0, 0.3) 20%, 
        rgba(255, 102, 0, 0.5) 50%, 
        rgba(255, 102, 0, 0.3) 80%, 
        transparent 100%);
      border-radius: 2px;
    }

    .amiga-case::after {
      content: 'amiga';
      position: absolute;
      bottom: 16px;
      right: 24px;
      color: #ff6600;
      font-size: 0.7rem;
      font-weight: bold;
      font-style: italic;
      opacity: 0.4;
      letter-spacing: 2px;
    }

    .modal-content {
      background: #0a0a0a;
      border: 4px solid #00ff00;
      border-radius: 0;
      max-width: 700px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 
        inset 0 0 20px rgba(0, 255, 0, 0.3),
        0 0 30px rgba(0, 255, 0, 0.5),
        0 0 60px rgba(0, 255, 0, 0.3);
      position: relative;
    }

    /* Scanline effect */
    .modal-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 255, 0, 0.03) 0px,
        transparent 1px,
        transparent 2px,
        rgba(0, 255, 0, 0.03) 3px
      );
      pointer-events: none;
      z-index: 1;
      animation: scanline-move 8s linear infinite;
    }

    @keyframes scanline-move {
      0% { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }

    .modal-header {
      background: linear-gradient(145deg, #003300 0%, #001100 100%);
      padding: 1rem 1.5rem;
      border-bottom: 3px solid #00ff00;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 2;
    }

    .modal-header h2 {
      margin: 0;
      color: #00ff00;
      font-size: 1.2rem;
      text-shadow: 
        0 0 10px rgba(0, 255, 0, 0.8),
        0 0 20px rgba(0, 255, 0, 0.6),
        2px 2px 2px rgba(0, 0, 0, 0.8);
      font-family: 'Courier New', monospace;
      letter-spacing: 3px;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-icon {
      filter: drop-shadow(0 0 5px rgba(0, 255, 0, 0.8));
    }

    .header-text {
      flex: 1;
    }

    .header-kanji {
      color: #ff0000;
      font-size: 0.9rem;
      text-shadow: 
        0 0 10px rgba(255, 0, 0, 0.8),
        0 0 20px rgba(255, 0, 0, 0.6),
        2px 2px 2px rgba(0, 0, 0, 0.8);
      letter-spacing: 2px;
    }

    .close-btn {
      background: transparent;
      border: 2px solid #00ff00;
      color: #00ff00;
      font-size: 20px;
      width: 32px;
      height: 32px;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
    }

    .close-btn:hover {
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.6);
    }

    .modal-body {
      padding: 1.5rem;
      position: relative;
      z-index: 2;
      overflow-y: auto;
      max-height: calc(92vh - 200px);
    }

    .layout-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 1.5rem;
    }

    .options-panel {
      overflow-y: auto;
      max-height: calc(92vh - 250px);
      padding-right: 0.5rem;
    }

    .options-panel::-webkit-scrollbar {
      width: 8px;
    }

    .options-panel::-webkit-scrollbar-track {
      background: rgba(0, 50, 0, 0.2);
      border: 1px solid rgba(0, 255, 0, 0.3);
    }

    .options-panel::-webkit-scrollbar-thumb {
      background: #00ff00;
      box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
    }

    .options-panel::-webkit-scrollbar-thumb:hover {
      background: #00ff00;
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
    }

    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .option-group {
      background: rgba(0, 50, 0, 0.3);
      padding: 1rem;
      border: 2px solid rgba(0, 255, 0, 0.3);
      border-radius: 0;
      box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1);
    }

    .option-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: bold;
      margin-bottom: 0.75rem;
      color: #00ff00;
      font-size: 0.95rem;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.6);
      flex-wrap: wrap;
    }

    .label-icon {
      filter: drop-shadow(0 0 3px rgba(0, 255, 0, 0.8));
    }

    .label-text {
      flex: 1;
    }

    .label-kanji {
      color: #ff0000;
      font-size: 0.85rem;
      text-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
      letter-spacing: 1px;
    }

    .select-input {
      width: 100%;
      padding: 0.6rem;
      border: 2px solid #00ff00;
      border-radius: 0;
      background: #001100;
      color: #00ff00;
      font-size: 0.9rem;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.2);
      text-shadow: 0 0 3px rgba(0, 255, 0, 0.6);
    }

    .select-input:focus {
      outline: none;
      border-color: #00ff00;
      box-shadow: 
        inset 0 0 10px rgba(0, 255, 0, 0.2),
        0 0 10px rgba(0, 255, 0, 0.5);
    }

    .select-input option {
      background: #001100;
      color: #00ff00;
    }

    .option-description {
      margin: 0.5rem 0 0 0;
      font-size: 0.8rem;
      color: #00aa00;
      font-style: italic;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 3px rgba(0, 255, 0, 0.4);
    }

    .slider {
      width: 100%;
      height: 6px;
      border-radius: 0;
      background: linear-gradient(90deg, #003300 0%, #00ff00 100%);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      border: 1px solid #00ff00;
      box-shadow: 
        inset 0 0 5px rgba(0, 0, 0, 0.5),
        0 0 5px rgba(0, 255, 0, 0.3);
      cursor: pointer;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 0;
      background: #00ff00;
      cursor: pointer;
      box-shadow: 
        0 0 10px rgba(0, 255, 0, 0.8),
        inset 0 0 3px rgba(255, 255, 255, 0.5);
      border: 2px solid #003300;
    }

    .slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 0;
      background: #00ff00;
      cursor: pointer;
      box-shadow: 
        0 0 10px rgba(0, 255, 0, 0.8),
        inset 0 0 3px rgba(255, 255, 255, 0.5);
      border: 2px solid #003300;
    }

    .slider-info {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #00aa00;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 3px rgba(0, 255, 0, 0.4);
    }

    .current-value {
      color: #00ff00;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0;
      transition: background 0.2s;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 3px rgba(0, 255, 0, 0.6);
    }

    .checkbox-label:hover {
      background: rgba(0, 255, 0, 0.1);
      box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.2);
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #00ff00;
    }

    .checkbox-icon {
      filter: drop-shadow(0 0 3px rgba(0, 255, 0, 0.8));
    }

    .preview-info {
      background: linear-gradient(145deg, #001100 0%, #000800 100%);
      padding: 1rem;
      border-radius: 0;
      border: 2px solid #00ff00;
      box-shadow: 
        inset 0 0 15px rgba(0, 255, 0, 0.2),
        0 0 10px rgba(0, 255, 0, 0.3);
    }

    .preview-info h3 {
      margin: 0 0 1rem 0;
      color: #00ff00;
      font-size: 1rem;
      font-family: 'Courier New', monospace;
      text-shadow: 
        0 0 10px rgba(0, 255, 0, 0.8),
        0 0 20px rgba(0, 255, 0, 0.6);
      letter-spacing: 2px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .info-icon {
      filter: drop-shadow(0 0 5px rgba(0, 255, 0, 0.8));
    }

    .info-kanji {
      color: #ff0000;
      font-size: 0.9rem;
      margin-left: auto;
      text-shadow: 
        0 0 10px rgba(255, 0, 0, 0.8),
        0 0 20px rgba(255, 0, 0, 0.6);
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      background: rgba(0, 50, 0, 0.3);
      border-radius: 0;
      border: 1px solid rgba(0, 255, 0, 0.3);
      box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
    }

    .info-label {
      font-weight: bold;
      color: #00aa00;
      font-size: 0.85rem;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 3px rgba(0, 255, 0, 0.4);
    }

    .info-value {
      color: #00ff00;
      font-weight: bold;
      font-size: 0.85rem;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
    }

    /* Preview Panel */
    .preview-panel {
      position: sticky;
      top: 0;
      height: fit-content;
    }

    .preview-header {
      background: linear-gradient(145deg, #003300 0%, #001100 100%);
      padding: 0.75rem 1rem;
      border: 2px solid #00ff00;
      border-bottom: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
      font-size: 0.9rem;
    }

    .preview-icon {
      filter: drop-shadow(0 0 5px rgba(0, 255, 0, 0.8));
    }

    .preview-kanji {
      color: #ff0000;
      margin-left: auto;
      text-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
    }

    .preview-container {
      background: rgba(0, 50, 0, 0.3);
      border: 2px solid #00ff00;
      border-top: none;
      padding: 1rem;
    }

    .preview-screen {
      position: relative;
      width: 100%;
      aspect-ratio: 4/3;
      background: #000;
      border: 3px solid #00ff00;
      overflow: hidden;
      box-shadow: 
        inset 0 0 20px rgba(0, 255, 0, 0.2),
        0 0 15px rgba(0, 255, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
      filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.3));
    }

    .preview-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
    }

    .placeholder-icon {
      font-size: 4rem;
      animation: pulse 2s ease-in-out infinite;
    }

    .placeholder-text {
      font-size: 1rem;
      letter-spacing: 2px;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.2); filter: brightness(1.5); }
    }

    .preview-scanlines {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 255, 0, 0.05) 0px,
        transparent 1px,
        transparent 2px,
        rgba(0, 255, 0, 0.05) 3px
      );
      pointer-events: none;
    }

    .preview-label {
      margin-top: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
    }

    .preview-fps {
      color: #ff0000;
      text-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 3px solid #00ff00;
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      flex-wrap: wrap;
      background: linear-gradient(145deg, #001100 0%, #000800 100%);
      position: relative;
      z-index: 2;
    }

    .modal-footer button {
      padding: 0.6rem 1.2rem;
      border: 2px solid #00ff00;
      border-radius: 0;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 
        inset 0 0 5px rgba(0, 255, 0, 0.2),
        0 0 10px rgba(0, 255, 0, 0.3);
      font-size: 0.9rem;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 5px currentColor;
    }

    .btn-cancel {
      background: #111;
      color: #ff0000;
      border-color: #ff0000;
      box-shadow: 
        inset 0 0 5px rgba(255, 0, 0, 0.2),
        0 0 10px rgba(255, 0, 0, 0.3);
      text-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
    }

    .btn-cancel:hover {
      background: rgba(255, 0, 0, 0.1);
      box-shadow: 
        inset 0 0 10px rgba(255, 0, 0, 0.3),
        0 0 15px rgba(255, 0, 0, 0.5);
    }

    .btn-preset {
      background: #001100;
      color: #00ff00;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
    }

    .btn-preset:hover {
      background: rgba(0, 255, 0, 0.1);
      box-shadow: 
        inset 0 0 10px rgba(0, 255, 0, 0.3),
        0 0 15px rgba(0, 255, 0, 0.5);
    }

    .btn-generate {
      background: #003300;
      color: #00ff00;
      flex-grow: 1;
      text-shadow: 0 0 8px rgba(0, 255, 0, 0.8);
      animation: pulse-glow 2s ease-in-out infinite;
    }

    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 
          inset 0 0 5px rgba(0, 255, 0, 0.2),
          0 0 10px rgba(0, 255, 0, 0.3);
      }
      50% {
        box-shadow: 
          inset 0 0 10px rgba(0, 255, 0, 0.4),
          0 0 20px rgba(0, 255, 0, 0.6);
      }
    }

    .btn-generate:hover {
      background: rgba(0, 255, 0, 0.2);
      transform: translateY(-1px);
      box-shadow: 
        inset 0 0 15px rgba(0, 255, 0, 0.4),
        0 0 25px rgba(0, 255, 0, 0.7);
    }

    .modal-footer button:active {
      transform: translateY(0);
    }

    @media (max-width: 968px) {
      .layout-grid {
        grid-template-columns: 1fr;
      }

      .preview-panel {
        position: relative;
        order: -1;
      }

      .options-panel {
        max-height: none;
      }
    }

    @media (max-width: 768px) {
      .amiga-case {
        width: 95%;
        padding: 8px;
      }

      .modal-content {
        width: 95%;
        max-height: 95vh;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .modal-footer {
        flex-direction: column;
      }

      .modal-footer button {
        width: 100%;
      }

      .header-kanji {
        font-size: 0.75rem;
      }

      .preview-screen {
        aspect-ratio: 3/2;
      }
    }
  `]
})
export class GifOptionsComponent implements OnInit, OnDestroy {
  close = output<void>();
  generate = output<GifEffectOptions>();
  previewFrameUpdate = output<string>(); // Emite el frame actual para sincronizar con el panel derecho

  imageData = input<ImageData | null>(null);

  options: GifEffectOptions = {
    effectType: 'scanline',
    frameCount: 20,
    fps: 15,
    intensity: 0.5,
    addPulse: true,
    addGlitch: false,
    quality: 10,
    loopCount: 0
  };

  previewFrames: string[] = [];
  currentPreviewFrame = signal(0);
  previewInterval: any = null;

  // Debounce timer for slider changes
  private optionsChangeTimer: any = null;
  private readonly DEBOUNCE_DELAY = 500; // 500ms delay

  constructor() {
    // Regenerar preview cuando cambian las opciones
    effect(() => {
      if (this.imageData()) {
        this.generatePreview();
      }
    });
  }

  ngOnInit() {
    this.generatePreview();
    this.startPreviewAnimation();
  }

  ngOnDestroy() {
    this.stopPreviewAnimation();

    // Clear debounce timer
    if (this.optionsChangeTimer) {
      clearTimeout(this.optionsChangeTimer);
      this.optionsChangeTimer = null;
    }
  }

  startPreviewAnimation() {
    this.stopPreviewAnimation();
    // Emitir el primer frame inmediatamente
    if (this.previewFrames.length > 0) {
      this.previewFrameUpdate.emit(this.previewFrames[0]);
    }

    this.previewInterval = setInterval(() => {
      if (this.previewFrames.length > 0) {
        this.currentPreviewFrame.set((this.currentPreviewFrame() + 1) % this.previewFrames.length);
        // Emitir el frame actualizado para sincronizar con el canvas derecho
        this.previewFrameUpdate.emit(this.previewFrames[this.currentPreviewFrame()]);
      }
    }, 1000 / this.options.fps);
  }

  stopPreviewAnimation() {
    if (this.previewInterval) {
      clearInterval(this.previewInterval);
      this.previewInterval = null;
    }
  }

  generatePreview() {
    const imgData = this.imageData();
    if (!imgData) return;

    this.stopPreviewAnimation();
    this.previewFrames = [];

    // Generar 3-5 frames para el preview
    const previewFrameCount = Math.min(5, this.options.frameCount);

    for (let i = 0; i < previewFrameCount; i++) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = imgData.width;
      frameCanvas.height = imgData.height;
      const ctx = frameCanvas.getContext('2d')!;

      // Aplicar el efecto específico
      this.applyEffectToFrame(ctx, imgData, i, previewFrameCount);

      // Convertir a base64
      this.previewFrames.push(frameCanvas.toDataURL());
    }

    this.currentPreviewFrame.set(0);
    this.startPreviewAnimation();
  }

  applyEffectToFrame(ctx: CanvasRenderingContext2D, imageData: ImageData, frameIndex: number, totalFrames: number) {
    const phase = (frameIndex / totalFrames) * Math.PI * 2;

    switch (this.options.effectType) {
      case 'scanline':
        ctx.putImageData(imageData, 0, 0);
        // Línea de scanline
        const scanlineY = (frameIndex / totalFrames) * imageData.height;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(0, scanlineY, imageData.width, 4);
        break;

      case 'vhs':
        const glitchOffset = Math.sin(phase) * this.options.intensity * 10;
        ctx.putImageData(imageData, glitchOffset, 0);
        break;

      case 'noise':
        ctx.putImageData(imageData, 0, 0);
        const noiseData = ctx.getImageData(0, 0, imageData.width, imageData.height);
        for (let i = 0; i < noiseData.data.length; i += 4) {
          const noise = (Math.random() - 0.5) * this.options.intensity * 50;
          noiseData.data[i] += noise;
          noiseData.data[i + 1] += noise;
          noiseData.data[i + 2] += noise;
        }
        ctx.putImageData(noiseData, 0, 0);
        break;

      case 'phosphor':
        ctx.putImageData(imageData, 0, 0);
        const phosphorData = ctx.getImageData(0, 0, imageData.width, imageData.height);
        const intensity = 0.5 + Math.sin(phase) * 0.5 * this.options.intensity;
        for (let i = 0; i < phosphorData.data.length; i += 4) {
          phosphorData.data[i] *= 0.3;
          phosphorData.data[i + 1] *= (1 + intensity * 0.5);
          phosphorData.data[i + 2] *= 0.3;
        }
        ctx.putImageData(phosphorData, 0, 0);
        break;

      case 'rgb-split':
        const offsetX = Math.sin(phase) * this.options.intensity * 5;
        ctx.globalCompositeOperation = 'screen';

        // Canal rojo
        const redData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
        for (let i = 0; i < redData.data.length; i += 4) {
          redData.data[i + 1] = 0;
          redData.data[i + 2] = 0;
        }
        ctx.putImageData(redData, offsetX, 0);

        // Canal cian
        const cyanData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
        for (let i = 0; i < cyanData.data.length; i += 4) {
          cyanData.data[i] = 0;
        }
        ctx.putImageData(cyanData, -offsetX, 0);
        break;

      case 'motion-sense':
        const direction = Math.sin(phase);
        const blurAmount = Math.abs(direction) * this.options.intensity * 3;
        const layers = 3;

        ctx.globalAlpha = 1 / layers;
        for (let layer = 0; layer < layers; layer++) {
          const offset = (layer / layers) * direction * this.options.intensity * 10;
          ctx.filter = `blur(${blurAmount / layers}px)`;
          ctx.putImageData(imageData, offset, 0);
        }
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        break;

      default:
        ctx.putImageData(imageData, 0, 0);
    }
  }

  getCurrentPreviewFrame(): string {
    return this.previewFrames[this.currentPreviewFrame()] || '';
  }

  onOptionsChange() {
    // Clear existing timer
    if (this.optionsChangeTimer) {
      clearTimeout(this.optionsChangeTimer);
    }

    // Set new timer - only regenerate preview after user stops dragging slider
    this.optionsChangeTimer = setTimeout(() => {
      this.generatePreview();
    }, this.DEBOUNCE_DELAY);
  }

  getEffectDescription(): string {
    const descriptions = {
      'scanline': 'Animated horizontal scanline moving vertically, simulating a CRT monitor',
      'vhs': 'Horizontal glitches and distortions like a degraded VHS tape',
      'noise': 'Film grain and random noise like old cinema footage',
      'phosphor': 'Phosphor trail effect simulating CRT screen persistence',
      'rgb-split': 'Chromatic aberration with separated RGB channels',
      'motion-sense': 'Motion blur effect creating sense of movement and speed'
    };
    return descriptions[this.options.effectType];
  }

  getEffectName(): string {
    const names = {
      'scanline': 'CRT SCANLINE',
      'vhs': 'VHS GLITCH',
      'noise': 'FILM NOISE',
      'phosphor': 'PHOSPHOR',
      'rgb-split': 'RGB SPLIT',
      'motion-sense': 'MOTION SENSE'
    };
    return names[this.options.effectType];
  }

  getDuration(): number {
    return Number((this.options.frameCount / this.options.fps).toFixed(1));
  }

  getFrameTime(): number {
    return Math.round(1000 / this.options.fps);
  }

  getEstimatedSize(): string {
    // Estimación básica basada en frames y calidad
    const baseSize = 50; // KB por frame aproximado
    const totalKB = this.options.frameCount * baseSize;
    if (totalKB > 1000) {
      return `~${(totalKB / 1024).toFixed(1)} MB`;
    }
    return `~${Math.round(totalKB)} KB`;
  }

  usePreset(preset: 'fast' | 'smooth' | 'retro') {
    switch (preset) {
      case 'fast':
        this.options = {
          effectType: 'rgb-split',
          frameCount: 10,
          fps: 20,
          intensity: 0.7,
          addPulse: true,
          addGlitch: true,
          loopCount: 0,
          quality: 10
        };
        break;
      case 'smooth':
        this.options = {
          effectType: 'scanline',
          frameCount: 30,
          fps: 25,
          intensity: 0.3,
          addPulse: false,
          addGlitch: false,
          loopCount: 0,
          quality: 10
        };
        break;
      case 'retro':
        this.options = {
          effectType: 'phosphor',
          frameCount: 15,
          fps: 12,
          intensity: 0.6,
          addPulse: true,
          addGlitch: false,
          loopCount: 0,
          quality: 10
        };
        break;
    }
  }

  onCancel() {
    this.close.emit();
  }

  onGenerate() {
    this.generate.emit(this.options);
  }
}
