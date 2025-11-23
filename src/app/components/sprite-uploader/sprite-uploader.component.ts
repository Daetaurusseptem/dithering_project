import { Component, signal, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpriteStorageService, SpriteFrameConfig, SpriteSheetConfig } from '../../services/sprite-storage.service';

type EmotionType = 'idle' | 'processing' | 'success' | 'error' | 'thinking' | 'happy';

@Component({
  selector: 'app-sprite-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🎨 Custom Waifu Sprite Upload</h2>
          <button class="close-btn" (click)="onClose()">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- File Upload Section -->
          <div class="upload-section">
            <label class="file-upload-btn">
              <input type="file" accept="image/*" (change)="onFileSelected($event)" hidden>
              📁 Select Sprite Sheet Image
            </label>
            @if (spritePreview()) {
              <div class="upload-info">
                <span class="success-text">✓ Image loaded successfully</span>
              </div>
            }
          </div>

          <!-- Grid Configuration -->
          <div class="grid-config">
            <div class="config-group">
              <label>Frames Per Row:</label>
              <input type="number" min="1" max="10" [(ngModel)]="framesPerRow" (change)="updatePreview()">
            </div>
            <div class="config-group">
              <label>Total Frames:</label>
              <input type="number" min="1" max="20" [(ngModel)]="totalFrames" (change)="updatePreview()">
            </div>
          </div>

          <!-- Sprite Preview with Frame Grid -->
          @if (spritePreview()) {
            <div class="sprite-preview-container">
              <h3>Preview & Emotion Mapping</h3>
              <canvas #previewCanvas class="sprite-preview"></canvas>
              
              <!-- Frame Configuration Grid -->
              <div class="frame-configs">
                @for (frame of frameConfigs(); track frame.frameIndex) {
                  <div class="frame-config-card">
                    <div class="frame-preview-box">
                      <canvas #frameCanvas 
                        [attr.data-frame]="frame.frameIndex"
                        class="frame-canvas"></canvas>
                      <span class="frame-number">Frame {{ frame.frameIndex + 1 }}</span>
                    </div>
                    
                    <div class="frame-controls">
                      <label>Label:</label>
                      <input type="text" 
                        [(ngModel)]="frame.label"
                        placeholder="e.g., Welcome"
                        class="frame-label-input">
                      
                      <label>Emotion:</label>
                      <select [(ngModel)]="frame.emotion" class="emotion-select">
                        <option value="idle">😐 Idle</option>
                        <option value="thinking">🤔 Thinking</option>
                        <option value="processing">⚙️ Processing</option>
                        <option value="success">✅ Success</option>
                        <option value="happy">😊 Happy</option>
                        <option value="error">❌ Error</option>
                      </select>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Action Buttons -->
          <div class="modal-actions">
            <button class="btn-cancel" (click)="onClose()">Cancel</button>
            <button class="btn-clear" (click)="clearSprite()" [disabled]="!spritePreview()">
              Clear Saved Sprite
            </button>
            <button class="btn-save" (click)="saveSprite()" [disabled]="!spritePreview()">
              💾 Save Configuration
            </button>
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
      background: rgba(20, 20, 20, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: var(--amiga-beige);
      border-radius: 8px;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 
        inset 1px 1px 0 rgba(255, 255, 255, 0.5),
        inset -1px -1px 0 rgba(0, 0, 0, 0.2),
        0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      background: var(--amiga-blue);
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px 8px 0 0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .modal-body {
      padding: 20px;
    }

    .upload-section {
      margin-bottom: 20px;
      text-align: center;
    }

    .file-upload-btn {
      display: inline-block;
      padding: 12px 24px;
      background: var(--amiga-orange);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.2s;
      box-shadow: 
        inset 1px 1px 0 rgba(255, 255, 255, 0.3),
        inset -1px -1px 0 rgba(0, 0, 0, 0.2),
        0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .file-upload-btn:hover {
      background: #ff7700;
      transform: translateY(-1px);
      box-shadow: 
        inset 1px 1px 0 rgba(255, 255, 255, 0.3),
        inset -1px -1px 0 rgba(0, 0, 0, 0.2),
        0 3px 6px rgba(0, 0, 0, 0.3);
    }

    .file-upload-btn:active {
      transform: translateY(0);
    }

    .upload-info {
      margin-top: 10px;
    }

    .success-text {
      color: var(--theme-accent, #00aa00);
      font-weight: bold;
    }

    .grid-config {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .config-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .config-group label {
      font-weight: bold;
      font-size: 12px;
      color: #333;
    }

    .config-group input {
      padding: 8px;
      border: 2px solid #999;
      border-radius: 4px;
      font-size: 14px;
      background: var(--theme-surface);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .sprite-preview-container {
      margin-bottom: 20px;
    }

    .sprite-preview-container h3 {
      margin: 0 0 15px 0;
      font-size: 16px;
      color: var(--amiga-blue);
    }

    .sprite-preview {
      width: 100%;
      max-height: 300px;
      object-fit: contain;
      border: 3px solid #999;
      border-radius: 4px;
      background: #000;
      display: block;
      margin-bottom: 20px;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .frame-configs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .frame-config-card {
      background: rgba(255, 255, 255, 0.5);
      border-radius: 4px;
      padding: 12px;
      box-shadow: 
        inset 1px 1px 0 rgba(255, 255, 255, 0.5),
        inset -1px -1px 0 rgba(0, 0, 0, 0.1);
    }

    .frame-preview-box {
      position: relative;
      margin-bottom: 10px;
    }

    .frame-canvas {
      width: 100%;
      height: auto;
      border: 2px solid #666;
      border-radius: 4px;
      background: #000;
      display: block;
    }

    .frame-number {
      position: absolute;
      top: 5px;
      right: 5px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
    }

    .frame-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .frame-controls label {
      font-size: 11px;
      font-weight: bold;
      color: #333;
      margin-bottom: -4px;
    }

    .frame-label-input,
    .emotion-select {
      padding: 6px;
      border: 2px solid #999;
      border-radius: 4px;
      font-size: 12px;
      background: var(--theme-surface);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .emotion-select {
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid rgba(0, 0, 0, 0.1);
    }

    .modal-actions button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 
        inset 1px 1px 0 rgba(255, 255, 255, 0.3),
        inset -1px -1px 0 rgba(0, 0, 0, 0.2),
        0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .btn-cancel {
      background: #999;
      color: white;
    }

    .btn-cancel:hover {
      background: #aaa;
    }

    .btn-clear {
      background: #cc3333;
      color: white;
    }

    .btn-clear:hover:not(:disabled) {
      background: #dd4444;
    }

    .btn-save {
      background: var(--amiga-orange);
      color: white;
    }

    .btn-save:hover:not(:disabled) {
      background: #ff7700;
    }

    .modal-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-actions button:active:not(:disabled) {
      transform: translateY(1px);
    }
  `]
})
export class SpriteUploaderComponent {
  close = output<void>();
  spriteUpdated = output<string>();

  spritePreview = signal<string | null>(null);
  frameConfigs = signal<SpriteFrameConfig[]>([]);
  
  framesPerRow = 3;
  totalFrames = 6;

  private spriteImage: HTMLImageElement | null = null;
  private previewCanvasRef: HTMLCanvasElement | null = null;
  private frameCanvases: HTMLCanvasElement[] = [];

  constructor(private spriteStorage: SpriteStorageService) {
    // Load existing sprite config if available
    effect(() => {
      this.loadExistingSprite();
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit() {
    // Will be called after view init
  }

  async loadExistingSprite() {
    const config = this.spriteStorage.loadSpriteConfig();
    if (config) {
      this.spritePreview.set(config.imageData);
      this.framesPerRow = config.framesPerRow;
      this.totalFrames = config.totalFrames;
      this.frameConfigs.set(config.frameConfigs);
      
      // Load image
      await this.loadImage(config.imageData);
      setTimeout(() => this.updatePreview(), 100);
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const base64 = await this.spriteStorage.fileToBase64(file);
      this.spritePreview.set(base64);
      
      await this.loadImage(base64);
      this.initializeFrameConfigs();
      setTimeout(() => this.updatePreview(), 100);
    } catch (error) {
      console.error('Error loading sprite:', error);
      alert('Error loading sprite image. Please try another file.');
    }
  }

  private async loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.spriteImage = img;
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  private initializeFrameConfigs() {
    const defaultEmotions: EmotionType[] = ['idle', 'thinking', 'processing', 'success', 'happy', 'error'];
    const defaultLabels = ['Idle', 'Thinking', 'Processing', 'Success', 'Happy', 'Error'];
    
    const configs: SpriteFrameConfig[] = [];
    for (let i = 0; i < this.totalFrames; i++) {
      configs.push({
        frameIndex: i,
        emotion: defaultEmotions[i % defaultEmotions.length],
        label: defaultLabels[i % defaultLabels.length]
      });
    }
    this.frameConfigs.set(configs);
  }

  updatePreview() {
    if (!this.spriteImage) return;

    // Update preview canvas
    setTimeout(() => {
      const canvas = document.querySelector('.sprite-preview') as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx || !this.spriteImage) return;

      canvas.width = this.spriteImage.width;
      canvas.height = this.spriteImage.height;
      ctx.drawImage(this.spriteImage, 0, 0);

      // Draw grid lines
      const frameWidth = this.spriteImage.width / this.framesPerRow;
      const rows = Math.ceil(this.totalFrames / this.framesPerRow);
      const frameHeight = this.spriteImage.height / rows;

      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#00ff00';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      
      // Vertical lines
      for (let i = 1; i < this.framesPerRow; i++) {
        ctx.beginPath();
        ctx.moveTo(i * frameWidth, 0);
        ctx.lineTo(i * frameWidth, this.spriteImage.height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let i = 1; i < rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * frameHeight);
        ctx.lineTo(this.spriteImage.width, i * frameHeight);
        ctx.stroke();
      }

      // Update individual frame canvases
      this.updateFrameCanvases(frameWidth, frameHeight);
    }, 50);
  }

  private updateFrameCanvases(frameWidth: number, frameHeight: number) {
    setTimeout(() => {
      const canvases = document.querySelectorAll('.frame-canvas') as NodeListOf<HTMLCanvasElement>;
      if (!this.spriteImage) return;

      canvases.forEach((canvas, index) => {
        if (index >= this.totalFrames) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = frameWidth;
        canvas.height = frameHeight;

        const col = index % this.framesPerRow;
        const row = Math.floor(index / this.framesPerRow);
        const sx = col * frameWidth;
        const sy = row * frameHeight;

        ctx.drawImage(
          this.spriteImage!,
          sx, sy, frameWidth, frameHeight,
          0, 0, frameWidth, frameHeight
        );
      });
    }, 100);
  }

  saveSprite() {
    if (!this.spritePreview()) {
      alert('Please select a sprite image first.');
      return;
    }

    const config: SpriteSheetConfig = {
      imageData: this.spritePreview()!,
      framesPerRow: this.framesPerRow,
      totalFrames: this.totalFrames,
      frameConfigs: this.frameConfigs()
    };

    this.spriteStorage.saveSpriteConfig(config);
    this.spriteUpdated.emit(config.imageData);
    alert('✓ Sprite configuration saved successfully!');
    this.onClose();
  }

  clearSprite() {
    if (confirm('Are you sure you want to clear the saved sprite configuration?')) {
      this.spriteStorage.clearSpriteConfig();
      this.spritePreview.set(null);
      this.frameConfigs.set([]);
      this.spriteImage = null;
      alert('Sprite configuration cleared.');
    }
  }

  onClose() {
    this.close.emit();
  }
}
