export class DynamicsPhysics {
    constructor() {
        this.g = 9.81;
        this.reset();
    }

    reset() {
        this.mass = 10;
        this.appliedForce = 0;
        this.mu = 0.2;
        
        this.block = {
            x: 50,
            y: 0, // Not really used physically, but keeps it consistent
            size: 40,
            vx: 0,
            vy: 0,
            pushing: true
        };
        
        this.targetArea = null;
        this.scenarioConfig = null;
        this.isPlaying = false;
    }

    setupScenario(scenarioType, width, mass, mu) {
        this.mass = mass;
        this.mu = mu;
        
        const scenarios = {
            standard: {
                setup: () => {
                    const minX = 300;
                    const maxX = width - 150;
                    this.targetArea = {
                        x: Math.random() * (maxX - minX) + minX,
                        width: 80,
                        hit: false
                    };
                },
                getFriction: (x) => this.mu,
                getGravityParallel: () => 0,
                getNormal: () => this.mass * this.g,
                angle: 0
            },
            mixed: {
                setup: () => {
                    this.targetArea = {
                        x: width - 150,
                        width: 80,
                        hit: false
                    };
                },
                getFriction: (x) => {
                    return (x > width / 2) ? 0.6 : 0.01;
                },
                getGravityParallel: () => 0,
                getNormal: () => this.mass * this.g,
                angle: 0
            },
            ramp: {
                setup: () => {
                    this.targetArea = {
                        x: width / 2 + 100,
                        width: 80,
                        hit: false
                    };
                },
                getFriction: (x) => this.mu,
                getGravityParallel: () => this.mass * this.g * Math.sin(15 * Math.PI / 180),
                getNormal: () => this.mass * this.g * Math.cos(15 * Math.PI / 180),
                angle: -15 * Math.PI / 180
            }
        };

        this.scenarioConfig = scenarios[scenarioType];
        this.scenarioConfig.setup();
    }

    startPush(force) {
        this.appliedForce = force;
        this.isPlaying = true;
        this.block.pushing = true;
    }

    calculateForces() {
        if (!this.scenarioConfig) return { netForce: 0, accel: 0, frictionForce: 0, px: 0, normalForce: 0 };

        const normalForce = this.scenarioConfig.getNormal();
        const currentMu = this.scenarioConfig.getFriction(this.block.x);
        const frictionForce = currentMu * normalForce;
        const px = this.scenarioConfig.getGravityParallel();
        
        let netForce = this.appliedForce;
        
        if (this.block.vx > 0) {
            netForce -= (frictionForce + px);
        } else if (this.appliedForce > frictionForce + px) {
            netForce -= (frictionForce + px);
        } else if (px > frictionForce + this.appliedForce && this.block.vx <= 0) {
            netForce = this.appliedForce - px + frictionForce;
        } else {
            netForce = 0;
        }

        const accel = netForce / this.mass;

        return { netForce, accel, frictionForce, px, normalForce, currentMu };
    }

    update(dt, scale, width) {
        if (!this.isPlaying) return { event: null };

        const forces = this.calculateForces();

        if (this.block.x > 150 && this.block.pushing) {
            this.block.pushing = false;
            this.appliedForce = 0;
        }

        this.block.vx += forces.accel * dt;

        if (this.block.vx < 0 && forces.px === 0) {
            this.block.vx = 0;
            this.isPlaying = false;
            return { event: 'stopped' };
        } else if (this.block.vx < 0 && forces.px > 0 && Math.abs(forces.px) <= forces.frictionForce) {
            this.block.vx = 0;
            this.isPlaying = false;
            return { event: 'stopped' };
        }

        this.block.x += this.block.vx * scale * dt;

        if (this.block.x > width || this.block.x < 0) {
            this.isPlaying = false;
            return { event: 'out_of_bounds' };
        }

        return { event: null };
    }

    checkWin() {
        const center = this.block.x + this.block.size / 2;
        if (center >= this.targetArea.x && center <= this.targetArea.x + this.targetArea.width) {
            this.targetArea.hit = true;
            return true;
        }
        return false;
    }
}
