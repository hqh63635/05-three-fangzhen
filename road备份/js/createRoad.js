import * as THREE from "three";

function createRoadGeometry(startPoint, endPoint, width) {
  // 计算道路的方向
  const direction = new THREE.Vector3();
  direction.subVectors(endPoint, startPoint).normalize();

  const roadGeometry = new THREE.BufferGeometry();

  const roadWidth = width / 2;
  const roadLength = startPoint.distanceTo(endPoint);

  // 创建道路的四个顶点
  const halfWidth = roadWidth / 2;
  const vertices = [
    new THREE.Vector3(-halfWidth, 0, 0),
    new THREE.Vector3(halfWidth, 0, 0),
    new THREE.Vector3(halfWidth, 0, roadLength),
    new THREE.Vector3(-halfWidth, 0, roadLength),
  ];

  // 将顶点根据道路的方向和位置进行旋转和平移
  const matrix = new THREE.Matrix4();
  matrix.makeRotationFromEuler(new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0));
  matrix.setPosition(startPoint);

  for (let i = 0; i < vertices.length; i++) {
    vertices[i].applyMatrix4(matrix);
  }

  const positions = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    vertex.toArray(positions, i * 3);
  }

  const indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
  ]);

  roadGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  roadGeometry.setIndex(new THREE.BufferAttribute(indices, 1));

  roadGeometry.computeVertexNormals();

  return roadGeometry;
}

function createRoad(coord, width = 10) {
  // 创建道路的几何体
  const startPoint = coord[coord.length - 2]; // 起点坐标
  const endPoint = coord[coord.length - 1]; // 终点坐标
  const roadWidth = width; // 道路的宽度

  const roadGeometry = createRoadGeometry(startPoint, endPoint, roadWidth);

  // 创建材质
  const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });

  // 创建道路的网格
  const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);

  return roadMesh;
}



function createRoad2(coord, width = 10, depth = 3) {
  // 两个点的坐标
  const startPoint = coord[coord.length - 2]; // 起点坐标
  const endPoint = coord[coord.length - 1]; // 终点坐标
  console.log('tag', JSON.stringify([startPoint, endPoint]))

  // 计算两点之间的距离
  const distance = startPoint.distanceTo(endPoint);

  console.log('distance', distance);
  const number = parseInt(distance / 50, 10)
  // 创建贴图（纹理）
  const texture = new THREE.TextureLoader().load("assets/img/road.jpg");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(number, 1); // 调整重复纹理的次数

  // 创建基础几何体的材质，并将贴图分配给map属性
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });

  // 创建基础几何体的几何体
  const geometry = new THREE.BoxGeometry(distance, depth, width);

  // 创建基础几何体
  const mesh = new THREE.Mesh(geometry, material);

  // 设置基础几何体的位置为两点的中点
  const midpoint = new THREE.Vector3();
  midpoint.addVectors(startPoint, endPoint).multiplyScalar(0.5);
  mesh.position.copy(midpoint);

  // 计算两点之间的方向
  const direction = new THREE.Vector3();
  direction.subVectors(endPoint, startPoint);
  direction.normalize();

  // 计算基础几何体的旋转角度
  const angleX = 0;
  const angleY = -Math.atan2(direction.z, direction.x); // 获取 Y 轴上的旋转角度
  const angleZ = Math.sin(direction.y); // 在此示例中，我们将 Z 轴的旋转角度设置为 0

  console.log('angleZ', angleZ)
  mesh.rotation.set(angleX, angleY, angleZ);
  return mesh;

}

function getCornerPosition(coord, offset = 14) {
  console.log(offset)
  // 两个点的坐标
  const startPoint = coord[coord.length - 2]; // 起点坐标
  const endPoint = coord[coord.length - 1]; // 终点坐标
  // 计算从 pointA 到 pointB 的方向向量
  const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  // 创建一个新的方向向量，不影响原始方向向量
  const modifiedDirection = direction.clone().multiplyScalar(1);
  // 创建一个新的方向向量，不影响原始方向向量
  const modifiedDirection2 = direction.clone().multiplyScalar(-1);
  // 计算左偏移向量（垂直于direction）
  const leftOffsetVector = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(offset);
  // 计算左偏移点
  const leftPoint1 = new THREE.Vector3().copy(startPoint).add(leftOffsetVector).add(modifiedDirection);
  const leftPoint2 = new THREE.Vector3().copy(endPoint).add(leftOffsetVector).add(modifiedDirection2);

  // 计算右偏移向量（垂直于direction）
  const rightOffsetVector = new THREE.Vector3(direction.z, 0, -direction.x).multiplyScalar(offset);


  // 计算右偏移点
  const rightPoint1 = new THREE.Vector3().copy(startPoint).add(rightOffsetVector).add(modifiedDirection);
  const rightPoint2 = new THREE.Vector3().copy(endPoint).add(rightOffsetVector).add(modifiedDirection2);

  return { leftPoint1, leftPoint2, rightPoint1, rightPoint2 }
}

function createCylinder(position, radiusTop, radiusBottom) {
  // 创建柱形几何体
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, position.y, 32);

  // 创建材质
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // 创建柱形
  const cylinder = new THREE.Mesh(geometry, material);

  // 设置柱形的位置
  cylinder.position.set(position.x, position.y / 2, position.z);

  return cylinder;
}



export { createRoad, createRoad2, createCylinder, getCornerPosition };