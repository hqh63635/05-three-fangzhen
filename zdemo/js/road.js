import * as THREE from "three";
import { createRoad2, getCornerPosition, createCylinder } from './createRoad.js';
import { createbend } from './createBend.js'

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
        const offset = this.width / 2 - 1
        const { leftPoint1, leftPoint2, rightPoint1, rightPoint2 } = getCornerPosition(this.pointsForHelpLines, offset);
        const cy1 = createCylinder(leftPoint1, this.radiusTop, this.radiusBottom);
        this.group.add(cy1);
        const cy2 = createCylinder(leftPoint2, this.radiusTop, this.radiusBottom);
        this.group.add(cy2);
        const cy3 = createCylinder(rightPoint1, this.radiusTop, this.radiusBottom);
        this.group.add(cy3);
        const cy4 = createCylinder(rightPoint2, this.radiusTop, this.radiusBottom);
        this.group.add(cy4);


        if (this.ctrlDown) {
          const startPoint = this.pointsForHelpLines[this.pointsForHelpLines.length - 2]; // 起点坐标
          const endPoint = this.pointsForHelpLines[this.pointsForHelpLines.length - 1]; // 终点坐标
          const { subRes, nextStartPoint } = createbend(startPoint, endPoint, this.width, 0x9898A5);
          this.pointsForHelpLines.push(nextStartPoint);
          this.group.add(subRes);
        } else {
          const road = createRoad2(this.pointsForHelpLines, this.width, this.depth);
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
        line.name = 'pointsForHelpLine';
        this.scene.remove(this.scene.children.find((item) => item.name === 'pointsForHelpLine'));
        this.scene.add(line);
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
}
