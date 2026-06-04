export class ProjectileRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        this.scale = 5; // Pixels per meter
        this.particles = [];
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    createExplosion(x, y) {
        for(let i=0; i<30; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`,
                alpha: 1,
                size: Math.random() * 4 + 2
            });
        }
    }

    updateParticles() {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;
            if(p.alpha <= 0) this.particles.splice(i, 1);
        }
    }

    // Convert physics Y (upwards from ground) to canvas Y (downwards from top)
    toCanvasY(y) {
        return (this.height - 20) - y;
    }

    draw(physics, predictedPath) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw sky gradient
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Ground
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(0, this.height - 20, this.width, 20);
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 20);
        this.ctx.lineTo(this.width, this.height - 20);
        this.ctx.stroke();

        // Grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for(let x = 40; x < this.width; x += 50 * this.scale) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height - 20);
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`${((x-40)/this.scale)}m`, x - 10, this.height - 5);
        }

        // Draw Wall
        if (physics.wall) {
            this.ctx.fillStyle = '#64748b';
            const cy = this.toCanvasY(physics.wall.height);
            this.ctx.fillRect(physics.wall.x, cy, physics.wall.width, physics.wall.height);
        }

        // Draw Target
        if (physics.target) {
            this.ctx.fillStyle = physics.target.hit ? '#ef4444' : '#10b981';
            this.ctx.shadowColor = physics.target.hit ? '#ef4444' : '#10b981';
            this.ctx.shadowBlur = 10;
            const cy = this.toCanvasY(physics.target.height);
            this.ctx.fillRect(physics.target.x, cy, physics.target.width, physics.target.height);
            this.ctx.shadowBlur = 0;
            
            // Draw moving vector
            if (physics.target.moving && !physics.target.hit) {
                this.ctx.strokeStyle = '#10b981';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(physics.target.x + physics.target.width/2, cy - 5);
                const dir = physics.target.vx > 0 ? 1 : -1;
                this.ctx.lineTo(physics.target.x + physics.target.width/2 + dir * 20, cy - 5);
                this.ctx.stroke();
            }
        }

        // Draw Cannon
        this.ctx.save();
        this.ctx.translate(40, this.height - 20);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 15, Math.PI, 0);
        this.ctx.fill();
        
        // Barrel
        if (predictedPath && predictedPath.theta !== undefined) {
             this.ctx.rotate(-predictedPath.theta);
        }
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.fillRect(0, -8, 40, 16);
        this.ctx.restore();

        // Draw trajectory path
        if (physics.path && physics.path.length > 0) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.moveTo(physics.path[0].x, this.toCanvasY(physics.path[0].y));
            for(let i=1; i<physics.path.length; i++) {
                this.ctx.lineTo(physics.path[i].x, this.toCanvasY(physics.path[i].y));
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw Predicted Trajectory
        if (predictedPath && !physics.isFlying) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            
            this.ctx.moveTo(40, this.height - 20);
            predictedPath.points.forEach(p => {
                this.ctx.lineTo(p.x, this.toCanvasY(p.y));
            });
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw Projectile
        if (physics.isFlying) {
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.shadowColor = '#3b82f6';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(physics.x, this.toCanvasY(physics.y), 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }
}
