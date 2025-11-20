import { Injectable } from '@angular/core';
import { CompositionLayer } from '../models/composition-layer.interface';

/**
 * Command pattern interface for undo/redo operations
 */
export interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

/**
 * Add Layer Command
 */
export class AddLayerCommand implements Command {
  description: string;

  constructor(
    private compositionService: any,
    private layer: CompositionLayer
  ) {
    this.description = `Add layer "${layer.name}"`;
  }

  execute(): void {
    // Re-add the layer with the same ID
    this.compositionService.addLayerWithId(this.layer);
  }

  undo(): void {
    this.compositionService.deleteLayer(this.layer.id);
  }
}

/**
 * Delete Layer Command
 */
export class DeleteLayerCommand implements Command {
  description: string;
  private deletedLayer: CompositionLayer;
  private layerIndex: number;

  constructor(
    private compositionService: any,
    layerId: string
  ) {
    const state = this.compositionService.compositionState();
    this.layerIndex = state.layers.findIndex((l: CompositionLayer) => l.id === layerId);
    this.deletedLayer = state.layers[this.layerIndex];
    this.description = `Delete layer "${this.deletedLayer.name}"`;
  }

  execute(): void {
    this.compositionService.deleteLayer(this.deletedLayer.id);
  }

  undo(): void {
    this.compositionService.addLayerAtIndex(this.deletedLayer, this.layerIndex);
  }
}

/**
 * Move Layer Command
 */
export class MoveLayerCommand implements Command {
  description: string;

  constructor(
    private compositionService: any,
    private layerId: string,
    private oldPosition: { x: number; y: number },
    private newPosition: { x: number; y: number }
  ) {
    this.description = `Move layer`;
  }

  execute(): void {
    this.compositionService.updateLayer(this.layerId, {
      x: this.newPosition.x,
      y: this.newPosition.y
    });
  }

  undo(): void {
    this.compositionService.updateLayer(this.layerId, {
      x: this.oldPosition.x,
      y: this.oldPosition.y
    });
    console.log(`🔙 Undo Move: (${this.newPosition.x}, ${this.newPosition.y}) → (${this.oldPosition.x}, ${this.oldPosition.y})`);
  }
}

/**
 * Transform Layer Command (resize, rotate)
 */
export class TransformLayerCommand implements Command {
  description: string;

  constructor(
    private compositionService: any,
    private layerId: string,
    private oldTransform: Partial<CompositionLayer>,
    private newTransform: Partial<CompositionLayer>
  ) {
    this.description = `Transform layer`;
  }

  execute(): void {
    this.compositionService.updateLayer(this.layerId, this.newTransform);
  }

  undo(): void {
    this.compositionService.updateLayer(this.layerId, this.oldTransform);
    console.log(`🔙 Undo Transform:`, this.oldTransform);
  }
}

/**
 * Update Layer Properties Command
 */
export class UpdateLayerCommand implements Command {
  description: string;

  constructor(
    private compositionService: any,
    private layerId: string,
    private oldProperties: Partial<CompositionLayer>,
    private newProperties: Partial<CompositionLayer>,
    description?: string
  ) {
    this.description = description || `Update layer`;
  }

  execute(): void {
    this.compositionService.updateLayer(this.layerId, this.newProperties);
  }

  undo(): void {
    this.compositionService.updateLayer(this.layerId, this.oldProperties);
  }
}

/**
 * Reorder Layers Command
 */
export class ReorderLayersCommand implements Command {
  description: string;

  constructor(
    private compositionService: any,
    private oldIndex: number,
    private newIndex: number
  ) {
    this.description = `Reorder layers`;
  }

  execute(): void {
    this.compositionService.reorderLayer(this.oldIndex, this.newIndex);
  }

  undo(): void {
    this.compositionService.reorderLayer(this.newIndex, this.oldIndex);
  }
}

/**
 * Batch Update Layers Command - Updates multiple layers at once
 */
export class BatchUpdateLayersCommand implements Command {
  description: string;
  private oldStates: Map<string, Partial<CompositionLayer>>;
  private newStates: Map<string, Partial<CompositionLayer>>;

  constructor(
    private compositionService: any,
    layerIds: string[],
    updates: Partial<CompositionLayer>,
    description?: string
  ) {
    const state = this.compositionService.compositionState();
    this.oldStates = new Map();
    this.newStates = new Map();

    // Store old values for each layer
    layerIds.forEach(layerId => {
      const layer = state.layers.find((l: CompositionLayer) => l.id === layerId);
      if (layer) {
        const oldState: Partial<CompositionLayer> = {};
        Object.keys(updates).forEach(key => {
          oldState[key as keyof CompositionLayer] = layer[key as keyof CompositionLayer];
        });
        this.oldStates.set(layerId, oldState);
        this.newStates.set(layerId, updates);
      }
    });

    this.description = description || `Update ${layerIds.length} layers`;
  }

  execute(): void {
    this.newStates.forEach((updates, layerId) => {
      this.compositionService.updateLayer(layerId, updates);
    });
  }

  undo(): void {
    this.oldStates.forEach((oldState, layerId) => {
      this.compositionService.updateLayer(layerId, oldState);
    });
    console.log(`🔙 Undo batch update: ${this.oldStates.size} layers`);
  }
}

/**
 * Batch Add Layers Command - Add multiple layers at once (for duplicate/paste)
 */
export class BatchAddLayersCommand implements Command {
  description: string;
  private layers: CompositionLayer[];

  constructor(
    private compositionService: any,
    layers: CompositionLayer[],
    description?: string
  ) {
    // Store layers (they are already cloned by the caller)
    this.layers = layers;
    this.description = description || `Add ${layers.length} layers`;
  }

  execute(): void {
    // Add all layers to the composition
    this.layers.forEach(layer => {
      this.compositionService.addLayerWithId(layer);
    });
    
    // Select the newly added layers
    const layerIds = this.layers.map(l => l.id);
    this.compositionService.selectMultipleLayers(layerIds);
  }

  undo(): void {
    // Delete in reverse order
    [...this.layers].reverse().forEach(layer => {
      this.compositionService.deleteLayer(layer.id);
    });
    console.log(`🔙 Undo add ${this.layers.length} layers`);
  }
}

/**
 * History Service for Undo/Redo
 */
@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize = 50;
  private isExecuting = false;

  /**
   * Execute a command and add it to history
   */
  execute(command: Command): void {
    if (this.isExecuting) return; // Prevent recursive calls

    this.isExecuting = true;
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack when new command is executed

    // Trim history if too large
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    this.isExecuting = false;
  }

  /**
   * Record a command without executing it (for actions already performed)
   */
  record(command: Command): void {
    if (this.isExecuting) return;

    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack

    // Trim history if too large
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last command
   */
  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    this.isExecuting = true;
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    this.isExecuting = false;

    console.log(`Undid: ${command.description}`);
    return true;
  }

  /**
   * Redo the last undone command
   */
  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    this.isExecuting = true;
    const command = this.redoStack.pop()!;
    command.execute();
    this.undoStack.push(command);
    this.isExecuting = false;

    console.log(`Redid: ${command.description}`);
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack description
   */
  getUndoDescription(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  /**
   * Get redo stack description
   */
  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get history size
   */
  getHistorySize(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length
    };
  }
}
