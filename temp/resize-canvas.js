// meghívás a főszálon
window.addEventListener('resize', updateCanvasPosition);

// főszálon
function updateCanvasPosition() {
    canvasWorkers.forEach(cw => {
      const rect = cw.element.getBoundingClientRect();
      cw.worker.post('update_canvas', {
        rect: {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          width: rect.width,
        },
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      });
    });
  }

// worker thread
  updateCanvasPos(data) {
    this.rect = data.rect;
    this.windowWidth = data.windowWidth;
    this.windowHeight = data.windowHeight;
    this.devicePixelRatio = data.devicePixelRatio;
    this.resizeRendererToDisplaySize();
  }

  resizeRendererToDisplaySize() {
    if (!this.rendererReady) throw new Error(`Planet ${this.id} Animation's renderer has not been created`);
    this.camera.aspect = this.rect.width / this.rect.height;
    this.updateCameraFoV();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.rect.width, this.rect.height, false);
    this.renderer.setPixelRatio(this.devicePixelRatio);
  }