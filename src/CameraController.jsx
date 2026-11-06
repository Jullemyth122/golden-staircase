import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const CameraController = ({ isCinematic = true, onWideProgress }) => {
    const { camera } = useThree();
    const currentTarget = useRef(new THREE.Vector3(0, -22, 0));
    const targetPos = useRef(new THREE.Vector3(12.8, -22, 0));
    const lookTarget = useRef(new THREE.Vector3(0, -22, 0));

    // Unlimited scroll tracking
    const scrollTarget = useRef(0);
    const scrollCurrent = useRef(0);

    // Staircase parameters matching BoxGeometry4_0_2_4
    const spiralTurns = 3;
    const totalAngle = spiralTurns * 2 * Math.PI;
    const CLIMB_MAX = 0.90; // Only ascend up to 90% of the stairs

    // ── Unlimited Scroll & Touch Event Listeners ──
    useEffect(() => {
        const onWheel = (e) => {
            // Scroll delta mapped smoothly
            scrollTarget.current += e.deltaY * 0.00035;
        };

        let touchStartY = 0;
        const onTouchStart = (e) => {
            if (e.touches.length > 0) touchStartY = e.touches[0].clientY;
        };
        const onTouchMove = (e) => {
            if (e.touches.length > 0) {
                const diff = touchStartY - e.touches[0].clientY;
                touchStartY = e.touches[0].clientY;
                scrollTarget.current += diff * 0.0012;
            }
        };

        window.addEventListener('wheel', onWheel, { passive: true });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });

        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
        };
    }, []);

    useFrame((_, delta) => {
        if (!isCinematic) return;

        // Smooth physics inertia damping towards user's scroll input
        scrollCurrent.current = THREE.MathUtils.lerp(
            scrollCurrent.current,
            scrollTarget.current,
            Math.min(1.0, delta * 6.0)
        );

        // Infinite modulo wrap [0.0 -> 1.0) for unlimited seamless scrolling
        const rawProgress = scrollCurrent.current;
        const time = ((rawProgress % 1.0) + 1.0) % 1.0;

        let camX, camY, camZ;
        let lookX, lookY, lookZ;

        // ── Phase 1: 90% Spiral Climb (0.0 -> 0.60 of cycle) ──
        if (time < 0.60) {
            const climbNorm = time / 0.60; // 0.0 to 1.0
            const smoothNorm = THREE.MathUtils.smoothstep(climbNorm, 0, 1);
            const climbProgress = smoothNorm * CLIMB_MAX; // Climbs to 90% max

            const angle = climbProgress * totalAngle;
            const stairRadius = 7.5;
            const stairY = -24.0 + climbProgress * 48.0;

            // Camera offset in X, Z, and Y along the climbing spiral
            const camRadius = 12.8 + Math.sin(climbProgress * Math.PI * 4) * 0.9;
            const camAngle = angle - 0.45; // Banks behind the climb
            camY = stairY + 2.0;

            camX = Math.cos(camAngle) * camRadius;
            camZ = Math.sin(camAngle) * camRadius;

            // Focus point along upcoming steps
            const targetAngle = angle + 0.35;
            lookX = Math.cos(targetAngle) * stairRadius;
            lookY = stairY + 0.9;
            lookZ = Math.sin(targetAngle) * stairRadius;
        }
        // ── Phase 2: Transition from 90% Top Climb to Wide View (0.60 -> 0.72) ──
        else if (time < 0.72) {
            const t = (time - 0.60) / 0.12;
            const easeT = THREE.MathUtils.smoothstep(t, 0, 1);

            // 90% Climb end coordinates
            const endAngle = CLIMB_MAX * totalAngle;
            const endStairY = -24.0 + CLIMB_MAX * 48.0; // 19.2
            const endCamAngle = endAngle - 0.45;
            const topCamX = Math.cos(endCamAngle) * 12.8;
            const topCamY = endStairY + 2.0; // 21.2
            const topCamZ = Math.sin(endCamAngle) * 12.8;

            const topLookAngle = endAngle + 0.35;
            const topLookX = Math.cos(topLookAngle) * 7.5;
            const topLookY = endStairY + 0.9; // 20.1
            const topLookZ = Math.sin(topLookAngle) * 7.5;

            // Wide view start coordinates (safely inside cage: radius 19.5 < 25)
            const wideCamAngle = endCamAngle + 0.6;
            const wideCamX = Math.cos(wideCamAngle) * 19.5;
            const wideCamY = 16.5;
            const wideCamZ = Math.sin(wideCamAngle) * 19.5;

            camX = THREE.MathUtils.lerp(topCamX, wideCamX, easeT);
            camY = THREE.MathUtils.lerp(topCamY, wideCamY, easeT);
            camZ = THREE.MathUtils.lerp(topCamZ, wideCamZ, easeT);

            lookX = THREE.MathUtils.lerp(topLookX, 0, easeT);
            lookY = THREE.MathUtils.lerp(topLookY, 1.0, easeT);
            lookZ = THREE.MathUtils.lerp(topLookZ, 0, easeT);
        }
        // ── Phase 3: Grand Wide Panoramic View inside the cage (0.72 -> 0.88) ──
        else if (time < 0.88) {
            const wideT = (time - 0.72) / 0.16;
            const baseWideAngle = (CLIMB_MAX * totalAngle - 0.45) + 0.6;
            const wideAngle = baseWideAngle + wideT * 1.6;
            const wideRadius = 19.5; // safely within cylinder radius 25

            camX = Math.cos(wideAngle) * wideRadius;
            camY = 16.0 + Math.sin(wideT * Math.PI) * 2.2; // elevated view inside cage height (-25 to 30)
            camZ = Math.sin(wideAngle) * wideRadius;

            lookX = 0;
            lookY = 1.0;
            lookZ = 0;
        }
        // ── Phase 4: Smooth descent back to bottom starting position (0.88 -> 1.00) ──
        else {
            const loopT = (time - 0.88) / 0.12;
            const easeLoop = THREE.MathUtils.smoothstep(loopT, 0, 1);

            // Wide view end coordinates
            const baseWideAngle = (CLIMB_MAX * totalAngle - 0.45) + 0.6;
            const endWideAngle = baseWideAngle + 1.6;
            const wideEndX = Math.cos(endWideAngle) * 19.5;
            const wideEndY = 16.0;
            const wideEndZ = Math.sin(endWideAngle) * 19.5;

            // Bottom starting coordinates
            const startAngle = -0.45;
            const startX = Math.cos(startAngle) * 12.8;
            const startY = -22.0;
            const startZ = Math.sin(startAngle) * 12.8;

            camX = THREE.MathUtils.lerp(wideEndX, startX, easeLoop);
            camY = THREE.MathUtils.lerp(wideEndY, startY, easeLoop);
            camZ = THREE.MathUtils.lerp(wideEndZ, startZ, easeLoop);

            const startLookX = Math.cos(0.35) * 7.5;
            const startLookY = -23.1;
            const startLookZ = Math.sin(0.35) * 7.5;

            lookX = THREE.MathUtils.lerp(0, startLookX, easeLoop);
            lookY = THREE.MathUtils.lerp(1.0, startLookY, easeLoop);
            lookZ = THREE.MathUtils.lerp(0, startLookZ, easeLoop);
        }

        // Safety clamp to ensure camera strictly stays within the inner volume of the cage
        const r = Math.sqrt(camX * camX + camZ * camZ);
        if (r > 22.0) {
            camX = (camX / r) * 22.0;
            camZ = (camZ / r) * 22.0;
        }
        camY = THREE.MathUtils.clamp(camY, -23.0, 26.0);

        targetPos.current.set(camX, camY, camZ);
        lookTarget.current.set(lookX, lookY, lookZ);

        // Smooth camera lerping with delta damping
        const lerpFactor = Math.min(1.0, delta * 4.0);
        camera.position.lerp(targetPos.current, lerpFactor);
        currentTarget.current.lerp(lookTarget.current, lerpFactor);
        camera.lookAt(currentTarget.current);

        // Calculate wide-view transition factor [0.0 -> 1.0 -> 0.0]
        // Smoothly fades in starting at 0.62, peaks through 0.70 - 0.86, fades out by 0.90
        let wideFactor = 0;
        if (time >= 0.62 && time <= 0.90) {
            if (time < 0.72) {
                wideFactor = (time - 0.62) / 0.10;
            } else if (time > 0.84) {
                wideFactor = (0.90 - time) / 0.06;
            } else {
                wideFactor = 1.0;
            }
            wideFactor = THREE.MathUtils.smoothstep(wideFactor, 0, 1);
        }

        if (onWideProgress) {
            onWideProgress(wideFactor, time);
        }
    });

    return null;
};

export default CameraController;
