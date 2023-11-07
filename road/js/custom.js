
import * as THREE from "three";


const a = { "v3": { "x": 15.949397408706659, "y": 50, "z": 69.42578802917046 }, "v4": { "x": 30.35882711597988, "y": 50, "z": 73.71161764677683 }, "v7": { "x": 23.166406913024503, "y": 50, "z": 93.07394470847362 }, "v2": { "x": 6.388411161818624, "y": 50, "z": 81.02697512303367 } }
export function createCube({ v3, v4, v7, v2, height } = params) {
  // ---------------------------------------------------------------------
  // 创建一个立方体
  // ---------------------------------------------------------------------
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  const v0 = new THREE.Vector3(v3.x, v3.y + height, v3.z);
  const v5 = new THREE.Vector3(v4.x, v4.y + height, v4.z);
  const v6 = new THREE.Vector3(v7.x, v7.y + height, v7.z);
  const v1 = new THREE.Vector3(v2.x, v2.y + height, v2.z);
  // 创建立方体的顶点
  const vertices = [
    v0, // v0
    v1, // v1
    v2, // v2
    v3, // v3
    v4, // v4
    v5, // v5
    v6, // v6
    v7 // v7
  ];

  const cubeGeometry = new THREE.BufferGeometry();
  const verticesArray = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    verticesArray[i * 3] = vertices[i].x;
    verticesArray[i * 3 + 1] = vertices[i].y;
    verticesArray[i * 3 + 2] = vertices[i].z;
  }
  cubeGeometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));

  // // 创建 UV 映射坐标
  // const uvs = [
  //   0, 0, 0, 1, 0, 0, 0, 1,  // 此示例为一个面贴图
  // ];

  // // 设置 UV 属性
  // cubeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  // 创建立方的面
  const indices = [
    0, 1, 2, 0, 2, 3, // front
    0, 3, 4, 0, 4, 5, // right
    1, 6, 7, 1, 7, 2, // left
    6, 5, 4, 6, 4, 7, // back
    5, 6, 1, 5, 1, 0, // top
    3, 2, 7, 3, 7, 4 // bottom
  ];
  cubeGeometry.setIndex(indices);

  // 生成法向量
  cubeGeometry.computeVertexNormals();

  const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0x9B9BA5 });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.name = '补角';
  return cube;
}

