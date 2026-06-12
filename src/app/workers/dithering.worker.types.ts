import { DitheringOptions } from '../dithering-core/types';

export interface DitheringRequest {
  imageData: ImageData;
  options: DitheringOptions;
  id: string;
}
