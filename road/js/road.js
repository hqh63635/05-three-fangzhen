import * as THREE from "three";

export class road {
  constructor(container, scene, camera, group, height, width, depth, radiusTop, radiusBottom) {
    this.container = container;
    this.scene = scene;
    this.group = group;
    this.camera = camera;

    this.height = height;
    this.width = width;
    this.depth = depth;

    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;

    this.pointsForHelpState = false;

    this.init();
  }

  init() {

    this.pointsForHelpLines = [];

    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));
    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
  }

  startDraw(state = true) {
    this.pointsForHelpState = state;
  }

  getCoord(e) {
    const raycaster = new THREE.Raycaster();//光线投射，用于确定鼠标点击位置
    let mouse = new THREE.Vector2();//创建二维平面
    mouse.x = e.clientX / container.offsetWidth * 2 - 1;
    mouse.y = -(e.clientY / container.offsetHeight * 2) + 1;
    //以camera为z坐标，确定所点击物体的3D空间位置
    raycaster.setFromCamera(mouse, this.camera);

    // 创建虚拟平面
    const normal = new THREE.Vector3(0, 1, 0);

    const constant = -this.height; // 0 表示平面过原点，可以根据需求调整
    const planeGround = new THREE.Plane(normal, constant);

    // 计算相机到射线的对象，可能有多个对象，返回一个数组，按照相机距离远近排列
    const intersects = raycaster.ray.intersectPlane(
      planeGround,
      new THREE.Vector3(0, 0, 0)
    );

    //选中后进行的操作
    return intersects;
  }

  onMouseDown(e) {
    e.stopPropagation();
    const startPoint = this.getCoord(e);
    if (!this.pointsForHelpState) return;
    if (!startPoint) return;
    if (e.button === 0) {
      // 把坐标放到坐标数组中
      if (!this.ctrlDown) {
        this.pointsForHelpLines.push(startPoint);
      }

      this.container.addEventListener('mousemove', (e) => this.mouseMove(e), false);

      // 如果有两个点，则生成线段和墙体
      if (this.pointsForHelpLines.length >= 2) {
        // 创建线段
        const offset = this.width / 2 - 1;
        const { leftTopPoint, leftBottomPoint, rightTopPoint, rightBottomPoint } = this.getCornerPosition(this.pointsForHelpLines, offset);
        const radiusTop = this.radiusTop;
        const radiusBottom = this.radiusBottom;

        for (const point of [leftTopPoint, leftBottomPoint, rightTopPoint, rightBottomPoint]) {
          const cylinder = this.createCylinder(point, radiusTop, radiusBottom);
          this.group.add(cylinder);
        }

        if (this.ctrlDown) {
          const startPoint = this.pointsForHelpLines[this.pointsForHelpLines.length - 2]; // 起点坐标
          const endPoint = this.pointsForHelpLines[this.pointsForHelpLines.length - 1]; // 终点坐标
          const { subRes, nextStartPoint } = this.createbend(startPoint, endPoint, this.width, 0x9898A5);
          this.pointsForHelpLines.push(nextStartPoint);
          this.group.add(subRes);
        } else {
          const road = this.createRoad(this.pointsForHelpLines, this.width, this.depth);
          this.group.add(road);
        }
      }
    }

    // 停止
    if (e.button === 2) {
      this.pointsForHelpState = false;
      this.pointsForHelpLines.splice(0)
      this.scene.remove(this.scene.children.find((item) => item.name === 'pointsForHelpLine'));
      this.container.removeEventListener('mousemove', (e) => this.mouseMove(e), false);
    }
  }

  mouseMove(event) {
    event.stopPropagation();
    if (this.pointsForHelpState) {
      const startPoint = this.pointsForHelpLines[this.pointsForHelpLines.length - 1];
      const intersects = this.getCoord(event);


      if (!intersects) return;

      if (startPoint) {
        this.drawLineHelper(startPoint, intersects, 30);
      }
    }
  }

  updateParameters(width, height, depth, radiusTop, radiusBottom) {
    this.height = height;
    this.width = width;
    this.depth = depth;

    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;

    this.createRoadGeometry();
  }

  createRoadGeometry() {
    // this.scene.remove(this.roadMesh);
    // this.roadMesh = new THREE.Mesh(newGeometry, newMaterial);
    // this.scene.add(this.roadMesh);
  }

  onKeyDown(event) {
    if (event.ctrlKey) {
      this.ctrlDown = true;
    }
  }

  onKeyUp(event) {
    if (!event.ctrlKey) {
      this.ctrlDown = false;
    }
  }
  createRoad(coord, width = 10, depth = 3) {
    // 两个点的坐标
    const startPoint = coord[coord.length - 2]; // 起点坐标
    const endPoint = coord[coord.length - 1]; // 终点坐标
    console.log('tag', JSON.stringify([startPoint, endPoint]))


    const { midpoint, distance, direction } = this.getInfoBytwoPoint(startPoint, endPoint)

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

    mesh.position.copy(midpoint);

    // 计算基础几何体的旋转角度
    const angleX = 0;
    const angleY = -Math.atan2(direction.z, direction.x); // 获取 Y 轴上的旋转角度
    const angleZ = Math.sin(direction.y); // 在此示例中，我们将 Z 轴的旋转角度设置为 0

    console.log('angleZ', angleZ)
    mesh.rotation.set(angleX, angleY, angleZ);
    return mesh;
  }

  getCornerPosition(coord, offset = 14) {
    console.log(offset)
    // 两个点的坐标
    const startPoint = coord[coord.length - 2]; // 起点坐标
    const endPoint = coord[coord.length - 1]; // 终点坐标
    // 计算从 pointA 到 pointB 的方向向量
    const { direction } = this.getInfoBytwoPoint(startPoint, endPoint);


    // 创建一个新的方向向量，不影响原始方向向量
    const modifiedDirection = direction.clone().multiplyScalar(1);
    // 创建一个新的方向向量，不影响原始方向向量
    const modifiedDirection2 = direction.clone().multiplyScalar(-1);
    // 计算左偏移向量（垂直于direction）
    const leftOffsetVector = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(offset);
    // 计算左偏移点
    const leftTopPoint = new THREE.Vector3().copy(startPoint).add(leftOffsetVector).add(modifiedDirection);
    const leftBottomPoint = new THREE.Vector3().copy(endPoint).add(leftOffsetVector).add(modifiedDirection2);

    // 计算右偏移向量（垂直于direction）
    const rightOffsetVector = new THREE.Vector3(direction.z, 0, -direction.x).multiplyScalar(offset);


    // 计算右偏移点
    const rightTopPoint = new THREE.Vector3().copy(startPoint).add(rightOffsetVector).add(modifiedDirection);
    const rightBottomPoint = new THREE.Vector3().copy(endPoint).add(rightOffsetVector).add(modifiedDirection2);

    return { leftTopPoint, leftBottomPoint, rightTopPoint, rightBottomPoint }
  }

  createCylinder(position, radiusTop, radiusBottom) {
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

  createbend(startPoint, endPoint, r = 20, color = 0x3e3e3e) {
    const { direction, yAxisAngle, verticalVector } = this.getInfoBytwoPoint(startPoint, endPoint)
    const heartShape = new THREE.Shape()
    heartShape.absarc(0, 0, r * 2, 0, Math.PI / 2);
    //内层弧形
    heartShape.absarc(0, 0, r, Math.PI / 2, 0, true);

    const extrudeSettings = { depth: 3, bevelEnabled: false };
    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const subRes = new THREE.Mesh(geometry, material);
    subRes.name = "弯道"
    subRes.rotation.x = -Math.PI / 2
    // 本来应该转y, 旋转后转z
    subRes.rotation.z = -yAxisAngle;
    const initPosition = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z)
    const arcPosition = this.getPointByVector(initPosition, verticalVector, 3 / 2 * r)
    subRes.position.set(arcPosition.x, arcPosition.y - 1.5, arcPosition.z)
    const nextStartPoint = this.getPointByVector(arcPosition, direction, 3 / 2 * r);
    subRes.material.color = new THREE.Color(color);

    return { subRes, nextStartPoint };
  }

  getPointByVector(startPoint, direction, distance) {
    // 标准化向量
    direction.normalize();
    // 计算位移并缩放
    const displacement = direction.clone().multiplyScalar(distance);
    // 计算目标点的坐标
    const endPoint = startPoint.clone().add(displacement);

    return endPoint;
  }

  /**
 * @description 根据两个确定的点，中心点，方向，距离，垂向量
*/
  getInfoBytwoPoint(startPoint, endPoint) {
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
      verticalVector,
    }
  }

  drawLineHelper(startPoint, intersects, radius, color = 0xffff00) {
    let material;
    let geometry, endPoint;
    if (this.ctrlDown) {
      // Create a new empty path
      const path = new THREE.Path();
      // Move to the starting point
      path.moveTo(startPoint.x, startPoint.y);

      endPoint = new THREE.Vector3(startPoint.x + radius, startPoint.y, startPoint.z);
      path.absarc(startPoint.x, startPoint.y, radius, 0, Math.PI / 2, false);

      material = new THREE.LineBasicMaterial({ color });
      geometry = new THREE.BufferGeometry().setFromPoints(path.getPoints());
    } else {
      const points = [startPoint, intersects];
      geometry = new THREE.BufferGeometry().setFromPoints(points);
      material = new THREE.LineDashedMaterial({
        color,
        linewidth: 2,
        scale: 1,
        dashSize: 100,
        gapSize: 300,
      });
    }
    const line = new THREE.Line(geometry, material);
    if (this.ctrlDown) {
      line.rotation.x = -Math.PI / 2;
      line.position.set()
    }
    line.name = 'pointsForHelpLine';
    this.scene.remove(this.scene.children.find((item) => item.name === 'pointsForHelpLine'));
    this.scene.add(line);
  }
}
