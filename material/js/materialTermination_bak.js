import * as THREE from 'three';
import { TWEEN } from 'three/addons/libs/tween.module.min.js';

export default class materialTermination {
  constructor(params = {}) {
    this.model = params.model || null; // 销毁器

    this.dealTime = params.dealTime || 1; // 处理时间
    this.setupTime = params.setupTime || 0; // 设置时间
    this.recoveryTime = params.recoveryTime || 0 // 恢复时间
    this.cycleTime = params.cycleTime || 0 // 周期时间

    this.queue = []; // 销毁队列

    this.running = false; // 运行状态
    this.destroyStatus = false; // 销毁状态

    // 暂停，避免快速请求以及频繁请求
    this.sleep = async (delay) => {
      return new Promise((resolve) => {
        setTimeout(resolve, delay * 1000);
      });
    };
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

  update(option) {
    Object.keys(option).forEach((key) => {
      if (this[key] !== undefined && this[key] !== null) {
        this[key] = option[key];
      }
    });
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
    let task = this.dequeue();
    if (task) {
      this.running = true;
      this.model.add(task);
      const { height } = this.getModelProperty(task);
      task.position.set(0, height / 2, 0);

      // 设置时间
      await this.sleep(this.setupTime);

      this.destroyStatus = true;
      const obj = { scale: 80 };
      const tween = new TWEEN.Tween(obj)
        .to({ scale: 0 }, this.dealTime * 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(function () {
          task.scale.set(obj.scale, obj.scale, obj.scale);
        })
        .onComplete(() => {
          this.model.remove(task);
          this.dispose(task);

          this.destroyStatus = false;
          task = null;
          TWEEN.remove(tween);

          this.run();
        });
      tween.start();
    } else {
      this.running = false;
    }
  }

  getModelProperty(model) {
    const box = new THREE.Box3().setFromObject(model); // 获取模型的包围盒
    const mdlen = box.max.x - box.min.x; // 模型长度
    const mdwid = box.max.z - box.min.z; // 模型宽度
    const mdhei = box.max.y - box.min.y; // 模型高度
    const x1 = box.min.x + mdlen / 2; // 模型中心点坐标X
    const y1 = box.min.y + mdhei / 2; // 模型中心点坐标Y
    const z1 = box.min.z + mdwid / 2; // 模型中心点坐标Z
    return { x: x1, y: y1, z: z1, height: mdhei };
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

  // 销毁模型
  dispose(obj) {
    const disposeHierarchy = (node, callback) => {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        disposeHierarchy(child, callback);
        callback(child);
        node.remove(child);
      }
    }

    const disposeObject = (object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            material.dispose();
          });
        } else {
          object.material.dispose();
        }
      }
      if (object.dispose) {
        object.dispose();
      }
    }
    if (obj.isObject3D) {
      disposeHierarchy(obj, disposeObject)
    } else {
      disposeObject(obj);
    }
  }
}