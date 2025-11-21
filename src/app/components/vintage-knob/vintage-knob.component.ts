import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vintage-knob',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="knob-container">
      <label class="knob-label">{{ label() }}</label>
      <div class="knob-wrapper"
           (mousedown)="startDrag($event)"
           (touchstart)="startDrag($event)">
        <svg class="knob-svg" viewBox="0 0 100 100">
          <!-- Outer ring (metal bezel) -->
          <defs>
            <radialGradient id="metal-gradient-{{ uniqueId }}" cx="50%" cy="30%">
              <stop offset="0%" style="stop-color:#8a8a8a;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#5a5a5a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#3a3a3a;stop-opacity:1" />
            </radialGradient>
            <radialGradient id="knob-gradient-{{ uniqueId }}" cx="50%" cy="30%">
              <stop offset="0%" style="stop-color:#4a4a4a;stop-opacity:1" />
              <stop offset="70%" style="stop-color:#2a2a2a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
            </radialGradient>
          </defs>
          
          <!-- Metal bezel -->
          <circle cx="50" cy="50" r="48" 
                  [attr.fill]="'url(#metal-gradient-' + uniqueId + ')'"
                  stroke="#1a1a1a" 
                  stroke-width="1"/>
          
          <!-- Knob body -->
          <circle cx="50" cy="50" r="42" 
                  [attr.fill]="'url(#knob-gradient-' + uniqueId + ')'"
                  stroke="#0a0a0a" 
                  stroke-width="2"/>
          
          <!-- Grip notches -->
          @for (notch of notches; track $index) {
            <line [attr.x1]="notch.x1" 
                  [attr.y1]="notch.y1" 
                  [attr.x2]="notch.x2" 
                  [attr.y2]="notch.y2"
                  stroke="#0a0a0a" 
                  stroke-width="1.5"
                  stroke-linecap="round"/>
          }
          
          <!-- Center cap -->
          <circle cx="50" cy="50" r="15" 
                  fill="#1a1a1a"
                  stroke="#0a0a0a" 
                  stroke-width="1"/>
          
          <!-- Indicator line -->
          <line [attr.x1]="50" 
                [attr.y1]="50" 
                [attr.x2]="indicatorEnd().x" 
                [attr.y2]="indicatorEnd().y"
                stroke="#00ff41" 
                stroke-width="3"
                stroke-linecap="round"
                class="indicator-line"/>
          
          <!-- Indicator dot -->
          <circle [attr.cx]="indicatorEnd().x" 
                  [attr.cy]="indicatorEnd().y" 
                  r="3" 
                  fill="#00ff41"
                  class="indicator-dot">
            <animate attributeName="opacity" 
                     values="0.6;1;0.6" 
                     dur="2s" 
                     repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>
      <div class="knob-value">{{ displayValue() }}</div>
      <div class="knob-range">
        <span class="range-min">{{ min() }}</span>
        <span class="range-max">{{ max() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .knob-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      user-select: none;
      padding: 0.4rem;
    }

    .knob-label {
      font-size: 0.65rem;
      color: #00ff41;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      text-shadow: 0 0 4px rgba(0, 255, 65, 0.5);
      margin-bottom: 0.2rem;
    }

    .knob-wrapper {
      width: 60px;
      height: 60px;
      cursor: grab;
      position: relative;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
    }

    .knob-wrapper:active {
      cursor: grabbing;
    }

    .knob-svg {
      width: 100%;
      height: 100%;
      transition: filter 0.2s;
    }

    .knob-wrapper:hover .knob-svg {
      filter: brightness(1.1);
    }

    .indicator-line {
      filter: drop-shadow(0 0 3px #00ff41);
    }

    .indicator-dot {
      filter: drop-shadow(0 0 4px #00ff41);
    }

    .knob-value {
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 3px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #00ff41;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 6px rgba(0, 255, 65, 0.4);
      box-shadow: 
        inset 0 1px 3px rgba(0, 0, 0, 0.8),
        0 0 8px rgba(0, 255, 65, 0.15);
      min-width: 45px;
      text-align: center;
    }

    .knob-range {
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: 0.65rem;
      color: #666;
      padding: 0 0.25rem;
    }

    .range-min, .range-max {
      font-family: 'Courier New', monospace;
    }
  `]
})
export class VintageKnobComponent {
  label = input.required<string>();
  value = input.required<number>();
  min = input.required<number>();
  max = input.required<number>();
  step = input<number>(1);
  valueChange = output<number>();

  uniqueId = `knob-${Math.random().toString(36).substr(2, 9)}`;
  
  private isDragging = false;
  private startY = 0;
  private startValue = 0;

  // Generate grip notches around the knob
  notches = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * 22.5 - 90) * Math.PI / 180;
    const innerRadius = 35;
    const outerRadius = 40;
    return {
      x1: 50 + Math.cos(angle) * innerRadius,
      y1: 50 + Math.sin(angle) * innerRadius,
      x2: 50 + Math.cos(angle) * outerRadius,
      y2: 50 + Math.sin(angle) * outerRadius
    };
  });

  // Calculate rotation angle based on value
  private rotationAngle = computed(() => {
    const range = this.max() - this.min();
    const normalized = (this.value() - this.min()) / range;
    // Map to -135° to +135° (270° total range)
    return -135 + (normalized * 270);
  });

  // Calculate indicator end position
  indicatorEnd = computed(() => {
    const angle = (this.rotationAngle() - 90) * Math.PI / 180;
    const radius = 30;
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius
    };
  });

  displayValue = computed(() => {
    const val = this.value();
    if (Number.isInteger(val)) {
      return val.toString();
    }
    return val.toFixed(2);
  });

  startDrag(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.isDragging = true;
    this.startValue = this.value();
    
    if (event instanceof MouseEvent) {
      this.startY = event.clientY;
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    } else {
      this.startY = event.touches[0].clientY;
      document.addEventListener('touchmove', this.onDrag);
      document.addEventListener('touchend', this.stopDrag);
    }
  }

  private onDrag = (event: MouseEvent | TouchEvent) => {
    if (!this.isDragging) return;
    
    const clientY = event instanceof MouseEvent 
      ? event.clientY 
      : event.touches[0].clientY;
    
    const deltaY = this.startY - clientY;
    const range = this.max() - this.min();
    const sensitivity = range / 150; // 150px drag = full range
    const delta = deltaY * sensitivity;
    
    let newValue = this.startValue + delta;
    newValue = Math.max(this.min(), Math.min(this.max(), newValue));
    
    // Apply step
    if (this.step() > 0) {
      newValue = Math.round(newValue / this.step()) * this.step();
    }
    
    this.valueChange.emit(newValue);
  };

  private stopDrag = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('touchmove', this.onDrag);
    document.removeEventListener('touchend', this.stopDrag);
  };
}
