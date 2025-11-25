import { Injectable, signal, computed, effect } from '@angular/core';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  touchEnabled: boolean;
  orientation: 'portrait' | 'landscape';
}

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService {
  // Breakpoints
  private readonly MOBILE_MAX_WIDTH = 767;
  private readonly TABLET_MAX_WIDTH = 1024;

  // Reactive state
  private _screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1920);
  private _screenHeight = signal(typeof window !== 'undefined' ? window.innerHeight : 1080);
  private _touchEnabled = signal(this.detectTouch());
  
  // Performance flags
  private _isLowEndDevice = signal(this.detectLowEndDevice());
  
  isLowEndDevice = this._isLowEndDevice.asReadonly();
  
  // Get max image size based on device
  getMaxImageDimension(): number {
    if (this.isMobile()) return this._isLowEndDevice() ? 800 : 1200;
    if (this.isTablet()) return 1600;
    return 2400;
  }
  
  // Get quality settings based on device
  shouldReduceAnimations(): boolean {
    return this.isMobile() || this._isLowEndDevice();
  }
  
  shouldUseWebWorkers(): boolean {
    return typeof Worker !== 'undefined' && !this._isLowEndDevice();
  }

  // Computed signals for device types
  isMobile = computed(() => this._screenWidth() <= this.MOBILE_MAX_WIDTH);
  isTablet = computed(() => 
    this._screenWidth() > this.MOBILE_MAX_WIDTH && 
    this._screenWidth() <= this.TABLET_MAX_WIDTH
  );
  isDesktop = computed(() => this._screenWidth() > this.TABLET_MAX_WIDTH);
  
  screenWidth = this._screenWidth.asReadonly();
  screenHeight = this._screenHeight.asReadonly();
  touchEnabled = this._touchEnabled.asReadonly();
  
  orientation = computed<'portrait' | 'landscape'>(() => 
    this._screenHeight() > this._screenWidth() ? 'portrait' : 'landscape'
  );

  // Combined device info
  deviceInfo = computed<DeviceInfo>(() => ({
    isMobile: this.isMobile(),
    isTablet: this.isTablet(),
    isDesktop: this.isDesktop(),
    screenWidth: this._screenWidth(),
    screenHeight: this._screenHeight(),
    touchEnabled: this._touchEnabled(),
    orientation: this.orientation()
  }));

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen to resize events
      window.addEventListener('resize', () => this.updateDimensions());
      
      // Listen to orientation change
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.updateDimensions(), 100);
      });

      // Initial detection
      this.updateDimensions();
      this._touchEnabled.set(this.detectTouch());
    }
  }

  private updateDimensions(): void {
    if (typeof window !== 'undefined') {
      this._screenWidth.set(window.innerWidth);
      this._screenHeight.set(window.innerHeight);
    }
  }

  private detectTouch(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  }
  
  private detectLowEndDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check memory (if available)
    const memory = (navigator as any).deviceMemory;
    if (memory && memory < 4) return true;
    
    // Check CPU cores
    const cores = navigator.hardwareConcurrency || 1;
    if (cores < 4) return true;
    
    // Check connection speed
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if device matches a specific type
   */
  is(type: 'mobile' | 'tablet' | 'desktop'): boolean {
    switch (type) {
      case 'mobile': return this.isMobile();
      case 'tablet': return this.isTablet();
      case 'desktop': return this.isDesktop();
    }
  }

  /**
   * Get responsive class names for styling
   */
  getResponsiveClasses(): string[] {
    const classes: string[] = [];
    
    if (this.isMobile()) classes.push('is-mobile');
    if (this.isTablet()) classes.push('is-tablet');
    if (this.isDesktop()) classes.push('is-desktop');
    if (this.touchEnabled()) classes.push('is-touch');
    if (this.orientation() === 'portrait') classes.push('is-portrait');
    if (this.orientation() === 'landscape') classes.push('is-landscape');
    
    return classes;
  }

  /**
   * Check if screen width is within a custom range
   */
  isWithinRange(minWidth: number, maxWidth?: number): boolean {
    const width = this._screenWidth();
    return width >= minWidth && (maxWidth === undefined || width <= maxWidth);
  }
}
