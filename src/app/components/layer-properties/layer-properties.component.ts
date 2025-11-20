import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompositionService } from '../../services/composition.service';
import { ModalService } from '../../services/modal.service';
import { HistoryService, DeleteLayerCommand, BatchUpdateLayersCommand } from '../../services/history.service';
import { StorageService } from '../../services/storage.service';
import { DitheringService } from '../../services/dithering.service';
import { CompositionLayer, BlendMode } from '../../models/composition-layer.interface';

@Component({
  selector: 'app-layer-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="layer-properties-panel">
      @if (activeLayer(); as layer) {
        <!-- Layer Title -->
        <div class="properties-title">
          <span class="title-icon">⚙️</span>
          <span>Properties</span>
          @if (selectedLayers().length > 1) {
            <span class="selection-badge">{{ selectedLayers().length }} selected</span>
          }
        </div>
        
        <!-- Transform Section -->
        <div class="property-section">
          <h4 class="section-title">Transform</h4>
          
          <div class="property-grid">
            <div class="property-field">
              <label>X</label>
              <input 
                type="number" 
                [(ngModel)]="layer.x"
                (ngModelChange)="updateLayer(layer)"
                class="number-input-small">
            </div>
            
            <div class="property-field">
              <label>Y</label>
              <input 
                type="number" 
                [(ngModel)]="layer.y"
                (ngModelChange)="updateLayer(layer)"
                class="number-input-small">
            </div>
            
            <div class="property-field">
              <label>W</label>
              <input 
                type="number" 
                [(ngModel)]="layer.width"
                (ngModelChange)="updateLayer(layer)"
                class="number-input-small"
                min="20">
            </div>
            
            <div class="property-field">
              <label>H</label>
              <input 
                type="number" 
                [(ngModel)]="layer.height"
                (ngModelChange)="updateLayer(layer)"
                class="number-input-small"
                min="20">
            </div>
          </div>
          
          <div class="property-row">
            <label>Rotation</label>
            <input 
              type="range" 
              [(ngModel)]="layer.rotation"
              (ngModelChange)="updateLayer(layer)"
              min="-180"
              max="180"
              class="slider">
            <span class="value-display">{{ Math.round(layer.rotation) }}°</span>
          </div>
          
          <div class="property-row">
            <label>Opacity (%)</label>
            <input 
              type="range" 
              [(ngModel)]="layer.opacity"
              (ngModelChange)="updateLayer(layer)"
              min="0"
              max="100"
              class="slider">
            <span class="value-display">{{ layer.opacity }}%</span>
          </div>
        </div>
        
        <!-- Text Layer Properties -->
        @if (layer.type === 'text') {
          <div class="property-section">
            <h4 class="section-title">Text Content</h4>
            
            <div class="property-row">
              <label>Content</label>
              <textarea 
                [ngModel]="layer.textContent || ''" 
                (ngModelChange)="updateTextContent(layer, $event)"
                rows="3"
                class="textarea-input"></textarea>
            </div>
            
            <div class="property-row">
              <label>Font Family</label>
              <select 
                [ngModel]="layer.textFontFamily || 'Arial'"
                (ngModelChange)="updateTextProperty(layer, 'textFontFamily', $event)"
                class="select-input">
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Impact">Impact</option>
                <option value="Press Start 2P">Press Start 2P</option>
              </select>
            </div>
            
            <div class="property-row">
              <label>Font Size</label>
              <input 
                type="range" 
                [ngModel]="layer.textFontSize || 32"
                (ngModelChange)="updateTextProperty(layer, 'textFontSize', $event)"
                min="8"
                max="200"
                class="slider">
              <span class="value-display">{{ layer.textFontSize || 32 }}px</span>
            </div>
            
            <div class="property-row">
              <label>Color</label>
              <div class="color-picker-row">
                <input 
                  type="color" 
                  [ngModel]="layer.textColor || '#000000'"
                  (ngModelChange)="updateTextProperty(layer, 'textColor', $event)"
                  class="color-input">
                <span class="color-value">{{ layer.textColor || '#000000' }}</span>
              </div>
            </div>
            
            <div class="property-row">
              <label>Style</label>
              <div class="button-group-inline">
                <button 
                  class="btn-toggle"
                  [class.active]="layer.textBold"
                  (click)="toggleTextBold(layer)">
                  <strong>B</strong>
                </button>
                <button 
                  class="btn-toggle"
                  [class.active]="layer.textItalic"
                  (click)="toggleTextItalic(layer)">
                  <em>I</em>
                </button>
              </div>
            </div>
            
            <div class="property-row">
              <input 
                type="checkbox" 
                [ngModel]="layer.textStrokeEnabled || false"
                (ngModelChange)="updateTextProperty(layer, 'textStrokeEnabled', $event)"
                id="text-stroke-toggle">
              <label for="text-stroke-toggle">Stroke/Outline</label>
            </div>
            
            @if (layer.textStrokeEnabled) {
              <div class="property-row">
                <label>Stroke Color</label>
                <div class="color-picker-row">
                  <input 
                    type="color" 
                    [ngModel]="layer.textStrokeColor || '#000000'"
                    (ngModelChange)="updateTextProperty(layer, 'textStrokeColor', $event)"
                    class="color-input">
                  <span class="color-value">{{ layer.textStrokeColor || '#000000' }}</span>
                </div>
              </div>
              
              <div class="property-row">
                <label>Stroke Width</label>
                <input 
                  type="range" 
                  [ngModel]="layer.textStrokeWidth || 2"
                  (ngModelChange)="updateTextProperty(layer, 'textStrokeWidth', $event)"
                  min="1"
                  max="20"
                  class="slider">
                <span class="value-display">{{ layer.textStrokeWidth || 2 }}px</span>
              </div>
            }
          </div>
        }
        
        <!-- Shape Layer Properties -->
        @if (layer.type === 'shape') {
          <div class="property-section">
            <h4 class="section-title">Shape Options</h4>
            
            <div class="property-row">
              <label>Shape Type</label>
              <select 
                [ngModel]="layer.shapeType || 'rectangle'"
                (ngModelChange)="updateShapeProperty(layer, 'shapeType', $event)"
                class="select-input">
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="ellipse">Ellipse</option>
                <option value="line">Line</option>
              </select>
            </div>
            
            <div class="property-row">
              <input 
                type="checkbox" 
                [ngModel]="layer.shapeFilled ?? true"
                (ngModelChange)="updateShapeProperty(layer, 'shapeFilled', $event)"
                id="shape-filled-toggle">
              <label for="shape-filled-toggle">Filled</label>
            </div>
            
            @if (layer.shapeFilled) {
              <div class="property-row">
                <label>Fill Color</label>
                <div class="color-picker-row">
                  <input 
                    type="color" 
                    [ngModel]="layer.shapeFillColor || '#ffffff'"
                    (ngModelChange)="updateShapeProperty(layer, 'shapeFillColor', $event)"
                    class="color-input">
                  <span class="color-value">{{ layer.shapeFillColor || '#ffffff' }}</span>
                </div>
              </div>
            }
            
            <div class="property-row">
              <label>Stroke Color</label>
              <div class="color-picker-row">
                <input 
                  type="color" 
                  [ngModel]="layer.shapeStrokeColor || '#000000'"
                  (ngModelChange)="updateShapeProperty(layer, 'shapeStrokeColor', $event)"
                  class="color-input">
                <span class="color-value">{{ layer.shapeStrokeColor || '#000000' }}</span>
              </div>
            </div>
            
            <div class="property-row">
              <label>Stroke Width</label>
              <input 
                type="range" 
                [ngModel]="layer.shapeStrokeWidth || 2"
                (ngModelChange)="updateShapeProperty(layer, 'shapeStrokeWidth', $event)"
                min="0"
                max="20"
                class="slider">
              <span class="value-display">{{ layer.shapeStrokeWidth || 2 }}px</span>
            </div>
          </div>
        }
        
        <!-- Background Removal Section -->
        <div class="property-section">
          <h4 class="section-title">
            <input 
              type="checkbox" 
              [(ngModel)]="layer.removeBackground"
              (ngModelChange)="updateLayer(layer)"
              id="bg-remove-toggle">
            <label for="bg-remove-toggle">Background Removal</label>
          </h4>
          
          @if (layer.removeBackground) {
            <div class="property-row">
              <label>Color</label>
              <div class="color-picker-row">
                <input 
                  type="color" 
                  [(ngModel)]="layer.backgroundColor"
                  (ngModelChange)="updateLayer(layer)"
                  class="color-input">
                <span class="color-value">{{ layer.backgroundColor }}</span>
              </div>
            </div>
            
            <div class="property-row">
              <label>Threshold</label>
              <input 
                type="range" 
                [(ngModel)]="layer.backgroundThreshold"
                (ngModelChange)="updateLayer(layer)"
                min="0"
                max="255"
                class="slider">
              <span class="value-display">{{ layer.backgroundThreshold }}</span>
            </div>
            
            <button 
              class="btn-action"
              (click)="pickBackgroundColor(layer)">
              Pick Color from Image
            </button>
          }
        </div>
        
        <!-- Tint Section -->
        <div class="property-section">
          <h4 class="section-title">
            <input 
              type="checkbox" 
              [(ngModel)]="layer.tint"
              (ngModelChange)="updateLayer(layer)"
              id="tint-toggle">
            <label for="tint-toggle">Tint / Colorize</label>
          </h4>
          
          @if (layer.tint) {
            <div class="property-row">
              <label>Color</label>
              <div class="color-picker-row">
                <input 
                  type="color" 
                  [(ngModel)]="layer.tintColor"
                  (ngModelChange)="updateLayer(layer)"
                  class="color-input">
                <span class="color-value">{{ layer.tintColor }}</span>
              </div>
            </div>
            
            <div class="property-row">
              <label>Intensity</label>
              <input 
                type="range" 
                [(ngModel)]="layer.tintIntensity"
                (ngModelChange)="updateLayer(layer)"
                min="0"
                max="100"
                class="slider">
              <span class="value-display">{{ layer.tintIntensity }}%</span>
            </div>
            
            <div class="property-row">
              <label>Blend Mode</label>
              <select 
                [(ngModel)]="layer.tintBlendMode"
                (ngModelChange)="updateLayer(layer)"
                class="select-input">
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="color">Color</option>
              </select>
            </div>
          }
        </div>
        
        <!-- Layer Effects Section -->
        <div class="property-section">
          <h4 class="section-title">Layer Effects (Fusion)</h4>
          
          <!-- Stroke Effect -->
          <div class="effect-subsection">
            <input 
              type="checkbox" 
              [checked]="layer.effects?.stroke?.enabled || false"
              (change)="toggleEffect(layer, 'stroke', $event)"
              id="stroke-toggle">
            <label for="stroke-toggle">Stroke</label>
            
            @if (layer.effects?.stroke?.enabled) {
              <div class="effect-controls">
                <div class="property-row">
                  <label>Color</label>
                  <input 
                    type="color" 
                    [value]="layer.effects?.stroke?.color"
                    (input)="updateEffectProperty(layer, 'stroke', 'color', $event)"
                    class="color-input">
                </div>
                
                <div class="property-row">
                  <label>Width</label>
                  <input 
                    type="range" 
                    [value]="layer.effects?.stroke?.width"
                    (input)="updateEffectProperty(layer, 'stroke', 'width', $event)"
                    min="1"
                    max="20"
                    class="slider">
                  <span class="value-display">{{ layer.effects?.stroke?.width }}px</span>
                </div>
                
                <div class="property-row">
                  <label>Position</label>
                  <select 
                    [value]="layer.effects?.stroke?.position"
                    (change)="updateEffectProperty(layer, 'stroke', 'position', $event)"
                    class="select-input">
                    <option value="outside">Outside</option>
                    <option value="center">Center</option>
                    <option value="inside">Inside</option>
                  </select>
                </div>
              </div>
            }
          </div>
          
          <!-- Drop Shadow Effect -->
          <div class="effect-subsection">
            <input 
              type="checkbox" 
              [checked]="layer.effects?.dropShadow?.enabled || false"
              (change)="toggleEffect(layer, 'dropShadow', $event)"
              id="shadow-toggle">
            <label for="shadow-toggle">Drop Shadow</label>
            
            @if (layer.effects?.dropShadow?.enabled) {
              <div class="effect-controls">
                <div class="property-row">
                  <label>Color</label>
                  <input 
                    type="color" 
                    [value]="layer.effects?.dropShadow?.color"
                    (input)="updateEffectProperty(layer, 'dropShadow', 'color', $event)"
                    class="color-input">
                </div>
                
                <div class="property-row">
                  <label>Distance</label>
                  <input 
                    type="range" 
                    [value]="layer.effects?.dropShadow?.distance"
                    (input)="updateEffectProperty(layer, 'dropShadow', 'distance', $event)"
                    min="0"
                    max="50"
                    class="slider">
                  <span class="value-display">{{ layer.effects?.dropShadow?.distance }}px</span>
                </div>
                
                <div class="property-row">
                  <label>Size (Blur)</label>
                  <input 
                    type="range" 
                    [value]="layer.effects?.dropShadow?.size"
                    (input)="updateEffectProperty(layer, 'dropShadow', 'size', $event)"
                    min="0"
                    max="50"
                    class="slider">
                  <span class="value-display">{{ layer.effects?.dropShadow?.size }}px</span>
                </div>
              </div>
            }
          </div>
          
          <!-- Outer Glow Effect -->
          <div class="effect-subsection">
            <input 
              type="checkbox" 
              [checked]="layer.effects?.outerGlow?.enabled || false"
              (change)="toggleEffect(layer, 'outerGlow', $event)"
              id="glow-toggle">
            <label for="glow-toggle">Outer Glow</label>
            
            @if (layer.effects?.outerGlow?.enabled) {
              <div class="effect-controls">
                <div class="property-row">
                  <label>Color</label>
                  <input 
                    type="color" 
                    [value]="layer.effects?.outerGlow?.color"
                    (input)="updateEffectProperty(layer, 'outerGlow', 'color', $event)"
                    class="color-input">
                </div>
                
                <div class="property-row">
                  <label>Size</label>
                  <input 
                    type="range" 
                    [value]="layer.effects?.outerGlow?.size"
                    (input)="updateEffectProperty(layer, 'outerGlow', 'size', $event)"
                    min="1"
                    max="50"
                    class="slider">
                  <span class="value-display">{{ layer.effects?.outerGlow?.size }}px</span>
                </div>
              </div>
            }
          </div>
        </div>
        
        <!-- Dithering Section -->
        <div class="property-section">
          <h4 class="section-title">Dithering</h4>
          
          <div class="property-row">
            <input 
              type="checkbox" 
              [(ngModel)]="layer.ditherExempt"
              (ngModelChange)="updateLayer(layer)"
              id="dither-exempt-toggle">
            <label for="dither-exempt-toggle">
              Exclude from Dithering
              <span class="hint">(Will use color compression instead)</span>
            </label>
          </div>
          
          @if (!layer.ditherExempt) {
            <div class="property-row">
              <input 
                type="checkbox" 
                [ngModel]="layer.customDither?.enabled || false"
                (ngModelChange)="toggleCustomDither(layer, $event)"
                id="custom-dither-toggle">
              <label for="custom-dither-toggle">
                Custom Dither Settings
                <span class="hint">(Override global settings)</span>
              </label>
            </div>
            
            @if (layer.customDither?.enabled) {
              <div class="custom-dither-controls">
                <div class="property-row">
                  <label>Palette</label>
                  <select 
                    [ngModel]="layer.customDither?.palette || 'monochrome'"
                    (ngModelChange)="updateCustomDither(layer, 'palette', $event)"
                    class="select-input">
                    <optgroup label="Built-in Palettes">
                      @for (palette of palettes(); track palette.id) {
                        <option [value]="palette.id">{{ palette.name }}</option>
                      }
                    </optgroup>
                    @if (customPalettes().length > 0) {
                      <optgroup label="Custom Palettes">
                        @for (palette of customPalettes(); track palette.id) {
                          <option [value]="palette.id">{{ palette.name }}</option>
                        }
                      </optgroup>
                    }
                  </select>
                </div>
                
                <div class="property-row">
                  <label>Algorithm</label>
                  <select 
                    [ngModel]="layer.customDither?.algorithm || 'floyd-steinberg'"
                    (ngModelChange)="updateCustomDither(layer, 'algorithm', $event)"
                    class="select-input">
                    <option value="floyd-steinberg">Floyd-Steinberg</option>
                    <option value="atkinson">Atkinson</option>
                    <option value="jarvis-judice-ninke">Jarvis-Judice-Ninke</option>
                    <option value="stucki">Stucki</option>
                    <option value="burkes">Burkes</option>
                    <option value="sierra">Sierra</option>
                    <option value="sierra-lite">Sierra Lite</option>
                    <option value="threshold">Threshold</option>
                    <option value="random">Random</option>
                    <option value="bayer-2">Bayer 2×2</option>
                    <option value="bayer-4">Bayer 4×4</option>
                    <option value="bayer-8">Bayer 8×8</option>
                    <option value="bayer-16">Bayer 16×16</option>
                  </select>
                </div>
                
                @if (layer.customDither?.algorithm === 'threshold') {
                  <div class="property-row">
                    <label>Threshold</label>
                    <input 
                      type="range" 
                      [ngModel]="layer.customDither?.threshold || 128"
                      (ngModelChange)="updateCustomDither(layer, 'threshold', $event)"
                      min="0"
                      max="255"
                      class="slider">
                    <span class="value-display">{{ layer.customDither?.threshold || 128 }}</span>
                  </div>
                }
                
                @if (layer.customDither?.algorithm?.startsWith('bayer')) {
                  <div class="property-row">
                    <label>Bayer Level</label>
                    <select 
                      [ngModel]="layer.customDither?.bayerLevel || 4"
                      (ngModelChange)="updateCustomDither(layer, 'bayerLevel', $event)"
                      class="select-input">
                      <option value="2">2×2</option>
                      <option value="4">4×4</option>
                      <option value="8">8×8</option>
                      <option value="16">16×16</option>
                    </select>
                  </div>
                }
                
                <!-- Image adjustments -->
                <div class="property-row">
                  <label>Scale</label>
                  <input 
                    type="range" 
                    [ngModel]="layer.customDither?.scale || 1"
                    (ngModelChange)="updateCustomDither(layer, 'scale', $event)"
                    min="1"
                    max="10"
                    step="0.5"
                    class="slider">
                  <span class="value-display">{{ layer.customDither?.scale || 1 }}x</span>
                </div>
                
                <div class="property-row">
                  <label>Contrast</label>
                  <input 
                    type="range" 
                    [ngModel]="layer.customDither?.contrast || 50"
                    (ngModelChange)="updateCustomDither(layer, 'contrast', $event)"
                    min="0"
                    max="100"
                    class="slider">
                  <span class="value-display">{{ layer.customDither?.contrast || 50 }}</span>
                </div>
                
                <div class="property-row">
                  <label>Midtones</label>
                  <input 
                    type="range" 
                    [ngModel]="layer.customDither?.midtones || 50"
                    (ngModelChange)="updateCustomDither(layer, 'midtones', $event)"
                    min="0"
                    max="100"
                    class="slider">
                  <span class="value-display">{{ layer.customDither?.midtones || 50 }}</span>
                </div>
                
                <div class="property-row">
                  <label>Highlights</label>
                  <input 
                    type="range" 
                    [ngModel]="layer.customDither?.highlights || 50"
                    (ngModelChange)="updateCustomDither(layer, 'highlights', $event)"
                    min="0"
                    max="100"
                    class="slider">
                  <span class="value-display">{{ layer.customDither?.highlights || 50 }}</span>
                </div>
                
                <div class="property-row">
                  <label>Blur</label>
                  <input 
                    type="range" 
                    [ngModel]="layer.customDither?.blur || 0"
                    (ngModelChange)="updateCustomDither(layer, 'blur', $event)"
                    min="0"
                    max="10"
                    class="slider">
                  <span class="value-display">{{ layer.customDither?.blur || 0 }}</span>
                </div>
              </div>
            }
          }
        </div>
        
        <!-- Actions -->
        <div class="property-section">
          <h4 class="section-title">Actions</h4>
          
          <button 
            class="btn-action"
            (click)="resetTransform(layer)">
            Reset Transform
          </button>
          
          <button 
            class="btn-action"
            (click)="fitToCanvas(layer)">
            Fit to Canvas
          </button>
          
          <button 
            class="btn-action btn-danger"
            (click)="deleteLayer(layer)">
            Delete Layer
          </button>
        </div>
        
      } @else {
        <div class="empty-state">
          <p>No layer selected</p>
          <p class="hint">Select a layer to edit its properties</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .layer-properties-panel {
      background: linear-gradient(145deg, #1a2d1a 0%, #0f1f0f 100%);
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    
    /* Batch Operations Section */
    .batch-operations-section {
      background: linear-gradient(145deg, #1a3d3d 0%, #0f2f2f 100%);
      border: 2px solid #00ffcc;
      border-radius: 4px;
      padding: 8px;
      margin: 8px;
      box-shadow: 0 0 15px rgba(0, 255, 204, 0.3);
    }
    
    .batch-title {
      font-size: 10px;
      color: #00ffcc;
      text-shadow: 0 0 10px rgba(0, 255, 204, 0.6);
      margin: 0 0 8px 0;
      text-align: center;
    }
    
    .batch-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }
    
    .btn-batch {
      padding: 6px 4px;
      background: linear-gradient(180deg, #2a4d4d 0%, #1a3d3d 100%);
      border: 1px solid #00ffcc;
      color: #00ffcc;
      cursor: pointer;
      font-family: inherit;
      font-size: 7px;
      transition: all 0.2s;
      box-shadow: 0 0 5px rgba(0, 255, 204, 0.3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .btn-batch:hover {
      background: linear-gradient(180deg, #3a6d6d 0%, #2a5d5d 100%);
      box-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
      transform: translateY(-1px);
    }
    
    .btn-batch:active {
      transform: translateY(1px);
    }
    
    .batch-info {
      font-size: 7px;
      color: rgba(0, 255, 204, 0.6);
      text-align: center;
      padding: 4px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 2px;
    }
    
    .selection-badge {
      background: rgba(0, 255, 204, 0.2);
      color: #00ffcc;
      padding: 2px 6px;
      border: 1px solid rgba(0, 255, 204, 0.4);
      font-size: 8px;
      border-radius: 2px;
      margin-left: 8px;
      height: 100%;
      overflow-y: auto;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      font-size: 9px;
    }
    
    .properties-title {
      background: linear-gradient(180deg, #005500 0%, #003300 100%);
      color: #00ff00;
      padding: 8px;
      font-weight: normal;
      font-size: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 2px solid #00ff00;
      text-shadow: 0 0 10px rgba(0, 255, 0, 0.6);
    }
    
    .title-icon {
      font-size: 12px;
    }
    
    .property-section {
      padding: 12px 8px;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    }
    
    .property-section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      margin: 0 0 10px 0;
      font-size: 10px;
      font-weight: normal;
      color: #00ff00;
      display: flex;
      align-items: center;
      gap: 6px;
      text-shadow: 0 0 5px rgba(0, 255, 0, 0.4);
    }
    
    .property-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .property-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .property-field label {
      font-size: 8px;
      color: #90ee90;
      font-weight: normal;
    }
    
    .number-input-small {
      width: 100%;
      padding: 4px;
      border: 1px solid #00ff00;
      background: rgba(0, 0, 0, 0.6);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 9px;
    }
    
    .section-title input[type="checkbox"] {
      margin: 0;
    }
    
    .section-title label {
      margin: 0;
      cursor: pointer;
    }
    
    .property-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      gap: 8px;
    }
    
    .property-row label {
      flex: 0 0 80px;
      font-size: 8px;
      color: #90ee90;
    }
    
    .effect-subsection {
      padding: 8px 0;
      border-bottom: 1px solid rgba(0, 255, 0, 0.1);
    }
    
    .effect-subsection:last-child {
      border-bottom: none;
    }
    
    .effect-subsection > label {
      margin-left: 6px;
      font-size: 9px;
      color: #00ff00;
      cursor: pointer;
    }
    
    .effect-controls {
      margin-top: 8px;
      margin-left: 20px;
      padding-left: 8px;
      border-left: 2px solid rgba(0, 255, 0, 0.3);
    }
    
    .custom-dither-controls {
      margin-top: 8px;
      margin-left: 20px;
      padding-left: 8px;
      border-left: 2px solid rgba(0, 255, 0, 0.3);
    }
    
    .slider {
      flex: 1;
      height: 16px;
    }
    
    .value-display {
      flex: 0 0 50px;
      text-align: right;
      font-size: 8px;
      color: #00ff00;
    }
    
    .color-picker-row {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .color-input {
      width: 50px;
      height: 30px;
      border: 1px solid #00ff00;
      background: rgba(0, 0, 0, 0.6);
      cursor: pointer;
    }
    
    .color-value {
      font-family: 'Courier New', monospace;
      font-size: 8px;
      color: #90ee90;
    }
    
    .select-input {
      flex: 1;
      padding: 4px;
      border: 1px solid #00ff00;
      background: rgba(0, 0, 0, 0.6);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 9px;
    }
    
    .textarea-input {
      width: 100%;
      padding: 4px;
      border: 1px solid #00ff00;
      background: rgba(0, 0, 0, 0.6);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 9px;
      resize: vertical;
      min-height: 50px;
    }
    
    .button-group-inline {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    
    .btn-toggle {
      flex: 1;
      padding: 4px 8px;
      background: rgba(0, 40, 0, 0.6);
      border: 1px solid rgba(0, 255, 0, 0.3);
      color: #00ff00;
      cursor: pointer;
      font-size: 10px;
      transition: all 0.2s;
    }
    
    .btn-toggle:hover {
      background: rgba(0, 60, 0, 0.8);
      border-color: #00ff00;
    }
    
    .btn-toggle.active {
      background: rgba(0, 120, 0, 0.9);
      border-color: #00ff00;
      box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
    }
    
    .btn-action {
      width: 100%;
      padding: 6px 12px;
      margin-bottom: 6px;
      background: linear-gradient(180deg, #2a4d2a 0%, #1a3d1a 100%);
      border: 1px solid #00ff00;
      color: #00ff00;
      cursor: pointer;
      font-family: inherit;
      font-size: 8px;
      transition: all 0.2s;
      box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
    }
    
    .btn-action:hover {
      background: linear-gradient(180deg, #3a5d3a 0%, #2a4d2a 100%);
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    }
    
    .btn-action:active {
      transform: translateY(1px);
    }
    
    .btn-danger:hover {
      background: linear-gradient(180deg, #6d2a2a 0%, #5d1a1a 100%);
      border-color: #ff6666;
      color: #ff6666;
    }
    
    .hint {
      font-size: 7px;
      color: rgba(0, 255, 0, 0.4);
      font-style: italic;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(0, 255, 0, 0.4);
    }
    
    .empty-state .hint {
      font-size: 8px;
      margin-top: 8px;
    }
  `]
})
export class LayerPropertiesComponent {
  private compositionService = inject(CompositionService);
  private modalService = inject(ModalService);
  private historyService = inject(HistoryService);
  private storageService = inject(StorageService);
  private ditheringService = inject(DitheringService);
  
  // Expose Math for template
  Math = Math;
  
  // Palettes for custom dither
  palettes = signal(this.ditheringService.getAvailablePalettes());
  customPalettes = signal(this.storageService.getCustomPalettes());
  
  // Signals
  compositionState = this.compositionService.compositionState;
  activeLayer = computed(() => {
    const state = this.compositionState();
    return state.layers.find(l => l.id === state.activeLayerId) || null;
  });
  
  selectedLayers = computed(() => {
    return this.compositionService.getSelectedLayers();
  });
  
  /**
   * Update Methods
   */
  
  updateLayer(layer: CompositionLayer): void {
    this.compositionService.updateLayer(layer.id, layer);
  }
  
  /**
   * Layer Effects Management
   */
  
  toggleEffect(layer: CompositionLayer, effectType: string, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    
    if (!layer.effects) {
      layer.effects = {};
    }
    
    switch (effectType) {
      case 'stroke':
        layer.effects.stroke = {
          enabled,
          color: '#ffffff',
          width: 3,
          position: 'outside'
        };
        break;
        
      case 'dropShadow':
        layer.effects.dropShadow = {
          enabled,
          color: '#000000',
          opacity: 75,
          angle: 135,
          distance: 10,
          spread: 0,
          size: 10
        };
        break;
        
      case 'outerGlow':
        layer.effects.outerGlow = {
          enabled,
          color: '#ffffff',
          opacity: 75,
          size: 10,
          spread: 0
        };
        break;
    }
    
    this.updateLayer(layer);
  }
  
  updateEffectProperty(layer: CompositionLayer, effectType: string, property: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.type === 'range' ? parseFloat(target.value) : target.value;
    
    if (layer.effects && layer.effects[effectType as keyof typeof layer.effects]) {
      const effect = layer.effects[effectType as keyof typeof layer.effects] as any;
      effect[property] = value;
      this.updateLayer(layer);
    }
  }
  
  /**
   * Background Removal
   */
  
  pickBackgroundColor(layer: CompositionLayer): void {
    // Create a simple color picker modal
    const canvas = document.createElement('canvas');
    canvas.width = layer.imageData.width;
    canvas.height = layer.imageData.height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(layer.imageData, 0, 0);
    
    // Scale down for preview
    const maxSize = 400;
    const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = canvas.width * scale;
    previewCanvas.height = canvas.height * scale;
    
    const previewCtx = previewCanvas.getContext('2d')!;
    previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #c0c0c0;
      border: 2px solid #ffffff;
      border-right-color: #000000;
      border-bottom-color: #000000;
      padding: 16px;
      z-index: 10000;
      font-family: 'MS Sans Serif', sans-serif;
    `;
    
    const title = document.createElement('div');
    title.textContent = 'Click on a color to pick';
    title.style.cssText = 'margin-bottom: 12px; font-weight: bold;';
    
    previewCanvas.style.cssText = 'cursor: crosshair; border: 1px solid #000000;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cancel';
    closeBtn.style.cssText = `
      margin-top: 12px;
      padding: 4px 12px;
      background: #c0c0c0;
      border: 2px solid #ffffff;
      border-right-color: #000000;
      border-bottom-color: #000000;
      cursor: pointer;
    `;
    
    modal.appendChild(title);
    modal.appendChild(previewCanvas);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    // Handle click
    previewCanvas.onclick = (e) => {
      const rect = previewCanvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / scale);
      const y = Math.floor((e.clientY - rect.top) / scale);
      
      const imageData = ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;
      
      const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
      
      layer.backgroundColor = hex;
      this.updateLayer(layer);
      
      document.body.removeChild(modal);
    };
    
    closeBtn.onclick = () => {
      document.body.removeChild(modal);
    };
  }
  
  /**
   * Actions
   */
  
  resetTransform(layer: CompositionLayer): void {
    const state = this.compositionState();
    
    this.compositionService.updateLayer(layer.id, {
      x: (state.canvasWidth - layer.imageData.width) / 2,
      y: (state.canvasHeight - layer.imageData.height) / 2,
      width: layer.imageData.width,
      height: layer.imageData.height,
      rotation: 0,
      opacity: 100
    });
  }
  
  fitToCanvas(layer: CompositionLayer): void {
    const state = this.compositionState();
    
    const scaleX = state.canvasWidth / layer.imageData.width;
    const scaleY = state.canvasHeight / layer.imageData.height;
    const scale = Math.min(scaleX, scaleY);
    
    const newWidth = layer.imageData.width * scale;
    const newHeight = layer.imageData.height * scale;
    
    this.compositionService.updateLayer(layer.id, {
      x: (state.canvasWidth - newWidth) / 2,
      y: (state.canvasHeight - newHeight) / 2,
      width: newWidth,
      height: newHeight
    });
  }
  
  deleteLayer(layer: CompositionLayer): void {
    this.modalService.confirm(
      `Are you sure you want to delete layer "${layer.name}"?`,
      'Delete Layer'
    ).then(confirmed => {
      if (confirmed) {
        const command = new DeleteLayerCommand(this.compositionService, layer.id);
        this.historyService.record(command);
        this.compositionService.removeLayer(layer.id);
      }
    });
  }
  
  /**
   * Custom Dither Methods
   */
  
  toggleCustomDither(layer: CompositionLayer, enabled: boolean): void {
    if (enabled) {
      // Initialize custom dither with default values
      this.compositionService.updateLayer(layer.id, {
        customDither: {
          enabled: true,
          algorithm: 'floyd-steinberg',
          palette: 'monochrome',
          threshold: 128,
          bayerLevel: 4,
          scale: 1,
          contrast: 50,
          midtones: 50,
          highlights: 50,
          blur: 0
        }
      });
    } else {
      // Disable custom dither
      this.compositionService.updateLayer(layer.id, {
        customDither: {
          enabled: false,
          algorithm: 'floyd-steinberg',
          palette: 'monochrome',
          threshold: 128,
          bayerLevel: 4,
          scale: 1,
          contrast: 50,
          midtones: 50,
          highlights: 50,
          blur: 0
        }
      });
    }
  }
  
  updateCustomDither(
    layer: CompositionLayer, 
    property: 'algorithm' | 'palette' | 'threshold' | 'bayerLevel' | 'scale' | 'contrast' | 'midtones' | 'highlights' | 'blur', 
    value: any
  ): void {
    if (!layer.customDither) return;
    
    const numericFields = ['threshold', 'bayerLevel', 'scale', 'contrast', 'midtones', 'highlights', 'blur'];
    const updatedDither = {
      ...layer.customDither,
      [property]: numericFields.includes(property) ? Number(value) : value
    };
    
    this.compositionService.updateLayer(layer.id, {
      customDither: updatedDither
    });
  }
  
  /**
   * Text Layer Methods
   */
  
  updateTextContent(layer: CompositionLayer, newContent: string): void {
    if (layer.type !== 'text') return;
    this.rerenderTextLayer(layer, { textContent: newContent });
  }
  
  updateTextProperty(layer: CompositionLayer, property: string, value: any): void {
    if (layer.type !== 'text') return;
    this.rerenderTextLayer(layer, { [property]: value });
  }
  
  toggleTextBold(layer: CompositionLayer): void {
    if (layer.type !== 'text') return;
    this.rerenderTextLayer(layer, { textBold: !layer.textBold });
  }
  
  toggleTextItalic(layer: CompositionLayer): void {
    if (layer.type !== 'text') return;
    this.rerenderTextLayer(layer, { textItalic: !layer.textItalic });
  }
  
  private rerenderTextLayer(layer: CompositionLayer, updates: Partial<CompositionLayer>): void {
    // Merge updates with current layer properties
    const text = updates.textContent !== undefined ? updates.textContent : layer.textContent || '';
    const fontFamily = updates.textFontFamily !== undefined ? updates.textFontFamily : layer.textFontFamily || 'Arial';
    const fontSize = updates.textFontSize !== undefined ? updates.textFontSize : layer.textFontSize || 32;
    const textColor = updates.textColor !== undefined ? updates.textColor : layer.textColor || '#000000';
    const textBold = updates.textBold !== undefined ? updates.textBold : layer.textBold || false;
    const textItalic = updates.textItalic !== undefined ? updates.textItalic : layer.textItalic || false;
    const textStrokeEnabled = updates.textStrokeEnabled !== undefined ? updates.textStrokeEnabled : layer.textStrokeEnabled || false;
    const textStrokeColor = updates.textStrokeColor !== undefined ? updates.textStrokeColor : layer.textStrokeColor || '#000000';
    const textStrokeWidth = updates.textStrokeWidth !== undefined ? updates.textStrokeWidth : layer.textStrokeWidth || 2;
    
    if (!text) return;
    
    // Create temp canvas to re-render text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Configure font
    const fontStyle = `${textBold ? 'bold ' : ''}${textItalic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
    tempCtx.font = fontStyle;
    
    // Measure text
    const metrics = tempCtx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const strokePadding = textStrokeEnabled ? (textStrokeWidth * 2) : 0;
    const textHeight = Math.ceil(fontSize * 1.2);
    
    // Set canvas size
    tempCanvas.width = textWidth + 20 + strokePadding;
    tempCanvas.height = textHeight + 20 + strokePadding;
    
    // Re-apply font after resize
    tempCtx.font = fontStyle;
    tempCtx.textAlign = 'left';
    tempCtx.textBaseline = 'middle';
    
    const textX = 10 + strokePadding / 2;
    const textY = tempCanvas.height / 2;
    
    // Draw stroke first
    if (textStrokeEnabled && textStrokeWidth > 0) {
      tempCtx.strokeStyle = textStrokeColor;
      tempCtx.lineWidth = textStrokeWidth;
      tempCtx.lineJoin = 'round';
      tempCtx.miterLimit = 2;
      tempCtx.strokeText(text, textX, textY);
    }
    
    // Draw fill text
    tempCtx.fillStyle = textColor;
    tempCtx.fillText(text, textX, textY);
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Create new image
    const img = new Image();
    img.src = tempCanvas.toDataURL();
    img.onload = () => {
      this.compositionService.updateLayer(layer.id, {
        image: img,
        imageData: imageData,
        width: tempCanvas.width,
        height: tempCanvas.height,
        textContent: text,
        textFontFamily: fontFamily,
        textFontSize: fontSize,
        textColor: textColor,
        textBold: textBold,
        textItalic: textItalic,
        textStrokeEnabled: textStrokeEnabled,
        textStrokeColor: textStrokeColor,
        textStrokeWidth: textStrokeWidth,
        name: `Text: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`
      });
    };
  }
  
  /**
   * Shape Layer Methods
   */
  
  updateShapeProperty(layer: CompositionLayer, property: string, value: any): void {
    if (layer.type !== 'shape') return;
    this.rerenderShapeLayer(layer, { [property]: value });
  }
  
  private rerenderShapeLayer(layer: CompositionLayer, updates: Partial<CompositionLayer>): void {
    // Merge updates with current layer properties
    const shapeType = updates.shapeType !== undefined ? updates.shapeType : layer.shapeType || 'rectangle';
    const shapeFilled = updates.shapeFilled !== undefined ? updates.shapeFilled : (layer.shapeFilled ?? true);
    const shapeFillColor = updates.shapeFillColor !== undefined ? updates.shapeFillColor : layer.shapeFillColor || '#ffffff';
    const shapeStrokeColor = updates.shapeStrokeColor !== undefined ? updates.shapeStrokeColor : layer.shapeStrokeColor || '#000000';
    const shapeStrokeWidth = updates.shapeStrokeWidth !== undefined ? updates.shapeStrokeWidth : layer.shapeStrokeWidth || 2;
    
    const width = layer.width;
    const height = layer.height;
    
    // Create temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Draw the shape
    tempCtx.fillStyle = shapeFilled ? shapeFillColor : 'transparent';
    tempCtx.strokeStyle = shapeStrokeColor;
    tempCtx.lineWidth = shapeStrokeWidth;
    
    switch (shapeType) {
      case 'rectangle':
        if (shapeFilled) {
          tempCtx.fillRect(0, 0, width, height);
        }
        if (shapeStrokeWidth > 0) {
          tempCtx.strokeRect(0, 0, width, height);
        }
        break;
        
      case 'circle':
      case 'ellipse':
        tempCtx.beginPath();
        tempCtx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        if (shapeFilled) {
          tempCtx.fill();
        }
        if (shapeStrokeWidth > 0) {
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
    
    // Create new image
    const img = new Image();
    img.src = tempCanvas.toDataURL();
    img.onload = () => {
      this.compositionService.updateLayer(layer.id, {
        image: img,
        imageData: imageData,
        shapeType: shapeType,
        shapeFilled: shapeFilled,
        shapeFillColor: shapeFillColor,
        shapeStrokeColor: shapeStrokeColor,
        shapeStrokeWidth: shapeStrokeWidth,
        name: `Shape: ${shapeType}`
      });
    };
  }

  /**
   * ===== BATCH OPERATIONS =====
   */

  batchApplyTint(): void {
    const active = this.activeLayer();
    if (!active || this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    
    // Apply active layer's tint settings to all selected
    const updates: Partial<CompositionLayer> = {
      tint: active.tint,
      tintColor: active.tintColor,
      tintIntensity: active.tintIntensity,
      tintBlendMode: active.tintBlendMode
    };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Apply tint to ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchApplyDither(): void {
    const active = this.activeLayer();
    if (!active || this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    
    // Apply active layer's custom dither to all selected
    const updates: Partial<CompositionLayer> = {
      customDither: active.customDither ? { ...active.customDither } : undefined
    };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Apply custom dither to ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchRemoveBackground(): void {
    const active = this.activeLayer();
    if (!active || this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    
    // Apply active layer's background removal to all selected
    const updates: Partial<CompositionLayer> = {
      removeBackground: active.removeBackground,
      backgroundColor: active.backgroundColor,
      backgroundThreshold: active.backgroundThreshold
    };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Apply background removal to ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchSetOpacity(): void {
    const active = this.activeLayer();
    if (!active || this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    
    const updates: Partial<CompositionLayer> = {
      opacity: active.opacity
    };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Set opacity to ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchToggleDitherExempt(): void {
    if (this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    const firstLayer = this.selectedLayers()[0];
    
    // Toggle to opposite of first selected layer
    const updates: Partial<CompositionLayer> = {
      ditherExempt: !firstLayer.ditherExempt
    };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Toggle dither exempt for ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchLock(): void {
    if (this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    const updates: Partial<CompositionLayer> = { locked: true };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Lock ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchUnlock(): void {
    if (this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    const updates: Partial<CompositionLayer> = { locked: false };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Unlock ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchShow(): void {
    if (this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    const updates: Partial<CompositionLayer> = { visible: true };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Show ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }

  batchHide(): void {
    if (this.selectedLayers().length < 2) return;

    const layerIds = this.selectedLayers().map(l => l.id);
    const updates: Partial<CompositionLayer> = { visible: false };

    const command = new BatchUpdateLayersCommand(
      this.compositionService,
      layerIds,
      updates,
      `Hide ${layerIds.length} layers`
    );

    this.historyService.record(command);
    command.execute();
  }
}
