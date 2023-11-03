import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { road } from "./road.js";

let renderer, scene, camera, orbit, container;

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
  //orbit.minPolarAngle = Math.PI / 2;
  // orbit.maxPolarAngle = Math.PI / 2;
  // orbit.object.position.set(0, 0, 1);
  // orbit.target.set(0, 0, 0);
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

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onWindowResize);

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  renderer.render(scene, camera);
}


const params = {
  height: 10,
  width: 30,
  depth: 3,
  radiusTop: 1,
  radiusBottom: 1,
  createObject: function () {
    // Callback function to create objects or perform actions
    // You can place your object creation code here
    console.log('Create button clicked');
    road1.startDraw();
  }
};
let road1 = new road(
  container,
  scene,
  camera,
  group,
  params.height,
  params.width,
  params.depth,
  params.radiusTop,
  params.radiusBottom,
);

function updateParameters() {
  const { height, width, depth, radiusTop, radiusBottom } = params;
  road1.updateParameters(width, height, depth, radiusTop, radiusBottom);
}

const gui = new GUI();
gui.add(params, 'height', 1, 100).onChange(updateParameters);
gui.add(params, 'width', 10, 100).onChange(updateParameters);
gui.add(params, 'depth', 1, 10).onChange(updateParameters);

const folder1 = gui.addFolder('圆柱');
folder1.add(params, 'radiusTop', 0.5, 20).onChange(updateParameters);
folder1.add(params, 'radiusBottom', 0.5, 20).onChange(updateParameters);

const folder2 = gui.addFolder('启动');
folder2.add(params, 'createObject').name('Create'); // Add the Create button

window.scene = scene;











