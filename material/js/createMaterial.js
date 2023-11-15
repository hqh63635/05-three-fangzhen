import * as THREE from "three";
import { nanoid } from "nanoid";
import { Tween, Easing } from 'three/addons/libs/tween.module.js';

export default class createMaterial {
  constructor(
    model,
    MUType,
    MUList,
    createTime,
    gapTime,
    createNumber,
    onModelCreated,
  ) {

    this.model = model;

    this.MUType = MUType;
    this.MUList = MUList;

    // 全局变量
    this.createTime = createTime; // 创建物料耗费时间
    this.gapTime = gapTime; // 创建间隔时间
    this.createNumber = createNumber; // 创建数量

    this.onModelCreated = onModelCreated; // Store the callback function

    this.loop = null;
    this.modelToken = '';

    this.isWarning = false; // 是否在警告中

    this.taskList = [];
    this.currentIndex = 0; // 索引

    this.init();
    this.initTaskList();
  }

  init() {
    if (this.model.fileData) {
      this.model.fileData.createTime = this.createTime;
      this.model.fileData.gapTime = this.gapTime;
      this.model.fileData.createNumber = this.createNumber;
    } else {
      this.model.fileData = {
        createTime: this.createTime,
        gapTime: this.gapTime,
        createNumber: this.createNumber,
      }
    }
  }

  onUpdate(MUType, MUList, createTime, gapTime, createNumber) {
    this.MUType = MUType;
    this.MUList = MUList;

    this.createTime = createTime; // 创建物料耗费时间
    this.gapTime = gapTime; // 创建间隔时间
    this.createNumber = createNumber; // 创建数量
    this.initTaskList();
  }

  // 初始化生成计划列表
  initTaskList() {
    let matericalModel = ''
    if (this.MUType === '常数') {
      const geometry2 = new THREE.BoxGeometry(50, 50, 40); // 指定立方体的宽度、高度和深度
      // 创建一个基础材质
      const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // 设置立方体的颜色
      // 使用几何体和材质创建网格对象
      const cube = new THREE.Mesh(geometry2, material2);
      matericalModel = cube.clone();
    } else if (this.MUType === '循环序列') {

    } else if (this.MUType === '序列') {
      this.MUList.forEach((rows) => {
        if (rows[0]) {
          this.taskList.push(...Array(rows[1] || 1).fill(rows[0].m));
        }
      });
      console.log('this.taskList', this.taskList)
    } else if (this.MUType === '随机') {

    } else if (this.MUType === '百分比') {

    }
    return matericalModel;
  }

  getMatericalByMUType() {
    const geometry2 = new THREE.BoxGeometry(50, 50, 40); // 指定立方体的宽度、高度和深度

    // 创建一个基础材质
    const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // 设置立方体的颜色

    // 使用几何体和材质创建网格对象
    const cube = new THREE.Mesh(geometry2, material2);
    cube.position.set(0, 25, 0);
    cube.name = 'cube';
    return cube;
  }

  // 创建
  createModelOnce(type) {
    const goodsModel = this.getMatericalByMUType(type);
    if (goodsModel) {
      goodsModel.position.set(0, 90, 0);

      this.modelToken = nanoid();
      goodsModel.fileData = {
        modelToken: this.modelToken,
        type: 'goods',
      };

      this.model.add(goodsModel);

      const obj = { scale: 0.1 };
      const tween = new Tween(obj)
        .to({ scale: 1 }, this.createTime * 1000)
        .easing(Easing.Quadratic.Out)
        .onUpdate(function () {
          goodsModel.scale.set(obj.scale, obj.scale, obj.scale);
        })
        .onComplete(() => {
          // TWEEN.remove(tween);
          if (typeof this.onModelCreated === "function") {
            this.onModelCreated(goodsModel);
          }
        });
      tween.start();
    } else {
      throw new Error(`源出错: ${this.MUList}不是MU`);
    }

  }

  create() {
    if (this.checkHasGood(this.model, this.modelToken)) {
      // 进入等待状态
      this.setWarning();
    } else {
      this.removeWarning()
      this.createModelOnce();
    }
  }

  toInterval(fn, interval = 1000, leading) {
    let timeoutId;

    function loop() {
      clearTimeout(timeoutId);
      fn();
      timeoutId = setTimeout(loop, interval);
    }
    // 启动循环，立即执行一次回调
    if (leading) {
      loop();
    } else {
      timeoutId = setTimeout(loop, interval);
    }
    // 返回用于清除循环的函数
    return {
      stop: () => {
        console.log('111')
        clearTimeout(timeoutId);
      }
    }
  }

  loopCreate() {
    // 遍历model的children，是否存在没有移除的goodModel
    if (this.checkHasGood(this.model, this.modelToken)) {
      // 进入等待状态
      this.setWarning();
    } else {
      this.removeWarning();
      if (this.MUType === '常数') {
        // 创建模型
        this.createModelOnce();
      } else if (this.MUType === '序列') {
        if (this.currentIndex > this.taskList.length) {
          clearTimeout(this.loop);
        }
        // 取出当前索引的元素
        const elementToCreate = this.taskList[this.currentIndex];

        // 创建模型
        this.createModelOnce(elementToCreate);
      }
      this.currentIndex += 1;
      this.createNumber -= 1;
      if (this.createNumber === 0) {
        console.log(this.loop);
        this.loop.stop()
      };
    }
  }

  // 停止
  stop() {
    clearTimeout(this.loop);
  }

  // 批量创建
  batchCreates() {
    this.loop = this.toInterval(() => this.loopCreate(), this.gapTime * 1000, false);
  }

  findChildByName(model, name) {
    let cur = null;
    model.traverse((child) => {
      if (child.name === name) {
        cur = child;
      }
    });
    return cur;
  }
  // 检查模型中是否存在生成的货物模型
  checkHasGood(model, checkModelToken) {
    let goods = null;
    model.traverse((child) => {
      if (child.fileData?.modelToken === checkModelToken) {
        goods = child;
      }
    });
    return goods;
  }

  setWarning() {
    this.isWarning = true;
    this.findChildByName(this.model, '对象011').material.color.set('#FFA500');
  }

  removeWarning() {
    this.isWarning = false;
    this.findChildByName(this.model, '对象011').material.color.set('#ffffff');
  }

  // 获取警告状态
  getWarning() {
    return this.isWarning;
  }
}