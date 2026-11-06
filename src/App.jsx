import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import BoxGeometry4_0_2_4 from "./BoxGeometry4_0_2_4";
import CameraController from "./CameraController";
import "./App.css";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const wideOverlayRef = useRef(null);

  /* Loading fade */
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleWideProgress = useCallback((factor) => {
    if (!wideOverlayRef.current) return;
    if (factor < 0.01) {
      wideOverlayRef.current.style.opacity = "0";
      wideOverlayRef.current.style.pointerEvents = "none";
      wideOverlayRef.current.style.transform = "scale(0.97) translateY(16px)";
    } else {
      wideOverlayRef.current.style.opacity = factor.toFixed(3);
      wideOverlayRef.current.style.pointerEvents = factor > 0.5 ? "auto" : "none";
      const yOffset = (1.0 - factor) * 16;
      const scale = 0.97 + factor * 0.03;
      wideOverlayRef.current.style.transform = `scale(${scale.toFixed(3)}) translateY(${yOffset.toFixed(1)}px)`;
    }
  }, []);

  return (
    <div className="app-root">
      {/* ── Loading screen ────────────────────────────────────── */}
      <div className={`loading-screen${loaded ? " hidden" : ""}`}>
        <div className="loading-glyph">Rendering Scene</div>
        <div className="loading-title">SPIRALIS</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" />
        </div>
      </div>

      {/* ── Three.js Canvas ───────────────────────────────────── */}
      <div className="canvas-wrapper">
        <Canvas
          camera={{ position: [12.8, -22, 0], fov: 65, near: 0.1, far: 200 }}
          shadows
          dpr={[1, 2]}
          flat
          gl={{
            stencil: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
          style={{ width: "100%", height: "100vh" }}
        >
          {/* Active GI Probe with Global Illumination */}
          <BoxGeometry4_0_2_4 giEnabled={true} showProbes={false} />
          {/* Smooth Camera Climbing & Transition Controller */}
          <CameraController isCinematic={true} onWideProgress={handleWideProgress} />
        </Canvas>
      </div>

      {/* ── Wide View Editorial Portfolio UI ─────────────────── */}
      <div ref={wideOverlayRef} className="wideview-overlay" style={{ opacity: 0 }}>
        {/* Top Framing Bar */}
        <div className="wideview-header">
          <div className="wideview-plus-track">
            <span className="plus-sym">+</span>
            <span className="plus-sym">+</span>
            <span className="plus-sym">+</span>
            <span className="plus-sym">+</span>
            <span className="plus-sym">+</span>
          </div>
          <div className="wideview-clip-badge">
            <span className="badge-live-dot" />
            <span>PANORAMIC ROTUNDA PERSPECTIVE</span>
          </div>
          <div className="wideview-coords">
            <span>LAT 45.18°N</span>
            <span className="coord-sep">/</span>
            <span>LONG 09.24°E</span>
            <span className="coord-sep">/</span>
            <span>ELEV +16.5M</span>
          </div>
        </div>

        {/* Hero Title Block */}
        <div className="wideview-hero">
          <div className="wideview-hero-tag">
            <span className="tag-bracket">[</span>
            <span>03 // GRAND ATRIUM PERSPECTIVE</span>
            <span className="tag-bracket">]</span>
            <span className="hero-tag-pluses">+ + + + +</span>
          </div>

          <h1 className="wideview-title">
            <span className="title-line-1">SPIRAL 3D</span>
            <span className="title-line-2">PORTFOLIO</span>
          </h1>

          <div className="wideview-clip-ribbon">
            <div className="clip-ribbon-tag">
              <span>PROCEDURAL THREE.JS ARCHITECTURE</span>
            </div>
            <div className="ribbon-line" />
            <span className="ribbon-plus">+</span>
          </div>
        </div>

        {/* 3 Modular Feature Cards with Clip Path */}
        <div className="wideview-grid">
          <div className="wideview-card clip-chamfer-tl">
            <div className="card-top">
              <span className="card-num">+ 01</span>
              <span className="card-cat">GEOMETRY</span>
            </div>
            <h3 className="card-heading">Infinite Spiral</h3>
            <p className="card-body">
              200 mathematical steps extruded with Catmull-Rom balustrades and instanced stands.
            </p>
            <div className="card-plus-row">+ + + +</div>
          </div>

          <div className="wideview-card clip-chamfer-tr">
            <div className="card-top">
              <span className="card-num">+ 02</span>
              <span className="card-cat">ATMOSPHERE</span>
            </div>
            <h3 className="card-heading">Origami Flocks</h3>
            <p className="card-body">
              36 aerodynamic origami birds flanking the stairs with 350 floating golden dust embers.
            </p>
            <div className="card-plus-row">+ + + +</div>
          </div>

          <div className="wideview-card clip-chamfer-br">
            <div className="card-top">
              <span className="card-num">+ 03</span>
              <span className="card-cat">PHYSICS</span>
            </div>
            <h3 className="card-heading">Damped Motion</h3>
            <p className="card-body">
              Seamless spring damping physics bridging 90% ascent into a grand panoramic orbit.
            </p>
            <div className="card-plus-row">+ + + +</div>
          </div>
        </div>

        {/* Bottom Grid Bar */}
        <div className="wideview-footer">
          <div className="footer-scroll-prompt">
            <span className="scroll-pulse-plus">+</span>
            <span>CONTINUE SCROLLING TO DESCEND</span>
          </div>
          <div className="footer-plus-matrix">+ + + + + + + + +</div>
          <div className="footer-edition">VOL. 04 // 2026 EDITION</div>
        </div>
      </div>

      {/* ── Atmosphere Overlays ───────────────────────────────── */}
      <div className="grain-overlay" />
      <div className="vignette" />
    </div>
  );
}