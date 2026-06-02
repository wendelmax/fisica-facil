function initEnergyModule() {
    const canvas = document.getElementById('en-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const heightInput = document.getElementById('en-height');
    const heightVal = document.getElementById('en-height-val');
    const massInput = document.getElementById('en-mass');
    const massVal = document.getElementById('en-mass-val');
    const frictionCheck = document.getElementById('en-friction');
    
    const dropBtn = document.getElementById('en-drop-btn');
    const resetBtn = document.getElementById('en-reset-btn');
    
    const statPE = document.getElementById('stat-pe');
    const statKE = document.getElementById('stat-ke');
    const statTE = document.getElementById('stat-te');
    
    const barPE = document.getElementById('bar-pe');
    const barKE = document.getElementById('bar-ke');

    // Formula UI Elements
    const formulaModeToggle = document.getElementById('en-formula-mode');
    const manualControls = document.getElementById('en-manual-controls');
    const formulaControls = document.getElementById('en-formula-controls');
    const varMEl = document.getElementById('en-var-m');
    const formulaMass = document.getElementById('en-formula-mass');
    const formulaHeight = document.getElementById('en-formula-height');
    const calcBtn = document.getElementById('en-calc-btn');
    const calcResult = document.getElementById('en-calc-result');

    let width, height;
    let animationId = null;

    const g = 9.81;
    let isPlaying = false;
    let lastTime = 0;
    
    let mass = parseFloat(massInput.value);
    let startHeightPercent = parseFloat(heightInput.value) / 100;
    
    // Physical state for 1D motion along a track
    let ball = null;
    // Track shape: A simple parabola y = a * x^2
    let trackCenter = 0;
    let trackA = 0.005; 
    let maxTrackHeight = 0;

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        width = canvas.width;
        height = canvas.height;
        
        trackCenter = width / 2;
        maxTrackHeight = height - 60; // Space at bottom
        
        resetSimulation();
    }
    window.addEventListener('resize', resizeCanvas);

    heightInput.addEventListener('input', (e) => {
        heightVal.innerText = e.target.value;
        startHeightPercent = parseFloat(e.target.value) / 100;
        if(!isPlaying) resetSimulation();
    });
    
    massInput.addEventListener('input', (e) => {
        massVal.innerText = e.target.value;
        mass = parseFloat(e.target.value);
        if(!isPlaying) resetSimulation();
    });

    dropBtn.addEventListener('click', () => {
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

    calcBtn.addEventListener('click', () => {
        calcResult.style.color = '';
        calcResult.innerText = '';

        const mStr = formulaMass.value;
        const hStr = formulaHeight.value;

        const vars = {
            g: g,
            hMax: 10,
            m: parseFloat(mStr) || 5
        };

        const calculatedMass = window.PhysicsUtils.evaluateFormula(mStr, vars);
        vars.m = calculatedMass !== null ? calculatedMass : vars.m;
        const calculatedHeight = window.PhysicsUtils.evaluateFormula(hStr, vars);

        if (calculatedMass === null || calculatedHeight === null) {
            calcResult.style.color = 'var(--danger)';
            calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        if (isNaN(calculatedMass) || isNaN(calculatedHeight)) {
             calcResult.style.color = 'var(--danger)';
             calcResult.innerText = 'Resultado inválido (NaN).';
             return;
        }

        // Apply
        const clampedMass = Math.max(1, Math.min(20, calculatedMass));
        const clampedHeight = Math.max(10, Math.min(100, calculatedHeight));
        
        massInput.value = clampedMass;
        massVal.innerText = clampedMass.toFixed(1);
        mass = clampedMass;

        heightInput.value = clampedHeight;
        heightVal.innerText = clampedHeight.toFixed(1);
        startHeightPercent = clampedHeight / 100;

        calcResult.style.color = 'var(--accent-tertiary)';
        calcResult.innerText = `Sucesso! Massa = ${clampedMass.toFixed(1)} kg, Altura = ${clampedHeight.toFixed(1)}%`;
        
        if(!isPlaying) resetSimulation();
    });

    function getTrackY(xPos) {
        // xPos relative to center
        return trackA * (xPos * xPos);
    }
    
    function resetSimulation() {
        if (animationId) cancelAnimationFrame(animationId);
        isPlaying = false;
        
        // Calculate starting X based on desired height percent
        const targetY = maxTrackHeight * startHeightPercent;
        const startXRel = -Math.sqrt(targetY / trackA); // Start on left side
        
        ball = {
            s: startXRel, // position along the 1D horizontal axis
            v: 0,
            x: trackCenter + startXRel,
            y: (height - 20) - getTrackY(startXRel), // Inverted Y for canvas
            heightMeters: targetY / 10 // scale factor
        };
        
        updateStats();
        drawScene();
    }

    function updateAndDraw(currentTime) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // Cap DT to prevent glitches
        lastTime = currentTime;
        
        if (isPlaying) {
            // Slope at current position (derivative of a*x^2 is 2*a*x)
            const slope = 2 * trackA * ball.s;
            const angle = Math.atan(slope);
            
            // Gravity force component along the track
            const accel = -g * Math.sin(angle);
            
            ball.v += accel * dt * 10; // Scaled for visual speed
            
            // Friction
            if (frictionCheck.checked) {
                ball.v *= 0.995; // Damping
            }
            
            ball.s += ball.v * dt * 50; // Scaled for visual speed
            
            const currentTrackY = getTrackY(ball.s);
            ball.x = trackCenter + ball.s;
            ball.y = (height - 20) - currentTrackY;
            ball.heightMeters = currentTrackY / 10;
            
            // Stop if energy is too low and it's near bottom
            if (Math.abs(ball.v) < 0.1 && ball.heightMeters < 0.5) {
                isPlaying = false;
                window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 50 } })); // small reward
            }
            
            updateStats();
        }
        
        drawScene();
        
        if (isPlaying) {
            animationId = requestAnimationFrame(updateAndDraw);
        }
    }

    function updateStats() {
        const h = ball.heightMeters;
        const v = Math.abs(ball.v) / 10; // scale back
        
        const PE = mass * g * h;
        const KE = 0.5 * mass * v * v;
        const TE = PE + KE;
        
        statPE.innerText = PE.toFixed(1);
        statKE.innerText = KE.toFixed(1);
        statTE.innerText = TE.toFixed(1);
        
        // Max theoretical energy (based on initial height)
        const initialH = (maxTrackHeight * startHeightPercent) / 10;
        const maxE = mass * g * initialH;
        
        // Update Bars
        const pePercent = Math.min(100, (PE / maxE) * 100);
        const kePercent = Math.min(100, (KE / maxE) * 100);
        
        if(!isNaN(pePercent)) barPE.style.height = `${pePercent}%`;
        if(!isNaN(kePercent)) barKE.style.height = `${kePercent}%`;
    }

    function drawScene() {
        ctx.clearRect(0, 0, width, height);

        // Sky
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Draw Track
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for(let x = 0; x < width; x+=5) {
            let xRel = x - trackCenter;
            let ty = getTrackY(xRel);
            // Don't draw track higher than max height
            if (ty <= maxTrackHeight + 20) {
                let cy = (height - 20) - ty;
                if(x===0) ctx.moveTo(x, cy);
                else ctx.lineTo(x, cy);
            }
        }
        ctx.stroke();

        if (ball) {
            ctx.fillStyle = '#10b981'; // Green
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y - 10, 15 + (mass/2), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Draw velocity vector
            if (isPlaying && Math.abs(ball.v) > 0.5) {
                const angle = Math.atan(2 * trackA * ball.s);
                const vx = Math.cos(angle) * Math.sign(ball.v);
                const vy = Math.sin(angle) * Math.sign(ball.v);
                
                ctx.beginPath();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.moveTo(ball.x, ball.y - 10);
                ctx.lineTo(ball.x + vx * 40, (ball.y - 10) - vy * 40);
                ctx.stroke();
            }
        }
    }

    setTimeout(resizeCanvas, 100);
}
