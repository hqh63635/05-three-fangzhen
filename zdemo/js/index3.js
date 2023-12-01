import * as THREE from "three";

let renderer, scene, camera, container;

// 自定义绘制变量
let pointsForHelpLines = []; // 存储当前绘制的点位信息
let pointsForHelpState = false; // 当前是否处于自定义绘制模式下

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


  container.appendChild(renderer.domElement);

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
  container.addEventListener("mousemove", onMouseMove, false);
}

function onMouseDown(e) {
  e.preventDefault(); // 阻止右键点击的默认行为
  e.stopPropagation();
  const mouseDownPoint = getCoord(e);

  if (e.button === 0) {
    pointsForHelpState = true;
    // 创建线段
    pointsForHelpLines.push(mouseDownPoint);
  }
  if (pointsForHelpLines.length >= 2) {
    const line = createLineByPosition(pointsForHelpLines);
    scene.add(line);
  }
  if (e.button === 2) {
    pointsForHelpState = false;
    scene.remove(
      scene.children.find((item) => item.name === "pointsForHelpLine")
    );
  }
}
function onMouseMove(e) {
  e.stopPropagation();
  if (pointsForHelpState) {
    const startPoint = pointsForHelpLines.at(-1);
    const intersects = getCoord(e);
    drawLineHelper(startPoint, intersects);
  }
}

function getCoord(e) {
  const raycaster = new THREE.Raycaster(); //光线投射，用于确定鼠标点击位置
  let mouse = new THREE.Vector2(); //创建二维平面
  mouse.x = (e.clientX / container.offsetWidth) * 2 - 1;
  mouse.y = -((e.clientY / container.offsetHeight) * 2) + 1;
  //以camera为z坐标，确定所点击物体的3D空间位置
  raycaster.setFromCamera(mouse, camera);

  // 创建虚拟平面
  const normal = new THREE.Vector3(0, 1, 0);
  const constant = -10; // 0 表示平面过原点，可以根据需求调整
  const planeGround = new THREE.Plane(normal, constant);

  // 计算相机到射线的对象，可能有多个对象，返回一个数组，按照相机距离远近排列
  const intersects = raycaster.ray.intersectPlane(
    planeGround,
    new THREE.Vector3(0, 0, 0)
  );
  //选中后进行的操作
  return intersects;
}

function createLineByPosition(coord) {
  const startPoint = coord[coord.length - 2]; // 起点坐标
  const endPoint = coord[coord.length - 1]; // 终点坐标

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]),
    new THREE.LineBasicMaterial({ color: 0x0cc7d8 })
  );
  line.name = 'Line';
  // 将线对象添加到场景
  return line;
}


// 定向画直线
function drawLineHelper(startPoint, intersects) {
  const points = [startPoint, intersects];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0xffff00,
    linewidth: 2,
    scale: 1,
    dashSize: 100,
    gapSize: 300,
  });
  const line = new THREE.Line(geometry, material);
  scene.remove(
    scene.children.find((item) => item.name === "pointsForHelpLine")
  );
  line.name = 'pointsForHelpLine';
  scene.add(line)
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