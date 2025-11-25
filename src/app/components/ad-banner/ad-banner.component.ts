import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdsService } from '../../services/ads.service';

/**
 * Reusable Ad Banner Component
 * Usage: <app-ad-banner position="header"></app-ad-banner>
 */

@Component({
  selector: 'app-ad-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ad-banner-container" [class.ad-hidden]="!showAd">
      <div class="ad-label">Advertisement</div>
      <div #adContainer [id]="adId" class="ad-content"></div>
      
      @if (adsService.isAdBlockDetected()) {
        <div class="ad-blocker-message">
          <p>💰 Support us by disabling your ad blocker</p>
          <p class="ad-small">Ads help keep this tool free!</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .ad-banner-container {
      width: 100%;
      margin: 1rem 0;
      padding: 1rem;
      background: var(--theme-surface, rgba(255, 255, 255, 0.02));
      border: 2px solid var(--theme-border, rgba(0, 255, 0, 0.2));
      position: relative;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .ad-banner-container.ad-hidden {
      display: none;
    }

    .ad-label {
      font-size: 0.65rem;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.4));
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    .ad-content {
      width: 100%;
      min-height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ad-blocker-message {
      text-align: center;
      padding: 1rem;
      background: var(--theme-background, rgba(0, 0, 0, 0.3));
      border: 2px dashed var(--theme-accent, #ff7700);
      width: 100%;
    }

    .ad-blocker-message p {
      margin: 0.25rem 0;
      color: var(--theme-text, rgba(255, 255, 255, 0.9));
      font-size: 0.85rem;
    }

    .ad-small {
      font-size: 0.7rem;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.6));
    }

    /* Responsive */
    @media (max-width: 768px) {
      .ad-banner-container {
        margin: 0.5rem 0;
        padding: 0.75rem;
      }
    }
  `]
})
export class AdBannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() position: 'header' | 'sidebar' | 'footer' | 'inContent' = 'header';
  @Input() showAd = true;
  @ViewChild('adContainer') adContainer!: ElementRef;

  adId: string;

  constructor(public adsService: AdsService) {
    this.adId = `ad-${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnInit(): void {
    console.log(`🎯 Ad Banner initialized for position: ${this.position}`);
  }

  ngAfterViewInit(): void {
    // Wait a bit before showing ads (better UX)
    setTimeout(() => {
      this.loadAd();
    }, 1000);
  }

  private loadAd(): void {
    if (!this.adsService.isAdsEnabled()) {
      this.showAd = false;
      return;
    }

    const config = this.adsService.getAdConfig(this.position);
    this.adsService.showAd(this.adId, config);
  }

  ngOnDestroy(): void {
    this.adsService.removeAd(this.adId);
  }
}
