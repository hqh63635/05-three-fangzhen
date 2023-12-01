import { nanoid } from "nanoid";
import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { useFsStore } from '@/store';

export default class MaterialSource {
  constructor(params = {}) {
    this.model = params.model || null;

    // 设置参数的默认值
    this.MUType = params.MUType || '常数';
    this.MU = params.MU || ''; // 模型名称或者数据表
    this.datasheetToken = params.datasheetToken || '';
    this.isGenerateAsBatch = params.isGenerateAsBatch || false; // 是否批次生成

    this.createTime = params.createTime || 1;
    this.gapTime = parseInt(params.gapTime) || 5;
    this.createNumber = parseInt(params.createNumber) || 10;

    this.loop = null;
    this.modelToken = '';

    this.isWarning = false; // 是否在警告中

    this.taskList = []; // 任务队列
    this.currentIndex = 0; // 索引
    this.path = 'http://113.57.121.225:3095/fs/models';

    this.modelsMap = {}; // 存储物料模型，避免多次请求
    this.materialNameMap = {}; // 模型的名称

    this.init();
    this.initTaskList();
  }

  init() {
    if (this.model.fileData) {
      this.model.fileData.createTime = this.createTime;
      this.model.fileData.gapTime = this.gapTime;
      this.model.fileData.createNumber = this.createNumber;
      this.model.fileData.MUType = this.MUType;
      this.model.fileData.MU = this.MU; // 常数时需要的模型名称
      this.model.fileData.datasheetToken = this.datasheetToken;
      this.model.fileData.isGenerateAsBatch = this.isGenerateAsBatch; // 批次生成
    } else {
      this.model.fileData = {
        createTime: this.createTime,
        gapTime: this.gapTime,
        createNumber: this.createNumber,
        MUType: this.MUType,
        MU: this.MU,
        datasheetToken: this.datasheetToken,
        isGenerateAsBatch: this.isGenerateAsBatch,
      };
    }
  }

  update(option = {}) {
    const updateKeys = [
      'MUType',
      'MU',
      'datasheetToken',
      'isGenerateAsBatch',
      'createTime',
      'gapTime',
      'createNumber',
    ];
    Object.keys(option).forEach((key) => {
      if (updateKeys.includes(key)) {
        this[key] = option[key];
      }
    });
    this.init();
  }

