import { Component, signal, input, OnInit, OnChanges, OnDestroy, SimpleChanges, inject, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpriteStorageService } from '../../services/sprite-storage.service';
import { WaifuPositionService } from '../../services/waifu-position.service';
import { DialogueService } from '../../services/dialogue.service';
import { WaifuDialogueComponent } from '../waifu-dialogue/waifu-dialogue.component';

export type WaifuState = 'idle' | 'processing' | 'success' | 'error' | 'thinking' | 'happy';
export type WaifuPosition = 'floating-bottom-right' | 'hidden';

@Component({
  selector: 'app-crt-waifu',
  standalone: true,
  imports: [CommonModule, WaifuDialogueComponent],
  template: `
    <div class="crt-monitor" 
         [attr.data-position]="position()"
         [style.transform]="position() === 'floating-bottom-right' ? 'scale(' + scale() + ')' : null"
         (mousedown)="onDragStart($event)"
         [style.left]="position() === 'floating-bottom-right' ? dragPosition().x + 'px' : null"
         [style.top]="position() === 'floating-bottom-right' ? dragPosition().y + 'px' : null">
      
      <!-- Dialogue Component -->
      <app-waifu-dialogue></app-waifu-dialogue>
      
      <div class="crt-frame">
        <!-- Menu button -->
        <button class="menu-btn" (click)="toggleMenu(); $event.stopPropagation()" title="Waifu Settings">
          ⚙️
        </button>
        
        <!-- Settings Menu -->
        @if (showMenu()) {
          <div class="settings-menu" (mousedown)="$event.stopPropagation()">
            <h3>Waifu Settings</h3>
            
            <!-- Sprite Upload Button -->
            <button class="menu-action-btn" (click)="openSpriteUploader(); $event.stopPropagation()">
              🖼️ Change Sprite
            </button>
            
            <h3 style="margin-top: 1rem; font-size: 0.45rem;">Position</h3>
            <label class="radio-option">
              <input type="radio" name="position" value="floating-bottom-right"
                     [checked]="position() === 'floating-bottom-right'"
                     (change)="changePosition('floating-bottom-right')">
              <span>Visible (Draggable)</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="position" value="hidden"
                     [checked]="position() === 'hidden'"
                     (change)="changePosition('hidden')">
              <span>Hidden</span>
            </label>
            
            <!-- Scale control -->
            @if (position() === 'floating-bottom-right') {
              <div class="scale-control">
                <label>Size: {{ (scale() * 100).toFixed(0) }}%</label>
                <input type="range" 
                       min="0.5" 
                       max="1" 
                       step="0.1" 
                       [value]="scale()"
                       (input)="onScaleChange($event)"
                       class="scale-slider">
              </div>
            }
          </div>
        }
        
        <div class="crt-screen" #crtScreen>
          <div class="crt-scanlines"></div>
          
          <!-- Affection Level Display -->
          <div class="affection-display">
            <div class="affection-icon">♥</div>
            <div class="affection-value">{{ affectionLevel() }}</div>
          </div>
          
          <div class="waifu-container">
            @if (spriteSheet()) {
              <div class="sprite-wrapper" [attr.data-state]="currentState()">
                <div class="sprite-frame"
                  [style.background-image]="'url(' + spriteSheet() + ')'"
                  [style.background-position]="getSpritePosition()"
                  [style.background-size]="getSpriteBgSize()">
                </div>
              </div>
            } @else {
              <div class="waifu-frame" [attr.data-state]="currentState()">
                {{ getFrameNumber() }}
              </div>
            }
          </div>
          <div class="crt-glare"></div>
          <div class="crt-green-lines"></div>
        </div>
        <div class="crt-speaker"></div>
      </div>
      <div class="crt-base"></div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
    
    .crt-monitor {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      position: relative;
    }
    
    .crt-monitor[data-position="floating-bottom-right"] {
      position: fixed;
      z-index: 9000;
      padding: 0.5rem;
      transform-origin: top left;
      transition: transform 0.2s ease;
    }
    
    .crt-monitor[data-position="floating-bottom-right"]:active {
      cursor: grabbing;
    }
    
    .crt-monitor[data-position="hidden"] {
      display: none;
    }
    
    /* Menu button - Military Style */
    .menu-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 100;
      background: linear-gradient(145deg, #4a4a4a 0%, #3a3a3a 100%);
      border: 2px solid #5a5a5a;
      border-radius: 4px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 
        inset 0 1px 2px rgba(100, 100, 100, 0.3),
        inset 0 -1px 2px rgba(0, 0, 0, 0.6),
        2px 2px 6px rgba(0, 0, 0, 0.7);
      color: #909090;
    }
    
    .menu-btn:hover {
      background: linear-gradient(145deg, #5a5a5a 0%, #4a4a4a 100%);
      transform: scale(1.05);
      box-shadow: 
        inset 0 1px 2px rgba(120, 120, 120, 0.4),
        inset 0 -1px 2px rgba(0, 0, 0, 0.6),
        0 0 12px var(--theme-glow, rgba(0, 255, 0, 0.3)),
        2px 2px 6px rgba(0, 0, 0, 0.7);
      color: var(--theme-primary, #00ff00);
    }
    
    .menu-btn:active {
      transform: scale(0.98);
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.2));
    }
    
    /* Settings Menu - Military Style */
    .settings-menu {
      position: absolute;
      top: 46px;
      right: 8px;
      z-index: 101;
      background: linear-gradient(145deg, #4a4a4a 0%, #3a3a3a 50%, #2a2a2a 100%);
      border: 3px solid #3a3a3a;
      border-radius: 8px;
      padding: 12px;
      min-width: 200px;
      box-shadow: 
        inset 2px 2px 6px rgba(100, 100, 100, 0.2),
        inset -2px -2px 6px rgba(0, 0, 0, 0.8),
        0 8px 24px rgba(0, 0, 0, 0.8);
      animation: slideIn 0.2s ease-out;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .settings-menu h3 {
      margin: 0 0 10px 0;
      font-size: 0.5rem;
      color: #ff6600;
      text-shadow: 
        0 0 10px rgba(255, 102, 0, 0.6),
        0 0 20px rgba(255, 102, 0, 0.3);
      font-family: 'Press Start 2P', monospace;
      text-align: center;
      border-bottom: 2px solid #ff6600;
      padding-bottom: 6px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    /* Action button for menu actions */
    .menu-action-btn {
      width: 100%;
      padding: 10px;
      margin-bottom: 8px;
      background: linear-gradient(145deg, #2a3d2a 0%, #1a2d1a 100%);
      border: 2px solid var(--theme-primary, #00ff00);
      border-radius: 4px;
      color: var(--theme-primary, #00ff00);
      font-size: 0.6rem;
      font-family: 'Press Start 2P', monospace;
      cursor: pointer;
      transition: all 0.2s ease;
      text-shadow: 0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.6));
      box-shadow: 
        inset 0 1px 2px rgba(60, 100, 60, 0.2),
        inset 0 -1px 2px rgba(0, 0, 0, 0.8),
        0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.2));
    }
    
    .menu-action-btn:hover {
      background: linear-gradient(145deg, #3a4d3a 0%, #2a3d2a 100%);
      transform: translateY(-2px);
      box-shadow: 
        inset 0 1px 2px rgba(80, 120, 80, 0.3),
        inset 0 -1px 2px rgba(0, 0, 0, 0.9),
        0 0 15px var(--theme-glow, rgba(0, 255, 0, 0.4)),
        0 4px 8px rgba(0, 0, 0, 0.6);
      border-color: var(--theme-secondary, #00ff88);
    }
    
    .menu-action-btn:active {
      transform: translateY(0);
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.3));
    }
    
    .radio-option {
      display: flex;
      align-items: center;
      padding: 8px 10px;
      margin: 6px 0;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      background: linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%);
      border: 2px solid #3a3a3a;
      box-shadow: 
        inset 0 1px 2px rgba(60, 60, 60, 0.2),
        inset 0 -1px 2px rgba(0, 0, 0, 0.8);
    }
    
    .radio-option:hover {
      background: linear-gradient(145deg, #3a3a3a 0%, #2a2a2a 100%);
      border-color: var(--theme-primary, #00ff00);
      box-shadow: 
        inset 0 1px 2px rgba(80, 80, 80, 0.3),
        inset 0 -1px 2px rgba(0, 0, 0, 0.8),
        0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.3));
    }
    
    .radio-option input[type="radio"] {
      margin-right: 10px;
      cursor: pointer;
      accent-color: var(--theme-primary, #00ff00);
      width: 16px;
      height: 16px;
    }
    
    .radio-option span {
      font-size: 0.7rem;
      color: #909090;
      font-family: monospace;
      user-select: none;
      letter-spacing: 1px;
    }
    
    .radio-option:has(input:checked) {
      background: linear-gradient(145deg, #2a4a2a 0%, #1a3a1a 100%);
      border-color: var(--theme-primary, #00ff00);
      box-shadow: 
        inset 0 1px 2px var(--theme-glow, rgba(0, 255, 0, 0.2)),
        inset 0 -1px 2px rgba(0, 0, 0, 0.8),
        0 0 12px var(--theme-glow, rgba(0, 255, 0, 0.4));
    }
    
    .radio-option:has(input:checked) span {
      color: var(--theme-primary, #00ff00);
      font-weight: bold;
      text-shadow: 0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.6));
    }
    
    /* Scale Control - Military Style */
    .scale-control {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #4a4a4a;
    }
    
    .scale-control label {
      display: block;
      font-size: 0.65rem;
      color: #909090;
      margin-bottom: 8px;
      text-align: center;
      font-family: monospace;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    
    .scale-control label::before {
      content: '●';
      color: #ff6600;
      margin-right: 0.5rem;
      font-size: 0.4rem;
      text-shadow: 0 0 8px rgba(255, 102, 0, 0.8);
    }
    
    .scale-slider {
      width: 100%;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 100%);
      border: 2px solid #3a3a3a;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.8),
        inset 0 -1px 2px rgba(60, 60, 60, 0.2);
    }
    
    .scale-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 32px;
      background: linear-gradient(145deg, #5a5a5a 0%, #4a4a4a 50%, #3a3a3a 100%);
      border: 2px solid #2a2a2a;
      border-radius: 3px;
      cursor: grab;
      box-shadow: 
        inset 0 2px 4px rgba(120, 120, 120, 0.4),
        inset 0 -2px 4px rgba(0, 0, 0, 0.8),
        2px 2px 6px rgba(0, 0, 0, 0.7);
      transition: all 0.2s ease;
    }
    
    .scale-slider::-webkit-slider-thumb:hover {
      background: linear-gradient(145deg, #6a6a6a 0%, #5a5a5a 50%, #4a4a4a 100%);
      box-shadow: 
        inset 0 2px 4px rgba(140, 140, 140, 0.5),
        inset 0 -2px 4px rgba(0, 0, 0, 0.8),
        0 0 12px rgba(0, 255, 0, 0.3),
        2px 2px 6px rgba(0, 0, 0, 0.7);
    }
    
    .scale-slider::-webkit-slider-thumb:active {
      cursor: grabbing;
    }
    
    .scale-slider::-moz-range-thumb {
      width: 16px;
      height: 32px;
      background: linear-gradient(145deg, #5a5a5a 0%, #4a4a4a 50%, #3a3a3a 100%);
      border: 2px solid #2a2a2a;
      border-radius: 3px;
      cursor: grab;
      box-shadow: 
        inset 0 2px 4px rgba(120, 120, 120, 0.4),
        inset 0 -2px 4px rgba(0, 0, 0, 0.8),
        2px 2px 6px rgba(0, 0, 0, 0.7);
      transition: all 0.2s ease;
    }
    
    .scale-slider::-moz-range-thumb:hover {
      background: linear-gradient(145deg, #6a6a6a 0%, #5a5a5a 50%, #4a4a4a 100%);
      box-shadow: 
        inset 0 2px 4px rgba(140, 140, 140, 0.5),
        inset 0 -2px 4px rgba(0, 0, 0, 0.8),
        0 0 12px rgba(0, 255, 0, 0.3),
        2px 2px 6px rgba(0, 0, 0, 0.7);
    }
    
    .scale-slider::-moz-range-thumb:active {
      cursor: grabbing;
    }

    .crt-frame {
      background: linear-gradient(145deg, #3a3a3a 0%, #2a2a2a 50%, #1a1a1a 100%);
      border: 8px solid #2a2a2a;
      border-radius: 12px 12px 8px 8px;
      padding: 2.5rem 2rem 1.5rem 2rem;
      box-shadow: 
        inset 3px 3px 8px rgba(80, 80, 80, 0.2),
        inset -3px -3px 8px rgba(0, 0, 0, 0.9),
        8px 8px 20px rgba(0, 0, 0, 0.8),
        0 0 3px rgba(0, 0, 0, 1);
      position: relative;
      cursor: move;
    }
    
    /* Professional grips/handles on sides */
    .crt-frame::before,
    .crt-frame::after {
      content: '';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 80px;
      background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%);
      border: 2px solid #0a0a0a;
      box-shadow: 
        inset 0 2px 4px rgba(60, 60, 60, 0.3),
        inset 0 -2px 4px rgba(0, 0, 0, 0.8),
        2px 2px 6px rgba(0, 0, 0, 0.6);
      z-index: 10;
    }
    
    .crt-frame::before {
      left: -8px;
      border-radius: 8px 0 0 8px;
      background: 
        repeating-linear-gradient(0deg, #1a1a1a 0px, #2a2a2a 4px, #1a1a1a 8px),
        linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%);
    }
    
    .crt-frame::after {
      right: -8px;
      border-radius: 0 8px 8px 0;
      background: 
        repeating-linear-gradient(0deg, #1a1a1a 0px, #2a2a2a 4px, #1a1a1a 8px),
        linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%);
    }

    .crt-screen {
      width: 200px;
      height: 200px;
      background: #000000;
      border: 6px solid #0a0a0a;
      border-radius: 6px;
      position: relative;
      overflow: hidden;
      box-shadow: 
        inset 0 0 30px rgba(0, 0, 0, 0.95),
        inset 0 4px 8px rgba(0, 0, 0, 0.9),
        inset 0 0 60px var(--theme-glow, rgba(0, 255, 0, 0.08)),
        0 0 20px var(--theme-glow, rgba(0, 255, 0, 0.05));
    }

    .crt-scanlines {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        var(--theme-glow, rgba(0, 255, 0, 0.03)) 0px,
        transparent 1px,
        transparent 2px,
        var(--theme-glow, rgba(0, 255, 0, 0.03)) 3px
      );
      pointer-events: none;
      z-index: 3;
      animation: scanline-move 8s linear infinite;
    }

    @keyframes scanline-move {
      0% { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }
    
    /* Affection Level Display */
    .affection-display {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 20, 0, 0.8);
      border: 2px solid var(--theme-primary, #00ff00);
      border-radius: 12px;
      padding: 4px 10px;
      box-shadow: 
        inset 0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.2)),
        0 0 15px var(--theme-glow, rgba(0, 255, 0, 0.4));
      animation: affectionPulse 2s ease-in-out infinite;
    }
    
    .affection-icon {
      font-size: 1rem;
      color: #ff0066;
      text-shadow: 
        0 0 5px rgba(255, 0, 102, 0.8),
        0 0 10px rgba(255, 0, 102, 0.6);
      animation: heartBeat 1.5s ease-in-out infinite;
    }
    
    .affection-value {
      font-size: 0.9rem;
      font-weight: bold;
      color: var(--theme-primary, #00ff00);
      text-shadow: 
        0 0 5px var(--theme-glow, rgba(0, 255, 0, 0.8)),
        0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.6));
      font-family: 'Press Start 2P', monospace;
      min-width: 28px;
      text-align: right;
    }
    
    @keyframes affectionPulse {
      0%, 100% {
        box-shadow: 
          inset 0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.2)),
          0 0 15px var(--theme-glow, rgba(0, 255, 0, 0.4));
      }
      50% {
        box-shadow: 
          inset 0 0 15px var(--theme-glow, rgba(0, 255, 0, 0.3)),
          0 0 25px var(--theme-glow, rgba(0, 255, 0, 0.6));
      }
    }
    
    @keyframes heartBeat {
      0%, 100% {
        transform: scale(1);
      }
      10%, 30% {
        transform: scale(1.2);
      }
      20%, 40% {
        transform: scale(1);
      }
    }

    .crt-green-lines {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 1px,
        var(--theme-glow, rgba(0, 255, 0, 0.08)) 1px,
        var(--theme-glow, rgba(0, 255, 0, 0.08)) 2px
      );
      pointer-events: none;
      z-index: 4;
      mix-blend-mode: screen;
    }

    .crt-glare {
      position: absolute;
      top: 10%;
      left: 10%;
      width: 40%;
      height: 40%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
      pointer-events: none;
      z-index: 5;
      border-radius: 50%;
    }

    .waifu-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
    }

    .sprite-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      filter: 
        drop-shadow(0 0 8px rgba(0, 255, 0, 0.6))
        drop-shadow(0 0 16px rgba(0, 255, 0, 0.4));
      animation: phosphor-glow 2s ease-in-out infinite;
    }

    .sprite-frame {
      width: 100%;
      height: 100%;
      background-repeat: no-repeat;
      image-rendering: pixelated;
      mix-blend-mode: screen;
      opacity: 0.9;
      position: relative;
    }
    
    /* Scanlines verdes sobre el sprite */
    .sprite-frame::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        var(--theme-glow, rgba(0, 255, 0, 0.1)) 0px,
        transparent 1px,
        transparent 2px,
        var(--theme-glow, rgba(0, 255, 0, 0.05)) 3px
      );
      pointer-events: none;
      z-index: 1;
      mix-blend-mode: screen;
    }
    
    /* Vignette verde en los bordes */
    .sprite-frame::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(
        ellipse at center,
        transparent 30%,
        var(--theme-glow, rgba(0, 255, 0, 0.15)) 70%,
        var(--theme-glow, rgba(0, 255, 0, 0.3)) 100%
      );
      pointer-events: none;
      z-index: 2;
      mix-blend-mode: screen;
    }

    .sprite-wrapper[data-state="idle"] {
      animation: idle-bob 3s ease-in-out infinite, phosphor-pulse 2s ease-in-out infinite;
    }

    .sprite-wrapper[data-state="processing"] {
      animation: processing-pulse 0.8s ease-in-out infinite, phosphor-pulse-fast 0.5s ease-in-out infinite;
    }

    .sprite-wrapper[data-state="success"] {
      animation: success-bounce 0.6s ease-in-out, phosphor-glow-bright 0.6s ease-in-out;
    }

    .sprite-wrapper[data-state="error"] {
      animation: error-shake 0.5s ease-in-out, phosphor-red 0.5s ease-in-out;
      filter: 
        drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))
        drop-shadow(0 0 16px rgba(255, 0, 0, 0.4));
    }

    .sprite-wrapper[data-state="thinking"] {
      animation: thinking-pulse 1.5s ease-in-out infinite, phosphor-pulse 1.5s ease-in-out infinite;
    }

    .sprite-wrapper[data-state="happy"] {
      animation: happy-bounce 0.6s ease-in-out infinite, phosphor-glow-bright 1s ease-in-out infinite;
    }

    @keyframes phosphor-pulse {
      0%, 100% {
        filter: 
          drop-shadow(0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.6)))
          drop-shadow(0 0 16px var(--theme-glow, rgba(0, 255, 0, 0.4)));
      }
      50% {
        filter: 
          drop-shadow(0 0 12px var(--theme-glow, rgba(0, 255, 0, 0.8)))
          drop-shadow(0 0 24px var(--theme-glow, rgba(0, 255, 0, 0.5)));
      }
    }

    @keyframes phosphor-pulse-fast {
      0%, 100% {
        filter: 
          drop-shadow(0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.7)))
          drop-shadow(0 0 20px var(--theme-glow, rgba(0, 255, 0, 0.5)));
      }
      50% {
        filter: 
          drop-shadow(0 0 16px var(--theme-glow, rgba(0, 255, 0, 0.9)))
          drop-shadow(0 0 32px var(--theme-glow, rgba(0, 255, 0, 0.6)));
      }
    }

    @keyframes phosphor-glow-bright {
      0%, 100% {
        filter: 
          drop-shadow(0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.6)))
          drop-shadow(0 0 16px var(--theme-glow, rgba(0, 255, 0, 0.4)));
      }
      50% {
        filter: 
          drop-shadow(0 0 20px var(--theme-glow, rgba(0, 255, 0, 1)))
          drop-shadow(0 0 40px var(--theme-glow, rgba(0, 255, 0, 0.8)));
      }
    }

    @keyframes phosphor-red {
      0%, 100% {
        filter: 
          drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))
          drop-shadow(0 0 16px rgba(255, 0, 0, 0.4));
      }
      50% {
        filter: 
          drop-shadow(0 0 12px rgba(255, 0, 0, 1))
          drop-shadow(0 0 24px rgba(255, 0, 0, 0.6));
      }
    }

    /* Text-based waifu fallback */
    .waifu-frame {
      font-size: 4rem;
      color: var(--theme-primary, #00ff00);
      text-shadow: 
        0 0 10px var(--theme-primary, #00ff00),
        0 0 20px var(--theme-primary, #00ff00),
        0 0 30px var(--theme-primary, #00ff00);
      font-family: 'Press Start 2P', monospace;
      animation: phosphor-glow 2s ease-in-out infinite;
    }

    @keyframes phosphor-glow {
      0%, 100% {
        text-shadow: 
          0 0 10px var(--theme-primary, #00ff00),
          0 0 20px var(--theme-primary, #00ff00),
          0 0 30px var(--theme-primary, #00ff00);
      }
      50% {
        text-shadow: 
          0 0 15px var(--theme-primary, #00ff00),
          0 0 30px var(--theme-primary, #00ff00),
          0 0 45px var(--theme-primary, #00ff00);
      }
    }

    /* Estado específico de la waifu */
    .waifu-frame[data-state="idle"] {
      animation: idle-bob 3s ease-in-out infinite;
    }

    .waifu-frame[data-state="processing"] {
      animation: processing-spin 1s linear infinite;
    }

    .waifu-frame[data-state="success"] {
      color: var(--theme-primary, #00ff00);
      animation: success-bounce 0.5s ease-in-out;
    }

    .waifu-frame[data-state="error"] {
      color: #ff0000;
      text-shadow: 
        0 0 10px #ff0000,
        0 0 20px #ff0000,
        0 0 30px #ff0000;
      animation: error-shake 0.5s ease-in-out;
    }

    .waifu-frame[data-state="thinking"] {
      animation: thinking-pulse 1.5s ease-in-out infinite;
    }

    .waifu-frame[data-state="happy"] {
      color: #ffaa00;
      text-shadow: 
        0 0 10px #ffaa00,
        0 0 20px #ffaa00,
        0 0 30px #ffaa00;
      animation: happy-bounce 0.6s ease-in-out infinite;
    }

    @keyframes idle-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes processing-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes success-bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    @keyframes error-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }

    @keyframes thinking-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes happy-bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-5px) scale(1.05); }
    }

    .crt-speaker {
      position: absolute;
      bottom: 0.5rem;
      right: 1rem;
      width: 40px;
      height: 30px;
      background: linear-gradient(90deg, #3a3a3a 0%, #2a2a2a 100%);
      border-radius: 4px;
      box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.8);
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 2px;
      padding: 4px;
      z-index: 10;
    }

    .crt-speaker::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 4px,
        #1a1a1a 4px,
        #1a1a1a 5px
      );
    }

    .crt-base {
      width: 180px;
      height: 32px;
      background: linear-gradient(145deg, #3a3a3a 0%, #2a2a2a 50%, #1a1a1a 100%);
      border-radius: 6px 6px 8px 8px;
      margin-top: -4px;
      box-shadow: 
        inset 2px 2px 4px rgba(80, 80, 80, 0.2),
        inset -2px -2px 4px rgba(0, 0, 0, 0.8),
        4px 6px 12px rgba(0, 0, 0, 0.8);
      position: relative;
    }
    
    /* Brand label on base */
    .crt-base::before {
      content: 'WAIFU-PRO';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.5rem;
      font-family: 'Press Start 2P', monospace;
      letter-spacing: 2px;
      color: #505050;
      text-shadow: 
        0 1px 0 rgba(100, 100, 100, 0.3),
        0 -1px 0 rgba(0, 0, 0, 0.8);
    }

    @media (max-width: 768px) {
      .crt-screen {
        width: 150px;
        height: 150px;
      }
      
      .waifu-frame {
        font-size: 3rem;
      }
    }
  `]
})
export class CrtWaifuComponent implements OnInit, OnChanges, OnDestroy {
  state = input<WaifuState>('idle');
  spriteSheet = input<string>(''); // URL del sprite sheet
  framesPerRow = input<number>(3); // Cuántos frames por fila en el sprite
  totalFrames = input<number>(6); // Total de frames en el sprite
  frameWidth = input<number>(100); // Ancho de cada frame en porcentaje
  frameHeight = input<number>(100); // Alto de cada frame en porcentaje
  
