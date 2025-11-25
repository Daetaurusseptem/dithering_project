import { Injectable, signal } from '@angular/core';

/**
 * Google AdSense Service
 * Manages ad initialization and display
 */

export interface AdConfig {
  client: string; // ca-pub-XXXXXXXXXXXXXXXX
  slot: string;   // Ad slot ID
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdsService {
  private adsEnabled = signal(true);
  private adsInitialized = signal(false);
  private adBlockDetected = signal(false);
  
  // TODO: Replace with your actual AdSense credentials
  private readonly AD_CLIENT = 'ca-pub-0000000000000000'; // 🔴 REPLACE THIS
  
  // Ad slots for different positions
  readonly adSlots = {
    header: '0000000000', // 🔴 REPLACE THIS
    sidebar: '1111111111', // 🔴 REPLACE THIS
    footer: '2222222222', // 🔴 REPLACE THIS
    inContent: '3333333333' // 🔴 REPLACE THIS
  };

  constructor() {
    console.log('💰 Ads Service initialized');
  }

  /**
   * Initialize Google AdSense
   * Call this once in app initialization
   */
  async initializeAds(): Promise<boolean> {
    if (this.adsInitialized()) {
      console.log('✅ Ads already initialized');
      return true;
    }

    try {
      // Check if AdSense script is already loaded
      if (typeof (window as any).adsbygoogle !== 'undefined') {
        console.log('✅ AdSense script already loaded');
        this.adsInitialized.set(true);
        return true;
      }

      // Load AdSense script dynamically
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.AD_CLIENT}`;
      script.crossOrigin = 'anonymous';
      
      // Wait for script to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      console.log('✅ AdSense script loaded successfully');
      this.adsInitialized.set(true);
      
      // Detect ad blocker
      this.detectAdBlocker();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load AdSense:', error);
      this.adsEnabled.set(false);
      return false;
    }
  }

  /**
   * Display an ad in a specific container
   */
  showAd(containerId: string, config: Partial<AdConfig> = {}): void {
    if (!this.adsEnabled()) {
      console.warn('⚠️ Ads are disabled');
      return;
    }

    if (!this.adsInitialized()) {
      console.warn('⚠️ Ads not initialized. Call initializeAds() first');
      return;
    }

    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`❌ Ad container '${containerId}' not found`);
        return;
      }

      // Create ad element
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', config.client || this.AD_CLIENT);
      ins.setAttribute('data-ad-slot', config.slot || this.adSlots.header);
      
      if (config.format) {
        ins.setAttribute('data-ad-format', config.format);
      }
      
      if (config.responsive !== false) {
        ins.setAttribute('data-full-width-responsive', 'true');
      }

      // Clear container and add ad
      container.innerHTML = '';
      container.appendChild(ins);

      // Push ad to AdSense
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      
      console.log(`✅ Ad displayed in '${containerId}'`);
    } catch (error) {
      console.error('❌ Failed to display ad:', error);
    }
  }

  /**
   * Remove ad from container
   */
  removeAd(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      console.log(`🗑️ Ad removed from '${containerId}'`);
    }
  }

  /**
   * Detect if user has ad blocker
   */
  private detectAdBlocker(): void {
    setTimeout(() => {
      const testAd = document.querySelector('.adsbygoogle');
      if (testAd && (testAd as HTMLElement).offsetHeight === 0) {
        this.adBlockDetected.set(true);
        console.warn('⚠️ Ad blocker detected');
      }
    }, 2000);
  }

  /**
   * Check if ads are enabled
   */
  isAdsEnabled(): boolean {
    return this.adsEnabled();
  }

  /**
   * Check if ad blocker is detected
   */
  isAdBlockDetected(): boolean {
    return this.adBlockDetected();
  }

  /**
   * Disable ads (e.g., for premium users)
   */
  disableAds(): void {
    this.adsEnabled.set(false);
    console.log('🚫 Ads disabled');
  }

  /**
   * Enable ads
   */
  enableAds(): void {
    this.adsEnabled.set(true);
    console.log('✅ Ads enabled');
  }

  /**
   * Get ad configuration for a position
   */
  getAdConfig(position: keyof typeof this.adSlots): AdConfig {
    return {
      client: this.AD_CLIENT,
      slot: this.adSlots[position],
      format: 'auto',
      responsive: true
    };
  }
}
