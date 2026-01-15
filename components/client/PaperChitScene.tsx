"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface PaperChit {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Euler;
  isSettled: boolean;
  isSelected: boolean;
  isUnfolding: boolean;
  unfoldProgress: number;
}

interface ChitSceneProps {
  numberOfChits: number;
  onChitClick: () => void;
  isLoading: boolean;
  selectedRank: number | null;
}

function PaperChitMesh({
  chit,
  onClick,
  isDisabled
}: {
  chit: PaperChit;
  onClick: () => void;
  isDisabled: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered && !isDisabled) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'auto';
    }
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered, isDisabled]);

  useFrame(() => {
    if (!meshRef.current) return;

    // Update position and rotation based on chit state
    meshRef.current.position.copy(chit.position);
    meshRef.current.rotation.copy(chit.rotation);

    // Hover effect for settled chits
    if (chit.isSettled && !chit.isSelected && hovered && !isDisabled) {
      meshRef.current.position.y += Math.sin(Date.now() * 0.003) * 0.02;
    }

    // Unfold animation - scale appropriately
    if (chit.isUnfolding) {
      const rollScale = Math.max(0.05, 1 - chit.unfoldProgress);
      const expandScale = 1 + chit.unfoldProgress * 1.5;
      meshRef.current.scale.set(
        expandScale, // Expand width as it unfolds
        1,
        rollScale  // Shrink depth to flatten
      );
    }
  });

  // Rolled paper geometry - cylinder
  const radius = 0.15;
  const height = 1.2;

  return (
    <group ref={meshRef}>
      {!chit.isUnfolding ? (
        // Rolled paper (cylinder)
        <mesh
          onClick={chit.isSettled && !isDisabled ? onClick : undefined}
          onPointerOver={() => chit.isSettled && setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <cylinderGeometry args={[radius, radius, height, 16]} />
          <meshStandardMaterial
            color={hovered && !isDisabled ? "#f9f5e3" : "#f5f1dc"}
            roughness={0.8}
            metalness={0.1}
          />
          {/* End caps */}
          <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius, 16]} />
            <meshStandardMaterial color="#e8ddb5" />
          </mesh>
          <mesh position={[0, -height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius, 16]} />
            <meshStandardMaterial color="#e8ddb5" />
          </mesh>
        </mesh>
      ) : (
        // Unfolding paper (flat plane)
        <group>
          <mesh rotation={[0, 0, 0]}>
            <planeGeometry args={[2.5, 3]} />
            <meshStandardMaterial
              color="#f5f1dc"
              roughness={0.6}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Paper border for depth */}
          <mesh rotation={[0, 0, 0]} position={[0, 0, -0.001]}>
            <planeGeometry args={[2.6, 3.1]} />
            <meshStandardMaterial
              color="#e8ddb5"
              roughness={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ChitContainer() {
  return (
    <group position={[0, -2, 0]}>
      {/* Bowl base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[2, 2.5, 32]} />
        <meshStandardMaterial
          color="#8b7355"
          roughness={0.6}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bowl walls */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        const x = Math.cos(angle) * 2.25;
        const z = Math.sin(angle) * 2.25;
        return (
          <mesh
            key={i}
            position={[x, 0.15, z]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial color="#a0826d" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

function ChitsPhysics({
  chits,
  setChits,
  onChitClick,
  isLoading,
  selectedRank
}: {
  chits: PaperChit[];
  setChits: React.Dispatch<React.SetStateAction<PaperChit[]>>;
  onChitClick: () => void;
  isLoading: boolean;
  selectedRank: number | null;
}) {
  const { camera } = useThree();
  const selectedChitRef = useRef<number | null>(null);

  useFrame((state, delta) => {
    setChits(prevChits =>
      prevChits.map(chit => {
        if (chit.isSettled && !chit.isSelected) return chit;

        const newChit = { ...chit };

        // Unfolding animation
        if (chit.isUnfolding) {
          newChit.unfoldProgress = Math.min(1, chit.unfoldProgress + delta * 1.2);

          // Move to center and face camera during unfold - move faster at the start
          const targetPos = new THREE.Vector3(0, 0, 2);
          const lerpSpeed = chit.unfoldProgress < 0.3 ? 8 : 2;
          newChit.position.lerp(targetPos, delta * lerpSpeed);

          // Rotate to face camera - faster rotation
          const targetRotation = new THREE.Euler(0, 0, 0);
          const rotSpeed = chit.unfoldProgress < 0.3 ? 10 : 3;
          newChit.rotation.x += (targetRotation.x - newChit.rotation.x) * delta * rotSpeed;
          newChit.rotation.y += (targetRotation.y - newChit.rotation.y) * delta * rotSpeed;
          newChit.rotation.z += (targetRotation.z - newChit.rotation.z) * delta * rotSpeed;

          return newChit;
        }

        // Physics simulation for falling chits
        if (!chit.isSettled) {
          // Apply gravity
          newChit.velocity.y -= 9.8 * delta;

          // Update position
          newChit.position.x += newChit.velocity.x * delta;
          newChit.position.y += newChit.velocity.y * delta;
          newChit.position.z += newChit.velocity.z * delta;

          // Update rotation
          newChit.rotation.x += newChit.angularVelocity.x * delta;
          newChit.rotation.y += newChit.angularVelocity.y * delta;
          newChit.rotation.z += newChit.angularVelocity.z * delta;

          // Check collision with bowl bottom
          const distanceFromCenter = Math.sqrt(
            newChit.position.x ** 2 + newChit.position.z ** 2
          );

          if (newChit.position.y <= -1.4 && distanceFromCenter < 2.2) {
            newChit.position.y = -1.4;
            newChit.velocity.y = -newChit.velocity.y * 0.3; // Bounce with energy loss
            newChit.velocity.x *= 0.8; // Friction
            newChit.velocity.z *= 0.8;
            newChit.angularVelocity.x *= 0.8;
            newChit.angularVelocity.y *= 0.8;
            newChit.angularVelocity.z *= 0.8;

            // Check if settled
            if (Math.abs(newChit.velocity.y) < 0.1 && Math.abs(newChit.velocity.x) < 0.1) {
              newChit.isSettled = true;
              newChit.velocity.set(0, 0, 0);
              newChit.angularVelocity.set(0, 0, 0);
            }
          }

          // Bounce off walls
          if (distanceFromCenter > 2.2) {
            const angle = Math.atan2(newChit.position.z, newChit.position.x);
            newChit.position.x = Math.cos(angle) * 2.2;
            newChit.position.z = Math.sin(angle) * 2.2;
            newChit.velocity.x = -newChit.velocity.x * 0.5;
            newChit.velocity.z = -newChit.velocity.z * 0.5;
          }
        }

        return newChit;
      })
    );
  });

  const handleClick = (chitId: number) => {
    if (isLoading) return;

    selectedChitRef.current = chitId;
    setChits(prevChits =>
      prevChits.map(c =>
        c.id === chitId
          ? { ...c, isSelected: true, isUnfolding: true }
          : c
      )
    );
    onChitClick();
  };

  // Check if any chit is selected
  const hasSelectedChit = chits.some(c => c.isSelected);

  return (
    <>
      {chits.map(chit => {
        // Hide non-selected chits when one is selected
        if (hasSelectedChit && !chit.isSelected) {
          return null;
        }
        return (
          <PaperChitMesh
            key={chit.id}
            chit={chit}
            onClick={() => handleClick(chit.id)}
            isDisabled={isLoading || hasSelectedChit}
          />
        );
      })}
    </>
  );
}

function RankDisplay({ rank, opacity }: { rank: number; opacity: number }) {
  return (
    <group position={[0, 0, 2.02]}>
      <Text
        fontSize={2.5}
        color="#2c3e50"
        anchorX="center"
        anchorY="middle"
        fontWeight={900}
        fillOpacity={opacity}
      >
        {rank}
      </Text>
    </group>
  );
}

function Scene({ numberOfChits, onChitClick, isLoading, selectedRank }: ChitSceneProps) {
  const [chits, setChits] = useState<PaperChit[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once to prevent re-dropping
    if (!initialized) {
      const initialChits: PaperChit[] = Array.from({ length: numberOfChits }, (_, i) => ({
        id: i,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          5 + i * 0.3, // Stagger drop timing
          (Math.random() - 0.5) * 3
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        angularVelocity: new THREE.Euler(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        isSettled: false,
        isSelected: false,
        isUnfolding: false,
        unfoldProgress: 0
      }));
      setChits(initialChits);
      setInitialized(true);
    }
  }, [numberOfChits, initialized]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.4} />
      <hemisphereLight color="#ffffff" groundColor="#8b7355" intensity={0.5} />

      <ChitContainer />

      <ChitsPhysics
        chits={chits}
        setChits={setChits}
        onChitClick={onChitClick}
        isLoading={isLoading}
        selectedRank={selectedRank}
      />

      {/* Show rank on unfolded paper */}
      {selectedRank !== null && chits.some(c => c.isUnfolding && c.unfoldProgress > 0.3) && (() => {
        const unfoldingChit = chits.find(c => c.isUnfolding);
        const opacity = unfoldingChit
          ? Math.min(1, (unfoldingChit.unfoldProgress - 0.3) / 0.4)
          : 0;
        return <RankDisplay rank={selectedRank} opacity={opacity} />;
      })()}

      {/* Background */}
      <mesh position={[0, -10, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#e8e4d9" />
      </mesh>
    </>
  );
}

export function PaperChitScene({
  numberOfChits,
  onChitClick,
  isLoading,
  selectedRank
}: ChitSceneProps) {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-2xl bg-gradient-to-b from-blue-50 to-purple-50">
      <Canvas shadows>
        <Suspense fallback={null}>
          <Scene
            numberOfChits={numberOfChits}
            onChitClick={onChitClick}
            isLoading={isLoading}
            selectedRank={selectedRank}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
