import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

import { LightProbeGrid } from 'three/addons/lighting/LightProbeGrid.js';
import { LightProbeGridHelper } from 'three/addons/helpers/LightProbeGridHelper.js';

import { EffectComposer, Noise, Bloom } from '@react-three/postprocessing';

const _dummy = new THREE.Object3D();

// DROPPED DEFAULT RESOLUTION TO 3 TO PREVENT BROWSER FREEZING ON BAKE
const GlobalIlluminationGrid = ({ resolution = 12, size = 50, showHelper = false, visible = true }) => {
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
        // This line is extremely heavy. Lowering resolution saves the load time.
        probes.bake(gl, scene, { cubemapSize: 32, near: 0.05, far: 30 });
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

// DROPPED DEFAULT RESOLUTION TO 3
const BoxGeometry4_0_2_4 = ({
    giEnabled = true,
    showProbes = false,
    resolution = 6,
}) => {
    const lightGroup = useRef(null);
    const polesRef = useRef(null);
    const hoverState = useRef({ targetStep: -10, currentStep: -10, isHovered: false, active: 0 });

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

    // --- 3. STAIR GEOMETRY (SOLID BASE) ---
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
            bevelSegments: 3,
            bevelSize: 0.25 * scale,
            bevelThickness: 1.0 * scale,
        });

        const pos = geo.attributes.position;
        const stepIndices = new Float32Array(pos.count);
        const verticesPerStep = pos.count / stepCount;

        for (let i = 0; i < pos.count; i++) {
            const stepIndex = Math.floor(i / verticesPerStep);
            stepIndices[i] = stepIndex;

            const x = pos.getX(i);
            const progress = x / totalX;
            const angle = progress * totalAngle;
            const radius = innerRadius + pos.getZ(i);
            pos.setXYZ(
                i,
                Math.cos(angle) * radius * (gaps / scale),
                pos.getY(i),
                Math.sin(angle) * radius * (gaps / scale)
            );
        }
        geo.setAttribute('aStepIndex', new THREE.BufferAttribute(stepIndices, 1));

        geo.computeVertexNormals();
        geo.center();
        return geo;
    }, [depthZ, gaps, heightY, innerRadius, scale, totalAngle, totalX, widthX]);

    // --- NEW SMARTER IDEA: MATHEMATICAL SAND PARTICLES ---
    const particlesGeometry = useMemo(() => {
        const particlesPerStep = 600; // Increased to 400 so the steps hold their shape when turned to particles
        const totalParticles = stepCount * particlesPerStep;

        const positions = new Float32Array(totalParticles * 3);
        const stepIndices = new Float32Array(totalParticles);

        let idx = 0;
        const slant = 1.5 * scale;

        for (let i = 0; i < stepCount; i++) {
            const startX = i * (depthZ + gaps);
            const topY = (i * heightY) + heightY;
            const minX = startX - slant;
            const maxX = startX + depthZ + slant;

            for (let j = 0; j < particlesPerStep; j++) {
                const x = minX + Math.random() * (maxX - minX);
                const z = Math.random() * widthX;

                const progress = x / totalX;
                const angle = progress * totalAngle;
                const radius = innerRadius + z;

                positions[idx * 3] = Math.cos(angle) * radius * (gaps / scale);
                // Randomize Y slightly so the particles form a block, not just a flat plane
                positions[idx * 3 + 1] = topY - (Math.random() * heightY);
                positions[idx * 3 + 2] = Math.sin(angle) * radius * (gaps / scale);

                stepIndices[idx] = i;
                idx++;
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aStepIndex', new THREE.BufferAttribute(stepIndices, 1));

        geo.computeBoundingSphere();
        geo.computeBoundingBox();

        return geo;
    }, [depthZ, gaps, heightY, innerRadius, scale, stepCount, totalAngle, totalX, widthX]);
    // --- 4. SET INSTANCED POLE MATRICES ---
    useEffect(() => {
        if (!polesRef.current) return;
        polePositions.forEach(([x, y, z], i) => {
            _dummy.position.set(x, y, z);
            _dummy.updateMatrix();
            polesRef.current.setMatrixAt(i, _dummy.matrix);
        });
        polesRef.current.instanceMatrix.needsUpdate = true;
    }, [polePositions]);

    // --- 5. ANIMATE LIGHTS AND HOVER ---
    useFrame(({ clock }, delta) => {
        const time = clock.elapsedTime;
        const baseIntensity = 10.75;
        const intensityAmp = 1.25;
        const baseDistance = 30.5;
        const distanceAmp = 2.0;

        if (lightGroup.current) {
            lightGroup.current.children.forEach((light, index) => {
                if (light.isPointLight) {
                    light.intensity = baseIntensity + Math.sin(time * 2 + index) * intensityAmp;
                    light.distance = baseDistance + Math.sin(time * 2 + index) * distanceAmp;
                }
            });
        }

        const targetActive = hoverState.current.isHovered ? 1 : 0;
        hoverState.current.active = THREE.MathUtils.lerp(hoverState.current.active, targetActive, 10 * delta);
        hoverState.current.currentStep = THREE.MathUtils.lerp(hoverState.current.currentStep, hoverState.current.targetStep, 15 * delta);

        if (stairMat.userData && stairMat.userData.shader) {
            stairMat.userData.shader.uniforms.uHoveredStep.value = hoverState.current.currentStep;
            stairMat.userData.shader.uniforms.uHoverActive.value = hoverState.current.active;
        }

        if (pointsMat.userData && pointsMat.userData.shader) {
            pointsMat.userData.shader.uniforms.uHoveredStep.value = hoverState.current.currentStep;
            pointsMat.userData.shader.uniforms.uHoverActive.value = hoverState.current.active;
        }
    });

    // --- MAIN STAIR MATERIAL ---
    const stairMat = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide,
            transparent: true, // MUST be true so the mesh can vanish
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uHoveredStep = { value: -10.0 };
            shader.uniforms.uHoverActive = { value: 0.0 };

            // FIX: Inject variables after <common> so we don't break WebGL2 version tags
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uHoveredStep;
                 uniform float uHoverActive;
                 attribute float aStepIndex;
                 varying float vStepIndex;`
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vStepIndex = aStepIndex;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uHoveredStep;
                 uniform float uHoverActive;
                 varying float vStepIndex;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 float dist = abs(vStepIndex - uHoveredStep);
                 float highlight = smoothstep(10.0, 0.0, dist) * uHoverActive;
                 
                 // Fade out the solid mesh where the particles take over
                 diffuseColor.a *= (1.0 - highlight);
                `
            );

            mat.userData.shader = shader;
        };
        return mat;
    }, []);
    // --- GLOWING POINTS MATERIAL ---
    const pointsMat = useMemo(() => {
        const mat = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xff0000, // Red
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uHoveredStep = { value: -10.0 };
            shader.uniforms.uHoverActive = { value: 0.0 };

            // FIX: Inject variables after <common> 
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uHoveredStep;
                 uniform float uHoverActive;
                 attribute float aStepIndex;
                 varying float vStepIndex;`
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vStepIndex = aStepIndex;
                 float dist = abs(aStepIndex - uHoveredStep);
                 float highlight = smoothstep(8.0, 0.0, dist) * uHoverActive;
                 
                 if (highlight < 0.01) {
                     // Throw invisible particles off-screen to save GPU
                     transformed = vec3(9999999.0);
                     gl_PointSize = 0.0;
                 } else {
                     gl_PointSize = 2.0 + (2.0 * highlight); 
                 }
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uHoveredStep;
                 uniform float uHoverActive;
                 varying float vStepIndex;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 float dist = abs(vStepIndex - uHoveredStep);
                 float highlight = smoothstep(8.0, 0.0, dist) * uHoverActive;

                 // Make particles circular
                 vec2 cxy = 2.0 * gl_PointCoord - 1.0;
                 if (dot(cxy, cxy) > 1.0) discard;

                 vec3 hoverGlow = vec3(5.0, 0.6, 0.6); // Intense Red color
                 diffuseColor.rgb = hoverGlow;
                 
                 // Particles fade in exactly where solid mesh fades out
                 diffuseColor.a *= highlight;
                `
            );
            mat.userData.shader = shader;
        };
        return mat;
    }, []);

    const metalMat = useMemo(() => (
        <meshStandardMaterial color={0xffffff} roughness={0.4} metalness={0.7} />
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

            <mesh castShadow>
                <tubeGeometry args={[handrailCurve, 100, 0.05, 6, false]} />
                {metalMat}
            </mesh>

            <instancedMesh
                ref={polesRef}
                args={[undefined, undefined, polePositions.length]}
                castShadow
            >
                <cylinderGeometry args={[0.03, 0.03, POLE_HEIGHT, 6]} />
                {metalMat}
            </instancedMesh>

            <mesh
                geometry={geometry}
                material={stairMat}
                castShadow
                receiveShadow
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (e.face) {
                        const stepIndex = geometry.attributes.aStepIndex.getX(e.face.a);
                        hoverState.current.targetStep = stepIndex;
                        hoverState.current.isHovered = true;
                    }
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    hoverState.current.isHovered = false;
                }}
            />

            <points geometry={particlesGeometry} material={pointsMat} position={[0, -25, 0]} renderOrder={1} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -25, 0]} receiveShadow>
                <circleGeometry args={[25, 48]} />
                {whiteMat}
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 30, 0]} receiveShadow>
                <circleGeometry args={[25, 48]} />
                {whiteMat}
            </mesh>

            <mesh position={[0, 2.5, 0]} receiveShadow>
                <cylinderGeometry args={[25, 25, 55, 48, 32, true]} />
                {whiteMat}
            </mesh>

            <EffectComposer>
                <Bloom luminanceThreshold={1.0} luminanceSmoothing={0.5} intensity={3} />
                <Noise opacity={0.9} premultiply />
            </EffectComposer>
        </>
    );
};

export default BoxGeometry4_0_2_4;