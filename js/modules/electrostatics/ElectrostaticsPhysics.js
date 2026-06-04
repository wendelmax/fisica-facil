export class ElectrostaticsPhysics {
    constructor() {
        this.K = 5000;
        this.reset();
    }

    reset() {
        this.charges = [];
        this.testCharge = null;
        this.target = null;
        this.obstacles = [];
        
        this.orbitState = {
            active: false,
            totalAngle: 0,
            lastAngle: 0,
            center: {x: 0, y: 0}
        };

        this.currentScenario = 'custom';
    }

    setupScenario(scenarioType, width, height) {
        this.currentScenario = scenarioType;
        
        this.testCharge = {
            x: 50,
            y: height / 2,
            vx: 0,
            vy: 0,
            q: 10,
            path: [],
            crashed: false
        };

        if (scenarioType === 'custom') {
            this.obstacles = [];
            this.orbitState.active = false;
            this.target = {
                x: width - 80,
                y: height / 2,
                radius: 30,
                hit: false
            };
        } else if (scenarioType === 'maze') {
            this.obstacles = [
                { x: width / 2, y: height / 2 - 80, radius: 60 },
                { x: width / 2, y: height / 2 + 80, radius: 60 }
            ];
            this.orbitState.active = false;
            this.target = {
                x: width - 80,
                y: height / 2,
                radius: 30,
                hit: false
            };
        } else if (scenarioType === 'orbit') {
            this.obstacles = [];
            this.target = null;
            this.orbitState = {
                active: true,
                totalAngle: 0,
                lastAngle: 0,
                center: {x: width/2, y: height/2}
            };
            
            this.testCharge.y = height / 2 - 100;
            this.testCharge.x = width / 2;
            this.testCharge.vx = 4;
            this.testCharge.vy = 0;
        }

        if (this.orbitState.active) {
            this.orbitState.lastAngle = Math.atan2(this.testCharge.y - this.orbitState.center.y, this.testCharge.x - this.orbitState.center.x);
        }
    }

    addCharge(q, width, height) {
        this.charges.push({
            x: width / 2 + (Math.random() - 0.5) * 100,
            y: height / 2 + (Math.random() - 0.5) * 100,
            q: q
        });
    }

    update(width, height) {
        if (this.testCharge.crashed || (this.target && this.target.hit) || (this.currentScenario === 'orbit' && !this.orbitState.active)) {
            return { event: null };
        }

        let fx = 0;
        let fy = 0;

        for (let charge of this.charges) {
            const dx = this.testCharge.x - charge.x;
            const dy = this.testCharge.y - charge.y;
            const r2 = dx * dx + dy * dy;
            const r = Math.sqrt(r2);
            
            if (r < 10) continue;

            const f = (this.K * this.testCharge.q * charge.q) / r2;
            fx += f * (dx / r);
            fy += f * (dy / r);
            
            if (r < 25) {
                this.testCharge.crashed = true;
                return { event: 'crashed_charge' };
            }
        }

        this.testCharge.vx += fx * 0.01;
        this.testCharge.vy += fy * 0.01;
        
        if (this.currentScenario !== 'orbit') {
            this.testCharge.vx *= 0.98;
            this.testCharge.vy *= 0.98;
        } else {
            this.testCharge.vx *= 0.999;
            this.testCharge.vy *= 0.999;
        }

        this.testCharge.x += this.testCharge.vx;
        this.testCharge.y += this.testCharge.vy;

        if (this.testCharge.path.length === 0 || Math.hypot(this.testCharge.path[this.testCharge.path.length-1].x - this.testCharge.x, this.testCharge.path[this.testCharge.path.length-1].y - this.testCharge.y) > 5) {
            this.testCharge.path.push({x: this.testCharge.x, y: this.testCharge.y});
            if (this.testCharge.path.length > 200) this.testCharge.path.shift();
        }

        if (this.testCharge.x < 0 || this.testCharge.x > width || this.testCharge.y < 0 || this.testCharge.y > height) {
            if (this.currentScenario === 'orbit') {
                this.testCharge.crashed = true;
                return { event: 'out_of_bounds_orbit' };
            } else {
                this.testCharge.vx *= -0.5;
                this.testCharge.vy *= -0.5;
                this.testCharge.x = Math.max(0, Math.min(width, this.testCharge.x));
                this.testCharge.y = Math.max(0, Math.min(height, this.testCharge.y));
            }
        }

        for (let obs of this.obstacles) {
            if (Math.hypot(this.testCharge.x - obs.x, this.testCharge.y - obs.y) < obs.radius + 5) {
                this.testCharge.crashed = true;
                return { event: 'crashed_obstacle' };
            }
        }

        if (this.target) {
            const distToTarget = Math.hypot(this.testCharge.x - this.target.x, this.testCharge.y - this.target.y);
            if (distToTarget < this.target.radius) {
                this.target.hit = true;
                return { event: 'target_hit' };
            }
        } else if (this.orbitState.active) {
            let currentAngle = Math.atan2(this.testCharge.y - this.orbitState.center.y, this.testCharge.x - this.orbitState.center.x);
            let diff = currentAngle - this.orbitState.lastAngle;
            
            if (diff > Math.PI) diff -= Math.PI * 2;
            if (diff < -Math.PI) diff += Math.PI * 2;
            
            this.orbitState.totalAngle += diff;
            this.orbitState.lastAngle = currentAngle;
            
            if (Math.abs(this.orbitState.totalAngle) >= Math.PI * 2) {
                this.orbitState.active = false;
                return { event: 'orbit_complete' };
            }
        }

        return { event: null, fx, fy };
    }
}
