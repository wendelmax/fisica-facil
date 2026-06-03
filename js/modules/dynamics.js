function initDynamicsModule() {
    const canvas = document.getElementById('dyn-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const scenarioSelect = document.getElementById('dyn-scenario');
    const missionText = document.getElementById('dyn-mission-text');
    const theoryContent = document.getElementById('dyn-theory-content');

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
    const varTextEl = document.getElementById('dyn-var-text');
    const formulaMass = document.getElementById('dyn-formula-mass');
    const formulaFric = document.getElementById('dyn-formula-fric');
    const formulaForce = document.getElementById('dyn-formula-force');
    const calcBtn = document.getElementById('dyn-calc-btn');
    const calcResult = document.getElementById('dyn-calc-result');
    const feedbackEl = document.getElementById('dyn-feedback');

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
    let consecutiveFailures = 0;

    let currentScenario = scenarioSelect ? scenarioSelect.value : 'standard';

    const scenarios = {
        standard: {
            mission: "<strong>Missão:</strong> Ajude a equipe de resgate a empurrar uma caixa pesada até a zona de segurança!",
            theory: `
                <p><strong>Força de Atrito:</strong> F<sub>at</sub> = μ * N (N = m * g)</p>
                <p><strong>Força Resultante:</strong> F<sub>R</sub> = F<sub>aplicada</sub> - F<sub>at</sub> = m * a</p>
            `,
            setup: () => {
                // standard target
                frictionInput.disabled = false;
                const minX = 300;
                const maxX = width - 150;
                targetArea = {
                    x: Math.random() * (maxX - minX) + minX,
                    width: 80,
                    hit: false
                };
            },
            getFriction: (x) => mu,
            getGravityParallel: () => 0, // flat
            getNormal: () => mass * g,
            angle: 0
        },
        mixed: {
            mission: "<strong>Missão:</strong> O caminho tem metade gelo (μ=0.01) e metade areia (μ=0.6)! A zona segura fica na areia.",
            theory: `
                <p>A Força Resultante muda de acordo com a superfície!</p>
                <p>No gelo: F<sub>at</sub> = 0.01 * N</p>
                <p>Na areia: F<sub>at</sub> = 0.6 * N</p>
            `,
            setup: () => {
                frictionInput.disabled = true; // locked by scenario
                targetArea = {
                    x: width - 150, // deep in the sand
                    width: 80,
                    hit: false
                };
            },
            getFriction: (x) => {
                return (x > width / 2) ? 0.6 : 0.01;
            },
            getGravityParallel: () => 0,
            getNormal: () => mass * g,
            angle: 0
        },
        ramp: {
            mission: "<strong>Missão:</strong> Agora a caixa precisa subir uma ladeira de 15°! A gravidade vai puxá-la para trás.",
            theory: `
                <p><strong>Componente do Peso (Px):</strong> Px = m * g * sen(15°)</p>
                <p><strong>Força Normal (N):</strong> N = m * g * cos(15°)</p>
                <p><strong>Força Resultante:</strong> F<sub>R</sub> = F<sub>aplicada</sub> - F<sub>at</sub> - Px</p>
            `,
            setup: () => {
                frictionInput.disabled = false;
                targetArea = {
                    x: width / 2 + 100, // half way up
                    width: 80,
                    hit: false
                };
            },
            getFriction: (x) => mu,
            getGravityParallel: () => mass * g * Math.sin(15 * Math.PI / 180),
            getNormal: () => mass * g * Math.cos(15 * Math.PI / 180),
            angle: -15 * Math.PI / 180 // draw angle
        }
    };

    function updateScenarioUI() {
        if (!missionText) return;
        currentScenario = scenarioSelect.value;
        const config = scenarios[currentScenario];
        missionText.innerHTML = config.mission;
        theoryContent.innerHTML = config.theory;
        
        // Ensure values match inputs
        mass = parseFloat(massInput.value);
        appliedForce = parseFloat(forceInput.value);
        mu = parseFloat(frictionInput.value);
        
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
        resetSimulation();
    }
    
    window.addEventListener('resize', resizeCanvas);

    massInput.addEventListener('input', (e) => {
        massVal.innerText = e.target.value;
        mass = parseFloat(e.target.value);
        if(!isPlaying) { updateStats(); updateVarsText(); }
    });
    forceInput.addEventListener('input', (e) => {
        forceVal.innerText = e.target.value;
        appliedForce = parseFloat(e.target.value);
        if(!isPlaying) { updateStats(); updateVarsText(); }
    });
    frictionInput.addEventListener('input', (e) => {
        frictionVal.innerText = e.target.value;
        mu = parseFloat(e.target.value);
        if(!isPlaying) { updateStats(); updateVarsText(); }
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

        if (!frictionInput.disabled) {
            frictionInput.value = clampedFric;
            frictionVal.innerText = clampedFric.toFixed(2);
            mu = clampedFric;
        }

        forceInput.value = clampedForce;
        forceVal.innerText = clampedForce.toFixed(1);
        appliedForce = clampedForce;

        calcResult.style.color = 'var(--accent-tertiary)';
        calcResult.innerText = `Sucesso! F = \${clampedForce.toFixed(1)} N`;
        
        if(!isPlaying) {
            updateStats();
            updateVarsText();
            drawScene();
        }
    });

    function updateVarsText() {
        if (!targetArea) return;
        currentDistance = (targetArea.x - 50) / scale;
        let text = `m = \${mass.toFixed(1)}kg, g = 9.81m/s², d = \${currentDistance.toFixed(1)}m`;
        if (currentScenario === 'mixed') {
            text += `, mu_gelo = 0.01, mu_areia = 0.6`;
        } else {
            text += `, mu = \${mu.toFixed(2)}`;
        }
        varTextEl.innerText = text;
    }

    function updateStats() {
        if (!block) return;
        const config = scenarios[currentScenario];
        const normalForce = config.getNormal();
        const frictionForce = config.getFriction(block.x) * normalForce;
        const px = config.getGravityParallel();
        
        let netForce = appliedForce;
        
        if (block.vx > 0) {
            netForce -= (frictionForce + px);
        } else if (appliedForce > frictionForce + px) {
            netForce -= (frictionForce + px);
        } else {
            netForce = 0;
            // if px is huge, could slide backwards, but let's assume it doesn't slide backwards for simplicity
            if (px > frictionForce + appliedForce && block.vx <= 0) {
                netForce = appliedForce - px + frictionForce; // sliding backwards, friction opposes
            }
        }
        
        if (netForce < 0 && block.vx <= 0 && px === 0) {
            netForce = 0; // Won't move backwards on flat ground
        }
        
        const accel = netForce / mass;
        
        statFres.innerText = netForce.toFixed(2);
        statAccel.innerText = accel.toFixed(2);
        statVel.innerText = block.vx.toFixed(2);
    }

    function resetSimulation() {
        if (animationId) cancelAnimationFrame(animationId);
        isPlaying = false;
        
        block = {
            x: 50,
            y: height - 60, // visual only, real calc uses x
            size: 40,
            vx: 0,
            vy: 0,
            pushing: true
        };
        
        scenarios[currentScenario].setup();
        
        updateVarsText();
        updateStats();
        drawScene();
        
        if(feedbackEl) feedbackEl.style.display = 'none';
        
        // Restore applied force input value
        appliedForce = parseFloat(forceInput.value);
    }

    function updateAndDraw(currentTime) {
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        if (isPlaying) {
            const config = scenarios[currentScenario];
            const normalForce = config.getNormal();
            const currentMu = config.getFriction(block.x);
            const frictionForce = currentMu * normalForce;
            const px = config.getGravityParallel();
            
            let netForce = appliedForce;
            
            // Apply kinetic friction if moving, or static friction limit if stopped
            if (block.vx > 0) {
                netForce -= (frictionForce + px);
            } else if (appliedForce > frictionForce + px) {
                netForce -= (frictionForce + px);
            } else if (px > frictionForce + appliedForce && block.vx <= 0) {
                // sliding backwards down the ramp
                netForce = appliedForce - px + frictionForce;
            } else {
                netForce = 0;
            }
            
            const accel = netForce / mass;
            
            // Stop applying force after 100 pixels of pushing (10 meters)
            if (block.x > 150 && block.pushing) {
                block.pushing = false;
                appliedForce = 0; // User push ends
            }

            block.vx += accel * dt;
            
            // Stop if velocity changes sign without enough force to move backwards/forwards
            if (block.vx < 0 && px === 0) {
                block.vx = 0;
                isPlaying = false; // Stopped on flat ground
                checkWin();
            } else if (block.vx < 0 && px > 0 && Math.abs(px) <= frictionForce) {
                block.vx = 0;
                isPlaying = false; // Stopped on ramp and friction holds it
                checkWin();
            }
            
            block.x += block.vx * scale * dt;
            
            // Reached the end of screen or fell off
            if (block.x > width || block.x < 0) {
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
            if(window.logActivity) window.logActivity(`Acertou no Dinâmica (\${currentScenario}). Força inicial=\${forceInput.value}N`);
            consecutiveFailures = 0;
            if(feedbackEl) feedbackEl.style.display = 'none';
        } else {
            consecutiveFailures++;
            if(window.logActivity) window.logActivity(`Errou no Dinâmica (\${currentScenario}). Caixa parou fora do alvo.`);
            if (consecutiveFailures >= 2 && feedbackEl) {
                feedbackEl.style.display = 'block';
                if (center < targetArea.x) {
                    feedbackEl.innerHTML = '<strong>Dica:</strong> A caixa parou ANTES do alvo. Verifique se a sua Força Resultante (Força - Atrito - Px) é suficiente para criar inércia!';
                } else {
                    feedbackEl.innerHTML = '<strong>Dica:</strong> A caixa PASSOU do alvo. Você aplicou muita força. Reduza-a ou use o Modo Fórmula para calcular.';
                }
            }
        }
        drawScene();
    }

    function drawScene() {
        ctx.clearRect(0, 0, width, height);
        ctx.save();

        const config = scenarios[currentScenario];

        // Sky
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Rotation for Ramp scenario
        if (config.angle !== 0) {
            ctx.translate(0, height - 20); // origin at bottom left corner
            ctx.rotate(config.angle);
            ctx.translate(0, -(height - 20)); // move back
        }

        // Ground
        if (currentScenario === 'mixed') {
            ctx.fillStyle = '#bae6fd'; // Ice
            ctx.fillRect(0, height - 20, width/2, 20);
            ctx.fillStyle = '#fde047'; // Sand
            ctx.fillRect(width/2, height - 20, width, 20);
        } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(0, height - 20, width * 2, 20); // width*2 to cover ramp edge cases
        }

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
        for(let x=50; x<width*2; x+=50) {
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
            
            // Gravity (down relative to screen, so we need to counter-rotate if on ramp to draw it correctly straight down, or just draw it relative to block)
            // If we are rotated, 'down' on the canvas is still down visually if we undo rotation just for this arrow
            ctx.save();
            ctx.translate(cx, block.y + block.size);
            if (config.angle !== 0) {
                ctx.rotate(-config.angle); // rotate back to point straight down in global coords
            }
            drawArrow(ctx, 0, 0, 0, 40, '#10b981');
            ctx.restore();
            
            // Applied Force
            if (appliedForce > 0) {
                drawArrow(ctx, block.x, cy, block.x + 40, cy, '#3b82f6');
            }
            // Friction
            const currentMu = config.getFriction(block.x);
            if (currentMu > 0 && (block.vx !== 0 || appliedForce > 0)) {
                // If moving backwards, friction points forwards!
                const dir = block.vx < 0 ? 1 : -1;
                drawArrow(ctx, block.x + (dir>0?block.size:0), cy + 10, block.x + (dir>0?block.size:0) + dir * 30, cy + 10, '#ef4444');
            }
        }
        
        ctx.restore();
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

    setTimeout(() => {
        if (scenarioSelect) updateScenarioUI();
        resizeCanvas();
    }, 100);
}
