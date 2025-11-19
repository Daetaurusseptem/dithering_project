import { Component, signal, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { HistoryService } from './services/history.service';
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
import { EffectLayer, EffectType, DEFAULT_EFFECT_OPTIONS, EFFECT_NAMES } from './models/effect-layer.interface';
import { DitheringSettings } from './models/achievement.interface';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule, 
    FormsModule, 
    CrtWaifuComponent, 
    SpriteUploaderComponent, 
    GifLoadingComponent, 
    AchievementNotificationComponent, 
    AchievementsPanelComponent, 
    GalleryComponent, 
    CompositionLayersComponent, 
    CompositionCanvasComponent,
    CompositionToolbarComponent,
    LayerPropertiesComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  // Canvas references
  @ViewChild('processedCanvas') processedCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('originalCompareCanvas') originalCompareCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('particleCanvas') particleCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
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
  
  // Achievement & Gallery UI
  showAchievements = signal(false);
  showGallery = signal(false);
  
  // Particle Editor
  showParticleEditor = signal(false);
  editingParticleLayerId: string | null = null;
  particleBrushSize = signal(2);
  particleBrushColor = signal('#FFFFFF');
  particleColors = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'];
  savedParticleSprites = signal<Array<{id: string, data: string}>>([]);
  selectedParticleSpriteId = signal<string | null>(null);
  private isDrawingParticle = false;
  
  // Comparador before/after
  sliderPosition = signal(50); // Porcentaje 0-100
  private isDragging = false;
  zoomLevel = signal(100); // Porcentaje de zoom
  viewMode = signal<'fit' | 'original'>('fit'); // Modo de vista del canvas
  
  // GIF Preview Zoom & View
  gifZoomLevel = signal(100); // Porcentaje de zoom para GIF
  gifViewMode = signal<'fit' | 'original'>('fit'); // Modo de vista del GIF
  
  // Effect Layers System
  effectLayers = signal<EffectLayer[]>([]);
  selectedLayerId = signal<string | null>(null);
  editingLayerId = signal<string | null>(null);
  availableEffects: EffectType[] = ['scanline', 'vhs', 'noise', 'phosphor', 'rgb-split', 'motion-sense', 'particles', 'flames'];
  effectNames = EFFECT_NAMES;
  
  // Legacy GIF Options (mantener para compatibilidad)
  gifEffectType = signal<'scanline' | 'vhs' | 'noise' | 'phosphor' | 'rgb-split' | 'motion-sense'>('scanline');
  gifFrameCount = signal(20);
  gifFps = signal(15);
  gifIntensity = signal(0.5);
  gifAddPulse = signal(false);
  gifAddGlitch = signal(false);
  gifLoopCount = signal(0);
  
  gifOptions: GifEffectOptions | null = null;
  
  // Preview animation para GIF Studio
  private previewFrames: string[] = [];
  private currentPreviewFrame = 0;
  private previewInterval: any = null;
  isGeneratingPreview = false; // Público para el template
  private previewDebounceTimer: any = null;
  private lastPreviewUpdate = 0;
  private previewScale = 0.5; // Renderizar preview al 50% para mejor performance
  
  // Imagen original
  originalImageData: ImageData | null = null;
  processedImageData: ImageData | null = null; // Imagen con dithering aplicado
  private originalImage: HTMLImageElement | null = null;

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
    public waifuPositionService: WaifuPositionService,
    public achievementService: AchievementService,
    public galleryService: GalleryService,
    public compositionService: CompositionService,
    public compositionToolService: CompositionToolService,
    private historyService: HistoryService
  ) {
    this.algorithms.set(this.ditheringService.getAvailableAlgorithms());
    this.palettes.set(this.ditheringService.getAvailablePalettes());
    this.loadCustomPalettesAndPresets();
    this.loadSavedSprite();
    
    // Sistema de diálogos esporádicos
    this.startDialogueSystem();
    
    // Listener para cerrar achievements panel
    window.addEventListener('close-achievements', () => {
      this.showAchievements.set(false);
    });
  }

  ngAfterViewInit() {
    // Inicializar canvas
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
        console.log('🔄 Composition layers cleared for new image');
        
        // Forzar detección de cambios y esperar a que Angular renderice
        this.cdr.detectChanges();
        
        // Usar un delay más largo para asegurar que el DOM está listo
        setTimeout(() => {
          if (this.processedCanvas) {
            // Extraer los datos de la imagen para procesamiento
            this.extractImageData(img);
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
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    this.originalImageData = ctx.getImageData(0, 0, img.width, img.height);
  }

  /**
   * Procesa la imagen con el algoritmo seleccionado
   */
  processImage() {
    if (!this.originalImageData || !this.processedCanvas) return;

    this.processing.set(true);
    this.waifuState.set('processing');

    // Usar setTimeout para no bloquear la UI
    setTimeout(() => {
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
        const compositionResult = this.compositionService.renderForDithering();
        imageData = compositionResult.ditherableContent;
        
        // Apply dithering to ditherable content
        const dithered = this.ditheringService.applyDithering(
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
        this.processedImageData = this.ditheringService.applyDithering(imageData, options);
      }

      // Dibujar resultado
      const canvas = this.processedCanvas.nativeElement;
      canvas.width = this.processedImageData.width;
      canvas.height = this.processedImageData.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.putImageData(this.processedImageData, 0, 0);
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
      this.drawOriginalInComparison();
      
      // Si estamos en modo GIF Studio, regenerar el preview con las nuevas opciones
      if (this.gifStudioMode()) {
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
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.originalImage!, 0, 0);
        console.log('✅ Original image drawn to comparison canvas');
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
  
  openParticleEditor(layerId: string) {
    this.editingParticleLayerId = layerId;
    this.showParticleEditor.set(true);
    this.loadSavedParticleSprites();
    
    // Inicializar canvas después de que se renderice
    setTimeout(() => {
      this.initParticleCanvas();
      
      // Cargar sprite actual si existe
      const layer = this.effectLayers().find(l => l.id === layerId);
      if (layer?.options.particleCustomSprite) {
        this.loadSpriteDataToCanvas(layer.options.particleCustomSprite);
      }
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
    console.log('🎨 renderCompositionToCanvas called');
    
    if (!this.compositionMode() || !this.compositionCanvasComponent) {
      console.log('❌ Not in composition mode or no canvas component');
      return;
    }
    
    const state = this.compositionService.compositionState();
    console.log('🎨 Composition state:', {
      layers: state.layers.length,
      canvasSize: `${state.canvasWidth}x${state.canvasHeight}`
    });
    
    if (state.layers.length === 0) {
      console.log('❌ No layers');
      return;
    }
    
    console.log('✅ Rendering composition with layer effects...');
    
    // Use the same method as GIF export - includes dithering AND layer effects
    const compositionData = this.compositionCanvasComponent.getCompositionImageDataWithEffects();
    
    if (!compositionData) {
      console.log('❌ Failed to get composition data');
      return;
    }
    
    console.log('✅ Got composition with effects:', {
      width: compositionData.width,
      height: compositionData.height
    });
    
    // Update processedImageData - already includes dithering and effects
    this.processedImageData = compositionData;
    
    console.log('✅ processedImageData updated:', {
      width: this.processedImageData.width,
      height: this.processedImageData.height
    });
    
    // Update canvas if available (might not be visible in composition mode)
    if (this.processedCanvas?.nativeElement) {
      const canvas = this.processedCanvas.nativeElement;
      canvas.width = this.processedImageData.width;
      canvas.height = this.processedImageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(this.processedImageData, 0, 0);
        console.log('✅ Canvas element also updated');
      }
    }
    
    console.log('✅ renderCompositionToCanvas complete');
  }

  async downloadImage() {
    if (!this.processedCanvas) return;
    
    // If in composition mode, render composition first
    if (this.compositionMode() && this.compositionService.compositionState().layers.length > 0) {
      this.renderCompositionToCanvas();
    }
    
    const canvas = this.processedCanvas.nativeElement;
    const link = document.createElement('a');
    const filename = this.compositionMode() ? 'composition' : 'dithered';
    link.download = `${filename}-${this.selectedAlgorithm()}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
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
    
    // Buscar en paletas predefinidas del servicio
    return this.ditheringService.getPaletteColors(paletteId);
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
    console.log('🎬 toggleGifStudioMode called');
    this.gifStudioMode.update(current => !current);
    
    if (this.gifStudioMode()) {
      console.log('🎬 Activating GIF Studio Mode');
      
      // Check if we need to render composition BEFORE turning off composition mode
      const wasInCompositionMode = this.compositionMode();
      const compositionState = this.compositionService.compositionState();
      const hasLayers = compositionState.layers.length > 0;
      
      console.log('🎬 Pre-check:', {
        wasInCompositionMode,
        hasLayers
      });
      
      // Render composition BEFORE turning off composition mode
      if (wasInCompositionMode && hasLayers) {
        console.log('🎬 Rendering composition to canvas...');
        this.renderCompositionToCanvas();
        console.log('🎬 Composition rendered');
      }
      
      // Now turn off Composition mode
      if (wasInCompositionMode) {
        console.log('🎬 Turning off composition mode');
        this.compositionMode.set(false);
      }
      
      console.log('🎬 Starting GIF preview with processedImageData:', {
        hasData: !!this.processedImageData,
        size: this.processedImageData ? `${this.processedImageData.width}x${this.processedImageData.height}` : 'none'
      });
      
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
        
        console.log('🎨 Initializing Composition Canvas:', {
          originalImageData: { width: this.originalImageData.width, height: this.originalImageData.height },
          processedImageData: { width: this.processedImageData.width, height: this.processedImageData.height },
          originalImage: { width: this.originalImage.width, height: this.originalImage.height },
          scale: this.scale(),
          existingLayers: state.layers.length
        });
        
        // Set canvas size to match ORIGINAL image (not scaled)
        // Scale will be applied during rendering/export
        this.compositionService.setCanvasSize(
          this.originalImageData.width,
          this.originalImageData.height
        );
        
        // Only initialize layers if there are none (first time or after reset)
        if (state.layers.length === 0) {
          console.log('🎨 No existing layers, creating initial layer');
          // Use originalImageData (not processed) for the layer
          // Processing/dithering will be applied during render
          this.compositionService.addLayer(this.originalImage, this.originalImageData, { x: 0, y: 0 });
        } else {
          console.log('🎨 Keeping existing layers:', state.layers.length);
        }
        
        console.log('🎨 Composition initialized. Canvas size:', 
          this.originalImageData.width, 'x', this.originalImageData.height);
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
    console.log('🔧 Tool changed to:', tool);
    // El composition-canvas component escuchará esto si lo necesita
    // Por ahora solo lo logueamos
  }
  
  onToolOptionsChange(options: ToolOptions): void {
    console.log('⚙️ Tool options changed:', options);
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
    
    // Undo/Redo
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'z') {
      if (this.historyService.undo()) {
        console.log('🔄 Undo:', this.historyService.getRedoDescription());
      } else {
        console.log('🔄 Nothing to undo');
      }
      event.preventDefault();
    }
    
    if ((event.ctrlKey || event.metaKey) && (event.shiftKey && key === 'z' || key === 'y')) {
      if (this.historyService.redo()) {
        console.log('🔄 Redo:', this.historyService.getUndoDescription());
      } else {
        console.log('🔄 Nothing to redo');
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
        console.log('🎨 Exporting composition with layer effects to GIF');
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
        
        const blob = await this.gifService.exportAsGif(
          frames,
          {
            quality: 10,
            workers: 2,
            repeat: 0 // No loop for static image
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
        frames = await this.createLayeredEffectFrames(baseImageData, enabledLayers);
      } else {
        // Fallback al sistema legacy (si no hay capas)
        const options: GifEffectOptions = {
          effectType: this.gifEffectType(),
          frameCount: this.gifFrameCount(),
          fps: this.gifFps(),
          intensity: this.gifIntensity(),
          addPulse: this.gifAddPulse(),
          addGlitch: this.gifAddGlitch(),
          loopCount: this.gifLoopCount()
        };
        
        frames = await this.createLegacyEffectFrames(baseImageData, options);
      }

      this.gifLoadingMessage.set('Encoding GIF... This may take a moment');
      
      // Exportar como GIF usando gif.js
      const blob = await this.gifService.exportAsGif(
        frames,
        {
          quality: 10,
          workers: 2,
          repeat: this.gifLoopCount()
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
   * Layered Effects System - Aplica múltiples efectos en capas
   */
  private async createLayeredEffectFrames(baseImageData: ImageData, layers: EffectLayer[]): Promise<GifFrame[]> {
    const frameCount = this.gifFrameCount();
    const fps = this.gifFps();
    const delay = Math.floor(1000 / fps);
    const frames: GifFrame[] = [];

    // Generar frames
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      // Crear canvas para este frame
      const canvas = document.createElement('canvas');
      canvas.width = baseImageData.width;
      canvas.height = baseImageData.height;
      const ctx = canvas.getContext('2d')!;
      
      // Empezar con la imagen base
      ctx.putImageData(baseImageData, 0, 0);
      let currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Aplicar cada capa en orden
      for (const layer of layers) {
        if (!layer.enabled) continue;
        
        // Aplicar el efecto de esta capa
        currentImageData = this.applyLayerEffect(
          currentImageData,
          layer,
          frameIndex,
          frameCount
        );
        
        // Actualizar canvas con el resultado
        ctx.putImageData(currentImageData, 0, 0);
        currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      
      frames.push({
        imageData: currentImageData,
        delay
      });
      
      // Actualizar progreso
      const progress = Math.floor((frameIndex + 1) / frameCount * 50);
      this.gifProgress.set(progress);
    }

    return frames;
  }

  /**
   * Aplica un efecto individual según el tipo de capa
   */
  private applyLayerEffect(
    imageData: ImageData,
    layer: EffectLayer,
    frameIndex: number,
    totalFrames: number
  ): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    // SEAMLESS LOOP: Normalizar phase de 0 a 1 (sin incluir 1 para evitar duplicación)
    // Esto asegura que el último frame sea diferente del primero, creando un loop perfecto
    const phase = frameIndex / totalFrames; // 0.0 a 0.999...
    
    switch (layer.type) {
      case 'scanline':
        this.applyScanlineLayer(ctx, imageData, layer, frameIndex);
        break;
      case 'vhs':
        this.applyVHSLayer(ctx, imageData, layer, phase);
        break;
      case 'noise':
        this.applyNoiseLayer(ctx, imageData, layer);
        break;
      case 'phosphor':
        this.applyPhosphorLayer(ctx, imageData, layer, phase);
        break;
      case 'rgb-split':
        this.applyRGBSplitLayer(ctx, imageData, layer, phase);
        break;
      case 'motion-sense':
        this.applyMotionSenseLayer(ctx, imageData, layer, phase);
        break;
      case 'particles':
        this.applyParticlesLayer(ctx, imageData, layer, phase);
        break;
      case 'flames':
        this.applyFlamesLayer(ctx, imageData, layer, phase);
        break;
    }
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Individual layer effect implementations
  private applyScanlineLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, frameIndex: number) {
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const thickness = layer.options.scanlineThickness || 2;
    const spacing = layer.options.scanlineSpacing || 4;
    const offset = frameIndex % spacing;
    
    for (let y = offset; y < imageData.height; y += spacing) {
      for (let t = 0; t < thickness && y + t < imageData.height; t++) {
        for (let x = 0; x < imageData.width; x++) {
          const idx = ((y + t) * imageData.width + x) * 4;
          data.data[idx] *= (1 - layer.intensity * 0.7);
          data.data[idx + 1] *= (1 - layer.intensity * 0.7);
          data.data[idx + 2] *= (1 - layer.intensity * 0.7);
        }
      }
    }
    
    ctx.putImageData(data, 0, 0);
  }

  private applyVHSLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const distortion = layer.options.vhsDistortion || 5;
    const colorBleed = layer.options.vhsColorBleed || 3;
    const lineThickness = layer.options.vhsLineThickness || 2;
    const bleedRed = layer.options.vhsBleedRed ?? -3;
    const bleedGreen = layer.options.vhsBleedGreen ?? 0;
    const bleedBlue = layer.options.vhsBleedBlue ?? 3;
    const trackingNoise = layer.options.vhsTrackingNoise || 2;
    
    // Aplicar distorsión horizontal con líneas de grosor variable
    for (let y = 0; y < imageData.height; y++) {
      const offset = Math.sin(y * 0.1 + phase) * distortion * layer.intensity;
      const shift = Math.floor(offset);
      
      // Tracking noise - líneas verticales de ruido
      const hasTrackingNoise = Math.random() < (trackingNoise * 0.01);
      
      if (Math.abs(shift) > 0 || hasTrackingNoise) {
        // Aplicar efecto en múltiples líneas según el grosor
        for (let lineOffset = 0; lineOffset < lineThickness; lineOffset++) {
          const currentY = y + lineOffset;
          if (currentY >= imageData.height) break;
          
          for (let x = 0; x < imageData.width; x++) {
            const srcX = Math.max(0, Math.min(imageData.width - 1, x + shift));
            const srcIdx = (currentY * imageData.width + srcX) * 4;
            const dstIdx = (currentY * imageData.width + x) * 4;
            
            // Color bleeding personalizado por canal
            const redSrcX = Math.max(0, Math.min(imageData.width - 1, srcX + bleedRed));
            const greenSrcX = Math.max(0, Math.min(imageData.width - 1, srcX + bleedGreen));
            const blueSrcX = Math.max(0, Math.min(imageData.width - 1, srcX + bleedBlue));
            
            const redIdx = (currentY * imageData.width + redSrcX) * 4;
            const greenIdx = (currentY * imageData.width + greenSrcX) * 4;
            const blueIdx = (currentY * imageData.width + blueSrcX) * 4;
            
            data.data[dstIdx] = data.data[redIdx];
            data.data[dstIdx + 1] = data.data[greenIdx + 1];
            data.data[dstIdx + 2] = data.data[blueIdx + 2];
            
            // Aplicar tracking noise si corresponde
            if (hasTrackingNoise) {
              const noise = Math.random() * 100;
              data.data[dstIdx] = noise;
              data.data[dstIdx + 1] = noise;
              data.data[dstIdx + 2] = noise;
            }
          }
        }
        
        // Saltar las líneas ya procesadas
        y += lineThickness - 1;
      }
    }
    
    ctx.putImageData(data, 0, 0);
  }

  private applyNoiseLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer) {
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const noiseSize = layer.options.noiseSize || 1;
    const noiseStrength = layer.intensity * 50;
    
    for (let i = 0; i < data.data.length; i += 4 * noiseSize) {
      const noise = (Math.random() - 0.5) * noiseStrength;
      data.data[i] = Math.max(0, Math.min(255, data.data[i] + noise));
      data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + noise));
      data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + noise));
    }
    
    ctx.putImageData(data, 0, 0);
  }

  private applyPhosphorLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const decay = layer.options.phosphorDecay || 0.7;
    const glow = layer.options.phosphorGlow || 0.5;
    const intensity = 0.5 + Math.sin(phase) * 0.5 * layer.intensity;
    
    for (let i = 0; i < data.data.length; i += 4) {
      const green = data.data[i + 1];
      data.data[i] *= (1 - intensity * (1 - decay) * 0.7);
      data.data[i + 1] = Math.min(255, green * (1 + intensity * glow));
      data.data[i + 2] *= (1 - intensity * (1 - decay) * 0.7);
    }
    
    ctx.putImageData(data, 0, 0);
  }

  private applyRGBSplitLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const direction = layer.options.rgbSplitDirection || 'horizontal';
    const amount = layer.options.rgbSplitAmount || 3;
    const intensity = layer.intensity * amount;
    
    let offsetX = 0, offsetY = 0;
    
    switch (direction) {
      case 'horizontal':
        offsetX = Math.sin(phase) * intensity;
        break;
      case 'vertical':
        offsetY = Math.sin(phase) * intensity;
        break;
      case 'diagonal':
        offsetX = Math.sin(phase) * intensity;
        offsetY = Math.cos(phase) * intensity;
        break;
    }
    
    // Crear canales RGB separados
    const originalData = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const result = ctx.createImageData(imageData.width, imageData.height);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const idx = (y * imageData.width + x) * 4;
        
        // Canal rojo desplazado
        const rX = Math.max(0, Math.min(imageData.width - 1, Math.floor(x + offsetX)));
        const rIdx = (y * imageData.width + rX) * 4;
        result.data[idx] = originalData.data[rIdx];
        
        // Canal verde sin desplazar
        result.data[idx + 1] = originalData.data[idx + 1];
        
        // Canal azul desplazado en dirección opuesta
        const bX = Math.max(0, Math.min(imageData.width - 1, Math.floor(x - offsetX)));
        const bY = Math.max(0, Math.min(imageData.height - 1, Math.floor(y + offsetY)));
        const bIdx = (bY * imageData.width + bX) * 4;
        result.data[idx + 2] = originalData.data[bIdx + 2];
        
        result.data[idx + 3] = originalData.data[idx + 3];
      }
    }
    
    ctx.putImageData(result, 0, 0);
  }

  private applyMotionSenseLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const direction = layer.options.motionDirection || 'horizontal';
    const speed = layer.options.motionSpeed || 1;
    const intensity = layer.intensity * speed;
    
    // Crear un canvas temporal con la imagen original
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.clearRect(0, 0, imageData.width, imageData.height);
    
    let offsetX = 0, offsetY = 0, scale = 1;
    
    switch (direction) {
      case 'horizontal':
        offsetX = Math.sin(phase) * intensity * 10;
        break;
      case 'vertical':
        offsetY = Math.sin(phase) * intensity * 10;
        break;
      case 'radial':
        offsetX = Math.sin(phase) * intensity * 8;
        offsetY = Math.cos(phase) * intensity * 8;
        break;
      case 'zoom':
        scale = 1 + Math.sin(phase) * intensity * 0.1;
        break;
    }
    
    // Crear efecto de motion blur con múltiples capas
    const layers = 5;
    
    // Dibujar la capa principal primero (sin transparencia)
    ctx.save();
    ctx.translate(imageData.width / 2, imageData.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-imageData.width / 2 + offsetX, -imageData.height / 2 + offsetY);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
    
    // Agregar capas de blur con transparencia para el efecto de movimiento
    ctx.globalAlpha = 0.3;
    for (let i = 1; i < layers; i++) {
      const t = i / layers;
      const layerOffsetX = offsetX * (1 - t);
      const layerOffsetY = offsetY * (1 - t);
      const layerScale = 1 + (scale - 1) * (1 - t);
      
      ctx.save();
      ctx.translate(imageData.width / 2, imageData.height / 2);
      ctx.scale(layerScale, layerScale);
      ctx.translate(-imageData.width / 2 + layerOffsetX, -imageData.height / 2 + layerOffsetY);
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }
    
    ctx.globalAlpha = 1;
  }

  /**
   * Efecto de Partículas - con múltiples modos de emisión
   */
  private applyParticlesLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const count = layer.options.particleCount || 50;
    const size = layer.options.particleSize || 3;
    const color = layer.options.particleColor || 'white';
    const speed = layer.options.particleSpeed || 1;
    const shape = layer.options.particleShape || 'circle';
    const emissionMode = layer.options.particleEmissionMode || 'float';
    const customSprite = layer.options.particleCustomSprite;
    const intensity = layer.intensity;
    
    ctx.globalAlpha = intensity * 0.8;
    
    // Generar partículas según modo de emisión
    const particles: Array<{x: number, y: number, vx: number, vy: number, hue?: number, life?: number}> = [];
    
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, vx = 0, vy = 0, life = 1;
      const seed = (i * 12345 + phase * 67890) % 10000;
      
      switch (emissionMode) {
        case 'float': // Original - flotando por toda la pantalla
          x = (seed % imageData.width);
          y = ((seed * 7) % imageData.height + phase * speed * 2) % imageData.height;
          vx = Math.sin(i * 0.5 + phase * 0.1) * 2;
          vy = Math.cos(i * 0.3 + phase * 0.15) * 2;
          break;
          
        case 'burst': // Explosión desde el centro
          const angle = (i / count) * Math.PI * 2 + phase * 0.1;
          const distance = (phase * speed * 5) % 100;
          const burstX = imageData.width / 2;
          const burstY = imageData.height / 2;
          x = burstX + Math.cos(angle) * distance;
          y = burstY + Math.sin(angle) * distance;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          life = 1 - (distance / 100);
          break;
          
        case 'fountain': // Fuente desde abajo
          const fountainX = imageData.width / 2 + Math.sin(i * 0.5) * 50;
          const fountainY = imageData.height;
          const fountainAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
          const fountainProgress = ((phase * speed + i * 2) % 100) / 100;
          x = fountainX + Math.cos(fountainAngle) * fountainProgress * 150;
          y = fountainY - fountainProgress * 200 + Math.sin(fountainProgress * Math.PI) * 30;
          vx = Math.cos(fountainAngle) * speed;
          vy = -speed * 2 + fountainProgress * speed * 4; // Gravedad
          life = 1 - fountainProgress;
          break;
          
        case 'spiral': // Espiral
          const spiralAngle = (i / count) * Math.PI * 6 + phase * 0.2;
          const spiralRadius = (i / count) * Math.min(imageData.width, imageData.height) / 2;
          x = imageData.width / 2 + Math.cos(spiralAngle) * spiralRadius;
          y = imageData.height / 2 + Math.sin(spiralAngle) * spiralRadius;
          vx = Math.cos(spiralAngle + Math.PI / 2) * speed;
          vy = Math.sin(spiralAngle + Math.PI / 2) * speed;
          break;
          
        case 'edges': // Desde los bordes hacia dentro
          const edge = i % 4;
          const edgeProgress = ((i / 4 + phase * speed * 0.1) % count) / count;
          if (edge === 0) { // Top
            x = edgeProgress * imageData.width;
            y = 0 + (phase * speed * 2) % 100;
            vy = speed * 2;
          } else if (edge === 1) { // Right
            x = imageData.width - (phase * speed * 2) % 100;
            y = edgeProgress * imageData.height;
            vx = -speed * 2;
          } else if (edge === 2) { // Bottom
            x = imageData.width - edgeProgress * imageData.width;
            y = imageData.height - (phase * speed * 2) % 100;
            vy = -speed * 2;
          } else { // Left
            x = 0 + (phase * speed * 2) % 100;
            y = imageData.height - edgeProgress * imageData.height;
            vx = speed * 2;
          }
          break;
          
        case 'rain': // Lluvia desde arriba
          x = (seed % imageData.width);
          const rainStart = -50 + ((phase * speed * 10 + i * 5) % (imageData.height + 100));
          y = rainStart;
          vy = speed * 4;
          life = y > 0 ? Math.min(1, (imageData.height - y) / imageData.height) : 0;
          break;
          
        case 'center': // Pulsación desde el centro
          const centerAngle = (i / count) * Math.PI * 2;
          const centerPulse = Math.sin(phase * 0.2) * 50 + 80;
          x = imageData.width / 2 + Math.cos(centerAngle) * centerPulse;
          y = imageData.height / 2 + Math.sin(centerAngle) * centerPulse;
          vx = Math.cos(centerAngle) * Math.sin(phase * 0.2) * 2;
          vy = Math.sin(centerAngle) * Math.sin(phase * 0.2) * 2;
          break;
      }
      
      const hue = color === 'rainbow' ? (i * 360 / count + phase * 10) % 360 : undefined;
      particles.push({ x, y, vx, vy, hue, life });
    }
    
    // Dibujar partículas
    particles.forEach((p) => {
      if (p.life !== undefined && p.life <= 0) return;
      
      const px = p.x;
      const py = p.y;
      const particleAlpha = intensity * (p.life || 1);
      
      // Color de la partícula
      let fillColor: string;
      if (color === 'rainbow') {
        fillColor = `hsla(${p.hue}, 100%, 70%, ${particleAlpha})`;
      } else if (color === 'warm') {
        fillColor = `rgba(255, 200, 100, ${particleAlpha})`;
      } else if (color === 'cool') {
        fillColor = `rgba(100, 200, 255, ${particleAlpha})`;
      } else {
        fillColor = `rgba(255, 255, 255, ${particleAlpha})`;
      }
      
      ctx.fillStyle = fillColor;
      
      // Forma de la partícula
      if (shape === 'custom' && customSprite) {
        // TODO: Dibujar sprite custom
        this.drawCustomParticle(ctx, px, py, size, customSprite, particleAlpha);
      } else if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'star') {
        this.drawStar(ctx, px, py, 5, size, size / 2);
      } else if (shape === 'square') {
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      } else if (shape === 'sparkle') {
        ctx.fillRect(px - size / 2, py - 1, size, 2);
        ctx.fillRect(px - 1, py - size / 2, 2, size);
      }
      
      // Glow effect
      if (intensity > 0.5 && (p.life === undefined || p.life > 0.3)) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = fillColor;
      }
    });
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  /**
   * Dibuja una partícula custom desde sprite base64
   */
  private customParticleSpriteCache: Map<string, HTMLImageElement> = new Map();
  
  private drawCustomParticle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, spriteData: string, alpha: number) {
    // Usar cache para evitar crear images repetidamente
    let img = this.customParticleSpriteCache.get(spriteData);
    
    if (!img) {
      img = new Image();
      img.src = spriteData;
      this.customParticleSpriteCache.set(spriteData, img);
      
      // Si la imagen aún no se cargó, usar fallback
      if (!img.complete) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
    }
    
    // Dibujar sprite escalado
    ctx.globalAlpha = alpha;
    const spriteSize = size * 4; // El sprite es más grande que el size base
    ctx.drawImage(img, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    ctx.globalAlpha = 1;
  }

  /**
   * Efecto de Llamas - fuego animado desde abajo (VERSION MEJORADA)
   */
  private applyFlamesLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const algorithm = layer.options.flameAlgorithm || 'realistic';
    
    switch (algorithm) {
      case 'classic':
        this.applyClassicFlames(ctx, imageData, layer, phase);
        break;
      case 'realistic':
        this.applyRealisticFlames(ctx, imageData, layer, phase);
        break;
      case 'plasma':
        this.applyPlasmaFlames(ctx, imageData, layer, phase);
        break;
      case 'dragon':
        this.applyDragonFlames(ctx, imageData, layer, phase);
        break;
      case 'wispy':
        this.applyWispyFlames(ctx, imageData, layer, phase);
        break;
      case 'inferno':
        this.applyInfernoFlames(ctx, imageData, layer, phase);
        break;
    }
  }

  // Algoritmo 1: Classic - Llamas simples estilo retro (SEAMLESS LOOP)
  private applyClassicFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;
    
    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;
    
    ctx.globalCompositeOperation = 'lighter';
    const numFlames = Math.ceil(width / 12);
    
    // Convertir phase (0-1) a radianes (0-2π) para funciones trigonométricas
    const phaseRad = phase * Math.PI * 2;
    
    for (let i = 0; i < numFlames; i++) {
      const x = (i * width) / numFlames;
      // Usar seno para loop seamless
      const waveOffset = Math.sin(phaseRad * 0.5 + i * 0.8) * 10 * turbulence;
      
      const gradient = ctx.createLinearGradient(x, flameBottom, x, flameBottom - flameHeightPixels);
      const colors = this.getFlameColors(color, intensity);
      colors.forEach((c, idx) => gradient.addColorStop(idx / (colors.length - 1), c));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x + waveOffset, flameBottom);
      
      for (let j = 0; j <= 8; j++) {
        const progress = j / 8;
        const y = flameBottom - progress * flameHeightPixels;
        // Combinar seno y coseno para movimiento fluido seamless
        const xOff = Math.sin(progress * Math.PI * 2 + phaseRad + i) * 15 * turbulence * (1 - progress);
        const flameWidth = 20 * (1 - progress * 0.8);
        ctx.lineTo(x + waveOffset + xOff + (j % 2 ? flameWidth : -flameWidth), y);
      }
      
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }

  // Algoritmo 2: Realistic - Simulación física de fuego
  private applyRealisticFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;
    
    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;
    
    ctx.globalCompositeOperation = 'lighter';
    
    // Usar noise Perlin-like para turbulencia realista
    const resolution = 4;
    const cols = Math.ceil(width / resolution);
    const rows = Math.ceil(flameHeightPixels / resolution);
    
    // Convertir phase (0-1) para animación seamless
    const phaseOffset = phase * 5; // Multiplicar para velocidad visible del fuego
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * resolution;
        const py = flameBottom - y * resolution;
        
        // Noise value basado en posición y tiempo (seamless loop)
        const noise = this.perlinNoise(x * 0.1, y * 0.1 + phaseOffset, 0) * turbulence;
        const heatValue = Math.max(0, 1 - (y / rows) + noise * 0.3);
        
        if (heatValue > 0.1) {
          const alpha = heatValue * intensity;
          const colors = this.getFlameColors(color, alpha);
          const colorIndex = Math.min(Math.floor(heatValue * (colors.length - 1)), colors.length - 1);
          
          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(px, py, resolution, resolution);
          
          // Agregar glow en zonas calientes
          if (heatValue > 0.7) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = colors[0];
            ctx.fillRect(px, py, resolution, resolution);
            ctx.shadowBlur = 0;
          }
        }
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }

  // Algoritmo 3: Plasma - Efecto de plasma energético
  private applyPlasmaFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;
    
    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;
    
    ctx.globalCompositeOperation = 'lighter';
    
    const data = ctx.getImageData(0, 0, width, height);
    
    // Convertir phase (0-1) a radianes para funciones trigonométricas seamless
    const phaseRad = phase * Math.PI * 2;
    
    for (let y = 0; y < flameHeightPixels; y++) {
      for (let x = 0; x < width; x++) {
        const py = flameBottom - y;
        if (py < 0 || py >= height) continue;
        
        // Múltiples ondas sinusoidales para efecto plasma (todas usan phaseRad para loop seamless)
        const plasma1 = Math.sin(x * 0.02 + phaseRad * 1.5);
        const plasma2 = Math.sin(y * 0.03 - phaseRad * 1.0);
        const plasma3 = Math.sin((x + y) * 0.015 + phaseRad * 0.75);
        const plasma4 = Math.sin(Math.sqrt(x * x + y * y) * 0.02 + phaseRad * 1.25);
        
        const plasmaValue = (plasma1 + plasma2 + plasma3 + plasma4) / 4;
        const heatValue = Math.max(0, (1 - y / flameHeightPixels) * (0.5 + plasmaValue * 0.5 * turbulence));
        
        if (heatValue > 0.1) {
          const alpha = heatValue * intensity * 255;
          const idx = (py * width + x) * 4;
          
          const [r, g, b] = this.getFlameRGB(color, heatValue);
          data.data[idx] = Math.min(255, data.data[idx] + r * heatValue);
          data.data[idx + 1] = Math.min(255, data.data[idx + 1] + g * heatValue);
          data.data[idx + 2] = Math.min(255, data.data[idx + 2] + b * heatValue);
        }
      }
    }
    
    ctx.putImageData(data, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Algoritmo 4: Dragon - Llamas con forma de dragón/serpiente (SEAMLESS LOOP)
  private applyDragonFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;
    
    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;
    
    ctx.globalCompositeOperation = 'lighter';
    
    // Convertir phase (0-1) a radianes
    const phaseRad = phase * Math.PI * 2;
    
    // Dibujar múltiples "serpientes" de fuego
    const numDragons = 3 + Math.floor(turbulence * 2);
    
    for (let d = 0; d < numDragons; d++) {
      const startX = (d * width) / numDragons + Math.sin(phaseRad * 0.5 + d) * 50;
      const phaseOffset = d * Math.PI * 0.6;
      
      ctx.beginPath();
      ctx.moveTo(startX, flameBottom);
      
      const segments = 20;
      let prevX = startX;
      let prevY = flameBottom;
      
      for (let i = 1; i <= segments; i++) {
        const progress = i / segments;
        const y = flameBottom - progress * flameHeightPixels;
        
        // Movimiento serpenteante seamless
        const amplitude = 30 * turbulence * (1 - progress * 0.5);
        const frequency = 3;
        const x = startX + Math.sin(progress * Math.PI * frequency + phaseRad * 2.5 + phaseOffset) * amplitude;
        
        const gradient = ctx.createLinearGradient(prevX, prevY, x, y);
        const colors = this.getFlameColors(color, intensity * (1 - progress * 0.3));
        gradient.addColorStop(0, colors[Math.floor(progress * (colors.length - 1))]);
        gradient.addColorStop(1, colors[Math.min(Math.floor(progress * colors.length), colors.length - 1)]);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 15 * (1 - progress * 0.7);
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        prevX = x;
        prevY = y;
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }

  // Algoritmo 5: Wispy - Llamas suaves y etéreas
  private applyWispyFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;
    
    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;
    
    ctx.globalCompositeOperation = 'lighter';
    
    // Convertir phase (0-1) a radianes para animación seamless
    const phaseRad = phase * Math.PI * 2;
    
    // Múltiples capas de humo/fuego suave
    const numWisps = 30 + Math.floor(turbulence * 20);
    
    for (let i = 0; i < numWisps; i++) {
      const x = (i * width) / numWisps + Math.sin(phaseRad * 1.0 + i) * 20 * turbulence;
      const wispPhase = phaseRad * 1.5 + i * 0.5;
      const wispHeight = flameHeightPixels * (0.6 + Math.sin(phaseRad + i) * 0.2 + 0.2);
      
      for (let j = 0; j < 5; j++) {
        const y = flameBottom - j * (wispHeight / 5);
        const progress = j / 5;
        const xOffset = Math.sin(wispPhase + j * 0.8) * 25 * turbulence * (1 + progress);
        const size = (20 - j * 3) * (1 + Math.sin(wispPhase * 2) * 0.3);
        
        const gradient = ctx.createRadialGradient(
          x + xOffset, y, 0,
          x + xOffset, y, size
        );
        
        const colors = this.getFlameColors(color, intensity * (1 - progress * 0.7));
        gradient.addColorStop(0, colors[Math.floor(progress * (colors.length - 1))]);
        gradient.addColorStop(0.5, colors[Math.min(Math.floor((progress + 0.2) * colors.length), colors.length - 1)]);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + xOffset - size, y - size, size * 2, size * 2);
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }

  // Algoritmo 6: Inferno - Fuego intenso y caótico (SEAMLESS LOOP)
  private applyInfernoFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;
    
    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;
    
    ctx.globalCompositeOperation = 'lighter';
    
    // Convertir phase (0-1) a radianes para animación seamless
    const phaseRad = phase * Math.PI * 2;
    
    // Base: cortina de fuego densa
    const numFlames = Math.ceil(width / 4);
    
    for (let layer = 0; layer < 4; layer++) {
      const layerAlpha = intensity * (1 - layer * 0.15);
      
      for (let i = 0; i < numFlames; i++) {
        const x = (i * width) / numFlames + Math.sin(phaseRad * 2.0 + i + layer) * 8;
        const waveOffset = Math.cos(phaseRad * 1.5 + i * 0.3 + layer) * 12 * turbulence;
        const heightVar = Math.sin(phaseRad * 1.25 + i * 0.5) * 30;
        
        const gradient = ctx.createLinearGradient(x, flameBottom, x, flameBottom - flameHeightPixels - heightVar);
        const colors = this.getFlameColors(color, layerAlpha);
        colors.forEach((c, idx) => gradient.addColorStop(idx / (colors.length - 1), c));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x + waveOffset, flameBottom);
        
        const segments = 15;
        const baseWidth = 18 + layer * 5;
        
        for (let j = 0; j <= segments; j++) {
          const progress = j / segments;
          const y = flameBottom - progress * (flameHeightPixels + heightVar);
          const turbNoise = Math.sin(progress * 8 + phaseRad + i + layer) * turbulence * 8;
          const widthMod = baseWidth * (1 - progress * 0.9) * (1 + Math.sin(phaseRad * 2.5 + j) * 0.3);
          
          ctx.lineTo(x + waveOffset + turbNoise + (j % 2 ? widthMod : -widthMod), y);
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Chispas y partículas (usando phase para posición determinística)
        const sparkSeed = i * 17 + layer;
        const sparkChance = (Math.sin(phaseRad + sparkSeed) + 1) / 2;
        if (layer === 0 && sparkChance < 0.3) {
          const sparkY = flameBottom - (Math.sin(phaseRad * 3 + sparkSeed) * 0.5 + 0.5) * flameHeightPixels * 0.7;
          const sparkX = x + (Math.cos(phaseRad * 2 + sparkSeed) * 0.5) * 40;
          
          ctx.fillStyle = colors[0];
          ctx.shadowBlur = 15;
          ctx.shadowColor = colors[0];
          ctx.fillRect(sparkX, sparkY, 3, 3);
          ctx.shadowBlur = 0;
        }
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }

  // Helpers para colores de flamas
  private getFlameColors(color: string, alpha: number): string[] {
    const a = Math.min(1, alpha);
    
    switch (color) {
      case 'red':
        return [
          `rgba(255, 255, 200, ${a})`,
          `rgba(255, 220, 100, ${a * 0.95})`,
          `rgba(255, 150, 50, ${a * 0.85})`,
          `rgba(255, 80, 0, ${a * 0.7})`,
          `rgba(200, 30, 0, ${a * 0.5})`,
          `rgba(100, 0, 0, ${a * 0.2})`
        ];
      case 'blue':
        return [
          `rgba(220, 240, 255, ${a})`,
          `rgba(180, 220, 255, ${a * 0.9})`,
          `rgba(120, 180, 255, ${a * 0.8})`,
          `rgba(60, 120, 255, ${a * 0.6})`,
          `rgba(20, 60, 200, ${a * 0.4})`,
          `rgba(0, 20, 120, ${a * 0.2})`
        ];
      case 'green':
        return [
          `rgba(220, 255, 200, ${a})`,
          `rgba(180, 255, 150, ${a * 0.9})`,
          `rgba(120, 220, 100, ${a * 0.8})`,
          `rgba(60, 180, 60, ${a * 0.6})`,
          `rgba(20, 120, 20, ${a * 0.4})`,
          `rgba(0, 60, 0, ${a * 0.2})`
        ];
      case 'purple':
        return [
          `rgba(255, 220, 255, ${a})`,
          `rgba(255, 180, 255, ${a * 0.9})`,
          `rgba(220, 120, 255, ${a * 0.8})`,
          `rgba(180, 60, 220, ${a * 0.6})`,
          `rgba(120, 20, 160, ${a * 0.4})`,
          `rgba(60, 0, 80, ${a * 0.2})`
        ];
      case 'rainbow':
        // Rainbow usa una rotación de hue sin necesidad de phase
        const baseHue = Math.random() * 360;
        return [
          `hsla(${baseHue}, 100%, 80%, ${a})`,
          `hsla(${(baseHue + 40) % 360}, 100%, 70%, ${a * 0.9})`,
          `hsla(${(baseHue + 80) % 360}, 100%, 60%, ${a * 0.8})`,
          `hsla(${(baseHue + 120) % 360}, 100%, 50%, ${a * 0.6})`,
          `hsla(${(baseHue + 160) % 360}, 100%, 40%, ${a * 0.4})`,
          `hsla(${(baseHue + 200) % 360}, 100%, 30%, ${a * 0.2})`
        ];
      default:
        return [`rgba(255, 100, 0, ${a})`];
    }
  }

  private getFlameRGB(color: string, heat: number): [number, number, number] {
    switch (color) {
      case 'red':
        return [255 * heat, 150 * heat, 0];
      case 'blue':
        return [150 * heat, 200 * heat, 255 * heat];
      case 'green':
        return [150 * heat, 255 * heat, 150 * heat];
      case 'purple':
        return [255 * heat, 150 * heat, 255 * heat];
      case 'rainbow':
        const hue = heat * 360;
        return this.hslToRgb(hue / 360, 1, 0.5 * heat);
      default:
        return [255 * heat, 100 * heat, 0];
    }
  }

  // Simple Perlin noise approximation
  private perlinNoise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    // Simplified noise - en producción usarías una tabla de permutación
    const hash = (X * 374761393 + Y * 668265263 + Z * 1274126177) & 0x7FFFFFFF;
    return (hash / 0x7FFFFFFF) * 2 - 1;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Helper: Dibujar estrella
   */
  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
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
    
    console.log('🎬 Preview optimizado usando', previewFrameCount, 'frames (GIF configurado:', configuredFrames, ')');
    
    // Verificar si estamos en modo GIF Studio con capas
    const layersCount = this.effectLayers().length;
    const enabledLayers = this.effectLayers().filter(layer => layer.enabled);
    
    console.log('🎬 generateGifPreview:', {
      gifStudioMode: this.gifStudioMode(),
      compositionMode: this.compositionMode(),
      totalLayers: layersCount,
      enabledLayers: enabledLayers.length,
      layerTypes: enabledLayers.map(l => l.type)
    });
    
    // COMPOSITION MODE: Show composition with layer effects
    if (this.compositionMode() && this.compositionCanvasComponent) {
      console.log('🎨 Rendering composition with layer effects for GIF preview');
      const compositionData = this.compositionCanvasComponent.getCompositionImageDataWithEffects();
      if (compositionData) {
        // Dithering is already applied per-layer in getCompositionImageDataWithEffects()
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = compositionData.width;
        frameCanvas.height = compositionData.height;
        const ctx = frameCanvas.getContext('2d')!;
        ctx.putImageData(compositionData, 0, 0);
        this.previewFrames.push(frameCanvas.toDataURL());
        console.log('✅ Composition preview frame generated with effects and per-layer dithering');
      } else {
        console.log('⚠️ No composition data available');
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
        
        console.log('✅ Usando sistema de capas para preview (escalado al ' + (this.previewScale * 100) + '%)');
        const frames = await this.createLayeredEffectFrames(scaledImageData, enabledLayers);
        
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
        console.log('✅ Preview frames generados:', this.previewFrames.length);
      } else {
        // Sin capas habilitadas, mostrar imagen estática
        console.log('⚠️ No hay capas habilitadas, mostrando imagen estática');
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = this.processedImageData.width;
        frameCanvas.height = this.processedImageData.height;
        const ctx = frameCanvas.getContext('2d')!;
        ctx.putImageData(this.processedImageData, 0, 0);
        this.previewFrames.push(frameCanvas.toDataURL());
      }
    } else {
      // Sin capas, mostrar imagen estática sin efectos
      console.log('📊 Sin capas, mostrando imagen estática');
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

  private applyPreviewEffect(ctx: CanvasRenderingContext2D, imageData: ImageData, frameIndex: number, totalFrames: number) {
    const phase = (frameIndex / totalFrames) * Math.PI * 2;
    const intensity = this.gifIntensity();

    switch (this.gifEffectType()) {
      case 'scanline':
        ctx.putImageData(imageData, 0, 0);
        const scanlineY = (frameIndex / totalFrames) * imageData.height;
        ctx.fillStyle = `rgba(0, 255, 0, ${0.3 * intensity})`;
        ctx.fillRect(0, scanlineY, imageData.width, 4);
        break;

      case 'vhs':
        const glitchOffset = Math.sin(phase) * intensity * 10;
        ctx.putImageData(imageData, glitchOffset, 0);
        break;

      case 'noise':
        ctx.putImageData(imageData, 0, 0);
        const noiseData = ctx.getImageData(0, 0, imageData.width, imageData.height);
        for (let i = 0; i < noiseData.data.length; i += 4) {
          const noise = (Math.random() - 0.5) * intensity * 50;
          noiseData.data[i] += noise;
          noiseData.data[i + 1] += noise;
          noiseData.data[i + 2] += noise;
        }
        ctx.putImageData(noiseData, 0, 0);
        break;

      case 'phosphor':
        ctx.putImageData(imageData, 0, 0);
        const phosphorData = ctx.getImageData(0, 0, imageData.width, imageData.height);
        const phosphorIntensity = 0.5 + Math.sin(phase) * 0.5 * intensity;
        for (let i = 0; i < phosphorData.data.length; i += 4) {
          phosphorData.data[i] *= 0.3;
          phosphorData.data[i + 1] *= (1 + phosphorIntensity * 0.5);
          phosphorData.data[i + 2] *= 0.3;
        }
        ctx.putImageData(phosphorData, 0, 0);
        break;

      case 'rgb-split':
        const offsetX = Math.sin(phase) * intensity * 5;
        ctx.globalCompositeOperation = 'screen';
        
        const redData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
        for (let i = 0; i < redData.data.length; i += 4) {
          redData.data[i + 1] = 0;
          redData.data[i + 2] = 0;
        }
        ctx.putImageData(redData, offsetX, 0);
        
        const cyanData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
        for (let i = 0; i < cyanData.data.length; i += 4) {
          cyanData.data[i] = 0;
        }
        ctx.putImageData(cyanData, -offsetX, 0);
        break;

      case 'motion-sense':
        const direction = Math.sin(phase);
        const blurAmount = Math.abs(direction) * intensity * 3;
        const layers = 3;
        
        ctx.globalAlpha = 1 / layers;
        for (let layer = 0; layer < layers; layer++) {
          const offset = (layer / layers) * direction * intensity * 10;
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
  
  async saveToGallery() {
    if (!this.processedCanvas) {
      alert('No processed image to save!');
      return;
    }
    
    // If in composition mode, render composition first
    if (this.compositionMode() && this.compositionService.compositionState().layers.length > 0) {
      this.renderCompositionToCanvas();
    }
    
    const canvas = this.processedCanvas.nativeElement;
    const name = prompt('Enter a name for this design:', `Design ${new Date().toLocaleDateString()}`);
    
    if (!name) return;
    
    const settings: DitheringSettings = {
      algorithm: this.selectedAlgorithm(),
      palette: this.selectedPalette(),
      scale: this.scale(),
      contrast: this.contrast(),
      midtones: this.midtones(),
      highlights: this.highlights(),
      blur: this.blur(),
      effectLayers: this.effectLayers()
    };
    
    try {
      await this.galleryService.saveToGallery(canvas, name, settings);
      
      // 🏆 Track achievement
      this.achievementService.trackGallerySave();
      
      alert('Saved to gallery!');
    } catch (error) {
      console.error('Error saving to gallery:', error);
      alert('Error saving to gallery. Check console for details.');
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





