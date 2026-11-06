import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const _dummy = new THREE.Object3D();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();

const _climbPos = new THREE.Vector3();
const _climbTarget = new THREE.Vector3();
const _widePos = new THREE.Vector3();
const _wideTarget = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _finalTarget = new THREE.Vector3();

// Create sleek origami low-poly bird geometry
function createBirdGeometry() {
    const geo = new THREE.BufferGeometry();

    const positions = new Float32Array([
        // Body (Beak -> Chest -> Tail -> Back)
        0, 0, 0.46,       // 0: Beak
        0, -0.06, 0.10,   // 1: Chest
        0, 0.04, -0.40,   // 2: Tail
        0, 0.06, 0.10,    // 3: Back

        // Left Wing
        0.88, 0, -0.07,   // 4: Left Wing Tip
        0.38, 0.02, 0.12, // 5: Left Wing Joint

        // Right Wing
        -0.88, 0, -0.07,  // 6: Right Wing Tip
        -0.38, 0.02, 0.12,// 7: Right Wing Joint
    ]);

    const indices = [
        0, 1, 3,
        1, 2, 3,
        3, 5, 0,
        3, 4, 5,
        3, 2, 4,
        3, 0, 7,
        3, 7, 6,
        3, 6, 2,
        1, 0, 5,
        1, 5, 4,
        1, 4, 2,
        1, 7, 0,
        1, 6, 7,
        1, 2, 6,
    ];

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

const BirdsFlock = ({ count = 26 }) => {
    const { camera } = useThree();
    const meshRef = useRef(null);
    const materialRef = useRef(null);

    const birdGeo = useMemo(() => createBirdGeometry(), []);

    // Custom shader material with smooth GPU wing flapping
    const birdMaterial = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({
            color: 0xfff6ec,       // Pearlescent warm ivory
            roughness: 0.28,
            metalness: 0.35,
            side: THREE.DoubleSide,
            flatShading: true,
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uTime;
                 attribute float aPhase;
                 attribute float aFlapSpeed;
                 attribute float aScale;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 transformed *= aScale;

                 // Sinusoidal wing flapping
                 float flap = sin(uTime * aFlapSpeed + aPhase);
                 float wingDist = abs(transformed.x);
                 
                 transformed.y += flap * wingDist * 0.5;
                 transformed.z += abs(flap) * wingDist * 0.12;
                `
            );

            materialRef.current = shader;
        };

        return mat;
    }, []);

    // Staircase parameters matching BoxGeometry4_0_2_4
    const spiralTurns = 3;
    const totalAngle = spiralTurns * 2 * Math.PI;

    // Split flock into two distinct wings: Left side of stairs and Right side of stairs
    const { birdsConfig, phases, flapSpeeds, scales } = useMemo(() => {
        const configs = [];
        const ph = new Float32Array(count);
        const sp = new Float32Array(count);
        const sc = new Float32Array(count);

        const wingCount = Math.floor(count / 2);

        for (let i = 0; i < count; i++) {
            const isRightSide = (i % 2 === 0);
            const sideSign = isRightSide ? 1.0 : -1.0;
            const rank = Math.floor(i / 2);

            // Medium (0.55 -> 0.65) to Small (0.30 -> 0.42) sizes
            const isMedium = (rank % 2 === 0);
            const scaleVal = isMedium
                ? 0.52 + (rank % 3) * 0.06  // Medium
                : 0.30 + (rank % 3) * 0.04; // Small

            const flapRate = isMedium
                ? 8.5 + (rank % 3) * 1.0
                : 12.5 + (rank % 3) * 1.5;

            // Lead distance ahead of camera along the stairs (3% to 20% ahead)
            const leadFraction = 0.035 + (rank / wingCount) * 0.16 - 0.1;

            configs.push({
                index: i,
                isRightSide,
                sideSign,
                rank,
                leadFraction,
                // Stair climbing offsets:
                // Right side (outer handrail): radius ~ 10.3
                // Left side (inner void): radius ~ 4.6
                climbRadius: isRightSide ? 10.3 : 4.6,
                climbRadiusJitter: 0.4 + (rank % 3) * 0.2,
                climbHeightOffset: (rank % 4) * 0.35,
                // Wide view offsets:
                // Left/Right side of camera view frame
                wideSideDist: sideSign * (3.6 + (rank % 3) * 0.5),
                wideAheadDist: 5.2 + (rank % 4) * 0.7,
                wideHeightOffset: -0.4 + (rank / wingCount) * 1.6,
                phase: (i / count) * Math.PI * 2,
            });

            ph[i] = (i / count) * Math.PI * 2;
            sp[i] = flapRate;
            sc[i] = scaleVal;
        }

        return { birdsConfig: configs, phases: ph, flapSpeeds: sp, scales: sc };
    }, [count]);

    // Attach custom vertex attributes
    useMemo(() => {
        birdGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
        birdGeo.setAttribute('aFlapSpeed', new THREE.InstancedBufferAttribute(flapSpeeds, 1));
        birdGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    }, [birdGeo, phases, flapSpeeds, scales]);

    useFrame(({ clock }) => {
        const time = clock.elapsedTime;

        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = time;
        }

        if (!meshRef.current) return;

        // Camera frame basis
        camera.getWorldDirection(_camForward);
        _camRight.crossVectors(_camForward, camera.up).normalize();
        _camUp.crossVectors(_camRight, _camForward).normalize();

        const camPos = camera.position;

        // Compute camera progress along the spiral climb [0.0 -> 1.0]
        const camProgress = THREE.MathUtils.clamp((camPos.y + 24.0) / 48.0, 0.0, 1.0);

        // Transition factor into Wide View based on camera pull-back radius:
        // In climb phase, camRadius ≈ 12.8 (factor = 0). In wide phase, camRadius ≈ 19.5 (factor = 1).
        const camRadius = Math.sqrt(camPos.x * camPos.x + camPos.z * camPos.z);
        const wideFactor = THREE.MathUtils.smoothstep(camRadius, 14.0, 18.5);

        birdsConfig.forEach((cfg, i) => {
            // 1. STAIRCASE FLANK FORMATION (Climbing Phase - Ahead of Camera)
            const progressRaw = (camProgress + cfg.leadFraction) % 1.0;
            const progress = (progressRaw + 1.0) % 1.0;

            const angle = progress * totalAngle;
            const baseStairY = -24.0 + progress * 48.0;

            // Radius near the stair flanks (outer handrail vs inner edge)
            const rClimb = cfg.climbRadius + Math.sin(time * 2.0 + cfg.phase) * cfg.climbRadiusJitter;
            const yClimb = baseStairY + 1.2 + cfg.climbHeightOffset + Math.sin(time * 2.5 + cfg.phase) * 0.35;

            _climbPos.set(
                Math.cos(angle) * rClimb,
                yClimb,
                Math.sin(angle) * rClimb
            );

            // Tangent direction leading up the spiral
            const nextAngle = angle + 0.08;
            _climbTarget.set(
                Math.cos(nextAngle) * rClimb,
                yClimb + 0.15,
                Math.sin(nextAngle) * rClimb
            );

            // 2. WIDE VIEW FORMATION (Flanking Left & Right, Facing Each Other)
            const sideSway = Math.sin(time * 1.5 + cfg.phase) * 0.25;
            const vertBob = Math.cos(time * 1.8 + cfg.phase) * 0.3;

            _widePos.copy(camPos)
                .addScaledVector(_camForward, cfg.wideAheadDist)
                .addScaledVector(_camRight, cfg.wideSideDist + sideSway)
                .addScaledVector(_camUp, cfg.wideHeightOffset + vertBob);

            // Facing the opposite side across the camera view frame
            _wideTarget.copy(camPos)
                .addScaledVector(_camForward, cfg.wideAheadDist)
                .addScaledVector(_camRight, -cfg.wideSideDist)
                .addScaledVector(_camUp, cfg.wideHeightOffset);

            // 3. SEAMLESS INTERPOLATION BETWEEN FORMATIONS
            _finalPos.lerpVectors(_climbPos, _widePos, wideFactor);
            _finalTarget.lerpVectors(_climbTarget, _wideTarget, wideFactor);

            _dummy.position.copy(_finalPos);
            _dummy.lookAt(_finalTarget);

            // Aerodynamic banking: in climb phase banks into the spiral, in wide phase stays upright/tilted towards center
            const climbBank = cfg.isRightSide ? -0.35 : 0.30;
            const wideBank = cfg.isRightSide ? -0.12 : 0.12;
            const currentBank = THREE.MathUtils.lerp(climbBank, wideBank, wideFactor);

            _dummy.rotateZ(currentBank);
            _dummy.updateMatrix();

            meshRef.current.setMatrixAt(i, _dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[birdGeo, birdMaterial, count]}
            castShadow
            frustumCulled={false}
        />
    );
};

export default BirdsFlock;
