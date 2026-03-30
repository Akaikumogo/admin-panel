import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Mesh, Object3D, Group, MeshStandardMaterial } from 'three';
import * as THREE from 'three';
import { Card, Typography, Button, Switch, Spin } from 'antd';
import { RotateCcw, ZoomIn, MousePointer2, Orbit, Loader2, Shuffle } from 'lucide-react';
import { useApp } from '@/Providers/Configuration';

const { Title, Text } = Typography;

// Hover va tanlangan — juda yorqin (emissive glow bilan)
const HOVER_COLOR = 0xffd54f;
const SELECTED_COLOR = 0x42a5f5;
const DEFAULT_COLOR = 0x9ca3af;
const HOVER_EMISSIVE_INTENSITY = 0.55;
const SELECTED_EMISSIVE_INTENSITY = 0.4;
const HOVER_LERP_SPEED = 0.22;
const RANDOM_FLASH_DURATION = 0.5; // sekund per batch
const RANDOM_FLASH_BATCH_SIZE = 4; // bir vaqtda 4 tagacha obyekt yonadi
const RANDOM_FLASH_COLOR = 0xffd54f;

// Kamera zoom: + chegara (yaqin), - ancha uzoq
const CAMERA_MIN_DISTANCE = 8;
const CAMERA_MAX_DISTANCE = 320;

// 3 ta bino joylashuvi (position qo‘yish uchun)
const BLOCK_CENTERS: Record<number, [number, number, number]> = {
  1: [-28, 0, 0],
  2: [0, 0, 0],
  3: [28, 0, 0]
};

// Foydalanuvchi bergan kamera presetlari (1-blok, 2-blok, 3-blok)
const BLOCK_VIEWS: Record<number, { position: [number, number, number]; target: [number, number, number] }> = {
  1: { position: [3.1, 18.61, 27.03], target: [-28, 0, 0] },
  2: { position: [23.35, 15.53, -53.14], target: [0, 0, 0] },
  3: { position: [-11.29, 17.22, 5.64], target: [28, 0, 0] }
};

// Zastavka: bitta traektoriya (markaz atrofida orbit), kamera shu bo‘ylab sekin tinimsiz harakat qiladi
const TRAJECTORY_RADIUS = 80;
const TRAJECTORY_HEIGHT = 26;
const ZASTAVKA_ANGLE_SPEED = 0.12; // radian / sekund — sekin aylanish

