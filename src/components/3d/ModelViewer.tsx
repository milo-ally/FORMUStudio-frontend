import { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import type { MTLLoaderMaterialCreator } from "three/examples/jsm/loaders/MTLLoader";

interface ModelViewerProps {
  objUrl: string;
  mtlUrl?: string;
}

export default function ModelViewer({ objUrl, mtlUrl }: ModelViewerProps) {
  return (
    <Canvas
      camera={{ position: [0, 1, 4], fov: 45 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <Model objUrl={objUrl} mtlUrl={mtlUrl} />
      <OrbitControls enableDamping dampingFactor={0.1} />
      <gridHelper args={[6, 20, "#333333", "#222222"]} position={[0, -1.5, 0]} />
    </Canvas>
  );
}

function fixMtlUrls(mtlText: string, mtlBaseUrl: string): string {
  const base = new URL(mtlBaseUrl);
  const baseDir = base.href.substring(0, base.href.lastIndexOf("/") + 1);
  return mtlText.replace(/^(map_[Kk][dDaA]\s+)(\S+)/gm, (_line, prefix, path) => {
    try {
      new URL(path);
      return prefix + path;
    } catch {
      return prefix + baseDir + path;
    }
  });
}

async function fetchAsBlobUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}

function Model({ objUrl, mtlUrl }: { objUrl: string; mtlUrl?: string }) {
  const [obj, setObj] = useState<THREE.Group | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const blobUrls: string[] = [];

    async function load() {
      try {
        // Fetch OBJ as blob to avoid CORS issues
        const objBlobUrl = await fetchAsBlobUrl(objUrl);
        blobUrls.push(objBlobUrl);

        let materials: MTLLoaderMaterialCreator | undefined;

        if (mtlUrl) {
          try {
            // Fetch MTL text, fix relative paths, create blob URL
            const mtlResp = await fetch(mtlUrl);
            let mtlText = await mtlResp.text();
            mtlText = fixMtlUrls(mtlText, mtlUrl);

            const mtlBlob = new Blob([mtlText], { type: "text/plain" });
            const mtlBlobUrl = URL.createObjectURL(mtlBlob);
            blobUrls.push(mtlBlobUrl);

            const mtlLoader = new MTLLoader();
            // setResourcePath to help resolve relative texture paths
            const baseDir = mtlUrl.substring(0, mtlUrl.lastIndexOf("/") + 1);
            mtlLoader.setResourcePath(baseDir);
            materials = await mtlLoader.loadAsync(mtlBlobUrl);
          } catch {
            // MTL failed, proceed without materials
          }
        }

        const objLoader = new OBJLoader();
        if (materials) {
          objLoader.setMaterials(materials);
        }

        const object = await objLoader.loadAsync(objBlobUrl);

        if (cancelled) return;

        // Normalize: center and scale to fit
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const s = 2.5 / maxDim;
          object.scale.setScalar(s);
          object.position.set(-center.x * s, -center.y * s, -center.z * s);
        }

        // Apply basic material fallback for objects without materials
        object.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && !child.material) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x888888,
              roughness: 0.5,
              metalness: 0.1,
            });
          }
        });

        setObj(object);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        // Clean up blob URLs after a delay (loaders need them briefly)
        if (!cancelled) {
          setTimeout(() => {
            blobUrls.forEach((u) => URL.revokeObjectURL(u));
          }, 1000);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [objUrl, mtlUrl]);

  const sceneObject = useMemo(() => obj, [obj]);

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#666666" wireframe />
      </mesh>
    );
  }

  if (!sceneObject) return null;
  return <primitive object={sceneObject} />;
}
