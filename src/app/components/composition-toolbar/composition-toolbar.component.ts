import { Component, signal, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompositionToolService, type ToolType, type ToolOptions } from '../../services/composition-tool.service';

export type { ToolType, ToolOptions, FillType, GradientType } from '../../services/composition-tool.service';
export type { ShapeType } from '../../services/composition-tool.service';

@Component({
  selector: 'app-composition-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="composition-toolbar">
      <!-- Tool Buttons -->
      <div class="tool-buttons">
        <button 
          class="tool-btn"
          [class.active]="activeTool() === 'select'"
          (click)="selectTool('select')"
          title="Select Tool (V)">
          <span class="tool-icon">⬚</span>
        </button>
        
        <button 
          class="tool-btn"
          [class.active]="activeTool() === 'hand'"
          (click)="selectTool('hand')"
          title="Hand Tool (H)">
          <span class="tool-icon">✋</span>
        </button>
        
        <button 
          class="tool-btn"
          [class.active]="activeTool() === 'zoom'"
          (click)="selectTool('zoom')"
          title="Zoom Tool (Z)">
          <span class="tool-icon">🔍</span>
        </button>
        
        <div class="tool-separator"></div>
        
        <button 
          class="tool-btn"
          [class.active]="activeTool() === 'shape'"
          (click)="selectTool('shape')"
          title="Shape Tool (U)">
          <span class="tool-icon">⬜</span>
        </button>
        
        <button 
          class="tool-btn"
          [class.active]="activeTool() === 'text'"
          (click)="selectTool('text')"
          title="Text Tool (T)">
          <span class="tool-icon">T</span>
        </button>
        
        <button 
          class="tool-btn"
          [class.active]="activeTool() === 'brush'"
          (click)="selectTool('brush')"
          title="Brush Tool (B)">
          <span class="tool-icon">🖌</span>
        </button>
      </div>
      
      <!-- Tool Options Panel (Floating) -->
      @if (activeTool() !== 'select' && activeTool() !== 'hand') {
        <div class="tool-options-floating">
          <div class="options-header">
            <h4>{{ getToolName() }}</h4>
          </div>
          
          <div class="options-content">
            <!-- Shape Options -->
            @if (activeTool() === 'shape') {
              <div class="option-group">
                <label>Shape Type:</label>
                <select [(ngModel)]="toolOptions.shapeType" (change)="emitOptionsChange()">
                  <option value="rectangle">Rectangle</option>
                  <option value="circle">Circle</option>
                  <option value="ellipse">Ellipse</option>
                  <option value="polygon">Polygon</option>
                  <option value="star">Star</option>
                  <option value="line">Line</option>
                </select>
              </div>
              
              <div class="option-group">
                <label>Fill Type:</label>
                <select [(ngModel)]="toolOptions.shapeFillType" (change)="emitOptionsChange()">
                  <option value="solid">Solid</option>
                  <option value="gradient">Gradient</option>
                  <option value="none">Transparent</option>
                </select>
              </div>
              
              @if (toolOptions.shapeFillType === 'solid') {
                <div class="option-group">
                  <label>Fill Color:</label>
                  <input type="color" [(ngModel)]="toolOptions.shapeFillColor" (change)="emitOptionsChange()">
                </div>
              }
              
              @if (toolOptions.shapeFillType === 'gradient') {
                <div class="option-group">
                  <label>Gradient Type:</label>
                  <select [(ngModel)]="toolOptions.shapeGradientType" (change)="emitOptionsChange()">
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                </div>
                
                <div class="option-group">
                  <label>Color 1:</label>
                  <input type="color" [(ngModel)]="toolOptions.shapeFillColor" (change)="emitOptionsChange()">
                </div>
                
                <div class="option-group">
                  <label>Color 2:</label>
                  <input type="color" [(ngModel)]="toolOptions.shapeFillColor2" (change)="emitOptionsChange()">
                </div>
                
                @if (toolOptions.shapeGradientType === 'linear') {
                  <div class="option-group">
                    <label>Angle: {{ toolOptions.shapeGradientAngle }}°</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      [(ngModel)]="toolOptions.shapeGradientAngle"
                      (input)="emitOptionsChange()">
                  </div>
                }
              }
              
              <div class="option-group">
                <label>Stroke Color:</label>
                <input type="color" [(ngModel)]="toolOptions.shapeStrokeColor" (change)="emitOptionsChange()">
              </div>
              
              <div class="option-group">
                <label>Stroke Width: {{ toolOptions.shapeStrokeWidth }}px</label>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  [(ngModel)]="toolOptions.shapeStrokeWidth"
                  (input)="emitOptionsChange()">
              </div>
            }
            
            <!-- Text Options -->
            @if (activeTool() === 'text') {
              <div class="option-group">
                <label>Font Family:</label>
                <select [(ngModel)]="toolOptions.textFontFamily" (change)="emitOptionsChange()">
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
              
              <div class="option-group">
                <label>Font Size: {{ toolOptions.textFontSize }}px</label>
                <input 
                  type="range" 
                  min="8" 
                  max="200" 
                  [(ngModel)]="toolOptions.textFontSize"
                  (input)="emitOptionsChange()">
              </div>
              
              <div class="option-group">
                <label>Color:</label>
                <input type="color" [(ngModel)]="toolOptions.textColor" (change)="emitOptionsChange()">
              </div>
              
              <div class="option-group">
                <label>Style:</label>
                <div class="button-group">
                  <button 
                    class="mini-btn"
                    [class.active]="toolOptions.textBold"
                    (click)="toolOptions.textBold = !toolOptions.textBold; emitOptionsChange()">
                    <strong>B</strong>
                  </button>
                  <button 
                    class="mini-btn"
                    [class.active]="toolOptions.textItalic"
                    (click)="toolOptions.textItalic = !toolOptions.textItalic; emitOptionsChange()">
                    <em>I</em>
                  </button>
                </div>
              </div>
              
              <div class="option-group">
                <label>Alignment:</label>
                <div class="button-group">
                  <button 
                    class="mini-btn"
                    [class.active]="toolOptions.textAlign === 'left'"
                    (click)="toolOptions.textAlign = 'left'; emitOptionsChange()">
                    ⬅
                  </button>
                  <button 
                    class="mini-btn"
                    [class.active]="toolOptions.textAlign === 'center'"
                    (click)="toolOptions.textAlign = 'center'; emitOptionsChange()">
                    ↔
                  </button>
                  <button 
                    class="mini-btn"
                    [class.active]="toolOptions.textAlign === 'right'"
                    (click)="toolOptions.textAlign = 'right'; emitOptionsChange()">
                    ➡
                  </button>
                </div>
              </div>
              
              <div class="option-separator"></div>
              
              <div class="option-group">
                <label>
                  <input type="checkbox" [(ngModel)]="toolOptions.textStrokeEnabled" (change)="emitOptionsChange()">
                  Outline/Stroke
                </label>
              </div>
              
              @if (toolOptions.textStrokeEnabled) {
                <div class="option-group">
                  <label>Stroke Color:</label>
                  <input type="color" [(ngModel)]="toolOptions.textStrokeColor" (change)="emitOptionsChange()">
                </div>
                
                <div class="option-group">
                  <label>Stroke Width: {{ toolOptions.textStrokeWidth }}px</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    [(ngModel)]="toolOptions.textStrokeWidth"
                    (input)="emitOptionsChange()">
                </div>
              }
            }
            
            <!-- Brush Options -->
            @if (activeTool() === 'brush') {
              <div class="option-group">
                <label>Brush Size: {{ toolOptions.brushSize }}px</label>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  [(ngModel)]="toolOptions.brushSize"
                  (input)="emitOptionsChange()">
              </div>
              
              <div class="option-group">
                <label>Color:</label>
                <input type="color" [(ngModel)]="toolOptions.brushColor" (change)="emitOptionsChange()">
              </div>
              
              <div class="option-group">
                <label>Opacity: {{ toolOptions.brushOpacity }}%</label>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  [(ngModel)]="toolOptions.brushOpacity"
                  (input)="emitOptionsChange()">
              </div>
            }
            
            <!-- Zoom Options -->
            @if (activeTool() === 'zoom') {
              <div class="option-group">
                <p class="hint">Click to zoom in<br>Alt + Click to zoom out</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .composition-toolbar {
      background: linear-gradient(145deg, var(--theme-background, #1a2d1a) 0%, var(--theme-background, #0f1f0f) 100%);
      border: 2px solid var(--theme-primary, #00ff00);
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      min-width: 60px;
      max-width: 70px;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    
    .tool-buttons {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .tool-separator {
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--theme-primary, #00ff00), transparent);
      margin: 2px 0;
    }
    
    .tool-btn {
      width: 100%;
      height: 36px;
      background: rgba(0, 40, 0, 0.6);
      border: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
      color: var(--theme-primary, #00ff00);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      position: relative;
    }
    
    .tool-btn:hover {
      background: rgba(0, 60, 0, 0.8);
      border-color: var(--theme-primary, #00ff00);
      box-shadow: 0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.4));
      transform: translateX(2px);
    }
    
    .tool-btn.active {
      background: rgba(0, 120, 0, 0.9);
      border-color: var(--theme-primary, #00ff00);
      border-width: 2px;
      box-shadow: 0 0 12px var(--theme-glow, rgba(0, 255, 0, 0.7)),
                  inset 0 0 8px var(--theme-glow, rgba(0, 255, 0, 0.3));
    }
    
    .tool-icon {
      font-size: 18px;
    }
    
    .tool-options-floating {
      position: absolute;
      left: 75px;
      top: 6px;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid var(--theme-primary, #00ff00);
      padding: 10px;
      border-radius: 4px;
      min-width: 200px;
      max-width: 250px;
      box-shadow: 0 4px 20px var(--theme-glow, rgba(0, 255, 0, 0.3));
      z-index: 100;
    }
    
    .options-header h4 {
      color: var(--theme-primary, #00ff00);
      font-size: 9px;
      margin: 0 0 10px 0;
      text-align: center;
      text-shadow: 0 0 5px var(--theme-glow, rgba(0, 255, 0, 0.5));
      padding-bottom: 6px;
      border-bottom: 1px solid var(--theme-border, rgba(0, 255, 0, 0.3));
    }
    
    .options-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .option-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .option-group label {
      color: var(--theme-secondary, #90ee90);
      font-size: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .option-group select,
    .option-group input[type="color"],
    .option-group input[type="range"] {
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(0, 255, 0, 0.5);
      color: #00ff00;
      padding: 4px;
      font-size: 8px;
      font-family: inherit;
    }
    
    .option-group input[type="color"] {
      width: 100%;
      height: 30px;
      cursor: pointer;
    }
    
    .option-group input[type="range"] {
      width: 100%;
      cursor: pointer;
    }
    
    .option-group input[type="checkbox"] {
      width: 12px;
      height: 12px;
      cursor: pointer;
    }
    
    .option-separator {
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.3), transparent);
      margin: 4px 0;
    }
    
    .button-group {
      display: flex;
      gap: 4px;
    }
    
    .mini-btn {
      flex: 1;
      background: rgba(0, 40, 0, 0.6);
      border: 1px solid rgba(0, 255, 0, 0.3);
      color: #00ff00;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 10px;
      transition: all 0.2s;
    }
    
    .mini-btn:hover {
      background: rgba(0, 60, 0, 0.8);
      border-color: #00ff00;
    }
    
    .mini-btn.active {
      background: rgba(0, 120, 0, 0.9);
      border-color: #00ff00;
      box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
    }
    
    .hint {
      color: rgba(0, 255, 0, 0.6);
      font-size: 7px;
      line-height: 1.4;
      text-align: center;
      margin: 0;
    }
  `]
})
export class CompositionToolbarComponent {
  private toolService = inject(CompositionToolService);
  
  activeTool = this.toolService.activeTool;
  toolOptions = this.toolService.toolOptions();
  
  // Outputs (deprecated but keep for backwards compatibility)
  toolChange = output<ToolType>();
  optionsChange = output<ToolOptions>();
  
  constructor() {
    // Sync local toolOptions with service when it changes
    effect(() => {
      this.toolOptions = this.toolService.toolOptions();
    });
  }
  
  selectTool(tool: ToolType): void {
    this.toolService.setTool(tool);
    this.toolChange.emit(tool);
  }
  
  getToolName(): string {
    const names: Record<ToolType, string> = {
      'select': 'Select',
      'hand': 'Hand',
      'zoom': 'Zoom',
      'shape': 'Shape',
      'text': 'Text',
      'brush': 'Brush'
    };
    return names[this.activeTool()];
  }
  
  emitOptionsChange(): void {
    this.toolService.updateOptions(this.toolOptions);
    this.optionsChange.emit({ ...this.toolOptions });
  }
}
