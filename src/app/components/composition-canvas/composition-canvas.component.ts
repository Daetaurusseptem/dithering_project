import { Component, inject, computed, ElementRef, ViewChild, AfterViewInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompositionService } from '../../services/composition.service';
import { DitheringService } from '../../services/dithering.service';
import { CompositionToolService } from '../../services/composition-tool.service';
import { ModalService } from '../../services/modal.service';
import { HistoryService, MoveLayerCommand, TransformLayerCommand, AddLayerCommand } from '../../services/history.service';
import { CompositionLayer } from '../../models/composition-layer.interface';
import { TextEditorComponent } from '../text-editor/text-editor.component';

interface TransformHandle {
  type: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' 
       | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w' | 'rotate';
  x: number;
  y: number;
  size: number;
}

@Component({
  selector: 'app-composition-canvas',
  standalone: true,
  imports: [CommonModule, TextEditorComponent],
  template: `
    <div class="composition-canvas-container">
      <canvas 
        #canvas
        class="composition-canvas"
        [class.pan-mode]="panMode()"
        [style.transform]="'scale(' + canvasZoom() + ') translate(' + panOffset().x + 'px, ' + panOffset().y + 'px)'"
        [style.transform-origin]="'top left'"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp($event)"
        (mouseleave)="onMouseUp($event)"
        (wheel)="onWheel($event)">
      </canvas>
      
      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <button class="zoom-btn" (click)="zoomIn()" title="Zoom In">+</button>
        <span class="zoom-level">{{ Math.round(canvasZoom() * 100) }}%</span>
        <button class="zoom-btn" (click)="zoomOut()" title="Zoom Out">-</button>
        <button class="zoom-btn" (click)="resetZoom()" title="Reset Zoom">1:1</button>
      </div>
      
      @if (activeLayer()) {
        <div class="canvas-overlay">
          <div class="layer-info">
            <strong>{{ activeLayer()!.name }}</strong>
            @if (activeLayer()!.locked) {
              <span class="locked-badge">🔒 Locked</span>
            }
            <div>
              X: {{ Math.round(activeLayer()!.x) }} 
              Y: {{ Math.round(activeLayer()!.y) }}
            </div>
            <div>
              W: {{ Math.round(activeLayer()!.width) }} 
              H: {{ Math.round(activeLayer()!.height) }}
            </div>
            <div>
              Rotation: {{ Math.round(activeLayer()!.rotation) }}°
            </div>
          </div>
        </div>
      }
      
      <!-- Text Editor Overlay -->
      @if (editingTextLayer()) {
        <app-text-editor
          [text]="editingTextLayer()!.textContent || ''"
          [position]="getTextEditorPosition()"
          [fontSize]="editingTextLayer()!.textFontSize || 16"
          [fontFamily]="editingTextLayer()!.textFontFamily || 'Arial'"
          [textColor]="editingTextLayer()!.textColor || '#ffffff'"
          (textChange)="onTextEditorChange($event)"
          (save)="onTextEditorSave($event)"
          (cancel)="onTextEditorCancel()"
        />
      }
    </div>
  `,
  styles: [`
    .composition-canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, #606060 25%, transparent 25%),
                  linear-gradient(-45deg, #606060 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #606060 75%),
                  linear-gradient(-45deg, transparent 75%, #606060 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      background-color: #707070;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      max-height: calc(100vh - 200px);
    }
    
    .composition-canvas {
      border: 2px solid #000000;
      background: #ffffff;
      cursor: default;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      transition: transform 0.1s ease-out;
      max-width: 100%;
      max-height: calc(100vh - 220px);
      object-fit: contain;
    }
    
    .composition-canvas.pan-mode {
      cursor: grab;
    }
    
    .composition-canvas.pan-mode.dragging {
      cursor: grabbing;
    }
    
    .composition-canvas.dragging {
      cursor: move;
    }
    
    .composition-canvas.resizing {
      cursor: nwse-resize;
    }
    
    .composition-canvas.rotating {
      cursor: crosshair;
    }
    
    .canvas-overlay {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.85);
      color: #ffffff;
      padding: 6px 10px;
      font-family: 'MS Sans Serif', sans-serif;
      font-size: 10px;
      pointer-events: none;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      backdrop-filter: blur(4px);
    }
    
    .layer-info strong {
      display: block;
      margin-bottom: 4px;
      color: #00ff00;
    }
    
    .locked-badge {
      display: inline-block;
      margin-left: 6px;
      padding: 2px 6px;
      background: rgba(255, 0, 0, 0.3);
      border: 1px solid #ff0000;
      border-radius: 3px;
      font-size: 8px;
      color: #ff6666;
    }
    
    .layer-info > div {
      margin-top: 2px;
      font-size: 9px;
      opacity: 0.9;
    }
    
    .zoom-controls {
      position: absolute;
      bottom: 12px;
      right: 12px;
      display: flex;
      gap: 6px;
      align-items: center;
      background: rgba(0, 0, 0, 0.85);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #00ff00;
      font-family: 'Press Start 2P', monospace;
    }
    
    .zoom-btn {
      background: linear-gradient(145deg, rgba(0, 80, 0, 0.8), rgba(0, 40, 0, 0.8));
      border: 1px solid #00ff00;
      color: #00ff00;
      width: 32px;
      height: 32px;
      font-size: 16px;
      cursor: pointer;
      border-radius: 4px;
      font-family: 'Press Start 2P', monospace;
      transition: all 0.2s;
    }
    
    .zoom-btn:hover {
      background: linear-gradient(145deg, rgba(0, 120, 0, 0.9), rgba(0, 60, 0, 0.9));
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    }
    
    .zoom-btn:active {
      transform: scale(0.95);
    }
    
    .zoom-level {
      color: #00ff00;
      font-size: 10px;
      min-width: 50px;
      text-align: center;
    }
  `]
})
export class CompositionCanvasComponent implements AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private compositionService = inject(CompositionService);
  private ditheringService = inject(DitheringService);
  private toolService = inject(CompositionToolService);
  private modalService = inject(ModalService);
  private historyService = inject(HistoryService);
  
  // Expose Math for template
  Math = Math;
  
  // Signals
  compositionState = this.compositionService.compositionState;
  activeLayer = computed(() => {
    const state = this.compositionState();
    return state.layers.find(l => l.id === state.activeLayerId) || null;
  });
  canvasZoom = signal(1.0);
  panMode = computed(() => this.toolService.activeTool() === 'hand');
  panOffset = signal({ x: 0, y: 0 });
  
  // Text Editor State
  editingTextLayer = signal<CompositionLayer | null>(null);
  private lastClickTime = 0;
  private lastClickLayerId: string | null = null;
  
  constructor() {
    // Watch for composition state changes and re-render
    effect(() => {
      this.compositionState(); // Subscribe to state changes
      // Don't schedule render here during interaction (will cause double renders)
      // The render will be triggered by scheduleRender() calls in interaction methods
      if (!this.isDragging && !this.isResizing && !this.isRotating && !this.isBrushing && !this.isDrawingShape) {
        this.scheduleRender();
      }
    });
    
    // Watch for dithering options changes and re-render
    effect(() => {
      this.compositionService.ditheringOptions(); // Subscribe to dithering options changes
      if (!this.isDragging && !this.isResizing && !this.isRotating && !this.isBrushing && !this.isDrawingShape) {
        this.scheduleRender();
      }
    });
  }
  
  // Interaction state
  private isDragging = false;
  private isResizing = false;
  private isRotating = false;
  private isPanning = false;
  private isDrawingShape = false;
  private isBrushing = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartLayerX = 0;
  private dragStartLayerY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private panStartOffsetX = 0;
  private panStartOffsetY = 0;
  private resizeHandle: string | null = null;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private rotateStartAngle = 0;
  private shapeStartX = 0;
  private shapeStartY = 0;
  private brushPoints: { x: number; y: number }[] = [];
  
  // Multiple selection drag support
  private multipleLayersDragStart: Map<string, { x: number; y: number }> = new Map();
  
  // Performance: throttle updates using requestAnimationFrame
  private rafId: number | null = null;
  private pendingRender = false;
  
  // Temporary layer state during drag (avoid signal updates)
  private tempLayerTransform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  } | null = null;
  
  ngAfterViewInit(): void {
    this.setupCanvas();
    this.scheduleRender();
  }
  
  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const state = this.compositionState();
    
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
  }
  
  /**
   * RENDERING
   */
  
  // Schedule a render using requestAnimationFrame (throttles to ~60fps max)
  private scheduleRender(): void {
    if (this.pendingRender) return;
    
    this.pendingRender = true;
    this.rafId = requestAnimationFrame(() => {
      this.render();
      this.pendingRender = false;
    });
  }
  
  private render(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = this.compositionState();
    
    // Clear canvas
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sort layers by order
    const sortedLayers = [...state.layers].sort((a, b) => a.order - b.order);
    
    // First pass: render ALL layers (use temp transform if dragging)
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      
      // Use temporary transform if this layer is being dragged
      const renderLayer = (this.tempLayerTransform && layer.id === state.activeLayerId)
        ? { ...layer, ...this.tempLayerTransform }
        : layer;
      
      this.renderLayer(ctx, renderLayer);
    }
    
    // Second pass: apply dithering but preserve exempt layer pixels
    const exemptLayers = sortedLayers.filter(l => l.visible && l.ditherExempt);
    
    if (exemptLayers.length === 0) {
      // No exempt layers, apply dithering to everything
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const ditheringOptions = this.compositionService.ditheringOptions();
        const ditheredData = this.ditheringService.applyDithering(imageData, ditheringOptions);
        ctx.putImageData(ditheredData, 0, 0);
      } catch (error) {
        console.error('Error applying dithering:', error);
      }
    } else {
      // Create mask of exempt pixels
      const exemptCanvas = document.createElement('canvas');
      exemptCanvas.width = canvas.width;
      exemptCanvas.height = canvas.height;
      const exemptCtx = exemptCanvas.getContext('2d')!;
      
      // Render exempt layers to get their pixels
      for (const layer of exemptLayers) {
        this.renderLayer(exemptCtx, layer);
      }
      
      // Apply dithering to main canvas
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const ditheringOptions = this.compositionService.ditheringOptions();
        const ditheredData = this.ditheringService.applyDithering(imageData, ditheringOptions);
        ctx.putImageData(ditheredData, 0, 0);
      } catch (error) {
        console.error('Error applying dithering:', error);
      }
      
      // Composite exempt layers on top
      ctx.drawImage(exemptCanvas, 0, 0);
    }
    
    // Draw selection box
    const activeLayer = this.activeLayer();
    if (activeLayer && activeLayer.visible) {
      this.drawSelectionBox(ctx, activeLayer);
    }
    
    // Draw brush stroke in progress
    if (this.isBrushing && this.brushPoints.length > 1) {
      const options = this.toolService.toolOptions();
      ctx.save();
      ctx.strokeStyle = options.brushColor!;
      ctx.lineWidth = options.brushSize!;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = options.brushOpacity! / 100;
      
      ctx.beginPath();
      ctx.moveTo(this.brushPoints[0].x, this.brushPoints[0].y);
      for (let i = 1; i < this.brushPoints.length; i++) {
        ctx.lineTo(this.brushPoints[i].x, this.brushPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  
  private renderLayer(ctx: CanvasRenderingContext2D, layer: CompositionLayer): void {
    ctx.save();
    
    // Apply transformations
    ctx.globalAlpha = layer.opacity / 100;
    
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
    
    ctx.drawImage(
      tempCanvas,
      layer.x,
      layer.y,
      layer.width,
      layer.height
    );
    
    // Apply tint if enabled
    if (layer.tint) {
      const tintAlpha = (layer.tintIntensity / 100) * (layer.opacity / 100);
      ctx.globalAlpha = tintAlpha;
      ctx.globalCompositeOperation = this.getCompositeOperation(layer.tintBlendMode);
      ctx.fillStyle = layer.tintColor;
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.restore();
  }
  
  private drawSelectionBox(ctx: CanvasRenderingContext2D, layer: CompositionLayer): void {
    // Don't draw selection if layer is locked
    if (layer.locked) {
      // Just draw a red border to indicate locked
      ctx.save();
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
      ctx.restore();
      return;
    }
    
    ctx.save();
    
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
    
    // Draw border
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
    
    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    const handles: TransformHandle[] = [
      // Corner handles (maintain aspect ratio)
      { type: 'resize-nw', x: layer.x, y: layer.y, size: handleSize },
      { type: 'resize-ne', x: layer.x + layer.width, y: layer.y, size: handleSize },
      { type: 'resize-sw', x: layer.x, y: layer.y + layer.height, size: handleSize },
      { type: 'resize-se', x: layer.x + layer.width, y: layer.y + layer.height, size: handleSize },
      // Side handles (free resize)
      { type: 'resize-n', x: layer.x + layer.width / 2, y: layer.y, size: handleSize },
      { type: 'resize-s', x: layer.x + layer.width / 2, y: layer.y + layer.height, size: handleSize },
      { type: 'resize-e', x: layer.x + layer.width, y: layer.y + layer.height / 2, size: handleSize },
      { type: 'resize-w', x: layer.x, y: layer.y + layer.height / 2, size: handleSize }
    ];
    
    for (const handle of handles) {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    }
    
    // Draw rotation handle
    const rotateHandleY = layer.y - 30;
    ctx.beginPath();
    ctx.moveTo(centerX, layer.y);
    ctx.lineTo(centerX, rotateHandleY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, rotateHandleY, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * MOUSE INTERACTION
   */
  
  onMouseDown(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.canvasZoom();
    const y = (event.clientY - rect.top) / this.canvasZoom();
    
    const currentTool = this.toolService.activeTool();
    
    // Pan mode - start panning
    if (currentTool === 'hand') {
      this.startPan(event.clientX, event.clientY);
      canvas.classList.add('dragging');
      return;
    }
    
    // Shape tool - start drawing shape
    if (currentTool === 'shape') {
      this.startDrawingShape(x, y);
      return;
    }
    
    // Text tool - place text
    if (currentTool === 'text') {
      this.placeText(x, y);
      return;
    }
    
    // Brush tool - start drawing
    if (currentTool === 'brush') {
      this.startBrushStroke(x, y);
      return;
    }
    
    // Zoom tool - zoom in/out
    if (currentTool === 'zoom') {
      if (event.altKey) {
        this.zoomOut();
      } else {
        this.zoomIn();
      }
      return;
    }
    
    // Select tool (default) - handle layer selection and transforms
    const activeLayer = this.activeLayer();
    if (!activeLayer) return;
    
    // If layer is locked, don't allow interaction
    if (activeLayer.locked) {
      // Can still select other layers
      const clickedLayer = this.getLayerAtPosition(x, y);
      if (clickedLayer && clickedLayer.id !== activeLayer.id) {
        this.compositionService.setActiveLayer(clickedLayer.id);
      }
      return;
    }
    
    // Check if clicking on handles
    const handle = this.getHandleAtPosition(x, y, activeLayer);
    
    if (handle === 'rotate') {
      this.startRotate(x, y, activeLayer);
    } else if (handle) {
      this.startResize(x, y, activeLayer, handle);
    } else if (this.isPointInLayer(x, y, activeLayer)) {
      // Check for double-click on text layers
      const now = Date.now();
      if (activeLayer.type === 'text' && 
          this.lastClickLayerId === activeLayer.id && 
          now - this.lastClickTime < 300) {
        // Double-click detected - open text editor
        this.openTextEditor(activeLayer);
        this.lastClickTime = 0;
        this.lastClickLayerId = null;
        return;
      }
      this.lastClickTime = now;
      this.lastClickLayerId = activeLayer.id;
      this.startDrag(x, y, activeLayer);
    } else {
      // Check if clicking on another layer
      const clickedLayer = this.getLayerAtPosition(x, y);
      if (clickedLayer) {
        // Check if Shift is pressed for multi-select
        if (event.shiftKey) {
          this.compositionService.toggleLayerSelection(clickedLayer.id);
        } else {
          this.compositionService.selectLayer(clickedLayer.id, false);
        }
        
        // Check for double-click on newly selected text layer
        const now = Date.now();
        if (clickedLayer.type === 'text' && 
            this.lastClickLayerId === clickedLayer.id && 
            now - this.lastClickTime < 300) {
          this.openTextEditor(clickedLayer);
          this.lastClickTime = 0;
          this.lastClickLayerId = null;
          return;
        }
        this.lastClickTime = now;
        this.lastClickLayerId = clickedLayer.id;
      } else {
        // Click on empty canvas - clear selection
        if (!event.shiftKey) {
          this.compositionService.clearSelection();
        }
      }
    }
  }
  
  onMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Pan mode
    if (this.isPanning) {
      this.updatePan(event.clientX, event.clientY);
      return;
    }
    
    // Shape drawing
    if (this.isDrawingShape) {
      // Visual feedback (could draw preview here)
      return;
    }
    
    // Brush drawing
    if (this.isBrushing) {
      const adjustedX = x / this.canvasZoom();
      const adjustedY = y / this.canvasZoom();
      this.brushPoints.push({ x: adjustedX, y: adjustedY });
      this.scheduleRender(); // Use throttled render instead of direct render()
      return;
    }
    
    const activeLayer = this.activeLayer();
    if (!activeLayer) return;
    
    // If layer is locked, no interaction
    if (activeLayer.locked) return;
    
    // Adjust for zoom
    const adjustedX = x / this.canvasZoom();
    const adjustedY = y / this.canvasZoom();
    
    if (this.isDragging) {
      this.updateDrag(adjustedX, adjustedY, activeLayer);
    } else if (this.isResizing) {
      this.updateResize(adjustedX, adjustedY, activeLayer);
    } else if (this.isRotating) {
      this.updateRotate(adjustedX, adjustedY, activeLayer);
    } else {
      // Update cursor based on hover
      this.updateCursor(adjustedX, adjustedY, activeLayer);
    }
  }
  
  onMouseUp(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.canvasZoom();
    const y = (event.clientY - rect.top) / this.canvasZoom();
    
    const activeLayer = this.activeLayer();
    
    // Finish shape drawing
    if (this.isDrawingShape) {
      this.finishDrawingShape(x, y);
    }
    
    // Finish brush stroke
    if (this.isBrushing) {
      this.finishBrushStroke();
    }
    
    // Save undo command for drag (only if not resizing/rotating)
    if (this.isDragging && !this.isResizing && !this.isRotating && activeLayer && this.tempLayerTransform) {
      const state = this.compositionState();
      const selectedLayers = state.layers.filter(l => state.selectedLayerIds.includes(l.id));
      
      if (selectedLayers.length > 1) {
        // Multiple layers drag
        const dx = this.tempLayerTransform.x - this.dragStartLayerX;
        const dy = this.tempLayerTransform.y - this.dragStartLayerY;
        
        // Update all selected layers
        const updates = selectedLayers.map(layer => {
          const startPos = this.multipleLayersDragStart.get(layer.id);
          if (!startPos) return null;
          
          return {
            layerId: layer.id,
            changes: {
              x: startPos.x + dx,
              y: startPos.y + dy
            }
          };
        }).filter(u => u !== null) as { layerId: string; changes: Partial<CompositionLayer> }[];
        
        this.compositionService.updateMultipleLayers(updates);
        
        // Record undo command for multiple layers
        // TODO: Create MultiMoveLayerCommand for undo/redo
        
      } else {
        // Single layer drag
        const oldPos = { x: this.dragStartLayerX, y: this.dragStartLayerY };
        const newPos = { x: this.tempLayerTransform.x, y: this.tempLayerTransform.y };
        
        // Apply the temp transform to the actual layer state
        this.compositionService.updateLayer(activeLayer.id, {
          x: newPos.x,
          y: newPos.y
        });
        
        // Only save if position actually changed
        if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
          const command = new MoveLayerCommand(
            this.compositionService,
            activeLayer.id,
            oldPos,
            newPos
          );
          this.historyService.record(command);
        }
      }
      
      // Clear multiple drag start positions
      this.multipleLayersDragStart.clear();
    }
    
    // Save undo command for resize/rotate
    if ((this.isResizing || this.isRotating) && activeLayer && this.tempLayerTransform) {
      const oldTransform = {
        x: this.dragStartLayerX,
        y: this.dragStartLayerY,
        width: this.resizeStartWidth,
        height: this.resizeStartHeight,
        rotation: this.rotateStartAngle
      };
      
      const newTransform = {
        x: this.tempLayerTransform.x,
        y: this.tempLayerTransform.y,
        width: this.tempLayerTransform.width,
        height: this.tempLayerTransform.height,
        rotation: this.tempLayerTransform.rotation
      };
      
      // Apply the temp transform to the actual layer state
      this.compositionService.updateLayer(activeLayer.id, {
        x: newTransform.x,
        y: newTransform.y,
        width: newTransform.width,
        height: newTransform.height,
        rotation: newTransform.rotation
      });
      
      // Only save if transform actually changed
      const hasChanged = 
        oldTransform.x !== newTransform.x ||
        oldTransform.y !== newTransform.y ||
        oldTransform.width !== newTransform.width ||
        oldTransform.height !== newTransform.height ||
        oldTransform.rotation !== newTransform.rotation;
        
      if (hasChanged) {
        const command = new TransformLayerCommand(
          this.compositionService,
          activeLayer.id,
          oldTransform,
          newTransform
        );
        this.historyService.record(command);
      }
    }
    
    // Clear temporary transform and reset interaction state
    this.tempLayerTransform = null;
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.isPanning = false;
    this.isDrawingShape = false;
    this.isBrushing = false;
    this.resizeHandle = null;
    
    canvas.classList.remove('dragging', 'resizing', 'rotating');
  }
  
  /**
   * PAN (Hand Tool)
   */
  
  private startPan(clientX: number, clientY: number): void {
    this.isPanning = true;
    this.panStartX = clientX;
    this.panStartY = clientY;
    const currentOffset = this.panOffset();
    this.panStartOffsetX = currentOffset.x;
    this.panStartOffsetY = currentOffset.y;
  }
  
  private updatePan(clientX: number, clientY: number): void {
    const dx = (clientX - this.panStartX) / this.canvasZoom();
    const dy = (clientY - this.panStartY) / this.canvasZoom();
    
    this.panOffset.set({
      x: this.panStartOffsetX + dx,
      y: this.panStartOffsetY + dy
    });
  }
  
  /**
   * PAN (Hand Tool)
   */
  
  /**
   * DRAG (Layer Movement)
   */
  
  private startDrag(x: number, y: number, layer: CompositionLayer): void {
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartLayerX = layer.x;
    this.dragStartLayerY = layer.y;
    this.resizeStartWidth = layer.width;
    this.resizeStartHeight = layer.height;
    this.rotateStartAngle = layer.rotation;
    
    // Initialize temp transform with current layer state
    this.tempLayerTransform = {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation
    };
    
    // Store initial positions of all selected layers for multi-drag
    const state = this.compositionState();
    const selectedLayers = state.layers.filter(l => state.selectedLayerIds.includes(l.id));
    this.multipleLayersDragStart.clear();
    
    for (const selectedLayer of selectedLayers) {
      this.multipleLayersDragStart.set(selectedLayer.id, {
        x: selectedLayer.x,
        y: selectedLayer.y
      });
    }
    
    const canvas = this.canvasRef.nativeElement;
    canvas.classList.add('dragging');
  }
  
  private updateDrag(x: number, y: number, layer: CompositionLayer): void {
    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;
    
    // Update temporary transform (avoid signal update during drag)
    this.tempLayerTransform = {
      x: this.dragStartLayerX + dx,
      y: this.dragStartLayerY + dy,
      width: this.resizeStartWidth,
      height: this.resizeStartHeight,
      rotation: this.rotateStartAngle
    };
    
    // Schedule render (throttled by RAF)
    this.scheduleRender();
  }
  
  /**
   * RESIZE
   */
  
  private startResize(x: number, y: number, layer: CompositionLayer, handle: string): void {
    this.isResizing = true;
    this.resizeHandle = handle;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartLayerX = layer.x;
    this.dragStartLayerY = layer.y;
    this.resizeStartWidth = layer.width;
    this.resizeStartHeight = layer.height;
    
    // Initialize temp transform with current layer state
    this.tempLayerTransform = {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation
    };
    
    const canvas = this.canvasRef.nativeElement;
    canvas.classList.add('resizing');
  }
  
  private updateResize(x: number, y: number, layer: CompositionLayer): void {
    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;
    
    // Start with initial values, not current layer values
    let newX = this.dragStartLayerX;
    let newY = this.dragStartLayerY;
    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;
    
    const aspectRatio = this.resizeStartWidth / this.resizeStartHeight;
    
    switch (this.resizeHandle) {
      // Corner handles - maintain aspect ratio
      case 'resize-se':
        newWidth = Math.max(20, this.resizeStartWidth + dx);
        newHeight = Math.max(20, this.resizeStartHeight + dy);
        // Maintain aspect ratio
        if (newWidth / newHeight > aspectRatio) {
          newWidth = newHeight * aspectRatio;
        } else {
          newHeight = newWidth / aspectRatio;
        }
        break;
      case 'resize-sw':
        newX = this.dragStartLayerX + dx;
        newWidth = Math.max(20, this.resizeStartWidth - dx);
        newHeight = Math.max(20, this.resizeStartHeight + dy);
        // Maintain aspect ratio
        if (newWidth / newHeight > aspectRatio) {
          newWidth = newHeight * aspectRatio;
          newX = this.dragStartLayerX + (this.resizeStartWidth - newWidth);
        } else {
          newHeight = newWidth / aspectRatio;
        }
        break;
      case 'resize-ne':
        newY = this.dragStartLayerY + dy;
        newWidth = Math.max(20, this.resizeStartWidth + dx);
        newHeight = Math.max(20, this.resizeStartHeight - dy);
        // Maintain aspect ratio
        if (newWidth / newHeight > aspectRatio) {
          newWidth = newHeight * aspectRatio;
        } else {
          newHeight = newWidth / aspectRatio;
          newY = this.dragStartLayerY + (this.resizeStartHeight - newHeight);
        }
        break;
      case 'resize-nw':
        newX = this.dragStartLayerX + dx;
        newY = this.dragStartLayerY + dy;
        newWidth = Math.max(20, this.resizeStartWidth - dx);
        newHeight = Math.max(20, this.resizeStartHeight - dy);
        // Maintain aspect ratio
        if (newWidth / newHeight > aspectRatio) {
          newWidth = newHeight * aspectRatio;
          newX = this.dragStartLayerX + (this.resizeStartWidth - newWidth);
        } else {
          newHeight = newWidth / aspectRatio;
          newY = this.dragStartLayerY + (this.resizeStartHeight - newHeight);
        }
        break;
      
      // Side handles - free resize (no aspect ratio)
      case 'resize-n':
        newY = this.dragStartLayerY + dy;
        newHeight = Math.max(20, this.resizeStartHeight - dy);
        break;
      case 'resize-s':
        newHeight = Math.max(20, this.resizeStartHeight + dy);
        break;
      case 'resize-e':
        newWidth = Math.max(20, this.resizeStartWidth + dx);
        break;
      case 'resize-w':
        newX = this.dragStartLayerX + dx;
        newWidth = Math.max(20, this.resizeStartWidth - dx);
        break;
    }
    
    // Update temporary transform (avoid signal update during resize)
    this.tempLayerTransform = {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: layer.rotation
    };
    
    // Schedule render (throttled by RAF)
    this.scheduleRender();
  }
  
  /**
   * SHAPE TOOL
   */
  
  private startDrawingShape(x: number, y: number): void {
    this.isDrawingShape = true;
    this.shapeStartX = x;
    this.shapeStartY = y;
  }
  
  private finishDrawingShape(x: number, y: number): void {
    const options = this.toolService.toolOptions();
    const width = Math.abs(x - this.shapeStartX);
    const height = Math.abs(y - this.shapeStartY);
    
    if (width < 10 || height < 10) return; // Too small
    
    const left = Math.min(x, this.shapeStartX);
    const top = Math.min(y, this.shapeStartY);
    
    // Create a canvas to draw the shape
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Draw the shape
    tempCtx.fillStyle = options.shapeFilled ? options.shapeFillColor! : 'transparent';
    tempCtx.strokeStyle = options.shapeStrokeColor!;
    tempCtx.lineWidth = options.shapeStrokeWidth!;
    
    switch (options.shapeType) {
      case 'rectangle':
        if (options.shapeFilled) {
          tempCtx.fillRect(0, 0, width, height);
        }
        if (options.shapeStrokeWidth! > 0) {
          tempCtx.strokeRect(0, 0, width, height);
        }
        break;
        
      case 'circle':
      case 'ellipse':
        tempCtx.beginPath();
        tempCtx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        if (options.shapeFilled) {
          tempCtx.fill();
        }
        if (options.shapeStrokeWidth! > 0) {
          tempCtx.stroke();
        }
        break;
        
      case 'line':
        tempCtx.beginPath();
        tempCtx.moveTo(0, 0);
        tempCtx.lineTo(width, height);
        tempCtx.stroke();
        break;
    }
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, width, height);
    
    // Create shape layer
    const img = new Image();
    img.src = tempCanvas.toDataURL();
    img.onload = () => {
      const layerId = this.compositionService.addLayer(img, imageData);
      
      // Get the created layer
      const state = this.compositionService.compositionState();
      const createdLayer = state.layers.find(l => l.id === layerId);
      
      this.compositionService.updateLayer(layerId, {
        type: 'shape',
        name: `Shape: ${options.shapeType}`,
        x: left,
        y: top,
        shapeType: options.shapeType,
        shapeFillColor: options.shapeFillColor,
        shapeStrokeColor: options.shapeStrokeColor,
        shapeStrokeWidth: options.shapeStrokeWidth,
        shapeFilled: options.shapeFilled,
        ditherExempt: false // Apply dithering by default
      });
      
      // Add to history after layer is fully configured
      if (createdLayer) {
        const updatedState = this.compositionService.compositionState();
        const finalLayer = updatedState.layers.find(l => l.id === layerId);
        if (finalLayer) {
          const command = new AddLayerCommand(this.compositionService, finalLayer);
          this.historyService.record(command);
        }
      }
      
      // Auto-switch back to select tool
      this.toolService.setTool('select');
    };
  }
  
  /**
   * TEXT TOOL
   */
  
  private placeText(x: number, y: number): void {
    const options = this.toolService.toolOptions();
    
    this.modalService.prompt('Enter text:', 'New Text Layer', '').then((text) => {
      if (!text) return;
      
      // Create a temporary canvas to render the text
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Configure font
      const fontStyle = `${options.textBold ? 'bold ' : ''}${options.textItalic ? 'italic ' : ''}${options.textFontSize}px ${options.textFontFamily}`;
      tempCtx.font = fontStyle;
    
    // Measure text
    const metrics = tempCtx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const strokePadding = options.textStrokeEnabled ? (options.textStrokeWidth! * 2) : 0;
    const textHeight = Math.ceil(options.textFontSize! * 1.2); // Add some padding
    
    // Set canvas size (with extra padding for stroke)
    tempCanvas.width = textWidth + 20 + strokePadding;
    tempCanvas.height = textHeight + 20 + strokePadding;
    
    // Re-apply font after resize
    tempCtx.font = fontStyle;
    tempCtx.textAlign = options.textAlign!;
    tempCtx.textBaseline = 'middle';
    
    // Draw text with stroke if enabled
    const textX = options.textAlign === 'center' ? tempCanvas.width / 2 : 
                  options.textAlign === 'right' ? tempCanvas.width - 10 - strokePadding / 2 : 10 + strokePadding / 2;
    const textY = tempCanvas.height / 2;
    
    // Draw stroke first (outline)
    if (options.textStrokeEnabled && options.textStrokeWidth! > 0) {
      tempCtx.strokeStyle = options.textStrokeColor!;
      tempCtx.lineWidth = options.textStrokeWidth!;
      tempCtx.lineJoin = 'round';
      tempCtx.miterLimit = 2;
      tempCtx.strokeText(text, textX, textY);
    }
    
    // Draw fill text on top
    tempCtx.fillStyle = options.textColor!;
    tempCtx.fillText(text, textX, textY);
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Create text layer
    const img = new Image();
    img.src = tempCanvas.toDataURL();
    img.onload = () => {
      const layerId = this.compositionService.addLayer(img, imageData);
      this.compositionService.updateLayer(layerId, {
        type: 'text',
        name: `Text: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
        x: x - tempCanvas.width / 2,
        y: y - tempCanvas.height / 2,
        textContent: text,
        textFontFamily: options.textFontFamily,
        textFontSize: options.textFontSize,
        textColor: options.textColor,
        textBold: options.textBold,
        textItalic: options.textItalic,
        textAlign: options.textAlign,
        textStrokeEnabled: options.textStrokeEnabled,
        textStrokeColor: options.textStrokeColor,
        textStrokeWidth: options.textStrokeWidth,
        ditherExempt: false // Apply dithering by default
      });
      
      // Add to history
      const state = this.compositionService.compositionState();
      const createdLayer = state.layers.find(l => l.id === layerId);
      if (createdLayer) {
        const command = new AddLayerCommand(this.compositionService, createdLayer);
        this.historyService.record(command);
      }
      
      // Auto-switch back to select tool
      this.toolService.setTool('select');
    };
    }); // Close .then()
  }
  
  /**
   * BRUSH TOOL
   */
  
  private startBrushStroke(x: number, y: number): void {
    this.isBrushing = true;
    this.brushPoints = [{ x, y }];
  }
  
  private finishBrushStroke(): void {
    if (this.brushPoints.length < 2) return;
    
    const options = this.toolService.toolOptions();
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of this.brushPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    const padding = options.brushSize! / 2 + 2;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Create canvas for brush stroke
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.ceil(width);
    tempCanvas.height = Math.ceil(height);
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Draw brush stroke
    tempCtx.strokeStyle = options.brushColor!;
    tempCtx.lineWidth = options.brushSize!;
    tempCtx.lineCap = 'round';
    tempCtx.lineJoin = 'round';
    tempCtx.globalAlpha = options.brushOpacity! / 100;
    
    tempCtx.beginPath();
    tempCtx.moveTo(this.brushPoints[0].x - minX, this.brushPoints[0].y - minY);
    for (let i = 1; i < this.brushPoints.length; i++) {
      tempCtx.lineTo(this.brushPoints[i].x - minX, this.brushPoints[i].y - minY);
    }
    tempCtx.stroke();
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Create brush stroke layer
    const img = new Image();
    img.src = tempCanvas.toDataURL();
    img.onload = () => {
      const layerId = this.compositionService.addLayer(img, imageData);
      this.compositionService.updateLayer(layerId, {
        type: 'brush',
        name: 'Brush Stroke',
        x: minX,
        y: minY,
        ditherExempt: false // Apply dithering by default
      });
      
      // Add to history
      const state = this.compositionService.compositionState();
      const createdLayer = state.layers.find(l => l.id === layerId);
      if (createdLayer) {
        const command = new AddLayerCommand(this.compositionService, createdLayer);
        this.historyService.record(command);
      }
      
      // Auto-switch back to select tool
      this.toolService.setTool('select');
    };
    
    this.brushPoints = [];
  }
  
  /**
   * ROTATE
   */
  
  private startRotate(x: number, y: number, layer: CompositionLayer): void {
    this.isRotating = true;
    this.rotateStartAngle = layer.rotation;
    this.dragStartLayerX = layer.x;
    this.dragStartLayerY = layer.y;
    this.resizeStartWidth = layer.width;
    this.resizeStartHeight = layer.height;
    
    // Initialize temp transform with current layer state
    this.tempLayerTransform = {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation
    };
    
    const canvas = this.canvasRef.nativeElement;
    canvas.classList.add('rotating');
  }
  
  private updateRotate(x: number, y: number, layer: CompositionLayer): void {
    // Use initial values for center calculation
    const centerX = this.dragStartLayerX + this.resizeStartWidth / 2;
    const centerY = this.dragStartLayerY + this.resizeStartHeight / 2;
    
    const angle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
    const newRotation = angle + 90; // Adjust for initial orientation
    
    // Update temporary transform (avoid signal update during rotate)
    this.tempLayerTransform = {
      x: this.dragStartLayerX,
      y: this.dragStartLayerY,
      width: this.resizeStartWidth,
      height: this.resizeStartHeight,
      rotation: newRotation
    };
    
    // Schedule render (throttled by RAF)
    this.scheduleRender();
  }
  
  /**
   * UTILITIES
   */
  
  private getHandleAtPosition(x: number, y: number, layer: CompositionLayer): string | null {
    const handleSize = 8;
    const tolerance = handleSize / 2 + 2;
    
    // Check rotation handle
    const centerX = layer.x + layer.width / 2;
    const rotateY = layer.y - 30;
    if (Math.hypot(x - centerX, y - rotateY) <= tolerance) {
      return 'rotate';
    }
    
    // Check resize handles (corners + sides)
    const handles = [
      // Corners
      { type: 'resize-nw', x: layer.x, y: layer.y },
      { type: 'resize-ne', x: layer.x + layer.width, y: layer.y },
      { type: 'resize-sw', x: layer.x, y: layer.y + layer.height },
      { type: 'resize-se', x: layer.x + layer.width, y: layer.y + layer.height },
      // Sides
      { type: 'resize-n', x: layer.x + layer.width / 2, y: layer.y },
      { type: 'resize-s', x: layer.x + layer.width / 2, y: layer.y + layer.height },
      { type: 'resize-e', x: layer.x + layer.width, y: layer.y + layer.height / 2 },
      { type: 'resize-w', x: layer.x, y: layer.y + layer.height / 2 }
    ];
    
    for (const handle of handles) {
      if (Math.hypot(x - handle.x, y - handle.y) <= tolerance) {
        return handle.type;
      }
    }
    
    return null;
  }
  
  private isPointInLayer(x: number, y: number, layer: CompositionLayer): boolean {
    return x >= layer.x && 
           x <= layer.x + layer.width &&
           y >= layer.y && 
           y <= layer.y + layer.height;
  }
  
  private getLayerAtPosition(x: number, y: number): CompositionLayer | null {
    const state = this.compositionState();
    const sortedLayers = [...state.layers]
      .filter(l => l.visible)
      .sort((a, b) => b.order - a.order);
    
    for (const layer of sortedLayers) {
      if (this.isPointInLayer(x, y, layer)) {
        return layer;
      }
    }
    
    return null;
  }
  
  private updateCursor(x: number, y: number, layer: CompositionLayer): void {
    const canvas = this.canvasRef.nativeElement;
    const handle = this.getHandleAtPosition(x, y, layer);
    
    if (handle === 'rotate') {
      canvas.style.cursor = 'crosshair';
    } else if (handle === 'resize-nw' || handle === 'resize-se') {
      canvas.style.cursor = 'nwse-resize';
    } else if (handle === 'resize-ne' || handle === 'resize-sw') {
      canvas.style.cursor = 'nesw-resize';
    } else if (handle === 'resize-n' || handle === 'resize-s') {
      canvas.style.cursor = 'ns-resize';
    } else if (handle === 'resize-e' || handle === 'resize-w') {
      canvas.style.cursor = 'ew-resize';
    } else if (this.isPointInLayer(x, y, layer)) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'default';
    }
  }
  
  /**
   * ZOOM CONTROLS
   */
  
  zoomIn(): void {
    const newZoom = Math.min(this.canvasZoom() + 0.1, 3.0);
    this.canvasZoom.set(newZoom);
  }
  
  zoomOut(): void {
    const newZoom = Math.max(this.canvasZoom() - 0.1, 0.1);
    this.canvasZoom.set(newZoom);
  }
  
  resetZoom(): void {
    this.canvasZoom.set(1.0);
  }
  
  /**
   * TINT HELPERS
   */
  
  private getCompositeOperation(blendMode: string): GlobalCompositeOperation {
    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'color': 'color',
      'luminosity': 'luminosity',
      'darken': 'darken',
      'lighten': 'lighten'
    };
    return blendModeMap[blendMode] || 'source-over';
  }
  
  /**
   * TEXT EDITOR
   */
  
  openTextEditor(layer: CompositionLayer): void {
    if (layer.type !== 'text') return;
    this.editingTextLayer.set(layer);
  }
  
  getTextEditorPosition(): { x: number; y: number; width: number; height: number } {
    const layer = this.editingTextLayer();
    if (!layer) return { x: 0, y: 0, width: 0, height: 0 };
    
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const zoom = this.canvasZoom();
    
    return {
      x: rect.left + layer.x * zoom,
      y: rect.top + layer.y * zoom,
      width: layer.width * zoom,
      height: layer.height * zoom
    };
  }
  
  onTextEditorChange(newText: string): void {
    const layer = this.editingTextLayer();
    if (layer) {
      layer.textContent = newText;
      this.render();
    }
  }
  
  onTextEditorSave(newText: string): void {
    const layer = this.editingTextLayer();
    if (layer) {
      layer.textContent = newText;
      this.compositionService.updateLayer(layer.id, { textContent: newText });
      this.editingTextLayer.set(null);
    }
  }
  
  onTextEditorCancel(): void {
    this.editingTextLayer.set(null);
  }
  
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.1, Math.min(3.0, this.canvasZoom() + delta));
    this.canvasZoom.set(newZoom);
  }
}
