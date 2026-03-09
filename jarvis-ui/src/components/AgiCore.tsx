// jarvis-ui/src/components/AgiCore.tsx
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';

interface AgiCoreProps {
    socket?: Socket;
    active?: boolean;
}

const AgiCore: React.FC<AgiCoreProps> = ({ socket }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [webGlSupported, setWebGlSupported] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;

        let renderer: THREE.WebGLRenderer;
        let scene: THREE.Scene;
        let camera: THREE.PerspectiveCamera;
        let core: THREE.Group;
        let innerOrb: THREE.Mesh;
        let particles: THREE.Points;
        let frameId: number;

        try {
            const width = containerRef.current.clientWidth;
            const height = 400;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            camera.position.z = 10;

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            containerRef.current.appendChild(renderer.domElement);

            core = new THREE.Group();
            scene.add(core);

            // 1. Inner Sphere (The Core)
            const coreGeom = new THREE.SphereGeometry(1.5, 64, 64);
            const coreMat = new THREE.MeshStandardMaterial({
                color: 0x00f3ff,
                emissive: 0x00f3ff,
                emissiveIntensity: 2,
                metalness: 0.8,
                roughness: 0.2,
                wireframe: true
            });
            innerOrb = new THREE.Mesh(coreGeom, coreMat);
            core.add(innerOrb);

            // 2. Data Particles
            const particleCount = 200;
            const positions = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount * 3; i++) {
                positions[i] = (Math.random() - 0.5) * 15;
            }
            const particleGeom = new THREE.BufferGeometry();
            particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const particleMat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.05,
                transparent: true,
                opacity: 0.6
            });
            particles = new THREE.Points(particleGeom, particleMat);
            scene.add(particles);

            // 3. Orbital Ring
            const ringGeom = new THREE.TorusGeometry(3.5, 0.02, 16, 100);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.3 });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = Math.PI / 2;
            core.add(ring);

            // Lights
            scene.add(new THREE.AmbientLight(0x404040, 2));
            const pointLight = new THREE.PointLight(0x00f3ff, 2, 50);
            pointLight.position.set(5, 5, 5);
            scene.add(pointLight);

            // Socket handler (simple load reaction)
            let load = 0.2;
            if (socket) {
                socket.on('jarvis/pulse', (data: { neuralLoad: number }) => {
                    load = data.neuralLoad / 100;
                });
            }

            const animate = (time: number) => {
                const t = time * 0.001;

                // Pulsing
                const pulse = 1 + Math.sin(t * 2) * (0.05 + load * 0.1);
                core.scale.set(pulse, pulse, pulse);
                core.rotation.y += 0.005 + load * 0.02;
                core.rotation.x += 0.003;

                // Particles
                particles.rotation.y -= 0.001;
                particles.rotation.z += 0.0005;

                renderer.render(scene, camera);
                frameId = requestAnimationFrame(animate);
            };
            animate(0);

            // Resize handle
            const handleResize = () => {
                if (!containerRef.current) return;
                const w = containerRef.current.clientWidth;
                camera.aspect = w / 400;
                camera.updateProjectionMatrix();
                renderer.setSize(w, 400);
            };
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (frameId) cancelAnimationFrame(frameId);
                if (renderer) {
                    renderer.dispose();
                    if (containerRef.current && renderer.domElement) {
                        containerRef.current.removeChild(renderer.domElement);
                    }
                }
                if (socket) socket.off('jarvis/pulse');
            };

        } catch (e) {
            console.error('Three.js Init Failed', e);
            setWebGlSupported(false);
        }
    }, [socket]);

    if (!webGlSupported) {
        return <div className="text-white text-[8px]">3D CORE DEGRADED</div>;
    }

    return (
        <div ref={containerRef} className="agi-core-container relative w-full h-[400px] flex items-center justify-center overflow-hidden">
            <div className="absolute z-10 bottom-4 text-jarvis-primary font-mono opacity-40 text-[8px] uppercase flex flex-col items-center">
                <span className="animate-pulse">Neural Core V3.1 — Native Matrix</span>
            </div>
        </div>
    );
};

export default AgiCore;
