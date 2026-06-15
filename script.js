import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// --- 1. 請在此填入你從 Firebase 複製的設定 ---
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "dataentropy-e3b87.firebaseapp.com",
  projectId: "dataentropy-e3b87",
  storageBucket: "dataentropy-e3b87.appspot.com",
  messagingSenderId: "401028674174",
  appId: "1:401028674174:web:411cf5b8f7a6f7b2bele2f",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const textRef = ref(db, "particles");

// --- 2. 初始化場景 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  85,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new THREE.OrbitControls(camera, renderer.domElement);

const sprites = [];

function createCharTexture(char) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.font = "bold 80px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, 80, 80);
  return new THREE.CanvasTexture(canvas);
}

// --- 3. 粒子生成邏輯 (現在由雲端觸發) ---
function spawnTextParticle(char) {
  const tex = createCharTexture(char);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
    }),
  );

  sprite.userData = {
    radius: Math.random() * 15 + 3,
    phi: Math.random() * Math.PI * 2,
    theta: Math.acos(2 * Math.random() - 1),
    speed: 0.008 + Math.random() * 0.005,
    noiseSeed: Math.random() * 100,
    noiseFreq: 0.02 + Math.random() * 0.03,
  };

  sprite.scale.set(0.2, 0.2, 1);
  scene.add(sprite);
  sprites.push(sprite);
}

// --- 4. 互動邏輯：推送到雲端 ---
const inputField = document.getElementById("dataInput");
inputField.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && inputField.value) {
    const text = inputField.value;
    for (let char of text) {
      push(textRef, { char: char }); // 將文字傳送至雲端
    }
    inputField.value = "";
  }
});

// --- 5. 即時監聽：雲端同步 ---
onChildAdded(textRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.char) {
    spawnTextParticle(data.char);
  }
});

// --- 6. 動畫循環 ---
camera.position.set(0, 5, 25);
function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  sprites.forEach((p) => {
    p.userData.phi += p.userData.speed;
    const noise =
      Math.sin(time * 3 + p.userData.noiseSeed) * p.userData.noiseFreq * 150;

    const r = p.userData.radius;
    const phi = p.userData.phi + noise * 0.01;
    const theta = p.userData.theta + noise * 0.01;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    p.position.set(x, y, z);
    p.material.opacity = 0.5 + Math.sin(time * 5 + p.userData.noiseSeed) * 0.3;
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();
