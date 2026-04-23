import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

import { LightProbeGrid } from 'three/addons/lighting/LightProbeGrid.js';
import { LightProbeGridHelper } from 'three/addons/helpers/LightProbeGridHelper.js';

import { EffectComposer, Noise } from '@react-three/postprocessing';

// --- Shared dummy object for matrix updates (avoids per-frame allocation) ---
const _dummy = new THREE.Object3D();

const GlobalIlluminationGrid = ({ resolution = 6, size = 50, showHelper = false, visible = true }) => {
    const { scene, gl } = useThree();
    const gridRef = useRef(null);
    const helperRef = useRef(null);

    useEffect(() => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;

        if (gridRef.current) {
            scene.remove(gridRef.current);
            gridRef.current.dispose();
            gridRef.current = null;
        }
        if (helperRef.current) {
            scene.remove(helperRef.current);
            helperRef.current = null;
        }

        scene.updateMatrixWorld(true);

        const probes = new LightProbeGrid(size, size, size, resolution, resolution, resolution);
        probes.position.set(0, 0, 0);
        probes.updateMatrixWorld(true);
        probes.bake(gl, scene, { cubemapSize: 32, near: 0.05, far: 10 });
        probes.visible = visible;
        scene.add(probes);
        gridRef.current = probes;

        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.needsUpdate = true;
            }
        });

        if (showHelper) {
            const helper = new LightProbeGridHelper(probes);
            scene.add(helper);
            helperRef.current = helper;
        }

        return () => {
            if (gridRef.current) {
                scene.remove(gridRef.current);
                gridRef.current.dispose();
                gridRef.current = null;
            }
            if (helperRef.current) {
                scene.remove(helperRef.current);
                helperRef.current = null;
            }
        };
    }, [scene, gl, resolution, size, showHelper, visible]);

    return null;
};

