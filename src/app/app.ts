import { Component, signal, computed, effect, untracked, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { DitheringService, DitheringOptions } from './services/dithering.service';
import { StorageService, ColorPalette, DitheringPreset } from './services/storage.service';
import { SpriteStorageService } from './services/sprite-storage.service';
import { GifService, GifFrame } from './services/gif.service';
import { DialogueService } from './services/dialogue.service';
import { WaifuPositionService } from './services/waifu-position.service';
import { AchievementService } from './services/achievement.service';
import { GalleryService } from './services/gallery.service';
import { CompositionService } from './services/composition.service';
import { CompositionToolService } from './services/composition-tool.service';
import { ModalService } from './services/modal.service';
import { HistoryService, BatchAddLayersCommand } from './services/history.service';
import { CrtWaifuComponent, WaifuState } from './components/crt-waifu/crt-waifu.component';
import { SpriteUploaderComponent } from './components/sprite-uploader/sprite-uploader.component';
import { GifLoadingComponent } from './components/gif-loading/gif-loading.component';
import { AchievementNotificationComponent } from './components/achievement-notification/achievement-notification.component';
import { AchievementsPanelComponent } from './components/achievements-panel/achievements-panel.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { CompositionLayersComponent } from './components/composition-layers/composition-layers.component';
import { CompositionCanvasComponent } from './components/composition-canvas/composition-canvas.component';
import { CompositionToolbarComponent, ToolType, ToolOptions } from './components/composition-toolbar/composition-toolbar.component';
import { LayerPropertiesComponent } from './components/layer-properties/layer-properties.component';
import { GifEffectOptions } from './components/gif-options/gif-options.component';
import { GifAdvancedSettingsComponent } from './components/gif-advanced-settings/gif-advanced-settings.component';
import { VintageKnobComponent } from './components/vintage-knob/vintage-knob.component';
import { SettingsComponent } from './components/settings/settings.component';
import { DesktopControlsComponent } from './components/desktop-controls/desktop-controls.component';
import { NavigationMobileComponent, MobileNavigationTab } from './components/mobile/navigation-mobile/navigation-mobile.component';
import { UploadMobileComponent } from './components/mobile/upload-mobile/upload-mobile.component';
import { CanvasMobileComponent } from './components/mobile/canvas-mobile/canvas-mobile.component';
import { ControlsMobileComponent, ControlsMobileOptions } from './components/mobile/controls-mobile/controls-mobile.component';
import { I18nService } from './services/i18n.service';
import { ThemeService } from './services/theme.service';
import { DeviceDetectionService } from './services/device-detection.service';
import { EffectRendererService } from './services/effect-renderer.service';
import { EffectLayer, EffectType, DEFAULT_EFFECT_OPTIONS, EFFECT_NAMES } from './models/effect-layer.interface';
import { DitheringSettings } from './models/achievement.interface';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CrtWaifuComponent,
    SpriteUploaderComponent,
    GifLoadingComponent,
    AchievementNotificationComponent,
    AchievementsPanelComponent,
    GalleryComponent,
    CompositionLayersComponent,
    CompositionCanvasComponent,
    CompositionToolbarComponent,
    LayerPropertiesComponent,
    GifAdvancedSettingsComponent,
    VintageKnobComponent,
    SettingsComponent,
    NavigationMobileComponent,
    UploadMobileComponent,
    CanvasMobileComponent,
    ControlsMobileComponent,
    DesktopControlsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements AfterViewInit {
  // Services are automatically injected via inject()
  // Canvas references
  @ViewChild('processedCanvas') processedCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('originalCompareCanvas') originalCompareCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('particleCanvas') particleCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('gifStudioCanvas') gifStudioCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild(CompositionCanvasComponent) compositionCanvasComponent?: CompositionCanvasComponent;

  // Estado de la aplicación
  imageLoaded = signal(false);
  processing = signal(false);
  generatingGif = signal(false);
  gifProgress = signal(0);
  gifLoadingMessage = signal('Processing frames...');
  waifuState = signal<WaifuState>('idle');
  gifStudioMode = signal(false); // Modo GIF Studio inline
  compositionMode = signal(false); // 🎨 NEW: Modo Composition Layers
  showGifOptions = signal(false); // Mantener para compatibilidad, pero no usar modal
  showGifAdvancedSettings = signal(false); // Modal de configuración avanzada de GIF

  // Achievement & Gallery UI
  showAchievements = signal(false);
  showGallery = signal(false);
  showSettings = signal(false);
  hdMode = signal(false); // 🌟 NEW: HD Mode toggle for export
  gifQuality = signal(10); // 1 = Best, 30 = Worst. Default 10.
  imageFormat = signal<'png' | 'jpeg' | 'webp'>('png');
  imageQuality = signal(0.92); // 0-1

  // Mobile Navigation
  mobileActiveTab = signal<MobileNavigationTab>('upload');
  showMobileControls = signal(false);

  // Particle Editor
  showParticleEditor = signal(false);
  editingParticleLayerId: string | null = null;
  particleBrushSize = signal(2);
  particleBrushColor = signal('#FFFFFF');
  particleColors = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'];
  savedParticleSprites = signal<Array<{ id: string, data: string }>>([]);
  selectedParticleSpriteId = signal<string | null>(null);
  private isDrawingParticle = false;

  // Comparador before/after
  sliderPosition = signal(50); // Porcentaje 0-100
  isDragging = false;
  zoomLevel = signal(100); // Porcentaje de zoom
  viewMode = signal<'fit' | 'original'>('fit'); // Modo de vista del canvas
  private isPanningCanvas = false;
  private panStartX = 0;
  private panStartY = 0;
  private scrollStartX = 0;
  private scrollStartY = 0;

  // GIF Preview Zoom & View
  gifZoomLevel = signal(100); // Porcentaje de zoom para GIF
  gifViewMode = signal<'fit' | 'original'>('fit'); // Modo de vista del GIF
  private isPanningGif = false;
  private gifPanStartX = 0;
  private gifPanStartY = 0;
  private gifScrollStartX = 0;
  private gifScrollStartY = 0;

  // Effect Layers System
  effectLayers = signal<EffectLayer[]>([]);
  selectedLayerId = signal<string | null>(null);
  editingLayerId = signal<string | null>(null);
  effectEditorMode = signal<'normal' | 'advanced'>('normal'); // Normal = sliders, Advanced = knobs/vintage
  availableEffects: EffectType[] = ['scanline', 'vhs', 'noise', 'phosphor', 'rgb-split', 'motion-sense', 'particles', 'flames'];
  effectNames = EFFECT_NAMES;

  // Legacy GIF Options (mantener para compatibilidad)
  gifEffectType = signal<'scanline' | 'vhs' | 'noise' | 'phosphor' | 'rgb-split' | 'motion-sense'>('scanline');
  gifFrameCount = signal(30); // Increased from 20 for smoother loops
  gifFps = signal(12); // Decreased from 15 for longer duration (2.5s vs 1.3s)
  gifIntensity = signal(0.5);
  gifAddPulse = signal(false);
  gifAddGlitch = signal(false);
  gifLoopCount = signal(0);

  gifOptions: GifEffectOptions | null = null;

  // Preview animation para GIF Studio
  private previewFrames: string[] = [];

  // Ko-fi Modal (Mobile)
  showKofiModal = signal(false);
  kofiIframeUrl!: SafeResourceUrl;
  private currentPreviewFrame = 0;
  private previewInterval: any = null;
  private gifMobileAnimationInterval: any = null;
  private gifMobileFrames: GifFrame[] = []; // Store frames for download
  isGeneratingPreview = false; // Público para el template
  private previewDebounceTimer: any = null;
  private lastPreviewUpdate = 0;
  private previewScale = 0.5; // Renderizar preview al 50% para mejor performance
  private processImageDebounceTimer: any = null;

  // Imagen original
  originalImageData: ImageData | null = null;
  processedImageData: ImageData | null = null; // Imagen con dithering aplicado
  originalImage: HTMLImageElement | null = null;

  // Opciones de dithering
  selectedAlgorithm = signal('floyd-steinberg');
  selectedPalette = signal('monochrome');
  scale = signal(3);
  contrast = signal(50);
  midtones = signal(50);
  highlights = signal(50);
  blur = signal(0);

  // Waifu CRT
  waifuSpriteUrl = signal('assets/waifu-sprite.jpg'); // Aquí puedes poner la URL de tu sprite sheet

  // Dynamic Logo (computed from theme)
  navbarLogoUrl = signal('');

  // Listas de opciones
  algorithms = signal<{ id: string; name: string; category: string }[]>([]);
  palettes = signal<{ id: string; name: string }[]>([]);
  customPalettes = signal<ColorPalette[]>([]);
  presets = signal<DitheringPreset[]>([]);

  // UI State
  showPaletteCreator = signal(false);
  showPresetManager = signal(false);
  showSpriteUploader = signal(false);

  // Palette Creator
  newPaletteName = signal('');
  paletteColors = signal<string[]>(['#000000', '#ffffff']);

  // Preset Manager
  newPresetName = signal('');

  // Agrupar algoritmos por categoría
  get algorithmsByCategory(): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};
    this.algorithms().forEach(algo => {
      if (!grouped[algo.category]) {
        grouped[algo.category] = [];
      }
      grouped[algo.category].push(algo);
    });
    return grouped;
  }

  get categoryKeys(): string[] {
    return Object.keys(this.algorithmsByCategory);
  }

  /**
   * Helper methods para GIF Configuration display
   */
  getFrameDelay(): number {
    // Frame delay en milisegundos = 1000 / FPS
    return Math.round(1000 / this.gifFps());
  }

  setFrameDelayFromMs(delayMs: number): void {
    // Convertir delay en ms a FPS
    const fps = Math.round(1000 / delayMs);
    this.gifFps.set(Math.max(1, Math.min(60, fps))); // Limitar entre 1-60 FPS
  }

  getFPS(): number {
    return this.gifFps();
  }

  getTotalDuration(): string {
    // Duración total = (frames * delay) / 1000
    const totalMs = this.gifFrameCount() * this.getFrameDelay();
    const seconds = (totalMs / 1000).toFixed(1);
    return seconds;
  }

  constructor(
    private ditheringService: DitheringService,
    private cdr: ChangeDetectorRef,
    private storageService: StorageService,
    private spriteStorage: SpriteStorageService,
    private gifService: GifService,
    private dialogueService: DialogueService,
    private modalService: ModalService,
    private sanitizer: DomSanitizer,
    private effectRendererService: EffectRendererService,
    public waifuPositionService: WaifuPositionService,
    public achievementService: AchievementService,
    public galleryService: GalleryService,
    public compositionService: CompositionService,
    public compositionToolService: CompositionToolService,
    public historyService: HistoryService,
    public i18nService: I18nService,
    public themeService: ThemeService,
    public deviceService: DeviceDetectionService
  ) {
    this.algorithms.set(this.ditheringService.getAvailableAlgorithms());
    this.palettes.set(this.ditheringService.getAvailablePalettes());
    this.loadCustomPalettesAndPresets();
    this.loadSavedSprite();

    // Initialize Ko-fi iframe URL
    this.kofiIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://ko-fi.com/daede/?hidefeed=true&widget=true&embed=true&preview=true'
    );

    // Log performance optimizations
    this.logPerformanceOptimizations();

    // Update navbar logo when theme changes
    effect(() => {
      const themeId = this.themeService.currentTheme();
      this.updateNavbarLogo();
      this.updateKofiWidget();
    });

    // Initialize composition when entering composition tab in mobile
    effect(() => {
      if (this.mobileActiveTab() === 'composition' && this.deviceService.isMobile()) {
        // Use untracked to avoid infinite loops
        untracked(() => this.initializeCompositionIfNeeded());
      }
    });

    // Render GIF preview in mobile when effect layers change or when entering tab
    effect(() => {
      const tab = this.mobileActiveTab();
      if (tab === 'gif' && this.deviceService.isMobile()) {
        // Track changes to effect layers, composition state, and processed image
        const layers = this.effectLayers();
        const compositionState = this.compositionService.compositionState();
        const hasProcessed = this.processedImageData;
        // Render preview
        untracked(() => this.renderGifMobilePreview());
      } else {
        // Clean up animation when leaving GIF tab
        if (this.gifMobileAnimationInterval) {
          clearInterval(this.gifMobileAnimationInterval);
          this.gifMobileAnimationInterval = null;
        }
      }
    });

    // Sistema de diálogos esporádicos
    this.startDialogueSystem();

    // Listener para cerrar achievements panel
    window.addEventListener('close-achievements', () => {
      this.showAchievements.set(false);
    });
  }

  ngAfterViewInit() {
    // Inicializar canvas

    // Update Ko-fi widget with current theme after a delay
    setTimeout(() => {
      this.updateKofiWidget();
    }, 1500);
  }

  /**
   * Log performance optimizations being applied
   */
  private logPerformanceOptimizations(): void {
    const maxDim = this.deviceService.getMaxImageDimension();
    const isLowEnd = this.deviceService.isLowEndDevice();
    const reduceAnim = this.deviceService.shouldReduceAnimations();
    const useWorkers = this.deviceService.shouldUseWebWorkers();

  }

  /**
   * Maneja la carga de archivo
   */
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      // If there's already an image loaded, ask for confirmation
      if (this.imageLoaded()) {
        const confirmed = await this.modalService.confirm(
          'Loading a new image will reset all layers and effects. Continue?',
          'Load New Image'
        );

        if (!confirmed) {
          // Reset input
          input.value = '';
          return;
        }

        // Reset all modes and states
        this.resetAllModes();
      }

      const file = input.files[0];
      this.loadImage(file);
    }
  }

  /**
   * Reset all modes and states to clean slate
   */
  private resetAllModes(): void {
    // Exit composition mode
    if (this.compositionMode()) {
      this.compositionMode.set(false);
      this.compositionService.clearAllLayers();
    }

    // Exit GIF mode
    if (this.gifStudioMode()) {
      this.gifStudioMode.set(false);
      this.stopGifPreview();
      this.effectLayers.set([]);
    }

    // Reset zoom levels
    this.zoomLevel.set(100);
    this.gifZoomLevel.set(100);

    // Reset view modes
    this.viewMode.set('fit');
    this.gifViewMode.set('fit');
  }

  /**
   * Handle mobile file selection
   */
  async onMobileFileSelected(file: File) {
    if (this.imageLoaded()) {
      const confirmed = await this.modalService.confirm(
        'Loading a new image will reset all layers and effects. Continue?',
        'Load New Image'
      );

      if (!confirmed) return;
      this.resetAllModes();
    }

    this.loadImage(file);
  }

  /**
   * Handle mobile controls change
   */
  onMobileControlsChange(options: ControlsMobileOptions): void {
    this.selectedAlgorithm.set(options.algorithm);
    this.selectedPalette.set(options.palette);
    this.scale.set(options.scale);
    this.contrast.set(options.contrast);
    this.midtones.set(options.midtones);
    this.highlights.set(options.highlights);
    this.blur.set(options.blur);
    this.hdMode.set(options.hdMode);

    // Reprocess image with new options
    this.processImage();
  }

  /**
   * Carga una imagen desde un archivo
   */
  private loadImage(file: File) {
    this.waifuState.set('thinking');
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.imageLoaded.set(true);
        this.waifuState.set('happy');

        // Reset composition layers when loading a new image
        this.compositionService.clearAllLayers();

        // Switch to canvas tab in mobile after image loads
        if (this.deviceService.isMobile()) {
          this.mobileActiveTab.set('canvas');
        }

        // Forzar detección de cambios y esperar a que Angular renderice
        this.cdr.detectChanges();

        // Usar un delay más largo para asegurar que el DOM está listo
        setTimeout(() => {
          // Extraer los datos de la imagen para procesamiento
          this.extractImageData(img);

          // En mobile procesar inmediatamente, en desktop esperar el canvas
          if (this.deviceService.isMobile() || this.processedCanvas) {
            this.processImage();
          }
        }, 100);
      };
      img.onerror = () => {
        this.waifuState.set('error');
        setTimeout(() => this.waifuState.set('idle'), 2000);
      };
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  }

  /**
   * Extrae los ImageData de la imagen para procesamiento
   * (sin necesidad de canvas de preview original)
   */
  private extractImageData(img: HTMLImageElement) {
    // Crear un canvas temporal solo para extraer los datos
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Get device-specific max dimension
    const maxDimension = this.deviceService.getMaxImageDimension();

    // Calculate dimensions respecting aspect ratio
    let width = img.width;
    let height = img.height;

    // Scale down if image exceeds max dimension
    if (width > maxDimension || height > maxDimension) {
      const aspectRatio = width / height;

      if (width > height) {
        width = maxDimension;
        height = Math.round(maxDimension / aspectRatio);
      } else {
        height = maxDimension;
        width = Math.round(maxDimension * aspectRatio);
      }

    }

    tempCanvas.width = width;
    tempCanvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    this.originalImageData = ctx.getImageData(0, 0, width, height);
  }

  /**
   * Procesa la imagen con el algoritmo seleccionado
   */
  processImage() {
    if (!this.originalImageData) return;

    // En mobile no necesitamos el canvas desktop
    const isMobile = this.deviceService.isMobile();
    if (!isMobile && !this.processedCanvas) return;

    // Debounce image processing to avoid excessive reprocessing
    clearTimeout(this.processImageDebounceTimer);
    this.processImageDebounceTimer = setTimeout(() => {
      this.processImageImmediate();
    }, 300);
  }

  /**
   * Procesa la imagen inmediatamente sin debounce
   */
  private processImageImmediate() {
    if (!this.originalImageData) return;

    const isMobile = this.deviceService.isMobile();
    if (!isMobile && !this.processedCanvas) return;

    this.processing.set(true);
    this.waifuState.set('processing');

    // Usar setTimeout para no bloquear la UI
    setTimeout(async () => {
      const options: DitheringOptions = {
        algorithm: this.selectedAlgorithm(),
        scale: this.scale(),
        contrast: this.contrast(),
        midtones: this.midtones(),
        highlights: this.highlights(),
        blur: this.blur(),
        palette: this.selectedPalette()
      };

      let imageData: ImageData;

      // 🎨 Check if composition mode is active
      if (this.compositionMode() && this.compositionService.compositionState().layers.length > 0) {
        // Use composition rendering
        const compositionResult = await this.compositionService.renderForDithering();
        imageData = compositionResult.ditherableContent;

        // Apply dithering to ditherable content
        const dithered = await this.ditheringService.applyDitheringAsync(
          new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
          ),
          options
        );

        // Composite dithered content with exempt layers
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = imageData.width;
        finalCanvas.height = imageData.height;
        const finalCtx = finalCanvas.getContext('2d')!;

        // Draw dithered content
        finalCtx.putImageData(dithered, 0, 0);

        // Draw exempt layers on top (with color compression if needed)
        for (const exemptLayer of compositionResult.exemptLayers) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = exemptLayer.imageData.width;
          tempCanvas.height = exemptLayer.imageData.height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.putImageData(exemptLayer.imageData, 0, 0);

          finalCtx.save();
          finalCtx.globalAlpha = exemptLayer.layer.opacity / 100;

          const centerX = exemptLayer.layer.x + exemptLayer.layer.width / 2;
          const centerY = exemptLayer.layer.y + exemptLayer.layer.height / 2;

          finalCtx.translate(centerX, centerY);
          finalCtx.rotate((exemptLayer.layer.rotation * Math.PI) / 180);
          finalCtx.translate(-centerX, -centerY);

          finalCtx.drawImage(
            tempCanvas,
            exemptLayer.layer.x,
            exemptLayer.layer.y,
            exemptLayer.layer.width,
            exemptLayer.layer.height
          );

          finalCtx.restore();
        }

        // Get final composited image
        this.processedImageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
      } else {
        // Normal single-image processing
        imageData = new ImageData(
          new Uint8ClampedArray(this.originalImageData!.data),
          this.originalImageData!.width,
          this.originalImageData!.height
        );

        // Apply dithering
        this.processedImageData = await this.ditheringService.applyDitheringAsync(imageData, options);
      }

      // Dibujar resultado (solo en desktop)
      if (!isMobile && this.processedCanvas) {
        const canvas = this.processedCanvas.nativeElement;
        canvas.width = this.processedImageData.width;
        canvas.height = this.processedImageData.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          // Deshabilitar suavizado para mantener píxeles nítidos
          ctx.imageSmoothingEnabled = false;
          ctx.putImageData(this.processedImageData, 0, 0);
        }
      }

      this.processing.set(false);
      this.waifuState.set('success');

      // 🏆 Track achievement
      this.achievementService.trackImageProcessed(
        this.selectedAlgorithm(),
        this.selectedPalette()
      );

      // 🖼️ ALWAYS draw original in comparison (Preview mode should be isolated)
      // This ensures the original image is always visible regardless of mode changes
      if (!isMobile) {
        this.drawOriginalInComparison();
      }

      // Si estamos en modo GIF Studio, regenerar el preview con las nuevas opciones
      if (this.gifStudioMode() && !isMobile) {
        this.generateGifPreview();
      }

      // Volver a idle después de 2 segundos
      setTimeout(() => {
        this.waifuState.set('idle');
      }, 2000);
    }, 10);
  }

  /**
   * ===== COMPARADOR BEFORE/AFTER =====
   */

  // Dibuja la imagen original en el canvas de comparación
  drawOriginalInComparison() {
    if (!this.originalImage) return;

    // Use setTimeout to ensure DOM is ready (ViewChild might not be initialized yet)
    setTimeout(() => {
      if (!this.originalCompareCanvas) {
        console.warn('⚠️ originalCompareCanvas not available yet');
        return;
      }

      const canvas = this.originalCompareCanvas.nativeElement;
      canvas.width = this.originalImage!.width;
      canvas.height = this.originalImage!.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        // Deshabilitar suavizado para mantener píxeles nítidos
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.originalImage!, 0, 0);
      }
    }, 0);
  }

  // Inicia el arrastre del slider
  startDragging(event: MouseEvent | TouchEvent) {
    this.isDragging = true;
    event.preventDefault();

    // Agregar listeners globales
    const moveHandler = (e: MouseEvent | TouchEvent) => this.onDrag(e);
    const upHandler = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', moveHandler as any);
      document.removeEventListener('mouseup', upHandler);
      document.removeEventListener('touchmove', moveHandler as any);
      document.removeEventListener('touchend', upHandler);
    };

    document.addEventListener('mousemove', moveHandler as any);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('touchmove', moveHandler as any);
    document.addEventListener('touchend', upHandler);
  }

  // Maneja el arrastre
  private onDrag(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    const container = document.querySelector('.comparison-container') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;

    let percentage = ((clientX - rect.left) / rect.width) * 100;
    percentage = Math.max(0, Math.min(100, percentage));

    this.sliderPosition.set(percentage);
  }

  // Calcula el clip-path para revelar la imagen dithered
  getClipPath(): string {
    return `inset(0 ${100 - this.sliderPosition()}% 0 0)`;
  }

  // Controles de zoom
  zoomIn() {
    const current = this.zoomLevel();
    if (current < 200) {
      this.zoomLevel.set(Math.min(200, current + 25));
    }
  }

  zoomOut() {
    const current = this.zoomLevel();
    if (current > 25) {
      this.zoomLevel.set(Math.max(25, current - 25));
    }
  }

  resetZoom() {
    this.zoomLevel.set(100);
  }

  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'fit' ? 'original' : 'fit');
  }

  setViewMode(mode: 'fit' | 'original') {
    this.viewMode.set(mode);
  }

  // Calcula dimensiones escaladas
  getScaledWidth(): number {
    if (!this.originalImage) return 0;
    return this.originalImage.width * (this.zoomLevel() / 100);
  }

  getScaledHeight(): number {
    if (!this.originalImage) return 0;
    return this.originalImage.height * (this.zoomLevel() / 100);
  }

  // Controles de zoom para GIF Preview
  gifZoomIn() {
    const current = this.gifZoomLevel();
    if (current < 200) {
      this.gifZoomLevel.set(Math.min(200, current + 25));
    }
  }

  gifZoomOut() {
    const current = this.gifZoomLevel();
    if (current > 25) {
      this.gifZoomLevel.set(Math.max(25, current - 25));
    }
  }

  resetGifZoom() {
    this.gifZoomLevel.set(100);
  }

  setGifViewMode(mode: 'fit' | 'original') {
    this.gifViewMode.set(mode);
  }

  // Pan para modo comparación
  startCanvasPan(event: MouseEvent) {
    if (this.zoomLevel() <= 100) return;
    const target = event.target as HTMLElement;
    const scrollContainer = target.closest('.comparison-scroll-container') as HTMLElement;
    if (!scrollContainer) return;

    this.isPanningCanvas = true;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.scrollStartX = scrollContainer.scrollLeft;
    this.scrollStartY = scrollContainer.scrollTop;
    event.preventDefault();
  }

  updateCanvasPan(event: MouseEvent) {
    if (!this.isPanningCanvas) return;
    const target = event.target as HTMLElement;
    const scrollContainer = target.closest('.comparison-scroll-container') as HTMLElement;
    if (!scrollContainer) return;

    const deltaX = this.panStartX - event.clientX;
    const deltaY = this.panStartY - event.clientY;
    scrollContainer.scrollLeft = this.scrollStartX + deltaX;
    scrollContainer.scrollTop = this.scrollStartY + deltaY;
  }

  endCanvasPan() {
    this.isPanningCanvas = false;
  }

  // Pan para modo GIF
  startGifPan(event: MouseEvent) {
    if (this.gifZoomLevel() <= 100) return;
    const target = event.target as HTMLElement;
    const scrollContainer = target.closest('.gif-preview-scroll-container') as HTMLElement;
    if (!scrollContainer) return;

    this.isPanningGif = true;
    this.gifPanStartX = event.clientX;
    this.gifPanStartY = event.clientY;
    this.gifScrollStartX = scrollContainer.scrollLeft;
    this.gifScrollStartY = scrollContainer.scrollTop;
    event.preventDefault();
  }

  updateGifPan(event: MouseEvent) {
    if (!this.isPanningGif) return;
    const target = event.target as HTMLElement;
    const scrollContainer = target.closest('.gif-preview-scroll-container') as HTMLElement;
    if (!scrollContainer) return;

    const deltaX = this.gifPanStartX - event.clientX;
    const deltaY = this.gifPanStartY - event.clientY;
    scrollContainer.scrollLeft = this.gifScrollStartX + deltaX;
    scrollContainer.scrollTop = this.gifScrollStartY + deltaY;
  }

  endGifPan() {
    this.isPanningGif = false;
  }

  // Calcula dimensiones escaladas para GIF
  getGifScaledWidth(): number {
    if (!this.originalImage) return 0;
    return this.originalImage.width * (this.gifZoomLevel() / 100);
  }

  getGifScaledHeight(): number {
    if (!this.originalImage) return 0;
    return this.originalImage.height * (this.gifZoomLevel() / 100);
  }

  /**
   * ===== PARTICLE EDITOR =====
   */

  editParticleSprite(layerId: string) {
    this.openParticleEditor(layerId);
  }

  openParticleEditor(layerId: string) {
    this.editingParticleLayerId = layerId;
    this.showParticleEditor.set(true);
    this.loadSavedParticleSprites();

    // Inicializar canvas después de que se renderice
    setTimeout(() => {
      this.initParticleCanvas();

      // Note: Custom sprites now handled by WebGL particle system
    }, 50);
  }

  closeParticleEditor() {
    this.showParticleEditor.set(false);
    this.editingParticleLayerId = null;
    this.isDrawingParticle = false;
  }

  private initParticleCanvas() {
    if (!this.particleCanvas) return;

    const canvas = this.particleCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas (transparente)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  startDrawing(event: MouseEvent) {
    this.isDrawingParticle = true;
    this.draw(event);
  }

  draw(event: MouseEvent) {
    if (!this.isDrawingParticle || !this.particleCanvas) return;

    const canvas = this.particleCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));

    ctx.fillStyle = this.particleBrushColor();
    const brushSize = this.particleBrushSize();

    // Dibujar círculo
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  }

  stopDrawing() {
    this.isDrawingParticle = false;
  }

  clearParticleCanvas() {
    this.initParticleCanvas();
  }

  fillParticleCanvas() {
    if (!this.particleCanvas) return;

    const canvas = this.particleCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = this.particleBrushColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  saveParticleSprite() {
    if (!this.particleCanvas) return;

    const canvas = this.particleCanvas.nativeElement;
    const spriteData = canvas.toDataURL('image/png');

    // Guardar en lista de sprites
    const id = `particle-${Date.now()}`;
    const sprites = this.savedParticleSprites();
    sprites.push({ id, data: spriteData });
    this.savedParticleSprites.set([...sprites]);

    // Guardar en localStorage
    localStorage.setItem('particleSprites', JSON.stringify(sprites));

    // Aplicar al layer actual
    if (this.editingParticleLayerId) {
      this.updateLayerOption(this.editingParticleLayerId, 'particleCustomSprite', spriteData);
      this.selectedParticleSpriteId.set(id);
    }

    this.closeParticleEditor();
  }

  private loadSavedParticleSprites() {
    const saved = localStorage.getItem('particleSprites');
    if (saved) {
      try {
        const sprites = JSON.parse(saved);
        this.savedParticleSprites.set(sprites);
      } catch (e) {
        console.error('Error loading particle sprites:', e);
      }
    }
  }

  loadParticleSprite(spriteId: string) {
    const sprite = this.savedParticleSprites().find(s => s.id === spriteId);
    if (!sprite) return;

    this.loadSpriteDataToCanvas(sprite.data);
    this.selectedParticleSpriteId.set(spriteId);
  }

  private loadSpriteDataToCanvas(dataUrl: string) {
    if (!this.particleCanvas) return;

    const canvas = this.particleCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      this.initParticleCanvas();
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }

  deleteParticleSprite(spriteId: string) {
    const sprites = this.savedParticleSprites().filter(s => s.id !== spriteId);
    this.savedParticleSprites.set(sprites);
    localStorage.setItem('particleSprites', JSON.stringify(sprites));

    if (this.selectedParticleSpriteId() === spriteId) {
      this.selectedParticleSpriteId.set(null);
    }
  }

  /**
   * Descarga la imagen procesada
   */
  /**
   * Helper: Render composition and update processedCanvas synchronously
   */
  private renderCompositionToCanvas(): void {

    if (!this.compositionMode() || !this.compositionCanvasComponent) {
      return;
    }

    const state = this.compositionService.compositionState();

    if (state.layers.length === 0) {
      return;
    }


    // Use the same method as GIF export - includes dithering AND layer effects
    const compositionData = this.compositionCanvasComponent.getCompositionImageDataWithEffects();

    if (!compositionData) {
      return;
    }

    // Update processedImageData - already includes dithering and effects
    this.processedImageData = compositionData;

    // Update canvas if available (might not be visible in composition mode)
    if (this.processedCanvas?.nativeElement) {
      const canvas = this.processedCanvas.nativeElement;
      canvas.width = this.processedImageData.width;
      canvas.height = this.processedImageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(this.processedImageData, 0, 0);
      }
    }

  }

  async downloadImage() {
    if (!this.processedCanvas) return;

    // If in composition mode, render composition first
    if (this.compositionMode() && this.compositionService.compositionState().layers.length > 0) {
      this.renderCompositionToCanvas();
    }

    const sourceCanvas = this.processedCanvas.nativeElement;
    let finalCanvas = sourceCanvas;

    // 📉 Optimize size if NOT in HD mode
    if (!this.hdMode()) {
      const MAX_DIM = 1200; // Max dimension for lightweight usage
      if (sourceCanvas.width > MAX_DIM || sourceCanvas.height > MAX_DIM) {
        const scale = Math.min(MAX_DIM / sourceCanvas.width, MAX_DIM / sourceCanvas.height);
        const newWidth = Math.round(sourceCanvas.width * scale);
        const newHeight = Math.round(sourceCanvas.height * scale);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false; // Keep pixel art look
          ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
          finalCanvas = tempCanvas;
        }
      }
    }

    const link = document.createElement('a');
    const filename = this.compositionMode() ? 'composition' : 'dithered';

    // Format selection
    const format = this.imageFormat();
    let mimeType = 'image/png';
    let ext = 'png';

    if (format === 'jpeg') {
      mimeType = 'image/jpeg';
      ext = 'jpg';
    } else if (format === 'webp') {
      mimeType = 'image/webp';
      ext = 'webp';
    }

    link.download = `${filename}-${this.selectedAlgorithm()}-${Date.now()}.${ext}`;

    // Quality only applies to jpeg/webp
    if (format === 'png') {
      link.href = finalCanvas.toDataURL(mimeType);
    } else {
      link.href = finalCanvas.toDataURL(mimeType, this.imageQuality());
    }

    link.click();
  }

  /**
   * Trigger file input click
   */
  triggerFileInput() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Trigger camera input click
   */
  triggerCameraInput() {
    if (this.cameraInput) {
      this.cameraInput.nativeElement.click();
    }
  }

  /**
   * Handle drag & drop events
   */
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  @HostListener('drop', ['$event'])
  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Verificar que sea una imagen
      if (file.type.startsWith('image/')) {
        // If there's already an image loaded, ask for confirmation
        if (this.imageLoaded()) {
          const confirmed = await this.modalService.confirm(
            'Loading a new image will reset all layers and effects. Continue?',
            'Load New Image'
          );

          if (!confirmed) {
            return;
          }

          // Reset all modes and states
          this.resetAllModes();
        }

        this.loadImage(file);
      }
    }
  }

  /**
   * Take a picture using device camera
   */
  async takePicture() {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        await this.modalService.alert(
          '📷 Camera access is not supported in this browser.\n\n' +
          'Please use a modern browser like Chrome, Firefox, or Safari.',
          'Camera Not Available'
        );
        return;
      }

      // Show info message

      // Request camera access with options
      const constraints = {
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create video element to preview and capture
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true; // Important for iOS

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(true);
        };
        video.onerror = () => reject(new Error('Video load failed'));

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });


      // Wait a bit for camera to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Could not get canvas context');
      }

      // Capture frame
      ctx.drawImage(video, 0, 0);

      // Stop camera stream immediately after capture
      stream.getTracks().forEach(track => {
        track.stop();
      });

      // Convert to blob and load
      canvas.toBlob(async (blob) => {
        if (blob) {

          // If there's already an image loaded, ask for confirmation
          if (this.imageLoaded()) {
            const confirmed = await this.modalService.confirm(
              'Loading a new image will reset all layers and effects. Continue?',
              'Load New Image'
            );

            if (!confirmed) {
              return;
            }

            // Reset all modes and states
            this.resetAllModes();
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const file = new File([blob], `camera-${timestamp}.jpg`, { type: 'image/jpeg' });
          this.loadImage(file);
        }
      }, 'image/jpeg', 0.95);

    } catch (error: any) {
      console.error('❌ Camera error:', error);

      // Provide specific error messages
      let message = '📷 Could not access camera.\n\n';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message += '🔒 Permission denied.\n\n' +
          'Please allow camera access in your browser settings:\n\n' +
          '• Chrome: Click the camera icon in the address bar\n' +
          '• Firefox: Click the camera icon in the address bar\n' +
          '• Safari: Settings → Safari → Camera → Allow';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        message += '📹 No camera found.\n\n' +
          'Please make sure your device has a camera connected.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        message += '⚠️ Camera is already in use.\n\n' +
          'Please close other apps using the camera and try again.';
      } else if (error.name === 'OverconstrainedError') {
        message += '⚙️ Camera constraints not supported.\n\n' +
          'Your camera may not support the requested settings.';
      } else if (error.name === 'SecurityError') {
        message += '🔐 Security error.\n\n' +
          'Camera access requires HTTPS or localhost.\n' +
          'Please use a secure connection.';
      } else {
        message += '❌ An unexpected error occurred:\n\n' + error.message;
      }

      await this.modalService.alert(message, 'Camera Error');
    }
  }

  /**
   * Resetear controles a valores por defecto
   */
  resetControls() {
    this.scale.set(3);
    this.contrast.set(50);
    this.midtones.set(50);
    this.highlights.set(50);
    this.blur.set(0);
    if (this.imageLoaded()) {
      this.processImage();
    }
  }

  /**
   * Event handlers para cambios en controles
   */
  onAlgorithmChange() {
    this.syncDitheringOptionsToComposition();
    if (this.imageLoaded()) {
      this.processImage();
    }
  }

  onPaletteChange() {
    this.syncDitheringOptionsToComposition();
    if (this.imageLoaded()) {
      this.processImage();
    }
  }

  onControlChange() {
    this.syncDitheringOptionsToComposition();
    if (this.imageLoaded()) {
      // 🏆 Track setting adjustment
      this.achievementService.trackSettingAdjustment();
      this.processImage();
    }
  }

  /**
   * Sincroniza las opciones de dithering actuales con el composition service
   */
  private syncDitheringOptionsToComposition() {
    this.compositionService.ditheringOptions.set({
      algorithm: this.selectedAlgorithm(),
      scale: this.scale(),
      contrast: this.contrast(),
      midtones: this.midtones(),
      highlights: this.highlights(),
      blur: this.blur(),
      palette: this.selectedPalette(),
      threshold: 128
    });
  }

  /**
   * Obtiene los colores del palette seleccionado actual
   */
  getSelectedPaletteColors(): string[] {
    const paletteId = this.selectedPalette();

    // Buscar en paletas personalizadas primero
    const customPalette = this.customPalettes().find(p => p.id === paletteId);
    if (customPalette) {
      return customPalette.colors;
    }

    // Buscar en paletas predefinidas del servicio y convertir a hex
    const colors = this.ditheringService.getPaletteColors(paletteId);
    if (!colors) return ['#000000', '#FFFFFF'];
    return colors.map(([r, g, b]) =>
      '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
    );
  }

  /**
   * Carga paletas y presets del localStorage
   */
  loadCustomPalettesAndPresets() {
    const customPalettes = this.storageService.getCustomPalettes();
    this.customPalettes.set(customPalettes);

    // Agregar paletas personalizadas al servicio de dithering
    customPalettes.forEach(palette => {
      this.ditheringService.addCustomPalette(palette.id, palette.colors);
    });

    // Actualizar lista de paletas
    const allPalettes = [
      ...this.ditheringService.getAvailablePalettes(),
      ...customPalettes.map(p => ({ id: p.id, name: p.name }))
    ];
    this.palettes.set(allPalettes);

    // Cargar presets
    this.presets.set(this.storageService.getPresets());
  }

  /**
   * Palette Creator Methods
   */
  togglePaletteCreator() {
    this.showPaletteCreator.update(v => !v);
  }

  addColorToPalette() {
    this.paletteColors.update(colors => [...colors, '#000000']);
  }

  removeColorFromPalette(index: number) {
    this.paletteColors.update(colors => colors.filter((_, i) => i !== index));
  }

  updatePaletteColor(index: number, color: string) {
    this.paletteColors.update(colors => {
      const newColors = [...colors];
      newColors[index] = color;
      return newColors;
    });
  }

  saveCustomPalette() {
    const name = this.newPaletteName();
    const colors = this.paletteColors();

    if (!name || colors.length < 2) {
      alert('Please provide a name and at least 2 colors');
      return;
    }

    const palette: ColorPalette = {
      id: `custom-${Date.now()}`,
      name,
      colors,
      isCustom: true
    };

    this.storageService.saveCustomPalette(palette);
    this.loadCustomPalettesAndPresets();

    // Reset form
    this.newPaletteName.set('');
    this.paletteColors.set(['#000000', '#ffffff']);
    this.showPaletteCreator.set(false);

    // Trigger dialogue
    this.triggerDialogue('custom_palette');
  }

  deleteCustomPalette(paletteId: string) {
    this.modalService.confirm(
      'Are you sure you want to delete this palette?',
      'Delete Palette'
    ).then((confirmed) => {
      if (confirmed) {
        this.storageService.deleteCustomPalette(paletteId);
        this.loadCustomPalettesAndPresets();
      }
    });
  }

  /**
   * Preset Manager Methods
   */
  togglePresetManager() {
    this.showPresetManager.update(v => !v);
  }

  saveCurrentAsPreset() {
    const name = this.newPresetName();

    if (!name) {
      alert('Please provide a preset name');
      return;
    }

    const preset: DitheringPreset = {
      id: `preset-${Date.now()}`,
      name,
      algorithm: this.selectedAlgorithm(),
      palette: this.selectedPalette(),
      scale: this.scale(),
      contrast: this.contrast(),
      midtones: this.midtones(),
      highlights: this.highlights(),
      blur: this.blur()
    };

    this.storageService.savePreset(preset);
    this.presets.set(this.storageService.getPresets());

    // Reset form
    this.newPresetName.set('');
    alert('Preset saved successfully!');
  }

  loadPreset(presetId: string) {
    const preset = this.storageService.loadPreset(presetId);

    if (!preset) return;

    this.selectedAlgorithm.set(preset.algorithm);
    this.selectedPalette.set(preset.palette);
    this.scale.set(preset.scale);
    this.contrast.set(preset.contrast);
    this.midtones.set(preset.midtones);
    this.highlights.set(preset.highlights);
    this.blur.set(preset.blur);

    if (this.imageLoaded()) {
      this.processImage();
    }
  }

  deletePreset(presetId: string) {
    this.modalService.confirm(
      'Are you sure you want to delete this preset?',
      'Delete Preset'
    ).then((confirmed) => {
      if (confirmed) {
        this.storageService.deletePreset(presetId);
        this.presets.set(this.storageService.getPresets());
      }
    });
  }

  /**
   * Navbar Logo - Dynamic SVG generation
   */
  updateNavbarLogo() {
    const themeId = this.themeService.currentTheme();
    const theme = this.themeService.getThemeData(themeId);
    const primaryColor = theme.colors.primary;
    const backgroundColor = theme.colors.background;

    // Generate the EXACT same SVG structure as favicon
    const svg = `
      <svg width="520" height="520" viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <path fill="${primaryColor}" d="
          M 60,0  H 460
          V 20 H 500
          V 60 H 520
          V 460
          H 500 V 500
          H 460 V 520
          H 60
          V 500 H 20
          V 460 H 0
          V 60
          H 20 V 20
          H 60 V 0 Z
        "/>
        
        <path fill="${backgroundColor}" d="
          M 80,20 H 440
          V 40 H 480
          V 80 H 500
          V 440
          H 480 V 480
          H 440 V 500
          H 80
          V 480 H 40
          V 440 H 20
          V 80
          H 40 V 40
          H 80 V 20 Z
        "/>
        
        <g transform="translate(4, 4)">
          <defs>
            <pattern id="navbarDitherPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="${primaryColor}"/>
              <rect x="20" y="20" width="20" height="20" fill="${primaryColor}"/>
            </pattern>
          </defs>
          
          <path d="M120 120 H 300 V 300 H 120 Z" fill="${primaryColor}"/>
          <path d="M300 120 H 400 V 400 H 120 V 300 H 300 Z" fill="url(#navbarDitherPattern)"/>
          <rect x="360" y="140" width="40" height="40" fill="${primaryColor}" opacity="0.6"/>
        </g>
      </svg>
    `;

    const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
    const dataUri = `data:image/svg+xml,${encoded}`;
    this.navbarLogoUrl.set(dataUri);
  }

  /**
   * Update Ko-fi widget colors based on current theme
   */
  updateKofiWidget() {
    // Only show floating widget on desktop (mobile uses modal button instead)
    const isDesktop = window.innerWidth > 768;

    if (!isDesktop) {
      return;
    }

    const themeId = this.themeService.currentTheme();
    const theme = this.themeService.getThemeData(themeId);

    // Check if Ko-fi widget is loaded
    if (typeof (window as any).kofiWidgetOverlay !== 'undefined') {
      (window as any).kofiWidgetOverlay.draw('daede', {
        'type': 'floating-chat',
        'floating-chat.donateButton.text': 'Support me',
        'floating-chat.donateButton.background-color': theme.colors.primary,
        'floating-chat.donateButton.text-color': theme.colors.background
      });
    }
  }

  /**
   * Sprite Uploader Methods
   */
  loadSavedSprite() {
    const config = this.spriteStorage.loadSpriteConfig();
    if (config) {
      this.waifuSpriteUrl.set(config.imageData);
    }
  }

  onSpriteUpdated(spriteUrl: string) {
    this.waifuSpriteUrl.set(spriteUrl);
    // Trigger dialogue about sprite upload
    setTimeout(() => {
      this.triggerDialogue('sprite_upload');
    }, 500);
  }

  /**
   * GIF Generation Methods
   */
  toggleGifStudioMode() {
    this.gifStudioMode.update(current => !current);

    if (this.gifStudioMode()) {

      // Check if we need to render composition BEFORE turning off composition mode
      const wasInCompositionMode = this.compositionMode();
      const compositionState = this.compositionService.compositionState();
      const hasLayers = compositionState.layers.length > 0;

      // Render composition BEFORE turning off composition mode
      if (wasInCompositionMode && hasLayers) {
        this.renderCompositionToCanvas();
      }

      // Now turn off Composition mode
      if (wasInCompositionMode) {
        this.compositionMode.set(false);
      }

      // Activar modo GIF Studio
      this.triggerDialogue('gif_creation');
      this.generateGifPreview();
    } else {
      // 🖼️ Restore Preview mode: wait for DOM to update, then redraw
      this.stopGifPreview();

      setTimeout(() => {
        if (this.originalImageData && this.processedImageData) {
          // Redraw original image
          this.drawOriginalInComparison();

          // Restore processed canvas
          const canvas = this.processedCanvas.nativeElement;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = this.processedImageData.width;
            canvas.height = this.processedImageData.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;
            ctx.putImageData(this.processedImageData, 0, 0);
          }
        }
      }, 50);
    }
  }

  // Composition mobile UI state
  showCompositionLayers = signal(false);
  showLayerProps = signal(false);
  toolsCollapsed = signal(false);

  // GIF mode mobile UI state
  showGifLayers = signal(false);
  isGifPlaying = signal(false);
  activeEffectLayerId = signal<string | null>(null);
  gifPanelCollapsed = signal(true); // Start collapsed to not obstruct preview

  // Gallery mobile UI state
  gallerySearchQuery = '';
  selectedGalleryItem = signal<any | null>(null);
  filteredGalleryItems = computed(() => {
    const items = this.galleryService.gallery();
    if (!this.gallerySearchQuery.trim()) return items;
    const query = this.gallerySearchQuery.toLowerCase();
    return items.filter((item: any) =>
      item.name.toLowerCase().includes(query) ||
      item.tags?.some((tag: string) => tag.toLowerCase().includes(query))
    );
  });

  // GIF mode helpers
  canExportGif(): boolean {
    return this.effectLayers().length > 0;
  }

  exportGif(): void {
    if (this.canExportGif()) {
      this.generateGifPreview();
    }
  }

  toggleGifPlayback(): void {
    // Toggle GIF playback if preview exists
    const img = document.querySelector('.gif-preview') as HTMLImageElement;
    if (img) {
      // GIFs play automatically, this is just UI feedback
      this.isGifPlaying.update((v: boolean) => !v);
    }
  }

  getEffectLayerName(layer: any): string {
    const typeNames: Record<string, string> = {
      'scanline': 'Scanlines',
      'vhs': 'VHS',
      'noise': 'Noise',
      'phosphor': 'Phosphor',
      'rgb-split': 'RGB Split',
      'motion-sense': 'Motion',
      'particles': 'Particles',
      'flames': 'Flames'
    };
    return typeNames[layer.type] || layer.type;
  }

  editEffectLayer(id: string): void {
    // Set active layer for editing
    this.activeEffectLayerId.set(id);
    this.showGifOptions.set(true);
  }

  deleteEffectLayer(id: string): void {
    const layers = this.effectLayers();
    const filtered = layers.filter(l => l.id !== id);
    this.effectLayers.set(filtered);
    if (this.activeEffectLayerId() === id) {
      this.activeEffectLayerId.set(null);
    }
  }

  addEffectLayerMobile(): void {
    // Default to scanline effect when adding from mobile
    this.addEffectLayer('scanline');
  }

  toggleGifPanel(): void {
    this.gifPanelCollapsed.update(v => !v);
  }

  async renderGifMobilePreview(): Promise<void> {
    // Wait for canvas to be available if needed
    if (!this.gifStudioCanvas) {
      setTimeout(() => this.renderGifMobilePreview(), 100);
      return;
    }

    const canvas = this.gifStudioCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get composition image data (with all composition layers)
    let baseImageData: ImageData | null = null;

    // Check if there are composition layers (regardless of compositionMode)
    const compositionState = this.compositionService.compositionState();
    if (compositionState.layers.length > 0 && this.compositionCanvasComponent) {
      // Use composition with all its layers (includes per-layer effects)
      baseImageData = this.compositionCanvasComponent.getCompositionImageDataWithEffects();
    } else if (this.processedImageData) {
      // Fallback to processed image
      baseImageData = this.processedImageData;
    }

    if (!baseImageData) {
      return;
    }

    // Get enabled effect layers in order
    const enabledLayers = this.getSortedLayers().filter(layer => layer.enabled);

    if (enabledLayers.length === 0) {
      // No effects, just show composition/processed image - clear any animation first
      if (this.gifMobileAnimationInterval) {
        clearInterval(this.gifMobileAnimationInterval);
        this.gifMobileAnimationInterval = null;
      }
      ctx.putImageData(baseImageData, 0, 0);
      return;
    }

    // Generate animated frames like desktop
    const frames = await this.effectRendererService.createLayeredEffectFrames(baseImageData, enabledLayers, this.gifFrameCount(), this.gifFps(), (p) => this.gifProgress.set(p));

    if (frames.length > 0) {
      // Store frames for download
      this.gifMobileFrames = frames;

      // Animate frames
      let currentFrame = 0;
      const fps = this.gifFps();
      const interval = 1000 / fps;

      // Stop previous animation if any
      if (this.gifMobileAnimationInterval) {
        clearInterval(this.gifMobileAnimationInterval);
      }

      // Start animation loop
      this.gifMobileAnimationInterval = setInterval(() => {
        ctx.putImageData(frames[currentFrame].imageData, 0, 0);
        currentFrame = (currentFrame + 1) % frames.length;
      }, interval);

      // Show first frame immediately
      ctx.putImageData(frames[0].imageData, 0, 0);
    }
  }

  async downloadGifMobile(): Promise<void> {
    if (this.gifMobileFrames.length === 0) {
      console.warn('No frames available for download');
      return;
    }

    this.generatingGif.set(true);
    this.gifProgress.set(0);
    this.gifLoadingMessage.set('Generating GIF...');

    try {
      // Calculate optimized dimensions
      let width = this.gifMobileFrames[0].imageData.width;
      let height = this.gifMobileFrames[0].imageData.height;

      if (!this.hdMode()) {
        const MAX_GIF_DIM = 600; // Aggressive downscaling for "light" GIFs
        if (width > MAX_GIF_DIM || height > MAX_GIF_DIM) {
          const scale = Math.min(MAX_GIF_DIM / width, MAX_GIF_DIM / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
      }

      const blob = await this.gifService.exportAsGif(
        this.gifMobileFrames,
        {
          quality: this.gifQuality(),
          workers: 2,
          repeat: this.gifLoopCount(),
          width,
          height
        },
        (progress) => {
          this.gifProgress.set(progress);
        }
      );

      // Download the GIF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dithered-gif-${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);

      // Achievement
      this.achievementService.trackGifCreated(this.effectLayers().filter(l => l.enabled).length);
    } catch (error) {
      console.error('Error generating GIF:', error);
    } finally {
      this.generatingGif.set(false);
    }
  }

  updateLayerIntensityMobile(layerId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const intensity = parseFloat(target.value) / 100;
    this.updateLayerIntensity(layerId, intensity);
  }

  updateLayerOptionMobile(layerId: string, optionKey: string, event: Event, scale: number = 1): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;

    // Handle different input types
    let value: any;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      value = target.checked;
    } else if (target instanceof HTMLSelectElement) {
      value = target.value;
    } else if (target instanceof HTMLInputElement && target.type === 'range') {
      value = parseFloat(target.value) * scale;
    } else {
      value = parseFloat((target as HTMLInputElement).value) * scale;
    }

    this.updateLayerOption(layerId, optionKey, value);
  }

  // Gallery Mobile Methods
  onGallerySearch(): void {
    // Trigger reactivity - filteredGalleryItems computed will update automatically
  }

  openGalleryItemMobile(item: any): void {
    this.selectedGalleryItem.set(item);
  }

  closeGalleryItemMobile(): void {
    this.selectedGalleryItem.set(null);
  }

  loadGalleryItemToCanvas(item: any): void {
    // Load the gallery item back to canvas
    const img = new Image();
    img.onload = () => {
      this.originalImage = img;
      this.imageLoaded.set(true);

      // Extract canvas data
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      this.originalImageData = ctx.getImageData(0, 0, img.width, img.height);

      // Apply stored settings if available
      if (item.settings) {
        this.applySettingsFromGallery(item.settings);
      }

      // Process and switch to canvas tab
      this.processImage();
      this.mobileActiveTab.set('canvas');
      this.closeGalleryItemMobile();
    };
    img.src = item.fullImage;
  }

  applySettingsFromGallery(settings: any): void {
    // Apply dithering settings from gallery item
    if (settings.algorithm) this.selectedAlgorithm.set(settings.algorithm);
    if (settings.palette) this.selectedPalette.set(settings.palette);
    // Note: Other settings like threshold, colorCount, brightness, etc.
    // would need to be applied through the mobile controls component
    // or stored as signals in this component. For now just apply algorithm and palette.
  }

  deleteGalleryItemMobile(item: any): void {
    if (confirm(`Delete "${item.name}"?`)) {
      this.galleryService.removeItem(item.id);
      this.closeGalleryItemMobile();
    }
  }

  formatGalleryDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return this.i18nService.t('gallery.today');
    if (diffDays === 1) return this.i18nService.t('gallery.yesterday');
    if (diffDays < 7) return `${diffDays} ${this.i18nService.t('gallery.daysAgo')}`;
    return date.toLocaleDateString();
  }

  // Settings Mobile Methods
  clearGalleryMobile(): void {
    const count = this.galleryService.gallery().length;
    if (confirm(`Delete all ${count} items from gallery? This cannot be undone.`)) {
      this.galleryService.clearGallery();
    }
  }

  gifPreviewUrl = computed(() => {
    // Return null for now - will be implemented when GIF generation is connected
    // TODO: Return actual generated GIF URL
    return null as string | null;
  });

  gifPreviewData = computed(() => {
    // Check if GIF has been generated
    return this.gifProgress() === 100 && this.gifLoadingMessage() === 'Complete!';
  });

  downloadGif(): void {
    // Trigger GIF download
    if (this.gifPreviewData()) {
      // Use existing download logic from desktop
      const link = document.createElement('a');
      const canvas = document.querySelector('.gif-canvas-mobile') as HTMLCanvasElement;
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `dithered-gif-${Date.now()}.gif`;
            link.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    }
  }

  initializeCompositionIfNeeded() {
    // Initialize composition when entering mobile composition tab
    if (!this.originalImage || !this.originalImageData) {
      return;
    }

    const state = this.compositionService.compositionState();

    // Sync dithering options
    this.syncDitheringOptionsToComposition();

    // Set canvas size to match ORIGINAL image
    this.compositionService.setCanvasSize(
      this.originalImageData.width,
      this.originalImageData.height
    );

    // Only initialize layers if there are none
    if (state.layers.length === 0) {
      this.compositionService.addLayer(this.originalImage, this.originalImageData, { x: 0, y: 0 });
    }
  }



  toggleCompositionMode() {
    this.compositionMode.update(current => !current);

    if (this.compositionMode()) {
      // Sync dithering options
      this.syncDitheringOptionsToComposition();

      // Turn off GIF mode if active
      if (this.gifStudioMode()) {
        this.gifStudioMode.set(false);
        this.stopGifPreview();
      }

      // Initialize composition canvas with processed image size (includes scale factor)
      if (this.processedImageData && this.originalImage && this.originalImageData) {
        const state = this.compositionService.compositionState();

        // Set canvas size to match ORIGINAL image (not scaled)
        // Scale will be applied during rendering/export
        this.compositionService.setCanvasSize(
          this.originalImageData.width,
          this.originalImageData.height
        );

        // Only initialize layers if there are none (first time or after reset)
        if (state.layers.length === 0) {
          // Use originalImageData (not processed) for the layer
          // Processing/dithering will be applied during render
          this.compositionService.addLayer(this.originalImage, this.originalImageData, { x: 0, y: 0 });
        } else {
        }
      }

      this.triggerDialogue('composition_mode');
    } else {
      // 🖼️ Restore Preview mode: wait for DOM to update, then redraw
      setTimeout(() => {
        if (this.originalImageData) {
          this.drawOriginalInComparison();
          this.processImage();
        }
      }, 50);
    }
  }

  exitAllModes() {
    const needsRefresh = this.compositionMode() || this.gifStudioMode();

    if (this.compositionMode()) {
      this.compositionMode.set(false);
    }

    if (this.gifStudioMode()) {
      this.gifStudioMode.set(false);
      this.stopGifPreview();
    }

    // 🖼️ Restore Preview mode: wait for DOM to update, then redraw
    if (needsRefresh) {
      setTimeout(() => {
        if (this.originalImageData) {
          // Force redraw of both original and processed images
          this.drawOriginalInComparison();
          this.processImage();
        }
      }, 50);
    }
  }

  /**
   * ===== COMPOSITION TOOLBAR HANDLERS =====
   */

  onToolChange(tool: ToolType): void {
    // El composition-canvas component escuchará esto si lo necesita
    // Por ahora solo lo logueamos
  }

  onToolOptionsChange(options: ToolOptions): void {
    // Las opciones se usarán cuando se creen nuevas capas
  }

  /**
   * ===== KEYBOARD SHORTCUTS =====
   */

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Solo procesar shortcuts en composition mode
    if (!this.compositionMode()) return;

    // Evitar shortcuts si estamos escribiendo en un input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = event.key.toLowerCase();

    // Tool shortcuts (sin modificadores)
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      switch (key) {
        case 'v':
          this.compositionToolService.setTool('select');
          event.preventDefault();
          break;
        case 'h':
          this.compositionToolService.setTool('hand');
          event.preventDefault();
          break;
        case 'z':
          this.compositionToolService.setTool('zoom');
          event.preventDefault();
          break;
        case 'u':
          this.compositionToolService.setTool('shape');
          event.preventDefault();
          break;
        case 't':
          this.compositionToolService.setTool('text');
          event.preventDefault();
          break;
        case 'b':
          this.compositionToolService.setTool('brush');
          event.preventDefault();
          break;
      }
    }

    // Undo/Redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'z') {
      if (this.historyService.undo()) {
        const redoDesc = this.historyService.getRedoDescription();
        this.triggerDialogue('undo');
      } else {
      }
      event.preventDefault();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (event.shiftKey && key === 'z' || key === 'y')) {
      if (this.historyService.redo()) {
        const undoDesc = this.historyService.getUndoDescription();
        this.triggerDialogue('redo');
      } else {
      }
      event.preventDefault();
      return;
    }

    // Delete selected layers (Delete or Backspace)
    if (key === 'delete' || key === 'backspace') {
      const selectedLayers = this.compositionService.getSelectedLayers();
      if (selectedLayers.length > 0 && !selectedLayers[0].locked) {
        selectedLayers.forEach(layer => {
          if (!layer.locked) {
            this.compositionService.removeLayer(layer.id);
          }
        });
        event.preventDefault();
      }
    }

    // Copy selected layers (Ctrl+C)
    if ((event.ctrlKey || event.metaKey) && key === 'c') {
      this.compositionService.copySelectedLayers();
      event.preventDefault();
    }

    // Paste layers (Ctrl+V)
    if ((event.ctrlKey || event.metaKey) && key === 'v') {
      const clipboardLayers = this.compositionService.getClipboardLayers();
      if (clipboardLayers.length > 0) {
        const state = this.compositionService.compositionState();
        const newLayers = clipboardLayers.map((layer, index) => ({
          ...layer,
          id: `layer-${Date.now()}-${Math.random()}-${index}`,
          name: `${layer.name} (copy)`,
          order: state.layers.length + index,
          x: layer.x + 20,
          y: layer.y + 20,
          imageData: new ImageData(
            new Uint8ClampedArray(layer.imageData.data),
            layer.imageData.width,
            layer.imageData.height
          )
        }));

        const command = new BatchAddLayersCommand(
          this.compositionService,
          newLayers,
          `Paste ${newLayers.length} layer${newLayers.length > 1 ? 's' : ''}`
        );
        this.historyService.execute(command);
      }
      event.preventDefault();
    }

    // Duplicate selected layers (Ctrl+D)
    if ((event.ctrlKey || event.metaKey) && key === 'd') {
      const selectedLayers = this.compositionService.getSelectedLayers();
      if (selectedLayers.length > 0) {
        // Create duplicated layers data (without adding them yet)
        const state = this.compositionService.compositionState();
        const newLayers = selectedLayers.map((layer, index) => ({
          ...layer,
          id: `layer-${Date.now()}-${Math.random()}-${index}`,
          name: `${layer.name} Copy`,
          order: state.layers.length + index,
          x: layer.x + 20,
          y: layer.y + 20,
          imageData: new ImageData(
            new Uint8ClampedArray(layer.imageData.data),
            layer.imageData.width,
            layer.imageData.height
          )
        }));

        // Create and execute command
        const command = new BatchAddLayersCommand(
          this.compositionService,
          newLayers,
          `Duplicate ${newLayers.length} layer${newLayers.length > 1 ? 's' : ''}`
        );
        this.historyService.execute(command);
      }
      event.preventDefault();
    }
  }

  showGifOptionsModal() {
    // Ahora solo activa el modo GIF Studio
    this.gifStudioMode.set(true);
    this.triggerDialogue('gif_creation');
    this.generateGifPreview();
  }

  onGifOptionsClose() {
    // Desactivar modo GIF Studio
    this.gifStudioMode.set(false);
    this.stopGifPreview();
    // Restaurar la imagen procesada original
    if (this.processedImageData) {
      const canvas = this.processedCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = this.processedImageData.width;
        canvas.height = this.processedImageData.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.putImageData(this.processedImageData, 0, 0);
      }
    }
  }

  onPreviewFrameUpdate(frameDataUrl: string) {
    // Convertir el dataURL a imagen y dibujarla en el canvas derecho
    const img = new Image();
    img.onload = () => {
      const canvas = this.processedCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = frameDataUrl;
  }

  async onGifOptionsGenerate(options: GifEffectOptions) {
    this.gifOptions = options;
    this.showGifOptions.set(false);
    await this.downloadAnimatedGif();
  }

  async downloadAnimatedGif() {
    if (!this.originalImageData || this.processing() || this.generatingGif()) {
      return;
    }

    try {
      this.generatingGif.set(true);
      this.gifProgress.set(0);
      this.waifuState.set('processing');
      this.gifLoadingMessage.set('Creating animation frames...');

      // COMPOSITION MODE: Export composition with layer effects
      if (this.compositionMode() && this.compositionCanvasComponent) {
        const compositionData = this.compositionCanvasComponent.getCompositionImageDataWithEffects();
        if (!compositionData) {
          throw new Error('No composition data available for GIF export');
        }

        // Dithering is already applied per-layer in getCompositionImageDataWithEffects()
        // No need to apply it again here

        // For now, composition exports as single-frame GIF (static)
        // TODO: Could add animation support for composition layers in the future
        const frames: GifFrame[] = [{
          imageData: compositionData,
          delay: 1000 // 1 second
        }];

        this.gifLoadingMessage.set('Encoding GIF... This may take a moment');

        // Calculate optimized dimensions
        let width = compositionData.width;
        let height = compositionData.height;

        if (!this.hdMode()) {
          const MAX_GIF_DIM = 600;
          if (width > MAX_GIF_DIM || height > MAX_GIF_DIM) {
            const scale = Math.min(MAX_GIF_DIM / width, MAX_GIF_DIM / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
        }

        const blob = await this.gifService.exportAsGif(
          frames,
          {
            quality: this.gifQuality(),
            workers: 2,
            repeat: 0, // No loop for static image
            width,
            height
          },
          (progress) => {
            this.gifProgress.set(50 + Math.floor(progress / 2));
          }
        );

        // Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `composition-${Date.now()}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        this.gifProgress.set(100);
        this.gifLoadingMessage.set('GIF created successfully!');
        this.waifuState.set('success');

        setTimeout(() => {
          this.generatingGif.set(false);
          this.waifuState.set('idle');
        }, 1500);

        return;
      }

      // GIF STUDIO MODE or LEGACY: Use baseImageData + effect layers
      // Usar imagen procesada si existe, sino usar original
      const baseImageData = this.processedImageData || this.originalImageData;

      // Si hay capas de efectos, usar el nuevo sistema
      const enabledLayers = this.getSortedLayers().filter(l => l.enabled);

      let frames: GifFrame[];

      if (enabledLayers.length > 0) {
        // Usar sistema de capas
        frames = await this.effectRendererService.createLayeredEffectFrames(baseImageData, enabledLayers, this.gifFrameCount(), this.gifFps(), (p) => this.gifProgress.set(p));
      } else {
        // Fallback al sistema legacy (si no hay capas)
        const options: GifEffectOptions = {
          effectType: this.gifEffectType(),
          frameCount: this.gifFrameCount(),
          fps: this.gifFps(),
          intensity: this.gifIntensity(),
          addPulse: this.gifAddPulse(),
          addGlitch: this.gifAddGlitch(),
          loopCount: this.gifLoopCount(),
          quality: this.gifQuality()
        };

        frames = await this.createLegacyEffectFrames(baseImageData, options);
      }

      this.gifLoadingMessage.set('Encoding GIF... This may take a moment');

      // Exportar como GIF usando gif.js
      const widthOriginal = baseImageData.width;
      const heightOriginal = baseImageData.height;
      let width = widthOriginal;
      let height = heightOriginal;

      if (!this.hdMode()) {
        const MAX_GIF_DIM = 600;
        if (width > MAX_GIF_DIM || height > MAX_GIF_DIM) {
          const scale = Math.min(MAX_GIF_DIM / width, MAX_GIF_DIM / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
      }

      const blob = await this.gifService.exportAsGif(
        frames,
        {
          quality: this.gifQuality(),
          workers: 2,
          repeat: this.gifLoopCount(),
          width,
          height
        },
        (progress) => {
          // Progreso de encoding (50-100%)
          this.gifProgress.set(50 + Math.floor(progress / 2));
        }
      );

      // Descargar el GIF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `dithered-animated-${Date.now()}.gif`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      this.gifProgress.set(100);
      this.gifLoadingMessage.set('GIF created successfully!');
      this.waifuState.set('success');

      // 🏆 Track achievement
      this.achievementService.trackGifCreated(enabledLayers.length);

      // Cerrar el modal después de un momento
      setTimeout(() => {
        this.generatingGif.set(false);
        this.waifuState.set('idle');
      }, 1500);

    } catch (error) {
      console.error('Error generating animated GIF:', error);
      this.gifLoadingMessage.set('Error generating GIF');
      this.waifuState.set('error');

      setTimeout(() => {
        this.generatingGif.set(false);
        this.waifuState.set('idle');
      }, 2000);

      alert('Error generating animated GIF. Make sure gif.js is properly installed.');
    }
  }

  /**
   * Legacy effect frames (fallback cuando no hay capas)
   */
  private async createLegacyEffectFrames(baseImageData: ImageData, options: GifEffectOptions): Promise<GifFrame[]> {
    let frames: GifFrame[];

    switch (options.effectType) {
      case 'scanline':
        frames = await this.gifService.createScanlineEffect(baseImageData, options.frameCount);
        break;
      case 'vhs':
        frames = await this.gifService.createVHSEffect(baseImageData, options.frameCount);
        break;
      case 'noise':
        frames = this.createNoiseEffect(baseImageData, options);
        break;
      case 'phosphor':
        frames = this.createPhosphorEffect(baseImageData, options);
        break;
      case 'rgb-split':
        frames = this.createRgbSplitEffect(baseImageData, options);
        break;
      case 'motion-sense':
        frames = this.createMotionSenseEffect(baseImageData, options);
        break;
      default:
        frames = await this.gifService.createScanlineEffect(baseImageData, options.frameCount);
    }

    return frames.map((frame, i) => {
      const progress = Math.floor((i + 1) / frames.length * 50);
      this.gifProgress.set(progress);
      return frame;
    });
  }

  /**
   * Effect generators
   */
  private createNoiseEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      // Copiar imagen original
      ctx.putImageData(imageData, 0, 0);

      // Agregar ruido
      const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frameData.data;

      for (let j = 0; j < data.length; j += 4) {
        const noise = (Math.random() - 0.5) * options.intensity * 50;
        data[j] += noise;
        data[j + 1] += noise;
        data[j + 2] += noise;
      }

      ctx.putImageData(frameData, 0, 0);
      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  private createPhosphorEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      ctx.putImageData(imageData, 0, 0);
      const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frameData.data;

      // Efecto de fosforescencia verde
      const phase = (i / options.frameCount) * Math.PI * 2;
      const intensity = 0.5 + Math.sin(phase) * 0.5 * options.intensity;

      for (let j = 0; j < data.length; j += 4) {
        const green = data[j + 1];
        data[j] = data[j] * 0.3; // Reducir rojo
        data[j + 1] = Math.min(255, green * (1 + intensity * 0.5)); // Aumentar verde
        data[j + 2] = data[j + 2] * 0.3; // Reducir azul
      }

      ctx.putImageData(frameData, 0, 0);
      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  private createRgbSplitEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      // Calcular desplazamiento
      const phase = (i / options.frameCount) * Math.PI * 2;
      const offsetX = Math.sin(phase) * options.intensity * 5;
      const offsetY = Math.cos(phase) * options.intensity * 5;

      // Canal rojo
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'sepia(1) hue-rotate(0deg)';
      ctx.putImageData(imageData, offsetX, 0);

      // Canal verde
      ctx.filter = 'sepia(1) hue-rotate(120deg)';
      ctx.putImageData(imageData, 0, 0);

      // Canal azul
      ctx.filter = 'sepia(1) hue-rotate(240deg)';
      ctx.putImageData(imageData, -offsetX, offsetY);

      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';

      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  private createMotionSenseEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      // Calcular dirección y fase del movimiento
      const phase = (i / options.frameCount) * Math.PI * 2;
      const direction = Math.sin(phase);
      const blurAmount = Math.abs(direction) * options.intensity * 10;

      // Crear múltiples capas con desplazamiento para simular motion blur
      const layers = 5;
      ctx.globalAlpha = 1 / layers;

      for (let layer = 0; layer < layers; layer++) {
        const offset = (layer / layers) * direction * options.intensity * 15;

        // Aplicar blur con canvas
        ctx.filter = `blur(${blurAmount / layers}px)`;
        ctx.putImageData(imageData, offset, 0);
      }

      ctx.filter = 'none';
      ctx.globalAlpha = 1;


      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  /**
   * Dialogue System
   */
  private startDialogueSystem() {
    // Verificar si es la primera visita
    const isFirstVisit = !localStorage.getItem('has_visited');
    if (isFirstVisit) {
      localStorage.setItem('has_visited', 'true');
      setTimeout(() => {
        this.dialogueService.triggerEventDialogue('first_visit');
      }, 2000);
      return;
    }

    // Sistema de diálogos aleatorios cada cierto tiempo
    setInterval(() => {
      // Solo mostrar si no hay un diálogo activo
      if (!this.dialogueService.dialogueState().isActive) {
        if (this.dialogueService.shouldShowDialogue()) {
          this.dialogueService.showRandomDialogue();
        }
      }
    }, 60000); // Verificar cada minuto

    // Detectar sesión larga (después de 30 minutos)
    setTimeout(() => {
      if (this.imageLoaded() && !this.dialogueService.dialogueState().isActive) {
        this.dialogueService.triggerEventDialogue('long_session');
      }
    }, 30 * 60 * 1000);

    // Detectar si es de noche (10 PM - 5 AM)
    const hour = new Date().getHours();
    if ((hour >= 22 || hour <= 5) && !this.dialogueService.dialogueState().isActive) {
      setTimeout(() => {
        this.dialogueService.triggerEventDialogue('late_night');
      }, 5 * 60 * 1000); // Después de 5 minutos trabajando de noche
    }
  }

  // Triggear diálogos específicos desde la app
  triggerDialogue(eventType: string) {
    this.dialogueService.triggerEventDialogue(eventType);
  }

  /**
   * GIF Preview System con optimización de rendimiento
   */
  async generateGifPreview() {
    if (!this.processedImageData || this.isGeneratingPreview) return;

    // Debouncing: esperar 300ms después del último cambio
    const now = Date.now();
    if (now - this.lastPreviewUpdate < 300) {
      clearTimeout(this.previewDebounceTimer);
      this.previewDebounceTimer = setTimeout(() => this.generateGifPreview(), 300);
      return;
    }
    this.lastPreviewUpdate = now;

    this.isGeneratingPreview = true;
    this.stopGifPreview();
    this.previewFrames = [];

    // Aumentar frames para ver ciclo completo de animación (especialmente para flamas)
    const configuredFrames = this.gifFrameCount();
    const previewFrameCount = Math.min(20, Math.max(15, Math.floor(configuredFrames / 2)));


    // Verificar si estamos en modo GIF Studio con capas
    const layersCount = this.effectLayers().length;
    const enabledLayers = this.effectLayers().filter(layer => layer.enabled);

    // COMPOSITION MODE: Show composition with layer effects
    if (this.compositionMode() && this.compositionCanvasComponent) {
      const compositionData = this.compositionCanvasComponent.getCompositionImageDataWithEffects();
      if (compositionData) {
        // Dithering is already applied per-layer in getCompositionImageDataWithEffects()
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = compositionData.width;
        frameCanvas.height = compositionData.height;
        const ctx = frameCanvas.getContext('2d')!;
        ctx.putImageData(compositionData, 0, 0);
        this.previewFrames.push(frameCanvas.toDataURL());
      } else {
      }
    }
    // GIF STUDIO MODE: Show effect layers animation
    else if (this.gifStudioMode() && layersCount > 0) {

      if (enabledLayers.length > 0) {
        // Escalar imagen para preview más pequeño
        const scaledImageData = this.scaleImageDataForPreview(this.processedImageData);

        // Usar el sistema de capas
        const tempFrameCount = this.gifFrameCount();
        this.gifFrameCount.set(previewFrameCount);

        const frames = await this.effectRendererService.createLayeredEffectFrames(scaledImageData, enabledLayers, previewFrameCount, this.gifFps(), (p) => this.gifProgress.set(p));

        this.gifFrameCount.set(tempFrameCount);

        // Convertir frames a base64
        for (const frame of frames) {
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = frame.imageData.width;
          frameCanvas.height = frame.imageData.height;
          const ctx = frameCanvas.getContext('2d')!;
          ctx.putImageData(frame.imageData, 0, 0);
          this.previewFrames.push(frameCanvas.toDataURL());
        }
      } else {
        // Sin capas habilitadas, mostrar imagen estática
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = this.processedImageData.width;
        frameCanvas.height = this.processedImageData.height;
        const ctx = frameCanvas.getContext('2d')!;
        ctx.putImageData(this.processedImageData, 0, 0);
        this.previewFrames.push(frameCanvas.toDataURL());
      }
    } else {
      // Sin capas, mostrar imagen estática sin efectos
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = this.processedImageData.width;
      frameCanvas.height = this.processedImageData.height;
      const ctx = frameCanvas.getContext('2d')!;
      ctx.putImageData(this.processedImageData, 0, 0);
      this.previewFrames.push(frameCanvas.toDataURL());
    }

    this.currentPreviewFrame = 0;
    this.isGeneratingPreview = false;
    this.startPreviewAnimation();
  }

  /**
   * Escala la imagen para un preview más rápido
   */
  private scaleImageDataForPreview(imageData: ImageData): ImageData {
    if (this.previewScale >= 1.0) return imageData;

    const scaledWidth = Math.floor(imageData.width * this.previewScale);
    const scaledHeight = Math.floor(imageData.height * this.previewScale);

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledWidth;
    scaledCanvas.height = scaledHeight;
    const scaledCtx = scaledCanvas.getContext('2d')!;
    scaledCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

    return scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
  }
  private startPreviewAnimation() {
    this.stopPreviewAnimation();
    this.previewInterval = setInterval(() => {
      if (this.previewFrames.length > 0) {
        this.currentPreviewFrame = (this.currentPreviewFrame + 1) % this.previewFrames.length;
        this.updatePreviewCanvas();
      }
    }, 1000 / this.gifFps());
  }

  private stopPreviewAnimation() {
    if (this.previewInterval) {
      clearInterval(this.previewInterval);
      this.previewInterval = null;
    }
  }

  private updatePreviewCanvas() {
    const img = new Image();
    img.onload = () => {
      if (!this.processedCanvas?.nativeElement) return;

      const canvas = this.processedCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = this.previewFrames[this.currentPreviewFrame];
  }

  stopGifPreview() {
    this.stopPreviewAnimation();
    this.previewFrames = [];
    this.currentPreviewFrame = 0;
  }


  onGifOptionsUpdate() {
    // Regenerar preview cuando cambien las opciones
    if (this.gifStudioMode() && this.processedImageData) {
      this.generateGifPreview();
    }
  }

  // ============ Effect Layers Management ============

  addEffectFromSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const type = select.value as EffectType;
    if (type) {
      this.addEffectLayer(type);
      select.value = ''; // Reset select
    }
  }

  addEffectLayer(type: EffectType) {
    const newLayer: EffectLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      enabled: true,
      intensity: 0.5,
      options: { ...DEFAULT_EFFECT_OPTIONS[type] },
      order: this.effectLayers().length
    };

    this.effectLayers.set([...this.effectLayers(), newLayer]);
    this.editingLayerId.set(newLayer.id);
    this.onGifOptionsUpdate();
  }

  removeEffectLayer(layerId: string) {
    const layers = this.effectLayers().filter(l => l.id !== layerId);
    // Reordenar
    layers.forEach((layer, index) => {
      layer.order = index;
    });
    this.effectLayers.set(layers);

    if (this.editingLayerId() === layerId) {
      this.editingLayerId.set(null);
    }
    if (this.selectedLayerId() === layerId) {
      this.selectedLayerId.set(null);
    }

    this.onGifOptionsUpdate();
  }

  toggleLayerEnabled(layerId: string) {
    const layers = this.effectLayers().map(layer =>
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    );
    this.effectLayers.set(layers);
    this.onGifOptionsUpdate();
  }

  selectLayer(layerId: string) {
    this.selectedLayerId.set(layerId);
  }

  editLayer(layerId: string) {
    this.editingLayerId.set(this.editingLayerId() === layerId ? null : layerId);
  }

  closeLayerEditor() {
    this.editingLayerId.set(null);
  }

  toggleEffectEditorMode() {
    this.effectEditorMode.update(mode => mode === 'normal' ? 'advanced' : 'normal');
  }

  // GIF Advanced Settings Modal
  openGifAdvancedSettings() {
    this.showGifAdvancedSettings.set(true);
  }

  closeGifAdvancedSettings() {
    this.showGifAdvancedSettings.set(false);
  }

  applyGifAdvancedSettings(settings: { frameCount: number; frameDelay: number; loopCount: number }) {
    this.gifFrameCount.set(settings.frameCount);
    this.setFrameDelayFromMs(settings.frameDelay);
    this.gifLoopCount.set(settings.loopCount);
    this.onGifOptionsUpdate();
    this.closeGifAdvancedSettings();
  }

  updateLayerIntensity(layerId: string, intensity: number) {
    const layers = this.effectLayers().map(layer =>
      layer.id === layerId ? { ...layer, intensity } : layer
    );
    this.effectLayers.set(layers);
    this.onGifOptionsUpdate();
  }

  updateLayerOption(layerId: string, optionKey: string, value: any) {
    const layers = this.effectLayers().map(layer =>
      layer.id === layerId
        ? { ...layer, options: { ...layer.options, [optionKey]: value } }
        : layer
    );
    this.effectLayers.set(layers);

    // Debounce automático: generateGifPreview ya tiene el debouncing integrado
    this.onGifOptionsUpdate();
  }

  /**
   * Convert RGB values to hex color string
   */
  rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Update flame color from color picker
   */
  updateFlameColor(layerId: string, event: Event, isGradient: boolean) {
    const input = event.target as HTMLInputElement;
    const hex = input.value;

    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    if (isGradient) {
      // Update gradient color (color 2)
      this.updateLayerOption(layerId, 'flameGradientColorR', r);
      this.updateLayerOption(layerId, 'flameGradientColorG', g);
      this.updateLayerOption(layerId, 'flameGradientColorB', b);
    } else {
      // Update custom color (color 1)
      this.updateLayerOption(layerId, 'flameCustomColorR', r);
      this.updateLayerOption(layerId, 'flameCustomColorG', g);
      this.updateLayerOption(layerId, 'flameCustomColorB', b);
    }
  }

  /**
   * Update particle color from color picker
   */
  updateParticleColor(layerId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const hex = input.value;

    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    this.updateLayerOption(layerId, 'particleCustomColorR', r);
    this.updateLayerOption(layerId, 'particleCustomColorG', g);
    this.updateLayerOption(layerId, 'particleCustomColorB', b);
  }

  moveLayerUp(layerId: string) {
    const layers = [...this.effectLayers()];
    const index = layers.findIndex(l => l.id === layerId);

    if (index > 0) {
      [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
      layers.forEach((layer, i) => layer.order = i);
      this.effectLayers.set(layers);
      this.onGifOptionsUpdate();
    }
  }

  moveLayerDown(layerId: string) {
    const layers = [...this.effectLayers()];
    const index = layers.findIndex(l => l.id === layerId);

    if (index < layers.length - 1) {
      [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
      layers.forEach((layer, i) => layer.order = i);
      this.effectLayers.set(layers);
      this.onGifOptionsUpdate();
    }
  }

  getLayerById(layerId: string): EffectLayer | undefined {
    return this.effectLayers().find(l => l.id === layerId);
  }

  getSortedLayers(): EffectLayer[] {
    return [...this.effectLayers()].sort((a, b) => a.order - b.order);
  }

  /**
   * ===== ACHIEVEMENT & GALLERY SYSTEM =====
   */

  toggleAchievements() {
    this.showAchievements.set(!this.showAchievements());
  }

  toggleGallery() {
    this.showGallery.set(!this.showGallery());
  }

  toggleSettings() {
    this.showSettings.set(!this.showSettings());
  }

  canSaveToGallery(): boolean {
    if (this.processing()) return true; // disabled during processing

    if (this.compositionMode()) {
      const state = this.compositionService.compositionState();
      return state.layers.length === 0; // disabled if no layers
    } else {
      return !this.imageLoaded(); // disabled if no image loaded
    }
  }

  async saveToGallery() {
    const isCompositionMode = this.compositionMode();
    const compositionState = this.compositionService.compositionState();

    // Validations
    if (isCompositionMode) {
      if (compositionState.layers.length === 0) {
        alert('No layers in composition to save!');
        return;
      }
    } else {
      if (!this.processedCanvas || !this.imageLoaded()) {
        alert('No processed image to save!');
        return;
      }
    }

    // Get default name based on mode
    const defaultName = isCompositionMode
      ? `Composition ${new Date().toLocaleDateString()}`
      : `Design ${new Date().toLocaleDateString()}`;

    const name = prompt('Enter a name for this design:', defaultName);
    if (!name) return;

    try {
      let canvas: HTMLCanvasElement;
      let settings: DitheringSettings;

      if (isCompositionMode) {
        // COMPOSITION MODE: Render composition with effects and dithering
        const compositionData = this.compositionCanvasComponent?.getCompositionImageDataWithEffects();

        if (!compositionData) {
          alert('Failed to render composition!');
          return;
        }

        // Create temporary canvas with composition result
        canvas = document.createElement('canvas');
        canvas.width = compositionData.width;
        canvas.height = compositionData.height;
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(compositionData, 0, 0);

        // Settings for composition mode
        const ditheringOpts = this.compositionService.ditheringOptions();
        settings = {
          algorithm: ditheringOpts.algorithm || 'floyd-steinberg',
          palette: ditheringOpts.palette || 'monochrome',
          scale: ditheringOpts.scale || 1,
          contrast: ditheringOpts.contrast || 0,
          midtones: ditheringOpts.midtones || 0,
          highlights: ditheringOpts.highlights || 0,
          blur: ditheringOpts.blur || 0,
          isComposition: true,
          compositionLayersCount: compositionState.layers.length
        };

      } else {
        // PREVIEW MODE: Use processed canvas with effect layers
        canvas = this.processedCanvas!.nativeElement;

        // Settings for preview mode
        settings = {
          algorithm: this.selectedAlgorithm(),
          palette: this.selectedPalette(),
          scale: this.scale(),
          contrast: this.contrast(),
          midtones: this.midtones(),
          highlights: this.highlights(),
          blur: this.blur(),
          effectLayers: this.effectLayers(),
          isComposition: false
        };
      }

      await this.galleryService.saveToGallery(canvas, name, settings);

      // 🏆 Track achievement
      this.achievementService.trackGallerySave();

      const modeText = isCompositionMode ? 'composition' : 'design';
      alert(`✅ ${modeText} saved to gallery!`);

    } catch (error) {
      console.error('Error saving to gallery:', error);
      alert('❌ Error saving to gallery. Check console for details.');
    }
  }

  onGallerySettingsApplied(settings: DitheringSettings) {
    // Aplicar settings desde la galería
    this.selectedAlgorithm.set(settings.algorithm);
    this.selectedPalette.set(settings.palette);
    this.scale.set(settings.scale);
    this.contrast.set(settings.contrast);
    this.midtones.set(settings.midtones);
    this.highlights.set(settings.highlights);
    this.blur.set(settings.blur);

    if (settings.effectLayers) {
      this.effectLayers.set(settings.effectLayers);
    }

    // Re-procesar con los nuevos settings
    if (this.imageLoaded()) {
      this.processImage();
    }
  }

  // Track waifu interactions
  onWaifuClick() {
    this.achievementService.trackWaifuInteraction();
  }

  // Test achievement notification (temporal para desarrollo)
  testAchievementNotification() {
    const testAchievements = [
      { id: 'first-dither', icon: '🎨', name: 'First Dither', xpReward: 10 },
      { id: 'gif-master', icon: '🎬', name: 'GIF Master', xpReward: 50 },
      { id: 'speed-runner', icon: '⚡', name: 'Speed Runner', xpReward: 100 },
      { id: 'waifu-friend', icon: '💖', name: "Waifu's Friend", xpReward: 50 },
    ];

    const random = testAchievements[Math.floor(Math.random() * testAchievements.length)];

    this.achievementService.unlockedAchievement.set({
      achievement: random as any,
      timestamp: new Date()
    });

    setTimeout(() => {
      this.achievementService.unlockedAchievement.set(null);
    }, 5000);
  }
}





