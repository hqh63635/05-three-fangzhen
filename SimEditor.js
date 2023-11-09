const SimEditor = function () {

};

SimEditor.prototype = {
  constructor() {
    this.scene = '';
    this.camera = '';
    this.control = '';
  },
  setParams(scene, camera, control) {
    this.scene = scene;
    this.camera = camera;
    this.control = control;
  },
  addMus(model) {
    this.scene.add(model);
  },
  delMus(model) {
    this.scene.remove(model);
  }
}


SimEditor.getInstance = function (el) {
  if (!this.instance) {
    this.instance = new SimEditor(el);
  }
  return this.instance;
};

export default SimEditor;