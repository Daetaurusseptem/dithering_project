import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

/**
 * Privacy Policy Component
 * Required by Google AdSense and GDPR compliance
 */

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [attr.data-theme]="themeService.currentTheme()">
    <div class="legal-page">
      <div class="legal-header">
        <span class="retro-emoji">🔒</span>
        <h1>Privacy Policy</h1>
      </div>
      
      <p class="last-updated">Last Updated: November 25, 2025</p>
      
      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">📋</span>
          <h2>Overview</h2>
        </div>
        <p>
          Dithering Converter ("we", "our", "us") respects your privacy. 
          This policy explains how we collect, use, and protect your information when you use our web application.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">💾</span>
          <h2>Information We Collect</h2>
        </div>
        
        <div class="subsection">
          <h3>Images You Upload</h3>
          <ul>
            <li>All image processing happens <strong>locally in your browser</strong></li>
            <li>Images are <strong>never uploaded</strong> to our servers</li>
            <li>We do not store, transmit, or have access to your images</li>
          </ul>
        </div>

        <div class="subsection">
          <h3>Local Storage</h3>
          <ul>
            <li>We store preferences (theme, language, favorites) in your browser's Local Storage</li>
            <li>You control this data and can clear it anytime</li>
            <li>No personal information is stored</li>
          </ul>
        </div>

        <div class="subsection">
          <h3>Camera Access</h3>
          <ul>
            <li>If you use the camera feature, we request camera permission</li>
            <li>Camera feed is processed locally, never transmitted</li>
            <li>You can revoke permission anytime in browser settings</li>
          </ul>
        </div>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">📢</span>
          <h2>Advertising & Third-Party Services</h2>
        </div>
        
        <div class="subsection">
          <h3>Google AdSense</h3>
          <p>We use Google AdSense to display advertisements. Google may use cookies and web beacons to:</p>
          <ul>
            <li>Show ads based on your interests</li>
            <li>Measure ad effectiveness</li>
            <li>Prevent fraud and abuse</li>
          </ul>
          <p>
            Learn more: 
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">
              Google's Advertising Policies
            </a>
          </p>
        </div>

        <div class="subsection">
          <h3>AI Models (HuggingFace)</h3>
          <p>
            We use AI models from HuggingFace CDN for background removal. 
            Models are downloaded to your browser but no data is sent to HuggingFace servers.
          </p>
        </div>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🍪</span>
          <h2>Cookies & Tracking</h2>
        </div>
        
        <div class="info-box">
          <p><strong>We use cookies for:</strong></p>
          <ul>
            <li><strong>Essential cookies:</strong> Theme, language, app functionality</li>
            <li><strong>Advertising cookies:</strong> Google AdSense personalization</li>
          </ul>
        </div>

        <p>
          You can disable cookies in your browser, but some features may not work properly.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🔐</span>
          <h2>Data Security</h2>
        </div>
        <ul>
          <li>All processing happens client-side (your browser)</li>
          <li>HTTPS encryption for all connections</li>
          <li>No server-side storage of user data</li>
          <li>Open-source code (auditable)</li>
        </ul>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">👤</span>
          <h2>Your Rights (GDPR/CCPA)</h2>
        </div>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> All data is in your browser (F12 → Application → Local Storage)</li>
          <li><strong>Delete:</strong> Clear browser data or click "Reset Settings" in the app</li>
          <li><strong>Opt-out:</strong> Use an ad blocker or disable cookies</li>
          <li><strong>Portability:</strong> Export your presets/palettes (coming soon)</li>
        </ul>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🌍</span>
          <h2>International Users</h2>
        </div>
        <p>
          This service is hosted globally via Netlify CDN. No personal data is transferred internationally 
          since all processing is client-side.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">👶</span>
          <h2>Children's Privacy</h2>
        </div>
        <p>
          This service does not knowingly collect information from children under 13. 
          If you believe a child has used this service, please contact us.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">📝</span>
          <h2>Changes to This Policy</h2>
        </div>
        <p>
          We may update this policy periodically. Changes will be posted on this page with 
          an updated "Last Updated" date.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">📧</span>
          <h2>Contact Us</h2>
        </div>
        <p>Questions about this Privacy Policy?</p>
        <div class="contact-box">
          <p><strong>GitHub:</strong> <a href="https://github.com/Daetaurusseptem/dithering_project" target="_blank" rel="noopener">Open an Issue</a></p>
          <p><strong>Email:</strong> jaimeaburcalv@gmail.com</p>
        </div>
      </section>

      <div class="back-link">
        <a href="/" class="btn-back">
          <span class="retro-emoji">⬅️</span>
          Back to App
        </a>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: var(--theme-background, #0a0a0a);
      color: var(--theme-text, #e0e0e0);
      line-height: 1.8;
      font-size: 0.75rem;
      min-height: 100vh;
    }

    .legal-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 3px solid var(--theme-primary, #00ff00);
    }

    .legal-header h1 {
      font-size: 1.5rem;
      color: var(--theme-primary, #00ff00);
      text-shadow: 0 0 10px var(--theme-glow-color, rgba(0, 255, 0, 0.6));
      margin: 0;
    }

    .last-updated {
      font-size: 0.65rem;
      color: var(--theme-text-muted, rgba(255, 255, 255, 0.5));
      margin-bottom: 2rem;
      font-style: italic;
    }

    .legal-section {
      margin-bottom: 2.5rem;
      padding: 1.5rem;
      background: var(--theme-surface, rgba(255, 255, 255, 0.02));
      border: 3px solid var(--theme-border, rgba(0, 255, 0, 0.2));
      border-radius: 0;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .section-title h2 {
      font-size: 1rem;
      color: var(--theme-accent, #ff7700);
      text-shadow: 0 0 8px var(--theme-accent-glow, rgba(255, 119, 0, 0.4));
      margin: 0;
    }

    .subsection {
      margin: 1.5rem 0;
      padding-left: 1rem;
      border-left: 3px solid var(--theme-primary, #00ff00);
    }

    .subsection h3 {
      font-size: 0.8rem;
      color: var(--theme-secondary, #90ee90);
      margin-bottom: 0.5rem;
    }

    p {
      margin: 0.75rem 0;
      color: var(--theme-text, rgba(255, 255, 255, 0.85));
    }

    ul {
      list-style: none;
      padding-left: 0;
      margin: 0.5rem 0;
    }

    ul li {
      padding: 0.4rem 0;
      padding-left: 1.5rem;
      position: relative;
      color: var(--theme-text, rgba(255, 255, 255, 0.8));
    }

    ul li::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: var(--theme-primary, #00ff00);
      font-weight: bold;
    }

    strong {
      color: var(--theme-primary, #00ff00);
      font-weight: 600;
    }

    a {
      color: var(--theme-accent, #ff7700);
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.2s;
    }

    a:hover {
      border-bottom-color: var(--theme-accent, #ff7700);
      text-shadow: 0 0 8px var(--theme-accent-glow, rgba(255, 119, 0, 0.6));
    }

    .info-box, .contact-box {
      background: var(--theme-background, rgba(0, 0, 0, 0.3));
      border: 3px solid var(--theme-primary, #00ff00);
      border-radius: 0;
      padding: 1rem;
      margin: 1rem 0;
    }

    .contact-box p {
      margin: 0.5rem 0;
    }

    .retro-emoji {
      display: inline-block;
      font-size: 1.5rem;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      filter: 
        drop-shadow(0 0 4px var(--theme-glow-color, rgba(0, 255, 0, 0.4)))
        contrast(1.2);
      position: relative;
    }

    .retro-emoji::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        transparent 0px,
        rgba(0, 0, 0, 0.1) 1px,
        transparent 2px
      );
      pointer-events: none;
    }

    .back-link {
      margin-top: 3rem;
      text-align: center;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--theme-surface, rgba(255, 255, 255, 0.05));
      border: 3px solid var(--theme-primary, #00ff00);
      border-radius: 0;
      color: var(--theme-primary, #00ff00);
      font-family: 'Press Start 2P', monospace;
      font-size: 0.7rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: var(--theme-primary, #00ff00);
      color: var(--theme-background, #000);
      box-shadow: 0 0 20px var(--theme-glow-color, rgba(0, 255, 0, 0.6));
      transform: translateY(-2px);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .legal-page {
        padding: 1rem;
        font-size: 0.65rem;
      }

      .legal-header h1 {
        font-size: 1.2rem;
      }

      .section-title h2 {
        font-size: 0.85rem;
      }

      .legal-section {
        padding: 1rem;
      }

      .retro-emoji {
        font-size: 1.2rem;
      }
    }
  `]
})
export class PrivacyPolicyComponent {
  constructor(public themeService: ThemeService) {}
}
