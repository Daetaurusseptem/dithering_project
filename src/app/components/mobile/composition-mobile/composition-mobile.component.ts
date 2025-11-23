import { Component, inject, signal, effect, computed, Injector, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompositionService } from '../../../services/composition.service';
import { CompositionToolService } from '../../../services/composition-tool.service';
import { HistoryService } from '../../../services/history.service';
import { DitheringService } from '../../../services/dithering.service';

@Component({
  selector: 'app-composition-mobile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="composition-mobile">
      <!-- Canvas Area -->
      <div class="canvas-container">
        <canvas 
          #canvas
          class="composition-canvas"
          [width]="canvasWidth()"
          [height]="canvasHeight()"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd($event)">
        </canvas>
        
        <!-- Zoom Controls -->
        <div class="zoom-controls">
          <button class="zoom-btn" (click)="zoomOut()">−</button>
          <span class="zoom-level">{{ Math.round(zoom() * 100) }}%</span>
          <button class="zoom-btn" (click)="zoomIn()">+</button>
          <button class="zoom-btn zoom-fit" (click)="zoomToFit()">⊡</button>
        </div>
      </div>

      <!-- Bottom Actions Bar -->
      <div class="actions-bar">
        <button class="action-btn" (click)="toggleLayersPanel()" [class.active]="showLayersPanel()">
          <span class="btn-icon">📚</span>
          <span class="btn-label">Layers</span>
        </button>
        
        <button class="action-btn" (click)="toggleToolsPanel()" [class.active]="showToolsPanel()">
          <span class="btn-icon">🔧</span>
          <span class="btn-label">Tools</span>
        </button>
        
        <button class="action-btn" (click)="undo()" [disabled]="!canUndo()">
          <span class="btn-icon">↶</span>
          <span class="btn-label">Undo</span>
        </button>
        
        <button class="action-btn" (click)="redo()" [disabled]="!canRedo()">
          <span class="btn-icon">↷</span>
          <span class="btn-label">Redo</span>
        </button>
        
        <button class="action-btn action-primary" (click)="exportComposition()">
          <span class="btn-icon">💾</span>
          <span class="btn-label">Export</span>
        </button>
      </div>

      <!-- Layers Panel (Bottom Sheet) -->
      @if (showLayersPanel()) {
        <div class="panel-overlay" (click)="closeAllPanels()">
          <div class="panel-sheet layers-panel" (click)="$event.stopPropagation()">
            <div class="panel-header">
              <h3>Layers</h3>
              <button class="btn-close" (click)="closeAllPanels()">✕</button>
            </div>
            
            <div class="panel-content">
              <button class="btn-add-layer" (click)="addLayer()">
                <span>+</span> Add Layer
              </button>
              
              <div class="layers-list">
                @for (layer of layers(); track layer.id) {
                  <div 
                    class="layer-item"
                    [class.selected]="compositionService.compositionState().activeLayerId === layer.id"
                    (click)="selectLayer(layer.id)">
                    <div class="layer-thumbnail">
                      <canvas [width]="60" [height]="60"></canvas>
                    </div>
                    <div class="layer-info">
                      <div class="layer-name">{{ layer.name }}</div>
                      <div class="layer-meta">{{ layer.width }} × {{ layer.height }}</div>
                    </div>
                    <div class="layer-actions">
                      <button class="layer-action-btn" (click)="toggleLayerVisibility(layer.id, $event)">
                        {{ layer.visible ? '👁️' : '👁️‍🗨️' }}
                      </button>
                      <button class="layer-action-btn" (click)="deleteLayer(layer.id, $event)">🗑️</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tools Panel (Bottom Sheet) -->
      @if (showToolsPanel()) {
        <div class="panel-overlay" (click)="closeAllPanels()">
          <div class="panel-sheet tools-panel" (click)="$event.stopPropagation()">
            <div class="panel-header">
              <h3>Tools</h3>
              <button class="btn-close" (click)="closeAllPanels()">✕</button>
            </div>
            
            <div class="panel-content">
              <div class="tools-grid">
                @for (tool of tools; track tool.id) {
                  <button 
                    class="tool-btn"
                    [class.active]="currentTool() === tool.id"
                    (click)="selectTool(tool.id)">
                    <span class="tool-icon">{{ tool.icon }}</span>
                    <span class="tool-label">{{ tool.label }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .composition-mobile {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      background: var(--theme-background);
    }

    .canvas-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: var(--theme-surface);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .composition-canvas {
      max-width: 100%;
      max-height: 100%;
      image-rendering: pixelated;
      touch-action: none;
      transform-origin: center center;
    }

    /* Zoom Controls */
    .zoom-controls {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      align-items: center;
      background: var(--theme-surface);
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .zoom-btn {
      width: 36px;
      height: 36px;
      background: var(--theme-accent);
      border: 1px solid var(--theme-border);
      border-radius: 6px;
      color: var(--theme-text);
      font-size: 1.2rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .zoom-btn:active {
      transform: scale(0.95);
    }

    .zoom-level {
      font-size: 0.85rem;
      font-family: var(--font-mono);
      color: var(--theme-text);
      min-width: 48px;
      text-align: center;
    }

    .zoom-fit {
      font-size: 1rem;
    }

    /* Actions Bar */
    .actions-bar {
      display: flex;
      background: var(--theme-surface);
      border-top: 1px solid var(--theme-border);
      padding: 12px;
      gap: 8px;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
    }

    .action-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 4px;
      background: var(--theme-accent);
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      color: var(--theme-text);
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 60px;
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .action-btn:not(:disabled):active {
      transform: translateY(1px);
    }

    .action-btn.active {
      background: var(--theme-primary);
      color: var(--theme-background);
      border-color: var(--theme-primary);
    }

    .action-primary {
      background: var(--theme-primary);
      color: var(--theme-background);
      border-color: var(--theme-primary);
    }

    .btn-icon {
      font-size: 1.4rem;
      filter: grayscale(0.3) brightness(0.85) saturate(0.6);
    }

    .action-btn.active .btn-icon,
    .action-primary .btn-icon {
      filter: grayscale(0.2) brightness(0.95) saturate(0.8);
    }

    .btn-label {
      font-size: 0.65rem;
      font-weight: 600;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Panel Overlay */
    .panel-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 64px;
      background: rgba(0, 0, 0, 0.7);
      z-index: 200;
      animation: fadeIn 0.2s ease;
    }

    .panel-sheet {
      position: fixed;
      bottom: 64px;
      left: 0;
      right: 0;
      max-height: 70vh;
      background: var(--theme-surface);
      border-top: 2px solid var(--theme-border);
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--theme-border);
    }

    .panel-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-family: var(--font-mono);
      color: var(--theme-primary);
    }

    .btn-close {
      width: 44px;
      height: 44px;
      background: transparent;
      border: none;
      color: var(--theme-text);
      font-size: 1.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    /* Layers Panel */
    .btn-add-layer {
      width: 100%;
      padding: 12px;
      background: var(--theme-accent);
      border: 1px solid var(--theme-primary);
      border-radius: 8px;
      color: var(--theme-primary);
      font-size: 1rem;
      font-weight: 600;
      font-family: var(--font-mono);
      cursor: pointer;
      margin-bottom: 1rem;
    }

    .layers-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .layer-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--theme-accent);
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .layer-item.selected {
      border-color: var(--theme-primary);
      background: var(--theme-surface);
    }

    .layer-thumbnail {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      border: 1px solid var(--theme-border);
      overflow: hidden;
      flex-shrink: 0;
    }

    .layer-thumbnail canvas {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
    }

    .layer-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }

    .layer-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--theme-text);
    }

    .layer-meta {
      font-size: 0.75rem;
      font-family: var(--font-mono);
      color: var(--theme-text-secondary);
    }

    .layer-actions {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .layer-action-btn {
      width: 36px;
      height: 36px;
      background: transparent;
      border: 1px solid var(--theme-border);
      border-radius: 6px;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: grayscale(0.4);
    }

    .layer-action-btn:active {
      transform: scale(0.95);
    }

    /* Tools Panel */
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .tool-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 8px;
      background: var(--theme-accent);
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      color: var(--theme-text);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tool-btn.active {
      background: var(--theme-primary);
      color: var(--theme-background);
      border-color: var(--theme-primary);
    }

    .tool-icon {
      font-size: 1.8rem;
      filter: grayscale(0.3) brightness(0.85) saturate(0.6);
    }

    .tool-btn.active .tool-icon {
      filter: grayscale(0.2) brightness(0.95) saturate(0.8);
    }

    .tool-label {
      font-size: 0.7rem;
      font-weight: 600;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `]
})
export class CompositionMobileComponent implements AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  compositionService = inject(CompositionService);
  toolService = inject(CompositionToolService);
  historyService = inject(HistoryService);
  ditheringService = inject(DitheringService);
  private injector = inject(Injector);
  
  Math = Math;
  
  showLayersPanel = signal(false);
  showToolsPanel = signal(false);
  zoom = signal(1);
  
  // Computed values from composition service
  compositionState = this.compositionService.compositionState;
  layers = computed(() => this.compositionState().layers);
  canvasWidth = computed(() => this.compositionState().canvasWidth);
  canvasHeight = computed(() => this.compositionState().canvasHeight);
  
  currentTool = signal('select');
  
  tools = [
    { id: 'select', icon: '👆', label: 'Select' },
    { id: 'move', icon: '✋', label: 'Move' },
    { id: 'brush', icon: '🖌️', label: 'Brush' },
    { id: 'eraser', icon: '🧹', label: 'Eraser' },
    { id: 'text', icon: '🔤', label: 'Text' },
    { id: 'shape', icon: '⬜', label: 'Shape' },
  ];

  ngAfterViewInit(): void {
    // Initialize composition if no layers exist but we need them
    this.initializeIfNeeded();
    
    // Watch for composition state changes and re-render
    effect(() => {
      this.compositionState(); // Subscribe to state changes
      requestAnimationFrame(() => this.renderCanvas());
    }, { injector: this.injector });
  }

  private initializeIfNeeded(): void {
    // This will be called when composition mode is activated in mobile
    // The app.ts should handle initialization through toggleCompositionMode
    // For now, just render what we have
    requestAnimationFrame(() => this.renderCanvas());
  }

  private async renderCanvas(): Promise<void> {
    if (!this.canvasRef) {
      console.log('📱 Composition canvas ref not available');
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('📱 Composition canvas context not available');
      return;
    }

    const state = this.compositionState();
    
    console.log('📱 Rendering composition canvas:', {
      layers: state.layers.length,
      canvasSize: { w: canvas.width, h: canvas.height },
      visibleLayers: state.layers.filter(l => l.visible).length
    });
    
    // Apply zoom transform
    canvas.style.transform = `scale(${this.zoom()})`;
    
    // Clear canvas
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sort and render layers
    const sortedLayers = [...state.layers]
      .filter(l => l.visible)
      .sort((a, b) => a.order - b.order);

    for (const layer of sortedLayers) {
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;

      // Apply rotation
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      // Draw layer image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.imageData.width;
      tempCanvas.height = layer.imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(layer.imageData, 0, 0);

      ctx.drawImage(tempCanvas, layer.x, layer.y, layer.width, layer.height);
      ctx.restore();
    }
  }

  toggleLayersPanel(): void {
    this.showLayersPanel.update(v => !v);
    this.showToolsPanel.set(false);
  }

  toggleToolsPanel(): void {
    this.showToolsPanel.update(v => !v);
    this.showLayersPanel.set(false);
  }

  closeAllPanels(): void {
    this.showLayersPanel.set(false);
    this.showToolsPanel.set(false);
  }

  zoomIn(): void {
    this.zoom.update(z => Math.min(z + 0.25, 4));
  }

  zoomOut(): void {
    this.zoom.update(z => Math.max(z - 0.25, 0.25));
  }

  zoomToFit(): void {
    this.zoom.set(1);
  }

  canUndo(): boolean {
    return this.historyService.canUndo();
  }

  canRedo(): boolean {
    return this.historyService.canRedo();
  }

  undo(): void {
    this.historyService.undo();
  }

  redo(): void {
    this.historyService.redo();
  }

  addLayer(): void {
    // Implementation from composition service
  }

  selectLayer(id: string): void {
    this.compositionService.selectLayer(id);
  }

  toggleLayerVisibility(id: string, event: Event): void {
    event.stopPropagation();
    const layer = this.layers().find(l => l.id === id);
    if (layer) {
      this.compositionService.updateLayer(id, { visible: !layer.visible });
    }
  }

  deleteLayer(id: string, event: Event): void {
    event.stopPropagation();
    this.compositionService.deleteLayer(id);
  }

  selectTool(toolId: string): void {
    this.currentTool.set(toolId);
    this.closeAllPanels();
  }

  exportComposition(): void {
    // Export logic
  }

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();
  }

  onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
  }
}
