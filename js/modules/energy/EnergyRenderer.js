export class EnergyRenderer {
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

    draw(physics) {
        if (!this.ctx || !physics.ball) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();

        let first = true;
        
        if (physics.currentScenario === 'radar') {
            let startX = -Math.sqrt(10.0 / 0.1) * physics.pixelPerMeter;
            for(let x = startX; x <= 10.0 * physics.pixelPerMeter; x+=5) {
                let ty = physics.getTrackY(x);
                let cx = physics.trackOriginX + x;
                let cy = physics.trackOriginY - ty;
                if(first) { this.ctx.moveTo(cx, cy); first = false; }
                else this.ctx.lineTo(cx, cy);
            }
            this.ctx.stroke();
            
            let rX = physics.trackOriginX + 5.0 * physics.pixelPerMeter;
            let rY = physics.trackOriginY;
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(rX - 5, rY - 30, 10, 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Inter';
            this.ctx.fillText('RADAR', rX - 20, rY - 40);
        } 
        else if (physics.currentScenario === 'jump') {
            let startX = (-Math.sqrt((10.0 + 2.0) / 0.125) - 4) * physics.pixelPerMeter;
            for(let x = startX; x <= 0; x+=5) {
                let ty = physics.getTrackY(x);
                let cx = physics.trackOriginX + x;
                let cy = physics.trackOriginY - ty;
                if(first) { this.ctx.moveTo(cx, cy); first = false; }
                else this.ctx.lineTo(cx, cy);
            }
            this.ctx.stroke();
            
            this.ctx.beginPath();
            let pX = physics.trackOriginX + 15.0 * physics.pixelPerMeter;
            let pY = physics.trackOriginY;
            let pWidth = 5.0 * physics.pixelPerMeter;
            this.ctx.moveTo(pX, pY);
            this.ctx.lineTo(pX + pWidth, pY);
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillRect(pX, pY, pWidth, this.height - pY);
            this.ctx.globalAlpha = 1.0;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('PLATAFORMA', pX + pWidth/4, pY + 30);
        }
        else if (physics.currentScenario === 'loop') {
            let startX = -Math.sqrt(10.0 / 0.1) * physics.pixelPerMeter;
            for(let x = startX; x <= 0; x+=5) {
                let ty = physics.getTrackY(x);
                let cx = physics.trackOriginX + x;
                let cy = physics.trackOriginY - ty;
                if(first) { this.ctx.moveTo(cx, cy); first = false; }
                else this.ctx.lineTo(cx, cy);
            }
            this.ctx.stroke();
            
            let R = 3.0 * physics.pixelPerMeter;
            this.ctx.arc(physics.trackOriginX, physics.trackOriginY - R, R, Math.PI/2, -Math.PI*1.5, true);
            this.ctx.lineTo(physics.trackOriginX + 10.0 * physics.pixelPerMeter, physics.trackOriginY);
            this.ctx.stroke();
        }

        // Draw Ball
        let cx = physics.trackOriginX + physics.ball.x;
        let cy = physics.trackOriginY - physics.ball.y;
        
        this.ctx.fillStyle = '#10b981';
        this.ctx.shadowColor = '#10b981';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy - 10, 10 + (physics.mass/4), 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Draw velocity vector
        let vLen = Math.abs(physics.ball.v);
        if (physics.ball.state === 'air' || physics.ball.state === 'fall') {
            vLen = Math.sqrt(physics.ball.vx*physics.ball.vx + physics.ball.vy*physics.ball.vy);
        }
        
        if (physics.isPlaying && vLen > 1) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#ef4444';
            this.ctx.lineWidth = 2;
            this.ctx.moveTo(cx, cy - 10);
            
            let vx, vy;
            if (physics.ball.state === 'air' || physics.ball.state === 'fall') {
                vx = physics.ball.vx; vy = physics.ball.vy;
            } else if (physics.ball.state === 'loop') {
                let angle = physics.ball.loopAngle + Math.PI/2;
                vx = Math.cos(angle) * physics.ball.v;
                vy = Math.sin(angle) * physics.ball.v;
            } else {
                let slope = physics.getTrackSlope(physics.ball.x);
                let angle = Math.atan(slope);
                vx = Math.cos(angle) * physics.ball.v;
                vy = Math.sin(angle) * physics.ball.v;
            }
            
            let len = Math.sqrt(vx*vx + vy*vy);
            vx /= len; vy /= len;
            
            this.ctx.lineTo(cx + vx * 30, cy - 10 - vy * 30);
            this.ctx.stroke();
        }
    }
}
