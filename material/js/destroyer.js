import { Tween, Easing, update } from 'three/addons/libs/tween.module.js';

export default class destroyer {
  constructor(
    model,
    dealModel,
    dealTime,
  ) {
    this.destroyModel = model;
    this.dealTime = dealTime;
  }
}