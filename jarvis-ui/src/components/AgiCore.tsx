import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface AgiCoreProps {
    socket?: Socket;
    active?: boolean;
}

const AgiCore: React.FC<AgiCoreProps> = ({ socket, active = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pulseRef = useRef(0);
    const neuralActivityRef = useRef(0.2);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const particles: Particle[] = [];
        const particleCount = 120;

        class Particle {
            x: number = 0;
            y: number = 0;
            z: number = 0;
            radius: number = 0;
            color: string = '';
            angle: number = 0;
            speed: number = 0;
            dist: number = 0;

            constructor(canvasWidth: number, canvasHeight: number) {
                this.reset(canvasWidth, canvasHeight);
            }

            reset(w: number, h: number) {
                this.angle = Math.random() * Math.PI * 2;
                this.speed = 0.005 + Math.random() * 0.01;
                this.dist = 100 + Math.random() * 80;
                this.radius = 0.5 + Math.random() * 2;
                // Deep Amber / Neural Orange palette
                const colors = ['#FFB800', '#FF8A00', '#FFD600', '#FFFFFF'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update(w: number, h: number) {
                this.angle += this.speed * (1 + neuralActivityRef.current * 2);
                this.x = w / 2 + Math.cos(this.angle) * this.dist;
                this.y = h / 2 + Math.sin(this.angle * 0.5) * (this.dist * 0.4);

                // Add a vertical oscillation for 3D feel
                this.y += Math.sin(pulseRef.current * 0.05 + this.angle) * 20;
            }

            draw(context: CanvasRenderingContext2D) {
                context.beginPath();
                context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                context.fillStyle = this.color;
                context.shadowBlur = 10;
                context.shadowColor = this.color;
                context.fill();
                context.closePath();
            }
        }

        const init = () => {
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(canvas.width, canvas.height));
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pulseRef.current += 1;

            // Draw central "Neural Sun"
            const grad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, 80 + Math.sin(pulseRef.current * 0.1) * 5
            );
            grad.addColorStop(0, 'rgba(255, 184, 0, 0.8)');
            grad.addColorStop(0.5, 'rgba(255, 138, 0, 0.3)');
            grad.addColorStop(1, 'rgba(255, 138, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2);
            ctx.fill();

            // Neural connection lines
            ctx.strokeStyle = 'rgba(255, 184, 0, 0.1)';
            ctx.lineWidth = 0.5;

            particles.forEach((p, i) => {
                p.update(canvas.width, canvas.height);
                p.draw(ctx);

                // Connect nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
                    if (d < 40) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };

        window.addEventListener('resize', resize);
        resize();
        init();
        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('jarvis/pulse', (data) => {
            neuralActivityRef.current = data.neuralLoad / 100;
        });

        return () => {
            socket.off('jarvis/pulse');
        }
    }, [socket]);

    return (
        <div className="agi-core-container relative w-full h-full flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
            <div className="absolute z-10 text-white font-bold opacity-20 pointer-events-none tracking-widest text-xs uppercase">
                Neural Core Active
            </div>

            {/* Cinematic Overlays */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/40 pointer-events-none" />
            <div className="absolute w-[120%] h-[120%] border border-amber-500/10 rounded-full animate-spin-slow pointer-events-none" />
        </div>
    );
};

export default AgiCore;
