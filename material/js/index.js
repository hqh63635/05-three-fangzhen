import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DDSLoader } from 'three/addons/loaders/DDSLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import createMaterial from "./MaterialSource.js";
import MaterialTermination from "./MaterialTermination.js";
import WorkStation from "./workStation.js";
import ParallelStation from "./ParallelStation.js";
import SimEditor from '../../SimEditor.js';


let renderer, scene, camera, orbit, container;

let control;

const originModels = {};

init();
animate();

function init() {
  container = document.getElementById("container");
  const { offsetWidth, offsetHeight } = container;
  camera = new THREE.PerspectiveCamera(50, offsetWidth / offsetHeight, 1, 2e6);
  camera.name = "Camera";
  camera.position.set(800, 800, 800);
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
  const HemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.1);
  scene.add(HemisphereLight);

  container.appendChild(renderer.domElement);

  orbit = new OrbitControls(camera, renderer.domElement);
  //orbit.minPolarAngle = Math.PI / 2;
  // orbit.maxPolarAngle = Math.PI / 2;
  // orbit.object.position.set(0, 0, 1);
  // orbit.target.set(0, 0, 0);
  orbit.addEventListener("change", render);

  control = new TransformControls(camera, renderer.domElement);
  control.setMode("translate");
  scene.add(control);

  control.addEventListener('dragging-changed', (event) => {
    orbit.enabled = !event.value;
  });

  // 创建地板
  const planeGeo = new THREE.PlaneGeometry(3000, 3000);
  const planeMaterial = new THREE.MeshLambertMaterial({
    color: 0x86909c,
    side: THREE.DoubleSide,
  });
  const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
  planeMesh.rotation.x = -Math.PI / 2;
  planeMesh.name = 'planeMesh'
  scene.add(planeMesh);

  const grid = new THREE.GridHelper(3000, 100, 0x444d66, 0x2c3242);
  grid.name = 'grid';
  scene.add(grid);

  SimEditor.getInstance().setParams(scene, camera, control);


  const models = ['yuan', 'wuliaozhongjie', 'huanchongqu'];
  loadForGltf(models, '../material/models/').then((res) => {
    scene.add(res.model['yuan']);
    originModels['yuan'] = res.model['yuan'];
    res.model['yuan'].position.set(100, 0, 100);
    res.model['yuan'].fileData = {
      modelType: 'Material',
      type: 'start',
      createTime: 11,
      gapTime: 5,
      MUType: '常数',
    };

    scene.add(res.model['wuliaozhongjie']);
    originModels['wuliaozhongjie'] = res.model['wuliaozhongjie'];
    res.model['wuliaozhongjie'].position.set(-600, 0, -500);

    scene.add(res.model['huanchongqu']);
    originModels['huanchongqu'] = res.model['huanchongqu'];
    res.model['huanchongqu'].position.set(300, 0, -500);


    const parallelStation = originModels['huanchongqu'].clone();

    parallelStation.name = 'bingxinggongwei';
    parallelStation.position.set(-600, 0, 300);
    originModels['parallelStation'] = parallelStation;
    scene.add(parallelStation)

    materialGenerate();
  });

  container.addEventListener("mousedown", onMouseDown, false);
}



// 创建立方体的几何体
const geometry2 = new THREE.BoxGeometry(50, 50, 40); // 指定立方体的宽度、高度和深度

// 创建一个基础材质
const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // 设置立方体的颜色

// 使用几何体和材质创建网格对象
const cube = new THREE.Mesh(geometry2, material2);
cube.position.set(0, 25, 0);
cube.name = 'cube';
// 将网格对象添加到场景
// scene.add(cube);

const group = new THREE.Group();
scene.add(group);

let mg = '';
let de = '';
let wk = '';
let ps = '';

const params = {
  model: null,
  MUType: '常数',
  MU: '物料/wuliao',
  createTime: 1,
  gapTime: 2,
  createNumber: 10,
}

const wuliaozhongjie = {
  model: null,
  dealTime: 10,
  setupTime: 5,
}

async function onModelCreated(model) {
  // group.add(model);
  // const current = group.children[0];
  // if (!current) return;
  const target = await wk.add(model);
  const tween2 = new TWEEN.Tween(target.obj.position)
    .to({ x: -500, y: 50, z: -500 }, 2000) // Duration in milliseconds
    .easing(TWEEN.Easing.Quadratic.InOut) // Easing function
    .onUpdate(() => {

    })
    .onComplete(async () => {
      const a = await ps.add(target.obj);
      // console.log('de', de.getWorldPosition())
      console.log('aaa', a);

      const b = await de.destroyed(target.obj);
    });
  tween2.start();
}

