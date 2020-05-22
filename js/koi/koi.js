/**
 * The koi game
 * @param {Systems} systems The render systems
 * @param {Random} random A randomizer
 * @constructor
 */
const Koi = function(systems, random) {
    this.systems = systems;
    this.random = random;
    this.scale = this.getScale(systems.width, systems.height);
    this.constellation = new Constellation(
        systems.width / this.scale,
        systems.height / this.scale);
    this.mover = new Mover(this.constellation);
    this.atlas = null;
    this.background = null;
    this.underwater = null;
    this.water = null;
    this.constellationMesh = null;
    this.spawner = new Spawner(this.constellation);
    this.time = 0;

    this.createRenderables();

    // TODO: This is a debug warp
    for (let i = 0; i < 1500; ++i)
        this.update();
};

Koi.prototype.BACKGROUND_COLOR = new Color(0.26, 0.49, 0.14);
Koi.prototype.FRAME_TIME_MAX = 1;
Koi.prototype.UPDATE_RATE = 1 / 14;
Koi.prototype.PREFERRED_SCALE = 95;
Koi.prototype.SIZE_MIN = 8;
Koi.prototype.SIZE_MAX = 13;

/**
 * Create all renderable objects
 */
Koi.prototype.createRenderables = function() {
    this.atlas = new Atlas(
        this.systems.gl,
        this.systems.patterns,
        this.constellation.getCapacity());
    this.background = new Background(
        this.systems.gl,
        this.systems.sand,
        this.systems.width,
        this.systems.height,
        this.scale);
    this.underwater = new RenderTarget(
        this.systems.gl,
        this.systems.width,
        this.systems.height,
        this.systems.gl.RGB,
        this.systems.gl.LINEAR,
        this.systems.gl.UNSIGNED_BYTE);
    this.water = new WaterPlane(
        this.systems.gl,
        this.systems.width / this.scale,
        this.systems.height / this.scale);

    this.constellationMesh = this.constellation.makeMesh(this.systems.gl);
};

/**
 * Free all renderable objects
 */
Koi.prototype.freeRenderables = function() {
    this.atlas.free();
    this.background.free();
    this.underwater.free();
    this.water.free();

    this.constellationMesh.free();
};

/**
 * Start a touch event
 * @param {Number} x The X position in pixels
 * @param {Number} y The Y position in pixels
 */
Koi.prototype.touchStart = function(x, y) {
    const fish = this.constellation.pick(x / this.scale, y / this.scale);

    if (fish)
        this.mover.pickUp(fish,x / this.scale, y / this.scale, this.water, this.random);
};

/**
 * Move a touch event
 * @param {Number} x The X position in pixels
 * @param {Number} y The Y position in pixels
 */
Koi.prototype.touchMove = function(x, y) {
    this.mover.touchMove(x / this.scale, y / this.scale);
};

/**
 * End a touch event
 */
Koi.prototype.touchEnd = function() {
    this.mover.drop(this.water, this.random);
};

/**
 * Calculate the scene scale
 * @param {Number} width The view width in pixels
 * @param {Number} height The view height in pixels
 */
Koi.prototype.getScale = function(width, height) {
    const minSize = Math.min(width, height);

    return Math.max(Math.min(this.PREFERRED_SCALE, minSize / this.SIZE_MIN), minSize / this.SIZE_MAX);
};

/**
 * Notify that the renderer has resized
 */
Koi.prototype.resize = function() {
    this.scale = this.getScale(this.systems.width, this.systems.height);
    this.constellation.resize(
        this.systems.width / this.scale,
        this.systems.height / this.scale,
        this.atlas);

    this.freeRenderables();
    this.createRenderables();

    this.constellation.updateAtlas(this.atlas);
};

/**
 * Update the scene
 */
Koi.prototype.update = function() {
    this.spawner.update(this.UPDATE_RATE, this.atlas, this.random);
    this.constellation.update(this.atlas, this.water, this.random);
    this.mover.update();

    this.systems.waves.propagate(this.water, this.systems.wavePainter, this.constellationMesh);
};

/**
 * Render the scene
 * @param {Number} deltaTime The amount of time passed since the last frame
 */
Koi.prototype.render = function(deltaTime) {
    this.time += Math.min(this.FRAME_TIME_MAX, deltaTime);

    while (this.time > this.UPDATE_RATE) {
        this.time -= this.UPDATE_RATE;

        this.update(); // TODO: Add separate update step to spread out processing?
    }

    const timeFactor = this.time / this.UPDATE_RATE;

    // Target underwater bufferQuad
    this.underwater.target();

    // Render background
    this.background.render(this.systems.quad);

    // Render fishes
    this.constellation.render(
        this.systems.bodies,
        this.atlas,
        this.systems.width,
        this.systems.height,
        this.scale,
        timeFactor);

    // Target window
    this.systems.targetMain();

    this.systems.gl.clearColor(this.BACKGROUND_COLOR.r, this.BACKGROUND_COLOR.g, this.BACKGROUND_COLOR.b, 1);
    this.systems.gl.clear(this.systems.gl.COLOR_BUFFER_BIT);

    // Render shaded water
    this.systems.waves.render(
        this.underwater.texture,
        this.constellationMesh,
        this.water,
        this.systems.width,
        this.systems.height,
        this.scale,
        timeFactor);

    // Render mover
    this.mover.render(
        this.systems.bodies,
        this.atlas,
        this.systems.width,
        this.systems.height,
        this.scale,
        timeFactor);

    this.systems.gl.activeTexture(this.systems.gl.TEXTURE0);
    this.systems.gl.bindTexture(this.systems.gl.TEXTURE_2D, this.atlas.renderTarget.texture);
};

/**
 * Free all resources maintained by the simulation
 */
Koi.prototype.free = function() {
    this.freeRenderables();
};