import { Component, model, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../services/i18n.service';
import { AchievementService } from '../../services/achievement.service';
import { GalleryService } from '../../services/gallery.service';

@Component({
  selector: 'app-desktop-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './desktop-controls.component.html',
  styleUrl: './desktop-controls.component.css'
})
export class DesktopControlsComponent {
  i18nService = inject(I18nService);
  achievementService = inject(AchievementService);
  galleryService = inject(GalleryService);

  selectedAlgorithm = model.required<string>();
  selectedPalette = model.required<string>();
  scale = model.required<number>();
  contrast = model.required<number>();
  midtones = model.required<number>();
  highlights = model.required<number>();
  blur = model.required<number>();
  gifStudioMode = input<boolean>(false);
  compositionMode = input<boolean>(false);
  processing = input<boolean>(false);
  algorithmsByCategory = input<{ [key: string]: any[] }>({});
  categoryKeys = input<string[]>([]);
  palettes = input<{ id: string; name: string }[]>([]);
  selectedPaletteColors = input<string[]>([]);
  canSaveToGallery = input<boolean>(true);

  reset = output<void>();
  controlChange = output<void>();
  togglePaletteCreator = output<void>();
  togglePresetManager = output<void>();
  showSpriteUploader = output<void>();
  toggleAchievements = output<void>();
  toggleGallery = output<void>();
  toggleSettings = output<void>();
  saveToGallery = output<void>();
  downloadImage = output<void>();
  toggleGifStudioMode = output<void>();
  toggleCompositionMode = output<void>();
  newImage = output<void>();

  onAlgorithmChange(value: string) {
    this.selectedAlgorithm.set(value);
    this.controlChange.emit();
  }

  onPaletteChange(value: string) {
    this.selectedPalette.set(value);
    this.controlChange.emit();
  }

  onScaleChange(value: number) {
    this.scale.set(value);
    this.controlChange.emit();
  }

  onContrastChange(value: number) {
    this.contrast.set(value);
    this.controlChange.emit();
  }

  onMidtonesChange(value: number) {
    this.midtones.set(value);
    this.controlChange.emit();
  }

  onHighlightsChange(value: number) {
    this.highlights.set(value);
    this.controlChange.emit();
  }

  onBlurChange(value: number) {
    this.blur.set(value);
    this.controlChange.emit();
  }
}