function materialGenerate() {
  // 销毁方法实例
  wuliaozhongjie.model = originModels['wuliaozhongjie']; // 
  de = new MaterialTermination(
    wuliaozhongjie
  );
  // 生成器方法实例
  params.model = originModels['yuan']; // 生成器实例
  mg = new createMaterial(
    params,
  );

  wk = new WorkStation({
    model: originModels['huanchongqu'],
  });


  ps = new ParallelStation({
    model: originModels['parallelStation'],
    row: 2,
    col: 2,
  });
}

function updateParameters(option) {
  console.log('updateParameters', option);
  mg.update(option);
}

function updateDe(option) {
  de.update(option);
}

let gui;
function changeGui(model) {
  let folder;
  if (model.fileData.type === 'start') {
    if (gui) gui.destroy();
    gui = new GUI();
    gui.add(params, 'createTime', 0, 100).onChange((value) => updateParameters({ createTime: value }));
    gui.add(params, 'gapTime', 0, 100).onChange((value) => updateParameters({ gapTime: value }));
    gui.add(params, 'createNumber', -1, 100).onChange((value) => updateParameters({ createNumber: value }));

    const options = {
      常数: '常数',
      循环序列: '循环序列',
      序列: '序列',
      随机: '随机',
      百分比: '百分比',
    };
    const selector = gui.add(options, 'selected', Object.keys(options)).name('Select Option').onChange((value) => {
      params.MUType = value;
      updateParameters(params);
    });

    selector.setValue(params.MUType);

    folder = gui.addFolder('Methods');
    // folder.add({
    //   create: function () {
    //     mg.create();
    //   },
    // }, 'create').name('create');
    folder.add({
      stop: function () {
        // 在按钮被点击时执行的逻辑
        console.log('Button Clicked!');
        mg.stop();
      },
    }, 'stop').name('stop');
    folder.add({
      batchCreates: function () {
        // 在按钮被点击时执行的逻辑
        console.log('batchCreates');
        mg.batchCreates(onModelCreated);
      },
    }, 'batchCreates').name('batchCreates');
  } else {
    if (gui) gui.destroy();
    gui = new GUI();
    gui.add(wuliaozhongjie, 'dealTime', 1, 100).onChange((value) => updateDe({ dealTime: value }));
    gui.add(wuliaozhongjie, 'setupTime', 0, 100).onChange((value) => updateDe({ setupTime: value }));
  }
}
window.scene = scene;






//#region =================================== 通用方法 ======
function onMouseDown(e) {
  e.stopPropagation();
  const raycaster = new THREE.Raycaster(); //光线投射，用于确定鼠标点击位置
  let mouse = new THREE.Vector2(); //创建二维平面
  mouse.x = (e.clientX / container.offsetWidth) * 2 - 1;
  mouse.y = -((e.clientY / container.offsetHeight) * 2) + 1;
  //以camera为z坐标，确定所点击物体的3D空间位置
  raycaster.setFromCamera(mouse, camera);
  const intersectsObjs = scene.children.filter((v) => {
    return v.fileData?.modelType === "Material";
  });
  const intersects = raycaster.intersectObjects(intersectsObjs, true);
  if (intersects.length) {
    console.log(intersects[0].object.position);
    // 切换面板  
    const model = findTarget(intersects[0].object);
    changeGui(model);
  } else {

  }
}

function findTarget(obj) {
  // if (obj?.parent && obj.parent === scene) {
  //   return obj;
  // }

  if (obj?.parent && obj.parent.type === 'Scene') {
    return obj;
  }

  return findTarget(obj.parent);
}

function loadForGltf(models, path) {
  return new Promise(resolve => {
    const modelMap = {};
    const manager = new THREE.LoadingManager(loadModel);
    manager.addHandler(/\.dds$/i, new DDSLoader());

    // 模型加载完毕
    function loadModel() {
      resolve({
        state: true,
        model: modelMap,
      });
    }

    for (let index = 0; index < models.length; index++) {
      new GLTFLoader(manager).setPath(path).load(`${models[index]}.gltf`, function (gltf) {
        gltf.scene.name = models[index];
        modelMap[models[index]] = gltf.scene;
      });
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onWindowResize);

function animate() {
  requestAnimationFrame(animate);

  TWEEN.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}

//#endregion ========================================


