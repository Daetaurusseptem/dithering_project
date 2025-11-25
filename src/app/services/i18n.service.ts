import { Injectable, signal } from '@angular/core';

export type Language = 'en' | 'es' | 'ja';

interface Translations {
  [key: string]: {
    en: string;
    es: string;
    ja: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly STORAGE_KEY = 'dithering_language';
  
  currentLanguage = signal<Language>(this.loadLanguage());
  
  private translations: Translations = {
    // Main UI
    'app.title': {
      en: 'Ditheroid',
      es: 'Ditheroid',
      ja: 'Ditheroid'
    },
    'app.subtitle': {
      en: 'Advanced Creative Error Diffusion',
      es: 'Difusión de Error Creativa Avanzada',
      ja: '高度なエラー拡散処理'
    },
    'app.preview': {
      en: 'Preview',
      es: 'Vista Previa',
      ja: 'プレビュー'
    },
    
    // Upload
    'upload.title': {
      en: 'Click to Upload Image',
      es: 'Haz clic para Cargar Imagen',
      ja: '画像をアップロードするにはクリック'
    },
    'upload.dragDrop': {
      en: 'or drag and drop your image here',
      es: 'o arrastra y suelta tu imagen aquí',
      ja: 'または画像をドラッグ＆ドロップ'
    },
    'upload.formats': {
      en: 'Supports JPG, PNG, GIF',
      es: 'Soporta JPG, PNG, GIF',
      ja: 'JPG、PNG、GIF対応'
    },
    
    // Controls
    'controls.title': {
      en: 'Controls',
      es: 'Controles',
      ja: 'コントロール'
    },
    'controls.reset': {
      en: 'Reset',
      es: 'Restablecer',
      ja: 'リセット'
    },
    'controls.style': {
      en: 'Style',
      es: 'Estilo',
      ja: 'スタイル'
    },
    'controls.createPalette': {
      en: 'Create Custom Palette',
      es: 'Crear Paleta Personalizada',
      ja: 'カスタムパレットを作成'
    },
    'app.composition': {
      en: 'Composition',
      es: 'Composición',
      ja: 'コンポジション'
    },
    'app.gifStudio': {
      en: 'GIF Studio',
      es: 'Estudio GIF',
      ja: 'GIFスタジオ'
    },
    
    // Buttons
    'button.upload': {
      en: 'Upload Image',
      es: 'Cargar Imagen',
      ja: '画像をアップロード'
    },
    'button.download': {
      en: 'Download',
      es: 'Descargar',
      ja: 'ダウンロード'
    },
    'button.saveGallery': {
      en: 'Save to Gallery',
      es: 'Guardar en Galería',
      ja: 'ギャラリーに保存'
    },
    'button.apply': {
      en: 'Apply',
      es: 'Aplicar',
      ja: '適用'
    },
    'button.cancel': {
      en: 'Cancel',
      es: 'Cancelar',
      ja: 'キャンセル'
    },
    
    // Dithering
    'dither.algorithm': {
      en: 'Algorithm',
      es: 'Algoritmo',
      ja: 'アルゴリズム'
    },
    'dither.palette': {
      en: 'Palette',
      es: 'Paleta',
      ja: 'パレット'
    },
    'dither.scale': {
      en: 'Scale',
      es: 'Escala',
      ja: 'スケール'
    },
    'dither.contrast': {
      en: 'Contrast',
      es: 'Contraste',
      ja: 'コントラスト'
    },
    'dither.midtones': {
      en: 'Midtones',
      es: 'Medios Tonos',
      ja: '中間調'
    },
    'dither.highlights': {
      en: 'Highlights',
      es: 'Altas Luces',
      ja: 'ハイライト'
    },
    'dither.blur': {
      en: 'Blur',
      es: 'Desenfoque',
      ja: 'ぼかし'
    },
    
    // Mobile specific
    'mobile.uploadPlaceholder': {
      en: 'Upload an image to start',
      es: 'Sube una imagen para comenzar',
      ja: '画像をアップロードして開始'
    },
    'mobile.gifPlaceholder': {
      en: 'Create GIF layers to preview',
      es: 'Crea capas GIF para previsualizar',
      ja: 'GIFレイヤーを作成してプレビュー'
    },
    'mobile.effectsTitle': {
      en: 'Effects',
      es: 'Efectos',
      ja: 'エフェクト'
    },
    'mobile.noEffects': {
      en: 'No effects added',
      es: 'Sin efectos agregados',
      ja: 'エフェクトなし'
    },
    'mobile.addEffect': {
      en: '+ Add Effect',
      es: '+ Agregar Efecto',
      ja: '+ エフェクト追加'
    },
    'mobile.intensity': {
      en: 'Intensity',
      es: 'Intensidad',
      ja: '強度'
    },
    'mobile.amount': {
      en: 'Amount',
      es: 'Cantidad',
      ja: '量'
    },
    'mobile.speed': {
      en: 'Speed',
      es: 'Velocidad',
      ja: '速度'
    },
    'mobile.size': {
      en: 'Size',
      es: 'Tamaño',
      ja: 'サイズ'
    },
    
    // Gallery mobile
    'gallery.searchPlaceholder': {
      en: '🔍 Search gallery...',
      es: '🔍 Buscar en galería...',
      ja: '🔍 ギャラリーを検索...'
    },
    'gallery.empty': {
      en: 'No saved images',
      es: 'Sin imágenes guardadas',
      ja: '保存された画像なし'
    },
    'gallery.emptyHint': {
      en: 'Save your work to see it here',
      es: 'Guarda tu trabajo para verlo aquí',
      ja: 'ここに表示するには作業を保存'
    },
    'gallery.loadToCanvas': {
      en: 'Load to Canvas',
      es: 'Cargar en Lienzo',
      ja: 'キャンバスに読込'
    },
    'gallery.delete': {
      en: 'Delete',
      es: 'Eliminar',
      ja: '削除'
    },
    'gallery.today': {
      en: 'Today',
      es: 'Hoy',
      ja: '今日'
    },
    'gallery.yesterday': {
      en: 'Yesterday',
      es: 'Ayer',
      ja: '昨日'
    },
    'gallery.daysAgo': {
      en: 'days ago',
      es: 'hace días',
      ja: '日前'
    },
    
    // Settings mobile
    'settings.theme': {
      en: '🎨 Theme',
      es: '🎨 Tema',
      ja: '🎨 テーマ'
    },
    'settings.language': {
      en: '🌐 Language',
      es: '🌐 Idioma',
      ja: '🌐 言語'
    },
    'settings.storage': {
      en: '💾 Storage',
      es: '💾 Almacenamiento',
      ja: '💾 ストレージ'
    },
    'settings.about': {
      en: 'ℹ️ About',
      es: 'ℹ️ Acerca de',
      ja: 'ℹ️ について'
    },
    'settings.galleryItems': {
      en: 'Gallery Items',
      es: 'Elementos de Galería',
      ja: 'ギャラリー項目'
    },
    'settings.clearGallery': {
      en: '🗑️ Clear Gallery',
      es: '🗑️ Limpiar Galería',
      ja: '🗑️ ギャラリー削除'
    },
    'settings.appDescription': {
      en: 'Retro pixel art dithering tool',
      es: 'Herramienta de dithering pixel art retro',
      ja: 'レトロなピクセルアートディザリングツール'
    },
    
    // Buttons & Actions
    'button.presets': {
      en: 'Presets',
      es: 'Ajustes Predefinidos',
      ja: 'プリセット'
    },
    'button.customWaifu': {
      en: 'Custom Waifu Sprite',
      es: 'Sprite Waifu Personalizado',
      ja: 'カスタムスプライト'
    },
    'button.level': {
      en: 'Level',
      es: 'Nivel',
      ja: 'レベル'
    },
    'button.gallery': {
      en: 'Gallery',
      es: 'Galería',
      ja: 'ギャラリー'
    },
    'button.settings': {
      en: 'Settings',
      es: 'Configuración',
      ja: '設定'
    },
    'button.gifStudio': {
      en: 'GIF Studio',
      es: 'Estudio GIF',
      ja: 'GIFスタジオ'
    },
    'button.gifMode': {
      en: 'GIF Mode',
      es: 'Modo GIF',
      ja: 'GIFモード'
    },
    'button.compositionMode': {
      en: 'Composition Mode',
      es: 'Modo Composición',
      ja: 'コンポジションモード'
    },
    'button.showWaifu': {
      en: 'Show Waifu',
      es: 'Mostrar Waifu',
      ja: 'Waifuを表示'
    },
    
    // Layers
    'layers.title': {
      en: 'Layers',
      es: 'Capas',
      ja: 'レイヤー'
    },
    'layers.add': {
      en: 'Add Layer',
      es: 'Añadir Capa',
      ja: 'レイヤーを追加'
    },
    'layers.duplicate': {
      en: 'Duplicate',
      es: 'Duplicar',
      ja: '複製'
    },
    'layers.delete': {
      en: 'Delete',
      es: 'Eliminar',
      ja: '削除'
    },
    'layers.merge': {
      en: 'Merge Layers',
      es: 'Fusionar Capas',
      ja: 'レイヤーを結合'
    },
    'layers.visibility': {
      en: 'Toggle Visibility',
      es: 'Alternar Visibilidad',
      ja: '表示/非表示'
    },
    'layers.lock': {
      en: 'Lock/Unlock',
      es: 'Bloquear/Desbloquear',
      ja: 'ロック/解除'
    },
    
    // Properties
    'properties.title': {
      en: 'Properties',
      es: 'Propiedades',
      ja: 'プロパティ'
    },
    'properties.transform': {
      en: 'Transform',
      es: 'Transformar',
      ja: '変形'
    },
    'properties.rotation': {
      en: 'Rotation',
      es: 'Rotación',
      ja: '回転'
    },
    'properties.opacity': {
      en: 'Opacity',
      es: 'Opacidad',
      ja: '不透明度'
    },
    
    // Effects
    'effects.layerEffects': {
      en: 'Layer Effects (Fusion)',
      es: 'Efectos de Capa (Fusion)',
      ja: 'レイヤー効果'
    },
    'effects.stroke': {
      en: 'Stroke',
      es: 'Trazo',
      ja: '境界線'
    },
    'effects.dropShadow': {
      en: 'Drop Shadow',
      es: 'Sombra Paralela',
      ja: 'ドロップシャドウ'
    },
    'effects.outerGlow': {
      en: 'Outer Glow',
      es: 'Resplandor Exterior',
      ja: '外側の光彩'
    },
    
    // Context Menu
    'context.duplicate': {
      en: 'Duplicate Layer',
      es: 'Duplicar Capa',
      ja: 'レイヤーを複製'
    },
    'context.merge': {
      en: 'Merge Layers',
      es: 'Fusionar Capas',
      ja: 'レイヤーを結合'
    },
    'context.delete': {
      en: 'Delete Layer',
      es: 'Eliminar Capa',
      ja: 'レイヤーを削除'
    },
    
    // Achievements
    'achievement.title': {
      en: 'Achievements',
      es: 'Logros',
      ja: '実績'
    },
    'achievement.level': {
      en: 'Level',
      es: 'Nivel',
      ja: 'レベル'
    }
  };
  
  constructor() {}
  
  private loadLanguage(): Language {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored && (stored === 'en' || stored === 'es' || stored === 'ja')) {
      return stored as Language;
    }
    
    // Auto-detect browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('ja')) return 'ja';
    return 'en';
  }
  
  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }
  
  translate(key: string): string {
    const translation = this.translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[this.currentLanguage()];
  }
  
  t(key: string): string {
    return this.translate(key);
  }
}
