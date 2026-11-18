import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AcmeScene3D({ activeChallenge = 'HTTP-01', vantagePassed = 7 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 7.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const keyLight = new THREE.PointLight(0x10b981, 2.5, 50);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);

    const originGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const originMat = new THREE.MeshStandardMaterial({
      color: activeChallenge === 'DNS-01' ? 0xa855f7 : activeChallenge === 'TLS-ALPN-01' ? 0x38bdf8 : 0x10b981,
      wireframe: true
    });
    const originMesh = new THREE.Mesh(originGeo, originMat);
    scene.add(originMesh);

    const coreGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x059669, emissiveIntensity: 0.4 });
    scene.add(new THREE.Mesh(coreGeo, coreMat));

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const vpGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const disposables = [originGeo, originMat, coreGeo, coreMat, vpGeo];

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const radius = i === 0 ? 2.4 : 3.2;
      const passed = i < vantagePassed;

      const vpMat = new THREE.MeshStandardMaterial({
        color: passed ? (i === 0 ? 0xfbbf24 : 0x38bdf8) : 0xef4444,
        emissive: passed ? 0x0284c7 : 0x991b1b,
        emissiveIntensity: 0.5
      });
      disposables.push(vpMat);

      const vpMesh = new THREE.Mesh(vpGeo, vpMat);
      vpMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (i % 2 === 0 ? 0.35 : -0.35));
      orbitGroup.add(vpMesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), vpMesh.position.clone()]);
      const lineMat = new THREE.LineBasicMaterial({ color: passed ? 0x10b981 : 0xef4444, transparent: true, opacity: passed ? 0.65 : 0.25 });
      disposables.push(lineGeo, lineMat);
      orbitGroup.add(new THREE.Line(lineGeo, lineMat));
    }

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      originMesh.rotation.y += 0.006;
      originMesh.rotation.x += 0.003;
      orbitGroup.rotation.z -= 0.0035;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeChallenge, vantagePassed]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" data-testid="threejs-canvas-container" />
      <div className="absolute bottom-3 left-3 bg-slate-950/85 border border-slate-800 px-3 py-1.5 rounded text-xs font-mono text-slate-300">
        Challenge: <span className="text-emerald-400 font-semibold">{activeChallenge}</span> | Vantage Quorum: <span className="text-sky-400 font-semibold">{vantagePassed}/7</span>
      </div>
    </div>
  );
}
