export class EnergyPhysics {
    constructor() {
        this.g = 9.81;
        this.reset();
    }

    reset() {
        this.mass = 5;
        this.startHeightMeters = 8;
        this.frictionEnabled = false;
        
        this.pixelPerMeter = 250;
        this.maxTrackHeight = 0;
        
        this.currentScenario = 'radar';
        this.scenariosConfig = {
            radar: { targetSpeed: 14.0 },
            jump: {},
            loop: {}
        };

        this.ball = null;
        this.trackOriginX = 0;
        this.trackOriginY = 0;
        this.isPlaying = false;
    }

    setupScenario(scenarioType, width, height, startHeightMeters, mass, frictionEnabled, radarSpeed) {
        this.currentScenario = scenarioType;
        this.startHeightMeters = startHeightMeters;
        this.mass = mass;
        this.frictionEnabled = frictionEnabled;
        if(radarSpeed !== undefined) this.scenariosConfig.radar.targetSpeed = radarSpeed;

        this.trackOriginY = height - 40;
        this.maxTrackHeight = height * 0.75;
        let ppmH = this.maxTrackHeight / 10.0;

        if (this.currentScenario === 'jump') {
            this.trackOriginX = width * 0.42;
            let ppmW = (width * 0.9) / 35.0;
            this.pixelPerMeter = Math.min(ppmW, ppmH);
            this.trackOriginY = height - 10 - (2.0 * this.pixelPerMeter);
        } else if (this.currentScenario === 'loop') {
            this.trackOriginX = width * 0.5;
            let ppmW = (width * 0.9) / 20.0;
            this.pixelPerMeter = Math.min(ppmW, ppmH);
        } else {
            this.trackOriginX = width * 0.5;
            let ppmW = (width * 0.9) / 20.0;
            this.pixelPerMeter = Math.min(ppmW, ppmH);
        }

        this.resetBall();
    }

    resetBall() {
        let targetY_m = this.startHeightMeters;
        let startX = 0;

        if (this.currentScenario === 'radar' || this.currentScenario === 'loop') {
            startX = -Math.sqrt(targetY_m / 0.1) * this.pixelPerMeter;
        } else if (this.currentScenario === 'jump') {
            startX = (-Math.sqrt((targetY_m + 2.0) / 0.125) - 4) * this.pixelPerMeter;
        }

        const targetY = this.getTrackY(startX);

        this.ball = {
            state: 'rampin', // rampin, flat, loop, air, platform, fall
            x: startX,
            y: targetY,
            vx: 0,
            vy: 0,
            v: 0,
            loopAngle: -Math.PI/2,
            hasFinished: false
        };
        this.isPlaying = false;
    }

    getTrackY(x) {
        let xm = x / this.pixelPerMeter;
        if (this.currentScenario === 'radar' || this.currentScenario === 'loop') {
            if (xm < 0) return (0.1 * xm * xm) * this.pixelPerMeter;
            return 0;
        } else if (this.currentScenario === 'jump') {
            if (xm <= 0) return (0.125 * (xm + 4) * (xm + 4) - 2.0) * this.pixelPerMeter;
            return -1000 * this.pixelPerMeter;
        }
        return 0;
    }

    getTrackSlope(x) {
        let xm = x / this.pixelPerMeter;
        if (this.currentScenario === 'radar' || this.currentScenario === 'loop') {
            if (xm < 0) return 2 * 0.1 * xm;
            return 0;
        } else if (this.currentScenario === 'jump') {
            if (xm <= 0) return 2 * 0.125 * (xm + 4);
            return 0;
        }
        return 0;
    }

