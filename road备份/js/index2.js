import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Tween, update } from "three/addons/libs/tween.module.js";
import { createRoad, createRoad2, getCornerPosition, createCylinder } from './createRoad.js';
import { createbend } from './createBend.js'

let renderer, scene, camera, orbit, container;

// 自定义绘制变量
let pointsForHelpLines = []; // 存储当前绘制的点位信息
let pointsForHelpState = false; // 当前是否处于自定义绘制模式下
let group = new THREE.Group();
let control;

init();
animate();

function init() {
  container = document.getElementById("container");
  const { offsetWidth, offsetHeight } = container;
  camera = new THREE.PerspectiveCamera(50, offsetWidth / offsetHeight, 1, 2e6);
  camera.name = "Camera";
  camera.position.set(500, 500, 500);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();
  const loader = new THREE.TextureLoader();
  loader.load("assets/img/sceneBg.png", function (texture) {
    scene.background = texture;
  });

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 灯光
  const AmbientLight = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(AmbientLight);
  const HemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.8);
  scene.add(HemisphereLight);

  scene.add(group);

  container.appendChild(renderer.domElement);

  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.addEventListener("change", render);

  control = new TransformControls(camera, container);
  control.setMode("translate");
  scene.add(control);


  control.addEventListener('dragging-changed', (event) => {
    orbit.enabled = !event.value;
    console.log(event.value, orbit.enabled)
  });
  control.enabled = false;

  // 创建地板
  const planeGeo = new THREE.PlaneGeometry(3000, 3000);
  const planeMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color("#86909c"),
    side: THREE.DoubleSide,
  });
  const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
  planeMesh.rotation.x = -Math.PI / 2;
  scene.add(planeMesh);

  const grid = new THREE.GridHelper(3000, 100, 0x444d66, 0x2c3242);
  scene.add(grid);

  container.addEventListener('mousedown', onMouseDown, false);
}
