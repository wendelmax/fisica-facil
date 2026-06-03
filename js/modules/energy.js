function initEnergyModule() {
    const canvas = document.getElementById('en-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const scenarioSelect = document.getElementById('en-scenario');
    const missionText = document.getElementById('en-mission-text');
    const theoryContent = document.getElementById('en-theory-content');
    const varText = document.getElementById('en-var-text');

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
    const formulaMass = document.getElementById('en-formula-mass');
    const formulaHeight = document.getElementById('en-formula-height');
    const calcBtn = document.getElementById('en-calc-btn');
    const calcResult = document.getElementById('en-calc-result');
    const feedbackEl = document.getElementById('en-feedback');

    let width, height;
    let animationId = null;

    const g = 9.81; // physical gravity
    const pixelPerMeter = 10;
    const pg = g * pixelPerMeter; // pixel gravity for visuals

    let isPlaying = false;
    let lastTime = 0;
    
    let mass = parseFloat(massInput.value);
    let startHeightPercent = parseFloat(heightInput.value) / 100;
    
    // State
    let currentScenario = 'radar';
    let ball = null;
    let trackOriginX = 0; // Where X=0 is on canvas
    let trackOriginY = 0; // Where Y=0 is on canvas
    let maxTrackHeight = 0;

    const scenarios = {
        radar: {
            mission: '<strong>Missão:</strong> Ajuste a altura inicial para que a esfera passe pelo radar com a velocidade correta de <span style="color:var(--accent-primary)">14.0 m/s</span>!',
            theory: '<p><strong>Energia:</strong> Ep = Ec no plano.</p><p><strong>Conservação:</strong> m * g * h = (m * v²) / 2</p><p><strong>Logo:</strong> h = v² / (2 * g)</p>',
            varsText: 'm = 5kg, g = 9.81m/s², vAlvo = 14m/s',
            targetSpeed: 14.0
        },
        jump: {
            mission: '<strong>Missão:</strong> Ajuste a altura para que a esfera salte o abismo e caia exatamente na plataforma!',
            theory: '<p><strong>Energia:</strong> Ep inicial vira Ec para o salto.</p><p><strong>Lançamento:</strong> A velocidade na ponta da rampa determina o alcance.</p>',
            varsText: 'm = 5kg, g = 9.81m/s², hMax = 10m'
        },
        loop: {
            mission: '<strong>Missão:</strong> Ajuste a altura inicial para que a esfera complete o looping sem cair no meio!',
            theory: '<p><strong>Looping:</strong> No topo, a força centrípeta (m*v²/R) deve compensar o peso (m*g).</p><p><strong>Fórmula:</strong> h_min = 2.5 * R</p>',
            varsText: 'm = 5kg, g = 9.81m/s², R = 3m'
        }
    };

    function updateScenarioUI() {
        currentScenario = scenarioSelect.value;
        const data = scenarios[currentScenario];
        missionText.innerHTML = data.mission;
        theoryContent.innerHTML = data.theory;
        varText.innerHTML = data.varsText;
        feedbackEl.style.display = 'none';
        resetSimulation();
    }
    
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', updateScenarioUI);
    }

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        width = canvas.width;
        height = canvas.height;
        
        trackOriginX = width / 2;
        trackOriginY = height - 40; 
        maxTrackHeight = 100; // 10 meters * 10 px/m = 100 px
        
        if (currentScenario === 'jump') trackOriginX = width / 3;
        
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
            m: parseFloat(mStr) || 5,
            vAlvo: 14,
            R: 3,
            hMax: 10
        };

        const calculatedMass = window.PhysicsUtils.evaluateFormula(mStr, vars);
        vars.m = calculatedMass !== null ? calculatedMass : vars.m;
        const calculatedHeight = window.PhysicsUtils.evaluateFormula(hStr, vars);

        if (calculatedMass === null || calculatedHeight === null) {
            calcResult.style.color = 'var(--danger)';
            calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

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

    // Track shapes (returns physical Y in pixels)
    function getTrackY(x) {
        if (currentScenario === 'radar') {
            if (x < 0) return 0.005 * x * x;
            return 0;
        } 
        else if (currentScenario === 'jump') {
            if (x < -50) return 0.005 * (x + 50) * (x + 50);
            if (x <= 0) return 0.01 * (x + 50) * (x + 50);   // Ramp up
            return -1000; // abyss
        }
        else if (currentScenario === 'loop') {
            if (x < 0) return 0.005 * x * x;
            return 0;
        }
        return 0;
    }

    function getTrackSlope(x) {
        if (currentScenario === 'radar') {
            if (x < 0) return 2 * 0.005 * x;
            return 0;
        }
        else if (currentScenario === 'jump') {
            if (x < -50) return 2 * 0.005 * (x + 50);
            if (x <= 0) return 2 * 0.01 * (x + 50);
            return 0;
        }
        else if (currentScenario === 'loop') {
            if (x < 0) return 2 * 0.005 * x;
            return 0;
        }
        return 0;
    }

    function resetSimulation() {
        if (animationId) cancelAnimationFrame(animationId);
        isPlaying = false;
        
        const targetY = maxTrackHeight * startHeightPercent;
        
        let startX = 0;
        if (currentScenario === 'radar') startX = -Math.sqrt(targetY / 0.005);
        if (currentScenario === 'jump') startX = -50 - Math.sqrt(targetY / 0.005);
        if (currentScenario === 'loop') startX = -Math.sqrt(targetY / 0.005);
        
        ball = {
            state: 'rampin', // rampin, flat, loop, air, platform, fall
            x: startX,
            y: targetY,
            vx: 0,
            vy: 0,
            v: 0, // speed along track
            loopAngle: -Math.PI/2,
            hasFinished: false
        };
        
        updateStats();
        drawScene();
    }

    function updateAndDraw(currentTime) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // max 50ms
        lastTime = currentTime;
        
        if (isPlaying && !ball.hasFinished) {
            let friction = frictionCheck.checked ? 0.05 : 0;
            
            if (ball.state === 'rampin' || ball.state === 'flat') {
                let slope = getTrackSlope(ball.x);
                let angle = Math.atan(slope);
                
                let accel = -pg * Math.sin(angle);
                if (ball.v > 0) accel -= friction * pg * Math.cos(angle);
                else if (ball.v < 0) accel += friction * pg * Math.cos(angle);
                
                ball.v += accel * dt;
                let ds = ball.v * dt;
                
                ball.x += ds * Math.cos(angle);
                ball.y = getTrackY(ball.x);
                
                // Transitions
                if (currentScenario === 'radar') {
                    if (ball.x >= 0) ball.state = 'flat';
                    if (ball.x >= 200) {
                        ball.hasFinished = true;
                        let speedMeters = Math.abs(ball.v) / pixelPerMeter;
                        let target = scenarios.radar.targetSpeed;
                        let diff = Math.abs(speedMeters - target);
                        showFeedback(diff < 0.5, `Velocidade no radar: ${speedMeters.toFixed(1)} m/s! ${diff < 0.5 ? 'Excelente!' : 'Tente novamente.'}`);
                    }
                } 
                else if (currentScenario === 'jump') {
                    if (ball.x >= 0 && ball.state !== 'air') {
                        ball.state = 'air';
                        let launchAngle = Math.atan(getTrackSlope(0));
                        ball.vx = ball.v * Math.cos(launchAngle);
                        ball.vy = ball.v * Math.sin(launchAngle);
                    }
                }
                else if (currentScenario === 'loop') {
                    if (ball.x >= 0 && ball.state === 'rampin') {
                        ball.state = 'loop';
                        ball.loopAngle = -Math.PI/2; // bottom
                    }
                }
                
                // Reverse constraint if trying to go left of start
                if (ball.x < -1000) ball.v = 0; 
            } 
            else if (ball.state === 'loop') {
                let R = 30; // 3 meters
                let angle = ball.loopAngle;
                
                let tangentialAccel = -pg * Math.cos(angle); 
                
                if (ball.v > 0) tangentialAccel -= friction * pg;
                else if (ball.v < 0) tangentialAccel += friction * pg;
                
                ball.v += tangentialAccel * dt;
                let ds = ball.v * dt;
                ball.loopAngle += ds / R;
                
                ball.x = Math.cos(ball.loopAngle) * R;
                ball.y = R + Math.sin(ball.loopAngle) * R;
                
                // N = v^2/R - g*sin(angle) (where angle=PI/2 is top)
                let N = (ball.v * ball.v) / R - pg * Math.sin(ball.loopAngle);
                
                if (N < 0 && Math.sin(ball.loopAngle) > 0) {
                    ball.state = 'fall';
                    let tangentAngle = ball.loopAngle + Math.PI/2;
                    ball.vx = ball.v * Math.cos(tangentAngle);
                    ball.vy = ball.v * Math.sin(tangentAngle);
                    showFeedback(false, 'Energia insuficiente! A força gravitacional superou a centrípeta e a esfera caiu.');
                }
                
                if (ball.loopAngle >= 3*Math.PI/2) {
                    ball.state = 'flat';
                    ball.x = 0;
                    ball.y = 0;
                    showFeedback(true, 'Incrível! Completou o looping com perfeição!');
                }
                if (ball.loopAngle <= -Math.PI/2 && ball.v < 0) {
                    ball.state = 'rampin';
                    ball.x = 0;
                }
            }
            else if (ball.state === 'air' || ball.state === 'fall') {
                ball.vy -= pg * dt; 
                ball.x += ball.vx * dt;
                ball.y += ball.vy * dt;
                
                if (currentScenario === 'jump' && ball.state === 'air') {
                    let platX = 150;
                    let platY = 0;
                    let platWidth = 150;
                    
                    if (ball.x >= platX && ball.x <= platX + platWidth && ball.y <= platY && ball.vy < 0) {
                        ball.state = 'platform';
                        ball.y = platY;
                        ball.vy = 0;
                        ball.v = ball.vx;
                        showFeedback(true, 'Aterrissagem perfeita! Ec foi suficiente para o alcance do salto.');
                    } else if (ball.y < -50) {
                        ball.hasFinished = true;
                        showFeedback(false, 'Oops! Caiu no abismo. Faltou energia.');
                    }
                }
                
                if (ball.y < -100) {
                     ball.hasFinished = true; 
                }
            }
            else if (ball.state === 'platform') {
                if (ball.v > 0) ball.v -= 20 * dt; 
                if (ball.v < 0) ball.v = 0;
                ball.x += ball.v * dt;
                if(ball.v <= 0) ball.hasFinished = true;
            }
            
            if (Math.abs(ball.v) < 1 && ball.y < 5 && ball.state === 'rampin') {
                ball.hasFinished = true;
            }
            
            updateStats();
        }
        
        drawScene();
        
        if (isPlaying) {
            animationId = requestAnimationFrame(updateAndDraw);
        }
    }

    function showFeedback(success, msg) {
        feedbackEl.style.display = 'block';
        feedbackEl.style.backgroundColor = success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        feedbackEl.style.borderLeftColor = success ? '#10b981' : '#ef4444';
        feedbackEl.innerHTML = `<strong>Resultado:</strong> ${msg}`;
        if(window.logActivity) window.logActivity(`Energia ${currentScenario}: ${success?'Sucesso':'Falha'} com altura ${startHeightPercent.toFixed(2)} e atrito ${frictionCheck.checked}`);
        if(success) window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 100 } }));
    }

    function updateStats() {
        const h = Math.max(0, ball.y) / pixelPerMeter; 
        
        let vPx = 0;
        if (ball.state === 'air' || ball.state === 'fall') {
            vPx = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
        } else {
            vPx = Math.abs(ball.v);
        }
        const v = vPx / pixelPerMeter;
        
        const PE = mass * g * h;
        const KE = 0.5 * mass * v * v;
        const TE = PE + KE;
        
        statPE.innerText = PE.toFixed(1);
        statKE.innerText = KE.toFixed(1);
        statTE.innerText = TE.toFixed(1);
        
        const maxE = mass * g * (maxTrackHeight / pixelPerMeter);
        const pePercent = Math.min(100, (PE / maxE) * 100);
        const kePercent = Math.min(100, (KE / maxE) * 100);
        
        if(!isNaN(pePercent)) barPE.style.height = `${pePercent}%`;
        if(!isNaN(kePercent)) barKE.style.height = `${kePercent}%`;
    }

    function drawScene() {
        ctx.clearRect(0, 0, width, height);

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        let first = true;
        
        if (currentScenario === 'radar') {
            for(let x = -400; x <= 400; x+=5) {
                let ty = getTrackY(x);
                let cx = trackOriginX + x;
                let cy = trackOriginY - ty;
                if(first) { ctx.moveTo(cx, cy); first = false; }
                else ctx.lineTo(cx, cy);
            }
            ctx.stroke();
            
            let rX = trackOriginX + 200;
            let rY = trackOriginY;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(rX - 5, rY - 30, 10, 30);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
            ctx.fillText('RADAR', rX - 20, rY - 40);
        } 
        else if (currentScenario === 'jump') {
            for(let x = -400; x <= 0; x+=5) {
                let ty = getTrackY(x);
                let cx = trackOriginX + x;
                let cy = trackOriginY - ty;
                if(first) { ctx.moveTo(cx, cy); first = false; }
                else ctx.lineTo(cx, cy);
            }
            ctx.stroke();
            
            ctx.beginPath();
            let pX = trackOriginX + 150;
            let pY = trackOriginY;
            ctx.moveTo(pX, pY);
            ctx.lineTo(pX + 200, pY);
            ctx.stroke();
            
            ctx.fillStyle = '#3b82f6';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(pX, pY, 200, height - pY);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.fillText('PLATAFORMA', pX + 50, pY + 30);
        }
        else if (currentScenario === 'loop') {
            for(let x = -400; x <= 0; x+=5) {
                let ty = getTrackY(x);
                let cx = trackOriginX + x;
                let cy = trackOriginY - ty;
                if(first) { ctx.moveTo(cx, cy); first = false; }
                else ctx.lineTo(cx, cy);
            }
            ctx.stroke();
            
            let R = 30;
            ctx.beginPath();
            ctx.arc(trackOriginX, trackOriginY - R, R, -Math.PI/2, 3*Math.PI/2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(trackOriginX, trackOriginY);
            ctx.lineTo(trackOriginX + 300, trackOriginY);
            ctx.stroke();
        }

        if (ball) {
            let cx = trackOriginX + ball.x;
            let cy = trackOriginY - ball.y;
            
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(cx, cy - 10, 10 + (mass/4), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            let vLen = Math.abs(ball.v);
            if (ball.state === 'air' || ball.state === 'fall') vLen = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
            
            if (isPlaying && vLen > 1) {
                ctx.beginPath();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.moveTo(cx, cy - 10);
                
                let vx, vy;
                if (ball.state === 'air' || ball.state === 'fall') {
                    vx = ball.vx; vy = ball.vy;
                } else if (ball.state === 'loop') {
                    let angle = ball.loopAngle + Math.PI/2;
                    vx = Math.cos(angle) * ball.v;
                    vy = Math.sin(angle) * ball.v;
                } else {
                    let slope = getTrackSlope(ball.x);
                    let angle = Math.atan(slope);
                    vx = Math.cos(angle) * ball.v;
                    vy = Math.sin(angle) * ball.v;
                }
                
                let len = Math.sqrt(vx*vx + vy*vy);
                vx /= len; vy /= len;
                
                ctx.lineTo(cx + vx * 30, cy - 10 - vy * 30);
                ctx.stroke();
            }
        }
    }

    setTimeout(() => {
        resizeCanvas();
        if(scenarioSelect) updateScenarioUI();
    }, 100);
}

// Re-initialize to apply changes if the module was already active
// Wait, I shouldn't duplicate event listeners on buttons.
// Instead of attaching directly, I can overwrite the functions, but standard JS requires replacing the node or it's fine.
// The best way to prevent duplicate listeners is to clone the node or just trust that a reload will fix it.
// We are building for the project, they will reload to see changes.
