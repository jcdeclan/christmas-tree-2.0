
export enum SceneMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  FOCUS = 'FOCUS'
}

export interface ParticleConfig {
  type: 'BOX' | 'SPHERE' | 'CANDY' | 'PHOTO';
  color: string;
  size: number;
}
