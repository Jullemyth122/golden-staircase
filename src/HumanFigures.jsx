import { useMemo } from 'react';
import * as THREE from 'three';

// Individual architectural human figure model
const HumanFigureModel = ({ position, rotation, scale = 1.0, pose = 'walking' }) => {
    const marbleMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xf6ede0,
        roughness: 0.45,
        metalness: 0.2,
        side: THREE.DoubleSide,
    }), []);

    const goldMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xd4a843,
        roughness: 0.35,
        metalness: 0.7,
    }), []);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Head */}
            <mesh position={[0, 1.62, 0]} material={marbleMat} castShadow>
                <sphereGeometry args={[0.09, 16, 16]} />
            </mesh>

            {/* Neck */}
            <mesh position={[0, 1.50, 0]} material={marbleMat} castShadow>
                <cylinderGeometry args={[0.04, 0.045, 0.08, 12]} />
            </mesh>

            {/* Torso & Coat */}
            <mesh position={[0, 1.18, 0]} material={marbleMat} castShadow>
                <cylinderGeometry args={[0.13, 0.16, 0.58, 16]} />
            </mesh>

            {/* Subtle Gold Waist Accent */}
            <mesh position={[0, 0.95, 0]} material={goldMat}>
                <cylinderGeometry args={[0.15, 0.15, 0.03, 16]} />
            </mesh>

            {/* Left Leg */}
            <mesh
                position={[-0.07, 0.48, pose === 'walking' ? 0.06 : 0]}
                rotation={[pose === 'walking' ? -0.12 : 0, 0, 0]}
                material={marbleMat}
                castShadow
            >
                <cylinderGeometry args={[0.05, 0.04, 0.92, 12]} />
            </mesh>

            {/* Right Leg */}
            <mesh
                position={[0.07, 0.48, pose === 'walking' ? -0.06 : 0]}
                rotation={[pose === 'walking' ? 0.12 : 0, 0, 0]}
                material={marbleMat}
                castShadow
            >
                <cylinderGeometry args={[0.05, 0.04, 0.92, 12]} />
            </mesh>

            {/* Left Arm */}
            <mesh
                position={[-0.17, 1.12, pose === 'leaning' ? 0.12 : 0]}
                rotation={[pose === 'leaning' ? 0.4 : 0, 0, pose === 'leaning' ? -0.2 : 0.08]}
                material={marbleMat}
                castShadow
            >
                <cylinderGeometry args={[0.035, 0.03, 0.55, 12]} />
            </mesh>

            {/* Right Arm */}
            <mesh
                position={[0.17, 1.12, 0]}
                rotation={[0, 0, -0.08]}
                material={marbleMat}
                castShadow
            >
                <cylinderGeometry args={[0.035, 0.03, 0.55, 12]} />
            </mesh>
        </group>
    );
};

const HumanFigures = () => {
    // Math parameters matching BoxGeometry4_0_2_4
    const figures = useMemo(() => {
        const scale = 0.1;
        const heightY = 2.5 * scale;
        const depthZ = 5 * scale;
        const gaps = 3 * scale;
        const widthX = 20 * scale;
        const innerRadius = 15 * scale;
        const spiralTurns = 3;
        const totalAngle = spiralTurns * 2 * Math.PI;
        const totalX = (200 - 1) * (depthZ + gaps) + (depthZ + 1.5 * scale);

        // Step indices where people stand/walk
        const stepConfigs = [
            { step: 16, pose: 'walking', offsetRadius: 0.4 },  // Near entrance
            { step: 52, pose: 'leaning', offsetRadius: 0.75 }, // Near handrail, gazing outward
            { step: 98, pose: 'walking', offsetRadius: 0.45 }, // Mid-ascent
            { step: 145, pose: 'walking', offsetRadius: 0.5 }, // High spiral
            { step: 178, pose: 'leaning', offsetRadius: 0.8 }, // Near upper summit
        ];

        return stepConfigs.map(({ step, pose, offsetRadius }) => {
            const startX = step * (depthZ + gaps) + depthZ * 0.5;
            const startY = step * heightY;
            const progress = startX / totalX;
            const angle = progress * totalAngle;

            // Radius along the step tread
            const radius = innerRadius + (widthX * offsetRadius);
            const x = Math.cos(angle) * radius * (gaps / scale);
            const z = Math.sin(angle) * radius * (gaps / scale);
            const stepTopY = startY + heightY - 25;

            // Facing direction along the ascending tangent
            const rotY = -angle + Math.PI / 2 + (pose === 'leaning' ? 0.3 : 0);

            return {
                id: step,
                position: [x, stepTopY, z],
                rotation: [0, rotY, 0],
                pose,
            };
        });
    }, []);

    return (
        <group>
            {figures.map((fig) => (
                <HumanFigureModel
                    key={fig.id}
                    position={fig.position}
                    rotation={fig.rotation}
                    pose={fig.pose}
                    scale={0.9}
                />
            ))}
        </group>
    );
};

export default HumanFigures;
