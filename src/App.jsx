import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import BoxGeometry4_0_2_4 from "./BoxGeometry4_0_2_4";
import "./App.css";

/* ─── Icon components (inline SVG, no deps) ─────────────────── */
const IconRotate = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
  </svg>
);

const IconEye = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconLight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IconGrid = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconMaximize = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [giEnabled, setGiEnabled] = useState(true);
  const [showProbes, setProbes] = useState(false);
  const [autoRotate, setRotate] = useState(false);
  const cursorRef = useRef(null);
  const cursorRingRef = useRef(null);

  /* Loading shimmer */
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 2600);
    return () => clearTimeout(t);
  }, []);

  /* Custom cursor tracking */
  const onMouseMove = useCallback((e) => {
    const x = e.clientX, y = e.clientY;
    if (cursorRef.current) {
      cursorRef.current.style.left = x + "px";
      cursorRef.current.style.top = y + "px";
    }
    if (cursorRingRef.current) {
      cursorRingRef.current.style.left = x + "px";
      cursorRingRef.current.style.top = y + "px";
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  return (
    <div className="app-root">

      {/* ── Custom cursor ─────────────────────────────────────── */}
      <div ref={cursorRef} className="cursor" />
      <div ref={cursorRingRef} className="cursor-ring" />

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
          camera={{ position: [0, 15, 0], fov: 75 }}
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
          <BoxGeometry4_0_2_4 giEnabled={giEnabled} showProbes={showProbes} />
          <OrbitControls autoRotate={autoRotate} autoRotateSpeed={0.4} enableDamping dampingFactor={0.06} />
        </Canvas>
      </div>

      {/* ── Atmosphere ────────────────────────────────────────── */}
      <div className="grain-overlay" />
      <div className="vignette" />

      {/* ── Corner marks ──────────────────────────────────────── */}
      <div className="corner-mark tl" />
      <div className="corner-mark tr" />
      <div className="corner-mark bl" />
      <div className="corner-mark br" />

      {/* ── UI Layer ──────────────────────────────────────────── */}
      <div className="ui-layer">

        {/* Header */}
        <header className="header">
          <div className="logo-block">
            <span className="logo-title">Spiralis</span>
            <span className="logo-sub">Architectural Visualisation</span>
          </div>

          {/* <nav className="header-nav">
            <button className="nav-item">Gallery</button>
            <button className="nav-item">Materials</button>
            <button className="nav-item">About</button>
          </nav> */}
        </header>

        {/* Title plate */}
        <div className="title-plate">
          <div className="title-eyebrow">No. 04 — Staircase Study</div>
          <h1 className="title-main">
            The<br /><em>Infinite</em><br />Ascent
          </h1>
          <div className="ornament">
            <div className="ornament-line" />
            <div className="ornament-diamond" />
            <div className="ornament-line right" />
          </div>
          <p className="title-descriptor">
            A meditative spiral rendered in warm light &amp; shadow,&nbsp;
            turning endlessly upward.
          </p>
        </div>

        {/* Info panel */}
        <aside className="info-panel">
          <div className="info-panel-inner">
            <div className="info-label">Scene Parameters</div>

            <div className="stat-row">
              <span className="stat-name">Steps</span>
              <span className="stat-value">200</span>
            </div>
            <div className="stat-row">
              <span className="stat-name">Spiral Turns</span>
              <span className="stat-value">3</span>
            </div>
            <div className="stat-row">
              <span className="stat-name">Light Sources</span>
              <span className="stat-value">8 × Warm</span>
            </div>
            <div className="stat-row">
              <span className="stat-name">GI Probes</span>
              <span className="stat-value">{giEnabled ? "Active" : "Inactive"}</span>
            </div>
            <div className="stat-row">
              <span className="stat-name">Post FX</span>
              <span className="stat-value">Film Grain</span>
            </div>
          </div>
        </aside>

        {/* Controls strip */}
        <div className="controls-strip">
          <button
            className={`ctrl-btn${autoRotate ? " active" : ""}`}
            onClick={() => setRotate(v => !v)}
            title="Auto Rotate"
          >
            <IconRotate className="ctrl-icon" />
            <span className="ctrl-label">Rotate</span>
          </button>

          <div className="ctrl-divider" />

          <button
            className={`ctrl-btn${giEnabled ? " active" : ""}`}
            onClick={() => setGiEnabled(v => !v)}
            title="Global Illumination"
          >
            <IconLight className="ctrl-icon" />
            <span className="ctrl-label">GI</span>
          </button>

          <div className="ctrl-divider" />

          <button
            className={`ctrl-btn${showProbes ? " active" : ""}`}
            onClick={() => setProbes(v => !v)}
            title="Show Probes"
          >
            <IconGrid className="ctrl-icon" />
            <span className="ctrl-label">Probes</span>
          </button>

          <div className="ctrl-divider" />

          <button
            className="ctrl-btn"
            onClick={() => document.documentElement.requestFullscreen?.()}
            title="Fullscreen"
          >
            <IconMaximize className="ctrl-icon" />
            <span className="ctrl-label">Full</span>
          </button>
        </div>

        {/* Subtle drag hint */}
        <span className="hint-tag">drag to explore</span>

      </div>
    </div>
  );
}