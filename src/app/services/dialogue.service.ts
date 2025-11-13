import { Injectable, signal } from '@angular/core';

export interface DialogueOption {
  text: string;
  affection: number;
  response: string;
}

export interface Dialogue {
  id: string;
  question: string;
  emotion: 'idle' | 'happy' | 'worried' | 'processing' | 'excited' | 'surprised';
  options: DialogueOption[];
}

export interface DialogueData {
  dialogues: Dialogue[];
}

export interface DialogueState {
  currentDialogue: Dialogue | null;
  waifuResponse: string | null;
  isActive: boolean;
  isShowingResponse: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DialogueService {
  private readonly STORAGE_KEY = 'waifu-affection';
  private readonly SHOWN_DIALOGUES_KEY = 'shown-dialogues';
  private readonly LAST_DIALOGUE_TIME_KEY = 'last-dialogue-time';
  
  private dialogues: Dialogue[] = [];
  private affectionLevel = signal(0);
  private shownDialogues: Set<string> = new Set();
  
  // Estado del diálogo actual
  dialogueState = signal<DialogueState>({
    currentDialogue: null,
    waifuResponse: null,
    isActive: false,
    isShowingResponse: false
  });

  constructor() {
    this.loadAffection();
    this.loadShownDialogues();
    this.loadDialogues();
  }

  private async loadDialogues() {
    try {
      const response = await fetch('/waifu-dialogues.json');
      const data: DialogueData = await response.json();
      this.dialogues = data.dialogues;
    } catch (error) {
      console.error('Error loading dialogues:', error);
      this.dialogues = [];
    }
  }

  private loadAffection() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    // Iniciar en 50 (neutral) si no hay valor guardado
    // Rango: 0 (muy malo) - 50 (neutral) - 100 (máximo)
    this.affectionLevel.set(stored ? parseInt(stored, 10) : 50);
  }

  private saveAffection() {
    localStorage.setItem(this.STORAGE_KEY, this.affectionLevel().toString());
  }

  private loadShownDialogues() {
    const stored = localStorage.getItem(this.SHOWN_DIALOGUES_KEY);
    if (stored) {
      this.shownDialogues = new Set(JSON.parse(stored));
    }
  }

  private saveShownDialogues() {
    localStorage.setItem(
      this.SHOWN_DIALOGUES_KEY,
      JSON.stringify(Array.from(this.shownDialogues))
    );
  }

  getAffectionLevel(): number {
    return this.affectionLevel();
  }

  addAffection(amount: number) {
    this.affectionLevel.update(current => {
      // Rango: 0 a 100
      const newValue = Math.max(0, Math.min(100, current + amount));
      return newValue;
    });
    this.saveAffection();
  }

  getAffectionMessage(): string {
    const level = this.affectionLevel();
    if (level >= 90) return '💖 Adora trabajar contigo';
    if (level >= 75) return '😊 Muy feliz contigo';
    if (level >= 60) return '🙂 Le agradas mucho';
    if (level >= 45) return '😐 Neutral';
    if (level >= 30) return '😕 Un poco distante';
    if (level >= 15) return '😞 Algo triste';
    return '💔 Muy dolida';
  }

  shouldShowDialogue(): boolean {
    // Verificar si ha pasado suficiente tiempo desde el último diálogo (5 minutos)
    const lastTime = localStorage.getItem(this.LAST_DIALOGUE_TIME_KEY);
    if (lastTime) {
      const minutesSince = (Date.now() - parseInt(lastTime, 10)) / 1000 / 60;
      if (minutesSince < 5) {
        return false;
      }
    }

    // 20% de probabilidad de mostrar un diálogo
    return Math.random() < 0.2;
  }

  showRandomDialogue(): void {
    if (this.dialogues.length === 0) {
      return;
    }

    // Filtrar diálogos no mostrados recientemente
    const availableDialogues = this.dialogues.filter(
      d => !this.shownDialogues.has(d.id)
    );

    // Si todos fueron mostrados, resetear
    if (availableDialogues.length === 0) {
      this.shownDialogues.clear();
      this.saveShownDialogues();
      this.showRandomDialogue();
      return;
    }

    // Seleccionar uno aleatorio
    const dialogue = availableDialogues[
      Math.floor(Math.random() * availableDialogues.length)
    ];

    // Marcar como mostrado
    this.shownDialogues.add(dialogue.id);
    this.saveShownDialogues();

    // Guardar timestamp
    localStorage.setItem(this.LAST_DIALOGUE_TIME_KEY, Date.now().toString());

    // Actualizar estado
    this.dialogueState.set({
      currentDialogue: dialogue,
      waifuResponse: null,
      isActive: true,
      isShowingResponse: false
    });
  }

  selectOption(optionIndex: number) {
    const state = this.dialogueState();
    if (!state.currentDialogue || optionIndex < 0 || 
        optionIndex >= state.currentDialogue.options.length) {
      return;
    }

    const option = state.currentDialogue.options[optionIndex];
    
    // Aplicar cambio de afecto
    this.addAffection(option.affection);

    // Mostrar respuesta de la waifu
    this.dialogueState.set({
      currentDialogue: state.currentDialogue,
      waifuResponse: option.response,
      isActive: true,
      isShowingResponse: true
    });

    // Cerrar después de 4 segundos
    setTimeout(() => {
      this.closeDialogue();
    }, 4000);
  }

  closeDialogue() {
    this.dialogueState.set({
      currentDialogue: null,
      waifuResponse: null,
      isActive: false,
      isShowingResponse: false
    });
  }

  // Método para triggear diálogos específicos basados en eventos
  triggerEventDialogue(eventType: string) {
    const eventDialogues: { [key: string]: string } = {
      'first_visit': 'first_time',
      'late_night': 'late_night',
      'gif_creation': 'gif_creation',
      'custom_palette': 'custom_palette',
      'sprite_upload': 'sprite_upload',
      'error': 'error_support',
      'long_session': 'long_session'
    };

    const dialogueId = eventDialogues[eventType];
    if (!dialogueId) return;

    const dialogue = this.dialogues.find(d => d.id === dialogueId);
    if (!dialogue) return;

    this.dialogueState.set({
      currentDialogue: dialogue,
      waifuResponse: null,
      isActive: true,
      isShowingResponse: false
    });
  }

  // Reset completo (para debugging)
  resetProgress() {
    this.affectionLevel.set(50); // Volver a neutral
    this.shownDialogues.clear();
    this.saveAffection();
    this.saveShownDialogues();
    localStorage.removeItem(this.LAST_DIALOGUE_TIME_KEY);
  }
}
