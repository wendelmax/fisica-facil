function initElectrostaticsModule() {
    const canvas = document.getElementById('elec-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const scenarioSelect = document.getElementById('elec-scenario');
    const missionText = document.getElementById('elec-mission-text');
    const theoryContent = document.getElementById('elec-theory-content');

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
    const varTextEl = document.getElementById('elec-var-text');
    const formulaCharge = document.getElementById('elec-formula-charge');
    const calcBtn = document.getElementById('elec-calc-btn');
    const calcResult = document.getElementById('elec-calc-result');
    const feedbackEl = document.getElementById('elec-feedback');

    let width, height;
    let animationId = null;

    // Physics Constants
    const K = 5000; // Simplified Coulomb constant for visual scaling
    
    let charges = [];
    let testCharge = null;
    let target = null;
    let isDragging = false;
    let dragTarget = null;
    let consecutiveFailures = 0;
    
    let obstacles = [];
    let orbitState = {
        active: false,
        totalAngle: 0,
        lastAngle: 0,
        center: {x: 0, y: 0}
    };

    let currentScenario = scenarioSelect ? scenarioSelect.value : 'custom';
    
    // State for placing target in custom mode
    let isPlacingTarget = false;

    const scenarios = {
        custom: {
            mission: "<strong>Missão:</strong> Clique em qualquer lugar na tela para definir o alvo. Depois guie a partícula até ele usando cargas geradoras!",
            theory: `
                <p><strong>Lei de Coulomb:</strong> F = k * (|q1| * |q2|) / d²</p>
                <p>Cargas iguais se repelem, cargas opostas se atraem.</p>
            `,
            setup: () => {
                obstacles = [];
                orbitState.active = false;
                target = {
                    x: width - 80,
                    y: height / 2,
                    radius: 30,
                    hit: false
                };
            }
        },
        maze: {
            mission: "<strong>Missão:</strong> Campo Minado! A partícula não pode encostar nas áreas de antimatéria (vermelhas). Faça-a contornar usando múltiplas cargas.",
            theory: `
                <p>Você precisará do Princípio da Superposição.</p>
                <p>A Força Resultante é a soma vetorial de todas as forças elétricas atuando na carga.</p>
            `,
            setup: () => {
                obstacles = [
                    { x: width / 2, y: height / 2 - 80, radius: 60 },
                    { x: width / 2, y: height / 2 + 80, radius: 60 }
                ];
                orbitState.active = false;
                target = {
                    x: width - 80,
                    y: height / 2,
                    radius: 30,
                    hit: false
                };
            }
        },
        orbit: {
            mission: "<strong>Missão:</strong> Gravidade Elétrica! Prenda a carga de prova em uma órbita estável ao redor de uma carga central. Sobreviva e complete 1 volta (360°).",
            theory: `
                <p><strong>Força Centrípeta:</strong> Fc = m * v² / R</p>
                <p>A Força Elétrica deve ser exatamente igual à Força Centrípeta necessária para manter o movimento circular uniforme.</p>
            `,
            setup: () => {
                obstacles = [];
                target = null; // no target
                orbitState = {
                    active: true,
                    totalAngle: 0,
                    lastAngle: 0,
                    center: {x: width/2, y: height/2}
                };
                
                // For orbit, give test charge some initial velocity so it can orbit
                if (testCharge) {
                    testCharge.y = height / 2 - 100; // start offset
                    testCharge.x = width / 2;
                    testCharge.vx = 4; // tangential velocity
                    testCharge.vy = 0;
                }
            }
        }
    };

    function updateScenarioUI() {
        if (!missionText) return;
        currentScenario = scenarioSelect.value;
        const config = scenarios[currentScenario];
        missionText.innerHTML = config.mission;
        theoryContent.innerHTML = config.theory;
        isPlacingTarget = (currentScenario === 'custom');
        resetSimulation(true);
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
        resetSimulation(true);
    }
    
    window.addEventListener('resize', resizeCanvas);

    chargeMagInput.addEventListener('input', (e) => {
        chargeMagVal.innerText = e.target.value;
    });

    addPosBtn.addEventListener('click', () => {
        addCharge(parseFloat(chargeMagInput.value));
        isPlacingTarget = false; // placing charges stops placing target
    });

    addNegBtn.addEventListener('click', () => {
        addCharge(-parseFloat(chargeMagInput.value));
        isPlacingTarget = false;
    });

    resetBtn.addEventListener('click', () => {
        consecutiveFailures++;
        if(window.logActivity) window.logActivity(`Limpou as cargas na Eletrostática (${currentScenario}).`);
        resetSimulation(true);
    });

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

        // In custom mode, if clicking empty space and no charges are dragged, place target
        let clickedCharge = false;
        
        for (let charge of charges) {
            const dist = Math.hypot(charge.x - mouseX, charge.y - mouseY);
            if (dist < 20) {
                isDragging = true;
                dragTarget = charge;
                clickedCharge = true;
                break;
            }
        }
        
        if (!clickedCharge && isPlacingTarget && currentScenario === 'custom') {
            target.x = mouseX;
            target.y = mouseY;
            updateVarsText();
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

    function resetSimulation(hardReset = false) {
        if (hardReset) {
            charges = [];
        }
        
        testCharge = {
            x: 50,
            y: height / 2,
            vx: 0,
            vy: 0,
            q: 10, // Positive test charge
            path: [],
            crashed: false
        };
        
        scenarios[currentScenario].setup();
        
        if (orbitState.active) {
            orbitState.lastAngle = Math.atan2(testCharge.y - orbitState.center.y, testCharge.x - orbitState.center.x);
        }
        
        updateVarsText();

        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(updateAndDraw);
    }

    function updateVarsText() {
        if (target) {
            currentDistance = Math.hypot(testCharge.x - target.x, testCharge.y - target.y);
            varTextEl.innerText = `d = ${currentDistance.toFixed(1)}m, k = 8.99e9, qProva = +10`;
        } else {
            varTextEl.innerText = `k = 8.99e9, qProva = +10, R = alvo circular`;
        }
    }

    function updateAndDraw() {
        if (!testCharge.crashed && !(target && target.hit)) {
            updatePhysics();
        }
        drawScene();
        animationId = requestAnimationFrame(updateAndDraw);
    }

    function updatePhysics() {
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
            
            // Crash into charge
            if (r < 25) {
                testCharge.crashed = true;
                failLevel("A partícula colidiu com uma carga geradora!");
                return;
            }
        }

        // Apply force as acceleration (simplified)
        testCharge.vx += fx * 0.01;
        testCharge.vy += fy * 0.01;
        
        // Add some "air resistance" to keep things controllable, except in orbit
        if (currentScenario !== 'orbit') {
            testCharge.vx *= 0.98;
            testCharge.vy *= 0.98;
        } else {
            testCharge.vx *= 0.999; // very low friction in space
            testCharge.vy *= 0.999;
        }

        testCharge.x += testCharge.vx;
        testCharge.y += testCharge.vy;

        // Path
        if (testCharge.path.length === 0 || Math.hypot(testCharge.path[testCharge.path.length-1].x - testCharge.x, testCharge.path[testCharge.path.length-1].y - testCharge.y) > 5) {
            testCharge.path.push({x: testCharge.x, y: testCharge.y});
            if (testCharge.path.length > 200) testCharge.path.shift(); // limit path
        }

        // Boundary checks
        if (testCharge.x < 0 || testCharge.x > width || testCharge.y < 0 || testCharge.y > height) {
            if (currentScenario === 'orbit') {
                testCharge.crashed = true;
                failLevel("A partícula escapou da órbita!");
            } else {
                testCharge.vx *= -0.5;
                testCharge.vy *= -0.5;
                // keep inside
                testCharge.x = Math.max(0, Math.min(width, testCharge.x));
                testCharge.y = Math.max(0, Math.min(height, testCharge.y));
            }
        }

        // Obstacles check
        for (let obs of obstacles) {
            if (Math.hypot(testCharge.x - obs.x, testCharge.y - obs.y) < obs.radius + 5) {
                testCharge.crashed = true;
                failLevel("A partícula entrou no campo de antimatéria!");
                return;
            }
        }

        // Target check
        if (target) {
            const distToTarget = Math.hypot(testCharge.x - target.x, testCharge.y - target.y);
            statDist.innerText = distToTarget.toFixed(2);
            if (distToTarget < target.radius) {
                target.hit = true;
                window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 200 } }));
                if(window.logActivity) window.logActivity(`Acertou o alvo na Eletrostática (${currentScenario}).`);
                consecutiveFailures = 0;
                if(feedbackEl) feedbackEl.style.display = 'none';
                setTimeout(() => resetSimulation(false), 2000); // keep charges, respawn test
            }
        } else if (orbitState.active) {
            // Check orbit progress
            let currentAngle = Math.atan2(testCharge.y - orbitState.center.y, testCharge.x - orbitState.center.x);
            let diff = currentAngle - orbitState.lastAngle;
            
            // handle wrap around
            if (diff > Math.PI) diff -= Math.PI * 2;
            if (diff < -Math.PI) diff += Math.PI * 2;
            
            orbitState.totalAngle += diff;
            orbitState.lastAngle = currentAngle;
            
            statDist.innerText = `${Math.abs((orbitState.totalAngle * 180 / Math.PI)).toFixed(0)}°`;
            
            if (Math.abs(orbitState.totalAngle) >= Math.PI * 2) {
                orbitState.active = false; // win!
                window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 300 } }));
                if(window.logActivity) window.logActivity(`Completou órbita na Eletrostática.`);
                consecutiveFailures = 0;
                if(feedbackEl) {
                    feedbackEl.style.display = 'block';
                    feedbackEl.innerHTML = '<strong>Órbita Estável Alcançada!</strong> Você completou 360° com sucesso.';
                }
            }
        }

        statForce.innerText = Math.hypot(fx, fy).toFixed(2);
    }
    
    function failLevel(msg) {
        if(window.logActivity) window.logActivity(`Falha na Eletrostática (${currentScenario}): ${msg}`);
        if(feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.innerHTML = `<strong>Ops!</strong> ${msg} Tente ajustar as cargas.`;
        }
    }

    function drawScene() {
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        if (showFieldCheck.checked) {
            drawFieldLines();
        }
        
        // Draw Obstacles
        for (let obs of obstacles) {
            const grad = ctx.createRadialGradient(obs.x, obs.y, 0, obs.x, obs.y, obs.radius);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Target
        if (target) {
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.strokeStyle = target.hit ? '#10b981' : '#f59e0b';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = target.hit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.1)';
            ctx.fill();
        } else if (orbitState.active || (currentScenario === 'orbit' && !orbitState.active)) {
            // Draw orbit center
            ctx.beginPath();
            ctx.arc(orbitState.center.x, orbitState.center.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
        }

        // Draw Path
        if (testCharge.path.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = testCharge.crashed ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 2;
            ctx.moveTo(testCharge.path[0].x, testCharge.path[0].y);
            for (let pt of testCharge.path) {
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
        }

        // Draw Charges
        for (let charge of charges) {
            ctx.beginPath();
            ctx.arc(charge.x, charge.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = charge.q > 0 ? '#3b82f6' : '#ef4444';
            ctx.shadowColor = charge.q > 0 ? '#3b82f6' : '#ef4444';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(charge.q > 0 ? '+' : '-', charge.x, charge.y);
        }

        // Draw Test Charge
        if (!testCharge.crashed) {
            ctx.beginPath();
            ctx.arc(testCharge.x, testCharge.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#10b981';
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('+', testCharge.x, testCharge.y);
        } else {
            // crashed
            ctx.beginPath();
            ctx.arc(testCharge.x, testCharge.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
        }
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

    setTimeout(() => {
        if (scenarioSelect) updateScenarioUI();
        resizeCanvas();
    }, 100);
}
