import { Component, input, output, signal, ElementRef, ViewChild, AfterViewInit, effect, Injector, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-canvas-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="canvas-mobile">
      <!-- Canvas Container with Pinch-Zoom Support -->
      <div class="canvas-container" #canvasContainer>
        <!-- Original Image (for comparison) -->
        @if (originalImageData()) {
          <canvas 
            #originalCanvas
            class="canvas-layer original-layer"
            [class.hidden]="!showComparison()"
            [style.clip-path]="showComparison() ? 'inset(0 ' + (100 - comparisonSlider()) + '% 0 0)' : 'inset(0 100% 0 0)'"
            [style.transform]="'scale(' + scale() + ') translate(' + panX() + 'px, ' + panY() + 'px)'"
            (touchstart)="onTouchStart($event)"
            (touchmove)="onTouchMove($event)"
            (touchend)="onTouchEnd($event)">
          </canvas>
        }
        
        <!-- Dithered Image -->
        <canvas 
          #canvas
          class="canvas-layer dithered-layer"
          [style.transform]="'scale(' + scale() + ') translate(' + panX() + 'px, ' + panY() + 'px)'"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd($event)">
        </canvas>
        
        <!-- Comparison Slider Line -->
        @if (showComparison()) {
          <div class="comparison-line" [style.left.%]="comparisonSlider()">
            <div class="comparison-handle">
              <span class="handle-icon">⟷</span>
            </div>
          </div>
        }
      </div>

      <!-- Comparison Slider (only when active) -->
      @if (showComparison()) {
        <div class="comparison-slider-overlay">
          <div class="slider-container">
            <span class="slider-label">Original</span>
            <input 
              type="range" 
              class="comparison-slider"
              min="0" 
              max="100" 
              [value]="comparisonSlider()"
              (input)="onComparisonChange($event)">
            <span class="slider-label">Dithered</span>
          </div>
        </div>
      }

      <!-- Floating Action Buttons (Minimal) -->
      <div class="fab-group">
        <button class="fab fab-compare" (click)="toggleComparison()" [class.active]="showComparison()" title="Compare">
          <span class="fab-icon">👁️</span>
        </button>
        
        <button class="fab fab-reset" (click)="resetView()" title="Reset">
          <span class="fab-icon">🔄</span>
        </button>
        
        <button class="fab fab-download" (click)="downloadImage()" title="Download">
          <span class="fab-icon">💾</span>
        </button>
      </div>

      <!-- Zoom Indicator -->
      @if (scale() !== 1) {
        <div class="zoom-indicator">
          {{ (scale() * 100).toFixed(0) }}%
        </div>
      }

      <!-- Touch Gesture Hints -->
      @if (showHints()) {
        <div class="gesture-hints">
          <div class="hint-item">🤏 Pinch to zoom</div>
          <div class="hint-item">👆 Drag to pan</div>
          <div class="hint-item">👆👆 Double tap to reset</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .canvas-mobile {
      position: relative;
      width: 100%;
      height: calc(100vh - 64px);
      background: var(--theme-background);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .canvas-container {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      touch-action: none;
      background: var(--theme-surface);
    }

    .canvas-layer {
      position: absolute;
      max-width: 100%;
      max-height: 100%;
      image-rendering: pixelated;
      transform-origin: center;
      transition: transform 0.1s ease-out;
      touch-action: none;
      will-change: transform;
    }

    .original-layer {
      z-index: 2;
    }

    .original-layer.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .dithered-layer {
      z-index: 1;
    }

    /* Comparison Slider */
    .comparison-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--theme-primary);
      box-shadow: 
        0 0 10px var(--theme-glow-color),
        0 0 20px var(--theme-glow-color);
      z-index: 3;
      pointer-events: none;
    }

    .comparison-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 44px;
      height: 44px;
      background: var(--theme-accent);
      border: 2px solid var(--theme-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.5),
        0 0 15px var(--theme-glow-color);
    }

    .handle-icon {
      font-size: 1.3rem;
      color: var(--theme-primary);
      font-weight: bold;
    }

    /* Comparison Slider Overlay (only when active) */
    .comparison-slider-overlay {
      position: fixed;
      top: 72px;
      left: 0;
      right: 0;
      padding: 1rem 1.5rem;
      background: var(--theme-surface);
      border-bottom: 1px solid var(--theme-border);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 50;
      animation: slideDown 0.2s ease;
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

    .slider-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .slider-label {
      font-size: 0.7rem;
      color: var(--theme-text-secondary);
      min-width: 55px;
      text-align: center;
      font-weight: 600;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .comparison-slider {
      flex: 1;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--theme-border);
      border-radius: 3px;
      outline: none;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .comparison-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: var(--theme-primary);
      border: 2px solid var(--theme-background);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 
        0 2px 6px rgba(0, 0, 0, 0.4),
        0 0 0 1px var(--theme-primary);
      transition: all 0.15s ease;
    }

    .comparison-slider::-webkit-slider-thumb:active {
      transform: scale(1.15);
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.5),
        0 0 0 2px var(--theme-primary);
    }

    .comparison-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: var(--theme-primary);
      border: 2px solid var(--theme-background);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 
        0 2px 6px rgba(0, 0, 0, 0.4),
        0 0 0 1px var(--theme-primary);
      transition: all 0.15s ease;
    }

    /* FAB Group (Minimal Style) */
    .fab-group {
      position: fixed;
      bottom: 180px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 100;
    }

    .fab {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--theme-surface);
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      color: var(--theme-text);
      cursor: pointer;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 var(--theme-highlight);
      transition: all 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .fab:active {
      transform: translateY(1px);
      box-shadow: 
        0 1px 4px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 var(--theme-highlight);
    }

    .fab-icon {
      font-size: 1.4rem;
      line-height: 1;
      display: inline-block;
      filter: grayscale(0.4) brightness(0.85) saturate(0.6);
      transition: filter 0.15s ease;
    }

    .fab:hover .fab-icon,
    .fab.active .fab-icon {
      filter: grayscale(0) brightness(1) saturate(1);
    }

    .fab-compare {
      opacity: 0.8;
    }

    .fab-compare.active {
      background: var(--theme-accent);
      border-color: var(--theme-primary);
      opacity: 1;
    }

    .fab-compare.active .fab-icon {
      filter: grayscale(0) opacity(1);
    }

    .fab-download {
      background: var(--theme-primary);
      color: var(--theme-background);
      border-color: var(--theme-primary);
    }

    .fab-download .fab-icon {
      filter: none;
    }

    /* Zoom Indicator */
    .zoom-indicator {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--theme-accent);
      border: 2px solid var(--theme-primary);
      border-radius: 8px;
      padding: 6px 16px;
      color: var(--theme-primary);
      font-size: 0.9rem;
      font-weight: 700;
      font-family: var(--font-mono);
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 var(--theme-highlight);
      z-index: 50;
      animation: zoomFadeIn 0.2s ease;
      letter-spacing: 0.5px;
    }

    /* Gesture Hints */
    .gesture-hints {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--theme-surface);
      border: 2px solid var(--theme-primary);
      border-radius: 12px;
      padding: 1.5rem 2rem;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 var(--theme-highlight);
      z-index: 200;
      animation: hintsFadeIn 0.3s ease;
    }

    .hint-item {
      color: var(--theme-text);
      font-size: 0.95rem;
      font-weight: 500;
      font-family: var(--font-mono);
      margin: 0.75rem 0;
      text-align: center;
      line-height: 1.4;
    }

    .hint-item:first-child {
      margin-top: 0;
    }

    .hint-item:last-child {
      margin-bottom: 0;
    }

    @keyframes zoomFadeIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    @keyframes hintsFadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
  `]
})
export class CanvasMobileComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('originalCanvas') originalCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;

  imageData = input<ImageData | null>(null);
  originalImageData = input<ImageData | null>(null);
  download = output<void>();

  scale = signal(1);
  panX = signal(0);
  panY = signal(0);
  showComparison = signal(false);
  comparisonSlider = signal(50);
  showHints = signal(true);

  private touchStartDistance = 0;
  private touchStartScale = 1;
  private touchStartX = 0;
  private touchStartY = 0;
  private lastTapTime = 0;
  private injector = inject(Injector);

  constructor() {
    // Hide hints after 5 seconds
    setTimeout(() => this.showHints.set(false), 5000);
    
    // Watch for imageData changes and render (using injector for effect)
    effect(() => {
      const data = this.imageData();
      console.log('📱 Canvas Mobile - imageData changed:', data ? `${data.width}x${data.height}` : 'null');
      if (data) {
        // Use requestAnimationFrame for better rendering timing
        requestAnimationFrame(() => {
          if (this.canvasRef) {
            this.renderCanvas(data, this.canvasRef);
          }
        });
      }
    }, { injector: this.injector });

    // Watch for original imageData changes
    effect(() => {
      const data = this.originalImageData();
      if (data) {
        requestAnimationFrame(() => {
          if (this.originalCanvasRef) {
            this.renderCanvas(data, this.originalCanvasRef);
          }
        });
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    // Force initial render after view is ready
    requestAnimationFrame(() => {
      const data = this.imageData();
      if (data && this.canvasRef) {
        this.renderCanvas(data, this.canvasRef);
      }

      const originalData = this.originalImageData();
      if (originalData && this.originalCanvasRef) {
        this.renderCanvas(originalData, this.originalCanvasRef);
      }
    });
  }

  private renderCanvas(imageData: ImageData, canvasRef: ElementRef<HTMLCanvasElement> | undefined): void {
    if (!canvasRef) return;
    
    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  }

  toggleComparison(): void {
    this.showComparison.update(v => !v);
  }

  onComparisonChange(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.comparisonSlider.set(value);
  }

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    // Double tap detection
    const now = Date.now();
    if (now - this.lastTapTime < 300) {
      this.resetView();
      return;
    }
    this.lastTapTime = now;

    if (event.touches.length === 2) {
      // Pinch zoom start
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.touchStartDistance = this.getDistance(touch1, touch2);
      this.touchStartScale = this.scale();
    } else if (event.touches.length === 1) {
      // Pan start
      this.touchStartX = event.touches[0].clientX - this.panX();
      this.touchStartY = event.touches[0].clientY - this.panY();
    }
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 2) {
      // Pinch zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = this.getDistance(touch1, touch2);
      const scaleChange = distance / this.touchStartDistance;
      const newScale = Math.min(3, Math.max(0.5, this.touchStartScale * scaleChange));
      this.scale.set(newScale);
    } else if (event.touches.length === 1) {
      // Pan
      const newX = event.touches[0].clientX - this.touchStartX;
      const newY = event.touches[0].clientY - this.touchStartY;
      this.panX.set(newX);
      this.panY.set(newY);
    }
  }

  onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  resetView(): void {
    this.scale.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  downloadImage(): void {
    this.download.emit();
  }
}
