import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gif-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-overlay">
      <div class="loading-modal">
        <div class="crt-monitor-loading">
          <div class="screen-loading">
            <div class="scanline-loader"></div>
            
            <!-- Waifu fantasma en el fondo -->
            @if (waifuSprite()) {
              <div class="waifu-ghost"
                [style.background-image]="'url(' + waifuSprite() + ')'"
                [style.background-size]="'300% 200%'">
              </div>
            }
            
            <div class="loading-content">
              <div class="pixel-spinner">
                <div class="pixel"></div>
                <div class="pixel"></div>
                <div class="pixel"></div>
                <div class="pixel"></div>
              </div>
              <h2 class="loading-title">{{ title() }}</h2>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="progress()"></div>
                </div>
                <span class="progress-text">{{ progress() }}%</span>
              </div>
              <p class="loading-message">{{ message() }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
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

    .loading-modal {
      background: #e8e4d8;
      border: 6px solid #d4d0c0;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 
        inset 2px 2px 4px rgba(255, 255, 255, 0.8),
        inset -2px -2px 4px rgba(0, 0, 0, 0.15),
        0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .crt-monitor-loading {
      width: 400px;
    }

    .screen-loading {
      background: #0a0a0a;
      border: 4px solid #2a2a2a;
      border-radius: 8px;
      padding: 2rem;
      position: relative;
      overflow: hidden;
      box-shadow: 
        inset 0 0 20px rgba(0, 0, 0, 0.9),
        inset 0 0 40px rgba(0, 255, 0, 0.15);
    }

    /* Waifu fantasma de fondo */
    .waifu-ghost {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-repeat: no-repeat;
      background-position: center center;
      opacity: 0.15;
      filter: blur(2px) grayscale(50%);
      mix-blend-mode: screen;
      animation: ghostPulse 3s ease-in-out infinite;
      pointer-events: none;
      z-index: 0;
    }

    @keyframes ghostPulse {
      0%, 100% {
        opacity: 0.1;
        transform: scale(1);
      }
      50% {
        opacity: 0.2;
        transform: scale(1.02);
      }
    }

    .scanline-loader {
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
      animation: scanline-move 8s linear infinite;
    }

    @keyframes scanline-move {
      0% { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }

    .loading-content {
      position: relative;
      z-index: 1;
      text-align: center;
    }

    .pixel-spinner {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 1.5rem;
    }

    .pixel {
      width: 16px;
      height: 16px;
      background: #00ff00;
      box-shadow: 
        0 0 10px rgba(0, 255, 0, 0.8),
        0 0 20px rgba(0, 255, 0, 0.6);
      animation: pixelBounce 1s ease-in-out infinite;
    }

    .pixel:nth-child(1) { animation-delay: 0s; }
    .pixel:nth-child(2) { animation-delay: 0.2s; }
    .pixel:nth-child(3) { animation-delay: 0.4s; }
    .pixel:nth-child(4) { animation-delay: 0.6s; }

    @keyframes pixelBounce {
      0%, 100% { 
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      50% { 
        transform: translateY(-20px) scale(1.2);
        opacity: 0.7;
      }
    }

    .loading-title {
      color: #00ff00;
      font-size: 1.5rem;
      font-family: 'Courier New', monospace;
      text-shadow: 
        0 0 10px rgba(0, 255, 0, 0.8),
        0 0 20px rgba(0, 255, 0, 0.6);
      margin: 0 0 1rem 0;
      letter-spacing: 2px;
      animation: titleGlow 2s ease-in-out infinite;
    }

    @keyframes titleGlow {
      0%, 100% {
        text-shadow: 
          0 0 10px rgba(0, 255, 0, 0.8),
          0 0 20px rgba(0, 255, 0, 0.6);
      }
      50% {
        text-shadow: 
          0 0 15px rgba(0, 255, 0, 1),
          0 0 30px rgba(0, 255, 0, 0.8);
      }
    }

    .progress-container {
      margin: 1rem 0;
    }

    .progress-bar {
      width: 100%;
      height: 24px;
      background: #001100;
      border: 2px solid #00ff00;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 
        inset 0 0 10px rgba(0, 0, 0, 0.5),
        0 0 10px rgba(0, 255, 0, 0.3);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00aa00 0%, #00ff00 100%);
      box-shadow: 
        0 0 10px rgba(0, 255, 0, 0.8),
        inset 0 -2px 8px rgba(0, 0, 0, 0.3);
      transition: width 0.3s ease-out;
      animation: progressPulse 1.5s ease-in-out infinite;
    }

    @keyframes progressPulse {
      0%, 100% {
        box-shadow: 
          0 0 10px rgba(0, 255, 0, 0.8),
          inset 0 -2px 8px rgba(0, 0, 0, 0.3);
      }
      50% {
        box-shadow: 
          0 0 20px rgba(0, 255, 0, 1),
          inset 0 -2px 8px rgba(0, 0, 0, 0.3);
      }
    }

    .progress-text {
      display: inline-block;
      margin-top: 0.5rem;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 1.1rem;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.6);
    }

    .loading-message {
      color: #00aa00;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      margin: 1rem 0 0 0;
      text-shadow: 0 0 3px rgba(0, 255, 0, 0.4);
      animation: messageBlink 2s ease-in-out infinite;
    }

    @keyframes messageBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (max-width: 768px) {
      .loading-modal {
        padding: 1rem;
        margin: 1rem;
      }

      .crt-monitor-loading {
        width: 100%;
        max-width: 350px;
      }

      .screen-loading {
        padding: 1.5rem;
      }

      .loading-title {
        font-size: 1.2rem;
      }

      .pixel {
        width: 12px;
        height: 12px;
      }
    }
  `]
})
export class GifLoadingComponent {
  title = input<string>('Generating GIF...');
  message = input<string>('Processing frames...');
  progress = input<number>(0);
  waifuSprite = input<string>('');
}
