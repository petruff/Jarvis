// jarvis-ui/src/components/AgiCore.tsx
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';

interface AgiCoreProps {
    socket?: Socket;
    active?: boolean;
}

const NeuralOrb = ({ neuralActivity }: { neuralActivity: number }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const glowRef = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        // Pulse logic based on activity
        const pulse = 1 + Math.sin(time * 2) * (0.05 + neuralActivity * 0.1);
        meshRef.current.scale.set(pulse, pulse, pulse);

        // Rotation
        meshRef.current.rotation.x = time * 0.2;
        meshRef.current.rotation.y = time * 0.3;

        // Glow breathing
        const glowScale = 1.2 + Math.sin(time * 3) * 0.1;
        glowRef.current.scale.set(glowScale, glowScale, glowScale);
    });

    return (
        <group>
            {/* Inner Core */}
            <Sphere ref={meshRef} args={[1.5, 64, 64]}>
                <MeshDistortMaterial
                    color="#FFB800"
                    speed={2 + neuralActivity * 5}
                    distort={0.4 + neuralActivity * 0.4}
                    radius={1}
                    emissive="#FF8A00"
                    emissiveIntensity={2 + neuralActivity * 2}
                    metalness={0.8}
                    roughness={0.2}
                />
            </Sphere>

            {/* Outer Glow Halo */}
            <Sphere ref={glowRef} args={[1.6, 32, 32]}>
                <meshBasicMaterial
                    color="#FF8A00"
                    transparent
                    opacity={0.1 + neuralActivity * 0.2}
                    side={THREE.BackSide}
                />
            </Sphere>

            {/* Orbital Rings */}
            <group rotation={[Math.PI / 4, 0, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2.5, 0.01, 16, 100]} />
                    <meshBasicMaterial color="#FFD600" transparent opacity={0.3} />
                </mesh>
            </group>
        </group>
    );
};

const DataParticles = ({ count = 100, activity = 0.2 }) => {
    const points = useMemo(() => {
        const p = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 3 + Math.random() * 5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            p[i * 3 + 2] = r * Math.cos(phi);
        }
        return p;
    }, [count]);

    const ref = useRef<THREE.Points>(null!);
    useFrame(() => {
        ref.current.rotation.y += 0.002 * (1 + activity * 5);
        ref.current.rotation.z += 0.001;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[points, 3]}
                />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#FFFFFF" transparent opacity={0.6} sizeAttenuation />
        </points>
    );
};

const AgiCore: React.FC<AgiCoreProps> = ({ socket }) => {
    const [neuralActivity, setNeuralActivity] = useState(0.2);
    const [webGlSupported, setWebGlSupported] = useState(true);

    useEffect(() => {
        // Quick WebGL support check
        try {
            const canvas = document.createElement('canvas');
            const support = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
            setWebGlSupported(support);
        } catch (e) {
            setWebGlSupported(false);
        }
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handler = (data: { neuralLoad: number }) => {
            setNeuralActivity(data.neuralLoad / 100);
        };
        socket.on('jarvis/pulse', handler);
        return () => { socket.off('jarvis/pulse', handler); };
    }, [socket]);

    if (!webGlSupported) {
        return (
            <div className="flex flex-col items-center justify-center font-mono text-jarvis-primary/40 text-[10px]">
                <div className="w-16 h-16 border border-jarvis-primary/20 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 border border-jarvis-primary/40 rounded-full animate-ping" />
                </div>
                <span className="mt-4">3D CORE OFFLINE - WEBGL NOT SUPPORTED</span>
            </div>
        );
    }

    return (
        <div className="agi-core-container relative w-full h-[400px] flex items-center justify-center overflow-hidden cursor-pointer">
            <Canvas dpr={[1, 2]} onError={() => setWebGlSupported(false)}>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#FFB800" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#FFD600" />

                <NeuralOrb neuralActivity={neuralActivity} />
                <DataParticles count={200} activity={neuralActivity} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <fog attach="fog" args={['#070b14', 5, 20]} />
            </Canvas>

            <div className="absolute z-10 bottom-4 text-jarvis-primary font-mono opacity-40 pointer-events-none tracking-widest text-[10px] uppercase flex flex-col items-center">
                <span className="animate-pulse">Neural Core V3.0 — Standard Dimension</span>
                <div className="flex gap-4 mt-2">
                    <span>SYNC: ONLINE</span>
                    <span>LOAD: {(neuralActivity * 100).toFixed(1)}%</span>
                </div>
            </div>

            {/* Radial Vignette Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(7,11,20,0.4)_70%,rgba(7,11,20,1)_100%)] pointer-events-none" />
        </div>
    );
};

export default AgiCore;
