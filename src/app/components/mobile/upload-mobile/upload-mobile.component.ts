import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-mobile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-mobile">
      <div class="upload-content">
        <div class="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        
        <h2 class="upload-title">Upload Image</h2>
        <p class="upload-description">Tap to select an image from your device</p>
        
        <div class="upload-buttons">
          <button class="btn-upload" (click)="triggerFileInput()">
            📁 Choose File
          </button>
          
          <button class="btn-camera" (click)="triggerCamera()">
            📷 Take Photo
          </button>
        </div>
        
        <p class="upload-info">Supports PNG, JPG, GIF, WebP</p>
      </div>
      
      <!-- Hidden file inputs -->
      <input 
        #fileInput 
        type="file" 
        accept="image/*" 
        (change)="onFileSelected($event)"
        style="display: none;">
      
      <input 
        #cameraInput 
        type="file" 
        accept="image/*" 
        capture="environment"
        (change)="onFileSelected($event)"
        style="display: none;">
    </div>
  `,
  styles: [`
    .upload-mobile {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 120px);
      padding: 1.5rem;
      background: linear-gradient(145deg, 
        var(--theme-background, #0a1d0a) 0%,
        var(--theme-surface, #1a2d1a) 100%);
    }

    .upload-content {
      text-align: center;
      max-width: 400px;
      width: 100%;
    }

    .upload-icon {
      margin-bottom: 2rem;
      font-size: 4rem;
      display: inline-block;
      filter: grayscale(0.4) brightness(0.85) saturate(0.6) opacity(0.9);
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .upload-title {
      font-size: 1.4rem;
      color: var(--theme-primary);
      margin-bottom: 0.75rem;
      font-weight: 600;
      font-family: var(--font-mono);
      letter-spacing: 0.5px;
    }

    .upload-description {
      font-size: 0.95rem;
      color: var(--theme-text-secondary);
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .upload-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .btn-upload,
    .btn-camera {
      min-height: 52px;
      padding: 0 1.75rem;
      font-size: 1rem;
      font-weight: 600;
      font-family: var(--font-mono);
      letter-spacing: 0.5px;
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      background: var(--theme-surface);
      color: var(--theme-text);
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 var(--theme-highlight);
      -webkit-tap-highlight-color: transparent;
    }

    .btn-upload:active,
    .btn-camera:active {
      transform: translateY(1px);
      box-shadow: 
        0 1px 4px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 var(--theme-highlight);
    }

    .btn-upload {
      background: var(--theme-primary);
      color: var(--theme-background);
      border-color: var(--theme-primary);
    }

    .upload-info {
      font-size: 0.8rem;
      color: var(--theme-text-secondary);
      opacity: 0.7;
      font-family: var(--font-mono);
    }
  `]
})
export class UploadMobileComponent {
  fileSelected = output<File>();

  triggerFileInput(): void {
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    input?.click();
  }

  triggerCamera(): void {
    const input = document.querySelector('input[type="file"][capture]') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fileSelected.emit(input.files[0]);
    }
  }
}
