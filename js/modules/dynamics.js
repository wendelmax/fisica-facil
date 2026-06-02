function initDynamicsModule() {
    const canvas = document.getElementById('dyn-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const massInput = document.getElementById('dyn-mass');
    const massVal = document.getElementById('dyn-mass-val');
    const forceInput = document.getElementById('dyn-force');
    const forceVal = document.getElementById('dyn-force-val');
    const frictionInput = document.getElementById('dyn-friction');
    const frictionVal = document.getElementById('dyn-friction-val');
    
    const pushBtn = document.getElementById('dyn-push-btn');
    const resetBtn = document.getElementById('dyn-reset-btn');
    
    const statFres = document.getElementById('stat-fres');
    const statAccel = document.getElementById('stat-accel');
    const statVel = document.getElementById('stat-dyn-vel');

    // Formula UI Elements
    const formulaModeToggle = document.getElementById('dyn-formula-mode');
    const manualControls = document.getElementById('dyn-manual-controls');
    const formulaControls = document.getElementById('dyn-formula-controls');
    const varDEl = document.getElementById('dyn-var-d');
    const formulaMass = document.getElementById('dyn-formula-mass');
    const formulaFric = document.getElementById('dyn-formula-fric');
    const formulaForce = document.getElementById('dyn-formula-force');
    const calcBtn = document.getElementById('dyn-calc-btn');
    const calcResult = document.getElementById('dyn-calc-result');

    let width, height;
    let animationId = null;

    // Simulation Config
    const scale = 10; // pixels per meter
    const g = 9.81;
    
    let isPlaying = false;
    let block = null;
    let targetArea = null;
    let lastTime = 0;
    
    // Physical state
    let mass = parseFloat(massInput.value);
    let appliedForce = parseFloat(forceInput.value);
    let mu = parseFloat(frictionInput.value);
    
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        width = canvas.width;
        height = canvas.height;
        resetSimulation();
    }
    
    // Make sure we only add listener once per module or handle resize safely
    window.addEventListener('resize', resizeCanvas);

    massInput.addEventListener('input', (e) => {
        massVal.innerText = e.target.value;
        mass = parseFloat(e.target.value);
        if(!isPlaying) updateStats();
    });
    forceInput.addEventListener('input', (e) => {
        forceVal.innerText = e.target.value;
        appliedForce = parseFloat(e.target.value);
        if(!isPlaying) updateStats();
    });
    frictionInput.addEventListener('input', (e) => {
        frictionVal.innerText = e.target.value;
        mu = parseFloat(e.target.value);
        if(!isPlaying) updateStats();
    });

    pushBtn.addEventListener('click', () => {
        if (!isPlaying) {
            isPlaying = true;
            lastTime = performance.now();
            animationId = requestAnimationFrame(updateAndDraw);
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

        const mStr = formulaMass.value;
        const muStr = formulaFric.value;
        const forceStr = formulaForce.value;

        const vars = {
            d: currentDistance,
            g: g,
            m: parseFloat(mStr) || 10,
            mu: parseFloat(muStr) || 0.2
        };

        const calculatedMass = window.PhysicsUtils.evaluateFormula(mStr, vars);
        const calculatedFric = window.PhysicsUtils.evaluateFormula(muStr, vars);
        
        // Update vars before calculating force
        vars.m = calculatedMass !== null ? calculatedMass : vars.m;
        vars.mu = calculatedFric !== null ? calculatedFric : vars.mu;
        
        const calculatedForce = window.PhysicsUtils.evaluateFormula(forceStr, vars);

        if (calculatedForce === null || calculatedMass === null || calculatedFric === null) {
            calcResult.style.color = 'var(--danger)';
            calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        if (isNaN(calculatedForce)) {
             calcResult.style.color = 'var(--danger)';
             calcResult.innerText = 'Resultado inválido (NaN).';
             return;
        }

        // Apply
        const clampedMass = Math.max(1, Math.min(50, calculatedMass));
        const clampedFric = Math.max(0, Math.min(1, calculatedFric));
        const clampedForce = Math.max(0, Math.min(300, calculatedForce));
        
        massInput.value = clampedMass;
        massVal.innerText = clampedMass.toFixed(1);
        mass = clampedMass;

        frictionInput.value = clampedFric;
        frictionVal.innerText = clampedFric.toFixed(2);
        mu = clampedFric;

        forceInput.value = clampedForce;
        forceVal.innerText = clampedForce.toFixed(1);
        appliedForce = clampedForce;

        calcResult.style.color = 'var(--accent-tertiary)';
        calcResult.innerText = `Sucesso! F = ${clampedForce.toFixed(1)} N`;
        
        if(!isPlaying) {
            updateStats();
            drawScene();
        }
    });

    function updateStats() {
        const normalForce = mass * g;
        const frictionForce = mu * normalForce;
        let netForce = appliedForce - frictionForce;
        
        if (netForce < 0 && block && block.vx <= 0) {
            netForce = 0; // Won't move backwards
        }
        
        const accel = netForce / mass;
        
        statFres.innerText = netForce.toFixed(2);
        statAccel.innerText = accel.toFixed(2);
        
        if(block) statVel.innerText = block.vx.toFixed(2);
    }

    function resetSimulation() {
        if (animationId) cancelAnimationFrame(animationId);
        isPlaying = false;
        
        block = {
            x: 50,
            y: height - 60,
            size: 40,
            vx: 0,
            vy: 0
        };
        
        // Target area far away
        const minX = 200;
        const maxX = width - 100;
        targetArea = {
            x: Math.random() * (maxX - minX) + minX,
            width: 80,
            hit: false
        };
        
        currentDistance = (targetArea.x - 50) / scale;
        varDEl.innerText = currentDistance.toFixed(1);
        
        updateStats();
        drawScene();
    }

    function updateAndDraw(currentTime) {
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        if (isPlaying) {
            const normalForce = mass * g;
            const frictionForce = mu * normalForce;
            let netForce = appliedForce;
            
            // Apply kinetic friction if moving, or static friction limit if stopped
            if (block.vx > 0) {
                netForce -= frictionForce;
            } else if (appliedForce > frictionForce) {
                netForce -= frictionForce;
            } else {
                netForce = 0;
            }
            
            const accel = netForce / mass;
            
            // Stop applying force after 1 second of pushing, then let it slide
            // (Creates a more interesting game mechanic)
            if (block.x > 100) {
                appliedForce = 0; // User push ends
                forceInput.value = 0;
                forceVal.innerText = 0;
            }

            block.vx += accel * dt;
            if (block.vx < 0) {
                block.vx = 0;
                isPlaying = false; // Stopped
                checkWin();
            }
            
            block.x += block.vx * scale * dt;
            
            // Reached the end of screen
            if (block.x > width) {
                isPlaying = false;
                checkWin();
            }
            
            updateStats();
        }
        
        drawScene();
        
        if (isPlaying) {
            animationId = requestAnimationFrame(updateAndDraw);
        }
    }

    function checkWin() {
        const center = block.x + block.size/2;
        if (center >= targetArea.x && center <= targetArea.x + targetArea.width) {
            targetArea.hit = true;
            window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 150 } }));
        }
        drawScene();
    }

    function drawScene() {
        ctx.clearRect(0, 0, width, height);

        // Sky
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Ground
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, height - 20, width, 20);

        // Target Area
        if(targetArea) {
            ctx.fillStyle = targetArea.hit ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(targetArea.x, height - 20, targetArea.width, 20);
            ctx.fillStyle = targetArea.hit ? '#10b981' : '#ef4444';
            ctx.font = '14px Arial';
            ctx.fillText("Alvo", targetArea.x + 20, height - 4);
        }

        // Distance markers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for(let x=50; x<width; x+=50) {
            ctx.beginPath();
            ctx.moveTo(x, height-20);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        if (block) {
            // Draw Block
            ctx.fillStyle = '#8b5cf6';
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = 10;
            ctx.fillRect(block.x, block.y, block.size, block.size);
            ctx.shadowBlur = 0;
            
            // Draw Vectors
            const cx = block.x + block.size/2;
            const cy = block.y + block.size/2;
            
            // Normal
            drawArrow(ctx, cx, block.y, cx, block.y - 30, '#10b981');
            // Gravity
            drawArrow(ctx, cx, block.y + block.size, cx, block.y + block.size + 30, '#10b981');
            
            // Applied Force
            if (appliedForce > 0) {
                drawArrow(ctx, block.x, cy, block.x + 40, cy, '#3b82f6');
            }
            // Friction
            if (mu > 0 && (block.vx > 0 || appliedForce > 0)) {
                drawArrow(ctx, block.x, cy + 10, block.x - 30, cy + 10, '#ef4444');
            }
        }
    }
    
    function drawArrow(ctx, fromx, fromy, tox, toy, color){
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

    setTimeout(resizeCanvas, 100);
}
