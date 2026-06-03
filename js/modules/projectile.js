function initProjectileModule() {
    const canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const scenarioSelect = document.getElementById('proj-scenario');
    const missionText = document.getElementById('proj-mission-text');
    const theoryContent = document.getElementById('proj-theory-content');
    
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
    const varTextEl = document.getElementById('proj-var-text');
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
    let wall = null;
    let particles = []; // For explosion effects
    
    // Initial conditions
    let v0 = parseInt(velocityInput.value);
    let theta = parseInt(angleInput.value) * (Math.PI / 180);
    let consecutiveFailures = 0;
    
    let currentScenario = scenarioSelect ? scenarioSelect.value : 'standard';

    const scenarios = {
        standard: {
            mission: "<strong>Missão:</strong> Você é um engenheiro aeroespacial. Ajuste o ângulo e a velocidade para lançar um pacote de suprimentos no alvo estático!",
            theory: `
                <p><strong>Alcance Máximo:</strong> D = (v² * sen(2θ)) / g</p>
                <p><strong>Tempo de Voo:</strong> t = (2 * v * sen(θ)) / g</p>
            `,
            setup: () => {
                wall = null;
                generateTarget(false);
            }
        },
        wall: {
            mission: "<strong>Missão:</strong> Há um muro alto bloqueando o caminho! Use um ângulo de tiro mais alto (parábola fechada) para superá-lo e acertar o alvo atrás dele.",
            theory: `
                <p><strong>Altura Máxima:</strong> h = (v² * sen²(θ)) / (2*g)</p>
                <p>O projétil precisa ter H_max maior que a altura do muro!</p>
            `,
            setup: () => {
                generateTarget(true); // target further away
                // Create a wall in the middle
                const wallDistanceMeters = (target.x - 40) / scale / 2; // halfway
                const wallHeightMeters = 30 + Math.random() * 20; // 30-50m
                wall = {
                    x: 40 + wallDistanceMeters * scale,
                    y: 0, // calculated in draw
                    width: 20,
                    height: wallHeightMeters * scale,
                    heightMeters: wallHeightMeters
                };
            }
        },
        moving: {
            mission: "<strong>Missão:</strong> O alvo está em movimento! Calcule o Tempo de Voo para prever onde o alvo estará no momento do impacto.",
            theory: `
                <p><strong>Tempo de Voo:</strong> t = (2 * v * sen(θ)) / g</p>
                <p>O alvo se move a 5 m/s. Posição alvo = X_inicial + V_alvo * t</p>
            `,
            setup: () => {
                wall = null;
                generateTarget(false);
                target.vx = 5; // 5 m/s
                target.moving = true;
            }
        }
    };

    function updateScenarioUI() {
        if (!missionText) return;
        currentScenario = scenarioSelect.value;
        const config = scenarios[currentScenario];
        missionText.innerHTML = config.mission;
        theoryContent.innerHTML = config.theory;
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
            g: g,
            h_muro: wall ? wall.heightMeters : 0
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
        calcResult.innerText = `Sucesso! Ângulo = \${clampedAngle.toFixed(1)}°, V0 = \${clampedVel.toFixed(1)} m/s`;
        
        if(!isFlying) drawScene();
    });

    function generateTarget(far) {
        let minX = 50 * scale;
        if (far) minX = 100 * scale; // For wall scenario, ensure it's far enough
        const maxX = width - 100;
        const targetX = Math.random() * (maxX - minX) + minX;
        
        target = {
            x: targetX,
            y: height - 20, // Ground level is height - 20
            width: 40,
            height: 10,
            hit: false,
            moving: false,
            vx: 0
        };
        
        updateVarsText();
    }

    function updateVarsText() {
        if (!target) return;
        currentDistance = (target.x - 40) / scale;
        let text = `d = \${currentDistance.toFixed(1)}m, g = 9.81m/s²`;
        if (wall) text += `, h_muro = \${wall.heightMeters.toFixed(1)}m`;
        if (target.moving) text += `, v_alvo = \${target.vx.toFixed(1)}m/s`;
        varTextEl.innerText = text;
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
        
        scenarios[currentScenario].setup();
        
        lastTime = performance.now();
        animationId = requestAnimationFrame(updateAndDraw); // Start loop for moving target if needed
    }

    function startSimulation() {
        if (isFlying) return;
        isFlying = true;
        projectile.x = 40; // Initial x
        projectile.y = height - 20; // Initial y
        projectile.vx = v0 * Math.cos(theta);
        projectile.vy = -v0 * Math.sin(theta); // Negative because y goes down in canvas
        projectile.time = 0;
        projectile.path = [];
        projectile.maxHeight = 0;
        
        if (feedbackEl) feedbackEl.style.display = 'none';
        
        lastTime = performance.now();
    }

    let lastTime = 0;
    function updateAndDraw(currentTime) {
        const dt = (currentTime - lastTime) / 1000; // in seconds
        lastTime = currentTime;

        // Speed up simulation time slightly for better UX
        const simDt = dt * 2.5; 

        // Update moving target
        if (target && target.moving) {
            target.x += target.vx * scale * simDt;
            // Bounce on edges
            if (target.x < 100) target.vx = Math.abs(target.vx);
            if (target.x > width - 60) target.vx = -Math.abs(target.vx);
            updateVarsText();
        }

        if (isFlying) {
            projectile.time += simDt;
            
            const currentX = projectile.vx * projectile.time;
            const currentY = (projectile.vy * projectile.time) + (0.5 * g * scale * projectile.time * projectile.time);
            
            const nextX = projectile.startX + currentX * scale;
            const nextY = projectile.startY + currentY * scale;

            // Wall collision check
            if (wall) {
                const wallTopY = height - 20 - wall.height;
                // If crossing the wall's X
                if ((projectile.x <= wall.x && nextX >= wall.x) || (projectile.x >= wall.x + wall.width && nextX <= wall.x + wall.width)) {
                    if (projectile.y > wallTopY) { // hit the wall
                        isFlying = false;
                        consecutiveFailures++;
                        if (feedbackEl) {
                            feedbackEl.style.display = 'block';
                            feedbackEl.innerHTML = '<strong>BOOM!</strong> O projétil bateu no muro! Tente aumentar o ângulo para conseguir uma parábola mais alta (maior Altura Máxima).';
                        }
                        createExplosion(wall.x, projectile.y);
                    }
                }
            }

            if (isFlying) {
                projectile.x = nextX;
                projectile.y = nextY;

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

        // Always loop if moving target or particles, or flying
        if (isFlying || particles.length > 0 || (target && target.moving)) {
            animationId = requestAnimationFrame(updateAndDraw);
        }
    }

    function checkTargetHit() {
        const impactX = projectile.x;
        if (impactX >= target.x - 20 && impactX <= target.x + target.width + 20) {
            target.hit = true;
            createExplosion(target.x + target.width/2, target.y);
            window.dispatchEvent(new CustomEvent('updateScore', { detail: { points: 100 } }));
            if(window.logActivity) window.logActivity(`Acertou o alvo no Lançamento de Projétil (\${currentScenario}) com V0=\${v0} e Ângulo=\${(theta * 180 / Math.PI).toFixed(0)}°`);
            consecutiveFailures = 0;
            if(feedbackEl) feedbackEl.style.display = 'none';
            
            // Change target location after short delay
            setTimeout(() => {
                if(!isFlying) scenarios[currentScenario].setup();
                if(!isFlying && !target.moving) drawScene();
            }, 2000);
        } else {
            consecutiveFailures++;
            if(window.logActivity) window.logActivity(`Errou o alvo no Lançamento de Projétil (\${currentScenario}). Distância alcançada: \${((impactX - 40) / scale).toFixed(2)}m`);
            if (consecutiveFailures >= 2 && feedbackEl) {
                feedbackEl.style.display = 'block';
                if (impactX < target.x) {
                    feedbackEl.innerHTML = '<strong>Dica:</strong> O projétil caiu ANTES do alvo. Tente aumentar a velocidade ou ajustar o ângulo para mais perto de 45° (alcance máximo).';
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
                color: `hsl(\${Math.random() * 60 + 15}, 100%, 50%)`,
                alpha: 1,
                size: Math.random() * 4 + 2
            });
        }
        // Ensure loop is running
        if (!isFlying && (!target || !target.moving)) {
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
            ctx.fillText(`\${((x-40)/scale)}m`, x - 10, height - 5);
        }

        // Draw Wall
        if (wall) {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(wall.x, height - 20 - wall.height, wall.width, wall.height);
            // Brick pattern
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            for(let y = height - 20; y > height - 20 - wall.height; y -= 10) {
                ctx.beginPath();
                ctx.moveTo(wall.x, y);
                ctx.lineTo(wall.x + wall.width, y);
                ctx.stroke();
            }
        }

        // Draw Target
        if (target) {
            ctx.fillStyle = target.hit ? '#ef4444' : '#10b981';
            ctx.shadowColor = target.hit ? '#ef4444' : '#10b981';
            ctx.shadowBlur = 10;
            ctx.fillRect(target.x, target.y - target.height, target.width, target.height);
            // reset shadow
            ctx.shadowBlur = 0;
            
            // If moving, draw speed vector
            if (target.moving && !target.hit) {
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(target.x + target.width/2, target.y - target.height - 5);
                const dir = target.vx > 0 ? 1 : -1;
                ctx.lineTo(target.x + target.width/2 + dir * 20, target.y - target.height - 5);
                ctx.lineTo(target.x + target.width/2 + dir * 15, target.y - target.height - 8);
                ctx.moveTo(target.x + target.width/2 + dir * 20, target.y - target.height - 5);
                ctx.lineTo(target.x + target.width/2 + dir * 15, target.y - target.height - 2);
                ctx.stroke();
            }
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

        // Draw Predicted Trajectory (if not flying and standard/wall)
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
                
                // Stop predicting if hits wall
                if (wall && px >= wall.x && px <= wall.x + wall.width && py > height - 20 - wall.height) {
                    ctx.lineTo(px, py);
                    break;
                }
                
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
    setTimeout(() => {
        if (scenarioSelect) updateScenarioUI();
        resizeCanvas();
    }, 100);
}
