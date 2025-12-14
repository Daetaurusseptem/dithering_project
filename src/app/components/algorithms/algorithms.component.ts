import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../services/i18n.service';
import { DitheringService } from '../../services/dithering.service';
import { ThemeService } from '../../services/theme.service';

/**
 * Algorithms Documentation Page
 * Educational content about dithering algorithms with full i18n support
 */

interface AlgorithmData {
  id: string;
  name: { en: string; es: string; ja: string };
  category: { en: string; es: string; ja: string };
  year: number;
  origin: string;
  conservation: boolean;
  datelist: boolean;
  velocity: 'fast' | 'medium' | 'slow' | 'custom';
  characteristics: { en: string[]; es: string[]; ja: string[] };
  artifacts: { en: string[]; es: string[]; ja: string[] };
  bestFor: { en: string[]; es: string[]; ja: string[] };
  complexity: 'O(n)' | 'O(n²)' | 'O(n log n)';
  examples: {
    original: string;
    processed: string;
  };
}

@Component({
  selector: 'app-algorithms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="algorithms-page" [attr.data-theme]="themeService.currentTheme()">
      <div class="page-header">
        <h1 class="page-title">
          <span class="retro-emoji">🔬</span>
          {{ i18n.t('algorithms.pageTitle') }}
        </h1>
        <p class="page-subtitle">{{ i18n.t('algorithms.pageSubtitle') }}</p>
      </div>

      <div class="algorithms-layout">
        <!-- Sidebar with algorithm list -->
        <aside class="algorithms-sidebar">
          <div class="sidebar-header">
            <h2>{{ i18n.t('algorithms.pageTitle') }}</h2>
          </div>
          <div class="algorithms-list">
            @for (algo of algorithms; track algo.id) {
              <button 
                class="algorithm-item" 
                [class.active]="selectedAlgo()?.id === algo.id" 
                (click)="selectAlgorithm(algo)">
                <span class="algo-name">{{ getTranslated(algo.name) }}</span>
                <span class="algo-badge">{{ getConservationText(algo.conservation) }}</span>
              </button>
            }
          </div>
        </aside>

        <!-- Main content area -->
        <main class="algorithms-content">
          @if (selectedAlgo()) {
            <div class="algorithm-detail">
          <div class="detail-header">
            <h2>{{ getTranslated(selectedAlgo()!.name) }}</h2>
          </div>

          <div class="detail-content">
            <!-- Image Comparison with Slider -->
            @if (previewImage() && getAlgoPreview(selectedAlgo()!.id)) {
              <div class="image-comparison">
                <div class="comparison-full">
                  <div class="image-slider-large" [style.--slider-position]="detailSliderPosition() + '%'">
                    <img [src]="previewImage()" alt="Original" class="comparison-original" />
                    <img [src]="getAlgoPreview(selectedAlgo()!.id)" alt="Dithered" class="comparison-dithered" />
                    <div class="slider-handle-large" 
                         (mousedown)="startDetailDrag($event)" 
                         (touchstart)="startDetailDrag($event)">
                      <div class="slider-line-large"></div>
                      <div class="slider-labels">
                        <span class="label-left">Original</span>
                        <span class="label-right">{{ getTranslated(selectedAlgo()!.name) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Metadata Section -->
            <div class="metadata-section">
              <div class="metadata-grid">
                <div class="metadata-item">
                  <span class="metadata-label">{{ i18n.t('algorithms.year') }}:</span>
                  <span class="metadata-value">{{ selectedAlgo()!.year }}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">{{ i18n.t('algorithms.origin') }}:</span>
                  <span class="metadata-value">{{ selectedAlgo()!.origin }}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">{{ i18n.t('algorithms.conservation') }}:</span>
                  <span class="metadata-value">{{ getConservationText(selectedAlgo()!.conservation) }}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">{{ i18n.t('algorithms.datelist') }}:</span>
                  <span class="metadata-value">{{ getConservationText(selectedAlgo()!.datelist) }}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">{{ i18n.t('algorithms.velocity') }}:</span>
                  <span class="metadata-value">{{ getVelocityText(selectedAlgo()!.velocity) }}</span>
                </div>
              </div>
            </div>

            <!-- Three Column Layout -->
            <div class="three-column-layout">
              <!-- Características -->
              <div class="info-column">
                <h3>{{ i18n.t('algorithms.characteristics') }}</h3>
                <ul>
                  @for (char of getTranslated(selectedAlgo()!.characteristics); track $index) {
                    <li>{{ char }}</li>
                  }
                </ul>
              </div>

              <!-- Artefactos -->
              <div class="info-column">
                <h3>{{ i18n.t('algorithms.artifacts') }}</h3>
                <ul>
                  @for (art of getTranslated(selectedAlgo()!.artifacts); track $index) {
                    <li>{{ art }}</li>
                  }
                </ul>
              </div>

              <!-- Mejor Para -->
              <div class="info-column">
                <h3>{{ i18n.t('algorithms.bestFor') }}</h3>
                <ul>
                  @for (use of getTranslated(selectedAlgo()!.bestFor); track $index) {
                    <li>{{ use }}</li>
                  }
                </ul>
              </div>
            </div>

            <!-- Complexity Section -->
            <div class="complexity-section">
              <h3>{{ i18n.t('algorithms.complexity') }}</h3>
              <div class="complexity-value">{{ selectedAlgo()!.complexity }}</div>
            </div>
          </div>
            </div>
          } @else {
            <div class="empty-state">
              <span class="empty-emoji">👈</span>
              <p>{{ i18n.t('algorithms.selectAlgorithm') }}</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .algorithms-page {
      min-height: 100vh;
      background: var(--theme-background);
      color: var(--theme-text);
      font-family: 'Press Start 2P', monospace;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      padding: 2rem;
      background: var(--theme-surface);
      border-bottom: 3px solid var(--theme-border);
      box-shadow: 0 4px 0 var(--theme-shadow-color);
    }

    .page-title {
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
      color: var(--theme-primary);
      text-shadow: 2px 2px 0 var(--theme-shadow-color);
      display: flex;
      align-items: center;
      gap: 1rem;
      line-height: 1.4;
    }

    .retro-emoji {
      font-size: 1.5rem;
      filter: grayscale(1) contrast(2);
    }

    .page-subtitle {
      font-size: 0.65rem;
      color: var(--theme-text-secondary);
      margin: 0;
      line-height: 1.6;
    }

    .algorithms-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      flex: 1;
      overflow: hidden;
    }

    .algorithms-sidebar {
      background: var(--theme-surface);
      border-right: 3px solid var(--theme-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 3px solid var(--theme-border);
      background: var(--theme-background);
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 0.8rem;
      color: var(--theme-accent);
    }

    .algorithms-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .algorithm-item {
      width: 100%;
      padding: 1rem;
      margin-bottom: 0.5rem;
      background: var(--theme-background);
      border: 2px solid var(--theme-border);
      border-radius: 0;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      font-family: 'Press Start 2P', monospace;
      color: var(--theme-text);
      text-align: left;
    }

    .algorithm-item:hover {
      background: var(--theme-surface);
      border-color: var(--theme-primary);
      transform: translateX(5px);
    }

    .algorithm-item.active {
      background: var(--theme-primary);
      color: var(--theme-background);
      border-color: var(--theme-accent);
      box-shadow: 0 0 10px var(--theme-accent-glow);
    }

    .algorithm-item.active .algo-badge {
      background: var(--theme-background);
      color: var(--theme-primary);
    }

    .algo-name {
      font-size: 0.7rem;
      line-height: 1.3;
      flex: 1;
    }

    .algo-badge {
      padding: 0.25rem 0.5rem;
      background: var(--theme-primary);
      color: var(--theme-background);
      font-size: 0.55rem;
      font-weight: bold;
      white-space: nowrap;
      border: 1px solid var(--theme-border);
      border-radius: 0;
    }

    .algorithms-content {
      overflow-y: auto;
      padding: 2rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 400px;
      color: var(--theme-text-secondary);
    }

    .empty-emoji {
      font-size: 4rem;
      margin-bottom: 1rem;
      filter: grayscale(1) contrast(2);
      animation: pointLeft 2s ease-in-out infinite;
    }

    @keyframes pointLeft {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(-10px); }
    }

    .empty-state p {
      font-size: 0.7rem;
      margin: 0;
      text-align: center;
    }

    .preview-container {
      margin-top: 1rem;
      border: 2px solid var(--theme-border);
      border-radius: 0;
      overflow: hidden;
      background: var(--theme-background);
      position: relative;
    }

    .image-slider,
    .image-slider-large {
      position: relative;
      width: 100%;
      overflow: hidden;
      cursor: ew-resize;
      user-select: none;
    }

    .preview-original,
    .preview-dithered,
    .comparison-original,
    .comparison-dithered {
      width: 100%;
      height: auto;
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .preview-dithered,
    .comparison-dithered {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      clip-path: polygon(var(--slider-position) 0%, 100% 0%, 100% 100%, var(--slider-position) 100%);
    }

    .slider-handle,
    .slider-handle-large {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: ew-resize;
      z-index: 10;
      pointer-events: all;
    }

    .slider-handle::after,
    .slider-handle-large::after {
      content: '';
      position: absolute;
      top: 0;
      left: var(--slider-position);
      width: 4px;
      height: 100%;
      transform: translateX(-50%);
      background: transparent;
    }

    .slider-line,
    .slider-line-large {
      position: absolute;
      top: 0;
      left: var(--slider-position);
      width: 4px;
      height: 100%;
      background: var(--theme-accent);
      box-shadow: 0 0 10px var(--theme-accent-glow), 
                  0 0 20px var(--theme-accent-glow);
      transform: translateX(-50%);
      pointer-events: none;
    }

    .slider-line::before,
    .slider-line-large::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 30px;
      height: 30px;
      background: var(--theme-accent);
      border: 3px solid var(--theme-background);
      border-radius: 0;
      box-shadow: 0 0 10px var(--theme-accent-glow);
    }

    .slider-line::after,
    .slider-line-large::after {
      content: '↔';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--theme-background);
      font-size: 1rem;
      font-weight: bold;
      pointer-events: none;
    }

    .slider-labels {
      position: absolute;
      top: 50%;
      left: var(--slider-position);
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.55rem;
      color: var(--theme-background);
      white-space: nowrap;
      pointer-events: none;
      text-align: center;
      background: var(--theme-accent);
      padding: 0.5rem;
      border: 2px solid var(--theme-border);
      border-radius: 0;
      box-shadow: 0 0 10px var(--theme-accent-glow);
    }

    .label-left,
    .label-right {
      padding: 0.25rem 0.5rem;
      background: var(--theme-surface);
      border: 1px solid var(--theme-border);
      border-radius: 0;
    }

    .algorithm-detail {
      background: var(--theme-surface);
      border: 3px solid var(--theme-accent);
      border-radius: 0;
      box-shadow: 6px 6px 0 var(--theme-shadow-color);
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .detail-header {
      padding: 1.5rem;
      background: var(--theme-primary);
      color: var(--theme-background);
      border-bottom: 3px solid var(--theme-border);
    }

    .detail-header h2 {
      margin: 0;
      font-size: 1.2rem;
      line-height: 1.4;
    }

    .detail-content {
      padding: 2rem;
    }

    .image-comparison {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--theme-background);
      border: 3px solid var(--theme-border);
      border-radius: 0;
    }

    .comparison-full {
      position: relative;
    }

    .image-slider-large {
      border: 2px solid var(--theme-border);
      border-radius: 0;
      position: relative;
      max-width: 600px;
      max-height: 400px;
      margin: 0 auto;
    }

    .image-slider-large img {
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
    }

    .slider-handle-large {
      --slider-position: 50%;
    }

    .slider-line-large::before {
      width: 40px;
      height: 40px;
    }

    .slider-line-large::after {
      font-size: 1.2rem;
    }

    .metadata-section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--theme-background);
      border: 3px solid var(--theme-border);
      border-radius: 0;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .metadata-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .metadata-label {
      font-weight: bold;
      color: var(--theme-primary);
      font-size: 0.65rem;
    }

    .metadata-value {
      color: var(--theme-text);
      font-size: 0.75rem;
    }

    .three-column-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .info-column {
      background: var(--theme-background);
      border: 3px solid var(--theme-border);
      border-radius: 0;
      padding: 1.5rem;
    }

    .info-column h3 {
      margin: 0 0 1rem;
      color: var(--theme-primary);
      font-size: 0.8rem;
      border-bottom: 2px solid var(--theme-border);
      padding-bottom: 0.5rem;
    }

    .info-column ul {
      margin: 0;
      padding-left: 0;
      list-style: none;
    }

    .info-column li {
      position: relative;
      margin-bottom: 0.75rem;
      line-height: 1.6;
      padding-left: 1.2rem;
      font-size: 0.65rem;
      color: var(--theme-text-secondary);
    }

    .info-column li::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: var(--theme-accent);
    }

    .complexity-section {
      background: var(--theme-background);
      border: 3px solid var(--theme-border);
      border-radius: 0;
      padding: 1.5rem;
      text-align: center;
    }

    .complexity-section h3 {
      margin: 0 0 1rem;
      color: var(--theme-primary);
      font-size: 0.8rem;
    }

    .complexity-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--theme-accent);
      font-family: 'Courier New', monospace;
      text-shadow: 2px 2px 0 var(--theme-shadow-color);
    }

    @media (max-width: 768px) {
      .algorithms-layout {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }

      .algorithms-sidebar {
        border-right: none;
        border-bottom: 3px solid var(--theme-border);
        max-height: 50vh;
      }

      .page-header {
        padding: 1rem;
      }

      .page-title {
        font-size: 1rem;
      }

      .page-subtitle {
        font-size: 0.6rem;
      }

      .algorithms-content {
        padding: 1rem;
      }

      .three-column-layout {
        grid-template-columns: 1fr;
      }

      .metadata-grid {
        grid-template-columns: 1fr;
      }

      .image-comparison {
        padding: 1rem;
      }

      .slider-labels {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  `]
})
export class AlgorithmsComponent {
  selectedAlgo = signal<AlgorithmData | null>(null);
  previewImage = signal<string>('');
  sliderPosition = signal<number>(50);
  detailSliderPosition = signal<number>(50);
  private isDragging = false;
  private isDetailDragging = false;
  private processedPreviews = new Map<string, string>();

  constructor(
    public i18n: I18nService,
    private ditheringService: DitheringService,
    public themeService: ThemeService
  ) {
    // Load preview image
    this.loadPreviewImage();

    // Setup drag listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => this.onDrag(e));
      window.addEventListener('mouseup', () => this.stopDrag());
      window.addEventListener('touchmove', (e) => this.onDrag(e));
      window.addEventListener('touchend', () => this.stopDrag());
    }
  }

  private async loadPreviewImage(): Promise<void> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/algorithm-previews/preview.jpg';

    img.onload = () => {
      this.previewImage.set(img.src);
      this.processAllAlgorithms(img);
    };

    img.onerror = () => {
      console.warn('Preview image not found, using placeholder');
      this.createPlaceholderImage();
    };
  }

  private createPlaceholderImage(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;

    // Gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(0.5, '#4a4a4a');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.previewImage.set(canvas.toDataURL());

    const img = new Image();
    img.src = canvas.toDataURL();
    img.onload = () => this.processAllAlgorithms(img);
  }

  private async processAllAlgorithms(img: HTMLImageElement): Promise<void> {
    // Don't process all at once, process on demand
  }

  private async applyDithering(img: HTMLImageElement, algorithmId: string): Promise<string> {
    const canvas = document.createElement('canvas');
    const maxWidth = 600;
    const maxHeight = 400;

    let width = img.width;
    let height = img.height;

    // Calculate scale to fit within max dimensions
    const scaleWidth = maxWidth / width;
    const scaleHeight = maxHeight / height;
    const scale = Math.min(scaleWidth, scaleHeight, 1);

    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use different palettes for different algorithm types
    let palette = 'gameboy'; // Default: Game Boy palette (4 colors)

    // Ordered dithering looks better with fewer colors
    if (algorithmId.startsWith('ordered-')) {
      palette = 'monochrome';
    }

    const options = {
      algorithm: algorithmId,
      scale: 1,
      contrast: 50,
      midtones: 50,
      highlights: 50,
      blur: 0,
      palette: palette
    };

    const processedData = await this.ditheringService.applyDitheringAsync(imageData, options);
    ctx.putImageData(processedData, 0, 0);

    return canvas.toDataURL();
  }

  getAlgoPreview(algorithmId: string): string {
    return this.processedPreviews.get(algorithmId) || '';
  }

  startDrag(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  startDetailDrag(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDetailDragging = true;
    // Trigger initial position update
    this.onDrag(event);
  }

  private onDrag(event: MouseEvent | TouchEvent): void {
    if (!this.isDetailDragging) return;

    if (event instanceof TouchEvent) {
      event.preventDefault();
    }

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;

    const sliderContainer = document.querySelector('.image-slider-large');

    if (sliderContainer) {
      const rect = sliderContainer.getBoundingClientRect();
      const position = ((clientX - rect.left) / rect.width) * 100;
      const clampedPosition = Math.max(0, Math.min(100, position));

      this.detailSliderPosition.set(clampedPosition);
    }
  }

  private stopDrag(): void {
    this.isDetailDragging = false;
  }

  // Helper methods to get translated content
  getTranslated<T extends { en: any; es: any; ja: any }>(obj: T): T['en'] {
    const lang = this.i18n.currentLanguage();
    return obj[lang];
  }

  getConservationText(value: boolean): string {
    return value ? this.i18n.t('algorithms.yes') : this.i18n.t('algorithms.no');
  }

  getVelocityText(velocity: 'fast' | 'medium' | 'slow' | 'custom'): string {
    const map = {
      fast: 'algorithms.fast',
      medium: 'algorithms.medium',
      slow: 'algorithms.slow',
      custom: 'algorithms.custom'
    };
    return this.i18n.t(map[velocity]);
  }

  async selectAlgorithm(algo: AlgorithmData): Promise<void> {
    this.selectedAlgo.set(algo);
    this.detailSliderPosition.set(50);

    // Process this algorithm if not already processed
    if (!this.processedPreviews.has(algo.id) && this.previewImage()) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = this.previewImage();
      img.onload = async () => {
        const processed = await this.applyDithering(img, algo.id);
        this.processedPreviews.set(algo.id, processed);
      };
    }
  }

  algorithms: AlgorithmData[] = [
    {
      id: 'floyd-steinberg',
      name: {
        en: 'Floyd-Steinberg',
        es: 'Floyd-Steinberg',
        ja: 'Floyd-Steinberg'
      },
      category: {
        en: 'Error Diffusion',
        es: 'Difusión de Error',
        ja: '誤差拡散'
      },
      year: 1976,
      origin: 'Robert W. Floyd & Louis Steinberg',
      conservation: true,
      datelist: true,
      velocity: 'fast',
      characteristics: {
        en: [
          'Classic error diffusion that conserves error (7/16+3/16+5/16+1/16) balancing quality and speed',
          'Characteristic serpentine pattern',
          'Industry standard'
        ],
        es: [
          'Difusión clásica que conserva el error (7/16+3/16+5/16+1/16) equilibrando calidad y velocidad',
          'Patrón característico de serpenteo',
          'Estándar de la industria'
        ],
        ja: [
          'エラーを保存する古典的な誤差拡散（7/16+3/16+5/16+1/16）品質と速度のバランス',
          '特徴的な蛇行パターン',
          '業界標準'
        ]
      },
      artifacts: {
        en: [
          'Serpentine patterns in uniform areas',
          '"Worm" effect in smooth gradients'
        ],
        es: [
          'Patrones de serpenteo en áreas uniformes',
          'Efecto de "gusano" en gradientes suaves'
        ],
        ja: [
          '均一な領域での蛇行パターン',
          'スムーズなグラデーションでの"ワーム"効果'
        ]
      },
      bestFor: {
        en: ['General use', 'Photographs', 'Printing'],
        es: ['Uso general', 'Fotografías', 'Impresión'],
        ja: ['一般的な使用', '写真', '印刷']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/floyd-steinberg.jpg'
      }
    },
    {
      id: 'atkinson',
      name: {
        en: 'Atkinson',
        es: 'Atkinson',
        ja: 'Atkinson'
      },
      category: {
        en: 'Error Diffusion',
        es: 'Difusión de Error',
        ja: '誤差拡散'
      },
      year: 1984,
      origin: 'Bill Atkinson (Apple)',
      conservation: false,
      datelist: true,
      velocity: 'fast',
      characteristics: {
        en: [
          'Compromise diffusion used in lighter halftones discarding some error',
          'Popularized by HyperCard',
          'Cleaner look than Floyd-Steinberg'
        ],
        es: [
          'Difusión de compromiso usados en medios tonos más claros descendiendo algo de error',
          'Popularizado por HyperCard',
          'Aspecto más limpio que Floyd-Steinberg'
        ],
        ja: [
          'より明るいハーフトーンで使用される妥協拡散、一部のエラーを破棄',
          'HyperCardで普及',
          'Floyd-Steinbergよりクリーンな外観'
        ]
      },
      artifacts: {
        en: [
          'Detail loss in shadows',
          'Slightly brighter images'
        ],
        es: [
          'Pérdida de detalle en sombras',
          'Imágenes ligeramente más brillantes'
        ],
        ja: [
          '影のディテール損失',
          'わずかに明るい画像'
        ]
      },
      bestFor: {
        en: ['Retro graphics', 'Pixel art', 'Vintage interfaces'],
        es: ['Gráficos retro', 'Arte pixel', 'Interfaces vintage'],
        ja: ['レトログラフィックス', 'ピクセルアート', 'ヴィンテージインターフェース']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/atkinson.jpg'
      }
    },
    {
      id: 'jarvis-judice-ninke',
      name: {
        en: 'Jarvis-Judice-Ninke (JJN)',
        es: 'Jarvis-Judice-Ninke (JJN)',
        ja: 'Jarvis-Judice-Ninke (JJN)'
      },
      category: {
        en: 'Error Diffusion',
        es: 'Difusión de Error',
        ja: '誤差拡散'
      },
      year: 1976,
      origin: 'J.F. Jarvis, C.N. Judice & W.H. Ninke',
      conservation: true,
      datelist: true,
      velocity: 'medium',
      characteristics: {
        en: [
          'Dense 5x3 kernel that distributes errors more widely (3+5+7+5+3/48) than FS with less cost',
          'Greater smoothness in gradients',
          'Better preservation of fine details'
        ],
        es: [
          'Núcleo denso 5x3 que distribuye errores más amplia (3+5+7+5+3/48) que FS con menos costos',
          'Mayor suavidad en gradientes',
          'Mejor preservación de detalles finos'
        ],
        ja: [
          'FSよりも広くエラーを分散する密な5x3カーネル（3+5+7+5+3/48）、コストが低い',
          'グラデーションでのより大きな滑らかさ',
          '細かいディテールのより良い保存'
        ]
      },
      artifacts: {
        en: [
          'Computationally more expensive',
          'Can produce more visible patterns'
        ],
        es: [
          'Computacionalmente más costoso',
          'Puede producir patrones más visibles'
        ],
        ja: [
          '計算コストが高い',
          'より目立つパターンを生成する可能性'
        ]
      },
      bestFor: {
        en: ['High quality images', 'Smooth gradients', 'Detail preservation'],
        es: ['Imágenes de alta calidad', 'Gradientes suaves', 'Preservación de detalles'],
        ja: ['高品質画像', 'スムーズなグラデーション', 'ディテール保存']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/jarvis-judice-ninke.jpg'
      }
    },
    {
      id: 'stucki',
      name: {
        en: 'Stucki',
        es: 'Stucki',
        ja: 'Stucki'
      },
      category: {
        en: 'Error Diffusion',
        es: 'Difusión de Error',
        ja: '誤差拡散'
      },
      year: 1981,
      origin: 'Peter Stucki',
      conservation: true,
      datelist: true,
      velocity: 'medium',
      characteristics: {
        en: [
          'Large 5x3 kernel similar to JJN but with different coefficients',
          'Very smooth gradients',
          'Excellent for photographic content'
        ],
        es: [
          'Núcleo grande 5x3 similar a JJN pero con coeficientes diferentes',
          'Gradientes muy suaves',
          'Excelente para contenido fotográfico'
        ],
        ja: [
          'JJNに似た大きな5x3カーネル、異なる係数',
          '非常に滑らかなグラデーション',
          '写真コンテンツに最適'
        ]
      },
      artifacts: {
        en: [
          'Slower than Floyd-Steinberg',
          'May soften sharp edges slightly'
        ],
        es: [
          'Más lento que Floyd-Steinberg',
          'Puede suavizar bordes afilados ligeramente'
        ],
        ja: [
          'Floyd-Steinbergより遅い',
          '鋭いエッジをわずかに柔らかくする可能性'
        ]
      },
      bestFor: {
        en: ['Photography', 'Natural images', 'Smooth tonal transitions'],
        es: ['Fotografía', 'Imágenes naturales', 'Transiciones tonales suaves'],
        ja: ['写真', '自然画像', 'スムーズなトーン遷移']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/stucki.jpg'
      }
    },
    {
      id: 'burkes',
      name: {
        en: 'Burkes',
        es: 'Burkes',
        ja: 'Burkes'
      },
      category: {
        en: 'Error Diffusion',
        es: 'Difusión de Error',
        ja: '誤差拡散'
      },
      year: 1988,
      origin: 'Daniel Burkes',
      conservation: true,
      datelist: true,
      velocity: 'fast',
      characteristics: {
        en: [
          'Efficient diffusion with 5-pixel kernel in 2 rows',
          'Good balance between speed and quality',
          'Popular in printer drivers'
        ],
        es: [
          'Difusión eficiente con núcleo de 5 píxeles en 2 filas',
          'Buen equilibrio entre velocidad y calidad',
          'Popular en controladores de impresora'
        ],
        ja: [
          '2行の5ピクセルカーネルによる効率的な拡散',
          '速度と品質の良いバランス',
          'プリンタドライバで人気'
        ]
      },
      artifacts: {
        en: [
          'Some directional bias',
          'Occasional pattern formation'
        ],
        es: [
          'Algo de sesgo direccional',
          'Formación ocasional de patrones'
        ],
        ja: [
          '方向性のバイアス',
          '時折のパターン形成'
        ]
      },
      bestFor: {
        en: ['General printing', 'Fast processing', 'Web graphics'],
        es: ['Impresión general', 'Procesamiento rápido', 'Gráficos web'],
        ja: ['一般的な印刷', '高速処理', 'Webグラフィックス']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/burkes.jpg'
      }
    },
    {
      id: 'sierra',
      name: {
        en: 'Sierra (3-row)',
        es: 'Sierra (3 filas)',
        ja: 'Sierra（3行）'
      },
      category: {
        en: 'Error Diffusion',
        es: 'Difusión de Error',
        ja: '誤差拡散'
      },
      year: 1989,
      origin: 'Frankie Sierra',
      conservation: true,
      datelist: true,
      velocity: 'medium',
      characteristics: {
        en: [
          'Complex 5x3 kernel with carefully tuned coefficients',
          'Excellent gradient handling',
          'Minimal artifacts'
        ],
        es: [
          'Núcleo complejo 5x3 con coeficientes cuidadosamente ajustados',
          'Excelente manejo de gradientes',
          'Artefactos mínimos'
        ],
        ja: [
          '慎重に調整された係数を持つ複雑な5x3カーネル',
          '優れたグラデーション処理',
          '最小限のアーティファクト'
        ]
      },
      artifacts: {
        en: [
          'Computationally intensive',
          'Slightly slower processing'
        ],
        es: [
          'Computacionalmente intensivo',
          'Procesamiento ligeramente más lento'
        ],
        ja: [
          '計算集約的',
          'わずかに遅い処理'
        ]
      },
      bestFor: {
        en: ['Professional printing', 'High-quality output', 'Smooth images'],
        es: ['Impresión profesional', 'Salida de alta calidad', 'Imágenes suaves'],
        ja: ['プロフェッショナル印刷', '高品質出力', 'スムーズな画像']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/sierra.jpg'
      }
    },
    {
      id: 'ordered-2x2',
      name: {
        en: 'Bayer 2×2',
        es: 'Bayer 2×2',
        ja: 'Bayer 2×2'
      },
      category: {
        en: 'Ordered Dithering',
        es: 'Dithering Ordenado',
        ja: '規則的ディザリング'
      },
      year: 1973,
      origin: 'Bryce Bayer',
      conservation: false,
      datelist: false,
      velocity: 'fast',
      characteristics: {
        en: [
          'Simplest threshold matrix (2×2)',
          'Fast and deterministic',
          'Checkerboard pattern'
        ],
        es: [
          'Matriz de umbral más simple (2×2)',
          'Rápida y determinista',
          'Patrón de tablero de ajedrez'
        ],
        ja: [
          '最も単純な閾値マトリックス（2×2）',
          '高速で決定的',
          'チェッカーボードパターン'
        ]
      },
      artifacts: {
        en: [
          'Very visible patterns',
          'Limited tonal range',
          'Strong texture'
        ],
        es: [
          'Patrones muy visibles',
          'Rango tonal limitado',
          'Textura fuerte'
        ],
        ja: [
          '非常に目立つパターン',
          '限定的なトーン範囲',
          '強いテクスチャ'
        ]
      },
      bestFor: {
        en: ['Retro aesthetics', 'Fast previews', 'Stylized effects'],
        es: ['Estética retro', 'Vistas previas rápidas', 'Efectos estilizados'],
        ja: ['レトロな美学', '高速プレビュー', 'スタイライズドエフェクト']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/bayer-2x2.jpg'
      }
    },
    {
      id: 'ordered-4x4',
      name: {
        en: 'Bayer 4×4',
        es: 'Bayer 4×4',
        ja: 'Bayer 4×4'
      },
      category: {
        en: 'Ordered Dithering',
        es: 'Dithering Ordenado',
        ja: '規則的ディザリング'
      },
      year: 1973,
      origin: 'Bryce Bayer',
      conservation: false,
      datelist: false,
      velocity: 'fast',
      characteristics: {
        en: [
          'Balanced threshold matrix (4×4)',
          'Good tonal range',
          'Classic retro look'
        ],
        es: [
          'Matriz de umbral equilibrada (4×4)',
          'Buen rango tonal',
          'Aspecto retro clásico'
        ],
        ja: [
          'バランスの取れた閾値マトリックス（4×4）',
          '良好なトーン範囲',
          'クラシックなレトロルック'
        ]
      },
      artifacts: {
        en: [
          'Regular grid patterns',
          'Visible texture',
          'No error propagation'
        ],
        es: [
          'Patrones de cuadrícula regulares',
          'Textura visible',
          'Sin propagación de error'
        ],
        ja: [
          '規則的なグリッドパターン',
          '目に見えるテクスチャ',
          'エラー伝播なし'
        ]
      },
      bestFor: {
        en: ['Pixel art', '8-bit graphics', 'Game Boy aesthetic'],
        es: ['Arte pixel', 'Gráficos de 8 bits', 'Estética Game Boy'],
        ja: ['ピクセルアート', '8ビットグラフィックス', 'ゲームボーイの美学']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/bayer-4x4.jpg'
      }
    },
    {
      id: 'ordered-8x8',
      name: {
        en: 'Bayer 8×8',
        es: 'Bayer 8×8',
        ja: 'Bayer 8×8'
      },
      category: {
        en: 'Ordered Dithering',
        es: 'Dithering Ordenado',
        ja: '規則的ディザリング'
      },
      year: 1973,
      origin: 'Bryce Bayer',
      conservation: false,
      datelist: false,
      velocity: 'fast',
      characteristics: {
        en: [
          'Large threshold matrix (8×8)',
          'Smoother gradients',
          'Best ordered dithering balance'
        ],
        es: [
          'Matriz de umbral grande (8×8)',
          'Gradientes más suaves',
          'Mejor equilibrio de dithering ordenado'
        ],
        ja: [
          '大きな閾値マトリックス（8×8）',
          'より滑らかなグラデーション',
          '最良の規則的ディザリングバランス'
        ]
      },
      artifacts: {
        en: [
          'Subtle patterns still visible',
          'Less suitable for small images',
          'Fixed pattern structure'
        ],
        es: [
          'Patrones sutiles aún visibles',
          'Menos adecuado para imágenes pequeñas',
          'Estructura de patrón fija'
        ],
        ja: [
          'まだ微妙なパターンが見える',
          '小さな画像には適さない',
          '固定パターン構造'
        ]
      },
      bestFor: {
        en: ['General purpose', 'Medium-sized images', 'Balanced quality'],
        es: ['Propósito general', 'Imágenes medianas', 'Calidad equilibrada'],
        ja: ['汎用目的', '中サイズ画像', 'バランスの取れた品質']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/bayer-8x8.jpg'
      }
    },
    {
      id: 'sierra-lite',
      name: {
        en: 'Sierra Lite',
        es: 'Sierra Lite',
        ja: 'Sierra Lite'
      },
      category: {
        en: 'Error Diffusion',
        es: 'Difusión de Error',
        ja: '誤差拡散'
      },
      year: 1990,
      origin: 'Frankie Sierra',
      conservation: true,
      datelist: true,
      velocity: 'fast',
      characteristics: {
        en: [
          'Lightweight version of Sierra with only 2 rows',
          'Faster processing than full Sierra',
          'Good balance of quality and speed'
        ],
        es: [
          'Versión ligera de Sierra con solo 2 filas',
          'Procesamiento más rápido que Sierra completo',
          'Buen equilibrio entre calidad y velocidad'
        ],
        ja: [
          '2行のみの軽量版Sierra',
          'フルSierraより高速処理',
          '品質と速度の良いバランス'
        ]
      },
      artifacts: {
        en: [
          'Less smooth than full Sierra',
          'Minimal directional bias'
        ],
        es: [
          'Menos suave que Sierra completo',
          'Sesgo direccional mínimo'
        ],
        ja: [
          'フルSierraより滑らかさが劣る',
          '最小限の方向性バイアス'
        ]
      },
      bestFor: {
        en: ['Fast processing', 'Web applications', 'Real-time preview'],
        es: ['Procesamiento rápido', 'Aplicaciones web', 'Vista previa en tiempo real'],
        ja: ['高速処理', 'Webアプリケーション', 'リアルタイムプレビュー']
      },
      complexity: 'O(n)',
      examples: {
        original: '/assets/algorithm-previews/preview.jpg',
        processed: '/assets/algorithm-previews/sierra-lite.jpg'
      }
    }
  ];
}
