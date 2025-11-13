import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogueService } from '../../services/dialogue.service';
import { WaifuPositionService } from '../../services/waifu-position.service';

interface AffectionParticle {
  id: number;
  value: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-waifu-dialogue',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialogueState().isActive && waifuPosition() !== 'hidden') {
      <div class="speech-bubble">
        <!-- Affection indicator pequeño -->
        <div class="affection-mini" [title]="affectionMessage()">
          <div class="affection-mini-fill" [style.width]="getAffectionPercentage() + '%'" 
               [class.negative]="getAffectionPercentage() < 50"></div>
        </div>

        @if (!dialogueState().isShowingResponse) {
          <!-- Question Mode -->
          <div class="bubble-content">
            <p class="bubble-text">{{ dialogueState().currentDialogue?.question }}</p>
            
            <!-- Options compactas (sin mostrar números) -->
            <div class="bubble-options">
              @for (option of dialogueState().currentDialogue?.options; track $index) {
                <button class="bubble-option" 
                        (click)="selectOption($index)">
                  {{ option.text }}
                </button>
              }
            </div>
          </div>
        } @else {
          <!-- Response Mode -->
          <div class="bubble-content response">
            <p class="bubble-text">{{ dialogueState().waifuResponse }}</p>
            <button class="bubble-continue" (click)="closeDialogue()">OK ▶</button>
          </div>
        }

