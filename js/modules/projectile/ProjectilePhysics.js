const g = 9.81;

export class ProjectilePhysics {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 40;
        this.y = 0; // Starts from 0 logically (height - 20)
        this.vx = 0;
        this.vy = 0;
        this.time = 0;
        this.path = [];
        this.maxHeight = 0;
        this.isFlying = false;
        
        // Scenario entities
        this.target = null;
        this.wall = null;
    }

    setupScenario(scenarioType, width, scale) {
        this.wall = null;
        if (scenarioType === 'wall') {
            this.generateTarget(true, width, scale);
            const wallDistanceMeters = (this.target.x - 40) / scale / 2;
            const wallHeightMeters = 30 + Math.random() * 20;
            this.wall = {
                x: 40 + wallDistanceMeters * scale,
                width: 20,
                height: wallHeightMeters * scale,
                heightMeters: wallHeightMeters
            };
        } else if (scenarioType === 'moving') {
            this.generateTarget(false, width, scale);
            this.target.vx = 5;
            this.target.moving = true;
        } else {
            this.generateTarget(false, width, scale);
        }
    }

    generateTarget(far, width, scale) {
        let minX = 50 * scale;
        if (far) minX = 100 * scale;
        const maxX = width - 100;
        const targetX = Math.random() * (maxX - minX) + minX;
        
        this.target = {
            x: targetX,
            y: 0, // Ground level
            width: 40,
            height: 10,
            hit: false,
            moving: false,
            vx: 0
        };
    }

    fire(v0, theta) {
        if (this.isFlying) return;
        this.isFlying = true;
        this.x = 40;
        this.y = 0;
        this.vx = v0 * Math.cos(theta);
        this.vy = v0 * Math.sin(theta);
        this.time = 0;
        this.path = [];
        this.maxHeight = 0;
        this.startX = 40;
    }

    update(dt, scale) {
        if (this.target && this.target.moving && !this.target.hit) {
            this.target.x += this.target.vx * scale * dt;
            // Need width boundary logic here, usually passed in update
        }

        if (!this.isFlying) return { collision: null };

        this.time += dt;
        
        const currentX = this.vx * this.time;
        // In physical coords, positive Y is up. 
        const currentY = (this.vy * this.time) - (0.5 * g * this.time * this.time);
        
        const nextX = this.startX + currentX * scale;
        const nextY = currentY * scale; // Y relative to ground, upwards

        // Collision logic
        let collisionEvent = null;

        if (this.wall) {
            const wallLeft = this.wall.x;
            const wallRight = this.wall.x + this.wall.width;
            const wallHeight = this.wall.height;
            
            // Crossing wall X boundaries
            if ((this.x <= wallLeft && nextX >= wallLeft) || (this.x >= wallRight && nextX <= wallRight)) {
                if (nextY < wallHeight) { // Hit wall
                    this.isFlying = false;
                    return { collision: 'wall', x: wallLeft, y: nextY };
                }
            }
        }

        this.x = nextX;
        this.y = nextY;

        // Path tracking
        if (this.path.length === 0 || Math.abs(this.path[this.path.length-1].x - this.x) > 5) {
            this.path.push({x: this.x, y: this.y});
        }

        const currentHeightMeters = this.y / scale;
        if (currentHeightMeters > this.maxHeight) {
            this.maxHeight = currentHeightMeters;
        }

        // Ground collision
        if (this.y <= 0) {
            this.y = 0;
            this.isFlying = false;
            collisionEvent = this.checkTargetHit() ? 'target' : 'ground';
        }

        return { collision: collisionEvent };
    }

    checkTargetHit() {
        if (!this.target) return false;
        if (this.x >= this.target.x - 20 && this.x <= this.target.x + this.target.width + 20) {
            this.target.hit = true;
            return true;
        }
        return false;
    }
}
