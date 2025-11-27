import { Injectable } from '@angular/core';

export type ParticleType = 'snow' | 'rain' | 'sparkles' | 'fireflies' | 'bubbles' | 'leaves' | 'embers' | 'stars' | 'confetti' | 'dust' | 'custom';
export type ParticleBlendMode = 'normal' | 'additive' | 'multiply' | 'screen';

export interface ParticleOptions {
  type: ParticleType;
  density: number;        // 0-1: particle count multiplier
  size: number;           // 0.5-10: base particle size
  speed: number;          // 0.1-5: movement speed
  phase: number;          // 0-1: animation phase
  
  // Visual properties
  opacity: number;        // 0-1: particle transparency
  glow: number;           // 0-2: glow intensity
  blur: number;           // 0-5: blur amount
  color: {
    r: number;
    g: number;
    b: number;
  };
  useCustomColor: boolean;
  colorVariation: number; // 0-1: color randomness
  
  // Physics
  gravity: number;        // -2 to 2: vertical force
  wind: number;           // -2 to 2: horizontal force
  turbulence: number;     // 0-2: random movement
  rotation: number;       // 0-5: rotation speed
  
  // Behavior
  fadeIn: number;         // 0-1: fade in distance
  fadeOut: number;        // 0-1: fade out distance
  twinkle: number;        // 0-2: brightness variation
  depth: number;          // 0-1: 3D depth effect
  
  // Spawn area
  spawnArea: 'full' | 'top' | 'bottom' | 'left' | 'right' | 'edges' | 'center';
  
  // Blend mode
  blendMode: ParticleBlendMode;
  
  // Dithering
  ditherEnabled?: boolean;
  ditherAlgorithm?: 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8' | 'floyd-steinberg' | 'atkinson' | 'ordered';
  ditherPalette?: 'monochrome' | 'gameboy' | 'cga' | 'commodore64' | 'apple2' | 'custom';
  ditherIntensity?: number; // 0-1
}

