import { Component, inject, computed, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompositionService } from '../../services/composition.service';
import { ModalService } from '../../services/modal.service';
import { HistoryService, DeleteLayerCommand, AddLayerCommand } from '../../services/history.service';
import { CompositionLayer } from '../../models/composition-layer.interface';

@Component({
  selector: 'app-composition-layers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="composition-layers-panel">
      <!-- Header -->
      <div class="layers-header">
        <h3>Layers</h3>
        <div class="header-buttons">
          <button 
            class="btn-small" 
            (click)="addImageLayer()"
            title="Add Layer">
            <span class="icon">+</span>
          </button>
          <button 
            class="btn-small" 
            (click)="copySelectedLayers()"
            [disabled]="selectedLayers().length === 0"
            title="Copy Selected (Ctrl+C)">
            <span class="icon">📄</span>
          </button>
          <button 
            class="btn-small" 
            (click)="pasteFromClipboard()"
            title="Paste (Ctrl+V)">
            <span class="icon">📋</span>
          </button>
          <button 
            class="btn-small" 
            (click)="duplicateSelectedLayers()"
            [disabled]="selectedLayers().length === 0"
            title="Duplicate Selected (Ctrl+D)">
            <span class="icon">⎘</span>
          </button>
          <button 
            class="btn-small" 
            (click)="clearAllLayers()"
            [disabled]="layers().length === 0"
            title="Clear All">
            <span class="icon">🗑</span>
          </button>
        </div>
      </div>

      <!-- Canvas Settings -->
      <div class="canvas-settings">
        <div class="settings-header" (click)="toggleCanvasSettings()">
          <span>Canvas Size</span>
          <span class="toggle-icon">{{ showCanvasSettings() ? '▼' : '▶' }}</span>
        </div>
        @if (showCanvasSettings()) {
          <div class="settings-content">
            <div class="input-row">
              <label>Width:</label>
              <input 
                type="number" 
                [value]="compositionState().canvasWidth"
                (change)="updateCanvasWidth($event)"
                min="100"
                max="4000">
            </div>
            <div class="input-row">
              <label>Height:</label>
              <input 
                type="number" 
                [value]="compositionState().canvasHeight"
                (change)="updateCanvasHeight($event)"
                min="100"
                max="4000">
            </div>
          </div>
        }
      </div>

      <!-- Layers List -->
      <div class="layers-list">
        @if (layers().length === 0) {
          <div class="empty-state">
            <p>No layers yet</p>
            <p class="hint">Click + to add a layer</p>
          </div>
        } @else {
          @for (layer of layers(); track layer.id) {
            <div 
              class="layer-item"
              [class.active]="layer.id === activeLayerId()"
              [class.selected]="isLayerSelected(layer.id)"
              (click)="selectLayer(layer.id, $event)">
              
              <!-- Layer Thumbnail -->
              <div class="layer-thumbnail">
                <canvas 
                  #thumbnailCanvas
                  [width]="40"
                  [height]="40"
                  (load)="drawThumbnail(thumbnailCanvas, layer)">
                </canvas>
              </div>
              
              <!-- Layer Info -->
              <div class="layer-info">
                @if (editingLayerId() === layer.id) {
                  <input 
                    type="text" 
                    class="layer-name-input"
                    [(ngModel)]="layer.name"
                    (blur)="finishEditing()"
                    (keydown.enter)="finishEditing()"
                    (keydown.escape)="cancelEditing()"
                    autofocus>
                } @else {
                  <div 
                    class="layer-name" 
                    (dblclick)="startEditing(layer.id)">
                    {{ layer.name }}
                  </div>
                }
                
                <div class="layer-meta">
                  {{ layer.width }} × {{ layer.height }}
                  @if (layer.ditherExempt) {
                    <span class="badge">No Dither</span>
                  }
                </div>
              </div>
              
              <!-- Layer Controls -->
              <div class="layer-controls">
                <!-- Visibility Toggle -->
                <button 
                  class="btn-icon"
                  (click)="toggleVisibility(layer.id); $event.stopPropagation()"
                  title="Toggle Visibility">
                  {{ layer.visible ? '👁' : '🚫' }}
                </button>
                
                <!-- Lock Toggle -->
                <button 
                  class="btn-icon"
                  [class.active]="layer.locked"
                  (click)="toggleLock(layer.id); $event.stopPropagation()"
                  title="Lock/Unlock Layer">
                  {{ layer.locked ? '🔒' : '🔓' }}
                </button>
                
                <!-- Move Up -->
                <button 
                  class="btn-icon"
                  (click)="moveUp(layer.id); $event.stopPropagation()"
                  [disabled]="isTopLayer(layer)"
                  title="Move Up">
                  ▲
                </button>
                
                <!-- Move Down -->
                <button 
                  class="btn-icon"
                  (click)="moveDown(layer.id); $event.stopPropagation()"
                  [disabled]="isBottomLayer(layer)"
                  title="Move Down">
                  ▼
                </button>
                
                <!-- Duplicate -->
                <button 
                  class="btn-icon"
                  (click)="duplicateLayer(layer.id); $event.stopPropagation()"
                  title="Duplicate">
                  📋
                </button>
                
                <!-- Delete -->
                <button 
                  class="btn-icon btn-danger"
                  (click)="deleteLayer(layer.id); $event.stopPropagation()"
                  title="Delete">
                  ✖
                </button>
              </div>
            </div>
          }
        }
      </div>
      
      <!-- Hidden file input -->
      <input 
        #fileInput
        type="file" 
        accept="image/*"
        style="display: none"
        (change)="onFileSelected($event)">
    </div>
  `,
  styles: [`
    .composition-layers-panel {
      background: linear-gradient(145deg, #1a2d1a 0%, #0f1f0f 100%);
      border: 2px solid #00ff00;
      padding: 8px;
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      font-size: 10px;
      box-shadow: inset 0 0 20px rgba(0, 255, 0, 0.1);
    }
    
    .layers-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(0, 255, 0, 0.3);
    }
    
    .layers-header h3 {
      margin: 0;
      font-size: 11px;
      font-weight: normal;
      color: #00ff00;
      text-shadow: 0 0 10px rgba(0, 255, 0, 0.6);
    }
    
    .header-buttons {
      display: flex;
      gap: 4px;
    }
    
    .btn-small {
      padding: 4px 8px;
      background: linear-gradient(180deg, #2a4d2a 0%, #1a3d1a 100%);
      border: 1px solid #00ff00;
      color: #00ff00;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
    }
    
    .btn-small:hover {
      background: linear-gradient(180deg, #3a5d3a 0%, #2a4d2a 100%);
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    }
    
    .btn-small:active {
      transform: translateY(1px);
    }
    
    .btn-small:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      box-shadow: none;
    }
    
    .layers-list {
      flex: 1;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(0, 255, 0, 0.2);
      padding: 4px;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: rgba(0, 255, 0, 0.4);
    }
    
    .empty-state .hint {
      font-size: 8px;
      margin-top: 8px;
      color: rgba(0, 255, 0, 0.3);
    }
    
    .layer-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      margin-bottom: 4px;
      background: rgba(0, 20, 0, 0.6);
      border: 1px solid rgba(0, 255, 0, 0.2);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .layer-item:hover {
      background: rgba(0, 40, 0, 0.8);
      border-color: rgba(0, 255, 0, 0.4);
    }
    
    .layer-item.active {
      background: rgba(0, 100, 0, 0.4);
      border-color: #00ff00;
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
    }
    
    /* Multiple selection styling */
    .layer-item.selected {
      background: rgba(0, 150, 150, 0.3);
      border-color: #00ffcc;
      box-shadow: 0 0 8px rgba(0, 255, 204, 0.25);
    }
    
    /* Active layer in multiple selection */
    .layer-item.active.selected {
      background: rgba(0, 100, 0, 0.5);
      border-color: #00ff00;
      box-shadow: 
        0 0 10px rgba(0, 255, 0, 0.4),
        inset 0 0 8px rgba(0, 255, 204, 0.2);
    }
    
    .layer-thumbnail {
      width: 40px;
      height: 40px;
      border: 1px solid rgba(0, 255, 0, 0.3);
      background: repeating-conic-gradient(#0a0a0a 0% 25%, #1a1a1a 0% 50%) 
                  50% / 8px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .layer-thumbnail canvas {
      max-width: 100%;
      max-height: 100%;
      image-rendering: pixelated;
    }
    
    .layer-info {
      flex: 1;
      min-width: 0;
    }
    
    .layer-name {
      font-weight: normal;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #90ee90;
      font-size: 9px;
    }
    
    .layer-item.active .layer-name {
      color: #00ff00;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.6);
    }
    
    .layer-name-input {
      width: 100%;
      padding: 2px;
      border: 1px solid #00ff00;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      font-family: inherit;
      font-size: inherit;
    }
    
    .layer-meta {
      font-size: 8px;
      color: rgba(0, 255, 0, 0.5);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .badge {
      background: rgba(0, 255, 0, 0.2);
      color: #00ff00;
      padding: 1px 4px;
      border: 1px solid rgba(0, 255, 0, 0.4);
      font-size: 7px;
    }
    
    .layer-controls {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }
    
    .btn-icon {
      width: 20px;
      height: 20px;
      padding: 0;
      background: rgba(0, 40, 0, 0.6);
      border: 1px solid rgba(0, 255, 0, 0.3);
      color: #00ff00;
      cursor: pointer;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .btn-icon:hover:not(:disabled) {
      background: rgba(0, 60, 0, 0.8);
      border-color: #00ff00;
      box-shadow: 0 0 5px rgba(0, 255, 0, 0.4);
    }
    
    .btn-icon.active {
      background: rgba(255, 0, 0, 0.3);
      border-color: #ff0000;
      color: #ff6666;
    }
    
    .btn-icon:active:not(:disabled) {
      transform: translateY(1px);
    }
    
    .btn-icon:disabled {
      opacity: 0.2;
      cursor: not-allowed;
    }
    
    .btn-danger:hover:not(:disabled) {
      background: rgba(255, 0, 0, 0.3);
      border-color: #ff0000;
      color: #ff6666;
    }
    
    .icon {
      display: inline-block;
    }
    
    /* Canvas Settings */
    .canvas-settings {
      margin-bottom: 12px;
      background: rgba(0, 50, 0, 0.3);
      border: 1px solid rgba(0, 255, 0, 0.4);
      border-radius: 4px;
    }
    
    .settings-header {
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-size: 10px;
      color: #00ff00;
      font-weight: bold;
      transition: background 0.2s;
    }
    
    .settings-header:hover {
      background: rgba(0, 255, 0, 0.1);
    }
    
    .toggle-icon {
      font-size: 8px;
    }
    
    .settings-content {
      padding: 8px 12px;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
    }
    
    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .input-row:last-child {
      margin-bottom: 0;
    }
    
    .input-row label {
      flex: 0 0 60px;
      font-size: 10px;
      color: #00ff00;
    }
    
    .input-row input[type="number"] {
      flex: 1;
      padding: 4px 8px;
      background: #000000;
      border: 1px solid #00ff00;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 10px;
    }
    
    .input-row input[type="number"]:focus {
      outline: none;
      box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
    }
  `]
})
export class CompositionLayersComponent implements AfterViewInit {
  private compositionService = inject(CompositionService);
  private modalService = inject(ModalService);
  private historyService = inject(HistoryService);
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  // Signals
  compositionState = this.compositionService.compositionState;
  layers = computed(() => {
    const layers = this.compositionState().layers;
    return [...layers].sort((a, b) => b.order - a.order);
  });
  activeLayerId = computed(() => this.compositionState().activeLayerId);
  selectedLayers = computed(() => this.compositionService.getSelectedLayers());
  showCanvasSettings = signal(false);
  
  // Editing state
  editingLayerId = computed(() => null as string | null);
  
  constructor() {
    // Draw thumbnails after view init
    setTimeout(() => this.updateAllThumbnails(), 100);
  }
  
  ngAfterViewInit() {
    this.updateAllThumbnails();
  }
  
  /**
   * Layer Actions
   */
  
  /**
   * Select layer with Shift+Click support for multiple selection
   */
  selectLayer(layerId: string, event?: MouseEvent): void {
    if (event?.shiftKey) {
      // Shift+Click: Toggle selection
      this.compositionService.toggleLayerSelection(layerId);
    } else {
      // Normal click: Select single layer
      this.compositionService.selectLayer(layerId, false);
    }
  }
  
  /**
   * Check if a layer is selected
   */
  isLayerSelected(layerId: string): boolean {
    return this.compositionService.isLayerSelected(layerId);
  }

  /**
   * Copy selected layers to clipboard
   */
  copySelectedLayers(): void {
    this.compositionService.copySelectedLayers();
  }

  /**
   * Paste layers from clipboard
   */
  pasteFromClipboard(): void {
    this.compositionService.pasteFromClipboard();
  }

  /**
   * Duplicate selected layers
   */
  duplicateSelectedLayers(): void {
    this.compositionService.duplicateSelectedLayers();
  }
  
  addImageLayer(): void {
    this.fileInput?.nativeElement.click();
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to get image data
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const layerId = this.compositionService.addLayer(img, imageData);
        
        // Add to history
        const state = this.compositionService.compositionState();
        const createdLayer = state.layers.find(l => l.id === layerId);
        if (createdLayer) {
          const command = new AddLayerCommand(this.compositionService, createdLayer);
          this.historyService.record(command);
        }
        
        // Force update thumbnails after DOM update
        setTimeout(() => {
          this.updateAllThumbnails();
        }, 100);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    input.value = '';
  }
  
  duplicateLayer(layerId: string): void {
    this.compositionService.duplicateLayer(layerId);
    setTimeout(() => this.updateAllThumbnails(), 50);
  }
  
  deleteLayer(layerId: string): void {
    const state = this.compositionState();
    const layer = state.layers.find(l => l.id === layerId);
    const layerName = layer?.name || 'this layer';
    
    this.modalService.confirm(
      `Delete "${layerName}"?`,
      'Delete Layer'
    ).then((confirmed) => {
      if (confirmed) {
        const command = new DeleteLayerCommand(this.compositionService, layerId);
        this.historyService.execute(command);
      }
    });
  }
  
  toggleVisibility(layerId: string): void {
    this.compositionService.toggleLayerVisibility(layerId);
  }
  
  toggleLock(layerId: string): void {
    const state = this.compositionState();
    const layer = state.layers.find(l => l.id === layerId);
    if (layer) {
      this.compositionService.updateLayer(layerId, {
        locked: !layer.locked
      });
    }
  }
  
  moveUp(layerId: string): void {
    this.compositionService.moveLayerUp(layerId);
  }
  
  moveDown(layerId: string): void {
    this.compositionService.moveLayerDown(layerId);
  }
  
  clearAllLayers(): void {
    this.modalService.confirm(
      'Are you sure you want to clear all layers? This cannot be undone!',
      'Clear All Layers'
    ).then((confirmed) => {
      if (confirmed) {
        this.compositionService.clearAllLayers();
      }
    });
  }
  
  /**
   * Canvas Settings
   */
  
  toggleCanvasSettings(): void {
    this.showCanvasSettings.update(v => !v);
  }
  
  updateCanvasWidth(event: Event): void {
    const input = event.target as HTMLInputElement;
    const width = parseInt(input.value, 10);
    if (width >= 100 && width <= 4000) {
      const state = this.compositionState();
      this.compositionService.setCanvasSize(width, state.canvasHeight);
    }
  }
  
  updateCanvasHeight(event: Event): void {
    const input = event.target as HTMLInputElement;
    const height = parseInt(input.value, 10);
    if (height >= 100 && height <= 4000) {
      const state = this.compositionState();
      this.compositionService.setCanvasSize(state.canvasWidth, height);
    }
  }
  
  /**
   * Layer Naming
   */
  
  private editingId: string | null = null;
  
  startEditing(layerId: string): void {
    this.editingId = layerId;
  }
  
  finishEditing(): void {
    this.editingId = null;
  }
  
  cancelEditing(): void {
    this.editingId = null;
  }
  
  /**
   * Utilities
   */
  
  isTopLayer(layer: CompositionLayer): boolean {
    const layers = this.layers();
    return layers.length > 0 && layers[0].id === layer.id;
  }
  
  isBottomLayer(layer: CompositionLayer): boolean {
    const layers = this.layers();
    return layers.length > 0 && layers[layers.length - 1].id === layer.id;
  }
  
  drawThumbnail(canvas: HTMLCanvasElement, layer: CompositionLayer): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create temp canvas with layer image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.imageData.width;
    tempCanvas.height = layer.imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(layer.imageData, 0, 0);
    
    // Calculate scale to fit
    const scale = Math.min(
      canvas.width / layer.width,
      canvas.height / layer.height
    );
    
    const scaledWidth = layer.width * scale;
    const scaledHeight = layer.height * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;
    
    // Draw thumbnail
    ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
  }
  
  updateAllThumbnails(): void {
    const canvases = document.querySelectorAll('.layer-thumbnail canvas');
    const layers = this.layers();
    
    canvases.forEach((canvas, index) => {
      if (index < layers.length) {
        this.drawThumbnail(canvas as HTMLCanvasElement, layers[index]);
      }
    });
  }
}
