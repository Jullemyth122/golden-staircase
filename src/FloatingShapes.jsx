import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const SHAPES_STORY = [
    {
        step: 16,
        type: 'octahedron',
        mat: 'gold',
        hoverHeight: 2.2,
        scale: 2.2,
        tag: '01 // THE ASCENT',
        pill: 'STEP 16',
        title: 'An Infinite Spiral',
        story: 'You can keep scrolling forever. The stairs wrap infinitely, looping seamlessly between the bottom floor and the sky.',
        footer: 'Infinite Scroll Engine active',
    },
    {
        step: 32,
        type: 'icosahedron',
        mat: 'pearl',
        hoverHeight: 2.5,
        scale: 2.0,
        tag: '02 // THE FLOCK',
        pill: 'STEP 32',
        title: 'Follow the Origami Birds',
        story: 'Notice the birds flanking you? They bank into every curve with you, guiding your line of sight up the spiral.',
        footer: '36 Procedural Flocking Birds',
    },
    {
        step: 48,
        type: 'torus',
        mat: 'roseGold',
        hoverHeight: 2.3,
        scale: 2.4,
        tag: '03 // THE ATRIUM',
        pill: 'STEP 48',
        title: 'Drifting Golden Dust',
        story: 'Hundreds of glowing embers float gently through the center void, catching the warm light as you ascend.',
        footer: '350 Atmospheric Embers',
    },
    {
        step: 64,
        type: 'dodecahedron',
        mat: 'gold',
        hoverHeight: 2.6,
        scale: 2.1,
        tag: '04 // THE ENCLOSURE',
        pill: 'STEP 64',
        title: 'The Rotunda Cage',
        story: 'Look outward. A massive cylindrical cage encloses the entire world in golden warmth and solitude.',
        footer: '55m Cylinder Enclosure',
    },
    {
        step: 80,
        type: 'octahedron',
        mat: 'pearl',
        hoverHeight: 2.2,
        scale: 2.3,
        tag: '05 // LIVING LIGHTS',
        pill: 'STEP 80',
        title: 'Breathing Point Lights',
        story: 'Nine warm light orbs follow the staircase curve, gently pulsing in brightness to illuminate your steps.',
        footer: 'Dynamic Light Synchronizer',
    },
    {
        step: 96,
        type: 'crystal',
        mat: 'roseGold',
        hoverHeight: 2.7,
        scale: 2.0,
        tag: '06 // FLUID MOTION',
        pill: 'STEP 96',
        title: 'Weightless Momentum',
        story: 'Scroll fast or slow. The camera uses smooth spring damping so every movement feels cinematic and effortless.',
        footer: 'Inertia Physics Controller',
    },
    {
        step: 112,
        type: 'torus',
        mat: 'gold',
        hoverHeight: 2.4,
        scale: 2.5,
        tag: '07 // ELEVATION',
        pill: 'STEP 112',
        title: 'Rising Above the Core',
        story: 'Look down through the spiral center. The marble floor below is slowly disappearing into the warm atmospheric haze.',
        footer: 'Altitude: Mid-Ascent',
    },
    {
        step: 128,
        type: 'icosahedron',
        mat: 'obsidianGold',
        hoverHeight: 2.5,
        scale: 2.2,
        tag: '08 // THE ARTIFACTS',
        pill: 'STEP 128',
        title: 'Floating Geometric Relics',
        story: 'Twelve geometric artifacts hover along the balustrade, each crafted from gold, pearl, or obsidian.',
        footer: '12 Unique Geometric Relics',
    },
    {
        step: 144,
        type: 'dodecahedron',
        mat: 'pearl',
        hoverHeight: 2.3,
        scale: 2.1,
        tag: '09 // FORMATION',
        pill: 'STEP 144',
        title: 'The Flock Gathers',
        story: 'As you climb higher, the birds prepare to break away from the stairs and frame a wide panoramic view.',
        footer: 'Flock Wing Formation',
    },
    {
        step: 160,
        type: 'octahedron',
        mat: 'gold',
        hoverHeight: 2.6,
        scale: 2.3,
        tag: '10 // THE 90% MARK',
        pill: 'STEP 160',
        title: 'Approaching the Summit',
        story: 'Almost at the peak of the climb. In a few moments, the camera will smoothly pull back for the wide vista.',
        footer: 'Apex Transition Ahead',
    },
    {
        step: 176,
        type: 'crystal',
        mat: 'roseGold',
        hoverHeight: 2.4,
        scale: 2.1,
        tag: '11 // THE VISTA',
        pill: 'STEP 176',
        title: 'The Grand Rotunda View',
        story: 'The camera glides into the open atrium, presenting the entire suspended spiral staircase in all its grandeur.',
        footer: 'Wide Cinematic Orbit',
    },
    {
        step: 190,
        type: 'torus',
        mat: 'pearl',
        hoverHeight: 2.5,
        scale: 2.4,
        tag: '12 // SEAMLESS LOOP',
        pill: 'STEP 190',
        title: 'Back to the Beginning',
        story: 'The descent gently brings you back to step one. Keep scrolling—the golden journey never truly ends.',
        footer: 'Seamless Infinite Loop',
    },
];

