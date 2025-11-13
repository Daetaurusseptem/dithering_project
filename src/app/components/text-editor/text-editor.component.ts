import { Component, computed, effect, ElementRef, EventEmitter, input, Output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-editor',
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="text-editor-overlay"
      [style.left.px]="position().x"
      [style.top.px]="position().y"
      [style.width.px]="position().width"
      [style.height.px]="position().height"
      [style.font-size.px]="fontSize()"
      [style.font-family]="fontFamily()"
      [style.color]="textColor()"
      (click)="$event.stopPropagation()"
    >
      <div
        #editableDiv
        class="editable-content"
        contenteditable="true"
        [textContent]="text()"
        (input)="onTextInput($event)"
        (keydown)="onKeyDown($event)"
        (blur)="onBlur()"
      ></div>
    </div>
  `,
  styles: [`
    .text-editor-overlay {
      position: absolute;
      border: 2px dashed #00ff00;
      background: rgba(0, 0, 0, 0.1);
      z-index: 1000;
      cursor: text;
      padding: 4px;
      box-sizing: border-box;
    }
    
    .editable-content {
      width: 100%;
      height: 100%;
      outline: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow: hidden;
    }
    
    .editable-content:focus {
      background: rgba(255, 255, 255, 0.05);
    }
  `]
})
export class TextEditorComponent {
  @ViewChild('editableDiv', { static: false }) editableDiv?: ElementRef<HTMLDivElement>;
  
  // Inputs
  text = input.required<string>();
  position = input.required<{ x: number; y: number; width: number; height: number }>();
  fontSize = input<number>(16);
  fontFamily = input<string>('Arial');
  textColor = input<string>('#ffffff');
  
  // Outputs
  @Output() textChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  
  constructor() {
    // Auto-focus when component is created
    effect(() => {
      const div = this.editableDiv?.nativeElement;
      if (div) {
        setTimeout(() => {
          div.focus();
          // Select all text
          const range = document.createRange();
          range.selectNodeContents(div);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }, 0);
      }
    });
  }
  
  onTextInput(event: Event): void {
    const target = event.target as HTMLDivElement;
    const newText = target.textContent || '';
    this.textChange.emit(newText);
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const target = event.target as HTMLDivElement;
      this.save.emit(target.textContent || '');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
    }
  }
  
  onBlur(): void {
    // Auto-save on blur
    const text = this.editableDiv?.nativeElement.textContent || '';
    this.save.emit(text);
  }
}