@Injectable({
  providedIn: 'root'
})
export class WebGLParticlesService {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    this.initWebGL();
  }

  private initWebGL(): void {
    try {
      this.canvas = document.createElement('canvas');
      const gl = this.canvas.getContext('webgl', { 
        premultipliedAlpha: false,
        preserveDrawingBuffer: true 
      });
      
      if (!gl) {
        console.warn('WebGL not available for particles');
        return;
      }

      this.gl = gl;
      this.createShaderProgram();
    } catch (e) {
      console.warn('Failed to initialize WebGL for particles:', e);
    }
  }

  private createShaderProgram(): void {
    if (!this.gl) return;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);

    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision highp float;
      
      uniform vec2 uResolution;
      uniform float uTime;
      uniform int uParticleType;
      uniform float uDensity;
      uniform float uSize;
      uniform float uSpeed;
      uniform float uOpacity;
      uniform float uGlow;
      uniform float uBlur;
      uniform vec3 uColor;
      uniform bool uUseCustomColor;
      uniform float uColorVariation;
      uniform float uGravity;
      uniform float uWind;
      uniform float uTurbulence;
      uniform float uRotation;
      uniform float uFadeIn;
      uniform float uFadeOut;
      uniform float uTwinkle;
      uniform float uDepth;
      uniform int uSpawnArea;
      uniform int uBlendMode;
      
      // Dithering uniforms
      uniform bool uDitherEnabled;
      uniform int uDitherAlgorithm; // 0=bayer2x2, 1=bayer4x4, 2=bayer8x8, 3=ordered
      uniform int uDitherPalette; // 0=mono, 1=gameboy, 2=cga, 3=c64, 4=apple2
      uniform float uDitherIntensity;
      
      // Bayer matrices
      const mat2 bayer2 = mat2(0.0, 2.0, 3.0, 1.0) / 4.0;
      const mat4 bayer4 = mat4(
        0.0, 8.0, 2.0, 10.0,
        12.0, 4.0, 14.0, 6.0,
        3.0, 11.0, 1.0, 9.0,
        15.0, 7.0, 13.0, 5.0
      ) / 16.0;
      
      // Color palettes
      vec3 getPaletteColor(int paletteId, int index, int maxIndex) {
        // Monochrome (2 colors)
        if (paletteId == 0) {
          return index == 0 ? vec3(0.0) : vec3(1.0);
        }
        // Game Boy (4 colors)
        else if (paletteId == 1) {
          if (index == 0) return vec3(0.059, 0.220, 0.059);
          if (index == 1) return vec3(0.188, 0.384, 0.188);
          if (index == 2) return vec3(0.545, 0.675, 0.059);
          return vec3(0.608, 0.737, 0.059);
        }
        // CGA (4 colors)
        else if (paletteId == 2) {
          if (index == 0) return vec3(0.0);
          if (index == 1) return vec3(0.0, 1.0, 1.0);
          if (index == 2) return vec3(1.0, 0.0, 1.0);
          return vec3(1.0);
        }
        // Commodore 64 (4 colors)
        else if (paletteId == 3) {
          if (index == 0) return vec3(0.0);
          if (index == 1) return vec3(1.0);
          if (index == 2) return vec3(0.533, 0.0, 0.0);
          return vec3(0.667, 1.0, 0.933);
        }
        // Apple II (16 colors - simplified to 4)
        else if (paletteId == 4) {
          if (index == 0) return vec3(0.0);
          if (index == 1) return vec3(0.447, 0.149, 0.251);
          if (index == 2) return vec3(0.502, 0.529, 0.502);
          return vec3(1.0);
        }
        return vec3(0.5);
      }
      
      // Apply dithering to color
      vec4 applyDithering(vec4 color, vec2 fragCoord) {
        if (!uDitherEnabled || color.a < 0.01) return color;
        
        vec2 pos = mod(fragCoord, uDitherAlgorithm == 0 ? 2.0 : (uDitherAlgorithm == 1 ? 4.0 : 8.0));
        float threshold = 0.5;
        
        // Calculate threshold based on algorithm
        if (uDitherAlgorithm == 0) { // Bayer 2x2
          int idx = int(pos.y) * 2 + int(pos.x);
          if (idx == 0) threshold = 0.0;
          else if (idx == 1) threshold = 0.5;
          else if (idx == 2) threshold = 0.75;
          else threshold = 0.25;
        } else if (uDitherAlgorithm == 1) { // Bayer 4x4
          int idx = int(pos.y) * 4 + int(pos.x);
          if (idx == 0) threshold = 0.0;
          else if (idx == 1) threshold = 0.5;
          else if (idx == 2) threshold = 0.125;
          else if (idx == 3) threshold = 0.625;
          else if (idx == 4) threshold = 0.75;
          else if (idx == 5) threshold = 0.25;
          else if (idx == 6) threshold = 0.875;
          else if (idx == 7) threshold = 0.375;
          else if (idx == 8) threshold = 0.1875;
          else if (idx == 9) threshold = 0.6875;
          else if (idx == 10) threshold = 0.0625;
          else if (idx == 11) threshold = 0.5625;
          else if (idx == 12) threshold = 0.9375;
          else if (idx == 13) threshold = 0.4375;
          else if (idx == 14) threshold = 0.8125;
          else threshold = 0.3125;
        } else if (uDitherAlgorithm == 2) { // Bayer 8x8 (approximated)
          threshold = fract(pos.x * 0.125 + pos.y * 0.5);
        } else { // Ordered dithering
          threshold = fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Quantize to palette
        int paletteSize = uDitherPalette == 0 ? 2 : (uDitherPalette == 4 ? 4 : 4);
        float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // Add threshold
        brightness += (threshold - 0.5) * uDitherIntensity * 0.2;
        brightness = clamp(brightness, 0.0, 1.0);
        
        // Find nearest palette colors
        int index = int(brightness * float(paletteSize - 1) + 0.5);
        vec3 ditherColor = getPaletteColor(uDitherPalette, index, paletteSize);
        
        // Mix based on intensity
        color.rgb = mix(color.rgb, ditherColor, uDitherIntensity);
        
        return color;
      }
      
      // Hash function for pseudo-random
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      
      float hash3(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }
      
      vec2 hash2(vec2 p) {
        return vec2(
          hash(p),
          hash(p + vec2(1.234, 5.678))
        );
      }
      
      // Smooth noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      // Particle rendering based on type
      vec4 renderSnowflake(vec2 particlePos, float particleSize, float particleAlpha, float seed) {
        float d = length(particlePos);
        float arms = 6.0;
        float angle = atan(particlePos.y, particlePos.x);
        float radial = sin(angle * arms + seed * 6.28) * 0.5 + 0.5;
        
        float shape = smoothstep(particleSize, particleSize * 0.5, d) * radial;
        shape += smoothstep(particleSize * 0.3, 0.0, d) * 0.8;
        
        return vec4(0.9, 0.95, 1.0, shape * particleAlpha);
      }
      
      vec4 renderRaindrop(vec2 particlePos, float particleSize, float particleAlpha, float velocity) {
        vec2 stretched = vec2(particlePos.x, particlePos.y * (1.0 + velocity * 2.0));
        float d = length(stretched);
        float shape = smoothstep(particleSize, particleSize * 0.2, d);
        
        return vec4(0.5, 0.6, 0.8, shape * particleAlpha * 0.6);
      }
      
      vec4 renderSparkle(vec2 particlePos, float particleSize, float particleAlpha, float phase) {
        float d = length(particlePos);
        float twinkle = sin(phase * 6.28 + d * 10.0) * 0.5 + 0.5;
        
        // Four-pointed star
        float angle = atan(particlePos.y, particlePos.x);
        float arms = abs(sin(angle * 2.0));
        
        float shape = smoothstep(particleSize, 0.0, d) * arms;
        shape += smoothstep(particleSize * 0.5, 0.0, d);
        
        vec3 color = mix(vec3(1.0, 1.0, 0.8), vec3(1.0, 0.8, 1.0), twinkle);
        return vec4(color, shape * particleAlpha * twinkle);
      }
      
      vec4 renderFirefly(vec2 particlePos, float particleSize, float particleAlpha, float phase) {
        float d = length(particlePos);
        float pulse = sin(phase * 6.28 * 2.0) * 0.3 + 0.7;
        
        float glow = exp(-d * d / (particleSize * particleSize * 0.5)) * pulse;
        float core = smoothstep(particleSize * 0.3, 0.0, d);
        
        vec3 color = vec3(1.0, 0.9, 0.3);
        return vec4(color, (glow * 0.8 + core) * particleAlpha);
      }
      
      vec4 renderBubble(vec2 particlePos, float particleSize, float particleAlpha, float seed) {
        float d = length(particlePos);
        float rim = smoothstep(particleSize, particleSize * 0.8, d) * 
                    smoothstep(particleSize * 0.6, particleSize, d);
        
        // Iridescent effect
        float angle = atan(particlePos.y, particlePos.x);
        vec3 color = vec3(
          sin(angle * 2.0 + seed) * 0.5 + 0.5,
          sin(angle * 2.0 + seed + 2.0) * 0.5 + 0.5,
          sin(angle * 2.0 + seed + 4.0) * 0.5 + 0.5
        );
        
        return vec4(color, rim * particleAlpha * 0.5);
      }
      
      vec4 renderLeaf(vec2 particlePos, float particleSize, float particleAlpha, float rotation) {
        // Rotate particle
        float c = cos(rotation);
        float s = sin(rotation);
        vec2 rotated = vec2(
          particlePos.x * c - particlePos.y * s,
          particlePos.x * s + particlePos.y * c
        );
        
        // Leaf shape
        float d = length(rotated);
        float leaf = smoothstep(particleSize, particleSize * 0.3, d);
        leaf *= smoothstep(-particleSize * 0.5, particleSize * 0.5, rotated.y);
        
        vec3 color = mix(vec3(0.8, 0.5, 0.2), vec3(0.9, 0.7, 0.3), hash(rotated));
        return vec4(color, leaf * particleAlpha);
      }
      
      vec4 renderEmber(vec2 particlePos, float particleSize, float particleAlpha, float phase) {
        float d = length(particlePos);
        float pulse = sin(phase * 6.28) * 0.2 + 0.8;
        
        float glow = exp(-d * d / (particleSize * particleSize)) * pulse;
        vec3 color = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.8, 0.0), pulse);
        
        return vec4(color, glow * particleAlpha);
      }
      
      vec4 renderStar(vec2 particlePos, float particleSize, float particleAlpha, float seed) {
        float d = length(particlePos);
        float angle = atan(particlePos.y, particlePos.x);
        
        // Five-pointed star
        float arms = 5.0;
        float armPattern = sin(angle * arms + seed) * 0.5 + 0.5;
        armPattern = pow(armPattern, 3.0);
        
        float shape = smoothstep(particleSize, 0.0, d) * armPattern;
        shape += smoothstep(particleSize * 0.3, 0.0, d) * 0.5;
        
        return vec4(1.0, 1.0, 0.9, shape * particleAlpha);
      }
      
      vec4 renderConfetti(vec2 particlePos, float particleSize, float particleAlpha, float rotation, float seed) {
        // Rotate
        float c = cos(rotation);
        float s = sin(rotation);
        vec2 rotated = vec2(
          particlePos.x * c - particlePos.y * s,
          particlePos.x * s + particlePos.y * c
        );
        
        // Rectangle shape
        float shape = step(abs(rotated.x), particleSize * 0.8) * 
                     step(abs(rotated.y), particleSize * 0.4);
        
        // Random colors
        vec3 color = vec3(
          hash(vec2(seed, 1.0)),
          hash(vec2(seed, 2.0)),
          hash(vec2(seed, 3.0))
        );
        
        return vec4(color, shape * particleAlpha);
      }
      
      vec4 renderDust(vec2 particlePos, float particleSize, float particleAlpha, float seed) {
        float d = length(particlePos);
        float shape = smoothstep(particleSize, particleSize * 0.3, d);
        
        float variation = hash(vec2(seed)) * 0.3 + 0.7;
        return vec4(vec3(0.7, 0.6, 0.5) * variation, shape * particleAlpha * 0.4);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        vec2 coord = gl_FragCoord.xy;
        
        // Calculate particle count based on density
        int maxParticles = int(200.0 * uDensity);
        
        vec4 finalColor = vec4(0.0);
        
        for (int i = 0; i < 500; i++) {
          if (i >= maxParticles) break;
          
          float seed = float(i) * 0.1;
          vec2 randomOffset = hash2(vec2(seed, seed + 1.0));
          
          // Spawn position based on area
          vec2 spawnPos;
          if (uSpawnArea == 0) { // full
            spawnPos = randomOffset;
          } else if (uSpawnArea == 1) { // top
            spawnPos = vec2(randomOffset.x, 1.0 + randomOffset.y * 0.1);
          } else if (uSpawnArea == 2) { // bottom
            spawnPos = vec2(randomOffset.x, -0.1 + randomOffset.y * 0.1);
          } else if (uSpawnArea == 3) { // left
            spawnPos = vec2(-0.1 + randomOffset.x * 0.1, randomOffset.y);
          } else if (uSpawnArea == 4) { // right
            spawnPos = vec2(1.0 + randomOffset.x * 0.1, randomOffset.y);
          } else if (uSpawnArea == 5) { // edges
            float edge = randomOffset.x;
            if (edge < 0.25) spawnPos = vec2(randomOffset.y, 0.0);
            else if (edge < 0.5) spawnPos = vec2(randomOffset.y, 1.0);
            else if (edge < 0.75) spawnPos = vec2(0.0, randomOffset.y);
            else spawnPos = vec2(1.0, randomOffset.y);
          } else { // center
            spawnPos = vec2(0.5) + (randomOffset - 0.5) * 0.3;
          }
          
          // Animation with physics
          float timeOffset = seed * 10.0;
          float time = uTime * uSpeed + timeOffset;
          
          // Turbulence
          vec2 turbulenceOffset = vec2(
            noise(vec2(time * 0.5 + seed, seed)) - 0.5,
            noise(vec2(seed, time * 0.5 + seed)) - 0.5
          ) * uTurbulence * 0.1;
          
          // Gravity and wind
          vec2 physics = vec2(uWind, -uGravity) * time * 0.1;
          
          // Depth effect (parallax)
          float depthFactor = hash(vec2(seed + 2.0)) * uDepth + (1.0 - uDepth);
          
          // Calculate position
          vec2 particleUV = spawnPos + physics * depthFactor + turbulenceOffset;
          particleUV = fract(particleUV); // Wrap around
          
          vec2 particlePos = (particleUV * uResolution - coord) / uSize;
          
          // Fade in/out based on position
          float fadeAlpha = 1.0;
          if (uFadeIn > 0.0) {
            fadeAlpha *= smoothstep(0.0, uFadeIn, particleUV.y);
          }
          if (uFadeOut > 0.0) {
            fadeAlpha *= smoothstep(1.0, 1.0 - uFadeOut, particleUV.y);
          }
          
          // Twinkle effect
          float twinklePhase = time * 2.0 + seed * 6.28;
          float twinkle = sin(twinklePhase) * uTwinkle * 0.5 + (1.0 - uTwinkle * 0.5);
          fadeAlpha *= twinkle;
          
          // Size variation with depth
          float particleSize = uSize * depthFactor;
          
          // Rotation
          float rotation = time * uRotation + seed * 6.28;
          
          // Phase for animations
          float phase = fract(time * 0.5);
          
          // Render particle based on type
          vec4 particle;
          if (uParticleType == 0) { // snow
            particle = renderSnowflake(particlePos, particleSize, fadeAlpha, seed);
          } else if (uParticleType == 1) { // rain
            particle = renderRaindrop(particlePos, particleSize, fadeAlpha, uSpeed);
          } else if (uParticleType == 2) { // sparkles
            particle = renderSparkle(particlePos, particleSize, fadeAlpha, phase);
          } else if (uParticleType == 3) { // fireflies
            particle = renderFirefly(particlePos, particleSize, fadeAlpha, phase);
          } else if (uParticleType == 4) { // bubbles
            particle = renderBubble(particlePos, particleSize, fadeAlpha, seed);
          } else if (uParticleType == 5) { // leaves
            particle = renderLeaf(particlePos, particleSize, fadeAlpha, rotation);
          } else if (uParticleType == 6) { // embers
            particle = renderEmber(particlePos, particleSize, fadeAlpha, phase);
          } else if (uParticleType == 7) { // stars
            particle = renderStar(particlePos, particleSize, fadeAlpha, seed);
          } else if (uParticleType == 8) { // confetti
            particle = renderConfetti(particlePos, particleSize, fadeAlpha, rotation, seed);
          } else { // dust
            particle = renderDust(particlePos, particleSize, fadeAlpha, seed);
          }
          
          // Apply custom color if enabled
          if (uUseCustomColor) {
            vec3 colorVariationVec = vec3(
              hash(vec2(seed, 1.0)) * uColorVariation,
              hash(vec2(seed, 2.0)) * uColorVariation,
              hash(vec2(seed, 3.0)) * uColorVariation
            );
            particle.rgb = mix(particle.rgb, uColor + colorVariationVec, 0.8);
          }
          
          // Apply glow
          if (uGlow > 0.0) {
            float glowAmount = particle.a * uGlow;
            particle.rgb += particle.rgb * glowAmount;
            particle.a += glowAmount * 0.5;
          }
          
          // Apply opacity
          particle.a *= uOpacity;
          
          // Blend modes
          if (uBlendMode == 1) { // additive
            finalColor.rgb += particle.rgb * particle.a;
            finalColor.a = max(finalColor.a, particle.a);
          } else if (uBlendMode == 2) { // multiply
            finalColor.rgb = mix(finalColor.rgb, finalColor.rgb * particle.rgb, particle.a);
            finalColor.a = max(finalColor.a, particle.a);
          } else if (uBlendMode == 3) { // screen
            finalColor.rgb = 1.0 - (1.0 - finalColor.rgb) * (1.0 - particle.rgb * particle.a);
            finalColor.a = max(finalColor.a, particle.a);
          } else { // normal
            finalColor.rgb = mix(finalColor.rgb, particle.rgb, particle.a);
            finalColor.a = max(finalColor.a, particle.a);
          }
        }
        
        // Apply dithering to final color
        finalColor = applyDithering(finalColor, gl_FragCoord.xy);
        
        gl_FragColor = finalColor;
      }
    `);

    if (!vertexShader || !fragmentShader) return;

    this.program = this.gl.createProgram();
    if (!this.program) return;

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Shader program link failed:', this.gl.getProgramInfoLog(this.program));
      return;
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  isAvailable(): boolean {
    return this.gl !== null && this.program !== null;
  }

  renderParticles(imageData: ImageData, options: ParticleOptions): ImageData | null {
    if (!this.gl || !this.program || !this.canvas) return null;

    const { width, height } = imageData;
    this.canvas.width = width;
    this.canvas.height = height;

    this.gl.viewport(0, 0, width, height);
    this.gl.useProgram(this.program);

    // Set up quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const setUniform = (name: string, value: any, type: string) => {
      const location = this.gl!.getUniformLocation(this.program!, name);
      if (location === null) return;
      
      switch (type) {
        case '1f': this.gl!.uniform1f(location, value); break;
        case '1i': this.gl!.uniform1i(location, value); break;
        case '2f': this.gl!.uniform2f(location, value[0], value[1]); break;
        case '3f': this.gl!.uniform3f(location, value[0], value[1], value[2]); break;
        case '1b': this.gl!.uniform1i(location, value ? 1 : 0); break;
      }
    };

    setUniform('uResolution', [width, height], '2f');
    setUniform('uTime', options.phase, '1f');
    setUniform('uDensity', options.density, '1f');
    setUniform('uSize', options.size * 10, '1f');
    setUniform('uSpeed', options.speed, '1f');
    setUniform('uOpacity', options.opacity, '1f');
    setUniform('uGlow', options.glow, '1f');
    setUniform('uBlur', options.blur, '1f');
    setUniform('uColor', [options.color.r / 255, options.color.g / 255, options.color.b / 255], '3f');
    setUniform('uUseCustomColor', options.useCustomColor, '1b');
    setUniform('uColorVariation', options.colorVariation, '1f');
    setUniform('uGravity', options.gravity, '1f');
    setUniform('uWind', options.wind, '1f');
    setUniform('uTurbulence', options.turbulence, '1f');
    setUniform('uRotation', options.rotation, '1f');
    setUniform('uFadeIn', options.fadeIn, '1f');
    setUniform('uFadeOut', options.fadeOut, '1f');
    setUniform('uTwinkle', options.twinkle, '1f');
    setUniform('uDepth', options.depth, '1f');

    // Map particle type to int
    const typeMap: Record<ParticleType, number> = {
      'snow': 0, 'rain': 1, 'sparkles': 2, 'fireflies': 3, 'bubbles': 4,
      'leaves': 5, 'embers': 6, 'stars': 7, 'confetti': 8, 'dust': 9, 'custom': 10
    };
    setUniform('uParticleType', typeMap[options.type], '1i');

    // Map spawn area to int
    const spawnMap: Record<string, number> = {
      'full': 0, 'top': 1, 'bottom': 2, 'left': 3, 'right': 4, 'edges': 5, 'center': 6
    };
    setUniform('uSpawnArea', spawnMap[options.spawnArea], '1i');

    // Map blend mode to int
    const blendMap: Record<ParticleBlendMode, number> = {
      'normal': 0, 'additive': 1, 'multiply': 2, 'screen': 3
    };
    setUniform('uBlendMode', blendMap[options.blendMode], '1i');

    // Dithering uniforms
    setUniform('uDitherEnabled', options.ditherEnabled || false, '1b');
    const ditherAlgoMap: Record<string, number> = {
      'bayer-2x2': 0, 'bayer-4x4': 1, 'bayer-8x8': 2, 'floyd-steinberg': 3, 'atkinson': 3, 'ordered': 3
    };
    setUniform('uDitherAlgorithm', ditherAlgoMap[options.ditherAlgorithm || 'bayer-4x4'], '1i');
    const ditherPaletteMap: Record<string, number> = {
      'monochrome': 0, 'gameboy': 1, 'cga': 2, 'commodore64': 3, 'apple2': 4, 'custom': 1
    };
    setUniform('uDitherPalette', ditherPaletteMap[options.ditherPalette || 'gameboy'], '1i');
    setUniform('uDitherIntensity', options.ditherIntensity ?? 1.0, '1f');

    // Draw
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(width * height * 4);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    // Flip vertically (WebGL has different coordinate system)
    const flipped = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4;
      const dstRow = y * width * 4;
      flipped.set(pixels.slice(srcRow, srcRow + width * 4), dstRow);
    }

    // Composite with original image
    const result = new ImageData(width, height);
    for (let i = 0; i < result.data.length; i += 4) {
      result.data[i] = imageData.data[i];
      result.data[i + 1] = imageData.data[i + 1];
      result.data[i + 2] = imageData.data[i + 2];
      result.data[i + 3] = imageData.data[i + 3];

      const particleAlpha = flipped[i + 3] / 255;
      if (particleAlpha > 0) {
        result.data[i] = Math.round(result.data[i] * (1 - particleAlpha) + flipped[i] * particleAlpha);
        result.data[i + 1] = Math.round(result.data[i + 1] * (1 - particleAlpha) + flipped[i + 1] * particleAlpha);
        result.data[i + 2] = Math.round(result.data[i + 2] * (1 - particleAlpha) + flipped[i + 2] * particleAlpha);
      }
    }

    return result;
  }
}
