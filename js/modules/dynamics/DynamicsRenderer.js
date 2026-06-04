export class DynamicsRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        this.scale = 10;
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    drawArrow(ctx, fromx, fromy, tox, toy, color){
        const headlen = 8;
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    draw(physics, currentScenario) {
        if (!this.ctx || !physics.scenarioConfig) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.save();

        const config = physics.scenarioConfig;

        // Sky
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (config.angle !== 0) {
            this.ctx.translate(0, this.height - 20);
            this.ctx.rotate(config.angle);
            this.ctx.translate(0, -(this.height - 20));
        }

        // Ground
        if (currentScenario === 'mixed') {
            this.ctx.fillStyle = '#bae6fd';
            this.ctx.fillRect(0, this.height - 20, this.width/2, 20);
            this.ctx.fillStyle = '#fde047';
            this.ctx.fillRect(this.width/2, this.height - 20, this.width, 20);
        } else {
            this.ctx.fillStyle = '#475569';
            this.ctx.fillRect(0, this.height - 20, this.width * 2, 20);
        }

        // Target Area
        if(physics.targetArea) {
            this.ctx.fillStyle = physics.targetArea.hit ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
            this.ctx.fillRect(physics.targetArea.x, this.height - 20, physics.targetArea.width, 20);
            this.ctx.fillStyle = physics.targetArea.hit ? '#10b981' : '#ef4444';
            this.ctx.font = '14px Arial';
            this.ctx.fillText("Alvo", physics.targetArea.x + 20, this.height - 4);
        }

        // Distance markers
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for(let x=50; x<this.width*2; x+=50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.height-20);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        if (physics.block) {
            const blockY = this.height - 20 - physics.block.size;
            this.ctx.fillStyle = '#8b5cf6';
            this.ctx.shadowColor = '#8b5cf6';
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(physics.block.x, blockY, physics.block.size, physics.block.size);
            this.ctx.shadowBlur = 0;
            
            const cx = physics.block.x + physics.block.size/2;
            const cy = blockY + physics.block.size/2;
            
            this.drawArrow(this.ctx, cx, blockY, cx, blockY - 30, '#10b981');
            
            this.ctx.save();
            this.ctx.translate(cx, blockY + physics.block.size);
            if (config.angle !== 0) {
                this.ctx.rotate(-config.angle);
            }
            this.drawArrow(this.ctx, 0, 0, 0, 40, '#10b981');
            this.ctx.restore();
            
            if (physics.appliedForce > 0) {
                this.drawArrow(this.ctx, physics.block.x, cy, physics.block.x + 40, cy, '#3b82f6');
            }
            
            const forces = physics.calculateForces();
            if (forces.currentMu > 0 && (physics.block.vx !== 0 || physics.appliedForce > 0)) {
                const dir = physics.block.vx < 0 ? 1 : -1;
                this.drawArrow(this.ctx, physics.block.x + (dir>0?physics.block.size:0), cy + 10, physics.block.x + (dir>0?physics.block.size:0) + dir * 30, cy + 10, '#ef4444');
            }
        }
        
        this.ctx.restore();
    }
}
