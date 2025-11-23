import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ModalConfig {
  title?: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-window" (click)="$event.stopPropagation()">
        <!-- Title Bar (Win98 style) -->
        <div class="modal-titlebar">
          <span class="modal-title">{{ config?.title || 'Dialog' }}</span>
          <button class="modal-close-btn" (click)="onCancel()">×</button>
        </div>
        
        <!-- Content -->
        <div class="modal-content">
          <p class="modal-message">{{ config?.message }}</p>
          
          <!-- Prompt Input -->
          @if (config?.type === 'prompt') {
            <input 
              type="text" 
              class="modal-input"
              [(ngModel)]="inputValue"
              (keydown.enter)="onConfirm()"
              (keydown.escape)="onCancel()"
              #promptInput>
          }
        </div>
        
        <!-- Buttons -->
        <div class="modal-footer">
          @if (config?.type === 'confirm' || config?.type === 'prompt') {
            <button class="modal-btn modal-btn-cancel" (click)="onCancel()">
              {{ config?.cancelText || 'Cancel' }}
            </button>
          }
          <button class="modal-btn modal-btn-confirm" (click)="onConfirm()">
            {{ config?.confirmText || 'OK' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.15s ease-out;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    .modal-window {
      background: #c0c0c0;
      border: 2px outset #dfdfdf;
      box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
      min-width: 300px;
      max-width: 500px;
      animation: slideDown 0.2s ease-out;
      font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
    }
    
    @keyframes slideDown {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .modal-titlebar {
      background: linear-gradient(90deg, #000080, #1084d0);
      color: white;
      padding: 2px 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: bold;
    }
    
    .modal-title {
      padding-left: 2px;
    }
    
    .modal-close-btn {
      background: #c0c0c0;
      border: 1px outset #dfdfdf;
      width: 16px;
      height: 14px;
      font-size: 10px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-close-btn:hover {
      background: #dadada;
    }
    
    .modal-close-btn:active {
      border-style: inset;
    }
    
    .modal-content {
      padding: 16px;
      background: #c0c0c0;
    }
    
    .modal-message {
      margin: 0 0 12px 0;
      color: #000;
      font-size: 11px;
      line-height: 1.4;
    }
    
    .modal-input {
      width: 100%;
      padding: 4px;
      border: 1px solid #000;
      border-right-color: #dfdfdf;
      border-bottom-color: #dfdfdf;
      font-size: 11px;
      font-family: 'MS Sans Serif', sans-serif;
      background: var(--theme-surface);
    }
    
    .modal-input:focus {
      outline: 1px dotted #000;
      outline-offset: -2px;
    }
    
    .modal-footer {
      padding: 8px 16px 16px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    .modal-btn {
      min-width: 75px;
      padding: 4px 12px;
      border: 2px outset #dfdfdf;
      background: #c0c0c0;
      font-size: 11px;
      cursor: pointer;
      font-family: 'MS Sans Serif', sans-serif;
    }
    
    .modal-btn:hover {
      background: #dadada;
    }
    
    .modal-btn:active {
      border-style: inset;
      padding: 5px 11px 3px 13px;
    }
    
    .modal-btn-confirm {
      font-weight: bold;
      border-width: 3px;
      border-color: #000;
      border-style: outset;
    }
    
    .modal-btn-confirm:active {
      border-style: inset;
    }
    
    /* Cyberpunk variant (optional) */
    .modal-window.cyberpunk {
      background: linear-gradient(145deg, #0a1a0a 0%, #051005 100%);
      border: 2px solid #00ff00;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    }
    
    .modal-window.cyberpunk .modal-titlebar {
      background: linear-gradient(90deg, #003300, #005500);
      color: #00ff00;
      border-bottom: 1px solid #00ff00;
    }
    
    .modal-window.cyberpunk .modal-content {
      background: transparent;
    }
    
    .modal-window.cyberpunk .modal-message {
      color: #00ff00;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      font-size: 9px;
    }
    
    .modal-window.cyberpunk .modal-input {
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #00ff00;
      color: #00ff00;
      font-family: 'Courier New', monospace;
    }
    
    .modal-window.cyberpunk .modal-btn {
      background: linear-gradient(180deg, #2a4d2a 0%, #1a3d1a 100%);
      border: 1px solid #00ff00;
      color: #00ff00;
    }
    
    .modal-window.cyberpunk .modal-btn:hover {
      box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
    }
  `]
})
export class ModalComponent {
  config: ModalConfig | null = null;
  inputValue = '';
  
  closed = output<any>();
  
  constructor() {
    // Initialize input value if prompt
    setTimeout(() => {
      if (this.config?.type === 'prompt' && this.config.defaultValue) {
        this.inputValue = this.config.defaultValue;
      }
    });
  }
  
  onOverlayClick(event: MouseEvent): void {
    // Close on overlay click (acts as cancel)
    this.onCancel();
  }
  
  onConfirm(): void {
    if (this.config?.type === 'prompt') {
      this.closed.emit(this.inputValue);
    } else if (this.config?.type === 'confirm') {
      this.closed.emit(true);
    } else {
      this.closed.emit(true);
    }
  }
  
  onCancel(): void {
    if (this.config?.type === 'confirm') {
      this.closed.emit(false);
    } else if (this.config?.type === 'prompt') {
      this.closed.emit(false);
    } else {
      this.closed.emit(true);
    }
  }
}
