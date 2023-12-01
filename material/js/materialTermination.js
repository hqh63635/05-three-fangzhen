import { TWEEN } from 'three/addons/libs/tween.module.min.js';
import Station from "./Station.js";


class MaterialTermination extends Station {
  constructor(params = {}) {
    super(params);
  }

  destroyed(model) {
    console.log('dddddd', model)
    this.add(model).then((res) => {
      let task = res.obj;
      const obj = { scale: 80 };
      const tween = new TWEEN.Tween(obj)
        .to({ scale: 0 }, this.dealTime * 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          task.scale.set(obj.scale, obj.scale, obj.scale);
        })
        .onComplete(() => {
          this.model.remove(task);
          this.dispose(task);

          task = null;
          TWEEN.remove(tween);
        });
      tween.start();
    });
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

export default MaterialTermination;