  // 初始化生成计划列表
  initTaskList() {
    this.taskList = [];
    // 当MUType不是常数时，需要根据表（MU）拿到对应的数据,
    // 根据数据表名称或者modelToken从store中获取
    let MUList = [];
    // const fsStore = useFsStore();
    if (this.MUType !== '常数') {
      MUList = [
        [
          { r: 0, c: 0, v: 'MU' },
          { r: 0, c: 1, v: '数量' },
          { r: 0, c: 2, v: '名称' },
          { r: 0, c: 3, v: '属性' },
        ],
        [
          { r: 1, c: 0, v: '小车1/小车1' },
          { r: 1, c: 1, v: '2' },
        ],
        [
          { r: 2, c: 0, v: '小车2/小车2' },
          { r: 2, c: 1, v: '3' },
        ],
      ];
      // if (!this.model.fileData.datasheetToken) {
      //   console.warn('未配置相关数据表');
      //   return;
      // }
      // const modelTagetData = fsStore.simSceneInfo.modelList.find(
      //   (n) => n.modelToken === this.model.fileData.datasheetToken
      // );
      // if (modelTagetData?.data) {
      //   MUList.push(...modelTagetData.data);
      // }
    }
    if (this.MUType === '序列' || this.MUType === '循环序列') {
      MUList.forEach((rows) => {
        if (rows[0]?.v && rows[0]?.r) {
          this.taskList.push(...Array(parseInt(rows[1].v || 1)).fill(rows[0].v));
        }
      });
    } else if (this.MUType === '随机') {
      const probabilitys = MUList.filter((rows) => rows[0]?.v && rows[0]?.r).map((item) => ({
        name: item[0].v,
        probability: parseInt(item[1].v),
      }));
      const totalProbability = probabilitys.reduce((acc, item) => acc + item.probability, 0);
      // 步骤2：计算每个球的相对概率
      this.taskList = probabilitys.map((item) => ({
        name: item.name,
        probability: item.probability / totalProbability,
      }));
    } else if (this.MUType === '百分比') {
      const getModelAllocation = (modelName, data, totalModels) => {
        const frequencies = data
          .filter((rows) => rows[0]?.v && rows[0]?.r)
          .map((item) => ({ name: item[0].v, frequency: parseInt(item[1].v) }));
        const totalFrequency = frequencies.reduce((acc, item) => acc + item.frequency, 0);

        const allocations = frequencies.map((item) => ({
          name: item.name,
          allocation: Math.floor((item.frequency / totalFrequency) * totalModels),
        }));

        const allocatedModels = allocations.reduce((acc, item) => acc + item.allocation, 0);
        const remainingModels = totalModels - allocatedModels;

        // 分配剩余的模型
        for (let i = 0; i < remainingModels; i++) {
          allocations[i % allocations.length].allocation++;
        }

        const modelAllocation = allocations.find((item) => item.name === modelName);
        return modelAllocation ? modelAllocation.allocation : 0;
      };
      const totalSum = MUList.reduce((s, arry) => {
        return typeof arry[1] === 'number' ? s + arry[1] : s;
      }, 0);
      MUList.forEach((rows) => {
        if (rows[0]) {
          const num = getModelAllocation(
            rows[0].v,
            MUList,
            this.createNumber > 0 ? this.createNumber : totalSum
          );
          this.taskList.push(...Array(num).fill(rows[0].v));
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
        });
      });
    });
  }

  // 创建
  async createModelOnce(type, cb) {
    if (!type) {
      console.warn(`源出错,源为空`);
    }

    const { model } = this.modelsMap[type] || (await this.loadModel(type));

    if (!model) {
      throw new Error(`源出错: ${this.MU} 不是 MU`);
    }

    if (!this.modelsMap[type]) {
      this.modelsMap[type] = { model: model.clone() };
    }
    const materialModel = model.clone();
    materialModel.position.set(0, 90, 0);

    // 生成物料名称
    if (this.materialNameMap[type]) {
      this.materialNameMap[type] += 1;
    } else {
      this.materialNameMap[type] = 1
    }
    const materialName = `${type}:${this.materialNameMap[type]}`;

    this.modelToken = nanoid();
    materialModel.fileData = {
      modelToken: this.modelToken,
      type: 'materialModel',
      MUName: type,
      name: materialName,
    };
    this.model.add(materialModel);

    const obj = { scale: 0.1 };
    const tween = new TWEEN.Tween(obj)
      .to({ scale: 80 }, (this.createTime || 0.3) * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        materialModel.scale.set(obj.scale, obj.scale, obj.scale);
      })
      .onComplete(() => {
        if (typeof cb === 'function') {
          cb(materialModel);
        }
      });
    tween.start();
  }

  loopCreate(cb) {
    if (this.createNumber <= 0 && this.createNumber !== -1) {
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
          this.createModelByType(this.MU, cb);
          break;

        case '循环序列':
        case '序列':
        case '百分比':
          this.handleSequentialType(cb);
          break;

        case '随机':
          this.handleRandomType(cb);
          break;

        default:
          // 处理未知类型
          break;
      }

      this.createNumber -= 1;
    }
  }

  createModelByType(modelData, cb) {
    this.createModelOnce(modelData, cb).then(() => { });
  }

  handleSequentialType(cb) {
    if (this.MUType !== '循环序列' && this.currentIndex >= this.taskList.length) {
      this.stop();
      return;
    }

    const elementToCreate = this.taskList[this.currentIndex];
    this.createModelByType(elementToCreate, cb);

    if (this.MUType === '循环序列') {
      this.currentIndex = (this.currentIndex + 1) % this.taskList.length;
    } else {
      this.currentIndex += 1;
    }
  }

  handleRandomType(cb) {
    const selectedBall = this.getRandomElementByProbability(this.taskList);
    this.createModelByType(selectedBall, cb);
  }

  getRandomElementByProbability(elements) {
    const totalProbability = elements.reduce((sum, ele) => sum + ele.probability, 0);
    const randomValue = Math.random() * totalProbability;

    let currentSum = 0;
    for (let i = 0; i < elements.length; i += 1) {
      currentSum += elements[i].probability;
      if (randomValue < currentSum) {
        return elements[i].name;
      }
    }
    return elements[0].name;
  }

  // 批量创建
  batchCreates(cb) {
    this.reset();
    // 初始化任务队列
    this.initTaskList();

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
    };
    const gapTime = this.gapTime || 0.1;
    this.loop = toInterval(() => this.loopCreate(cb), gapTime * 1000, true);
  }

  // 停止
  stop() {
    if (this.loop) {
      this.loop.stop();
    }
  }

  reset() {
    const updateKeys = [
      'MUType',
      'MU',
      'datasheetToken',
      'isGenerateAsBatch',
      'createTime',
      'gapTime',
      'createNumber',
    ];
    updateKeys.forEach((key) => {
      if (this.model.fileData[key]) {
        this[key] = this.model.fileData[key];
      }
    });
    if (this.modelToken) {
      let target = null;
      this.model.children?.forEach((child) => {
        if (child.fileData?.modelToken === this.modelToken) {
          target = child;
        }
      });
      if (target) {
        this.model.remove(target);
      }
    }
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
    model.children?.forEach((child) => {
      if (child.fileData?.modelToken === checkModelToken) {
        goods = child;
      }
    });
    return goods;
  }

  setWarning() {
    this.isWarning = true;
    // this.findChildByName(this.model, '对象011').material.color.set('#FFA500');
  }

  removeWarning() {
    this.isWarning = false;
    // this.findChildByName(this.model, '对象011').material.color.set('#ffffff');
  }

  // 获取警告状态
  getWarning() {
    return this.isWarning;
  }
}