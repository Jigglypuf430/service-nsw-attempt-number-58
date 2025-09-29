import React from "react";

// ====== Small pure helpers (DEV-only tests live below) ======
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function mapTiltToTarget(
  gamma: number,
  beta: number,
  sensitivity = 1.6
) {
  // gamma ~ left/right (−90..90), beta ~ front/back (−180..180)
  const x = clamp(50 + (gamma / 90) * 50 * sensitivity, 10, 90);
  const y = clamp(50 + (beta / 90) * 50 * sensitivity, 10, 90);
  return { x, y };
}

// ---- DEV-ONLY micro tests (guarded so they NEVER run in production) ----
try {
  // Avoid import.meta in non-module env; use globalThis to dodge TS Node types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev =
    (typeof window !== "undefined" && (window as any).__DEV__ === true) ||
    ((globalThis as any)?.process?.env?.NODE_ENV !== "production");

  if (isDev) {
    (function devTests() {
      console.assert(clamp(5, 0, 10) === 5, "clamp pass-through");
      console.assert(clamp(-1, 0, 10) === 0, "clamp lower-bound");
      console.assert(clamp(15, 0, 10) === 10, "clamp upper-bound");
      const mid = mapTiltToTarget(0, 0, 1.6);
      console.assert(
        Math.abs(mid.x - 50) < 1e-6 && Math.abs(mid.y - 50) < 1e-6,
        "map tilt center"
      );
      const right = mapTiltToTarget(90, 0, 1.0);
      console.assert(right.x <= 90 && right.x >= 80, "map tilt right in range");
      const up = mapTiltToTarget(0, 90, 1.0);
      console.assert(up.y <= 90 && up.y >= 80, "map tilt up in range");
      const leftDown = mapTiltToTarget(-90, -90, 1.0);
      console.assert(
        leftDown.x >= 10 && leftDown.x <= 20,
        "map tilt left clamped >=10"
      );
      console.assert(
        leftDown.y >= 10 && leftDown.y <= 20,
        "map tilt down clamped >=10"
      );
      console.assert(clamp(7, 7, 7) === 7, "clamp equal bounds");
      console.debug("✅ Dev tests passed");
    })();
  }
} catch {
  /* ignore in prod */
}

// ------- Tiny inline icon components (no external imports) -------
function IconChevronLeft(props: { size?: number; className?: string; color?: string }) {
  const s = props.size ?? 24;
  const color = props.color ?? "#2563eb";
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconMoreVertical(props: { size?: number; className?: string; color?: string }) {
  const s = props.size ?? 24;
  const color = props.color ?? "#9ca3af";
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}
function IconCheckCircle(props: { size?: number; className?: string; color?: string }) {
  const s = props.size ?? 20;
  const color = props.color ?? "#22c55e";
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconInfo(props: { size?: number; className?: string; color?: string }) {
  const s = props.size ?? 16;
  const color = props.color ?? "#cbd5e1";
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// ----------------- Hologram (raw WebGL, no three.js) -----------------
function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh) || "unknown";
    gl.deleteShader(sh);
    throw new Error("Shader compile failed: " + info);
  }
  return sh;
}
function createProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
  const prog = gl.createProgram()!;
  const vsh = compileShader(gl, gl.VERTEX_SHADER, vs);
  const fsh = compileShader(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Program link failed: " + (gl.getProgramInfoLog(prog) || "unknown"));
  }
  gl.deleteShader(vsh);
  gl.deleteShader(fsh);
  return prog;
}

