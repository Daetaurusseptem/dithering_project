import { Routes } from '@angular/router';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from './components/terms-of-service/terms-of-service.component';
import { AlgorithmsComponent } from './components/algorithms/algorithms.component';

export const routes: Routes = [
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
    title: 'Privacy Policy - Dithering Converter'
  },
  {
    path: 'terms-of-service',
    component: TermsOfServiceComponent,
    title: 'Terms of Service - Dithering Converter'
  },
  {
    path: 'algorithms',
    component: AlgorithmsComponent,
    title: 'Algorithms - Dithering Converter'
  },
  {
    path: '',
    loadComponent: () => import('./app').then(m => m.App),
    title: 'Dithering Converter - Retro Image Processing'
  }
];