  // Output event to open sprite uploader modal
  spriteUploaderRequested = output<void>();
  
  currentState = signal<WaifuState>('idle');
  currentFrame = signal<number>(0);
  showMenu = signal(false);
  scale = signal<number>(1);
  dragPosition = signal<{ x: number; y: number }>({ x: 100, y: 500 });
  
  // Frames: 0=idle, 1=processing, 2=success, 3=error, 4=thinking, 5=happy
  private frames = ['◠‿◠', '◔_◔', '◠ᴗ◠', '⊙﹏⊙', '◔̯◔', '◠ω◠'];
  private animationInterval: any;
  private spriteStorage = inject(SpriteStorageService);
  private positionService = inject(WaifuPositionService);
  private dialogueService = inject(DialogueService);
  private emotionToFrameMap: Map<WaifuState, number> = new Map();
  
  // Drag state
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  
  // Exponer la posición del servicio
  position = this.positionService.position;
  
  // Computed para nivel de afecto (0-100 directo)
  affectionLevel = computed(() => {
    return this.dialogueService.getAffectionLevel();
  });

  ngOnInit() {
    this.loadEmotionMapping();
    this.loadScale();
    this.loadDragPosition();
    this.updateState(this.state());
    if (this.spriteSheet()) {
      this.startSpriteAnimation();
    }
    
    // Event listeners para drag
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.onDragMove.bind(this));
      window.addEventListener('mouseup', this.onDragEnd.bind(this));
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['state']) {
      this.updateState(this.state());
    }
    if (changes['spriteSheet'] && this.spriteSheet()) {
      this.loadEmotionMapping();
      this.startSpriteAnimation();
    }
  }

  ngOnDestroy() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    
    // Limpiar event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onDragMove.bind(this));
      window.removeEventListener('mouseup', this.onDragEnd.bind(this));
    }
  }
  
  private loadScale() {
    const savedScale = localStorage.getItem('waifu-scale');
    if (savedScale) {
      this.scale.set(parseFloat(savedScale));
    }
  }
  
  private loadDragPosition() {
    const savedPosition = localStorage.getItem('waifu-drag-position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        this.dragPosition.set(pos);
        this.positionService.setDragPosition(pos);
      } catch (e) {
        // Default position
        this.setDefaultDragPosition();
      }
    } else {
      this.setDefaultDragPosition();
    }
  }
  
  private setDefaultDragPosition() {
    if (typeof window !== 'undefined') {
      const defaultPos = {
        x: window.innerWidth - 280,
        y: window.innerHeight - 280
      };
      this.dragPosition.set(defaultPos);
      this.positionService.setDragPosition(defaultPos);
    }
  }
  
  toggleMenu() {
    this.showMenu.update(v => !v);
  }
  
  openSpriteUploader() {
    this.spriteUploaderRequested.emit();
    this.showMenu.set(false);
  }
  
  changePosition(newPosition: WaifuPosition) {
    this.positionService.setPosition(newPosition);
    this.showMenu.set(false);
  }
  
  onScaleChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.scale.set(value);
    localStorage.setItem('waifu-scale', value.toString());
  }
  
  onDragStart(event: MouseEvent) {
    // Solo permitir drag en modo floating
    if (this.position() !== 'floating-bottom-right') return;
    
    // No hacer drag si se hizo click en el menú o botones
    const target = event.target as HTMLElement;
    if (target.closest('.settings-menu') || target.closest('.menu-btn')) {
      return;
    }
    
    this.isDragging = true;
    const currentPos = this.dragPosition();
    this.dragStart = {
      x: event.clientX - currentPos.x,
      y: event.clientY - currentPos.y
    };
    event.preventDefault();
  }
  
  private onDragMove(event: MouseEvent) {
    if (!this.isDragging) return;
    
    const newX = event.clientX - this.dragStart.x;
    const newY = event.clientY - this.dragStart.y;
    
    // Dimensiones del CRT
    const crtWidth = 280;
    const crtHeight = 280;
    
    // Altura del diálogo (aproximada, incluyendo espacio superior)
    const dialogueHeight = 250;
    
    // Obtener altura del header del DOM
    const header = document.querySelector('.header') as HTMLElement;
    const headerHeight = header ? header.offsetHeight : 80;
    
    // Límites: 
    // - Mínimo X: margen de 20px
    // - Máximo X: ancho del viewport - ancho del CRT - margen de 20px
    // - Mínimo Y: altura del header + espacio para el diálogo
    // - Máximo Y: alto del viewport - altura del CRT - margen de 20px
    const minX = 20;
    const maxX = window.innerWidth - crtWidth - 20;
    const minY = headerHeight + dialogueHeight;
    const maxY = window.innerHeight - crtHeight - 20;
    
    const newPos = {
      x: Math.max(minX, Math.min(newX, maxX)),
      y: Math.max(minY, Math.min(newY, maxY))
    };
    
    this.dragPosition.set(newPos);
    // Sincronizar con el servicio para que el diálogo se mueva junto
    this.positionService.setDragPosition(newPos);
  }
  
  private onDragEnd(event: MouseEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      localStorage.setItem('waifu-drag-position', JSON.stringify(this.dragPosition()));
    }
  }

  private loadEmotionMapping() {
    // Cargar el mapeo de emociones desde el localStorage
    const config = this.spriteStorage.loadSpriteConfig();
    if (config && config.frameConfigs) {
      // Crear el mapeo de emoción a frameIndex
      this.emotionToFrameMap.clear();
      config.frameConfigs.forEach(frameConfig => {
        this.emotionToFrameMap.set(frameConfig.emotion as WaifuState, frameConfig.frameIndex);
      });
    } else {
      // Mapeo por defecto si no hay configuración
      this.setDefaultEmotionMapping();
    }
  }

  private setDefaultEmotionMapping() {
    // Mapeo por defecto basado en el sprite original
    this.emotionToFrameMap.set('idle', 0);
    this.emotionToFrameMap.set('thinking', 2);
    this.emotionToFrameMap.set('processing', 4);
    this.emotionToFrameMap.set('success', 1);
    this.emotionToFrameMap.set('happy', 0);
    this.emotionToFrameMap.set('error', 3);
  }

  private updateState(newState: WaifuState) {
    this.currentState.set(newState);
    this.setFrameForState(newState);
  }

  private setFrameForState(state: WaifuState) {
    // Usar el mapeo configurado por el usuario o el mapeo por defecto
    const frameIndex = this.emotionToFrameMap.get(state);
    if (frameIndex !== undefined) {
      this.currentFrame.set(frameIndex % this.totalFrames());
    } else {
      // Fallback al mapeo por defecto
      this.setDefaultEmotionMapping();
      const defaultFrame = this.emotionToFrameMap.get(state) || 0;
      this.currentFrame.set(defaultFrame % this.totalFrames());
    }
  }

  private startSpriteAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    
    // Animar frames automáticamente cada 800ms para que se vea más tiempo
    this.animationInterval = setInterval(() => {
      const baseFrame = this.emotionToFrameMap.get(this.currentState()) || 0;
      
      // Para processing y thinking, alternar con un frame diferente para animación
      if (this.currentState() === 'processing' || this.currentState() === 'thinking') {
        const current = this.currentFrame();
        // Buscar un frame alternativo (el siguiente en el sprite)
        const alternateFrame = (baseFrame + 1) % this.totalFrames();
        const nextFrame = current === baseFrame ? alternateFrame : baseFrame;
        this.currentFrame.set(nextFrame);
      } else {
        this.currentFrame.set(baseFrame);
      }
    }, 800); // Cambiado de 300ms a 800ms
  }

  getSpritePosition(): string {
    const frame = this.currentFrame();
    const framesPerRow = this.framesPerRow();
    const row = Math.floor(frame / framesPerRow);
    const col = frame % framesPerRow;
    
    // Calcular el porcentaje exacto para background-position
    const xPercent = framesPerRow > 1 ? (col * 100) / (framesPerRow - 1) : 0;
    const totalRows = Math.ceil(this.totalFrames() / framesPerRow);
    const yPercent = totalRows > 1 ? (row * 100) / (totalRows - 1) : 0;
    
    return `${xPercent}% ${yPercent}%`;
  }

  getSpriteBgSize(): string {
    const framesPerRow = this.framesPerRow();
    const totalRows = Math.ceil(this.totalFrames() / framesPerRow);
    
    // El tamaño del background debe ser el número de frames multiplicado por 100%
    const widthPercent = framesPerRow * 100;
    const heightPercent = totalRows * 100;
    
    return `${widthPercent}% ${heightPercent}%`;
  }

  getFrameNumber(): string {
    const stateMap: Record<WaifuState, number> = {
      'idle': 0,
      'processing': 1,
      'success': 2,
      'error': 3,
      'thinking': 4,
      'happy': 5
    };
    return this.frames[stateMap[this.currentState()]];
  }
}
