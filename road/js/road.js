import * as THREE from "three";
import { nanoid } from 'nanoid';
import SimEditor from '../../SimEditor.js';

export default class DoubleTrack {
  constructor(
    container,
    height,
    width,
    depth,
    roadColor,
    radiusTop,
    radiusBottom,
    radiusColor = 0x4d4d4f,
  ) {
    this.container = container;
    this.scene = SimEditor.getInstance().scene;
    this.camera = SimEditor.getInstance().camera;
    this.control = SimEditor.getInstance().control;


    // 配置参数
    this.height = height;
    this.width = width;
    this.depth = depth;
    this.roadColor = roadColor;

    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;
    this.radiusColor = radiusColor;

    // 全局参数
    this.pointsForHelpLines = [];
    this.pointsForHelpState = false;
    this.isOrientedLine = false;
    this.modelToken = '';
    this.selectionBoxList = [];
    this.sceneHelpers = new THREE.Group();

    this.selectModel = null;

    // 控制旋转
    this.vec1 = null;
    // 方向 用于判断鼠标是否在向量的左侧还是右侧，还是中间
    this.mouseDirection = '';

    // 鼠标事件
    this.mouseMoveEvent = null;
    this.mouseDownEvent = null;

    this.init();
  }

  init() {
    this.scene.add(this.sceneHelpers);

    document.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("keyup", (event) => this.onKeyUp(event));

    this.mouseMoveEvent = (e) => this.onMouseDown(e);
    this.mouseDownEvent = (e) => this.mouseMove(e);

    this.container.addEventListener("mousedown", this.mouseMoveEvent, false);
    this.container.addEventListener("mousemove", this.mouseDownEvent, false);
  }

  startDraw(state = true) {
    this.pointsForHelpState = state;
    this.pointsForHelpLines = [];
    this.modelToken = nanoid();
  }

  initDraw(length, width, height, state = true) {
    this.pointsForHelpState = state;
    this.pointsForHelpLines = [];
    this.modelToken = nanoid();

    this.createGroup();

    this.width = width;
    this.height = height;
    this.depth = 3;

    const startPoint = new THREE.Vector3(0, this.height, 0);
    const endPoint = new THREE.Vector3(length, this.height, 0);
    this.pointsForHelpLines.push(startPoint, endPoint);

    const road = this.createRoad(
      this.pointsForHelpLines,
      this.width,
      this.depth
    );
    this.getModelByModelToken(this.modelToken).add(road);
  }

  createGroup() {
    const group = new THREE.Group();
    group.name = `group${this.modelToken}`;
    group.fileData = {
      name: 'group',
      type: 'track',
      modelToken: this.modelToken,
      isCreated: false,
      pointsForHelpLines: [],
    }
    SimEditor.getInstance().addMus(group);
    return group;
  }

