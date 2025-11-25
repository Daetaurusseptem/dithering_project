import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

/**
 * Terms of Service Component
 * Legal requirements for service usage
 */

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [attr.data-theme]="themeService.currentTheme()">
    <div class="legal-page">
      <div class="legal-header">
        <span class="retro-emoji">📜</span>
        <h1>Terms of Service</h1>
      </div>
      
      <p class="last-updated">Last Updated: November 25, 2025</p>
      
      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🤝</span>
          <h2>Agreement to Terms</h2>
        </div>
        <p>
          By accessing or using Dithering Converter, you agree to be bound by these Terms of Service. 
          If you disagree with any part, you may not use our service.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🎨</span>
          <h2>Service Description</h2>
        </div>
        <p>
          Dithering Converter is a <strong>free, client-side web application</strong> that provides:
        </p>
        <ul>
          <li>Image dithering with multiple algorithms</li>
          <li>AI-powered background removal</li>
          <li>GIF animation creation</li>
          <li>Layer-based image composition</li>
          <li>Sprite sheet management</li>
        </ul>
        <div class="info-box">
          <p><strong>⚡ Client-Side Processing:</strong></p>
          <p>
            All image processing happens in your browser. We do not store, transmit, or have access to your images.
          </p>
        </div>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">✅</span>
          <h2>Acceptable Use</h2>
        </div>
        <p>You agree to:</p>
        <ul>
          <li>Use the service for lawful purposes only</li>
          <li>Not process illegal, harmful, or offensive content</li>
          <li>Not attempt to hack, reverse-engineer, or abuse the service</li>
          <li>Not use automated tools to overload our servers</li>
          <li>Respect intellectual property rights of others</li>
        </ul>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🖼️</span>
          <h2>Your Content & Intellectual Property</h2>
        </div>
        
        <div class="subsection">
          <h3>Ownership</h3>
          <p>
            You retain all rights to images you process. We claim no ownership over your content.
          </p>
        </div>

        <div class="subsection">
          <h3>Responsibility</h3>
          <p>
            You are solely responsible for ensuring you have the right to process and download any images you use.
          </p>
        </div>

        <div class="subsection">
          <h3>Open Source</h3>
          <p>
            This application is open-source software. The code is available on GitHub under the MIT License.
          </p>
        </div>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">⚠️</span>
          <h2>Disclaimers & Limitations</h2>
        </div>
        
        <div class="warning-box">
          <p><strong>AS-IS Service:</strong></p>
          <ul>
            <li>The service is provided "AS IS" without warranties of any kind</li>
            <li>We do not guarantee uptime, accuracy, or fitness for a particular purpose</li>
            <li>Image quality and processing speed may vary</li>
          </ul>
        </div>

        <div class="subsection">
          <h3>Limitation of Liability</h3>
          <p>
            We are not liable for any damages arising from:
          </p>
          <ul>
            <li>Loss of data or image quality</li>
            <li>Service interruptions or downtime</li>
            <li>Browser compatibility issues</li>
            <li>Third-party service failures (AI models, CDN, etc.)</li>
          </ul>
        </div>

        <div class="subsection">
          <h3>AI Model Disclaimer</h3>
          <p>
            AI background removal uses third-party models from HuggingFace. 
            Results may vary and are not guaranteed to be accurate.
          </p>
        </div>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">📢</span>
          <h2>Advertising</h2>
        </div>
        <p>
          We display advertisements via Google AdSense to support this free service. By using our service, you agree to:
        </p>
        <ul>
          <li>View advertisements (unless using an ad blocker)</li>
          <li>Google's use of cookies for ad personalization</li>
          <li>Not click ads fraudulently or encourage others to do so</li>
        </ul>
        <p>
          See our <a href="/privacy">Privacy Policy</a> for details on how ads work.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🔄</span>
          <h2>Service Modifications</h2>
        </div>
        <p>
          We reserve the right to:
        </p>
        <ul>
          <li>Modify or discontinue features at any time</li>
          <li>Change pricing (currently free)</li>
          <li>Update these Terms of Service</li>
          <li>Restrict access if terms are violated</li>
        </ul>
        <p>
          Continued use after changes constitutes acceptance of new terms.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🌐</span>
          <h2>Third-Party Services</h2>
        </div>
        <p>This service uses:</p>
        <ul>
          <li><strong>HuggingFace Transformers:</strong> AI models for background removal</li>
          <li><strong>Google AdSense:</strong> Advertising platform</li>
          <li><strong>Netlify:</strong> Hosting and CDN</li>
          <li><strong>GitHub:</strong> Code repository</li>
        </ul>
        <p>
          We are not responsible for third-party services. Each has its own terms and policies.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">⚖️</span>
          <h2>Governing Law</h2>
        </div>
        <p>
          These terms are governed by the laws of Mexico. 
          Any disputes shall be resolved in the applicable courts of Mexico.
        </p>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">🚫</span>
          <h2>Termination</h2>
        </div>
        <p>
          We may terminate or suspend your access immediately, without notice, for conduct that we believe:
        </p>
        <ul>
          <li>Violates these Terms of Service</li>
          <li>Is harmful to other users</li>
          <li>Exposes us to liability</li>
          <li>Violates applicable law</li>
        </ul>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">📧</span>
          <h2>Contact & Support</h2>
        </div>
        <div class="contact-box">
          <p><strong>Questions or Issues?</strong></p>
          <p><strong>GitHub:</strong> <a href="https://github.com/Daetaurusseptem/dithering_project" target="_blank" rel="noopener">Open an Issue</a></p>
          <p><strong>Email:</strong> jaimeaburcalv@gmail.com</p>
        </div>
      </section>

      <section class="legal-section">
        <div class="section-title">
          <span class="retro-emoji">📝</span>
          <h2>Entire Agreement</h2>
        </div>
        <p>
          These Terms of Service, together with our Privacy Policy, constitute the entire agreement 
          between you and Dithering Converter regarding use of the service.
        </p>
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

    .info-box, .contact-box, .warning-box {
      background: var(--theme-background, rgba(0, 0, 0, 0.3));
      border: 3px solid var(--theme-primary, #00ff00);
      border-radius: 0;
      padding: 1rem;
      margin: 1rem 0;
    }

    .warning-box {
      border-color: var(--theme-accent, #ff7700);
      background: rgba(255, 119, 0, 0.05);
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
export class TermsOfServiceComponent {
  constructor(public themeService: ThemeService) {}
}
