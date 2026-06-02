function initProjectileModule() {
    const canvas = document.getElementById('sim-canvas');
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const angleInput = document.getElementById('angle');
    const angleVal = document.getElementById('angle-val');
    const velocityInput = document.getElementById('velocity');
    const velocityVal = document.getElementById('velocity-val');
    const fireBtn = document.getElementById('fire-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    const statTime = document.getElementById('stat-time');
    const statDistance = document.getElementById('stat-distance');
    const statHeight = document.getElementById('stat-height');

    // Formula UI Elements
    const formulaModeToggle = document.getElementById('proj-formula-mode');
    const manualControls = document.getElementById('proj-manual-controls');
    const formulaControls = document.getElementById('proj-formula-controls');
    const varDEl = document.getElementById('proj-var-d');
    const formulaAngle = document.getElementById('proj-formula-angle');
    const formulaVel = document.getElementById('proj-formula-vel');
    const calcBtn = document.getElementById('proj-calc-btn');
    const calcResult = document.getElementById('proj-calc-result');
    const feedbackEl = document.getElementById('proj-feedback');

    // Physics Constants
    const g = 9.81; // Gravity (m/s^2)
    const scale = 5; // Pixels per meter

    let width, height;
    let animationId = null;

    // Simulation State
    let isFlying = false;
    let projectile = null;
    let target = null;
    let particles = []; // For explosion effects
    
    // Initial conditions
    let v0 = parseInt(velocityInput.value);
    let theta = parseInt(angleInput.value) * (Math.PI / 180);
    let consecutiveFailures = 0;

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        width = canvas.width;
        height = canvas.height;
        resetSimulation();
    }

    window.addEventListener('resize', resizeCanvas);

    // Event Listeners for inputs
    angleInput.addEventListener('input', (e) => {
        angleVal.innerText = e.target.value;
        theta = parseInt(e.target.value) * (Math.PI / 180);
        if(!isFlying) drawScene();
    });

    velocityInput.addEventListener('input', (e) => {
        velocityVal.innerText = e.target.value;
        v0 = parseInt(e.target.value);
        if(!isFlying) drawScene();
    });

    fireBtn.addEventListener('click', () => {
        if (!isFlying) {
            startSimulation();
        }
    });

    resetBtn.addEventListener('click', resetSimulation);

    // Formula logic
    formulaModeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            manualControls.style.display = 'none';
            formulaControls.style.display = 'flex';
        } else {
            manualControls.style.display = 'block';
            formulaControls.style.display = 'none';
        }
    });

    let currentDistance = 0;

    calcBtn.addEventListener('click', () => {
        calcResult.style.color = '';
        calcResult.innerText = '';

        const angleStr = formulaAngle.value;
        const velStr = formulaVel.value;

        const vars = {
            d: currentDistance,
            g: g
        };

        const calculatedAngle = window.PhysicsUtils.evaluateFormula(angleStr, vars);
        const calculatedVel = window.PhysicsUtils.evaluateFormula(velStr, vars);

        if (calculatedAngle === null || calculatedVel === null) {
            calcResult.style.color = 'var(--danger)';
            calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        if (isNaN(calculatedAngle) || isNaN(calculatedVel)) {
             calcResult.style.color = 'var(--danger)';
             calcResult.innerText = 'Resultado inválido (NaN). Verifique os cálculos.';
             return;
        }

        // Apply calculated values to the manual inputs so the simulation uses them
        const clampedAngle = Math.max(0, Math.min(90, calculatedAngle));
        const clampedVel = Math.max(10, Math.min(100, calculatedVel));
        
        angleInput.value = clampedAngle;
        angleVal.innerText = clampedAngle.toFixed(1);
        theta = clampedAngle * (Math.PI / 180);

        velocityInput.value = clampedVel;
        velocityVal.innerText = clampedVel.toFixed(1);
        v0 = clampedVel;

        calcResult.style.color = 'var(--accent-tertiary)';
        calcResult.innerText = `Sucesso! Ângulo = ${clampedAngle.toFixed(1)}°, V0 = ${clampedVel.toFixed(1)} m/s`;
        
        if(!isFlying) drawScene();
    });

    function generateTarget() {
        // Random distance between 50m and (canvas_width/scale - 20)m
        const minX = 50 * scale;
        const maxX = width - 100;
        const targetX = Math.random() * (maxX - minX) + minX;
        
        target = {
            x: targetX,
            y: height - 20, // Ground level is height - 20
            width: 40,
            height: 10,
            hit: false
        };
        
        currentDistance = (targetX - 40) / scale;
        varDEl.innerText = currentDistance.toFixed(1);
    }

    function resetSimulation() {
        if (animationId) cancelAnimationFrame(animationId);
        isFlying = false;
        particles = [];
        projectile = {
            x: 0,
            y: height - 20,
            vx: 0,
            vy: 0,
            time: 0,
            path: [],
            startX: 40, // Cannon barrel end X roughly
            startY: height - 20
        };
        
        statTime.innerText = "0.00";
        statDistance.innerText = "0.00";
        statHeight.innerText = "0.00";
        
        generateTarget();
        drawScene();
    }

    function startSimulation() {
        isFlying = true;
        projectile.x = 40; // Initial x
        projectile.y = height - 20; // Initial y
        projectile.vx = v0 * Math.cos(theta);
        projectile.vy = -v0 * Math.sin(theta); // Negative because y goes down in canvas
        projectile.time = 0;
        projectile.path = [];
        projectile.maxHeight = 0;
        
        lastTime = performance.now();
        animationId = requestAnimationFrame(updateAndDraw);
    }

    let lastTime = 0;
    function updateAndDraw(currentTime) {
        const dt = (currentTime - lastTime) / 1000; // in seconds
        lastTime = currentTime;

        // Speed up simulation time slightly for better UX
        const simDt = dt * 2.5; 

        if (isFlying) {
            projectile.time += simDt;
            
            // Basic kinematics equations
            // x = v0 * cos(theta) * t
            // y = v0 * sin(theta) * t - 0.5 * g * t^2
            
            // In canvas coordinates, y is inverted
            const currentX = projectile.vx * projectile.time;
            const currentY = (projectile.vy * projectile.time) + (0.5 * g * scale * projectile.time * projectile.time);
            
            projectile.x = projectile.startX + currentX * scale;
            projectile.y = projectile.startY + currentY * scale;

            // Save path
            if (projectile.path.length === 0 || 
                Math.abs(projectile.path[projectile.path.length-1].x - projectile.x) > 5) {
                projectile.path.push({x: projectile.x, y: projectile.y});
            }

            // Track max height
            const currentHeightMeters = (height - 20 - projectile.y) / scale;
            if (currentHeightMeters > projectile.maxHeight) {
                projectile.maxHeight = currentHeightMeters;
            }

            // Update stats
            statTime.innerText = projectile.time.toFixed(2);
            statDistance.innerText = ((projectile.x - projectile.startX) / scale).toFixed(2);
            statHeight.innerText = Math.max(0, projectile.maxHeight).toFixed(2);

            // Collision with ground
            if (projectile.y >= height - 20) {
                projectile.y = height - 20;
                isFlying = false;
                checkTargetHit();
            }
        }

        // Update particles
        for(let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;
            if(p.alpha <= 0) particles.splice(i, 1);
        }

        drawScene();

        if (isFlying || particles.length > 0) {
            animationId = requestAnimationFrame(updateAndDraw);
        }
    }

    function checkTargetHit() {
        const impactX = projectile.x;
        if (impactX >= target.x - 20 && impactX <= target.x + target.width + 20) {
            target.hit = true;
            createExplosion(target.x + target.width/2, target.y);
            window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 100 } }));
            if(window.logActivity) window.logActivity(`Acertou o alvo no Lançamento de Projétil com V0=${v0} e Ângulo=${(theta * 180 / Math.PI).toFixed(0)}°`);
            consecutiveFailures = 0;
            if(feedbackEl) feedbackEl.style.display = 'none';
            
            // Change target location after short delay
            setTimeout(() => {
                if(!isFlying) generateTarget();
                if(!isFlying) drawScene();
            }, 2000);
        } else {
            consecutiveFailures++;
            if(window.logActivity) window.logActivity(`Errou o alvo no Lançamento de Projétil. Distância alcançada: ${((impactX - 40) / scale).toFixed(2)}m`);
            if (consecutiveFailures >= 2 && feedbackEl) {
                feedbackEl.style.display = 'block';
                if (impactX < target.x) {
                    feedbackEl.innerHTML = '<strong>Dica:</strong> O projétil caiu ANTES do alvo. Tente aumentar a velocidade ou ajustar o ângulo para mais perto de 45° (alcance máximo). Verifique a aba de Teoria!';
                } else {
                    feedbackEl.innerHTML = '<strong>Dica:</strong> O projétil passou do alvo. Tente diminuir a velocidade ou alterar o ângulo para encurtar a distância.';
                }
            }
        }
    }

    function createExplosion(x, y) {
        for(let i=0; i<30; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`,
                alpha: 1,
                size: Math.random() * 4 + 2
            });
        }
        if(!animationId) {
            lastTime = performance.now();
            animationId = requestAnimationFrame(updateAndDraw);
        }
    }

    function drawScene() {
        // Clear background
        ctx.clearRect(0, 0, width, height);

        // Draw sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f172a'); // top dark
        grad.addColorStop(1, '#1e293b'); // bottom slightly lighter
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Draw Ground
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, height - 20, width, 20);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height - 20);
        ctx.lineTo(width, height - 20);
        ctx.stroke();

        // Grid lines for distance
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for(let x = 40; x < width; x += 50 * scale) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height - 20);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px Arial';
            ctx.fillText(`${((x-40)/scale)}m`, x - 10, height - 5);
        }

        // Draw Target
        if (target) {
            ctx.fillStyle = target.hit ? '#ef4444' : '#10b981';
            ctx.shadowColor = target.hit ? '#ef4444' : '#10b981';
            ctx.shadowBlur = 10;
            ctx.fillRect(target.x, target.y - target.height, target.width, target.height);
            // reset shadow
            ctx.shadowBlur = 0;
        }

        // Draw Cannon
        ctx.save();
        ctx.translate(40, height - 20);
        
        // Base
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, 0, 15, Math.PI, 0);
        ctx.fill();
        
        // Barrel
        ctx.rotate(-theta);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, -8, 40, 16);
        ctx.restore();

        // Draw trajectory path
        if (projectile && projectile.path.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'; // accent-secondary
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(projectile.path[0].x, projectile.path[0].y);
            for(let i=1; i<projectile.path.length; i++) {
                ctx.lineTo(projectile.path[i].x, projectile.path[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Predicted Trajectory (if not flying)
        if (!isFlying) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            let px = 40;
            let py = height - 20;
            ctx.moveTo(px, py);
            
            let pvx = v0 * Math.cos(theta);
            let pvy = -v0 * Math.sin(theta);
            let pt = 0;
            
            while(py <= height - 20 && pt < 20) {
                pt += 0.2;
                let cx = pvx * pt;
                let cy = (pvy * pt) + (0.5 * g * scale * pt * pt);
                px = 40 + cx * scale;
                py = (height - 20) + cy * scale;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Projectile
        if (isFlying && projectile) {
            ctx.fillStyle = '#3b82f6'; // accent-primary
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // Initial Setup
    // setTimeout to ensure layout is done
    setTimeout(resizeCanvas, 100);
}
