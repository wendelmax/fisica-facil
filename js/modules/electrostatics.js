function initElectrostaticsModule() {
    const canvas = document.getElementById('elec-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const chargeMagInput = document.getElementById('elec-charge-mag');
    const chargeMagVal = document.getElementById('elec-charge-val');
    const showFieldCheck = document.getElementById('show-field');
    const resetBtn = document.getElementById('elec-reset-btn');
    const addPosBtn = document.getElementById('add-pos-btn');
    const addNegBtn = document.getElementById('add-neg-btn');
    
    const statForce = document.getElementById('stat-elec-force');
    const statDist = document.getElementById('stat-elec-dist');

    // Formula UI Elements
    const formulaModeToggle = document.getElementById('elec-formula-mode');
    const manualControls = document.getElementById('elec-manual-controls');
    const formulaControls = document.getElementById('elec-formula-controls');
    const varDEl = document.getElementById('elec-var-d');
    const formulaCharge = document.getElementById('elec-formula-charge');
    const calcBtn = document.getElementById('elec-calc-btn');
    const calcResult = document.getElementById('elec-calc-result');

    let width, height;
    let animationId = null;

    // Physics Constants
    const K = 5000; // Simplified Coulomb constant for visual scaling
    
    let charges = [];
    let testCharge = null;
    let target = null;
    let isDragging = false;
    let dragTarget = null;

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        width = canvas.width;
        height = canvas.height;
        resetSimulation();
    }
    
    window.addEventListener('resize', resizeCanvas);

    chargeMagInput.addEventListener('input', (e) => {
        chargeMagVal.innerText = e.target.value;
    });

    addPosBtn.addEventListener('click', () => {
        addCharge(parseFloat(chargeMagInput.value));
    });

    addNegBtn.addEventListener('click', () => {
        addCharge(-parseFloat(chargeMagInput.value));
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

        const chargeStr = formulaCharge.value;

        const vars = {
            d: currentDistance,
            k: K,
            qProva: 10
        };

        const calculatedCharge = window.PhysicsUtils.evaluateFormula(chargeStr, vars);

        if (calculatedCharge === null) {
            calcResult.style.color = 'var(--danger)';
            calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        if (isNaN(calculatedCharge)) {
             calcResult.style.color = 'var(--danger)';
             calcResult.innerText = 'Resultado inválido (NaN).';
             return;
        }

        // Apply
        const clampedCharge = Math.max(10, Math.min(200, Math.abs(calculatedCharge)));
        
        chargeMagInput.value = clampedCharge;
        chargeMagVal.innerText = clampedCharge.toFixed(1);

        calcResult.style.color = 'var(--accent-tertiary)';
        calcResult.innerText = `Sucesso! Carga = ${clampedCharge.toFixed(1)} μC`;
    });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if clicking a charge to drag
        for (let charge of charges) {
            const dist = Math.hypot(charge.x - mouseX, charge.y - mouseY);
            if (dist < 20) {
                isDragging = true;
                dragTarget = charge;
                return;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && dragTarget) {
            const rect = canvas.getBoundingClientRect();
            dragTarget.x = e.clientX - rect.left;
            dragTarget.y = e.clientY - rect.top;
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        dragTarget = null;
    });

    function addCharge(q) {
        charges.push({
            x: width / 2 + (Math.random() - 0.5) * 100,
            y: height / 2 + (Math.random() - 0.5) * 100,
            q: q
        });
    }

    function resetSimulation() {
        charges = [];
        testCharge = {
            x: 50,
            y: height / 2,
            vx: 0,
            vy: 0,
            q: 10 // Positive test charge
        };
        
        target = {
            x: width - 80,
            y: height / 2,
            radius: 30,
            hit: false
        };
        
        currentDistance = Math.hypot(testCharge.x - target.x, testCharge.y - target.y);
        varDEl.innerText = currentDistance.toFixed(1);

        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(updateAndDraw);
    }

    function updateAndDraw() {
        updatePhysics();
        drawScene();
        animationId = requestAnimationFrame(updateAndDraw);
    }

    function updatePhysics() {
        if (target.hit) return;

        let fx = 0;
        let fy = 0;

        for (let charge of charges) {
            const dx = testCharge.x - charge.x;
            const dy = testCharge.y - charge.y;
            const r2 = dx * dx + dy * dy;
            const r = Math.sqrt(r2);
            
            if (r < 10) continue; // Prevent infinite force

            // F = K * q1 * q2 / r^2
            const f = (K * testCharge.q * charge.q) / r2;
            fx += f * (dx / r);
            fy += f * (dy / r);
        }

        // Apply force as acceleration (simplified)
        testCharge.vx += fx * 0.01;
        testCharge.vy += fy * 0.01;
        
        // Add some "air resistance" to keep things controllable
        testCharge.vx *= 0.98;
        testCharge.vy *= 0.98;

        testCharge.x += testCharge.vx;
        testCharge.y += testCharge.vy;

        // Boundary checks
        if (testCharge.x < 0 || testCharge.x > width) testCharge.vx *= -0.5;
        if (testCharge.y < 0 || testCharge.y > height) testCharge.vy *= -0.5;

        // Check target hit
        const distToTarget = Math.hypot(testCharge.x - target.x, testCharge.y - target.y);
        if (distToTarget < target.radius) {
            target.hit = true;
            window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 200 } }));
            setTimeout(resetSimulation, 2000);
        }

        statForce.innerText = Math.hypot(fx, fy).toFixed(2);
        statDist.innerText = distToTarget.toFixed(2);
    }

    function drawScene() {
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        if (showFieldCheck.checked) {
            drawFieldLines();
        }

        // Draw Target
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
        ctx.strokeStyle = target.hit ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = target.hit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.1)';
        ctx.fill();

        // Draw Charges
        for (let charge of charges) {
            ctx.beginPath();
            ctx.arc(charge.x, charge.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = charge.q > 0 ? '#3b82f6' : '#ef4444';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(charge.q > 0 ? '+' : '-', charge.x, charge.y);
        }

        // Draw Test Charge
        ctx.beginPath();
        ctx.arc(testCharge.x, testCharge.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawFieldLines() {
        const step = 40;
        for (let x = step / 2; x < width; x += step) {
            for (let y = step / 2; y < height; y += step) {
                let fx = 0;
                let fy = 0;

                for (let charge of charges) {
                    const dx = x - charge.x;
                    const dy = y - charge.y;
                    const r2 = dx * dx + dy * dy;
                    const r = Math.sqrt(r2);
                    if (r < 10) continue;

                    const f = (K * charge.q) / r2;
                    fx += f * (dx / r);
                    fy += f * (dy / r);
                }

                const mag = Math.hypot(fx, fy);
                if (mag > 0.1) {
                    const len = Math.min(step * 0.4, mag * 2);
                    const angle = Math.atan2(fy, fx);
                    
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
                    ctx.stroke();
                }
            }
        }
    }

    setTimeout(resizeCanvas, 100);
}