  mouseMove(event) {
    event.stopPropagation();
    if (this.pointsForHelpState) {
      const startPoint = this.pointsForHelpLines.at(-1);
      const intersects = this.getCoord(event);

      if (!intersects) return;

      if (startPoint) {
        if (this.vec1) {
          // 创建一个向量表示给定向量的方向
          const vectorDirection = new THREE.Vector3(this.vec1.x, this.vec1.y, this.vec1.z);// 替换成给定向量的方向

          // 创建一个向量表示起点到目标点的向量
          const startPoint2 = new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z); // 替换成起点坐标
          const targetPoint = new THREE.Vector3(intersects.x, intersects.y, intersects.z); // 替换成目标点坐标
          const pointVector = new THREE.Vector3().subVectors(targetPoint, startPoint2);

          // 执行向量叉乘运算
          const crossProduct = new THREE.Vector3();
          crossProduct.crossVectors(vectorDirection, pointVector);

          // 判断坐标点是否在向量的左侧或右侧
          if (crossProduct.y > 0) {
            this.mouseDirection = 'left';
          } else if (crossProduct.y < 0) {
            this.mouseDirection = 'right';
          } else {
            this.mouseDirection = 'middle';
          }
        }
        this.drawLineHelper(startPoint, intersects, 30);
      }
    }
  }

  onMouseDown(e) {
    e.stopPropagation();
    // 清除辅助框
    this.selectModel = null;
    this.clearSelectionBoxList();

    let target = this.getModelByModelToken(this.modelToken);
    if (this.modelToken && target && target.fileData.isCreated) {
      const raycaster = new THREE.Raycaster(); //光线投射，用于确定鼠标点击位置
      let mouse = new THREE.Vector2(); //创建二维平面
      mouse.x = (e.clientX / container.offsetWidth) * 2 - 1;
      mouse.y = -((e.clientY / container.offsetHeight) * 2) + 1;
      //以camera为z坐标，确定所点击物体的3D空间位置
      raycaster.setFromCamera(mouse, this.camera);
      const intersectsObjs = this.scene.children.filter((v) => {
        return v.fileData?.type === 'track';
      });
      const intersects = raycaster.intersectObjects(intersectsObjs, true);
      if (intersects.length) {
        this.showSelectionBox(intersects[0].object.parent);
        this.selectModel = intersects[0].object.parent;
        // this.control.attach(this.getModelByModelToken(this.modelToken));
      } else {
        this.selectModel = null;
      }
    }

    const mouseDownPoint = this.getCoord(e);
    if (!this.pointsForHelpState) return;
    if (!mouseDownPoint) return;
    if (e.button === 0) {
      // 创建线段

      // 把坐标放到坐标数组中
      if (!this.ctrlDown) {
        this.pointsForHelpLines.push(mouseDownPoint);
      }

      const len = this.pointsForHelpLines.length;
      // 圆弧后的直线 坐标修改
      if (this.isOrientedLine && !this.ctrlDown) {
        const lastPoint = this.calcOritLinePoint(this.vec1.clone(), this.pointsForHelpLines[len - 2], mouseDownPoint)
        this.pointsForHelpLines.splice(len - 1, 1, lastPoint)
      }

      // 如果有两个点，则生成线段和墙体
      if (len >= 2) {
        if (!target) {
          target = this.createGroup();
        }
        if (target.fileData.pointsForHelpLines.length === 0) {
          target.fileData.pointsForHelpLines.push({
            type: 'lineRoad',
            mouseDirection: this.mouseDirection,
            point: this.pointsForHelpLines.at(-2),
          });
        }

        // 创建多个圆柱子
        const offset = this.width / 2 - 1;
        this.createCylinders(this.pointsForHelpLines.at(-2), this.pointsForHelpLines.at(-1), offset, target);

        if (this.ctrlDown) {
          const { subRes, nextStartPoint } = this.createBend(
            this.pointsForHelpLines.at(-2),
            this.pointsForHelpLines.at(-1),
            this.width,
            this.mouseDirection === 'right',
            this.vec1
          );
          this.pointsForHelpLines.push(nextStartPoint);
          target.add(subRes);
          this.isOrientedLine = true;

          target.fileData.pointsForHelpLines.push({
            type: 'bendRoad',
            mouseDirection: this.mouseDirection,
            point: this.pointsForHelpLines.at(-1),
          });
        } else {
          const road = this.createRoad(
            this.pointsForHelpLines,
            this.width,
            this.depth
          );

          target.add(road);

          if (this.pointsForHelpLines.length >= 3 && !this.isOrientedLine) {
            const first = [this.pointsForHelpLines.at(-3), this.pointsForHelpLines.at(-2)];
            const second = [this.pointsForHelpLines.at(-2), this.pointsForHelpLines.at(-1)];
            const angleRoad = this.createAngleRoad(first, second, this.width / 2, this.mouseDirection);
            target.add(angleRoad);
          }
          target.fileData.pointsForHelpLines.push({
            type: 'lineRoad',
            mouseDirection: this.mouseDirection,
            point: this.pointsForHelpLines[this.pointsForHelpLines.length - 1],
          });

          this.isOrientedLine = false;
        }
      }
    }

    // 停止
    if (e.button === 2) {
      this.finishMouseDown();
    }
  }

  /**
   * 完成绘制
   */
  finishMouseDown() {
    const group = this.getModelByModelToken(this.modelToken);
    if (group) {
      group.fileData.isCreated = true;
      group.fileData.width = this.width;
      group.fileData.height = this.height;
      group.fileData.depth = this.depth;
      group.fileData.roadColor = this.roadColor;
    }

    this.pointsForHelpState = false;
    this.pointsForHelpLines.splice(0);
    this.isOrientedLine = false;
    // 控制旋转
    this.vec1 = null;
    // 方向 用于判断鼠标是否在向量的左侧还是右侧，还是中间
    this.mouseDirection = '';

    // this.destroyed();

    SimEditor.getInstance().delMus(
      this.scene.children.find((item) => item.name === "pointsForHelpLine")
    );
  }

  updateParameters(width, height, depth, roadColor, radiusTop, radiusBottom) {
    this.height = height;
    this.width = width;
    this.depth = depth;
    this.roadColor = roadColor;

    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;

    this.updateRoadGeometry(roadColor);
  }

  updateRoadGeometry(roadColor) {
    if (this.selectModel) {
      const { modelToken, pointsForHelpLines: arr } = this.selectModel.fileData;
      console.log('arr', JSON.stringify(arr));
      const target = this.getModelByModelToken(modelToken);

      // 移除
      this.selectModel.remove(...this.selectModel.children);

      this.selectModel.children.forEach((child) => {
        if (child.fileData?.type === 'lineRoad') {
          child.material[2].color.setHex(roadColor);
        } else if (['bendRoad', 'angleRoad'].includes(child.fileData?.type)) {
          child.material.color.setHex(roadColor);
        }
      });

      let vec = null;
      for (let i = 1; i < arr.length; i += 1) {
        if (i >= 1) {
          if (arr[i].type === 'lineRoad') {
            const road = this.createRoad([arr[i].point, arr[i - 1].point], this.width, this.depth,);
            target.add(road);
          } else {
            const { subRes, nextStartPoint } = this.createBend(
              arr[i - 2].point,
              arr[i - 1].point,
              this.width,
              arr[i].mouseDirection === 'right',
              vec
            );
            target.add(subRes);
          }
        }

        // 创建多个圆柱子
        const offset = this.width / 2 - 1;
        this.createCylinders(arr[i - 1].point, arr[i].point, offset, target);

        // 生成补角
        if (i >= 2 && arr[i].type === 'lineRoad' && arr[i - 1].type !== 'bendRoad') {
          const first = [arr[i - 2].point, arr[i - 1].point];
          const second = [arr[i - 1].point, arr[i].point];
          const angleRoad = this.createAngleRoad(first, second, this.width / 2, arr[i].mouseDirection);
          target.add(angleRoad);
        }
        // 记录当前向量，给下一次使用
        const { direction } = this.getInfoBytwoPoint(
          arr[i - 1].point,
          arr[i].point
        );
        if (arr[i].type === 'lineRoad') {
          vec = direction;
        } else {
          const verticalVector = this.getVerticalVector(vec);
          const angle = Math.PI / 2;
          if (arr[i].mouseDirection === 'right') {
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              verticalVector,
              angle
            );
            const rotatedVec = verticalVector.clone().applyQuaternion(quaternion); // 绕轴旋转后的向量
            // 给下一次的初始旋转向量赋值
            vec = rotatedVec;
          } else {
            const reverseVerticalVector = verticalVector.clone().negate();
            const angle = Math.PI / 2;
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              reverseVerticalVector,
              angle
            );
            // const v = new THREE.Vector3(1,0,0); // 原始向量
            const rotatedVec = reverseVerticalVector
              .clone()
              .applyQuaternion(quaternion); // 绕轴旋转后的向量
            // 旋转
            vec = rotatedVec;
          }
        }
      }

    }
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

    const { midpoint, distance, direction } = this.getInfoBytwoPoint(
      startPoint,
      endPoint
    );

    // // 创建贴图（纹理）
    // const number = parseInt(distance / 50, 10);
    // const texture = new THREE.TextureLoader().load("assets/img/road.jpg");
    // texture.wrapS = THREE.RepeatWrapping;
    // texture.wrapT = THREE.RepeatWrapping;
    // texture.repeat.set(number, 1); // 调整重复纹理的次数

    // 创建基础几何体的材质，并将贴图分配给map属性
    // const material = new THREE.MeshBasicMaterial({
    //   map: texture,
    //   side: THREE.FrontSide,
    // });
    // 创建材质
    const material = [
      new THREE.MeshBasicMaterial({ color: this.roadColor }), // 正面
      new THREE.MeshBasicMaterial({ color: this.roadColor }), // 背面
      // new THREE.MeshBasicMaterial({ map: texture }), // 顶面
      new THREE.MeshBasicMaterial({ color: this.roadColor }), // 底面
      new THREE.MeshBasicMaterial({ color: this.roadColor }), // 底面
      new THREE.MeshBasicMaterial({ color: this.roadColor }), // 右侧面
      new THREE.MeshBasicMaterial({ color: this.roadColor }), // 左侧面
      // new THREE.MeshBasicMaterial({ color: 0x4D4D4F }) // 左侧面
    ];

    // 创建基础几何体的几何体
    const geometry = new THREE.BoxGeometry(distance, depth, width);

    // 创建基础几何体
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(midpoint);

    // 计算基础几何体的旋转角度
    const angleX = 0;
    const angleY = -Math.atan2(direction.z, direction.x); // 获取 Y 轴上的旋转角度
    const angleZ = Math.sin(direction.y); // 在此示例中，我们将 Z 轴的旋转角度设置为 0

    mesh.rotation.set(angleX, angleY, angleZ);
    mesh.name = '直路';
    mesh.fileData = {
      type: 'lineRoad',
    }

    this.vec1 = direction;
    return mesh;
  }

  getCornerPosition(coord, offset = 14) {
    const [startPoint, endPoint] = coord.slice(-2); // 获取起点和终点坐标
    const { direction } = this.getInfoBytwoPoint(startPoint, endPoint);

    // 计算左偏移点和右偏移点
    const leftOffset = new THREE.Vector3(
      -direction.z,
      0,
      direction.x
    ).multiplyScalar(offset);
    const rightOffset = new THREE.Vector3(
      direction.z,
      0,
      -direction.x
    ).multiplyScalar(offset);

    // 计算四个角的点
    const leftTopPoint = new THREE.Vector3()
      .copy(startPoint)
      .add(leftOffset)
      .add(direction);
    const leftBottomPoint = new THREE.Vector3()
      .copy(endPoint)
      .add(leftOffset)
      .sub(direction);
    const rightTopPoint = new THREE.Vector3()
      .copy(startPoint)
      .add(rightOffset)
      .add(direction);
    const rightBottomPoint = new THREE.Vector3()
      .copy(endPoint)
      .add(rightOffset)
      .sub(direction);

    return { leftTopPoint, leftBottomPoint, rightTopPoint, rightBottomPoint };
  }

  createCylinderMesh(position, radiusTop, radiusBottom, color = 0x4d4d4f) {
    // 创建柱形几何体
    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      position.y,
      32
    );

    // 创建材质
    const material = new THREE.MeshBasicMaterial({ color });

    // 创建柱形
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.name = '柱子';
    cylinder.fileData = {
      type: 'cylinder',
    }

    // 设置柱形的位置
    cylinder.position.set(position.x, position.y / 2, position.z);

    return cylinder;
  }

  // 创建多个圆柱子
  createCylinders(startPoint, endPoint, offset, group) {
    const {
      leftTopPoint,
      leftBottomPoint,
      rightTopPoint,
      rightBottomPoint,
    } = this.getCornerPosition([startPoint, endPoint], offset);

    for (const point of [
      leftTopPoint,
      leftBottomPoint,
      rightTopPoint,
      rightBottomPoint,
    ]) {
      const cylinder = this.createCylinderMesh(point, this.radiusTop, this.radiusBottom, this.radiusColor);
      group.add(cylinder);
    }
  }

  createBend(
    startPoint,
    endPoint,
    r = 20,
    isClockwise = false,
    vec
  ) {
    let { direction, yAxisAngle, verticalVector } = this.getInfoBytwoPoint(
      startPoint,
      endPoint
    );
    if (vec) {
      direction = vec;
      yAxisAngle = this.getInitY(vec);
      verticalVector = this.getVerticalVector(vec);
    }

    const heartShape = new THREE.Shape();
    heartShape.absarc(0, 0, r * 2, 0, Math.PI / 2);
    //内层弧形
    heartShape.absarc(0, 0, r, Math.PI / 2, 0, true);

    const extrudeSettings = { depth: this.depth, bevelEnabled: false };
    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

    // 获取顶点信息
    const vertices = geometry.attributes.position.array;
    // 创建 UV 映射坐标
    const uvs = [];
    for (let i = 0; i < vertices.length; i += 9) {
      // 为每个顶点创建 UV 映射坐标
      uvs.push(0, 0, 1, 1, 1, 1);
    }
    // 设置 UV 属性
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const texture = new THREE.TextureLoader().load("assets/img/road.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1); // 调整重复纹理的次数
    const material = [
      new THREE.MeshBasicMaterial({ color: 0x4d4d4f }), // 正面
      new THREE.MeshBasicMaterial({ color: 0x4d4d4f }), // 背面
      // new THREE.MeshBasicMaterial({ map: texture }), // 顶面
      new THREE.MeshBasicMaterial({ color: this.roadColor }),
      new THREE.MeshBasicMaterial({ color: 0x4d4d4f }), // 底面
      new THREE.MeshBasicMaterial({ color: 0x4d4d4f }), // 右侧面
      new THREE.MeshBasicMaterial({ color: 0x4d4d4f }) // 左侧面
    ];
    const subRes = new THREE.Mesh(geometry, material);
    subRes.name = "弯道";
    subRes.fileData = {
      type: 'bendRoad',
    }

    subRes.material = new THREE.MeshBasicMaterial({ color: this.roadColor });


    let arcPosition;
    // 获取弯道的初始坐标
    const initPosition = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z);
    if (isClockwise) {
      arcPosition = this.getPointByVector(
        initPosition,
        verticalVector,
        (3 / 2) * r
      );
      subRes.rotation.x = -Math.PI / 2;
      // 本来应该转y,旋转后转z
      subRes.rotation.z = -yAxisAngle;
      // 0.5 是挤压厚度的一半
      subRes.position.set(arcPosition.x, arcPosition.y - 1.5, arcPosition.z);
      const angle = Math.PI / 2;
      // 初始边向量  旋转度数 默认  Math.PI /2

      const quaternion = new THREE.Quaternion().setFromAxisAngle(
        verticalVector,
        angle
      );
      // const v = new THREE.Vector3(1,0,0); // 原始向量
      const rotatedVec = verticalVector.clone().applyQuaternion(quaternion); // 绕轴旋转后的向量
      // 给下一次的初始旋转向量赋值
      this.vec1 = rotatedVec;
    } else {
      subRes.rotation.x = Math.PI / 2;
      // 本来应该转y,旋转后转z
      subRes.rotation.z = yAxisAngle;
      const reverseVector = verticalVector.clone().negate();
      arcPosition = this.getPointByVector(
        initPosition,
        reverseVector,
        (3 / 2) * r
      );
      // 0.5 是挤压厚度的一半
      subRes.position.set(arcPosition.x, arcPosition.y + 1.5, arcPosition.z);
      const reverseVerticalVector = verticalVector.clone().negate();
      const angle = Math.PI / 2;
      const quaternion = new THREE.Quaternion().setFromAxisAngle(
        reverseVerticalVector,
        angle
      );
      // const v = new THREE.Vector3(1,0,0); // 原始向量
      const rotatedVec = reverseVerticalVector
        .clone()
        .applyQuaternion(quaternion); // 绕轴旋转后的向量
      // 旋转
      this.vec1 = rotatedVec;
    }

    const nextStartPoint = this.getPointByVector(
      arcPosition,
      direction,
      (3 / 2) * r
    );
    return { subRes, nextStartPoint };
  }

  /**
   * 创建不规则的几何体
   * @param {*} param
   * @returns 
   */
  createCube({ v3, v4, v7, v2, height }, isAdd = true) {
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
    const v0 = new THREE.Vector3(v3.x, isAdd ? v3.y + height : v3.y - height, v3.z);
    const v5 = new THREE.Vector3(v4.x, isAdd ? v4.y + height : v4.y - height, v4.z);
    const v6 = new THREE.Vector3(v7.x, isAdd ? v7.y + height : v7.y - height, v7.z);
    const v1 = new THREE.Vector3(v2.x, isAdd ? v2.y + height : v2.y - height, v2.z);
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

    // 创建 UV 映射坐标
    const uvs = [
      0, 0, 0, 1, 0, 0, 0, 1,  // 此示例为一个面贴图
    ];

    // 设置 UV 属性
    cubeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    // const texture = new THREE.TextureLoader().load("assets/img/road.jpg");

    // const cubeMaterial = new THREE.MeshLambertMaterial({ map: texture });
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: this.roadColor });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.name = '补角';
    cube.fileData = {
      type: 'angleRoad',
    }
    return cube;
  }

  createAngleRoad(first, second, offset, mouseDirection) {
    let mesh;
    const {
      leftTopPoint: first3,
      leftBottomPoint: first4,
      rightTopPoint: first1,
      rightBottomPoint: first2,
    } = this.getCornerPosition(first, offset);
    const {
      leftTopPoint: second3,
      leftBottomPoint: second4,
      rightTopPoint: second1,
      rightBottomPoint: second2,
    } = this.getCornerPosition(second, offset);
    let intersectionPoint;
    if (mouseDirection === 'left') {
      intersectionPoint = this.getIntersection(first3, first4, second4, second3);
      mesh = this.createCube({ v3: second[0], v4: second3, v7: intersectionPoint, v2: first4, height: this.depth }, false);
      mesh.position.y = mesh.position.y + this.depth / 2
    } else {
      intersectionPoint = this.getIntersection(first1, first2, second2, second1);
      mesh = this.createCube({ v3: second[0], v4: second1, v7: intersectionPoint, v2: first2, height: this.depth });
      mesh.position.y = mesh.position.y - this.depth / 2
    }
    return mesh;
  }

  drawLineHelper(startPoint, intersects, radius, color = 0xffff00) {
    let material;
    let geometry;
    if (this.ctrlDown) {
      // Create a new empty path
      const path = new THREE.Path();
      // Move to the starting point
      path.moveTo(0, 0);

      path.absarc(0, 0, radius, 0, Math.PI / 2, false);

      material = new THREE.LineBasicMaterial({ color });
      geometry = new THREE.BufferGeometry().setFromPoints(path.getPoints());
    } else {
      // 定向画直线
      const points = [startPoint, intersects];
      if (this.isOrientedLine) {
        //给箭头设置一个起点(随便给个位置就行)
        // const O = new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z);
        // // 红色箭头表示向量a
        // const arrowA = new THREE.ArrowHelper(vector.clone().normalize(), O, vector.length() * 100, 0xff0000);
        // this.scene.add(arrowA)
        points.splice(1, 1, this.calcOritLinePoint(this.vec1.clone(), startPoint, intersects))
      }
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
      const yAxisAngle = this.getInitY(this.vec1);
      const initPosition = new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z);
      const verticalVector = this.getVerticalVector(this.vec1);
      if (this.mouseDirection === 'right') {

        line.rotation.x = -Math.PI / 2;
        line.rotation.z = -yAxisAngle;
        let arcPosition = this.getPointByVector(
          initPosition,
          verticalVector,
          (3 / 2) * radius
        );
        line.position.set(arcPosition.x, arcPosition.y + 3, arcPosition.z);
      } else if (this.mouseDirection === 'left') {

        line.rotation.x = Math.PI / 2;
        line.rotation.z = yAxisAngle;

        const reverseVector = verticalVector.clone().negate();

        let arcPosition = this.getPointByVector(
          initPosition,
          reverseVector,
          (3 / 2) * radius
        );
        line.position.set(arcPosition.x, arcPosition.y + 3, arcPosition.z);
      }
    }
    line.name = "pointsForHelpLine";
    SimEditor.getInstance().delMus(
      this.scene.children.find((item) => item.name === "pointsForHelpLine")
    );
    line.traverse((child) => {
      child.fileData = {
        type: 'track',
        modelToken: nanoid(),
      };
    });
    SimEditor.getInstance().addMus(line);
  }

  /**
   * @description 两条射线的交点
   * @param {*} vector1Start 
   * @param {*} vector1End 
   * @param {*} vector2Start 
   * @param {*} vector2End 
   */
  getIntersection(vector1Start, vector1End, vector2Start, vector2End) {
    // 创建射线
    const ray = new THREE.Ray(vector1Start, vector1End.clone().sub(vector1Start).normalize());

    // 创建平面
    const plane = new THREE.Plane().setFromCoplanarPoints(vector2Start, vector2End, vector2Start.clone().cross(vector2End));
    // 获取交点
    const intersection = new THREE.Vector3();
    ray.intersectPlane(plane, intersection);

    return intersection;
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
    const verticalVector = new THREE.Vector3().crossVectors(
      direction,
      new THREE.Vector3(0, 1, 0)
    );
    direction.normalize();

    return {
      midpoint,
      direction,
      distance,
      yAxisAngle: angle,
      verticalVector,
    };
  }

  // 获取模型的初始旋转值
  getInitY(direction) {
    const yAxisAngle = Math.atan2(direction.z, direction.x);
    return yAxisAngle;
  }

  // 获取垂直向量
  getVerticalVector(direction) {
    // 垂直向量
    const verticalVector = new THREE.Vector3().crossVectors(
      direction,
      new THREE.Vector3(0, 1, 0)
    );
    direction.normalize();

    return verticalVector;
  }
  // 计算定向点的坐标
  calcOritLinePoint(vector, point, intersects) {
    const pointToVector = intersects.clone().projectOnVector(vector);
    // 计算投影向量的长度，即点到向量的距离
    const distanceToVector = pointToVector.length();

    // 计算新坐标点
    const perpendicularPoint = point.clone().add(vector.clone().multiplyScalar(distanceToVector));
    return perpendicularPoint;
  }

  getCoord(e) {
    const raycaster = new THREE.Raycaster(); //光线投射，用于确定鼠标点击位置
    let mouse = new THREE.Vector2(); //创建二维平面
    mouse.x = (e.clientX / container.offsetWidth) * 2 - 1;
    mouse.y = -((e.clientY / container.offsetHeight) * 2) + 1;
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

  // 显示辅助盒模型
  showSelectionBox(model) {
    const box = new THREE.Box3(); // 辅助包围盒
    const selectionBox = new THREE.BoxHelper();
    selectionBox.material.depthTest = false;
    selectionBox.material.transparent = true;
    selectionBox.visible = true;
    this.sceneHelpers.add(selectionBox);
    this.selectionBoxList.push(selectionBox);
    box.setFromObject(model);
    selectionBox.setFromObject(model);
  }

  getModelByModelToken(modelToken) {
    let model;
    this.scene.children.forEach((obj) => {
      if (obj.fileData?.modelToken === modelToken) {
        model = obj;
      }
    });
    return model;
  }

  // 清空选中框
  clearSelectionBoxList() {
    this.selectionBoxList.forEach((box) => {
      box.visible = false;
      this.sceneHelpers.remove(box);
    });
  };

  // todo 移除监听事件
  destroyed() {
    this.container.removeEventListener("mousedown", this.mouseMoveEvent, false);
    this.container.removeEventListener("mousemove", this.mouseDownEvent, false);
  }
}
