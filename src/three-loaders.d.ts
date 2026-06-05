declare module "three/examples/jsm/loaders/OBJLoader" {
  import * as THREE from "three";
  export class OBJLoader extends THREE.Loader {
    load(
      url: string,
      onLoad: (object: THREE.Group) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void,
    ): void;
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<THREE.Group>;
    setMaterials(materials: unknown): this;
    parse(data: string): THREE.Group;
  }
}

declare module "three/examples/jsm/loaders/MTLLoader" {
  import * as THREE from "three";

  export interface MTLLoaderMaterialCreator {
    materials: Record<string, THREE.Material>;
    preload(): void;
    create(name: string): THREE.Material;
    get(name: string): THREE.Material;
    setMaterials(materialsInfo: Record<string, unknown>): void;
    convert(materialsInfo: Record<string, unknown>): Record<string, THREE.Material>;
    clone(): MTLLoaderMaterialCreator;
  }

  export class MTLLoader extends THREE.Loader {
    constructor(manager?: THREE.LoadingManager);
    load(
      url: string,
      onLoad: (materialCreator: MTLLoaderMaterialCreator) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void,
    ): void;
    loadAsync(
      url: string,
      onProgress?: (event: ProgressEvent) => void,
    ): Promise<MTLLoaderMaterialCreator>;
    parse(text: string, path?: string): MTLLoaderMaterialCreator;
    setResourcePath(path: string): this;
    setMaterialOptions(options: {
      side?: number;
      wrap?: number;
      normalizeRGB?: boolean;
    }): this;
  }
}
