import { Injectable, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ModalComponent } from '../components/modal/modal.component';

export interface ModalConfig {
  title?: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private activeModals: ComponentRef<ModalComponent>[] = [];
  
  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}
  
  /**
   * Show an alert modal
   */
  alert(message: string, title: string = 'Alert'): Promise<void> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'alert',
        confirmText: 'OK'
      };
      
      this.showModal(config, () => {
        resolve();
      });
    });
  }
  
  /**
   * Show a confirmation modal
   */
  confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'confirm',
        confirmText: 'Yes',
        cancelText: 'No'
      };
      
      this.showModal(config, (result) => {
        resolve(result === true);
      });
    });
  }
  
  /**
   * Show a prompt modal
   */
  prompt(message: string, title: string = 'Input', defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'prompt',
        confirmText: 'OK',
        cancelText: 'Cancel',
        defaultValue
      };
      
      this.showModal(config, (result) => {
        resolve(result === false ? null : result as string);
      });
    });
  }
  
  /**
   * Internal method to show modal
   */
  private showModal(config: ModalConfig, callback: (result: any) => void): void {
    // Create modal component
    const modalRef = createComponent(ModalComponent, {
      environmentInjector: this.injector
    });
    
    // Set inputs (cast to access instance)
    const instance = modalRef.instance as ModalComponent;
    instance.config = config;
    
    // Subscribe to close event
    instance.closed.subscribe((result: any) => {
      this.closeModal(modalRef);
      callback(result);
    });
    
    // Attach to app
    this.appRef.attachView(modalRef.hostView);
    document.body.appendChild(modalRef.location.nativeElement);
    
    // Track active modal
    this.activeModals.push(modalRef);
  }
  
  /**
   * Close and destroy modal
   */
  private closeModal(modalRef: ComponentRef<ModalComponent>): void {
    const index = this.activeModals.indexOf(modalRef);
    if (index > -1) {
      this.activeModals.splice(index, 1);
    }
    
    this.appRef.detachView(modalRef.hostView);
    modalRef.destroy();
  }
  
  /**
   * Close all modals
   */
  closeAll(): void {
    this.activeModals.forEach(modalRef => {
      this.appRef.detachView(modalRef.hostView);
      modalRef.destroy();
    });
    this.activeModals = [];
  }
}
