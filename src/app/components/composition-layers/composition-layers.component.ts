import { Component, inject, computed, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompositionService } from '../../services/composition.service';
import { ModalService } from '../../services/modal.service';
import { HistoryService, DeleteLayerCommand, AddLayerCommand, BatchAddLayersCommand } from '../../services/history.service';
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
              [class.dragging]="draggingLayerId() === layer.id"
              [class.drag-over]="dragOverLayerId() === layer.id"
              (click)="selectLayer(layer.id, $event)"
              (contextmenu)="onContextMenu($event, layer)"
              draggable="true"
              (dragstart)="onDragStart($event, layer)"
              (dragend)="onDragEnd($event)"
              (dragover)="onDragOver($event, layer)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event, layer)">
              
              <!-- Layer Name Row -->
              <div class="layer-name-row">
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
                    (click)="onNameClick(layer.id, $event)">
                    {{ layer.name }}
                  </div>
                }
              </div>
              
              <!-- Layer Content Row -->
              <div class="layer-content-row">
                <!-- Layer Thumbnail -->
                <div class="layer-thumbnail">
                  <canvas 
                    #thumbnailCanvas
                    [width]="40"
                    [height]="40"
                    (load)="drawThumbnail(thumbnailCanvas, layer)">
                  </canvas>
                </div>
                
                <!-- Layer Meta -->
                <div class="layer-meta">
                  <span>{{ Math.round(layer.width) }} × {{ Math.round(layer.height) }}</span>
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
      
      <!-- Context Menu -->
      @if (contextMenu()) {
        <div 
          class="context-menu"
          [style.left.px]="contextMenu()!.x"
          [style.top.px]="contextMenu()!.y"
          (click)="$event.stopPropagation()">
          
          <div class="context-menu-item" (click)="duplicateFromContext()">
            <span class="menu-icon">⎘</span>
            <span>Duplicate Layer{{ selectedLayers().length > 1 ? 's' : '' }}</span>
          </div>
          
          @if (selectedLayers().length > 1) {
            <div class="context-menu-item" (click)="mergeLayers()">
              <span class="menu-icon">▨</span>
              <span>Merge {{ selectedLayers().length }} Layers</span>
            </div>
          }
          
          <div class="context-menu-separator"></div>
          
          <div class="context-menu-item" (click)="toggleVisibilityFromContext()">
            <span class="menu-icon">{{ contextMenuLayer()?.visible ? '👁' : '🚫' }}</span>
            <span>{{ contextMenuLayer()?.visible ? 'Hide' : 'Show' }}</span>
          </div>
          
          <div class="context-menu-item" (click)="toggleLockFromContext()">
            <span class="menu-icon">{{ contextMenuLayer()?.locked ? '🔓' : '🔒' }}</span>
            <span>{{ contextMenuLayer()?.locked ? 'Unlock' : 'Lock' }}</span>
          </div>
          
          <div class="context-menu-separator"></div>
          
          <div class="context-menu-item danger" (click)="deleteFromContext()">
            <span class="menu-icon">✖</span>
            <span>Delete Layer{{ selectedLayers().length > 1 ? 's' : '' }}</span>
          </div>
        </div>
      }
      
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
      background: linear-gradient(145deg, var(--theme-background, #1a2d1a) 0%, var(--theme-background, #0f1f0f) 100%);
      border: 2px solid var(--theme-primary, #00ff00);
      padding: 8px;
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      font-size: 10px;
      box-shadow: inset 0 0 20px var(--theme-glow, rgba(0, 255, 0, 0.1));
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
      color: var(--theme-primary, #00ff00);
      text-shadow: 0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.6));
    }
    
    .header-buttons {
      display: flex;
      gap: 4px;
    }
    
    .btn-small {
      padding: 4px 8px;
      background: linear-gradient(180deg, var(--theme-surface, #2a4d2a) 0%, var(--theme-background, #1a3d1a) 100%);
      border: 1px solid var(--theme-primary, #00ff00);
      color: var(--theme-primary, #00ff00);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      box-shadow: 0 0 5px var(--theme-glow, rgba(0, 255, 0, 0.3));
    }
    
    .btn-small:hover {
      background: linear-gradient(180deg, var(--theme-surface, #3a5d3a) 0%, var(--theme-surface, #2a4d2a) 100%);
      box-shadow: 0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.5));
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
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.2));
      padding: 4px;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--theme-text-muted, rgba(0, 255, 0, 0.4));
    }
    
    .empty-state .hint {
      font-size: 8px;
      margin-top: 8px;
      color: var(--theme-text-muted, rgba(0, 255, 0, 0.3));
    }
    
    .layer-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      margin-bottom: 6px;
      background: var(--theme-surface, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.2));
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    
    .layer-item.dragging {
      opacity: 0.5;
      cursor: grabbing;
    }
    
    .layer-item.drag-over {
      border-top: 3px solid #00ffcc;
      box-shadow: 0 -3px 10px rgba(0, 255, 204, 0.5);
    }
    
    .layer-item:hover {
      background: var(--theme-surface, rgba(255, 255, 255, 0.06));
      border-color: var(--theme-primary, rgba(0, 255, 0, 0.4));
      transform: translateX(2px);
    }
    
    .layer-item.active {
      background: var(--theme-surface, rgba(255, 255, 255, 0.1));
      border-color: var(--theme-primary, #00ff00);
      box-shadow: 0 0 12px var(--theme-glow, rgba(0, 255, 0, 0.25));
    }
    
    /* Multiple selection styling */
    .layer-item.selected {
      background: var(--theme-surface, rgba(255, 255, 255, 0.08));
      border-color: var(--theme-accent, rgba(255, 102, 0, 0.5));
      box-shadow: 0 0 8px rgba(255, 102, 0, 0.2);
    }
    
    /* Active layer in multiple selection */
    .layer-item.active.selected {
      background: var(--theme-surface, rgba(255, 255, 255, 0.12));
      border-color: var(--theme-primary, #00ff00);
      box-shadow: 
        0 0 12px var(--theme-glow, rgba(0, 255, 0, 0.3)),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    
    .layer-name-row {
      width: 100%;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(0, 255, 0, 0.1);
    }
    
    .layer-content-row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    
    .layer-thumbnail {
      width: 40px;
      height: 40px;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
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
    
    .layer-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--theme-secondary, #90ee90);
      font-size: 10px;
      cursor: text;
      padding: 2px;
      user-select: none;
      -webkit-user-select: none;
    }
    
    .layer-item.active .layer-name {
      color: var(--theme-primary, #00ff00);
      text-shadow: 0 0 5px var(--theme-glow, rgba(0, 255, 0, 0.6));
    }
    
    .layer-name-input {
      width: 100%;
      padding: 2px 4px;
      border: 1px solid var(--theme-primary, #00ff00);
      background: rgba(0, 0, 0, 0.8);
      color: var(--theme-primary, #00ff00);
      font-family: inherit;
      font-size: 10px;
      font-weight: bold;
      user-select: text;
      -webkit-user-select: text;
    }
    
    .layer-meta {
      flex: 1;
      font-size: 8px;
      color: var(--theme-text-muted, rgba(0, 255, 0, 0.5));
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    
    .badge {
      background: var(--theme-glow, rgba(0, 255, 0, 0.2));
      color: var(--theme-primary, #00ff00);
      padding: 1px 4px;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.4));
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
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      color: var(--theme-primary, #00ff00);
      cursor: pointer;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .btn-icon:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--theme-primary, #00ff00);
      box-shadow: 0 0 5px var(--theme-glow, rgba(0, 255, 0, 0.4));
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
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.4));
      border-radius: 4px;
    }
    
    .settings-header {
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-size: 10px;
      color: var(--theme-primary, #00ff00);
      font-weight: bold;
      transition: background 0.2s;
    }
    
    .settings-header:hover {
      background: var(--theme-glow, rgba(0, 255, 0, 0.1));
    }
    
    .toggle-icon {
      font-size: 8px;
    }
    
    .settings-content {
      padding: 8px 12px;
      border-top: 1px solid var(--theme-border, rgba(0, 255, 0, 0.2));
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
      color: var(--theme-primary, #00ff00);
    }
    
    .input-row input[type="number"] {
      flex: 1;
      padding: 4px 8px;
      background: #000000;
      border: 1px solid var(--theme-primary, #00ff00);
      color: var(--theme-primary, #00ff00);
      font-family: 'Courier New', monospace;
      font-size: 10px;
    }
    
    .input-row input[type="number"]:focus {
      outline: none;
      box-shadow: 0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.5));
    }
    
    /* Context Menu */
    .context-menu {
      position: fixed;
      background: linear-gradient(145deg, var(--theme-background, #1a2d1a) 0%, var(--theme-background, #0f1f0f) 100%);
      border: 2px solid var(--theme-primary, #00ff00);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 20px var(--theme-glow, rgba(0, 255, 0, 0.3));
      z-index: 10000;
      min-width: 200px;
      padding: 4px;
      font-size: 10px;
    }
    
    .context-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      color: var(--theme-primary, #00ff00);
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    
    .context-menu-item:hover {
      background: var(--theme-glow, rgba(0, 255, 0, 0.2));
      box-shadow: inset 0 0 10px var(--theme-glow, rgba(0, 255, 0, 0.1));
    }
    
    .context-menu-item.danger {
      color: #ff6666;
    }
    
    .context-menu-item.danger:hover {
      background: rgba(255, 102, 102, 0.2);
    }
    
    .menu-icon {
      font-size: 12px;
      width: 16px;
      text-align: center;
    }
    
    .context-menu-separator {
      height: 1px;
      background: var(--theme-border, rgba(0, 255, 0, 0.2));
      margin: 4px 8px;
    }
  `]
})
export class CompositionLayersComponent implements AfterViewInit {
  private compositionService = inject(CompositionService);
  private modalService = inject(ModalService);
  private historyService = inject(HistoryService);
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  // Expose Math for template
  Math = Math;
  
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
  editingLayerId = signal<string | null>(null);
  private clickTimeout: any = null;
  
  // Drag & Drop state
  draggingLayerId = signal<string | null>(null);
  dragOverLayerId = signal<string | null>(null);
  
  // Context menu state
  contextMenu = signal<{ x: number; y: number } | null>(null);
  contextMenuLayer = signal<CompositionLayer | null>(null);
  
  constructor() {
    // Draw thumbnails after view init
    setTimeout(() => this.updateAllThumbnails(), 100);
    
    // Close context menu on click outside
    document.addEventListener('click', () => {
      this.contextMenu.set(null);
      this.contextMenuLayer.set(null);
    });
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
    // Get layers from clipboard (without pasting yet)
    const clipboardLayers = this.compositionService.getClipboardLayers();
    if (clipboardLayers.length === 0) return;
    
    const state = this.compositionState();
    
    // Create new layers data with new IDs and offset
    const newLayers: CompositionLayer[] = clipboardLayers.map((layer, index) => ({
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
    
    // Create and execute command
    const command = new BatchAddLayersCommand(
      this.compositionService,
      newLayers,
      `Paste ${newLayers.length} layer${newLayers.length > 1 ? 's' : ''}`
    );
    this.historyService.execute(command);
  }

  /**
   * Duplicate selected layers
   */
  duplicateSelectedLayers(): void {
    // Get selected layers to duplicate
    const selectedLayers = this.compositionService.getSelectedLayers();
    if (selectedLayers.length === 0) return;
    
    // Create duplicated layers data (without adding them yet)
    const state = this.compositionState();
    const newLayers: CompositionLayer[] = selectedLayers.map(layer => ({
      ...layer,
      id: `layer-${Date.now()}-${Math.random()}`,
      name: `${layer.name} Copy`,
      order: state.layers.length,
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
    const newLayerId = this.compositionService.duplicateLayer(layerId);
    
    // Add to history
    if (newLayerId) {
      const state = this.compositionState();
      const newLayer = state.layers.find(l => l.id === newLayerId);
      if (newLayer) {
        const command = new AddLayerCommand(this.compositionService, newLayer);
        this.historyService.record(command);
      }
    }
    
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
  
  onNameClick(layerId: string, event: MouseEvent): void {
    event.stopPropagation();
    
    // Si ya está seleccionado, activar edición después de un delay
    if (this.activeLayerId() === layerId) {
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
      }
      this.clickTimeout = setTimeout(() => {
        this.startEditing(layerId);
      }, 300);
    }
  }
  
  startEditing(layerId: string): void {
    this.editingLayerId.set(layerId);
  }
  
  finishEditing(): void {
    this.editingLayerId.set(null);
  }
  
  cancelEditing(): void {
    this.editingLayerId.set(null);
  }
  
  /**
   * Context Menu Methods
   */
  
  onContextMenu(event: MouseEvent, layer: CompositionLayer): void {
    event.preventDefault();
    event.stopPropagation();
    
    // If layer is not selected, select it
    if (!this.isLayerSelected(layer.id)) {
      this.selectLayer(layer.id);
    }
    
    this.contextMenu.set({ x: event.clientX, y: event.clientY });
    this.contextMenuLayer.set(layer);
  }
  
  duplicateFromContext(): void {
    const selected = this.selectedLayers();
    if (selected.length > 0) {
      this.duplicateSelectedLayers();
    }
    this.contextMenu.set(null);
  }
  
  toggleVisibilityFromContext(): void {
    const layer = this.contextMenuLayer();
    if (layer) {
      this.toggleVisibility(layer.id);
    }
    this.contextMenu.set(null);
  }
  
  toggleLockFromContext(): void {
    const layer = this.contextMenuLayer();
    if (layer) {
      this.toggleLock(layer.id);
    }
    this.contextMenu.set(null);
  }
  
  deleteFromContext(): void {
    const selected = this.selectedLayers();
    if (selected.length > 0) {
      selected.forEach(layer => this.deleteLayer(layer.id));
    }
    this.contextMenu.set(null);
  }
  
  /**
   * Merge Layers
   */
  mergeLayers(): void {
    const selected = this.selectedLayers();
    if (selected.length < 2) {
      this.contextMenu.set(null);
      return;
    }
    
    // Sort layers by order (bottom to top)
    const sortedLayers = [...selected].sort((a, b) => a.order - b.order);
    
    // Get canvas size from the first layer or use composition canvas size
    const state = this.compositionState();
    const canvasWidth = state.canvasWidth;
    const canvasHeight = state.canvasHeight;
    
    // Create canvas for merged result
    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = canvasWidth;
    mergeCanvas.height = canvasHeight;
    const mergeCtx = mergeCanvas.getContext('2d')!;
    
    // Render each layer onto merge canvas (in order)
    sortedLayers.forEach(layer => {
      if (!layer.visible) return;
      
      mergeCtx.save();
      
      // Apply opacity
      mergeCtx.globalAlpha = layer.opacity / 100;
      
      // Apply transform
      mergeCtx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      mergeCtx.rotate((layer.rotation * Math.PI) / 180);
      mergeCtx.translate(-layer.width / 2, -layer.height / 2);
      
      // Create temp canvas with layer image data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.imageData.width;
      tempCanvas.height = layer.imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(layer.imageData, 0, 0);
      
      // Draw layer
      mergeCtx.drawImage(tempCanvas, 0, 0, layer.width, layer.height);
      
      mergeCtx.restore();
    });
    
    // Get merged image data
    const mergedImageData = mergeCtx.getImageData(0, 0, canvasWidth, canvasHeight);
    
    // Create new image from merged result
    const mergedImg = new Image();
    mergedImg.onload = () => {
      // Add merged layer
      const newLayerId = this.compositionService.addLayer(mergedImg, mergedImageData, { x: 0, y: 0 });
      
      // Update layer name
      this.compositionService.updateLayer(newLayerId, {
        name: `Merged (${selected.length} layers)`,
        width: canvasWidth,
        height: canvasHeight,
        x: 0,
        y: 0,
        rotation: 0
      });
      
      // Delete original layers
      sortedLayers.forEach(layer => {
        this.compositionService.removeLayer(layer.id);
      });
      
      // Update thumbnails
      setTimeout(() => this.updateAllThumbnails(), 100);
    };
    mergedImg.src = mergeCanvas.toDataURL();
    
    this.contextMenu.set(null);
  }
  
  /**
   * Drag & Drop Methods
   */
  
  onDragStart(event: DragEvent, layer: CompositionLayer): void {
    this.draggingLayerId.set(layer.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', layer.id);
    }
  }
  
  onDragEnd(event: DragEvent): void {
    this.draggingLayerId.set(null);
    this.dragOverLayerId.set(null);
  }
  
  onDragOver(event: DragEvent, layer: CompositionLayer): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    const draggingId = this.draggingLayerId();
    if (draggingId && draggingId !== layer.id) {
      this.dragOverLayerId.set(layer.id);
    }
  }
  
  onDragLeave(event: DragEvent): void {
    this.dragOverLayerId.set(null);
  }
  
  onDrop(event: DragEvent, targetLayer: CompositionLayer): void {
    event.preventDefault();
    event.stopPropagation();
    
    const draggingId = this.draggingLayerId();
    if (!draggingId || draggingId === targetLayer.id) {
      this.dragOverLayerId.set(null);
      return;
    }
    
    const layers = this.layers();
    const fromIndex = layers.findIndex(l => l.id === draggingId);
    const toIndex = layers.findIndex(l => l.id === targetLayer.id);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      // Convert to actual array indices (layers are reversed in display)
      const state = this.compositionState();
      const actualFromIndex = state.layers.findIndex(l => l.id === draggingId);
      const actualToIndex = state.layers.findIndex(l => l.id === targetLayer.id);
      
      this.compositionService.reorderLayer(actualFromIndex, actualToIndex);
    }
    
    this.draggingLayerId.set(null);
    this.dragOverLayerId.set(null);
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