        <!-- Speech bubble tail -->
        <div class="bubble-tail"></div>
      </div>
    }
    
    <!-- Affection Particles -->
    @for (particle of affectionParticles(); track particle.id) {
      <div class="affection-particle" 
           [class.positive]="particle.value > 0"
           [class.negative]="particle.value < 0"
           [style.left]="getParticleLeft(particle) + 'px'"
           [style.top]="getParticleTop(particle) + 'px'">
        {{ particle.value > 0 ? '+' : '' }}{{ particle.value }}
      </div>
    }
  `,
  styles: [`
    :host {
      position: relative;
      display: contents;
    }
    
    .speech-bubble {
      position: absolute;
      left: -20px;
      bottom: calc(100% + 12px);
      z-index: 100;
      background: linear-gradient(145deg, #4a4a4a 0%, #3a3a3a 50%, #2a2a2a 100%);
      border: 3px solid #1a1a1a;
      border-radius: 8px;
      padding: 14px;
      max-width: 320px;
      box-shadow: 
        inset 2px 2px 4px rgba(80, 80, 80, 0.3),
        inset -2px -2px 4px rgba(0, 0, 0, 0.8),
        0 8px 24px rgba(0, 0, 0, 0.9),
        0 0 20px rgba(255, 102, 0, 0.2);
      animation: popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    /* Decorative rivets on corners */
    .speech-bubble::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 8px;
      width: 6px;
      height: 6px;
      background: radial-gradient(circle, #5a5a5a 0%, #2a2a2a 100%);
      border-radius: 50%;
      box-shadow: 
        inset 1px 1px 1px rgba(255, 255, 255, 0.3),
        inset -1px -1px 1px rgba(0, 0, 0, 0.8);
    }
    
    .speech-bubble::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 6px;
      height: 6px;
      background: radial-gradient(circle, #5a5a5a 0%, #2a2a2a 100%);
      border-radius: 50%;
      box-shadow: 
        inset 1px 1px 1px rgba(255, 255, 255, 0.3),
        inset -1px -1px 1px rgba(0, 0, 0, 0.8);
    }
    
    /* Posicionamiento según ubicación del waifu */
    .speech-bubble[data-position="floating-bottom-right"] {
      transform: none;
    }
    
    .speech-bubble[data-position="hidden"] {
      display: none;
    }

    @keyframes popIn {
      from {
        opacity: 0;
        scale: 0.5;
      }
      to {
        opacity: 1;
        scale: 1;
      }
    }

    /* Speech bubble tail pointing down to CRT */
    .bubble-tail {
      position: absolute;
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-top: 12px solid #1a1a1a;
    }
    
    /* Tail position for floating-bottom-right mode */
    .speech-bubble[data-position="floating-bottom-right"] .bubble-tail {
      bottom: -12px;
      left: 50%;
      transform: translateX(-50%);
    }

    .bubble-tail::after {
      content: '';
      position: absolute;
      top: -14px;
      left: -10px;
      width: 0;
      height: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 10px solid #3a3a3a;
    }

    /* Affection mini bar */
    .affection-mini {
      height: 6px;
      background: #0a0a0a;
      border: 1px solid #00ff00;
      border-radius: 3px;
      margin-bottom: 10px;
      overflow: hidden;
      box-shadow: 
        inset 0 0 8px rgba(0, 0, 0, 0.9),
        0 0 5px rgba(0, 255, 0, 0.3);
    }

    .affection-mini-fill {
      height: 100%;
      background: linear-gradient(90deg, #00ff00 0%, #00cc00 100%);
      transition: width 0.5s ease;
      box-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
    }

    .affection-mini-fill.negative {
      background: linear-gradient(90deg, #ff0000 0%, #cc0000 100%);
      box-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
    }

    /* Bubble content */
    .bubble-content {
      background: #000000;
      border: 2px solid #00ff00;
      border-radius: 4px;
      padding: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: 
        inset 0 0 30px rgba(0, 255, 0, 0.15),
        inset 0 0 10px rgba(0, 255, 0, 0.25),
        inset 2px 2px 4px rgba(0, 0, 0, 0.9),
        0 0 15px rgba(0, 255, 0, 0.4);
    }
    
    /* CRT Scanlines effect */
    .bubble-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 255, 0, 0.03) 0px,
        rgba(0, 0, 0, 0.05) 1px,
        rgba(0, 255, 0, 0.03) 2px
      );
      pointer-events: none;
      z-index: 1;
    }
    
    /* Phosphor glow animation */
    .bubble-content::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      right: -50%;
      bottom: -50%;
      background: radial-gradient(
        ellipse at center,
        rgba(0, 255, 0, 0.1) 0%,
        transparent 50%
      );
      animation: phosphorGlow 3s ease-in-out infinite;
      pointer-events: none;
      z-index: 1;
    }
    
    @keyframes phosphorGlow {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .bubble-content.response {
      border-color: #00ff00;
      box-shadow: 
        inset 0 0 30px rgba(0, 255, 0, 0.2),
        inset 0 0 10px rgba(0, 255, 0, 0.3),
        inset 2px 2px 4px rgba(0, 0, 0, 0.9),
        0 0 20px rgba(0, 255, 0, 0.5);
    }

    .bubble-text {
      margin: 0 0 8px 0;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      text-shadow: 
        0 0 10px rgba(0, 255, 0, 0.9),
        0 0 5px rgba(0, 255, 0, 0.7),
        0 0 2px rgba(0, 255, 0, 1);
      position: relative;
      z-index: 2;
      letter-spacing: 0.5px;
    }

    .bubble-content.response .bubble-text {
      color: #00ff00;
      text-shadow: 
        0 0 12px rgba(0, 255, 0, 1),
        0 0 6px rgba(0, 255, 0, 0.8),
        0 0 3px rgba(0, 255, 0, 1);
    }

    /* Compact options */
    .bubble-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      z-index: 2;
    }

    .bubble-option {
      background: #001100;
      border: 2px solid #00ff00;
      border-radius: 2px;
      padding: 8px 12px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      color: #00ff00;
      text-align: left;
      text-shadow: 
        0 0 8px rgba(0, 255, 0, 0.9),
        0 0 4px rgba(0, 255, 0, 0.7);
      transition: all 0.15s;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 
        inset 0 0 10px rgba(0, 255, 0, 0.1),
        0 0 8px rgba(0, 255, 0, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    /* Option hover scanline effect */
    .bubble-option::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(0, 255, 0, 0.2) 50%,
        transparent 100%
      );
      transition: left 0.3s ease;
    }

    .bubble-option:hover {
      background: #002200;
      border-color: #00ff88;
      transform: translateX(4px);
      box-shadow: 
        inset 0 0 15px rgba(0, 255, 0, 0.2),
        0 0 15px rgba(0, 255, 0, 0.6),
        0 0 5px rgba(0, 255, 0, 0.8);
      text-shadow: 
        0 0 10px rgba(0, 255, 0, 1),
        0 0 5px rgba(0, 255, 0, 0.8);
    }
    
    .bubble-option:hover::before {
      left: 100%;
    }

    .bubble-option.positive {
      border-color: #00ff00;
    }

    .bubble-option.negative {
      border-color: #ff0000;
    }

    .bubble-option .aff {
      font-size: 0.7rem;
      font-weight: bold;
      padding: 2px 4px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 2px;
      margin-left: 4px;
    }

    .bubble-option.positive .aff {
      color: #00ff00;
    }

    .bubble-option.negative .aff {
      color: #ff0000;
    }

    /* Continue button */
    .bubble-continue {
      background: #001100;
      border: 2px solid #00ff00;
      border-radius: 2px;
      padding: 10px 12px;
      cursor: pointer;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      font-weight: bold;
      text-shadow: 
        0 0 10px rgba(0, 255, 0, 1),
        0 0 5px rgba(0, 255, 0, 0.8),
        0 0 2px rgba(0, 255, 0, 1);
      width: 100%;
      margin-top: 8px;
      transition: all 0.15s;
      box-shadow: 
        inset 0 0 10px rgba(0, 255, 0, 0.1),
        0 0 10px rgba(0, 255, 0, 0.4);
      animation: pulse 2s ease-in-out infinite;
      position: relative;
      z-index: 2;
    }

    @keyframes pulse {
      0%, 100% { 
        box-shadow: 
          inset 0 0 10px rgba(0, 255, 0, 0.1),
          0 0 10px rgba(0, 255, 0, 0.4);
      }
      50% { 
        box-shadow: 
          inset 0 0 15px rgba(0, 255, 0, 0.2),
          0 0 20px rgba(0, 255, 0, 0.7),
          0 0 5px rgba(0, 255, 0, 1);
      }
    }

    .bubble-continue:hover {
      background: #002200;
      transform: translateY(-2px);
      border-color: #00ff88;
      box-shadow: 
        inset 0 0 15px rgba(0, 255, 0, 0.2),
        0 0 20px rgba(0, 255, 0, 0.7);
    }
    
    /* Affection Particles */
    .affection-particle {
      position: absolute;
      z-index: 11000;
      font-size: 1.5rem;
      font-weight: bold;
      font-family: 'Press Start 2P', monospace;
      pointer-events: none;
      animation: floatUp 1.5s ease-out forwards;
      filter: drop-shadow(0 0 8px currentColor);
    }
    
    .affection-particle.positive {
      color: #00ff00;
      text-shadow: 
        0 0 10px rgba(0, 255, 0, 1),
        0 0 20px rgba(0, 255, 0, 0.8),
        0 0 30px rgba(0, 255, 0, 0.6);
    }
    
    .affection-particle.negative {
      color: #ff0000;
      text-shadow: 
        0 0 10px rgba(255, 0, 0, 1),
        0 0 20px rgba(255, 0, 0, 0.8),
        0 0 30px rgba(255, 0, 0, 0.6);
    }
    
    @keyframes floatUp {
      0% {
        opacity: 1;
        transform: translateY(0) scale(0.5);
      }
      20% {
        opacity: 1;
        transform: translateY(-20px) scale(1.2);
      }
      100% {
        opacity: 0;
        transform: translateY(-100px) scale(0.8);
      }
    }

    @media (max-width: 768px) {
      .speech-bubble {
        max-width: 280px;
      }
      
      .speech-bubble[data-position="above-controls"] {
        transform: translate(-50%, -120px);
      }
      
      .speech-bubble[data-position="floating-bottom-right"] {
        bottom: 260px;
        right: 10px;
      }
      
      .affection-particle {
        font-size: 1.2rem;
      }
    }
  `]
})
export class WaifuDialogueComponent {
  private positionService = inject(WaifuPositionService);
  
  constructor(public dialogueService: DialogueService) {}

  get dialogueState() {
    return this.dialogueService.dialogueState;
  }
  
  // Exponer la posición del waifu
  waifuPosition = this.positionService.position;

  affectionMessage = computed(() => this.dialogueService.getAffectionMessage());
  
  // Sistema de partículas
  affectionParticles = signal<AffectionParticle[]>([]);
  
  private particleIdCounter = 0;

  getAffectionPercentage(): number {
    // Ahora el nivel ya está en 0-100
    return this.dialogueService.getAffectionLevel();
  }

  selectOption(index: number) {
    // Obtener el valor de afección antes de seleccionar
    const option = this.dialogueState().currentDialogue?.options[index];
    if (option && option.affection !== 0) {
      this.spawnAffectionParticle(option.affection);
    }
    
    this.dialogueService.selectOption(index);
  }
  
  private spawnAffectionParticle(value: number) {
    // Obtener posición del monitor CRT
    const position = this.getCRTPosition();
    
    // Crear partícula
    const particle = {
      id: this.particleIdCounter++,
      value: value,
      x: position.x,
      y: position.y
    };
    
    // Agregar a la lista
    this.affectionParticles.update((particles: AffectionParticle[]) => [...particles, particle]);
    
    // Remover después de la animación (1.5s)
    setTimeout(() => {
      this.affectionParticles.update((particles: AffectionParticle[]) => 
        particles.filter((p: AffectionParticle) => p.id !== particle.id)
      );
    }, 1500);
  }
  
  private getCRTPosition(): { x: number; y: number } {
    const waifuPos = this.waifuPosition();
    
    if (waifuPos === 'floating-bottom-right') {
      // Usar posición del servicio
      const pos = this.positionService.dragPosition();
      // Centro del monitor CRT (aproximado)
      return { x: pos.x + 120, y: pos.y + 120 };
    }
    
    // Default
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  closeDialogue() {
    this.dialogueService.closeDialogue();
  }
  
  // Posición de partículas de afecto relativa al centro del CRT
  getParticleLeft(particle: AffectionParticle): number {
    const crtCenterX = 140; // Centro del CRT (280px / 2)
    return crtCenterX + particle.x;
  }

  getParticleTop(particle: AffectionParticle): number {
    const crtCenterY = 140; // Centro del CRT
    return crtCenterY + particle.y;
  }
}
