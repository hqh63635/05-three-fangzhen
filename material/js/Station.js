import * as THREE from 'three';

export default class Station {
  constructor(params = {}) {
    this.model = params.model || null; // 销毁器

    this.dealTime = params.dealTime || 1; // 处理时间
    this.setupTime = params.setupTime || 0; // 设置时间
    this.recoveryTime = params.recoveryTime || 0 // 恢复时间
    this.cycleTime = params.cycleTime || 0 // 周期时间

    this.running = false; // 运行状态
    this.status = ''; // 状态

    this.maxWhilestTask = 1; // 允许的最大同时任务数量
    this.queue = []; // 队列
    this.taskModelToken = '';
    this.blocking = true;

    // 需要更新的属性key
    this.updateKeys = ['dealTime', 'setupTime', 'recoveryTime', 'cycleTime'];

    // 暂停，避免快速请求以及频繁请求
    this.sleep = async (delay = 0.3) => {
      return new Promise((resolve) => {
        setTimeout(resolve, delay * 1000);
      });
    };

    this.init();
  }

  init() {
    if (this.model.fileData) {
      this.model.fileData.dealTime = this.dealTime;
    } else {
      this.model.fileData = {
        dealTime: this.dealTime,
      }
    }
  }

  // 更新配置参数
  update(option) {
    Object.keys(option).forEach((key) => {
      if (this.updateKeys.includes(key)) {
        this[key] = option[key];
      }
    });
  }

  dequeue() {
    return this.queue.shift();
  }

  async add(object) {
    return new Promise(async (resolve) => {
      this.queue.push({ object, resolve });  // 将 resolve 函数存储在队列中
      if (!this.running) {
        await this.run();
      }
    });
  }

  async run() {
    while (this.queue.length > 0) {
      // 当前存在任务
      if (this.checkHasGood(this.model, this.taskModelToken) && this.blocking) {
        // 每次循环后等待一段时间，避免无限循环时的性能问题
        await this.sleep(1);
      } else {
        let task = this.dequeue();
        if (task) {
          this.taskModelToken = task.object.fileData.modelToken;
          this.running = true;
          this.model.add(task.object);
          task.object.position.set(0, 20, 0);
          // todo 先屏蔽
          // await this.sleep(this.setupTime);
          this.running = false;
          task.resolve({ obj: task.object });  // 运行回调函数
        }
      }
    }
    // 当队列为空时，将 running 设置为 false
    this.running = false;
  }

  // 检查当前的任务数
  checkoutTaskNum() {
    // if (this.maxWhilestTask === 1) {
    //   return this.checkHasGood(this.model, this.taskModelToken);
    // }
    // const result = this.model.children.filter(v => v?.fileData?.type === 'materialModel')
    // return result.length >= this.maxWhilestTask;
  }

  // 检查模型中是否存在生成的货物模型
  checkHasGood(targetModel, checkModelToken) {
    let result = null;
    targetModel?.children.forEach((child) => {
      if (child.fileData?.modelToken === checkModelToken) {
        result = child;
      }
    });
    return result;
  }

  // 获取模型的坐标
  getWorldPosition() {
    const worldPosition = new THREE.Vector3();
    this.model.getWorldPosition(worldPosition);
    return worldPosition;
  }
}