import { nanoid } from "nanoid";
import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class MaterialSource {
  constructor(params = {}) {

    this.model = params.model || null;

    // 设置参数的默认值
    this.MUType = params.MUType || '常数';
    this.MUList = params.MUList || [];

    this.createTime = params.createTime || 1000;
    this.gapTime = params.gapTime || 500;
    this.number = params.number || 10;

    this.onModelCreated = params.onModelCreated || (() => { }); // 默认值为一个空函数

    this.loop = null;
    this.modelToken = '';

    this.isWarning = false; // 是否在警告中

    this.taskList = [];
    this.currentIndex = 0; // 索引
    // this.path = 'http://113.57.121.225:3095/fs/models/worker';
    this.path = '../material/models';
    this.modelsMap = {}; // 存储物料的模型

    this.init();
    this.initTaskList();
  }

  init() {
    if (this.model.fileData) {
      this.model.fileData.createTime = this.createTime;
      this.model.fileData.gapTime = this.gapTime;
      this.model.fileData.number = this.number;
    } else {
      this.model.fileData = {
        createTime: this.createTime,
        gapTime: this.gapTime,
        number: this.number,
      }
    }
  }

  update(params = {}) {
    this.MUType = params.MUType;
    this.MUList = params.MUList;

    this.createTime = params.createTime; // 创建物料耗费时间
    this.gapTime = params.gapTime; // 创建间隔时间
    this.number = params.number; // 创建数量

    this.modelsMap = {};

    this.initTaskList();
  }

  // 初始化生成计划列表
  initTaskList() {
    this.taskList = [];
    if (this.MUType === '常数') {

    } else if (this.MUType === '序列' || this.MUType === '循环序列') {
      this.MUList.forEach((rows) => {
        if (rows[0]) {
          this.taskList.push(...Array(rows[1] || 1).fill(rows[0].m));
        }
      });
    } else if (this.MUType === '随机') {
      let probabilitys = this.MUList.filter(v => v[0]).map(item => ({ name: item[0].m, probability: item[1] }))
        .filter(item => typeof item.probability === 'number');
      let totalProbability = probabilitys.reduce((acc, item) => acc + item.probability, 0);
      // 步骤2：计算每个球的相对概率
      this.taskList = probabilitys.map(item => ({
        name: item.name,
        probability: item.probability / totalProbability
      }));
    } else if (this.MUType === '百分比') {
      function getModelAllocation(modelName, data, totalModels) {
        let frequencies = data.filter(v => v[0]).map(item => ({ name: item[0].m, frequency: item[1] }))
          .filter(item => typeof item.frequency === 'number');
        let totalFrequency = frequencies.reduce((acc, item) => acc + item.frequency, 0);

        let allocations = frequencies.map(item => ({
          name: item.name,
          allocation: Math.floor(item.frequency / totalFrequency * totalModels)
        }));

        let allocatedModels = allocations.reduce((acc, item) => acc + item.allocation, 0);
        let remainingModels = totalModels - allocatedModels;

        // 分配剩余的模型
        for (let i = 0; i < remainingModels; i++) {
          allocations[i % allocations.length].allocation++;
        }

        let modelAllocation = allocations.find(item => item.name === modelName);
        return modelAllocation ? modelAllocation.allocation : 0;
      }
      const totalSum = this.MUList.reduce((s, arry) => {
        return typeof arry[1] === 'number' ? s + arry[1] : s;
      }, 0);
      this.MUList.forEach((rows) => {
        if (rows[0]) {
          const num = getModelAllocation(rows[0].m, this.MUList, this.number > 0 ? this.number : totalSum);
          this.taskList.push(...Array(num).fill(rows[0].m));
        }
      });
    }
  }


  // 加载模型
  loadModel(type) {
    return new Promise((resolve) => {
      new GLTFLoader().load(`${this.path}/${type}.gltf`, (gltf) => {
        const model = gltf.scene;
        resolve({
          model,
        })
      });
    });
  }

  // 创建
  async createModelOnce(type) {
    const { model } = this.modelsMap[type] || await this.loadModel(type);

    if (!model) {
      throw new Error(`源出错: ${this.MUList} 不是 MU`);
    }

    const materialModel = model.clone();
    materialModel.position.set(0, 90, 0);

    this.modelToken = nanoid();
    materialModel.fileData = {
      modelToken: this.modelToken,
      type: 'materialModel',
    };

    this.model.add(materialModel);

    const obj = { scale: 0.1 };
    const tween = new TWEEN.Tween(obj)
      .to({ scale: 1 }, this.createTime * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(function () {
        materialModel.scale.set(obj.scale, obj.scale, obj.scale);
      })
      .onComplete(() => {
        if (typeof this.onModelCreated === "function") {
          this.onModelCreated(materialModel);
        }
      });

    tween.start();
  }

  loopCreate() {
    if (this.number === 0) {
      this.stop();
      return;
    }

    // 遍历model的children，是否存在没有移除的goodModel
    if (this.checkHasGood(this.model, this.modelToken)) {
      // 进入等待状态
      this.setWarning();
    } else {
      this.removeWarning();
      switch (this.MUType) {
        case '常数':
          this.createModelByType(this.MUList);
          break;

        case '循环序列':
        case '序列':
        case '百分比':
          this.handleSequentialType();
          break;

        case '随机':
          this.handleRandomType();
          break;

        default:
          // 处理未知类型
          break;
      }

      this.number -= 1;
    }
  }

  createModelByType(modelData) {
    this.createModelOnce(modelData);
  }

  handleSequentialType() {
    if (this.MUType !== '循环序列' && this.currentIndex >= this.taskList.length) {
      this.stop();
      return;
    }

    const elementToCreate = this.taskList[this.currentIndex];
    this.createModelByType(elementToCreate);

    if (this.MUType === '循环序列') {
      this.currentIndex = (this.currentIndex + 1) % this.taskList.length;
    } else {
      this.currentIndex += 1;
    }
  }

  handleRandomType() {
    const selectedBall = this.getRandomElementByProbability(this.taskList);
    this.createModelByType(selectedBall);
  }

  getRandomElementByProbability(elements) {
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    let selectedElement;

    for (const element of elements) {
      cumulativeProbability += element.probability;

      if (randomValue <= cumulativeProbability) {
        selectedElement = element.name;
        break;
      }
    }

    return selectedElement;
  }

  // 停止
  stop() {
    if (this.loop) {
      this.loop.stop();
    }
  }

  // 批量创建
  batchCreates() {
    const toInterval = (fn, interval = 1000, leading) => {
      let timeoutId;
      let isRunning = true;
      function loop() {
        clearTimeout(timeoutId);
        if (!isRunning) return;
        fn();
        timeoutId = setTimeout(loop, interval);
      }
      // 启动循环，立即执行一次回调
      if (leading) {
        loop();
      } else {
        timeoutId = setTimeout(loop, interval);
      }
      return {
        stop: () => {
          isRunning = false; // 设置标记为不运行
        },
      };
    }
    this.loop = toInterval(() => this.loopCreate(), this.gapTime * 1000, true);
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