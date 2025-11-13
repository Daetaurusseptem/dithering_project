import { Component, signal, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryService } from '../../services/gallery.service';
import { ModalService } from '../../services/modal.service';
import { GalleryItem, DitheringSettings } from '../../models/achievement.interface';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gallery-overlay" (click)="close()">
      <div class="gallery-modal" (click)="$event.stopPropagation()">
        <div class="gallery-header">
          <h2>🖼️ My Gallery</h2>
          <button class="close-btn" (click)="close()">✕</button>
        </div>
        
        <div class="gallery-controls">
          <input 
            type="text" 
            class="search-input" 
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="🔍 Search designs..."
          />
          
          <select class="sort-select" [(ngModel)]="sortBy" (ngModelChange)="onSortChange()">
            <option value="date">Newest First</option>
            <option value="name">Name (A-Z)</option>
            <option value="favorite">Favorites First</option>
          </select>
          
          <div class="filter-tags">
            <button 
              *ngFor="let tag of availableTags()"
              class="tag-filter"
              [class.active]="selectedTag() === tag"
              (click)="filterByTag(tag)"
            >
              {{ tag }}
            </button>
            <button 
              *ngIf="selectedTag()"
              class="tag-filter clear"
              (click)="clearTagFilter()"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div class="gallery-stats">
          <span>{{ filteredItems().length }} designs</span>
          <span>Storage: {{ storageUsage().percentage }}%</span>
        </div>
        
        <div class="gallery-grid">
          <div 
            *ngFor="let item of filteredItems()"
            class="gallery-item"
            [class.favorite]="item.favorite"
          >
            <div class="item-thumbnail" (click)="viewItem(item)">
              <img [src]="item.thumbnail" [alt]="item.name" />
              <div class="item-overlay">
                <button class="overlay-btn" (click)="applySettings(item); $event.stopPropagation()">
                  ⚙️ Apply Settings
                </button>
                <button class="overlay-btn" (click)="downloadItem(item); $event.stopPropagation()">
                  💾 Download
                </button>
              </div>
            </div>
            
            <div class="item-info">
              <input 
                *ngIf="editingItemId() === item.id; else showName"
                type="text"
                class="item-name-input"
                [(ngModel)]="item.name"
                (blur)="stopEditing()"
                (keyup.enter)="stopEditing()"
                (click)="$event.stopPropagation()"
              />
              <ng-template #showName>
                <div class="item-name" (dblclick)="startEditing(item.id)">
                  {{ item.name }}
                </div>
              </ng-template>
              
              <div class="item-meta">
                <span class="item-date">{{ formatDate(item.createdAt) }}</span>
                <div class="item-actions">
                  <button 
                    class="action-btn favorite-btn" 
                    (click)="toggleFavorite(item.id)"
                    [class.active]="item.favorite"
                  >
                    {{ item.favorite ? '⭐' : '☆' }}
                  </button>
                  <button class="action-btn delete-btn" (click)="confirmDelete(item.id)">
                    🗑️
                  </button>
                </div>
              </div>
              
              <div class="item-tags">
                <span 
                  *ngFor="let tag of item.tags"
                  class="item-tag"
                  (click)="filterByTag(tag)"
                >
                  {{ tag }}
                </span>
              </div>
              
              <div class="item-settings-preview">
                <span>{{ item.settings.algorithm }}</span>
                <span>{{ item.settings.palette }}</span>
                <span>{{ item.settings.scale }}x</span>
              </div>
            </div>
          </div>
          
          <div *ngIf="filteredItems().length === 0" class="empty-state">
            <div class="empty-icon">🎨</div>
            <h3>No designs yet</h3>
            <p>Start creating and save your favorite designs here!</p>
          </div>
        </div>
        
        <div class="gallery-footer">
          <button class="btn-secondary" (click)="exportGallery()">
            📤 Export Gallery
          </button>
          <button class="btn-secondary" (click)="importGallery()">
            📥 Import Gallery
          </button>
          <button class="btn-danger" (click)="confirmClearAll()">
            🗑️ Clear All
          </button>
        </div>
      </div>
    </div>
    
    <!-- Hidden file input for import -->
    <input 
      #importInput
      type="file" 
      accept=".json"
      style="display: none"
      (change)="onImportFile($event)"
    />
  `,
  styles: [`
    .gallery-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .gallery-modal {
      background: var(--bg-primary, #c0c0c0);
      border: 3px solid var(--border-color, #000);
      width: 90vw;
      max-width: 1200px;
      height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .gallery-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: var(--header-bg, #000080);
      color: white;
      border-bottom: 2px solid var(--border-color, #000);
    }
    
    .gallery-header h2 {
      margin: 0;
      font-size: 20px;
    }
    
    .close-btn {
      background: #c0c0c0;
      border: 2px solid #fff;
      width: 30px;
      height: 30px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      box-shadow: inset -1px -1px 0 #000, inset 1px 1px 0 #fff;
    }
    
    .close-btn:active {
      box-shadow: inset 1px 1px 0 #000, inset -1px -1px 0 #fff;
    }
    
    .gallery-controls {
      padding: 16px;
      background: var(--controls-bg, #f0f0f0);
      border-bottom: 2px solid var(--border-color, #808080);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .search-input, .sort-select {
      padding: 6px 12px;
      border: 2px solid #808080;
      box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.3);
      font-family: 'MS Sans Serif', sans-serif;
    }
    
    .search-input {
      flex: 1;
      min-width: 200px;
    }
    
    .sort-select {
      min-width: 150px;
    }
    
    .filter-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      width: 100%;
    }
    
    .tag-filter {
      padding: 4px 12px;
      background: #c0c0c0;
      border: 2px solid #808080;
      cursor: pointer;
      font-size: 12px;
      box-shadow: inset -1px -1px 0 #000, inset 1px 1px 0 #fff;
    }
    
    .tag-filter.active {
      background: #000080;
      color: white;
    }
    
    .tag-filter.clear {
      background: #ff6b6b;
      color: white;
    }
    
    .gallery-stats {
      padding: 8px 16px;
      background: #e0e0e0;
      border-bottom: 1px solid #808080;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }
    
    .gallery-grid {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
      align-content: start;
    }
    
    .gallery-item {
      background: white;
      border: 2px solid #808080;
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.2);
      overflow: hidden;
      transition: transform 0.2s;
    }
    
    .gallery-item:hover {
      transform: translateY(-4px);
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
    }
    
    .gallery-item.favorite {
      border-color: #ffd700;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }
    
    .item-thumbnail {
      position: relative;
      width: 100%;
      padding-bottom: 100%;
      background: #000;
      cursor: pointer;
      overflow: hidden;
    }
    
    .item-thumbnail img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .item-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .item-thumbnail:hover .item-overlay {
      opacity: 1;
    }
    
    .overlay-btn {
      padding: 8px 16px;
      background: #c0c0c0;
      border: 2px solid #fff;
      cursor: pointer;
      font-size: 12px;
      box-shadow: inset -1px -1px 0 #000, inset 1px 1px 0 #fff;
    }
    
    .overlay-btn:hover {
      background: #e0e0e0;
    }
    
    .item-info {
      padding: 12px;
    }
    
    .item-name {
      font-weight: bold;
      margin-bottom: 8px;
      cursor: text;
    }
    
    .item-name:hover {
      background: rgba(0, 0, 128, 0.1);
    }
    
    .item-name-input {
      width: 100%;
      padding: 4px;
      border: 2px solid #000080;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .item-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 11px;
      color: #666;
    }
    
    .item-actions {
      display: flex;
      gap: 4px;
    }
    
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 2px;
      opacity: 0.6;
      transition: opacity 0.2s, transform 0.2s;
    }
    
    .action-btn:hover {
      opacity: 1;
      transform: scale(1.2);
    }
    
    .favorite-btn.active {
      opacity: 1;
      filter: drop-shadow(0 0 4px gold);
    }
    
    .item-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    
    .item-tag {
      padding: 2px 8px;
      background: #e0e0e0;
      border: 1px solid #808080;
      font-size: 10px;
      cursor: pointer;
    }
    
    .item-tag:hover {
      background: #000080;
      color: white;
    }
    
    .item-settings-preview {
      display: flex;
      gap: 8px;
      font-size: 10px;
      color: #666;
      padding-top: 8px;
      border-top: 1px solid #e0e0e0;
    }
    
    .item-settings-preview span {
      padding: 2px 6px;
      background: #f0f0f0;
      border: 1px solid #d0d0d0;
    }
    
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    
    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .gallery-footer {
      padding: 16px;
      background: var(--controls-bg, #f0f0f0);
      border-top: 2px solid var(--border-color, #808080);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .btn-secondary, .btn-danger {
      padding: 8px 16px;
      border: 2px solid #808080;
      cursor: pointer;
      font-size: 12px;
      box-shadow: inset -1px -1px 0 #000, inset 1px 1px 0 #fff;
    }
    
    .btn-secondary {
      background: #c0c0c0;
    }
    
    .btn-danger {
      background: #ff6b6b;
      color: white;
    }
    
    .btn-secondary:active, .btn-danger:active {
      box-shadow: inset 1px 1px 0 #000, inset -1px -1px 0 #fff;
    }
  `]
})
export class GalleryComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() settingsApplied = new EventEmitter<DitheringSettings>();
  
  searchQuery = '';
  sortBy = 'date';
  selectedTag = signal<string | null>(null);
  editingItemId = signal<string | null>(null);
  filteredItems = signal<GalleryItem[]>([]);
  availableTags = signal<string[]>([]);
  storageUsage = signal({ used: 0, total: 0, percentage: 0 });
  
  private modalService = inject(ModalService);
  
  constructor(public galleryService: GalleryService) {
    this.updateFiltered();
    this.updateTags();
    this.updateStorageUsage();
  }
  
  close(): void {
    this.closed.emit();
  }
  
  onSearch(): void {
    this.updateFiltered();
  }
  
  onSortChange(): void {
    this.updateFiltered();
  }
  
  filterByTag(tag: string): void {
    this.selectedTag.set(tag);
    this.updateFiltered();
  }
  
  clearTagFilter(): void {
    this.selectedTag.set(null);
    this.updateFiltered();
  }
  
  private updateFiltered(): void {
    let items = this.galleryService.gallery();
    
    // Search filter
    if (this.searchQuery.trim()) {
      items = this.galleryService.searchByName(this.searchQuery);
    }
    
    // Tag filter
    if (this.selectedTag()) {
      items = items.filter(item => item.tags.includes(this.selectedTag()!));
    }
    
    // Sort
    items = this.sortItems(items);
    
    this.filteredItems.set(items);
  }
  
  private sortItems(items: GalleryItem[]): GalleryItem[] {
    const sorted = [...items];
    switch (this.sortBy) {
      case 'date':
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'favorite':
        return sorted.sort((a, b) => {
          if (a.favorite === b.favorite) return 0;
          return a.favorite ? -1 : 1;
        });
      default:
        return sorted;
    }
  }
  
  private updateTags(): void {
    this.availableTags.set(this.galleryService.getAllTags());
  }
  
  private updateStorageUsage(): void {
    this.storageUsage.set(this.galleryService.getStorageUsage());
  }
  
  toggleFavorite(id: string): void {
    this.galleryService.toggleFavorite(id);
    this.updateFiltered();
  }
  
  startEditing(id: string): void {
    this.editingItemId.set(id);
  }
  
  stopEditing(): void {
    this.editingItemId.set(null);
    this.galleryService.saveGallery(); // Trigger save
  }
  
  confirmDelete(id: string): void {
    this.modalService.confirm(
      'Delete this design?',
      'Delete Design'
    ).then((confirmed) => {
      if (confirmed) {
        this.galleryService.removeItem(id);
        this.updateFiltered();
        this.updateTags();
        this.updateStorageUsage();
      }
    });
  }
  
  viewItem(item: GalleryItem): void {
    // TODO: Open fullscreen preview modal
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<img src="${item.fullImage}" style="max-width: 100%; height: auto;" />`);
    }
  }
  
  applySettings(item: GalleryItem): void {
    this.settingsApplied.emit(item.settings);
    this.close();
  }
  
  downloadItem(item: GalleryItem): void {
    const link = document.createElement('a');
    link.href = item.fullImage;
    link.download = `${item.name}.png`;
    link.click();
  }
  
  exportGallery(): void {
    const data = this.galleryService.exportGallery();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dithering-gallery-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  
  importGallery(): void {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }
  
  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = this.galleryService.importGallery(content);
      if (success) {
        alert('Gallery imported successfully!');
        this.updateFiltered();
        this.updateTags();
        this.updateStorageUsage();
      } else {
        alert('Error importing gallery. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    input.value = '';
  }
  
  confirmClearAll(): void {
    this.modalService.confirm(
      'Are you sure you want to clear ALL designs? This cannot be undone!',
      'Clear All Designs'
    ).then((confirmed) => {
      if (confirmed) {
        // Double confirmation
        this.modalService.confirm(
          'Really? This will delete EVERYTHING!',
          'Final Confirmation'
        ).then((finalConfirm) => {
          if (finalConfirm) {
            this.galleryService.clearGallery();
            this.updateFiltered();
            this.updateTags();
            this.updateStorageUsage();
          }
        });
      }
    });
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
