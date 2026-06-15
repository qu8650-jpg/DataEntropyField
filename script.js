import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzZwWB9CsqadUAsboqGeq898FYxH50N5K",
  authDomain: "dataentropy-e3b87.firebaseapp.com",
  projectId: "dataentropy-e3b87",
  storageBucket: "dataentropy-e3b87.appspot.com",
  messagingSenderId: "401028674174",
  appId: "1:401028674174:web:411cf5b8f7a6f7b2bele2f",
  measurementId: "G-053MQ1V2LV",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const textRef = ref(db, "particles");

// --- 音訊引擎 ---
const bgm = new Audio("background.mp3");
bgm.loop = true;
const triggerSound = new Audio("trigger.mp3");

function playTriggerSound() {
  triggerSound.currentTime = 0;
  triggerSound.play().catch((e) => console.log("等待使用者互動"));
}

document.getElementById("startAudio").addEventListener("click", (e) => {
  bgm.play();
  e.target.style.display = "none";
});

// --- 場景與互動 ---
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
const allMessages = [];
const rightWall = document.getElementById("right-wall");
const floatingDiv = document.getElementById("floatingText");

// 注入訊息：僅負責顯示，不再觸發音效
function injectMessage(text) {
  const comment = document.createElement("div");
  comment.className = "comment";
  comment.innerText = "> " + text;
  rightWall.prepend(comment);
  requestAnimationFrame(() => {
    comment.style.opacity = 1;
    comment.style.transform = "translateY(0)";
  });
  if (rightWall.children.length > 18)
    rightWall.removeChild(rightWall.lastChild);
}

// 歷史訊息自動循環重播
setInterval(() => {
  if (allMessages.length > 0) {
    const randomMsg =
      allMessages[Math.floor(Math.random() * allMessages.length)];
    injectMessage(randomMsg);
  }
}, 2000);

function createCharTexture(char) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.font = "bold 80px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function spawnFloatingText(text) {
  floatingDiv.innerText = text;
  floatingDiv.style.animation = "slideIn 1.5s forwards";
  floatingDiv.style.opacity = 1;
  setTimeout(() => {
    floatingDiv.style.opacity = 0;
    floatingDiv.style.animation = "none";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createCharTexture(char),
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: 1,
        }),
      );
      sprite.position.set(0, 0, -5);
      scene.add(sprite);
      sprite.userData = {
        velocity: new THREE.Vector3(
          -0.06 - Math.random() * 0.04,
          (Math.random() - 0.5) * 0.02,
          0,
        ),
        isFlying: true,
        isSwirling: false,
        radius: Math.random() * 15 + 3,
        phi: Math.random() * Math.PI * 2,
        theta: Math.acos(2 * Math.random() - 1),
        speed: (0.008 + Math.random() * 0.005) / 3,
        noiseSeed: Math.random() * 100,
        noiseFreq: 0.02 + Math.random() * 0.03,
      };
      sprites.push(sprite);
    }
  }, 2600);
}

// 輸入事件：保留觸發音效
document.getElementById("dataInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.value.trim() !== "") {
    playTriggerSound();
    push(textRef, { text: e.target.value });
    e.target.value = "";
  }
});

onChildAdded(textRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.text) {
    allMessages.push(data.text);
    spawnFloatingText(data.text);
    injectMessage(data.text);
  }
});

camera.position.set(0, 5, 25);
function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;
  for (let i = sprites.length - 1; i >= 0; i--) {
    const p = sprites[i];
    if (!p.userData) continue;
    if (p.userData.isFlying) {
      p.position.add(p.userData.velocity);
      p.material.opacity -= 0.004;
      if (p.position.x < -20 || p.material.opacity <= 0) {
        p.userData.isFlying = false;
        p.userData.isSwirling = true;
        p.material.opacity = 0.5;
        p.userData.phi = Math.atan2(p.position.y, p.position.x);
      }
    } else if (p.userData.isSwirling) {
      p.userData.phi += p.userData.speed;
      const noise =
        Math.sin(time * 3 + p.userData.noiseSeed) * p.userData.noiseFreq * 150;
      p.position.set(
        p.userData.radius *
          Math.sin(p.userData.theta) *
          Math.cos(p.userData.phi + noise * 0.01),
        p.userData.radius *
          Math.sin(p.userData.theta) *
          Math.sin(p.userData.phi + noise * 0.01),
        p.userData.radius * Math.cos(p.userData.theta),
      );
      p.scale.set(0.3, 0.3, 1);
      p.material.opacity =
        0.5 + Math.sin(time * 5 + p.userData.noiseSeed) * 0.3;
    }
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();