function getTrajectoryPosition(center: [number, number, number], angle: number): THREE.Vector3 {
  return new THREE.Vector3(
    center[0] + TRAJECTORY_RADIUS * Math.cos(angle),
    center[1] + TRAJECTORY_HEIGHT,
    center[2] + TRAJECTORY_RADIUS * Math.sin(angle)
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const CAMERA_TRANSITION_DURATION = 1.2;

// Ob’ekt nomi bo‘yicha ko‘rsatiladigan ma’lumot (demo.glb dagi nomlar uchun)
type ObjectInfo = {
  rooms: number;
  area: number;
  price: number;
  block: string;
  floor: number;
  status: 'available' | 'reserved' | 'sold';
};

const defaultInfo: ObjectInfo = {
  rooms: 2,
  area: 65,
  price: 95000,
  block: 'A Blok',
  floor: 1,
  status: 'available'
};

function getInfoForObject(objectName: string): ObjectInfo {
  const name = objectName.toLowerCase();
  // foundation_wall va boshqa nomlar uchun ma’lumot
  if (name.includes('foundation') || name.includes('wall')) {
    return { ...defaultInfo, floor: 1 };
  }
  const floorMatch = name.match(/(\d+)/);
  const floor = floorMatch ? parseInt(floorMatch[1], 10) : 1;
  const blocks = ['A Blok', 'B Blok', 'C Blok', 'D Blok'];
  const blockIndex = Math.abs(objectName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 4;
  return {
    rooms: 2 + (floor % 2),
    area: 55 + (floor * 5),
    price: 80000 + floor * 5000,
    block: blocks[blockIndex],
    floor,
    status: floor % 3 === 0 ? 'reserved' : floor % 5 === 0 ? 'sold' : 'available'
  };
}

function getApartmentRoot(obj: Object3D): Object3D {
  return obj.parent ?? obj;
}

function getApartmentDisplayName(apartmentRoot: Object3D): string {
  if (apartmentRoot.name && apartmentRoot.name !== 'Group' && apartmentRoot.name !== '') {
    return apartmentRoot.name;
  }
  let firstMeshName = '';
  apartmentRoot.traverse((c) => {
    if (!firstMeshName && (c as Mesh).isMesh) firstMeshName = c.name || '';
  });
  return firstMeshName || 'Kvartira';
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Model({
  hoveredApartment,
  setHoveredApartment,
  selectedApartment,
  setSelectedApartment,
  activeBlock,
  isRandomPlaying,
  onRandomComplete
}: {
  hoveredApartment: Object3D | null;
  setHoveredApartment: (o: Object3D | null) => void;
  selectedApartment: Object3D | null;
  setSelectedApartment: (o: Object3D | null) => void;
  activeBlock: 1 | 2 | 3;
  isRandomPlaying: boolean;
  onRandomComplete: () => void;
}) {
  const { scene } = useGLTF('/demo.glb');
  const [rootGroup, setRootGroup] = useState<Group | null>(null);
  const buildingsRef = useRef<Group[]>([]);
  const originalColors = useRef<Map<Mesh, number>>(new Map());
  const randomSequenceRef = useRef<Object3D[] | null>(null);
  const randomFlashIndexRef = useRef(0);
  const randomFlashProgressRef = useRef(0);

  useEffect(() => {
    const root = new THREE.Group();
    const buildings: Group[] = [];
    for (let i = 1; i <= 3; i++) {
      const clone = scene.clone() as Group;
      const [x, y, z] = BLOCK_CENTERS[i];
      clone.position.set(x, y, z);
      clone.visible = i === 1;
      root.add(clone);
      buildings.push(clone);
      clone.traverse((child: Object3D) => {
        if ((child as Mesh).isMesh) {
          const mesh = child as Mesh;
          if (mesh.material) {
            const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            if (mat && 'color' in mat && typeof (mat as MeshStandardMaterial).color.getHex === 'function') {
              const std = mat as MeshStandardMaterial;
              originalColors.current.set(mesh, std.color.getHex());
              std.color.setHex(DEFAULT_COLOR);
              if ('emissive' in std && std.emissive) {
                std.emissive.setHex(0);
                std.emissiveIntensity = 0;
              }
            }
          }
        }
      });
    }
    buildingsRef.current = buildings;
    setRootGroup(root);
    const colorsMap = originalColors.current;
    return () => {
      buildingsRef.current = [];
      colorsMap.clear();
    };
  }, [scene]);

  useEffect(() => {
    buildingsRef.current.forEach((building, index) => {
      building.visible = index + 1 === activeBlock;
    });
  }, [activeBlock]);

  useFrame((_, delta) => {
    // Random tartibda yonish: isRandomPlaying bo‘lsa ketma-ket flash
    if (!isRandomPlaying) {
      randomSequenceRef.current = null;
    } else if (randomSequenceRef.current === null) {
      const visibleBuilding = buildingsRef.current[activeBlock - 1];
      const roots = new Set<Object3D>();
      visibleBuilding.traverse((child: Object3D) => {
        if ((child as Mesh).isMesh && child.parent) roots.add(child.parent);
      });
      randomSequenceRef.current = shuffleArray(Array.from(roots));
      randomFlashIndexRef.current = 0;
      randomFlashProgressRef.current = 0;
    }

    const sequence = randomSequenceRef.current;
    const flashingSet = new Set<Object3D>();
    let flashProgress = 0;

    if (sequence && sequence.length > 0) {
      const batchStart = randomFlashIndexRef.current;
      if (batchStart < sequence.length) {
        for (let i = 0; i < RANDOM_FLASH_BATCH_SIZE && batchStart + i < sequence.length; i++) {
          flashingSet.add(sequence[batchStart + i]);
        }
        flashProgress = randomFlashProgressRef.current;
        randomFlashProgressRef.current += delta / RANDOM_FLASH_DURATION;
        if (randomFlashProgressRef.current >= 1) {
          randomFlashIndexRef.current += RANDOM_FLASH_BATCH_SIZE;
          randomFlashProgressRef.current = 0;
          if (randomFlashIndexRef.current >= sequence.length) {
            onRandomComplete();
            randomSequenceRef.current = null;
          }
        }
      }
    }

    const targetColor = new THREE.Color();
    const flashPeak = new THREE.Color();
    flashPeak.setHex(RANDOM_FLASH_COLOR);

    buildingsRef.current.forEach((building) => {
      building.traverse((child: Object3D) => {
        if ((child as Mesh).isMesh) {
          const mesh = child as Mesh;
          const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          if (!mat || !('color' in mat)) return;
          const std = mat as MeshStandardMaterial;
          const original = originalColors.current.get(mesh) ?? DEFAULT_COLOR;
          const meshApartment = mesh.parent;
          const isHovered = hoveredApartment && meshApartment === hoveredApartment;
          const isSelected = selectedApartment && meshApartment === selectedApartment;
          const isFlashing = meshApartment ? flashingSet.has(meshApartment) : false;
          const flashT = isFlashing
            ? flashProgress <= 0.5
              ? 2 * flashProgress
              : 2 * (1 - flashProgress)
            : 0;

          if (isSelected) {
            targetColor.setHex(SELECTED_COLOR);
          } else if (isHovered) {
            targetColor.setHex(HOVER_COLOR);
          } else if (isFlashing) {
            targetColor.setHex(original).lerp(flashPeak, flashT);
          } else {
            targetColor.setHex(original);
          }
          std.color.lerp(targetColor, HOVER_LERP_SPEED);
          if ('emissive' in std && std.emissive) {
            const targetEmissive = isSelected
              ? SELECTED_EMISSIVE_INTENSITY
              : isHovered
                ? HOVER_EMISSIVE_INTENSITY
                : isFlashing
                  ? HOVER_EMISSIVE_INTENSITY * flashT
                  : 0;
            std.emissive.copy(std.color);
            std.emissiveIntensity += (targetEmissive - std.emissiveIntensity) * HOVER_LERP_SPEED;
          }
        }
      });
    });
  });

  if (!rootGroup) {
    return null;
  }

  return (
    <group
      onPointerEnter={(e: { stopPropagation: () => void; object: Object3D }) => {
        e.stopPropagation();
        setHoveredApartment(getApartmentRoot(e.object));
      }}
      onPointerLeave={() => setHoveredApartment(null)}
      onPointerMissed={() => {
        setHoveredApartment(null);
        setSelectedApartment(null);
      }}
      onClick={(e: { stopPropagation: () => void; object: Object3D }) => {
        e.stopPropagation();
        setSelectedApartment(getApartmentRoot(e.object));
      }}
    >
      <primitive object={rootGroup} />
    </group>
  );
}

// Tema bo‘yicha 3D fon rangi (Canvas ichida ishlatiladi)
function ThemeClearColor({ isDark }: { isDark: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(isDark ? 0x111827 : 0xf3f4f6);
  }, [gl, isDark]);
  return null;
}

type CameraDataRef = {
  current: { position: [number, number, number]; target: [number, number, number] };
};

function Scene({
  hoveredApartment,
  setHoveredApartment,
  selectedApartment,
  setSelectedApartment,
  isDark,
  activeBlock,
  cameraDataRef,
  zastavkaMode,
  onLoaded,
  isRandomPlaying,
  onRandomComplete
}: {
  hoveredApartment: Object3D | null;
  setHoveredApartment: (o: Object3D | null) => void;
  selectedApartment: Object3D | null;
  setSelectedApartment: (o: Object3D | null) => void;
  isDark: boolean;
  activeBlock: 1 | 2 | 3;
  cameraDataRef: CameraDataRef;
  zastavkaMode: boolean;
  onLoaded?: () => void;
  isRandomPlaying: boolean;
  onRandomComplete: () => void;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls | null>(null);
  const prevBlockRef = useRef(activeBlock);
  const zastavkaAngleRef = useRef(0);
  const cameraState = useRef<'IDLE' | 'TRANSITION'>('IDLE');
  const transitionRef = useRef<{
    progress: number;
    startPosition: THREE.Vector3;
    startTarget: THREE.Vector3;
    endPosition: [number, number, number];
    endTarget: [number, number, number];
    targetBlock: 1 | 2 | 3;
  } | null>(null);

  useEffect(() => {
    const initialView = BLOCK_VIEWS[1];
    camera.position.set(...initialView.position);
    camera.lookAt(...initialView.target);
    const ctrl = new ThreeOrbitControls(camera, gl.domElement);
    ctrl.target.set(...initialView.target);
    ctrl.minDistance = CAMERA_MIN_DISTANCE;
    ctrl.maxDistance = CAMERA_MAX_DISTANCE;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.05;
    ctrl.rotateSpeed = 0.5;
    controlsRef.current = ctrl;
    prevBlockRef.current = 1;
    cameraState.current = 'IDLE';
    transitionRef.current = null;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => onLoaded?.());
    });
    return () => {
      cancelAnimationFrame(t);
      ctrl.dispose();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl]);

  const round2 = (v: THREE.Vector3): [number, number, number] => [
    Math.round(v.x * 100) / 100,
    Math.round(v.y * 100) / 100,
    Math.round(v.z * 100) / 100
  ];

  useFrame((_, delta) => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    if (zastavkaMode) {
      ctrl.enabled = false;
      const centerVec = new THREE.Vector3(...BLOCK_CENTERS[activeBlock]);
      zastavkaAngleRef.current += ZASTAVKA_ANGLE_SPEED * delta;
      const pos = getTrajectoryPosition(BLOCK_CENTERS[activeBlock], zastavkaAngleRef.current);
      camera.position.copy(pos);
      camera.lookAt(centerVec);
      ctrl.target.copy(centerVec);
    } else if (cameraState.current === 'TRANSITION' && transitionRef.current) {
      ctrl.enabled = false;
      const t = transitionRef.current;
      t.progress += delta / CAMERA_TRANSITION_DURATION;
      const s = easeInOutCubic(Math.min(1, t.progress));
      const endPos = new THREE.Vector3(...t.endPosition);
      const endTgt = new THREE.Vector3(...t.endTarget);
      camera.position.lerpVectors(t.startPosition, endPos, s);
      ctrl.target.lerpVectors(t.startTarget, endTgt, s);
      camera.lookAt(ctrl.target);
      if (t.progress >= 1) {
        camera.position.set(...t.endPosition);
        ctrl.target.set(...t.endTarget);
        camera.lookAt(ctrl.target);
        prevBlockRef.current = t.targetBlock;
        transitionRef.current = null;
        cameraState.current = 'IDLE';
        ctrl.enabled = true;
      }
    } else {
      ctrl.enabled = true;
      if (cameraState.current === 'IDLE' && prevBlockRef.current !== activeBlock) {
        const view = BLOCK_VIEWS[activeBlock];
        transitionRef.current = {
          progress: 0,
          startPosition: camera.position.clone(),
          startTarget: ctrl.target.clone(),
          endPosition: view.position,
          endTarget: view.target,
          targetBlock: activeBlock
        };
        cameraState.current = 'TRANSITION';
        ctrl.enabled = false;
      }
      if (cameraState.current === 'IDLE') {
        ctrl.update();
      }
    }

    cameraDataRef.current = { position: round2(camera.position), target: round2(ctrl.target) };
  });

  return (
    <>
      <ThemeClearColor isDark={isDark} />
      <ambientLight intensity={1.4} />
      <hemisphereLight args={['#ffffff', '#e0e8f0', 0.6]} />
      <directionalLight position={[20, 30, 20]} intensity={1.2} />
      <directionalLight position={[-20, 25, -20]} intensity={1} />
      <directionalLight position={[0, 40, 0]} intensity={0.9} />
      <directionalLight position={[15, 20, -15]} intensity={0.7} />
      <directionalLight position={[-15, 20, 15]} intensity={0.7} />
      <Model
        hoveredApartment={hoveredApartment}
        setHoveredApartment={setHoveredApartment}
        selectedApartment={selectedApartment}
        setSelectedApartment={setSelectedApartment}
        activeBlock={activeBlock}
        isRandomPlaying={isRandomPlaying}
        onRandomComplete={onRandomComplete}
      />
    </>
  );
}

const statusLabels: Record<ObjectInfo['status'], string> = {
  available: 'Mavjud',
  reserved: 'Band',
  sold: 'Sotilgan'
};

export default function ShowRoom() {
  const [hoveredApartment, setHoveredApartment] = useState<Object3D | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<Object3D | null>(null);
  const [activeBlock, setActiveBlock] = useState<1 | 2 | 3>(1);
  const [zastavkaMode, setZastavkaMode] = useState(false);
  const [randomFlashMode, setRandomFlashMode] = useState(false);
  const [isRandomPlaying, setIsRandomPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const cameraDataRef = useRef<{ position: [number, number, number]; target: [number, number, number] }>({
    position: [0, 0, 0],
    target: [0, 0, 0]
  });
  const [cameraDisplay, setCameraDisplay] = useState(cameraDataRef.current);
  const { theme } = useApp();
  const isDark = theme === 'dark';

  useEffect(() => {
    const t = setInterval(() => {
      setCameraDisplay({ ...cameraDataRef.current });
    }, 200);
    return () => clearInterval(t);
  }, []);

  const hoveredName =
    hoveredApartment ? getApartmentDisplayName(hoveredApartment) : null;
  const selectedName =
    selectedApartment ? getApartmentDisplayName(selectedApartment) : null;
  const displayApartment = selectedApartment ?? hoveredApartment;
  const displayName = displayApartment
    ? (selectedApartment ? selectedName : hoveredName) ?? 'Kvartira'
    : null;
  const info = displayName ? getInfoForObject(displayName) : null;

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ height: 'calc(100vh - 100px)', minHeight: 400 }}
    >
      {isLoading && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-100 dark:bg-slate-900"
          aria-hidden="false"
        >
          <Spin
            size="large"
            indicator={<Loader2 className="animate-spin text-[#3d57c4]" size={48} strokeWidth={2} />}
          />
          <span className="text-slate-600 dark:text-slate-400">3D Showroom yuklanmoqda...</span>
        </div>
      )}
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        gl={{ antialias: true }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          cursor: hoveredApartment ? 'pointer' : 'grab'
        }}
      >
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#6b7280" />
            </mesh>
          }
        >
          <Scene
            hoveredApartment={hoveredApartment}
            setHoveredApartment={setHoveredApartment}
            selectedApartment={selectedApartment}
            setSelectedApartment={setSelectedApartment}
            isDark={isDark}
            activeBlock={activeBlock}
            cameraDataRef={cameraDataRef}
            zastavkaMode={zastavkaMode}
            onLoaded={() => setIsLoading(false)}
            isRandomPlaying={isRandomPlaying}
            onRandomComplete={() => (randomFlashMode ? setIsRandomPlaying(true) : setIsRandomPlaying(false))}
          />
        </Suspense>
      </Canvas>

      {/* 1) 3D Showroom – eng tepada, chap */}
      <Card
        size="small"
        style={{ position: 'absolute', top: 12, left: 16, zIndex: 10, width: '100%', maxWidth: 380 }}
        className={`shadow-xl rounded-lg border backdrop-blur-sm
          ${isDark ? 'bg-slate-800/95 border-slate-500/50 [&_.ant-card-body]:text-slate-200' : 'bg-white/95 border-slate-300 [&_.ant-card-body]:text-slate-700'}`}
      >
        <Title level={5} className={isDark ? '!mb-1 !text-white' : '!mb-1 !text-slate-800'}>
          3D Showroom
        </Title>
        <Text className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Model ustiga hover qiling va ma&apos;lumotlarni ko&apos;ring
        </Text>
        {selectedName && (
          <Text strong className="text-blue-500 dark:text-blue-400">
            Tanlangan: {selectedName} ({activeBlock}-blok)
          </Text>
        )}
        {!selectedName && hoveredName && (
          <Text strong className="text-[#3d57c4]">
            Hover qilingan: {hoveredName} ({activeBlock}-blok)
          </Text>
        )}
      </Card>

      {/* 2) Ma’lumot kartasi – o‘ng tomonda vertikal markazda */}
      <Card
        size="small"
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: '100%',
          maxWidth: 320
        }}
        className={`shadow-xl rounded-lg border backdrop-blur-sm
          ${isDark ? 'bg-slate-800/95 border-slate-500/50 [&_.ant-card-body]:text-slate-200' : 'bg-white/95 border-slate-300 [&_.ant-card-body]:text-slate-700'}`}
      >
        {info && displayName ? (
          <>
            <Title level={5} className={isDark ? '!mb-4 !text-white' : '!mb-4 !text-slate-800'}>
              {displayName}
            </Title>
            <div className="space-y-3">
              <div>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Xonalar:</Text>
                <Text strong className={isDark ? 'block text-white' : 'block text-slate-800'}>
                  {info.rooms} xona
                </Text>
              </div>
              <div>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Maydon:</Text>
                <Text strong className={isDark ? 'block text-white' : 'block text-slate-800'}>
                  {info.area} m²
                </Text>
              </div>
              <div>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Narx:</Text>
                <Text strong className="block text-[#3d57c4] font-semibold">
                  ${info.price.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Blok:</Text>
                <Text strong className={isDark ? 'block text-white' : 'block text-slate-800'}>
                  {info.block}
                </Text>
              </div>
              <div>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Qavat:</Text>
                <Text strong className={isDark ? 'block text-white' : 'block text-slate-800'}>
                  {info.floor}
                </Text>
              </div>
              <div>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Holat:</Text>
                <Text
                  strong
                  className={`block font-semibold ${
                    info.status === 'available'
                      ? 'text-[#3d57c4]'
                      : info.status === 'reserved'
                        ? 'text-amber-500'
                        : isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {statusLabels[info.status]}
                </Text>
              </div>
            </div>
            <Button
              type="primary"
              block
              className="mt-4 h-10 font-semibold bg-gradient-to-r from-[#3d57c4] to-[#2f459f] border-0 hover:opacity-90"
            >
              Batafsil ko&apos;rish
            </Button>
            {selectedName && (
              <Button
                type="default"
                block
                className="mt-2"
                onClick={() => setSelectedApartment(null)}
              >
                Tanlovni bekor qilish
              </Button>
            )}
          </>
        ) : (
          <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Ma&apos;lumotlarni ko&apos;rish uchun ob&apos;jekt ustiga hover qiling yoki bosing.
          </Text>
        )}
      </Card>

      {/* 3) Controller / ko‘rsatmalar – eng pastda */}
      <Card
        size="small"
        style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, width: '100%', maxWidth: 240 }}
        className={`shadow-xl rounded-lg border backdrop-blur-sm
          ${isDark ? 'bg-slate-800/95 border-slate-500/50 [&_.ant-card-body]:text-slate-200 [&_.ant-card-body]:text-xs [&_.ant-card-body]:py-2 [&_.ant-card-body]:px-3' : 'bg-white/95 border-slate-300 [&_.ant-card-body]:text-slate-700 [&_.ant-card-body]:text-xs [&_.ant-card-body]:py-2 [&_.ant-card-body]:px-3'}`}
      >
        <div className={`space-y-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Orbit size={14} className="shrink-0 text-slate-500" />
              <span>Zastavka (traektoriya bo‘ylab)</span>
            </span>
            <Switch checked={zastavkaMode} onChange={setZastavkaMode} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Shuffle size={14} className="shrink-0 text-slate-500" />
              <span>Random (o‘chib yonish)</span>
            </span>
            <Switch
              checked={randomFlashMode}
              onChange={(v) => {
                setRandomFlashMode(v);
                if (v) setIsRandomPlaying(true);
                else setIsRandomPlaying(false);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="shrink-0 text-slate-500" />
            <span>Chap tugma bilan aylantiring</span>
          </div>
          <div className="flex items-center gap-2">
            <ZoomIn size={14} className="shrink-0 text-slate-500" />
            <span>Scroll bilan zoom qiling</span>
          </div>
          <div className="flex items-center gap-2">
            <MousePointer2 size={14} className="shrink-0 text-slate-500" />
            <span>Ob’ekt ustiga hover qiling yoki bosing</span>
          </div>
        </div>
      </Card>

      {/* 4) Blok tanlash tugmalari – pastda, markazda */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          gap: 8
        }}
      >
        {([1, 2, 3] as const).map((block) => (
          <Button
            key={block}
            type="default"
            size="middle"
            onClick={() => setActiveBlock(block)}
          >
            {block}-blok
          </Button>
        ))}
        <Button
          type="primary"
          size="middle"
          icon={<Shuffle size={16} />}
          loading={isRandomPlaying}
          onClick={() => setIsRandomPlaying(true)}
        >
          Random
        </Button>
      </div>

      {/* 5) OrbitControls koordinatalari – o‘ng pastki burchak (copy qilish uchun) */}
      <Card
        size="small"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 10,
          width: '100%',
          maxWidth: 340,
          fontFamily: 'monospace',
          fontSize: 11
        }}
        className={`shadow-xl rounded-lg border backdrop-blur-sm
          ${isDark ? 'bg-slate-900/95 border-slate-500/50 [&_.ant-card-body]:text-slate-300 [&_.ant-card-body]:py-2 [&_.ant-card-body]:px-3' : 'bg-white/95 border-slate-300 [&_.ant-card-body]:text-slate-700 [&_.ant-card-body]:py-2 [&_.ant-card-body]:px-3'}`}
      >
        <div className="text-xs font-medium mb-1.5 opacity-80">Kamera (BLOCK_VIEWS uchun copy qiling)</div>
        <div className="space-y-1 break-all">
          <div>
            <span className="opacity-70">position:</span>{' '}
            <span className="select-all">[{cameraDisplay.position.join(', ')}]</span>
          </div>
          <div>
            <span className="opacity-70">target:</span>{' '}
            <span className="select-all">[{cameraDisplay.target.join(', ')}]</span>
          </div>
        </div>
        <Button
          type="default"
          size="small"
          className="mt-2 text-xs"
          onClick={() => {
            const text = `{ position: [${cameraDisplay.position.join(', ')}], target: [${cameraDisplay.target.join(', ')}] }`;
            void navigator.clipboard.writeText(text);
          }}
        >
          Code ni copy
        </Button>
      </Card>
    </div>
  );
}