    update(dt) {
        if (!this.isPlaying || this.ball.hasFinished) return { event: null };

        let pg = this.g * this.pixelPerMeter;
        let friction = this.frictionEnabled ? 0.05 : 0;
        let eventObj = null;

        if (this.ball.state === 'rampin' || this.ball.state === 'flat') {
            let slope = this.getTrackSlope(this.ball.x);
            let angle = Math.atan(slope);

            let accel = -pg * Math.sin(angle);
            if (this.ball.v > 0) accel -= friction * pg * Math.cos(angle);
            else if (this.ball.v < 0) accel += friction * pg * Math.cos(angle);

            this.ball.v += accel * dt;
            let ds = this.ball.v * dt;

            this.ball.x += ds * Math.cos(angle);
            this.ball.y = this.getTrackY(this.ball.x);

            if (this.currentScenario === 'radar') {
                if (this.ball.x >= 0) this.ball.state = 'flat';
                if (this.ball.x >= 5.0 * this.pixelPerMeter) {
                    this.ball.hasFinished = true;
                    let speedMeters = Math.abs(this.ball.v) / this.pixelPerMeter;
                    let target = this.scenariosConfig.radar.targetSpeed;
                    let diff = Math.abs(speedMeters - target);
                    eventObj = { type: 'radar_finish', success: diff < 0.5, speed: speedMeters };
                }
            } else if (this.currentScenario === 'jump') {
                if (this.ball.x >= 0 && this.ball.state !== 'air') {
                    this.ball.state = 'air';
                    this.ball.x = 0;
                    this.ball.y = 0;
                    let launchAngle = Math.atan(this.getTrackSlope(0));
                    this.ball.vx = this.ball.v * Math.cos(launchAngle);
                    this.ball.vy = this.ball.v * Math.sin(launchAngle);
                }
            } else if (this.currentScenario === 'loop') {
                if (this.ball.x >= 0 && this.ball.state === 'rampin') {
                    this.ball.state = 'loop';
                    this.ball.loopAngle = -Math.PI/2;
                }
            }

            if (this.ball.x < -1000) this.ball.v = 0;
        } 
        else if (this.ball.state === 'loop') {
            let R = 3.0 * this.pixelPerMeter;
            let angle = this.ball.loopAngle;
            let tangentialAccel = -pg * Math.cos(angle);

            if (this.ball.v > 0) tangentialAccel -= friction * pg;
            else if (this.ball.v < 0) tangentialAccel += friction * pg;

            this.ball.v += tangentialAccel * dt;
            let ds = this.ball.v * dt;
            this.ball.loopAngle += ds / R;

            this.ball.x = Math.cos(this.ball.loopAngle) * R;
            this.ball.y = R + Math.sin(this.ball.loopAngle) * R;

            let N = (this.ball.v * this.ball.v) / R - pg * Math.sin(this.ball.loopAngle);

            if (N < 0 && Math.sin(this.ball.loopAngle) > 0) {
                this.ball.state = 'fall';
                let tangentAngle = this.ball.loopAngle + Math.PI/2;
                this.ball.vx = this.ball.v * Math.cos(tangentAngle);
                this.ball.vy = this.ball.v * Math.sin(tangentAngle);
                eventObj = { type: 'loop_fail' };
            }

            if (this.ball.loopAngle >= 3 * Math.PI / 2) {
                this.ball.state = 'flat';
                this.ball.x = 0;
                this.ball.y = 0;
                eventObj = { type: 'loop_success' };
            }
            if (this.ball.loopAngle <= -Math.PI / 2 && this.ball.v < 0) {
                this.ball.state = 'rampin';
                this.ball.x = 0;
            }
        } 
        else if (this.ball.state === 'air' || this.ball.state === 'fall') {
            this.ball.vy -= pg * dt;
            this.ball.x += this.ball.vx * dt;
            this.ball.y += this.ball.vy * dt;

            if (this.currentScenario === 'jump' && this.ball.state === 'air') {
                let platX = 15.0 * this.pixelPerMeter;
                let platY = 0;
                let platWidth = 5.0 * this.pixelPerMeter;

                if (this.ball.x >= platX && this.ball.x <= platX + platWidth && this.ball.y <= platY && this.ball.vy < 0) {
                    this.ball.state = 'platform';
                    this.ball.y = platY;
                    this.ball.vy = 0;
                    this.ball.v = this.ball.vx;
                    eventObj = { type: 'jump_success' };
                } else if (this.ball.y < -50) {
                    this.ball.hasFinished = true;
                    eventObj = { type: 'jump_fail', reason: this.ball.x < platX ? 'short' : 'long' };
                }
            }

            if (this.ball.y < -100) {
                this.ball.hasFinished = true;
            }
        } 
        else if (this.ball.state === 'platform') {
            if (this.ball.v > 0) this.ball.v -= 20 * dt;
            if (this.ball.v < 0) this.ball.v = 0;
            this.ball.x += this.ball.v * dt;
            if (this.ball.v <= 0) this.ball.hasFinished = true;
        }

        if (Math.abs(this.ball.v) < 1 && this.ball.y < 5 && this.ball.state === 'rampin') {
            this.ball.hasFinished = true;
        }

        return { event: eventObj };
    }

    calculateEnergies() {
        if (!this.ball) return { PE: 0, KE: 0, TE: 0, pePercent: 0, kePercent: 0 };
        const h = Math.max(0, this.ball.y) / this.pixelPerMeter;
        
        let vPx = 0;
        if (this.ball.state === 'air' || this.ball.state === 'fall') {
            vPx = Math.sqrt(this.ball.vx*this.ball.vx + this.ball.vy*this.ball.vy);
        } else {
            vPx = Math.abs(this.ball.v);
        }
        const v = vPx / this.pixelPerMeter;

        const PE = this.mass * this.g * h;
        const KE = 0.5 * this.mass * v * v;
        const TE = PE + KE;

        const maxE = this.mass * this.g * (this.maxTrackHeight / this.pixelPerMeter);
        const pePercent = Math.min(100, (PE / maxE) * 100);
        const kePercent = Math.min(100, (KE / maxE) * 100);

        return { PE, KE, TE, pePercent, kePercent };
    }
}
