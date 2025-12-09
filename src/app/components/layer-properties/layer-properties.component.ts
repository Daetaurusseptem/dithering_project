import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompositionService } from '../../services/composition.service';
import { ModalService } from '../../services/modal.service';
import { HistoryService, DeleteLayerCommand, BatchUpdateLayersCommand, UpdateLayerCommand } from '../../services/history.service';
import { CompositionToolService } from '../../services/composition-tool.service';
import { StorageService } from '../../services/storage.service';
import { DitheringService } from '../../services/dithering.service';
import { AiBackgroundRemovalService } from '../../services/ai-background-removal.service';
import { CompositionLayer, BlendMode } from '../../models/composition-layer.interface';

@Component({
  selector: 'app-layer-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="layer-properties-panel">
      <div class="properties-scroll-container">
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
              <label>Method</label>
              <div class="button-group-inline">
                <button 
                  class="btn-toggle"
                  [class.active]="layer.useAiRemoval"
                  (click)="layer.useAiRemoval = true; updateLayer(layer)">
                  🤖 AI
                </button>
                <button 
                  class="btn-toggle"
                  [class.active]="!layer.useAiRemoval"
                  (click)="layer.useAiRemoval = false; updateLayer(layer)">
                  🎨 Manual
                </button>
              </div>
            </div>
            
            @if (!layer.useAiRemoval) {
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
            
            @if (layer.useAiRemoval) {
              <button 
                class="btn-action"
                [disabled]="aiStatus().processing"
                (click)="applyAiBackgroundRemoval(layer)">
                @if (aiStatus().processing) {
                  ⏳ {{ aiMessage() }} ({{ aiStatus().progress }}%)
                } @else {
                  🤖 Apply AI Background Removal
                }
              </button>
            }
            
            <!-- Crop to Content Button -->
            <button 
              class="btn-action"
              (click)="cropLayerToContent(layer)"
              title="Remove transparent borders">
              ✂️ Crop to Content
            </button>
            
            <div class="hint">
              @if (layer.useAiRemoval) {
                AI-powered removal (RMBG-1.4 quantized ~25MB)
                @if (!aiStatus().initialized) {
                  <br>
                  Model will download on first use (one-time, cached after)
                }
              } @else {
                Remove background by color similarity. Pick a color or adjust threshold for best results.
              }
            </div>
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
          <h4 class="section-title">
            Layer Effects (Fusion)
            @if (selectedLayers().length > 1) {
              <span class="batch-indicator">{{ selectedLayers().length }} layers</span>
            }
          </h4>
          
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
          <h4 class="section-title">
            Dithering
            @if (selectedLayers().length > 1) {
              <span class="batch-indicator">{{ selectedLayers().length }} layers</span>
            }
          </h4>
          
          <div class="property-row">
            <input 
              type="checkbox" 
              [(ngModel)]="layer.ditherExempt"
              (ngModelChange)="updateDitherExempt(layer, $event)"
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
    </div>
  `,
  styles: [`
    .layer-properties-panel {
      background: transparent;
      padding: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    .properties-scroll-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
    }
    
    /* Batch Operations Section */
    .batch-operations-section {
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.25));
      border-radius: 6px;
      padding: 1rem;
      margin: 0.75rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .batch-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--theme-text, rgba(255, 255, 255, 0.9));
      margin: 0 0 0.75rem 0;
      text-align: center;
      letter-spacing: 0.5px;
    }
    
    .batch-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    
    .btn-batch {
      padding: 0.5rem 0.75rem;
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      border-radius: 4px;
      color: var(--theme-text, rgba(255, 255, 255, 0.85));
      cursor: pointer;
      font-family: inherit;
      font-size: 0.7rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .btn-batch:hover {
      background: var(--theme-surface, rgba(255, 255, 255, 0.1));
      border-color: var(--theme-primary, rgba(0, 255, 0, 0.5));
      transform: translateY(-1px);
    }
    
    .btn-batch:active {
      transform: translateY(1px);
    }
    
    .batch-info {
      font-size: 7px;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.6));
      text-align: center;
      padding: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 2px;
    }
    
    .selection-badge {
      background: var(--theme-glow, rgba(0, 255, 204, 0.2));
      color: var(--theme-secondary, #00ffcc);
      padding: 2px 6px;
      border: 1px solid var(--theme-border, rgba(0, 255, 204, 0.4));
      font-size: 0.7rem;
      border-radius: 2px;
      margin-left: 8px;
      font-family: 'SF Mono', 'Courier New', monospace;
      font-weight: 600;
    }
    
    .batch-indicator {
      background: var(--theme-glow, rgba(255, 165, 0, 0.2));
      color: var(--theme-accent, #ffaa00);
      padding: 2px 6px;
      border: 1px solid var(--theme-border, rgba(255, 165, 0, 0.4));
      font-size: 7px;
      border-radius: 2px;
      margin-left: auto;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .properties-title {
      background: transparent;
      color: var(--theme-text, rgba(255, 255, 255, 0.95));
      padding: 1rem 1.25rem;
      font-weight: 600;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid var(--theme-border, rgba(0, 255, 0, 0.2));
      letter-spacing: 0.5px;
    }
    
    .title-icon {
      font-size: 12px;
    }
    
    .property-section {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--theme-border, rgba(0, 255, 0, 0.1));
    }
    
    .property-section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      margin: 0 0 0.5rem 0;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.7));
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .property-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    
    .property-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .property-field label {
      font-size: 0.7rem;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.6));
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .number-input-small {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      border-radius: 4px;
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      color: var(--theme-text, rgba(255, 255, 255, 0.9));
      font-family: 'SF Mono', 'Courier New', monospace;
      font-size: 0.8rem;
      transition: all 0.2s ease;
    }
    
    .number-input-small:focus {
      outline: none;
      border-color: var(--theme-primary, #00ff00);
      box-shadow: 0 0 0 2px var(--theme-glow, rgba(0, 255, 0, 0.2));
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
      margin-bottom: 6px;
      gap: 6px;
    }
    
    .property-row label {
      flex: 0 0 70px;
      font-size: 0.7rem;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.6));
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .effect-subsection {
      padding: 6px 0;
      border-bottom: 1px solid var(--theme-border, rgba(0, 255, 0, 0.1));
    }
    
    .effect-subsection:last-child {
      border-bottom: none;
    }
    
    .effect-subsection > label {
      margin-left: 6px;
      font-size: 0.7rem;
      color: var(--theme-primary, #00ff00);
      cursor: pointer;
    }
    
    .effect-controls {
      margin-top: 6px;
      margin-left: 16px;
      padding-left: 6px;
      border-left: 2px solid var(--theme-border, rgba(0, 255, 0, 0.3));
    }
    
    .custom-dither-controls {
      margin-top: 8px;
      margin-left: 20px;
      padding-left: 8px;
      border-left: 2px solid var(--theme-border, rgba(0, 255, 0, 0.3));
    }
    
    .slider {
      flex: 1;
      height: 14px;
      min-width: 0;
    }
    
    .value-display {
      flex: 0 0 50px;
      text-align: right;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--theme-primary, #00ff00);
      font-family: 'SF Mono', 'Courier New', monospace;
    }
    
    .color-picker-row {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .color-input {
      width: 40px;
      height: 24px;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.2s ease;
    }
    
    .color-value {
      font-family: 'SF Mono', 'Courier New', monospace;
      font-size: 0.7rem;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.6));
      font-weight: 500;
    }
    
    .select-input {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      color: var(--theme-text, rgba(255, 255, 255, 0.9));
      font-family: 'SF Mono', 'Courier New', monospace;
      font-size: 0.75rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    
    .textarea-input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      color: var(--theme-text, rgba(255, 255, 255, 0.9));
      font-family: 'SF Mono', 'Courier New', monospace;
      font-size: 0.75rem;
      resize: vertical;
      min-height: 50px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    
    .button-group-inline {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    
    .btn-toggle {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      color: var(--theme-text, rgba(255, 255, 255, 0.85));
      cursor: pointer;
      font-size: 0.7rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 4px;
      font-weight: 500;
    }
    
    .btn-toggle:hover {
      background: var(--theme-surface, rgba(255, 255, 255, 0.1));
      border-color: var(--theme-primary, #00ff00);
      transform: translateY(-1px);
    }
    
    .btn-toggle.active {
      background: var(--theme-primary, #00ff00);
      border-color: var(--theme-primary, #00ff00);
      color: rgba(0, 0, 0, 0.85);
      box-shadow: 0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.5));
    }
    
    .btn-action {
      width: 100%;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.5rem;
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      border: 1.5px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      color: var(--theme-text, rgba(255, 255, 255, 0.9));
      cursor: pointer;
      font-family: inherit;
      font-size: 0.7rem;
      font-weight: 600;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 4px;
    }
    
    .btn-action:hover {
      background: var(--theme-surface, rgba(255, 255, 255, 0.1));
      border-color: var(--theme-primary, #00ff00);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px var(--theme-glow, rgba(0, 255, 0, 0.3));
    }
    
    .btn-action:active {
      transform: translateY(1px);
    }
    
    .btn-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
    
    .btn-danger:hover {
      background: linear-gradient(180deg, #6d2a2a 0%, #5d1a1a 100%);
      border-color: #ff6666;
      color: #ff6666;
    }
    
    .hint {
      font-size: 0.65rem;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.5));
      font-style: italic;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.5));
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
  private toolService = inject(CompositionToolService);
  private historyService = inject(HistoryService);
  private storageService = inject(StorageService);
  private ditheringService = inject(DitheringService);
  private aiBackgroundRemoval = inject(AiBackgroundRemovalService);
  
  // Expose Math for template
  Math = Math;
  
  // AI service status
  aiStatus = this.aiBackgroundRemoval.getStatus.bind(this.aiBackgroundRemoval);
  aiMessage = this.aiBackgroundRemoval.getLoadingMessageSignal();
  
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
    const selectedLayers = this.selectedLayers();
    
    // Prepare effect object based on type
    let effectConfig: any;
    
    switch (effectType) {
      case 'stroke':
        effectConfig = {
          enabled,
          color: layer.effects?.stroke?.color || '#ffffff',
          width: layer.effects?.stroke?.width || 3,
          position: layer.effects?.stroke?.position || 'outside'
        };
        break;
        
      case 'dropShadow':
        effectConfig = {
          enabled,
          color: layer.effects?.dropShadow?.color || '#000000',
          opacity: layer.effects?.dropShadow?.opacity || 75,
          angle: layer.effects?.dropShadow?.angle || 135,
          distance: layer.effects?.dropShadow?.distance || 10,
          spread: layer.effects?.dropShadow?.spread || 0,
          size: layer.effects?.dropShadow?.size || 10
        };
        break;
        
      case 'outerGlow':
        effectConfig = {
          enabled,
          color: layer.effects?.outerGlow?.color || '#ffffff',
          opacity: layer.effects?.outerGlow?.opacity || 75,
          size: layer.effects?.outerGlow?.size || 10,
          spread: layer.effects?.outerGlow?.spread || 0
        };
        break;
    }
    
    // Apply to all selected layers
    if (selectedLayers.length > 1) {
      selectedLayers.forEach(selectedLayer => {
        if (!selectedLayer.effects) {
          selectedLayer.effects = {};
        }
        selectedLayer.effects[effectType as keyof typeof selectedLayer.effects] = effectConfig as any;
        this.updateLayer(selectedLayer);
      });
    } else {
      // Single layer
      if (!layer.effects) {
        layer.effects = {};
      }
      layer.effects[effectType as keyof typeof layer.effects] = effectConfig as any;
      this.updateLayer(layer);
    }
  }
  
  updateEffectProperty(layer: CompositionLayer, effectType: string, property: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.type === 'range' ? parseFloat(target.value) : target.value;
    const selectedLayers = this.selectedLayers();
    
    // Apply to all selected layers
    if (selectedLayers.length > 1) {
      selectedLayers.forEach(selectedLayer => {
        if (selectedLayer.effects && selectedLayer.effects[effectType as keyof typeof selectedLayer.effects]) {
          const effect = selectedLayer.effects[effectType as keyof typeof selectedLayer.effects] as any;
          effect[property] = value;
          this.updateLayer(selectedLayer);
        }
      });
    } else {
      // Single layer
      if (layer.effects && layer.effects[effectType as keyof typeof layer.effects]) {
        const effect = layer.effects[effectType as keyof typeof layer.effects] as any;
        effect[property] = value;
        this.updateLayer(layer);
      }
    }
  }
  
  /**
   * Background Removal
   */
  
  async applyAiBackgroundRemoval(layer: CompositionLayer): Promise<void> {
    try {
      console.log('🤖 Starting AI background removal for layer:', layer.name);
      
      // Apply AI background removal
      const resultImageData = await this.aiBackgroundRemoval.removeBackground(layer.imageData);
      
      // Auto-crop to content bounds
      const croppedData = this.cropToContent(resultImageData);
      
      // Calculate new position to keep image centered at original position
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      const newX = centerX - croppedData.width / 2;
      const newY = centerY - croppedData.height / 2;
      
      // Save undoable state
      const oldImageData = layer.imageData;
      const oldClone = new ImageData(new Uint8ClampedArray(oldImageData.data), oldImageData.width, oldImageData.height);

      const oldProps: any = {
        imageData: oldClone,
        width: layer.width,
        height: layer.height,
        x: layer.x,
        y: layer.y
      };

      const newProps: any = {
        imageData: croppedData,
        width: croppedData.width,
        height: croppedData.height,
        x: newX,
        y: newY
      };

      // Apply update
      this.compositionService.updateLayer(layer.id, newProps);

      // Record undo command
      const cmd = new UpdateLayerCommand(this.compositionService, layer.id, oldProps, newProps, `Auto-crop "${layer.name}"`);
      this.historyService.record(cmd);

      // Switch to select/move tool
      this.toolService.setTool('select');
      
      console.log('✅ AI background removal complete with auto-crop');
    } catch (error) {
      console.error('❌ AI background removal failed:', error);
      alert('Failed to remove background: ' + (error as Error).message);
    }
  }
  
  /**
   * Crop ImageData to non-transparent content bounds
   */
  private cropToContent(imageData: ImageData): ImageData {
    const { data, width, height } = imageData;
    
    // Find bounds of non-transparent pixels
    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // If no content found, return original
    if (minX >= width || minY >= height) {
      return imageData;
    }
    
    // Calculate crop dimensions
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    
    // Create new ImageData with cropped size
    const croppedData = new ImageData(cropWidth, cropHeight);
    
    // Copy cropped region
    for (let y = 0; y < cropHeight; y++) {
      for (let x = 0; x < cropWidth; x++) {
        const srcIndex = ((minY + y) * width + (minX + x)) * 4;
        const dstIndex = (y * cropWidth + x) * 4;
        croppedData.data[dstIndex] = data[srcIndex];
        croppedData.data[dstIndex + 1] = data[srcIndex + 1];
        croppedData.data[dstIndex + 2] = data[srcIndex + 2];
        croppedData.data[dstIndex + 3] = data[srcIndex + 3];
      }
    }
    
    return croppedData;
  }
  
  /**
   * Crop layer to content (remove transparent borders)
   */
  cropLayerToContent(layer: CompositionLayer): void {
    const croppedData = this.cropToContent(layer.imageData);
    
    if (croppedData === layer.imageData) {
      console.log('No transparent borders to crop');
      return;
    }
    
    // Calculate new position to keep image centered
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    const newX = centerX - croppedData.width / 2;
    const newY = centerY - croppedData.height / 2;
    
    // Save undoable state
    const oldImage = layer.imageData;
    const oldImageClone = new ImageData(new Uint8ClampedArray(oldImage.data), oldImage.width, oldImage.height);

    const oldP: any = {
      imageData: oldImageClone,
      width: layer.width,
      height: layer.height,
      x: layer.x,
      y: layer.y
    };

    const newP: any = {
      imageData: croppedData,
      width: croppedData.width,
      height: croppedData.height,
      x: newX,
      y: newY
    };

    this.compositionService.updateLayer(layer.id, newP);

    // Record undo and switch to select tool
    this.historyService.record(new UpdateLayerCommand(this.compositionService, layer.id, oldP, newP, `Crop "${layer.name}"`));
    this.toolService.setTool('select');
    
    console.log(`✂️ Cropped layer from ${layer.width}x${layer.height} to ${croppedData.width}x${croppedData.height}`);
  }
  
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
  
  updateDitherExempt(layer: CompositionLayer, value: boolean): void {
    const selectedLayers = this.selectedLayers();
    
    // Apply to all selected layers
    if (selectedLayers.length > 1) {
      selectedLayers.forEach(selectedLayer => {
        this.compositionService.updateLayer(selectedLayer.id, {
          ditherExempt: value
        });
      });
    } else {
      // Single layer
      this.compositionService.updateLayer(layer.id, {
        ditherExempt: value
      });
    }
  }
  
  toggleCustomDither(layer: CompositionLayer, enabled: boolean): void {
    const selectedLayers = this.selectedLayers();
    
    const ditherConfig = {
      enabled,
      algorithm: layer.customDither?.algorithm || 'floyd-steinberg',
      palette: layer.customDither?.palette || 'monochrome',
      threshold: layer.customDither?.threshold || 128,
      bayerLevel: layer.customDither?.bayerLevel || 4,
      scale: layer.customDither?.scale || 1,
      contrast: layer.customDither?.contrast || 50,
      midtones: layer.customDither?.midtones || 50,
      highlights: layer.customDither?.highlights || 50,
      blur: layer.customDither?.blur || 0
    };
    
    // Apply to all selected layers
    if (selectedLayers.length > 1) {
      selectedLayers.forEach(selectedLayer => {
        this.compositionService.updateLayer(selectedLayer.id, {
          customDither: ditherConfig
        });
      });
    } else {
      // Single layer
      this.compositionService.updateLayer(layer.id, {
        customDither: ditherConfig
      });
    }
  }
  
  updateCustomDither(
    layer: CompositionLayer, 
    property: 'algorithm' | 'palette' | 'threshold' | 'bayerLevel' | 'scale' | 'contrast' | 'midtones' | 'highlights' | 'blur', 
    value: any
  ): void {
    if (!layer.customDither) return;
    
    const selectedLayers = this.selectedLayers();
    const numericFields = ['threshold', 'bayerLevel', 'scale', 'contrast', 'midtones', 'highlights', 'blur'];
    const processedValue = numericFields.includes(property) ? Number(value) : value;
    
    // Apply to all selected layers
    if (selectedLayers.length > 1) {
      selectedLayers.forEach(selectedLayer => {
        if (!selectedLayer.customDither) return;
        
        const updatedDither = {
          ...selectedLayer.customDither,
          [property]: processedValue
        };
        
        this.compositionService.updateLayer(selectedLayer.id, {
          customDither: updatedDither
        });
      });
    } else {
      // Single layer
      const updatedDither = {
        ...layer.customDither,
        [property]: processedValue
      };
      
      this.compositionService.updateLayer(layer.id, {
        customDither: updatedDither
      });
    }
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
