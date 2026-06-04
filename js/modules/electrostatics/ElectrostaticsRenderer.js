export class ElectrostaticsRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    drawFieldLines(physics) {
        if (!this.ctx || physics.charges.length === 0) return;
        const step = 40;
        for (let x = step / 2; x < this.width; x += step) {
            for (let y = step / 2; y < this.height; y += step) {
                let fx = 0;
                let fy = 0;

                for (let charge of physics.charges) {
                    const dx = x - charge.x;
                    const dy = y - charge.y;
                    const r2 = dx * dx + dy * dy;
                    const r = Math.sqrt(r2);
                    if (r < 10) continue;

                    const f = (physics.K * charge.q) / r2;
                    fx += f * (dx / r);
                    fy += f * (dy / r);
                }

                const mag = Math.hypot(fx, fy);
                if (mag > 0.1) {
                    const len = Math.min(step * 0.4, mag * 2);
                    const angle = Math.atan2(fy, fx);
                    
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
                    this.ctx.stroke();
                }
            }
        }
    }

    draw(physics, showField) {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (showField) {
            this.drawFieldLines(physics);
        }

        for (let obs of physics.obstacles) {
            const grad = this.ctx.createRadialGradient(obs.x, obs.y, 0, obs.x, obs.y, obs.radius);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        if (physics.target) {
            this.ctx.beginPath();
            this.ctx.arc(physics.target.x, physics.target.y, physics.target.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = physics.target.hit ? '#10b981' : '#f59e0b';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = physics.target.hit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.1)';
            this.ctx.fill();
        } else if (physics.orbitState.active || (physics.currentScenario === 'orbit' && !physics.orbitState.active)) {
            this.ctx.beginPath();
            this.ctx.arc(physics.orbitState.center.x, physics.orbitState.center.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fill();
        }

        if (physics.testCharge && physics.testCharge.path.length > 0) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = physics.testCharge.crashed ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.moveTo(physics.testCharge.path[0].x, physics.testCharge.path[0].y);
            for (let pt of physics.testCharge.path) {
                this.ctx.lineTo(pt.x, pt.y);
            }
            this.ctx.stroke();
        }

        for (let charge of physics.charges) {
            this.ctx.beginPath();
            this.ctx.arc(charge.x, charge.y, 15, 0, Math.PI * 2);
            this.ctx.fillStyle = charge.q > 0 ? '#3b82f6' : '#ef4444';
            this.ctx.shadowColor = charge.q > 0 ? '#3b82f6' : '#ef4444';
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(charge.q > 0 ? '+' : '-', charge.x, charge.y);
        }

        if (physics.testCharge) {
            if (!physics.testCharge.crashed) {
                this.ctx.beginPath();
                this.ctx.arc(physics.testCharge.x, physics.testCharge.y, 10, 0, Math.PI * 2);
                this.ctx.fillStyle = '#10b981';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#10b981';
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('+', physics.testCharge.x, physics.testCharge.y);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(physics.testCharge.x, physics.testCharge.y, 15, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ef4444';
                this.ctx.fill();
            }
        }
    }
}
