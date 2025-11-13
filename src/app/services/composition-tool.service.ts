import { Injectable, signal } from '@angular/core';

export type ToolType = 'select' | 'hand' | 'zoom' | 'shape' | 'text' | 'brush';
export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'polygon' | 'star' | 'line';

export interface ToolOptions {
  // Shape options
  shapeType?: ShapeType;
  shapeFillColor?: string;
  shapeStrokeColor?: string;
  shapeStrokeWidth?: number;
  shapeFilled?: boolean;
  
  // Text options
  textContent?: string;
  textFontFamily?: string;
  textFontSize?: number;
  textColor?: string;
  textBold?: boolean;
  textItalic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  textStrokeEnabled?: boolean;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  
  // Brush options
  brushSize?: number;
  brushColor?: string;
  brushOpacity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CompositionToolService {
  activeTool = signal<ToolType>('select');
  
  toolOptions = signal<ToolOptions>({
    // Shape defaults
    shapeType: 'rectangle',
    shapeFillColor: '#ffffff',
    shapeStrokeColor: '#000000',
    shapeStrokeWidth: 2,
    shapeFilled: true,
    
    // Text defaults
    textFontFamily: 'Arial',
    textFontSize: 32,
    textColor: '#000000',
    textBold: false,
    textItalic: false,
    textAlign: 'left',
    textStrokeEnabled: false,
    textStrokeColor: '#000000',
    textStrokeWidth: 2,
    
    // Brush defaults
    brushSize: 10,
    brushColor: '#000000',
    brushOpacity: 100
  });
  
  setTool(tool: ToolType): void {
    this.activeTool.set(tool);
  }
  
  updateOptions(options: Partial<ToolOptions>): void {
    this.toolOptions.update(current => ({ ...current, ...options }));
  }
}
