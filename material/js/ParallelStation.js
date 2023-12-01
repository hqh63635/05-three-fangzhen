import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import Station from "./Station.js";

// 并行工位
class ParallelStation extends Station {
  constructor(params = {}) {
    super(params);

    this.row = parseInt(params.row) || 1;
    this.col = parseInt(params.col) || 1;
    this.isProgressingWhenFull = true; // 充满时开始处理
    this.presentModelToken = '';

    this.allTask = [];
    // 添加key
    this.addUpdateKeys();
    this.initCapacity();
  }

  // 初始化容量；通过行和列计算任务最大量
  initCapacity() {
    this.maxWhilestTask = parseInt(this.row) * parseInt(this.col);
  }

  addUpdateKeys() {
    // 增加需要更新的key
    this.updateKeys.push('row', 'col', 'isProgressingWhenFull');
  }

  // 重写父类的update方法
  update(option) {
    super.update(option);

    this.initCapacity();
  }

  add(obj) {
    if (this.isProgressingWhenFull) {
      return new Promise((resolve) => {
        if (this.allTask.length <= this.maxWhilestTask && !this.blocking) {
          this.blocking = false;
          super.add(obj).then((res) => {
            this.allTask.push({ obj, resolve });
          });
        }
        if (this.allTask.length === this.maxWhilestTask) {
          this.blocking = true;
          this.allTask.forEach((task) => {
            const sc = { scale: 80 };
            const tween = new TWEEN.Tween(sc) // 初始缩放为1
              .to({ scale: 160 }, this.dealTime * 1000) // 缩放到2
              .easing(TWEEN.Easing.Quadratic.Out)
              .onUpdate(() => {
                task.obj.scale.set(sc.scale, sc.scale, sc.scale);
                task.obj.position.set(0, 100, 0)
              })
              .onComplete(async () => {
                await this.processQueue();
              });

            tween.start();
          });
        }
      });
    }
  }

  async processQueue() {
    clearInterval()
    while (this.allTask.length > 0) {
      // 当前存在任务
      if (this.checkHasGood(this.model, this.presentModelToken)) {
        // 每次循环后等待一段时间，避免无限循环时的性能问题
        await this.sleep(1);
      } else {
        let task = this.allTask.shift();
        if (task) {
          this.presentModelToken = task.obj.fileData.modelToken;
          task.resolve({ obj: task.obj });  // 运行回调函数
        }
      }
    }
  }
}

export default ParallelStation;