const FloatingShapeItem = ({ data, material }) => {
    const meshRef = useRef(null);
    const cardRef = useRef(null);
    const opacityRef = useRef(0);

    useFrame(({ clock, camera }, delta) => {
        const time = clock.elapsedTime;

        // Animate the 3D rotating mesh inside its own group
        if (meshRef.current) {
            const bob = Math.sin(time * data.bobSpeed + data.phase) * data.bobAmp;
            meshRef.current.position.y = bob;
            meshRef.current.rotation.x = time * data.rotSpeedX + data.phase;
            meshRef.current.rotation.y = time * data.rotSpeedY + data.phase;
            meshRef.current.rotation.z = time * data.rotSpeedZ;
        }

        // Distance from camera to this stationary shape position
        const dist = camera.position.distanceTo(
            new THREE.Vector3(data.basePos[0], data.basePos[1], data.basePos[2])
        );

        // Generous, smooth bell-curve visibility window (between 3.5 and 12.0 units)
        // Peak visibility around 6.5 units
        const minD = 3.5;
        const maxD = 12.0;
        const peakD = 6.5;
        let targetOp = 0;
        if (dist >= minD && dist <= maxD) {
            if (dist < peakD) {
                targetOp = (dist - minD) / (peakD - minD);
            } else {
                targetOp = (maxD - dist) / (maxD - peakD);
            }
            targetOp = THREE.MathUtils.smoothstep(targetOp, 0, 1);
        }

        // Smooth damping rate (delta * 3.5) to prevent flashing and ensure smooth transitions
        opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOp, Math.min(1.0, delta * 3.5));

        if (cardRef.current) {
            const op = opacityRef.current;
            if (op < 0.005) {
                cardRef.current.style.opacity = '0';
                cardRef.current.style.transform = 'translateY(10px) scale(0.95)';
            } else {
                cardRef.current.style.opacity = op.toFixed(3);
                const yOffset = (1.0 - op) * 10;
                const scale = 0.95 + op * 0.05;
                cardRef.current.style.transform = `translateY(${yOffset.toFixed(1)}px) scale(${scale.toFixed(3)})`;
            }
        }
    });

    let geometry = null;
    switch (data.type) {
        case 'octahedron':
            geometry = <octahedronGeometry args={[0.38 * data.scale, 0]} />;
            break;
        case 'icosahedron':
            geometry = <icosahedronGeometry args={[0.36 * data.scale, 0]} />;
            break;
        case 'dodecahedron':
            geometry = <dodecahedronGeometry args={[0.34 * data.scale, 0]} />;
            break;
        case 'torus':
            geometry = <torusGeometry args={[0.35 * data.scale, 0.09 * data.scale, 20, 48]} />;
            break;
        case 'crystal':
        default:
            geometry = <octahedronGeometry args={[0.42 * data.scale, 1]} />;
            break;
    }

    return (
        <group position={data.basePos}>
            {/* 3D Floating & Rotating Geometric Artifact */}
            <group ref={meshRef}>
                <mesh material={material} castShadow receiveShadow>
                    {geometry}
                </mesh>
            </group>

            {/* Stationary 3D HUD UI Card (Stable, looking at camera, no wobbling) */}
            <Html
                position={[1.5, 0.5, 0]}
                center
                distanceFactor={11.0}
                zIndexRange={[100, 0]}
            >
                <div ref={cardRef} className="shape-hud-card" style={{ opacity: 0 }}>
                    <div className="shape-hud-tag-row">
                        <span className="shape-hud-tag">{data.tag}</span>
                        <span className="shape-hud-pill">{data.pill}</span>
                    </div>

                    <div className="shape-hud-title">{data.title}</div>
                    <div className="shape-hud-story">{data.story}</div>

                </div>
            </Html>
        </group>
    );
};

