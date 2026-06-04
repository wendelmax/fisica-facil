import { Simulation } from '../../core/Simulation.js';
import { DynamicsPhysics } from './DynamicsPhysics.js';
import { DynamicsRenderer } from './DynamicsRenderer.js';
import { State } from '../../core/State.js';
import { PhysicsUtils } from '../../core/PhysicsUtils.js';

export class DynamicsController extends Simulation {
    constructor() {
        super();
        this.physics = new DynamicsPhysics();
        this.renderer = new DynamicsRenderer('dyn-canvas');
        
        this.bindUI();
        this.consecutiveFailures = 0;
        
        this.scenarios = {
            standard: {
                mission: "<strong>Missão:</strong> Ajude a equipe de resgate a empurrar uma caixa pesada até a zona de segurança!",
                theory: `
                    <p><strong>Força de Atrito:</strong> F<sub>at</sub> = μ * N (N = m * g)</p>
                    <p><strong>Força Resultante:</strong> F<sub>R</sub> = F<sub>aplicada</sub> - F<sub>at</sub> = m * a</p>
                `
            },
            mixed: {
                mission: "<strong>Missão:</strong> O caminho tem metade gelo (μ=0.01) e metade areia (μ=0.6)! A zona segura fica na areia.",
                theory: `
                    <p>A Força Resultante muda de acordo com a superfície!</p>
                    <p>No gelo: F<sub>at</sub> = 0.01 * N</p>
                    <p>Na areia: F<sub>at</sub> = 0.6 * N</p>
                `
            },
            ramp: {
                mission: "<strong>Missão:</strong> Agora a caixa precisa subir uma ladeira de 15°! A gravidade vai puxá-la para trás.",
                theory: `
                    <p><strong>Componente do Peso (Px):</strong> Px = m * g * sen(15°)</p>
                    <p><strong>Força Normal (N):</strong> N = m * g * cos(15°)</p>
                    <p><strong>Força Resultante:</strong> F<sub>R</sub> = F<sub>aplicada</sub> - F<sub>at</sub> - Px</p>
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
    }

    bindUI() {
        this.ui = {
            scenarioSelect: document.getElementById('dyn-scenario'),
            missionText: document.getElementById('dyn-mission-text'),
            theoryContent: document.getElementById('dyn-theory-content'),
            massInput: document.getElementById('dyn-mass'),
            massVal: document.getElementById('dyn-mass-val'),
            forceInput: document.getElementById('dyn-force'),
            forceVal: document.getElementById('dyn-force-val'),
            frictionInput: document.getElementById('dyn-friction'),
            frictionVal: document.getElementById('dyn-friction-val'),
            pushBtn: document.getElementById('dyn-push-btn'),
            resetBtn: document.getElementById('dyn-reset-btn'),
            statFres: document.getElementById('stat-fres'),
            statAccel: document.getElementById('stat-accel'),
            statVel: document.getElementById('stat-dyn-vel'),
            formulaModeToggle: document.getElementById('dyn-formula-mode'),
            manualControls: document.getElementById('dyn-manual-controls'),
            formulaControls: document.getElementById('dyn-formula-controls'),
            varTextEl: document.getElementById('dyn-var-text'),
            formulaMass: document.getElementById('dyn-formula-mass'),
            formulaFric: document.getElementById('dyn-formula-fric'),
            formulaForce: document.getElementById('dyn-formula-force'),
            calcBtn: document.getElementById('dyn-calc-btn'),
            calcResult: document.getElementById('dyn-calc-result'),
            feedbackEl: document.getElementById('dyn-feedback')
        };

        if(this.ui.scenarioSelect) this.ui.scenarioSelect.addEventListener('change', () => this.updateScenarioUI());
        
        this.ui.massInput.addEventListener('input', (e) => {
            this.ui.massVal.innerText = e.target.value;
            this.physics.mass = parseFloat(e.target.value);
            if(!this.physics.isPlaying) { this.updateStats(); this.updateVarsText(); }
        });

        this.ui.forceInput.addEventListener('input', (e) => {
            this.ui.forceVal.innerText = e.target.value;
            this.physics.appliedForce = parseFloat(e.target.value);
            if(!this.physics.isPlaying) { this.updateStats(); this.updateVarsText(); this.draw(); }
        });

        this.ui.frictionInput.addEventListener('input', (e) => {
            this.ui.frictionVal.innerText = e.target.value;
            this.physics.mu = parseFloat(e.target.value);
            if(!this.physics.isPlaying) { this.updateStats(); this.updateVarsText(); }
        });

        this.ui.pushBtn.addEventListener('click', () => {
            if (!this.physics.isPlaying) {
                this.physics.startPush(parseFloat(this.ui.forceInput.value));
                this.start();
            }
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

    updateScenarioUI() {
        const type = this.ui.scenarioSelect.value;
        const config = this.scenarios[type];
        if(config) {
            this.ui.missionText.innerHTML = config.mission;
            this.ui.theoryContent.innerHTML = config.theory;
        }

        if (type === 'mixed') {
            this.ui.frictionInput.disabled = true;
        } else {
            this.ui.frictionInput.disabled = false;
        }

        this.reset();
    }

    updateVarsText() {
        if (!this.physics.targetArea) return;
        const currentDistance = (this.physics.targetArea.x - 50) / this.renderer.scale;
        let text = `m = ${this.physics.mass.toFixed(1)}kg, g = 9.81m/s², d = ${currentDistance.toFixed(1)}m`;
        if (this.ui.scenarioSelect.value === 'mixed') {
            text += `, mu_gelo = 0.01, mu_areia = 0.6`;
        } else {
            text += `, mu = ${this.physics.mu.toFixed(2)}`;
        }
        this.ui.varTextEl.innerText = text;
    }

    updateStats() {
        const forces = this.physics.calculateForces();
        this.ui.statFres.innerText = forces.netForce.toFixed(2);
        this.ui.statAccel.innerText = forces.accel.toFixed(2);
        this.ui.statVel.innerText = this.physics.block.vx.toFixed(2);
    }

    reset() {
        this.stop();
        this.physics.reset();
        
        const m = parseFloat(this.ui.massInput.value);
        const mu = parseFloat(this.ui.frictionInput.value);
        
        this.physics.setupScenario(this.ui.scenarioSelect.value, this.renderer.width, m, mu);
        this.physics.appliedForce = parseFloat(this.ui.forceInput.value);
        
        this.updateVarsText();
        this.updateStats();
        this.draw();
        
        if(this.ui.feedbackEl) this.ui.feedbackEl.style.display = 'none';
    }

    calculateFormula() {
        this.ui.calcResult.style.color = '';
        this.ui.calcResult.innerText = '';

        const mStr = this.ui.formulaMass.value;
        const muStr = this.ui.formulaFric.value;
        const forceStr = this.ui.formulaForce.value;

        const currentDistance = (this.physics.targetArea.x - 50) / this.renderer.scale;
        const vars = {
            d: currentDistance,
            g: this.physics.g,
            m: parseFloat(mStr) || 10,
            mu: parseFloat(muStr) || 0.2
        };

        const calculatedMass = PhysicsUtils.evaluateFormula(mStr, vars);
        const calculatedFric = PhysicsUtils.evaluateFormula(muStr, vars);
        
        vars.m = calculatedMass !== null ? calculatedMass : vars.m;
        vars.mu = calculatedFric !== null ? calculatedFric : vars.mu;
        
        const calculatedForce = PhysicsUtils.evaluateFormula(forceStr, vars);

        if (calculatedForce === null || calculatedMass === null || calculatedFric === null) {
            this.ui.calcResult.style.color = 'var(--danger)';
            this.ui.calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        if (isNaN(calculatedForce)) {
             this.ui.calcResult.style.color = 'var(--danger)';
             this.ui.calcResult.innerText = 'Resultado inválido (NaN).';
             return;
        }

        const clampedMass = Math.max(1, Math.min(50, calculatedMass));
        const clampedFric = Math.max(0, Math.min(1, calculatedFric));
        const clampedForce = Math.max(0, Math.min(300, calculatedForce));
        
        this.ui.massInput.value = clampedMass;
        this.ui.massVal.innerText = clampedMass.toFixed(1);
        this.physics.mass = clampedMass;

        if (!this.ui.frictionInput.disabled) {
            this.ui.frictionInput.value = clampedFric;
            this.ui.frictionVal.innerText = clampedFric.toFixed(2);
            this.physics.mu = clampedFric;
        }

        this.ui.forceInput.value = clampedForce;
        this.ui.forceVal.innerText = clampedForce.toFixed(1);
        this.physics.appliedForce = clampedForce;

        this.ui.calcResult.style.color = 'var(--accent-tertiary)';
        this.ui.calcResult.innerText = `Sucesso! F = ${clampedForce.toFixed(1)} N`;
        
        if(!this.physics.isPlaying) {
            this.updateStats();
            this.updateVarsText();
            this.draw();
        }
    }

    update(dt) {
        const result = this.physics.update(dt, this.renderer.scale, this.renderer.width);
        this.updateStats();

        if (result.event) {
            this.stop();
            const win = this.physics.checkWin();
            const center = this.physics.block.x + this.physics.block.size/2;

            if (win) {
                State.addScore(150);
                State.logActivity(`Acertou no Dinâmica (${this.ui.scenarioSelect.value}). Força inicial=${this.ui.forceInput.value}N`);
                this.consecutiveFailures = 0;
                if(this.ui.feedbackEl) this.ui.feedbackEl.style.display = 'none';
            } else {
                this.consecutiveFailures++;
                State.logActivity(`Errou no Dinâmica (${this.ui.scenarioSelect.value}). Caixa parou fora do alvo.`);
                if (this.consecutiveFailures >= 2 && this.ui.feedbackEl) {
                    this.ui.feedbackEl.style.display = 'block';
                    if (center < this.physics.targetArea.x) {
                        this.ui.feedbackEl.innerHTML = '<strong>Dica:</strong> A caixa parou ANTES do alvo. Verifique se a sua Força Resultante (Força - Atrito - Px) é suficiente para criar inércia!';
                    } else {
                        this.ui.feedbackEl.innerHTML = '<strong>Dica:</strong> A caixa PASSOU do alvo. Você aplicou muita força. Reduza-a ou use o Modo Fórmula para calcular.';
                    }
                }
            }
        }
    }

    draw() {
        this.renderer.draw(this.physics, this.ui.scenarioSelect.value);
    }
}
