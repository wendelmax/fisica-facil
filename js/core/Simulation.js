export class Simulation {
    constructor() {
        this.lastTime = 0;
        this.animationId = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop = this.loop.bind(this);
        this.animationId = requestAnimationFrame(this.loop);
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    loop(currentTime) {
        if (!this.isRunning) return;
        const dt = (currentTime - this.lastTime) / 1000; // delta time in seconds
        this.lastTime = currentTime;
        
        this.update(dt);
        this.draw();

        this.animationId = requestAnimationFrame(this.loop);
    }

    // Override these methods in subclasses
    update(dt) {}
    draw() {}
}