const FloatingShapes = () => {
    // Diverse premium materials for the floating artifacts
    const materials = useMemo(() => ({
        gold: new THREE.MeshStandardMaterial({
            color: 0xd4a843,
            metalness: 0.95,
            roughness: 0.15,
            envMapIntensity: 2.0,
        }),
        pearl: new THREE.MeshStandardMaterial({
            color: 0xfffcf5,
            metalness: 0.15,
            roughness: 0.25,
            transparent: true,
            opacity: 0.95,
        }),
        roseGold: new THREE.MeshStandardMaterial({
            color: 0xe8b4a0,
            metalness: 0.88,
            roughness: 0.2,
        }),
        obsidianGold: new THREE.MeshStandardMaterial({
            color: 0x1f1812,
            metalness: 0.85,
            roughness: 0.08,
        }),
    }), []);

    // Staircase math matching BoxGeometry4_0_2_4
    const shapesData = useMemo(() => {
        const scale = 0.1;
        const heightY = 2.5 * scale;
        const depthZ = 5 * scale;
        const gaps = 3 * scale;
        const widthX = 20 * scale;
        const innerRadius = 15 * scale;
        const spiralTurns = 3;
        const totalAngle = spiralTurns * 2 * Math.PI;
        const totalX = (200 - 1) * (depthZ + gaps) + (depthZ + 1.5 * scale);

        return SHAPES_STORY.map((item, idx) => {
            const startX = item.step * (depthZ + gaps) + depthZ * 0.5;
            const startY = item.step * heightY;
            const progress = startX / totalX;
            const angle = progress * totalAngle;

            // Hover centered on the step tread
            const radius = innerRadius + (widthX * 0.5);
            const x = Math.cos(angle) * radius * (gaps / scale);
            const z = Math.sin(angle) * radius * (gaps / scale);
            const stepTopY = startY + heightY - 25;

            return {
                ...item,
                id: item.step,
                basePos: [x, stepTopY + item.hoverHeight, z],
                phase: idx * 0.85,
                rotSpeedX: 0.35 + (idx % 3) * 0.25,
                rotSpeedY: 0.5 + (idx % 4) * 0.2,
                rotSpeedZ: 0.25 + (idx % 2) * 0.2,
                bobSpeed: 1.1 + (idx % 3) * 0.3,
                bobAmp: 0.22 + (idx % 2) * 0.08,
            };
        });
    }, []);

    return (
        <group>
            {shapesData.map((data) => (
                <FloatingShapeItem
                    key={data.id}
                    data={data}
                    material={materials[data.mat]}
                />
            ))}
        </group>
    );
};

export default FloatingShapes;
