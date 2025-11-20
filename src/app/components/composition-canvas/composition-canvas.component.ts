import { Component, inject, computed, ElementRef, ViewChild, AfterViewInit, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompositionService } from '../../services/composition.service';
import { DitheringService } from '../../services/dithering.service';
import { CompositionToolService } from '../../services/composition-tool.service';
import { ModalService } from '../../services/modal.service';
import { HistoryService, MoveLayerCommand, TransformLayerCommand, AddLayerCommand, BatchUpdateLayersCommand } from '../../services/history.service';
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

  // Current transform being applied (not committed to state until mouseup)
  private currentTransform: {
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

    // Update canvas dimensions if they changed
    if (canvas.width !== state.canvasWidth || canvas.height !== state.canvasHeight) {
      canvas.width = state.canvasWidth;
      canvas.height = state.canvasHeight;
    }

    // Clear canvas
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sort layers by order
    const sortedLayers = [...state.layers].sort((a, b) => a.order - b.order);

    // Check if we need to apply global dithering
    const needsGlobalDither = sortedLayers.some(l =>
      l.visible && !l.customDither?.enabled && !l.ditherExempt
    );

    if (needsGlobalDither) {
      // Strategy: Apply dithering to base image, then render with effects
      const ditheringOptions = this.compositionService.ditheringOptions();

      for (const layer of sortedLayers) {
        if (!layer.visible) continue;

        let renderLayer = layer;
        if (this.currentTransform && layer.id === state.activeLayerId) {
          renderLayer = { ...layer, ...this.currentTransform };
        } else if (this.isResizing && this.multiResizeTempBounds.has(layer.id)) {
          // Use temp bounds during multi-resize
          const tempBounds = this.multiResizeTempBounds.get(layer.id)!;
          renderLayer = { ...layer, ...tempBounds };
        } else if (this.isDragging && this.multipleLayersDragStart.has(layer.id)) {
          const startPos = this.multipleLayersDragStart.get(layer.id)!;
          const dx = this.currentTransform!.x - this.dragStartLayerX;
          const dy = this.currentTransform!.y - this.dragStartLayerY;
          renderLayer = { ...layer, x: startPos.x + dx, y: startPos.y + dy };
        }

        // Check if this layer needs global dithering
        const needsDither = !layer.customDither?.enabled && !layer.ditherExempt;

        if (needsDither) {
          try {
            // Apply dithering to the base image data
            const ditheredImageData = this.ditheringService.applyDithering(
              layer.imageData,
              ditheringOptions
            );
            // Render with dithered image and all effects
            this.renderLayer(ctx, renderLayer, ditheredImageData);
          } catch (error) {
            console.error('Error applying dithering to layer:', error);
            this.renderLayer(ctx, renderLayer);
          }
        } else {
          // Layer has custom dither or exempt, render normally
          this.renderLayer(ctx, renderLayer);
        }
      }
    } else {
      // No global dithering needed, render normally with all effects
      for (const layer of sortedLayers) {
        if (!layer.visible) continue;

        let renderLayer = layer;
        if (this.currentTransform && layer.id === state.activeLayerId) {
          renderLayer = { ...layer, ...this.currentTransform };
        } else if (this.isResizing && this.multiResizeTempBounds.has(layer.id)) {
          // Use temp bounds during multi-resize
          const tempBounds = this.multiResizeTempBounds.get(layer.id)!;
          renderLayer = { ...layer, ...tempBounds };
        } else if (this.isDragging && this.multipleLayersDragStart.has(layer.id)) {
          const startPos = this.multipleLayersDragStart.get(layer.id)!;
          const dx = this.currentTransform!.x - this.dragStartLayerX;
          const dy = this.currentTransform!.y - this.dragStartLayerY;
          renderLayer = { ...layer, x: startPos.x + dx, y: startPos.y + dy };
        }
        this.renderLayer(ctx, renderLayer);
      }
    }

    // Draw selection box
    const selectedLayerIds = state.selectedLayerIds;
    
    if (selectedLayerIds.length > 1) {
      // Multiple selection - draw bounding box that encompasses all selected layers
      const selectedLayers = state.layers.filter(l => selectedLayerIds.includes(l.id) && l.visible);
      if (selectedLayers.length > 1) {
        this.drawMultiSelectionBox(ctx, selectedLayers);
      }
    } else if (selectedLayerIds.length === 1) {
      // Single selection - draw normal selection box
      const activeLayer = this.activeLayer();
      if (activeLayer && activeLayer.visible) {
        const displayLayer = this.currentTransform
          ? { ...activeLayer, ...this.currentTransform }
          : activeLayer;
        this.drawSelectionBox(ctx, displayLayer);
      }
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

  private renderLayer(ctx: CanvasRenderingContext2D, layer: CompositionLayer, ditheredImageData?: ImageData): void {
    ctx.save();

    // Apply transformations
    ctx.globalAlpha = layer.opacity / 100;

    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // Use provided dithered image data, or use original with custom dither if enabled
    let imageData = ditheredImageData || layer.imageData;

    // Apply custom dither if enabled and no dithered data provided
    if (!ditheredImageData && layer.customDither?.enabled && !layer.ditherExempt) {
      const globalOptions = this.compositionService.ditheringOptions();
      const customOptions = {
        algorithm: layer.customDither.algorithm,
        palette: layer.customDither.palette || globalOptions.palette,
        scale: layer.customDither.scale ?? 1,
        contrast: layer.customDither.contrast ?? 50,
        midtones: layer.customDither.midtones ?? 50,
        highlights: layer.customDither.highlights ?? 50,
        blur: layer.customDither.blur ?? 0,
        threshold: layer.customDither.threshold || 128
      };
      imageData = this.ditheringService.applyDithering(imageData, customOptions);
    }

    // Create temp canvas with layer content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    // Apply stroke effect if enabled
    if (layer.effects?.stroke?.enabled) {
      const stroke = layer.effects.stroke;
      const strokeCanvas = document.createElement('canvas');
      strokeCanvas.width = tempCanvas.width;
      strokeCanvas.height = tempCanvas.height;
      const strokeCtx = strokeCanvas.getContext('2d')!;

      // Draw the image multiple times offset to create stroke effect on silhouette
      const iterations = Math.ceil(stroke.width);
      strokeCtx.strokeStyle = stroke.color;
      strokeCtx.lineWidth = stroke.width;
      strokeCtx.lineJoin = 'round';
      strokeCtx.lineCap = 'round';

      // Create outline by drawing the image multiple times in a circle pattern
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
        const offsetX = Math.cos(angle) * stroke.width;
        const offsetY = Math.sin(angle) * stroke.width;
        strokeCtx.drawImage(tempCanvas, offsetX, offsetY);
      }

      // Draw original image on top
      strokeCtx.globalCompositeOperation = 'source-atop';
      strokeCtx.fillStyle = stroke.color;
      strokeCtx.fillRect(0, 0, strokeCanvas.width, strokeCanvas.height);

      // Now composite the original image
      strokeCtx.globalCompositeOperation = 'destination-over';
      strokeCtx.drawImage(tempCanvas, 0, 0);

      // Replace temp canvas with stroked version
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(strokeCanvas, 0, 0);
    }

    // Apply Drop Shadow effect
    if (layer.effects?.dropShadow?.enabled) {
      const shadow = layer.effects.dropShadow;
      // Convert angle and distance to offsetX/offsetY
      const angleRad = (shadow.angle * Math.PI) / 180;
      const offsetX = Math.cos(angleRad) * shadow.distance;
      const offsetY = Math.sin(angleRad) * shadow.distance;

      // Apply shadow color with opacity
      const shadowOpacity = (shadow.opacity / 100);
      const shadowColor = this.hexToRgba(shadow.color, shadowOpacity);

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadow.size;
      ctx.shadowOffsetX = offsetX;
      ctx.shadowOffsetY = offsetY;
    }

    // Outer Glow effect
    if (layer.effects?.outerGlow?.enabled) {
      const glow = layer.effects.outerGlow;
      const glowOpacity = (glow.opacity / 100);
      const glowColor = this.hexToRgba(glow.color, glowOpacity);

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glow.size;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw layer image with effects applied
    ctx.drawImage(
      tempCanvas,
      layer.x,
      layer.y,
      layer.width,
      layer.height
    );

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

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

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * PUBLIC: Export composition with all layer effects included
   * Used for GIF generation in composition mode
   * Uses same rendering logic as preview for consistency
   */
  public getCompositionImageDataWithEffects(): ImageData | null {
    const canvas = this.canvasRef.nativeElement;
    const state = this.compositionState();

    if (state.layers.length === 0) {
      return null;
    }

    // Create temporary canvas for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = state.canvasWidth;
    exportCanvas.height = state.canvasHeight;
    const ctx = exportCanvas.getContext('2d', { willReadFrequently: true })!;

    // Fill background
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Sort layers by order
    const sortedLayers = [...state.layers]
      .filter(layer => layer.visible)
      .sort((a, b) => a.order - b.order);

    // Check if we need to apply global dithering (same logic as render())
    const needsGlobalDither = sortedLayers.some(l =>
      !l.customDither?.enabled && !l.ditherExempt
    );

    if (needsGlobalDither) {
      // Strategy: Apply dithering to base image, then render with effects
      const ditheringOptions = this.compositionService.ditheringOptions();

      for (const layer of sortedLayers) {
        // Check if this layer needs global dithering
        const needsDither = !layer.customDither?.enabled && !layer.ditherExempt;

        if (needsDither) {
          try {
            // Apply dithering to the base image data
            const ditheredImageData = this.ditheringService.applyDithering(
              layer.imageData,
              ditheringOptions
            );
            // Render with dithered image and all effects
            this.renderLayer(ctx, layer, ditheredImageData);
          } catch (error) {
            console.error('Error applying dithering to layer:', error);
            this.renderLayer(ctx, layer);
          }
        } else {
          // Layer has custom dither or exempt, render normally
          this.renderLayer(ctx, layer);
        }
      }
    } else {
      // No global dithering needed, render normally with effects
      for (const layer of sortedLayers) {
        this.renderLayer(ctx, layer);
      }
    }

    return ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
  }

  private drawSelectionBox(
    ctx: CanvasRenderingContext2D,
    layer: CompositionLayer
  ): void {
    // Use layer coordinates directly from state
    const x = layer.x;
    const y = layer.y;
    const width = layer.width;
    const height = layer.height;
    const rotation = layer.rotation;

    // Don't draw selection if layer is locked
    if (layer.locked) {
      // Just draw a red border to indicate locked
      ctx.save();
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2 / this.canvasZoom();
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
      return;
    }

    ctx.save();

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // Draw border
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 2 / this.canvasZoom();
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    // Draw resize handles - scale inversely with zoom
    const handleSize = 12 / this.canvasZoom();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2 / this.canvasZoom();
    ctx.setLineDash([]);

    const handles: TransformHandle[] = [
      // Corner handles (maintain aspect ratio)
      { type: 'resize-nw', x: x, y: y, size: handleSize },
      { type: 'resize-ne', x: x + width, y: y, size: handleSize },
      { type: 'resize-sw', x: x, y: y + height, size: handleSize },
      { type: 'resize-se', x: x + width, y: y + height, size: handleSize },
      // Side handles (free resize)
      { type: 'resize-n', x: x + width / 2, y: y, size: handleSize },
      { type: 'resize-s', x: x + width / 2, y: y + height, size: handleSize },
      { type: 'resize-e', x: x + width, y: y + height / 2, size: handleSize },
      { type: 'resize-w', x: x, y: y + height / 2, size: handleSize }
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
    const rotateHandleDistance = 30 / this.canvasZoom();
    const rotateHandleY = y - rotateHandleDistance;
    ctx.beginPath();
    ctx.moveTo(centerX, y);
    ctx.lineTo(centerX, rotateHandleY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, rotateHandleY, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawMultiSelectionBox(
    ctx: CanvasRenderingContext2D,
    layers: CompositionLayer[]
  ): void {
    if (layers.length === 0) return;

    // Calculate bounding box that encompasses all selected layers
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const layer of layers) {
      // Use temp bounds if resizing, drag offset if dragging, or actual position otherwise
      let layerX = layer.x;
      let layerY = layer.y;
      let layerWidth = layer.width;
      let layerHeight = layer.height;
      
      if (this.isResizing && this.multiResizeTempBounds.has(layer.id)) {
        // Use temp bounds during resize
        const tempBounds = this.multiResizeTempBounds.get(layer.id)!;
        layerX = tempBounds.x;
        layerY = tempBounds.y;
        layerWidth = tempBounds.width;
        layerHeight = tempBounds.height;
      } else if (this.isDragging && this.multipleLayersDragStart.has(layer.id)) {
        const startPos = this.multipleLayersDragStart.get(layer.id)!;
        const dx = this.currentTransform!.x - this.dragStartLayerX;
        const dy = this.currentTransform!.y - this.dragStartLayerY;
        layerX = startPos.x + dx;
        layerY = startPos.y + dy;
      }

      // For simplicity, calculate bounding box without rotation
      // In the future, could calculate rotated bounds properly
      const left = layerX;
      const right = layerX + layerWidth;
      const top = layerY;
      const bottom = layerY + layerHeight;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    }

    const x = minX;
    const y = minY;
    const width = maxX - minX;
    const height = maxY - minY;

    ctx.save();

    // Draw border for multi-selection (different color to distinguish)
    ctx.strokeStyle = '#ff00ff'; // Magenta for multi-selection
    ctx.lineWidth = 2 / this.canvasZoom();
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    // Draw resize handles - scale inversely with zoom
    const handleSize = 12 / this.canvasZoom();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2 / this.canvasZoom();
    ctx.setLineDash([]);

    const handles: TransformHandle[] = [
      // Corner handles
      { type: 'resize-nw', x: x, y: y, size: handleSize },
      { type: 'resize-ne', x: x + width, y: y, size: handleSize },
      { type: 'resize-sw', x: x, y: y + height, size: handleSize },
      { type: 'resize-se', x: x + width, y: y + height, size: handleSize },
      // Side handles
      { type: 'resize-n', x: x + width / 2, y: y, size: handleSize },
      { type: 'resize-s', x: x + width / 2, y: y + height, size: handleSize },
      { type: 'resize-e', x: x + width, y: y + height / 2, size: handleSize },
      { type: 'resize-w', x: x, y: y + height / 2, size: handleSize }
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

    ctx.restore();
  }

  /**
   * MOUSE INTERACTION
   */

  onMouseDown(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale between visual size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Apply CSS scale (scaleX/Y already accounts for zoom via rect dimensions)
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

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
    const state = this.compositionState();
    const selectedLayerIds = state.selectedLayerIds;

    // Check for multi-selection first
    if (selectedLayerIds.length > 1) {
      const selectedLayers = state.layers.filter(l => selectedLayerIds.includes(l.id) && l.visible);
      if (selectedLayers.length > 1) {
        const boundingBox = this.getMultiSelectionBoundingBox(selectedLayers);
        const handle = this.getHandleAtPosition(x, y, boundingBox);
        
        if (handle) {
          this.startMultiResize(x, y, boundingBox, handle, selectedLayers);
          return;
        } else if (this.isPointInBoundingBox(x, y, boundingBox)) {
          this.startMultiDrag(x, y, selectedLayers);
          return;
        }
      }
    }
    
    // Single selection handling
    const activeLayer = this.activeLayer();

    // If there's an active layer, check for handle interaction first
    if (activeLayer && !activeLayer.locked) {
      // Use currentTransform if it exists, otherwise use layer state
      const visualCoords = this.currentTransform || {
        x: activeLayer.x,
        y: activeLayer.y,
        width: activeLayer.width,
        height: activeLayer.height,
        rotation: activeLayer.rotation
      };

      // Check if clicking on handles
      const handle = this.getHandleAtPosition(x, y, visualCoords);

      if (handle === 'rotate') {
        this.startRotate(x, y, visualCoords);
        return;
      } else if (handle) {
        this.startResize(x, y, visualCoords, handle);
        return;
      } else if (this.isPointInLayer(x, y, visualCoords)) {
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
        this.startDrag(x, y, visualCoords);
        return;
      }
    }

    // If we reach here, either no active layer or clicked outside active layer
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

  onMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale between visual size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Apply CSS scale (scaleX/Y already accounts for zoom via rect dimensions)
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

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
      this.brushPoints.push({ x, y });
      this.scheduleRender(); // Use throttled render instead of direct render()
      return;
    }

    // Handle multi-selection resize
    if (this.isResizing && this.multiResizeLayers.length > 0) {
      this.updateMultiResize(x, y);
      return;
    }

    // Handle multi-selection drag
    if (this.isDragging && this.multipleLayersDragStart.size > 1) {
      const state = this.compositionState();
      const selectedLayers = state.layers.filter(l => state.selectedLayerIds.includes(l.id));
      if (selectedLayers.length > 0) {
        this.updateDrag(x, y, selectedLayers[0]);
      }
      return;
    }

    const activeLayer = this.activeLayer();
    if (!activeLayer) return;

    // If layer is locked, no interaction
    if (activeLayer.locked) return;

    // Coordinates are already adjusted for zoom
    if (this.isDragging) {
      this.updateDrag(x, y, activeLayer);
    } else if (this.isResizing) {
      this.updateResize(x, y, activeLayer);
    } else if (this.isRotating) {
      this.updateRotate(x, y, activeLayer);
    } else {
      // Update cursor based on hover
      this.updateCursor(x, y, activeLayer);
    }
  }

  onMouseUp(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale between visual size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Apply CSS scale (scaleX/Y already accounts for zoom via rect dimensions)
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

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
    if (this.isDragging && !this.isResizing && !this.isRotating && activeLayer && this.currentTransform) {
      const dx = this.currentTransform.x - this.dragStartLayerX;
      const dy = this.currentTransform.y - this.dragStartLayerY;

      // Update all selected layers
      for (const [layerId, startPos] of this.multipleLayersDragStart.entries()) {
        const newX = startPos.x + dx;
        const newY = startPos.y + dy;

        this.compositionService.updateLayer(layerId, {
          x: newX,
          y: newY
        });
      }

      // TODO: Add undo command for multiple layers
      // For now, just record the active layer movement
      const oldPos = { x: this.dragStartLayerX, y: this.dragStartLayerY };
      const newPos = { x: this.currentTransform.x, y: this.currentTransform.y };

      if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
        const command = new MoveLayerCommand(
          this.compositionService,
          activeLayer.id,
          oldPos,
          newPos
        );
        this.historyService.record(command);
      }

      // Clear multiple drag start positions
      this.multipleLayersDragStart.clear();
    }

    // Save undo command for multi-layer resize
    if (this.isResizing && this.multiResizeLayers.length > 1) {
      // Check if any layer actually changed
      let hasAnyChange = false;
      const layerTransforms: Array<{ layerId: string; oldBounds: any; newBounds: any }> = [];
      
      for (const layer of this.multiResizeLayers) {
        const startBounds = this.multiResizeStartBounds.get(layer.id);
        const tempBounds = this.multiResizeTempBounds.get(layer.id);
        
        if (startBounds && tempBounds) {
          const changed = startBounds.x !== tempBounds.x ||
                         startBounds.y !== tempBounds.y ||
                         startBounds.width !== tempBounds.width ||
                         startBounds.height !== tempBounds.height;
          
          if (changed) {
            hasAnyChange = true;
            layerTransforms.push({
              layerId: layer.id,
              oldBounds: startBounds,
              newBounds: tempBounds
            });
          }
        }
      }
      
      if (hasAnyChange && layerTransforms.length > 0) {
        // Apply all transformations to the service
        layerTransforms.forEach(t => {
          this.compositionService.updateLayer(t.layerId, t.newBounds);
        });
        
        // Create a custom batch transform command
        const oldValues = new Map<string, Partial<CompositionLayer>>();
        const newValues = new Map<string, Partial<CompositionLayer>>();
        
        layerTransforms.forEach(t => {
          oldValues.set(t.layerId, t.oldBounds);
          newValues.set(t.layerId, t.newBounds);
        });
        
        const command = {
          description: `Resize ${layerTransforms.length} layers`,
          execute: () => {
            newValues.forEach((bounds, layerId) => {
              this.compositionService.updateLayer(layerId, bounds);
            });
          },
          undo: () => {
            oldValues.forEach((bounds, layerId) => {
              this.compositionService.updateLayer(layerId, bounds);
            });
          }
        };
        
        this.historyService.record(command);
      }
      
      // Clear temp storage
      this.multiResizeTempBounds.clear();
    }
    // Save undo command for single layer resize/rotate
    else if ((this.isResizing || this.isRotating) && activeLayer && this.currentTransform) {
      const oldTransform = {
        x: this.dragStartLayerX,
        y: this.dragStartLayerY,
        width: this.resizeStartWidth,
        height: this.resizeStartHeight,
        rotation: this.rotateStartAngle
      };

      const newTransform = {
        x: this.currentTransform.x,
        y: this.currentTransform.y,
        width: this.currentTransform.width,
        height: this.currentTransform.height,
        rotation: this.currentTransform.rotation
      };

      // Apply transform to state
      this.compositionService.updateLayer(activeLayer.id, newTransform);

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

    // Clear current transform and interaction state
    this.currentTransform = null;
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.isPanning = false;
    this.isDrawingShape = false;
    this.isBrushing = false;
    this.resizeHandle = null;
    
    // Clear multi-selection state
    this.multiResizeLayers = [];
    this.multiResizeStartBounds.clear();
    this.multiResizeBoundingBox = null;

    canvas.classList.remove('dragging', 'resizing', 'rotating');
  }

  /**
   * KEYBOARD SHORTCUTS
   */

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ignore if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Ctrl+C / Cmd+C - Copy
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      event.preventDefault();
      this.compositionService.copySelectedLayers();
      return;
    }

    // Ctrl+V / Cmd+V - Paste (handled by app.ts)
    // Ctrl+D / Cmd+D - Duplicate (handled by app.ts)
    // Delete / Backspace - Delete selected layers
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      const selectedLayers = this.compositionService.getSelectedLayers();
      for (const layer of selectedLayers) {
        this.compositionService.deleteLayer(layer.id);
      }
      return;
    }
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

  private startDrag(
    x: number,
    y: number,
    coords: { x: number; y: number; width: number; height: number; rotation: number }
  ): void {
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartLayerX = coords.x;
    this.dragStartLayerY = coords.y;
    this.resizeStartWidth = coords.width;
    this.resizeStartHeight = coords.height;
    this.rotateStartAngle = coords.rotation;

    // Initialize current transform with current coords
    this.currentTransform = {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      rotation: coords.rotation
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

    // Update current transform (don't touch state)
    this.currentTransform = {
      x: this.dragStartLayerX + dx,
      y: this.dragStartLayerY + dy,
      width: this.resizeStartWidth,
      height: this.resizeStartHeight,
      rotation: this.rotateStartAngle
    };

    // Schedule render
    this.scheduleRender();
  }

  /**
   * RESIZE
   */

  private startResize(
    x: number,
    y: number,
    coords: { x: number; y: number; width: number; height: number; rotation: number },
    handle: string
  ): void {
    this.isResizing = true;
    this.resizeHandle = handle;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartLayerX = coords.x;
    this.dragStartLayerY = coords.y;
    this.resizeStartWidth = coords.width;
    this.resizeStartHeight = coords.height;

    // Initialize current transform with current coords
    this.currentTransform = {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      rotation: coords.rotation
    };

    const canvas = this.canvasRef.nativeElement;
    canvas.classList.add('resizing');
  }

  private updateResize(x: number, y: number, layer: CompositionLayer): void {
    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;

    // Start with initial values
    let newX = this.dragStartLayerX;
    let newY = this.dragStartLayerY;
    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;

    const aspectRatio = this.resizeStartWidth / this.resizeStartHeight;

    switch (this.resizeHandle) {
      // Corner handles - maintain aspect ratio, anchor opposite corner
      case 'resize-se':
        // Anchor: top-left (x, y) stays fixed
        newWidth = Math.max(20, this.resizeStartWidth + dx);
        newHeight = newWidth / aspectRatio;
        break;

      case 'resize-sw':
        // Anchor: top-right stays fixed
        const anchorRightX = this.dragStartLayerX + this.resizeStartWidth;
        newWidth = Math.max(20, this.resizeStartWidth - dx);
        newHeight = newWidth / aspectRatio;
        newX = anchorRightX - newWidth;
        break;

      case 'resize-ne':
        // Anchor: bottom-left stays fixed
        const anchorBottomY = this.dragStartLayerY + this.resizeStartHeight;
        newWidth = Math.max(20, this.resizeStartWidth + dx);
        newHeight = newWidth / aspectRatio;
        newY = anchorBottomY - newHeight;
        break;

      case 'resize-nw':
        // Anchor: bottom-right stays fixed
        const anchorBottomRightX = this.dragStartLayerX + this.resizeStartWidth;
        const anchorBottomRightY = this.dragStartLayerY + this.resizeStartHeight;
        newWidth = Math.max(20, this.resizeStartWidth - dx);
        newHeight = newWidth / aspectRatio;
        newX = anchorBottomRightX - newWidth;
        newY = anchorBottomRightY - newHeight;
        break;

      // Side handles - free resize, anchor opposite side
      case 'resize-n':
        // Anchor: bottom stays fixed
        const anchorBottom = this.dragStartLayerY + this.resizeStartHeight;
        newHeight = Math.max(20, this.resizeStartHeight - dy);
        newY = anchorBottom - newHeight;
        break;

      case 'resize-s':
        // Anchor: top stays fixed
        newHeight = Math.max(20, this.resizeStartHeight + dy);
        break;

      case 'resize-e':
        // Anchor: left stays fixed
        newWidth = Math.max(20, this.resizeStartWidth + dx);
        break;

      case 'resize-w':
        // Anchor: right stays fixed
        const anchorRight = this.dragStartLayerX + this.resizeStartWidth;
        newWidth = Math.max(20, this.resizeStartWidth - dx);
        newX = anchorRight - newWidth;
        break;
    }

    // Update current transform
    this.currentTransform = {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: layer.rotation
    };

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

  private startRotate(
    x: number,
    y: number,
    coords: { x: number; y: number; width: number; height: number; rotation: number }
  ): void {
    this.isRotating = true;
    this.rotateStartAngle = coords.rotation;
    this.dragStartLayerX = coords.x;
    this.dragStartLayerY = coords.y;
    this.resizeStartWidth = coords.width;
    this.resizeStartHeight = coords.height;

    // Initialize current transform with current coords
    this.currentTransform = {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      rotation: coords.rotation
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

    // Update current transform (don't touch state)
    this.currentTransform = {
      x: this.dragStartLayerX,
      y: this.dragStartLayerY,
      width: this.resizeStartWidth,
      height: this.resizeStartHeight,
      rotation: newRotation
    };

    // Schedule render
    this.scheduleRender();
  }

  /**
   * UTILITIES
   */

  private getHandleAtPosition(
    x: number,
    y: number,
    coords: { x: number; y: number; width: number; height: number; rotation: number }
  ): string | null {
    const handleSize = 12;
    // Scale tolerance inversely with zoom for consistent hit detection
    const tolerance = 15 / this.canvasZoom();

    const centerX = coords.x + coords.width / 2;
    const centerY = coords.y + coords.height / 2;

    // Transform mouse coordinates to layer's local space (inverse rotation)
    const angleRad = (-coords.rotation * Math.PI) / 180; // Negative for inverse
    const dx = x - centerX;
    const dy = y - centerY;
    const localX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad) + centerX;
    const localY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad) + centerY;

    // Check rotation handle (in local space) - use scaled distance
    const rotateHandleDistance = 30 / this.canvasZoom();
    const rotateY = coords.y - rotateHandleDistance;
    const rotateDistance = Math.hypot(localX - centerX, localY - rotateY);
    if (rotateDistance <= tolerance) {
      return 'rotate';
    }

    // Check resize handles in local space
    const handles = [
      // Corners first (higher priority)
      { type: 'resize-nw', x: coords.x, y: coords.y },
      { type: 'resize-ne', x: coords.x + coords.width, y: coords.y },
      { type: 'resize-sw', x: coords.x, y: coords.y + coords.height },
      { type: 'resize-se', x: coords.x + coords.width, y: coords.y + coords.height },
      // Sides second
      { type: 'resize-n', x: coords.x + coords.width / 2, y: coords.y },
      { type: 'resize-s', x: coords.x + coords.width / 2, y: coords.y + coords.height },
      { type: 'resize-e', x: coords.x + coords.width, y: coords.y + coords.height / 2 },
      { type: 'resize-w', x: coords.x, y: coords.y + coords.height / 2 }
    ];

    // Check each handle using local coordinates
    for (const handle of handles) {
      const distance = Math.hypot(localX - handle.x, localY - handle.y);
      if (distance <= tolerance) {
        return handle.type;
      }
    }

    return null;
  }

  private isPointInLayer(
    x: number,
    y: number,
    coords: { x: number; y: number; width: number; height: number; rotation?: number }
  ): boolean {
    // If layer has rotation, transform point to local space
    if (coords.rotation && coords.rotation !== 0) {
      const centerX = coords.x + coords.width / 2;
      const centerY = coords.y + coords.height / 2;

      // Inverse rotation
      const angleRad = (-coords.rotation * Math.PI) / 180;
      const dx = x - centerX;
      const dy = y - centerY;
      const localX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad) + centerX;
      const localY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad) + centerY;

      return localX >= coords.x &&
        localX <= coords.x + coords.width &&
        localY >= coords.y &&
        localY <= coords.y + coords.height;
    }

    // No rotation - simple AABB check
    return x >= coords.x &&
      x <= coords.x + coords.width &&
      y >= coords.y &&
      y <= coords.y + coords.height;
  }

  private getLayerAtPosition(x: number, y: number): CompositionLayer | null {
    const state = this.compositionState();
    const sortedLayers = [...state.layers]
      .filter(l => l.visible)
      .sort((a, b) => b.order - a.order);

    for (const layer of sortedLayers) {
      const coords = {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        rotation: layer.rotation
      };
      if (this.isPointInLayer(x, y, coords)) {
        return layer;
      }
    }

    return null;
  }

  private updateCursor(x: number, y: number, layer: CompositionLayer): void {
    const canvas = this.canvasRef.nativeElement;

    // Use currentTransform if it exists, otherwise use layer state
    const visualCoords = this.currentTransform || {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation
    };

    const handle = this.getHandleAtPosition(x, y, visualCoords);

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
    this.render();
  }

  zoomOut(): void {
    const newZoom = Math.max(this.canvasZoom() - 0.1, 0.1);
    this.canvasZoom.set(newZoom);
    this.render();
  }

  resetZoom(): void {
    this.canvasZoom.set(1.0);
    this.render();
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
   * MULTI-SELECTION HELPERS
   */
  
  private getMultiSelectionBoundingBox(layers: CompositionLayer[]): { x: number; y: number; width: number; height: number; rotation: number } {
    if (layers.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const layer of layers) {
      let layerX = layer.x;
      let layerY = layer.y;
      
      if (this.isDragging && this.multipleLayersDragStart.has(layer.id)) {
        const startPos = this.multipleLayersDragStart.get(layer.id)!;
        const dx = this.currentTransform!.x - this.dragStartLayerX;
        const dy = this.currentTransform!.y - this.dragStartLayerY;
        layerX = startPos.x + dx;
        layerY = startPos.y + dy;
      }

      const left = layerX;
      const right = layerX + layer.width;
      const top = layerY;
      const bottom = layerY + layer.height;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0
    };
  }

  private isPointInBoundingBox(x: number, y: number, box: { x: number; y: number; width: number; height: number }): boolean {
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
  }

  private multiResizeLayers: CompositionLayer[] = [];
  private multiResizeStartBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
  private multiResizeTempBounds = new Map<string, { x: number; y: number; width: number; height: number }>(); // Temp storage during resize
  private multiResizeBoundingBox: { x: number; y: number; width: number; height: number } | null = null;

  private startMultiResize(
    x: number,
    y: number,
    boundingBox: { x: number; y: number; width: number; height: number; rotation: number },
    handle: string,
    layers: CompositionLayer[]
  ): void {
    this.isResizing = true;
    this.resizeHandle = handle;
    this.dragStartX = x;
    this.dragStartY = y;
    this.multiResizeLayers = layers;
    this.multiResizeBoundingBox = { x: boundingBox.x, y: boundingBox.y, width: boundingBox.width, height: boundingBox.height };

    // Store initial bounds for each layer
    this.multiResizeStartBounds.clear();
    for (const layer of layers) {
      this.multiResizeStartBounds.set(layer.id, {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height
      });
    }

    const canvas = this.canvasRef.nativeElement;
    canvas.classList.add('resizing');
  }

  private startMultiDrag(x: number, y: number, layers: CompositionLayer[]): void {
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    
    // Store starting positions for all selected layers
    this.multipleLayersDragStart.clear();
    for (const layer of layers) {
      this.multipleLayersDragStart.set(layer.id, { x: layer.x, y: layer.y });
    }
    
    // Use first layer's position as reference
    if (layers.length > 0) {
      this.dragStartLayerX = layers[0].x;
      this.dragStartLayerY = layers[0].y;
      this.currentTransform = {
        x: layers[0].x,
        y: layers[0].y,
        width: layers[0].width,
        height: layers[0].height,
        rotation: layers[0].rotation
      };
    }

    const canvas = this.canvasRef.nativeElement;
    canvas.classList.add('dragging');
  }

  private updateMultiResize(x: number, y: number): void {
    if (!this.multiResizeBoundingBox || this.multiResizeLayers.length === 0) return;

    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;

    const originalBox = this.multiResizeBoundingBox;
    let newBoxX = originalBox.x;
    let newBoxY = originalBox.y;
    let newBoxWidth = originalBox.width;
    let newBoxHeight = originalBox.height;

    const aspectRatio = originalBox.width / originalBox.height;

    // Calculate new bounding box dimensions based on handle
    switch (this.resizeHandle) {
      case 'resize-se':
        newBoxWidth = Math.max(20, originalBox.width + dx);
        newBoxHeight = newBoxWidth / aspectRatio;
        break;
      case 'resize-sw':
        newBoxWidth = Math.max(20, originalBox.width - dx);
        newBoxHeight = newBoxWidth / aspectRatio;
        newBoxX = originalBox.x + originalBox.width - newBoxWidth;
        break;
      case 'resize-ne':
        newBoxWidth = Math.max(20, originalBox.width + dx);
        newBoxHeight = newBoxWidth / aspectRatio;
        newBoxY = originalBox.y + originalBox.height - newBoxHeight;
        break;
      case 'resize-nw':
        newBoxWidth = Math.max(20, originalBox.width - dx);
        newBoxHeight = newBoxWidth / aspectRatio;
        newBoxX = originalBox.x + originalBox.width - newBoxWidth;
        newBoxY = originalBox.y + originalBox.height - newBoxHeight;
        break;
      case 'resize-n':
        newBoxHeight = Math.max(20, originalBox.height - dy);
        newBoxY = originalBox.y + originalBox.height - newBoxHeight;
        break;
      case 'resize-s':
        newBoxHeight = Math.max(20, originalBox.height + dy);
        break;
      case 'resize-e':
        newBoxWidth = Math.max(20, originalBox.width + dx);
        break;
      case 'resize-w':
        newBoxWidth = Math.max(20, originalBox.width - dx);
        newBoxX = originalBox.x + originalBox.width - newBoxWidth;
        break;
    }

    // Calculate scale factors
    const scaleX = newBoxWidth / originalBox.width;
    const scaleY = newBoxHeight / originalBox.height;

    // Store new bounds in temp storage (don't update service yet)
    this.multiResizeTempBounds.clear();
    for (const layer of this.multiResizeLayers) {
      const startBounds = this.multiResizeStartBounds.get(layer.id);
      if (!startBounds) continue;

      // Calculate relative position within original bounding box
      const relX = (startBounds.x - originalBox.x) / originalBox.width;
      const relY = (startBounds.y - originalBox.y) / originalBox.height;
      const relW = startBounds.width / originalBox.width;
      const relH = startBounds.height / originalBox.height;

      // Apply scaling to get new bounds
      const newX = newBoxX + (relX * newBoxWidth);
      const newY = newBoxY + (relY * newBoxHeight);
      const newWidth = relW * newBoxWidth;
      const newHeight = relH * newBoxHeight;

      // Store in temp map instead of updating service
      this.multiResizeTempBounds.set(layer.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    }

    this.scheduleRender();
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
    this.render();
  }
}
