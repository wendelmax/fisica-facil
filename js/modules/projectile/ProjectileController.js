import { Simulation } from '../../core/Simulation.js';
import { ProjectilePhysics } from './ProjectilePhysics.js';
import { ProjectileRenderer } from './ProjectileRenderer.js';
import { State } from '../../core/State.js';
import { PhysicsUtils } from '../../core/PhysicsUtils.js';

export class ProjectileController extends Simulation {
    constructor() {
        super();
        this.physics = new ProjectilePhysics();
        this.renderer = new ProjectileRenderer('sim-canvas');
        
        this.bindUI();
        this.consecutiveFailures = 0;
        
        this.scenarios = {
            standard: {
                mission: "<strong>Missão:</strong> Você é um engenheiro aeroespacial. Ajuste o ângulo e a velocidade para lançar um pacote de suprimentos no alvo estático!",
                theory: `
                    <p><strong>Alcance Máximo:</strong> D = (v² * sen(2θ)) / g</p>
                    <p><strong>Tempo de Voo:</strong> t = (2 * v * sen(θ)) / g</p>
                `
            },
            wall: {
                mission: "<strong>Missão:</strong> Há um muro alto bloqueando o caminho! Use um ângulo de tiro mais alto (parábola fechada) para superá-lo e acertar o alvo atrás dele.",
                theory: `
                    <p><strong>Altura Máxima:</strong> h = (v² * sen²(θ)) / (2*g)</p>
                    <p>O projétil precisa ter H_max maior que a altura do muro!</p>
                `
            },
            moving: {
                mission: "<strong>Missão:</strong> O alvo está em movimento! Calcule o Tempo de Voo para prever onde o alvo estará no momento do impacto.",
                theory: `
                    <p><strong>Tempo de Voo:</strong> t = (2 * v * sen(θ)) / g</p>
                    <p>O alvo se move a 5 m/s. Posição alvo = X_inicial + V_alvo * t</p>
                `
            }
        };

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.reset();
        });
        
        setTimeout(() => {
            this.renderer.resize();
            this.updateScenarioUI();
        }, 100);
    }

    onTabActive() {
        this.renderer.resize();
        this.draw();
        if (this.physics.target && this.physics.target.moving || this.renderer.particles.length > 0 || this.physics.isFlying) {
            this.start();
        }
    }

    bindUI() {
        this.ui = {
            scenarioSelect: document.getElementById('proj-scenario'),
            missionText: document.getElementById('proj-mission-text'),
            theoryContent: document.getElementById('proj-theory-content'),
            angleInput: document.getElementById('angle'),
            angleVal: document.getElementById('angle-val'),
            velocityInput: document.getElementById('velocity'),
            velocityVal: document.getElementById('velocity-val'),
            fireBtn: document.getElementById('fire-btn'),
            resetBtn: document.getElementById('reset-btn'),
            statTime: document.getElementById('stat-time'),
            statDistance: document.getElementById('stat-distance'),
            statHeight: document.getElementById('stat-height'),
            formulaModeToggle: document.getElementById('proj-formula-mode'),
            manualControls: document.getElementById('proj-manual-controls'),
            formulaControls: document.getElementById('proj-formula-controls'),
            varTextEl: document.getElementById('proj-var-text'),
            formulaAngle: document.getElementById('proj-formula-angle'),
            formulaVel: document.getElementById('proj-formula-vel'),
            calcBtn: document.getElementById('proj-calc-btn'),
            calcResult: document.getElementById('proj-calc-result'),
            feedbackEl: document.getElementById('proj-feedback')
        };

        if(this.ui.scenarioSelect) this.ui.scenarioSelect.addEventListener('change', () => this.updateScenarioUI());
        
        this.ui.angleInput.addEventListener('input', (e) => {
            this.ui.angleVal.innerText = e.target.value;
            if(!this.physics.isFlying) this.draw();
        });

        this.ui.velocityInput.addEventListener('input', (e) => {
            this.ui.velocityVal.innerText = e.target.value;
            if(!this.physics.isFlying) this.draw();
        });

        this.ui.fireBtn.addEventListener('click', () => {
            if (!this.physics.isFlying) this.fire();
        });

        this.ui.resetBtn.addEventListener('click', () => this.reset());

        this.ui.formulaModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.ui.manualControls.style.display = 'none';
                this.ui.formulaControls.style.display = 'flex';
            } else {
                this.ui.manualControls.style.display = 'block';
                this.ui.formulaControls.style.display = 'none';
            }
        });

        this.ui.calcBtn.addEventListener('click', () => this.calculateFormula());
    }

    getInputs() {
        return {
            v0: parseInt(this.ui.velocityInput.value),
            theta: parseInt(this.ui.angleInput.value) * (Math.PI / 180)
        };
    }

    updateScenarioUI() {
        const type = this.ui.scenarioSelect.value;
        const config = this.scenarios[type];
        if(config) {
            this.ui.missionText.innerHTML = config.mission;
            this.ui.theoryContent.innerHTML = config.theory;
        }
        this.reset();
    }

    updateVarsText() {
        if (!this.physics.target) return;
        const dist = (this.physics.target.x - 40) / this.renderer.scale;
        let text = `d = ${dist.toFixed(1)}m, g = 9.81m/s²`;
        if (this.physics.wall) text += `, h_muro = ${this.physics.wall.heightMeters.toFixed(1)}m`;
        if (this.physics.target.moving) text += `, v_alvo = ${this.physics.target.vx.toFixed(1)}m/s`;
        this.ui.varTextEl.innerText = text;
    }

    reset() {
        this.physics.reset();
        this.renderer.particles = [];
        this.physics.setupScenario(this.ui.scenarioSelect.value, this.renderer.width, this.renderer.scale);
        
        this.ui.statTime.innerText = "0.00";
        this.ui.statDistance.innerText = "0.00";
        this.ui.statHeight.innerText = "0.00";
        if(this.ui.feedbackEl) this.ui.feedbackEl.style.display = 'none';
        
        this.updateVarsText();
        this.draw();
        
        if (this.physics.target && this.physics.target.moving) {
            this.start();
        } else {
            this.stop();
        }
    }

    fire() {
        const { v0, theta } = this.getInputs();
        this.physics.fire(v0, theta);
        if(this.ui.feedbackEl) this.ui.feedbackEl.style.display = 'none';
        this.start();
    }

    calculateFormula() {
        this.ui.calcResult.style.color = '';
        this.ui.calcResult.innerText = '';

        const angleStr = this.ui.formulaAngle.value;
        const velStr = this.ui.formulaVel.value;

        const currentDistance = (this.physics.target.x - 40) / this.renderer.scale;
        const vars = {
            d: currentDistance,
            g: 9.81,
            h_muro: this.physics.wall ? this.physics.wall.heightMeters : 0
        };

        const calculatedAngle = PhysicsUtils.evaluateFormula(angleStr, vars);
        const calculatedVel = PhysicsUtils.evaluateFormula(velStr, vars);

        if (calculatedAngle === null || calculatedVel === null) {
            this.ui.calcResult.style.color = 'var(--danger)';
            this.ui.calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        if (isNaN(calculatedAngle) || isNaN(calculatedVel)) {
            this.ui.calcResult.style.color = 'var(--danger)';
            this.ui.calcResult.innerText = 'Resultado inválido (NaN). Verifique os cálculos.';
            return;
        }

        const clampedAngle = Math.max(0, Math.min(90, calculatedAngle));
        const clampedVel = Math.max(10, Math.min(100, calculatedVel));
        
        this.ui.angleInput.value = clampedAngle;
        this.ui.angleVal.innerText = clampedAngle.toFixed(1);
        this.ui.velocityInput.value = clampedVel;
        this.ui.velocityVal.innerText = clampedVel.toFixed(1);

        this.ui.calcResult.innerText = `Sucesso! Ângulo = ${clampedAngle.toFixed(1)}°, V0 = ${clampedVel.toFixed(1)} m/s`;
        
        if(!this.physics.isFlying) this.draw();
    }

    getPredictedPath() {
        const { v0, theta } = this.getInputs();
        const scale = this.renderer.scale;
        const g = 9.81;
        let points = [];
        
        let pvx = v0 * Math.cos(theta);
        let pvy = v0 * Math.sin(theta);
        let pt = 0;
        let px = 40;
        let py = 0;

        while(py >= 0 && pt < 20) {
            pt += 0.2;
            let cx = pvx * pt;
            let cy = (pvy * pt) - (0.5 * g * pt * pt);
            px = 40 + cx * scale;
            py = cy * scale;
            
            if (this.physics.wall && px >= this.physics.wall.x && px <= this.physics.wall.x + this.physics.wall.width && py < this.physics.wall.height) {
                points.push({x: px, y: py});
                break;
            }
            points.push({x: px, y: py});
        }
        return { theta, points };
    }

    update(dt) {
        // Speed up physics
        const simDt = dt * 2.5;

        // Bounce moving target
        if (this.physics.target && this.physics.target.moving) {
            if (this.physics.target.x < 100) this.physics.target.vx = Math.abs(this.physics.target.vx);
            if (this.physics.target.x > this.renderer.width - 60) this.physics.target.vx = -Math.abs(this.physics.target.vx);
            this.updateVarsText();
        }

        const result = this.physics.update(simDt, this.renderer.scale);
        this.renderer.updateParticles();

        if (this.physics.isFlying) {
            this.ui.statTime.innerText = this.physics.time.toFixed(2);
            this.ui.statDistance.innerText = ((this.physics.x - this.physics.startX) / this.renderer.scale).toFixed(2);
            this.ui.statHeight.innerText = Math.max(0, this.physics.maxHeight).toFixed(2);
        }

        if (result.collision) {
            if (result.collision === 'wall') {
                this.consecutiveFailures++;
                if (this.ui.feedbackEl) {
                    this.ui.feedbackEl.style.display = 'block';
                    this.ui.feedbackEl.innerHTML = '<strong>BOOM!</strong> O projétil bateu no muro! Tente aumentar o ângulo para conseguir uma parábola mais alta.';
                }
                this.renderer.createExplosion(result.x, this.renderer.toCanvasY(result.y));
            } else if (result.collision === 'target') {
                this.renderer.createExplosion(this.physics.target.x + this.physics.target.width/2, this.renderer.toCanvasY(this.physics.target.y));
                State.addScore(100);
                const {v0, theta} = this.getInputs();
                State.logActivity(`Acertou o alvo no Lançamento de Projétil (${this.ui.scenarioSelect.value}) com V0=${v0} e Ângulo=${(theta * 180 / Math.PI).toFixed(0)}°`);
                this.consecutiveFailures = 0;
                
                setTimeout(() => {
                    if(!this.physics.isFlying) {
                        this.physics.setupScenario(this.ui.scenarioSelect.value, this.renderer.width, this.renderer.scale);
                        this.draw();
                    }
                }, 2000);
            } else if (result.collision === 'ground') {
                this.consecutiveFailures++;
                State.logActivity(`Errou o alvo no Lançamento de Projétil (${this.ui.scenarioSelect.value}). Distância: ${((this.physics.x - 40) / this.renderer.scale).toFixed(2)}m`);
                if (this.consecutiveFailures >= 2 && this.ui.feedbackEl) {
                    this.ui.feedbackEl.style.display = 'block';
                    if (this.physics.x < this.physics.target.x) {
                        this.ui.feedbackEl.innerHTML = '<strong>Dica:</strong> O projétil caiu ANTES do alvo. Tente aumentar a velocidade ou ajustar o ângulo para mais perto de 45°.';
                    } else {
                        this.ui.feedbackEl.innerHTML = '<strong>Dica:</strong> O projétil passou do alvo. Tente diminuir a velocidade ou alterar o ângulo.';
                    }
                }
            }
            
            if (this.renderer.particles.length === 0 && !(this.physics.target && this.physics.target.moving)) {
                this.stop();
            }
        }
    }

    draw() {
        const predictedPath = this.getPredictedPath();
        this.renderer.draw(this.physics, predictedPath);
    }
}
