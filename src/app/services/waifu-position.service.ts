import { Injectable, signal } from '@angular/core';

export type WaifuPosition = 'floating-bottom-right' | 'hidden';

@Injectable({
  providedIn: 'root'
})
export class WaifuPositionService {
  position = signal<WaifuPosition>('floating-bottom-right');
  dragPosition = signal<{ x: number; y: number }>({ x: 100, y: 500 });
  
  constructor() {
    this.loadPosition();
  }
  
  private loadPosition() {
    const savedPosition = localStorage.getItem('waifu-position') as WaifuPosition;
    // Si hay una posición guardada válida, usarla
    if (savedPosition && ['floating-bottom-right', 'hidden'].includes(savedPosition)) {
      this.position.set(savedPosition);
    } else {
      // Si la posición guardada es inválida (ej: 'above-controls' que ya no existe)
      // o no hay nada guardado, usar 'floating-bottom-right' por defecto
      this.position.set('floating-bottom-right');
      localStorage.setItem('waifu-position', 'floating-bottom-right');
    }
    
    const savedDragPos = localStorage.getItem('waifu-drag-position');
    if (savedDragPos) {
      try {
        const pos = JSON.parse(savedDragPos);
        this.dragPosition.set(pos);
      } catch (e) {
        // Invalid JSON, use defaults
      }
    }
  }
  
  setPosition(newPosition: WaifuPosition) {
    this.position.set(newPosition);
    localStorage.setItem('waifu-position', newPosition);
  }
  
  setDragPosition(pos: { x: number; y: number }) {
    this.dragPosition.set(pos);
    localStorage.setItem('waifu-drag-position', JSON.stringify(pos));
  }
  
  showWaifu() {
    // Restaurar a la última posición visible o por defecto a floating-bottom-right
    this.setPosition('floating-bottom-right');
  }
}
