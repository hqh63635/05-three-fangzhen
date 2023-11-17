import { TWEEN } from 'three/addons/libs/tween.module.min.js';

export default class materialTermination {
  constructor(params = {}) {
    this.model = params.model || null; // 销毁器

    this.dealTime = params.dealTime || 1000;
    this.setupTime = params.setupTime || 0;

    this.queue = []; // 销毁队列

    this.running = false;
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
  update(params) {
    this.dealTime = params.dealTime;
  }

  destroy(model) {
    this.queue.push(model);
    if (!this.running) {
      this.run();
    }
  }

  dequeue() {
    return this.queue.shift();
  }

  async run() {
    const task = this.dequeue();
    if (task) {
      this.running = true;
      this.model.add(task);

      // 设置时间
      await this.sleep(this.setupTime);

      task.position.set(0, 20, 0);

      const obj = { scale: 1 };
      const tween = new TWEEN.Tween(obj)
        .to({ scale: 0 }, this.dealTime * 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(function () {
          task.scale.set(obj.scale, obj.scale, obj.scale);
        })
        .onComplete(() => {
          this.model.remove(task);
          TWEEN.remove(tween);
          this.run();
        });
      tween.start();
    } else {
      this.running = false;
    }
  }

  // 暂停，避免快速请求以及频繁请求
  async sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
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
}