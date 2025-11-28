export interface HydraMember {
  '@context': string;
  '@id': string;
  '@type': string;
  [key: string]: any;
}

export interface HydraCollectionView {
  '@id': string;
  type: string;
  'hydra:first': string | null;
  'hydra:last': string | null;
  'hydra:previous': string | null;
  'hydra:next': string | null;
}

export interface HydraCollection {
  '@context': string;
  '@id': string;
  '@type': string;
  'hydra:member': HydraMember[];
  'hydra:totalItems': number;
  'hydra:view': HydraCollectionView;
}

