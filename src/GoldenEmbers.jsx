import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GoldenEmbers = ({ count = 350 }) => {
    const pointsRef = useRef(null);
    const materialRef = useRef(null);

    const { positions, randomFactors } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const rands = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            // Spread particles across the cylindrical cage volume (radius 18, height -24 to 28)
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 18.0;
            
            pos[i * 3] = Math.cos(angle) * radius;
            pos[i * 3 + 1] = -24.0 + Math.random() * 52.0;
            pos[i * 3 + 2] = Math.sin(angle) * radius;

            rands[i * 3] = Math.random();        // Speed factor
            rands[i * 3 + 1] = Math.random() * Math.PI * 2; // Phase
            rands[i * 3 + 2] = 0.5 + Math.random() * 1.5;   // Scale
        }

        return { positions: pos, randomFactors: rands };
    }, [count]);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aRandom', new THREE.BufferAttribute(randomFactors, 3));
        return geo;
    }, [positions, randomFactors]);

    const material = useMemo(() => {
        const mat = new THREE.PointsMaterial({
            size: 0.16,
            color: 0xffd97d,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uTime;
                 attribute vec3 aRandom;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 // Drift upward slowly and wrap vertically
                 float speed = 0.4 + aRandom.x * 0.6;
                 float yOffset = mod(transformed.y + 24.0 + uTime * speed, 52.0) - 24.0;
                 transformed.y = yOffset;

                 // Gentle lateral sway
                 transformed.x += sin(uTime * 0.8 + aRandom.y) * 0.35;
                 transformed.z += cos(uTime * 0.7 + aRandom.y) * 0.35;

                 gl_PointSize = (1.5 + sin(uTime * 2.0 + aRandom.y) * 0.6) * aRandom.z;
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 // Make particles circular and soft-edged
                 vec2 cxy = 2.0 * gl_PointCoord - 1.0;
                 float dist = length(cxy);
                 if (dist > 1.0) discard;
                 float alphaGlow = smoothstep(1.0, 0.0, dist);
                 diffuseColor.a *= alphaGlow * 0.75;
                `
            );

            materialRef.current = shader;
        };

        return mat;
    }, []);

    useFrame(({ clock }) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = clock.elapsedTime;
        }
    });

    return <points ref={pointsRef} geometry={geometry} material={material} />;
};

export default GoldenEmbers;