// Component
function DigitalLicence() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const specularRef = React.useRef<HTMLDivElement | null>(null);

  // WebGL refs
  const glRef = React.useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    aPos: number;
    uTilt: WebGLUniformLocation | null;
    uResolution: WebGLUniformLocation | null;
    buffer: WebGLBuffer | null;
  } | null>(null);

  const [permissionGranted, setPermissionGranted] = React.useState(false);
  const [showHint, setShowHint] = React.useState(true);

  // Motion state
  const currentPos = React.useRef({ x: 50, y: 50 });
  const targetPos = React.useRef({ x: 50, y: 50 });
  const isAnimating = React.useRef(false);
  const sensitivity = 1.6;

  // Input handlers
  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (!permissionGranted) return;
    const gamma = event.gamma ?? 0; // x tilt
    const beta = event.beta ?? 0;   // y tilt   <-- fixed typo here
    const next = mapTiltToTarget(gamma, beta, sensitivity);
    targetPos.current.x = next.x;
    targetPos.current.y = next.y;
    startAnimation();
  };
  const handleMouseMove = (ev: any) => {
    if (permissionGranted || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 100;
    const y = ((ev.clientY - r.top) / r.height) * 100;
    targetPos.current.x = clamp(x, 10, 90);
    targetPos.current.y = clamp(y, 10, 90);
    startAnimation();
  };
  const handleMouseLeave = () => {
    if (permissionGranted) return;
    targetPos.current.x = 50;
    targetPos.current.y = 50;
    startAnimation();
  };
  const enableTilt = async () => {
    setShowHint(false);
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === "granted") {
          setPermissionGranted(true);
          window.addEventListener("deviceorientation", handleOrientation, { passive: true });
        }
      } catch {}
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      setPermissionGranted(true);
      window.addEventListener("deviceorientation", handleOrientation, { passive: true });
    }
  };

  // Animation + render
  const renderOnce = () => {
    const state = glRef.current;
    if (!state) return;
    const { gl, program, aPos, uTilt, uResolution } = state;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = containerRef.current?.clientWidth ?? 414;
    const h = containerRef.current?.clientHeight ?? 896;
    const cw = Math.floor(w * dpr),
      ch = Math.floor(h * dpr);

    if (gl.canvas.width !== cw || gl.canvas.height !== ch) {
      gl.canvas.width = cw;
      gl.canvas.height = ch;
      gl.viewport(0, 0, cw, ch);
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tx = currentPos.current.x / 100;
    const ty = currentPos.current.y / 100;
    if (uTilt) gl.uniform2f(uTilt, tx, ty);
    if (uResolution) gl.uniform2f(uResolution, w, h);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const animateLerp = () => {
    const speed = 0.12;
    currentPos.current.x += (targetPos.current.x - currentPos.current.x) * speed;
    currentPos.current.y += (targetPos.current.y - currentPos.current.y) * speed;

    if (specularRef.current) {
      const { x, y } = currentPos.current;
      (specularRef.current as HTMLDivElement).style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.6) 22%, rgba(255,255,255,0.0) 46%)`;
    }

    renderOnce();

    if (
      Math.abs(targetPos.current.x - currentPos.current.x) > 0.01 ||
      Math.abs(targetPos.current.y - currentPos.current.y) > 0.01
    ) {
      requestAnimationFrame(animateLerp);
    } else {
      isAnimating.current = false;
    }
  };
  const startAnimation = () => {
    if (!isAnimating.current) {
      isAnimating.current = true;
      requestAnimationFrame(animateLerp);
    }
  };

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || (navigator as any).maxTouchPoints > 0);

  // WebGL init
  React.useEffect(() => {
    if (!canvasRef.current || glRef.current) return;

    const canvas = canvasRef.current;
    const gl =
      (canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn("WebGL not available; skipping hologram");
      return;
    }

    const vs = `
      attribute vec2 a_position;
      varying vec2 vUv;
      void main(){
        vUv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 u_tilt;
      uniform vec2 u_resolution;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
      }
      mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
      vec3 hsl2rgb(vec3 hsl){ vec3 rgb = clamp(abs(mod(hsl.x*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); return hsl.z + hsl.y*(rgb-0.5)*(1.0-abs(2.0*hsl.z-1.0)); }

      void main(){
        vec2 tilt = (u_tilt - 0.5);
        vec2 uv = vUv + tilt * vec2(0.18, 0.12);
        vec2 asp = vec2(u_resolution.x/u_resolution.y, 1.0);
        vec2 q = uv * asp;

        vec2 nw = q * 3.7; nw *= rot(2.39996323);
        float nA = noise(nw + tilt*0.9);
        float nB = noise(nw*1.9 + vec2(0.73,-1.21));
        q += (vec2(nA,nB)-0.5) * 0.35;

        vec2 c1=vec2(0.23,0.31)+tilt*0.23; vec2 c2=vec2(0.66,0.28)+tilt*0.19; vec2 c3=vec2(0.82,0.64)+tilt*0.21;
        vec2 c4=vec2(0.37,0.74)+tilt*0.17; vec2 c5=vec2(0.12,0.58)+tilt*0.20; vec2 c6=vec2(0.55,0.47)+tilt*0.16;
        float r1=.26,r2=.21,r3=.19,r4=.17,r5=.16,r6=.15;

        float f=0.;
        #define ADD(C,R) f += (R*R)/(dot(q-(C),q-(C))+1e-3);
        ADD(c1,r1) ADD(c2,r2) ADD(c3,r3) ADD(c4,r4) ADD(c5,r5) ADD(c6,r6)
        #undef ADD

        float ang = atan(q.y-0.5,q.x-0.5);
        f += 0.08 * sin(ang*36.0 + (tilt.x-tilt.y)*10.0);

        float hue = fract(f*0.34 + (tilt.x-tilt.y)*0.06);
        float sat = 0.95;
        float lig = 0.55 + 0.20*clamp(f,0.0,1.4);
        vec3 col = hsl2rgb(vec3(hue,sat,lig));

        float edge = smoothstep(0.62,0.98,f);
        col += vec3(1.0) * edge * 0.28;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const program = createProgram(gl, vs, fs);
    const aPos = gl.getAttribLocation(program, "a_position");
    const uTilt = gl.getUniformLocation(program, "u_tilt");
    const uResolution = gl.getUniformLocation(program, "u_resolution");

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    glRef.current = { gl, program, aPos, uTilt, uResolution, buffer };

    const onResize = () => {
      renderOnce();
    };
    window.addEventListener("resize", onResize);
    renderOnce();

    return () => {
      window.removeEventListener("resize", onResize);
      try {
        gl.deleteBuffer(buffer!);
      } catch {}
      try {
        gl.deleteProgram(program!);
      } catch {}
      glRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <style>{`
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; }
        .iphone-11{ width: 414px; height: 896px; border-radius: 36px; overflow: hidden; background: transparent; position: relative; }
        .licence-overscan{ position: relative; }
        .holo-canvas{
          position:absolute; inset:0; width:120%; height:120%; left:-10%; top:-10%; z-index:5; pointer-events:none;
          -webkit-mask-image:url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfe7e4208081a124aa9e75/49e6df419_warratah.png');
          mask-image:url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfe7e4208081a124aa9e75/49e6df419_warratah.png');
          -webkit-mask-size:contain; mask-size:contain; -webkit-mask-position:center; mask-position:center; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
          mix-blend-mode: normal; opacity: 0.6;
        }
        .specular-overlay{
          position:absolute; inset:0; width:120%; height:120%; left:-10%; top:-10%; z-index:6; pointer-events:none;
          mix-blend-mode: overlay;
          -webkit-mask-image:url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfe7e4208081a124aa9e75/49e6df419_warratah.png');
          mask-image:url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfe7e4208081a124aa9e75/49e6df419_warratah.png');
          -webkit-mask-size:contain; mask-size:contain; -webkit-mask-position:center; mask-position:center; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 22%, rgba(255,255,255,0.0) 46%);
          opacity: 0.6;
        }
        .blue-texture { width: 50%; background-image: repeating-radial-gradient(circle at -30% 50%, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px,transparent 1px, transparent 12px), repeating-radial-gradient(circle at 130% 50%, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px,transparent 1px, transparent 12px); background-color: #e0e8f2; }
      `}</style>

      <div className="iphone-11 mx-auto flex flex-col">
        <header className="bg-transparent">
          <div className="flex items-center justify-between px-4 py-3">
            <IconChevronLeft />
            <h1 className="text-md font-semibold text-gray-800">NSW Driver Licence</h1>
            <IconMoreVertical />
          </div>
          <div className="h-1 bg-yellow-300"></div>
        </header>

        <main className="relative flex-1 w-full">
          <div
            className="licence-overscan"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={isTouchDevice ? enableTilt : undefined}
          >
            {/* Hologram layers with Waratah mask covering the card */}
            <canvas ref={canvasRef} className="holo-canvas" />
            <div ref={specularRef} className="specular-overlay" aria-hidden />

            {/* Foreground content */}
            <div className="relative z-30 px-4 pt-2 pb-6">
              <section className="relative flex justify-between items-start h-24">
                <div
                  className="w-16 h-8 bg-contain bg-no-repeat"
                  style={{
                    backgroundImage:
                      "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfe7e4208081a124aa9e75/95e347781_nsw-logo.png')",
                  }}
                ></div>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfe7e4208081a124aa9e75/7b58ec064_trevor-long.png"
                    alt="Portrait"
                    className="w-24 h-auto rounded-lg shadow-md"
                  />
                  <span className="absolute -bottom-2 -right-2 bg-white rounded-full">
                    <IconCheckCircle />
                  </span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Refreshed</p>
                  <p>19 Jun 2019</p>
                  <p>06:34am</p>
                </div>
              </section>

              <section className="text-center mt-4 mb-5">
                <div className="text-center mt-4 mb-5">
                  <h2 className="text-2xl font-semibold text-blue-900">
                    Trevor William <span className="font-bold">LONG</span>
                    </h2>
                    </div>
                    </section>

              <section className="relative rounded-lg overflow-hidden p-3">
                <div className="relative z-10 flex justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500">LICENCE NUMBER</p>
                      <p className="text-sm font-mono tracking-wider" style={{ filter: 'blur(3px)' }}>1234 5678</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500">EXPIRY</p>
                      <p className="text-lg font-bold text-blue-900">13 Jul 2021</p>
                    </div>
                  </div>
                  <div className="flex w-2/5 border-l-2 border-dashed border-gray-400/50 ml-2">
                    <div className="blue-texture w-1/2"></div>
                    <div className="w-1/2 bg-white p-1">
                      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfe7e4208081a124aa9e75/bd3f21820_qr-code.png" alt="QR Code" className="w-full h-full" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-gray-500">DATE OF BIRTH</p>
                  <p className="text-lg font-bold text-blue-900">14 Dec</p>
                </div>
                <div className="flex items-center bg-gray-100 p-3 rounded-lg">
                  <div className="w-1/2">
                    <p className="text-xs font-bold text-gray-500 flex items-center">
                      CLASS <span className="ml-1 inline-block align-middle"><IconInfo /></span>
                    </p>
                    <p className="text-lg font-bold text-blue-900">C</p>
                  </div>
                  <div className="w-1/2">
                    <p className="text-xs font-bold text-gray-500">CONDITIONS</p>
                    <p className="text-lg font-bold text-blue-900">None</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500">ADDRESS</p>
                  <p className="text-blue-900" style={{ filter: 'blur(3px)' }}>
                    123 Fake Street, SYDNEY NSW 2000
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {isTouchDevice && showHint && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm opacity-90 z-50 shadow-lg">
          Tap card to enable tilt effect
        </div>
      )}
    </div>
  );
}

// Preview frame
export default function App() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">React Live Preview</h1>
          <div className="inline-flex items-center gap-2 text-sm text-slate-300">
            <IconInfo />
            <span>Paste your component over the placeholder below.</span>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="p-5 rounded-2xl bg-white/5 shadow-xl">
            <h2 className="text-lg font-medium mb-3">Rendered Component</h2>
            <div className="flex items-center justify-center p-6">
              {/* Your component renders here */}
              <DigitalLicence />
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-white/5 shadow-xl space-y-3">
            <h2 className="text-lg font-medium">Quick Tips</h2>
            <ul className="list-disc pl-5 text-slate-300 text-sm space-y-2">
              <li>
                Keep <code>export default App</code> — replace only the inner component (e.g.,
                <code>DigitalLicence</code>).
              </li>
              <li>
                Need device tilt? Use <code>DeviceMotionEvent</code> or <code>pointermove</code> in your component; the
                frame doesn’t move.
              </li>
              <li>
                To float an overlay above content, render it after the content with a higher <code>z-index</code> (or
                place first with absolute positioning and keep content on a higher <code>z</code> like shown).
              </li>
              <li>If something doesn’t show, open the DevTools Console for runtime errors.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
