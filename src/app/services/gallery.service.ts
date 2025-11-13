import { Injectable, signal } from '@angular/core';
import { GalleryItem, DitheringSettings } from '../models/achievement.interface';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private readonly STORAGE_KEY = 'dithering_gallery';
  private readonly MAX_ITEMS = 100; // Límite para no llenar localStorage
  private readonly THUMBNAIL_SIZE = 200; // px
  
  gallery = signal<GalleryItem[]>(this.loadGallery());
  
  constructor() {}
  
  private loadGallery(): GalleryItem[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const items = JSON.parse(stored);
        // Convert date strings back to Date objects
        return items.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }));
      } catch (e) {
        console.error('Error loading gallery:', e);
        return [];
      }
    }
    return [];
  }
  
  saveGallery(): void {
    try {
      const items = this.gallery();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving gallery:', e);
      // Si falla (localStorage lleno), eliminar item más antiguo y reintentar
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.removeOldestItem();
        this.saveGallery();
      }
    }
  }
  
  async saveToGallery(
    canvas: HTMLCanvasElement,
    name: string,
    settings: DitheringSettings,
    tags: string[] = []
  ): Promise<string> {
    // Generate thumbnail
    const thumbnail = await this.createThumbnail(canvas);
    const fullImage = canvas.toDataURL('image/png', 0.9);
    
    const item: GalleryItem = {
      id: this.generateId(),
      name: name || `Design ${new Date().toLocaleDateString()}`,
      thumbnail,
      fullImage,
      createdAt: new Date(),
      settings,
      favorite: false,
      tags
    };
    
    const currentGallery = this.gallery();
    
    // Check limit
    if (currentGallery.length >= this.MAX_ITEMS) {
      // Remove oldest non-favorite item
      const indexToRemove = currentGallery.findIndex(item => !item.favorite);
      if (indexToRemove !== -1) {
        currentGallery.splice(indexToRemove, 1);
      }
    }
    
    currentGallery.unshift(item); // Add to beginning
    this.gallery.set(currentGallery);
    this.saveGallery();
    
    return item.id;
  }
  
  private async createThumbnail(canvas: HTMLCanvasElement): Promise<string> {
    // Create a smaller canvas for thumbnail
    const thumbCanvas = document.createElement('canvas');
    const ctx = thumbCanvas.getContext('2d')!;
    
    const scale = Math.min(
      this.THUMBNAIL_SIZE / canvas.width,
      this.THUMBNAIL_SIZE / canvas.height
    );
    
    thumbCanvas.width = canvas.width * scale;
    thumbCanvas.height = canvas.height * scale;
    
    ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    
    return thumbCanvas.toDataURL('image/jpeg', 0.7); // JPEG with lower quality for thumbnails
  }
  
  removeItem(id: string): void {
    const currentGallery = this.gallery();
    const filtered = currentGallery.filter(item => item.id !== id);
    this.gallery.set(filtered);
    this.saveGallery();
  }
  
  toggleFavorite(id: string): void {
    const currentGallery = this.gallery();
    const item = currentGallery.find(item => item.id === id);
    if (item) {
      item.favorite = !item.favorite;
      this.gallery.set([...currentGallery]); // Trigger signal update
      this.saveGallery();
    }
  }
  
  updateName(id: string, newName: string): void {
    const currentGallery = this.gallery();
    const item = currentGallery.find(item => item.id === id);
    if (item) {
      item.name = newName;
      this.gallery.set([...currentGallery]);
      this.saveGallery();
    }
  }
  
  addTags(id: string, tags: string[]): void {
    const currentGallery = this.gallery();
    const item = currentGallery.find(item => item.id === id);
    if (item) {
      item.tags = [...new Set([...item.tags, ...tags])];
      this.gallery.set([...currentGallery]);
      this.saveGallery();
    }
  }
  
  removeTag(id: string, tag: string): void {
    const currentGallery = this.gallery();
    const item = currentGallery.find(item => item.id === id);
    if (item) {
      item.tags = item.tags.filter(t => t !== tag);
      this.gallery.set([...currentGallery]);
      this.saveGallery();
    }
  }
  
  getItemById(id: string): GalleryItem | undefined {
    return this.gallery().find(item => item.id === id);
  }
  
  getFavorites(): GalleryItem[] {
    return this.gallery().filter(item => item.favorite);
  }
  
  getByTag(tag: string): GalleryItem[] {
    return this.gallery().filter(item => item.tags.includes(tag));
  }
  
  getAllTags(): string[] {
    const allTags = this.gallery().flatMap(item => item.tags);
    return [...new Set(allTags)].sort();
  }
  
  searchByName(query: string): GalleryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.gallery().filter(item => 
      item.name.toLowerCase().includes(lowerQuery)
    );
  }
  
  sortBy(criteria: 'date' | 'name' | 'favorite'): GalleryItem[] {
    const items = [...this.gallery()];
    
    switch (criteria) {
      case 'date':
        return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'name':
        return items.sort((a, b) => a.name.localeCompare(b.name));
      case 'favorite':
        return items.sort((a, b) => {
          if (a.favorite === b.favorite) return 0;
          return a.favorite ? -1 : 1;
        });
      default:
        return items;
    }
  }
  
  private removeOldestItem(): void {
    const currentGallery = this.gallery();
    if (currentGallery.length === 0) return;
    
    // Find oldest non-favorite
    const nonFavorites = currentGallery.filter(item => !item.favorite);
    if (nonFavorites.length > 0) {
      const oldest = nonFavorites.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )[0];
      this.removeItem(oldest.id);
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Export/Import functionality
  exportGallery(): string {
    return JSON.stringify(this.gallery(), null, 2);
  }
  
  importGallery(jsonData: string): boolean {
    try {
      const items = JSON.parse(jsonData);
      if (Array.isArray(items)) {
        // Validate structure
        const validItems = items.filter(item => 
          item.id && item.name && item.thumbnail && item.fullImage && item.settings
        ).map(item => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }));
        
        this.gallery.set(validItems);
        this.saveGallery();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error importing gallery:', e);
      return false;
    }
  }
  
  // Clear all
  clearGallery(): void {
    this.gallery.set([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  // Stats
  getStorageUsage(): { used: number; total: number; percentage: number } {
    const stored = localStorage.getItem(this.STORAGE_KEY) || '';
    const bytes = new Blob([stored]).size;
    const totalAvailable = 5 * 1024 * 1024; // ~5MB typical localStorage limit
    
    return {
      used: bytes,
      total: totalAvailable,
      percentage: Math.round((bytes / totalAvailable) * 100)
    };
  }
}