const BoxGeometry4_0_2_4 = ({
    giEnabled = true,
    showProbes = false,
    resolution = 12,
}) => {
    const lightGroup = useRef(null);
    const polesRef = useRef(null);   // ← InstancedMesh ref for poles

    // --- MATH SETTINGS ---
    const scale = 0.1;
    const stepCount = 200;
    const heightY = 2.5 * scale;
    const depthZ = 5 * scale;
    const gaps = 3 * scale;
    const widthX = 20 * scale;
    const innerRadius = 15 * scale;
    const spiralTurns = 3;
    const totalAngle = spiralTurns * 2 * Math.PI;
    const totalX = (stepCount - 1) * (depthZ + gaps) + (depthZ + 1.5 * scale);

    const POLE_HEIGHT = 1.5;

    // --- 1. LIGHT POSITIONS ---
    const stairLights = useMemo(() => {
        const lights = [];
        const interval = 25;
        for (let i = 0; i < stepCount; i += interval) {
            const startX = i * (depthZ + gaps);
            const startY = i * heightY;
            const progress = startX / totalX;
            const angle = progress * totalAngle;
            const radius = innerRadius + (widthX / 2);
            const x = Math.cos(angle) * radius * (gaps / scale);
            const z = Math.sin(angle) * radius * (gaps / scale);
            const y = startY - 25 + 1.5;
            lights.push({ position: [x, y, z], id: i });
        }
        return lights;
    }, [totalX, totalAngle, innerRadius, widthX, gaps, scale, depthZ, heightY]);

    // --- 2. HANDRAIL CURVE + POLE POSITIONS ---
    const { handrailCurve, polePositions } = useMemo(() => {
        const pts = [];
        const poles = [];
        const railRadius = innerRadius + widthX - (2 * scale);

        for (let i = 0; i < stepCount; i++) {
            const startX = i * (depthZ + gaps);
            const startY = i * heightY;
            const progress = startX / totalX;
            const angle = progress * totalAngle;
            const x = Math.cos(angle) * railRadius * (gaps / scale);
            const z = Math.sin(angle) * railRadius * (gaps / scale);
            const baseStepY = startY - 25;

            pts.push(new THREE.Vector3(x, baseStepY + POLE_HEIGHT, z));

            if (i % 5 === 0) {
                poles.push([x, baseStepY + POLE_HEIGHT / 2, z]);
            }
        }
        return {
            handrailCurve: new THREE.CatmullRomCurve3(pts),
            polePositions: poles,
        };
    }, [totalX, totalAngle, innerRadius, widthX, gaps, scale, depthZ, heightY]);

    // --- 3. STAIR GEOMETRY ---
    const geometry = useMemo(() => {
        const shapes = [];
        const slant = 1.5 * scale;

        for (let i = 0; i < stepCount; i++) {
            const shape = new THREE.Shape();
            const startX = i * (depthZ + gaps);
            const startY = i * heightY;
            shape.moveTo(startX, startY);
            shape.lineTo(startX + depthZ, startY);
            shape.lineTo(startX + depthZ + slant, startY + heightY);
            shape.lineTo(startX - slant, startY + heightY);
            shape.lineTo(startX, startY);
            shapes.push(shape);
        }

        const geo = new THREE.ExtrudeGeometry(shapes, {
            steps: 1,
            depth: widthX,
            bevelEnabled: true,
            bevelSegments: 3,           // ↓ was 10 — big vertex reduction
            bevelSize: 0.25 * scale,
            bevelThickness: 1.0 * scale,
        });

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const progress = pos.getX(i) / totalX;
            const angle = progress * totalAngle;
            const radius = innerRadius + pos.getZ(i);
            pos.setXYZ(
                i,
                Math.cos(angle) * radius * (gaps / scale),
                pos.getY(i),
                Math.sin(angle) * radius * (gaps / scale)
            );
        }
        geo.computeVertexNormals();
        geo.center();
        return geo;
    }, [depthZ, gaps, heightY, innerRadius, scale, totalAngle, totalX, widthX]);

    // --- 4. SET INSTANCED POLE MATRICES (runs once when polePositions changes) ---
    useEffect(() => {
        if (!polesRef.current) return;
        polePositions.forEach(([x, y, z], i) => {
            _dummy.position.set(x, y, z);
            _dummy.updateMatrix();
            polesRef.current.setMatrixAt(i, _dummy.matrix);
        });
        polesRef.current.instanceMatrix.needsUpdate = true;
    }, [polePositions]);

    // --- 5. ANIMATE LIGHTS ---
    useFrame(({ clock }) => {
        const time = clock.elapsedTime;
        const baseIntensity = 15.75;
        const intensityAmp = 5.25;
        const baseDistance = 40.5;
        const distanceAmp = 1.0;

        if (lightGroup.current) {
            lightGroup.current.children.forEach((light, index) => {
                if (light.isPointLight) {
                    light.intensity = baseIntensity + Math.sin(time * 2 + index) * intensityAmp;
                    light.distance = baseDistance + Math.sin(time * 2 + index) * distanceAmp;
                }
            });
        }
    });

    // Shared materials (defined once, not re-created per mesh)
    const metalMat = useMemo(() => (
        <meshStandardMaterial color="#444" roughness={0.4} metalness={0.7} />
    ), []);

    const whiteMat = useMemo(() => (
        <meshStandardMaterial
            color={0xffffff}
            roughness={0.9}
            metalness={0.1}
            side={THREE.DoubleSide}
        />
    ), []);

    return (
        <>
            <ambientLight intensity={0.001} />

            {/* Point Lights */}
            <group ref={lightGroup}>
                {stairLights.map((light) => (
                    <pointLight
                        key={light.id}
                        position={light.position}
                        color="#ffccaa"
                        decay={1}
                        castShadow={false}
                    />
                ))}
            </group>

            <GlobalIlluminationGrid
                resolution={resolution}
                showHelper={showProbes}
                visible={giEnabled}
            />

            {/* Handrail — reduced tube segments */}
            <mesh castShadow>
                <tubeGeometry args={[handrailCurve, 100, 0.05, 6, false]} />
                {/* ↑ tubularSegments: 100 (was stepCount=200), radialSegments: 6 (was 8) */}
                {metalMat}
            </mesh>

            {/* ─────────────────────────────────────────────────────────────────
                INSTANCED MESH FOR POLES
                One draw call for all ~40 poles instead of 40 individual meshes
            ───────────────────────────────────────────────────────────────── */}
            <instancedMesh
                ref={polesRef}
                args={[undefined, undefined, polePositions.length]}
                castShadow
            >
                <cylinderGeometry args={[0.03, 0.03, POLE_HEIGHT, 6]} />
                {/* ↑ radialSegments: 6 (was 8) — slight vertex saving */}
                {metalMat}
            </instancedMesh>

            {/* Stair Mesh */}
            <mesh geometry={geometry} castShadow receiveShadow>
                {whiteMat}
            </mesh>

            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -25, 0]} receiveShadow>
                <circleGeometry args={[25, 48]} />
                {/* ↑ segments: 48 (was 64) */}
                {whiteMat}
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 30, 0]} receiveShadow>
                <circleGeometry args={[25, 48]} />
                {whiteMat}
            </mesh>

            {/* Cylinder Wall — reduced segments */}
            <mesh position={[0, 2.5, 0]} receiveShadow>
                <cylinderGeometry args={[25, 25, 55, 48, 32, true]} />
                {/* ↑ radialSegments: 48, heightSegments: 32 (was 64/64) */}
                {whiteMat}
            </mesh>

            {/* Post-processing */}
            <EffectComposer>
                <Noise opacity={0.9} premultiply />
            </EffectComposer>
        </>
    );
};

export default BoxGeometry4_0_2_4;