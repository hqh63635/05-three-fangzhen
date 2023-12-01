import * as THREE from "three";
import { CSG } from 'three-csg-ts';

// 创建圆弧
const createArc = (r = 20, color = 0x3e3e3e) => {
  const radius = r * 2; // 扇形半径
  const startAngle = 0; // 起始角度（弧度）
  const endAngle = Math.PI / 2; // 终止角度（弧度）
  const segmentCount = 128; // 扇形细分段数

  const angleStep = (endAngle - startAngle) / segmentCount;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= segmentCount; i++) {
    const angle = startAngle + i * angleStep;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    shape.lineTo(x, y);
  }

  // 使用自定义形状生成几何体
  const extrudeSettings = {
    depth: 3, // 几何体深度（厚度）
    bevelEnabled: false // 禁用斜角效果
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // 创建材质
  const material = new THREE.MeshBasicMaterial({ color });

  // 创建网格对象并添加到场景中
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'arc'
  return mesh;
}

const createbend = (startPoint, endPoint, r = 20, color = 0x3e3e3e) => {
  const { direction, yAxisAngle, verticalVector } = getInfoBytwoPoint(startPoint, endPoint)

  // const arc1 = createArc(r)
  // const arc2 = createArc(r / 2)

  // arc1.updateMatrix();
  // arc2.updateMatrix();

  //const subRes = CSG.subtract(arc1, arc2);
  //subRes.name = "弯道"

  //subRes.rotation.x = -Math.PI / 2
  // 本来应该转y,旋转后转z
  //subRes.rotation.z = -yAxisAngle


  // 获取弯道的初始坐标
  // const initPosition = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z)
  // const arcPosition = getPointByVector(initPosition, verticalVector, 3 / 2 * r)
  // subRes.position.set(arcPosition.x, arcPosition.y - 1.5, arcPosition.z)


  // const nextStartPoint = getPointByVector(arcPosition, direction, 3 / 2 * r);
  // subRes.material.color = new THREE.Color(color);

  const heartShape = new THREE.Shape()
  heartShape.absarc(0, 0, 30 * 2, 0, Math.PI / 2);
  //内层弧形
  heartShape.absarc(0, 0, 30, Math.PI / 2, 0, true);

  const extrudeSettings = { depth: 5, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const subRes = new THREE.Mesh(geometry, material);
  subRes.name = "弯道"
  subRes.rotation.x = -Math.PI / 2
  // 本来应该转y, 旋转后转z
  subRes.rotation.z = -yAxisAngle;
  const initPosition = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z)
  const arcPosition = getPointByVector(initPosition, verticalVector, 3 / 2 * r)
  subRes.position.set(arcPosition.x, arcPosition.y - 1.5, arcPosition.z)
  const nextStartPoint = getPointByVector(arcPosition, direction, 3 / 2 * r);
  subRes.material.color = new THREE.Color(color);

  return { subRes, nextStartPoint };
}


/**
 * @description 根据两个确定的点，中心点，方向，距离，垂向量
*/
const getInfoBytwoPoint = (startPoint, endPoint) => {
  // 计算方向和中心点
  const midpoint = new THREE.Vector3();
  midpoint.addVectors(startPoint, endPoint).multiplyScalar(0.5);
  // 计算两点之间的方向
  const direction = new THREE.Vector3();
  direction.subVectors(endPoint, startPoint);
  direction.normalize();
  // 计算两点的距离
  const distance = startPoint.distanceTo(endPoint);
  // 计算基础几何体的旋转角度
  const angle = Math.atan2(direction.z, direction.x);
  // 垂直向量
  const verticalVector = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
  direction.normalize();

  return {
    midpoint,
    direction,
    distance,
    yAxisAngle: angle,
    verticalVector
  }
}




const getPointByVector = (startPoint, direction, distance) => {
  // 标准化向量
  direction.normalize();
  // 计算位移并缩放
  const displacement = direction.clone().multiplyScalar(distance);
  // 计算目标点的坐标
  const endPoint = startPoint.clone().add(displacement);

  return endPoint
}

/**
* @description 根据路面的终点,方向向量,垂向量,路宽(半径)，计算出下一个点的位置
*/
const getArcPoint = (point, direction, verticalVector, r) => {
  // 获取弯道的初始坐标
  const initPosition = new THREE.Vector3(point.x, point.y, point.z)
  const arcPosition = getPointByVector(initPosition, verticalVector, 3 / 2 * r)
  const nextStartPoint = getPointByVector(arcPosition, direction, 3 / 2 * r);
  return nextStartPoint
}


export { createbend }