import { Simulation } from '../../core/Simulation.js';
import { ElectrostaticsPhysics } from './ElectrostaticsPhysics.js';
import { ElectrostaticsRenderer } from './ElectrostaticsRenderer.js';
import { State } from '../../core/State.js';
import { PhysicsUtils } from '../../core/PhysicsUtils.js';

export class ElectrostaticsController extends Simulation {
    constructor() {
        super();
        this.physics = new ElectrostaticsPhysics();
        this.renderer = new ElectrostaticsRenderer('elec-canvas');
        
        this.scenarios = {
            custom: {
                mission: "<strong>Missão:</strong> Clique em qualquer lugar na tela para definir o alvo. Depois guie a partícula até ele usando cargas geradoras!",
                theory: `
                    <p><strong>Lei de Coulomb:</strong> F = k * (|q1| * |q2|) / d²</p>
                    <p>Cargas iguais se repelem, cargas opostas se atraem.</p>
                `
            },
            maze: {
                mission: "<strong>Missão:</strong> Campo Minado! A partícula não pode encostar nas áreas de antimatéria (vermelhas). Faça-a contornar usando múltiplas cargas.",
                theory: `
                    <p>Você precisará do Princípio da Superposição.</p>
                    <p>A Força Resultante é a soma vetorial de todas as forças elétricas atuando na carga.</p>
                `
            },
            orbit: {
                mission: "<strong>Missão:</strong> Gravidade Elétrica! Prenda a carga de prova em uma órbita estável ao redor de uma carga central. Sobreviva e complete 1 volta (360°).",
                theory: `
                    <p><strong>Força Centrípeta:</strong> Fc = m * v² / R</p>
                    <p>A Força Elétrica deve ser exatamente igual à Força Centrípeta necessária para manter o movimento circular uniforme.</p>
                `
            }
        };

        this.bindUI();
        
        this.isDragging = false;
        this.dragTarget = null;

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.reset(true);
        });
        
        setTimeout(() => {
            this.renderer.resize();
            this.updateScenarioUI();
        }, 100);
    }

    onTabActive() {
        this.renderer.resize();
        this.draw();
        this.start();
    }

    bindUI() {
        this.ui = {
            scenarioSelect: document.getElementById('elec-scenario'),
            missionText: document.getElementById('elec-mission-text'),
            theoryContent: document.getElementById('elec-theory-content'),
            chargeMagInput: document.getElementById('elec-charge-mag'),
            chargeMagVal: document.getElementById('elec-charge-val'),
            showFieldCheck: document.getElementById('show-field'),
            resetBtn: document.getElementById('elec-reset-btn'),
            addPosBtn: document.getElementById('add-pos-btn'),
            addNegBtn: document.getElementById('add-neg-btn'),
            statForce: document.getElementById('stat-elec-force'),
            statDist: document.getElementById('stat-elec-dist'),
            formulaModeToggle: document.getElementById('elec-formula-mode'),
            manualControls: document.getElementById('elec-manual-controls'),
            formulaControls: document.getElementById('elec-formula-controls'),
            varTextEl: document.getElementById('elec-var-text'),
            formulaCharge: document.getElementById('elec-formula-charge'),
            calcBtn: document.getElementById('elec-calc-btn'),
            calcResult: document.getElementById('elec-calc-result'),
            feedbackEl: document.getElementById('elec-feedback')
        };

        if (this.ui.scenarioSelect) this.ui.scenarioSelect.addEventListener('change', () => this.updateScenarioUI());

        this.ui.chargeMagInput.addEventListener('input', (e) => {
            this.ui.chargeMagVal.innerText = e.target.value;
        });

        this.ui.addPosBtn.addEventListener('click', () => {
            this.physics.addCharge(parseFloat(this.ui.chargeMagInput.value), this.renderer.width, this.renderer.height);
        });

        this.ui.addNegBtn.addEventListener('click', () => {
            this.physics.addCharge(-parseFloat(this.ui.chargeMagInput.value), this.renderer.width, this.renderer.height);
        });

        this.ui.resetBtn.addEventListener('click', () => {
            State.logActivity(`Limpou as cargas na Eletrostática (${this.physics.currentScenario}).`);
            this.reset(true);
        });

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

        // Mouse events for custom target placement and dragging
        if (this.renderer.canvas) {
            this.renderer.canvas.addEventListener('mousedown', (e) => {
                const rect = this.renderer.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                let clickedCharge = false;
                for (let charge of this.physics.charges) {
                    const dist = Math.hypot(charge.x - mouseX, charge.y - mouseY);
                    if (dist < 20) {
                        this.isDragging = true;
                        this.dragTarget = charge;
                        clickedCharge = true;
                        break;
                    }
                }
                
                if (!clickedCharge && this.physics.currentScenario === 'custom' && this.physics.target) {
                    this.physics.target.x = mouseX;
                    this.physics.target.y = mouseY;
                    this.updateVarsText();
                }
            });

            this.renderer.canvas.addEventListener('mousemove', (e) => {
                if (this.isDragging && this.dragTarget) {
                    const rect = this.renderer.canvas.getBoundingClientRect();
                    this.dragTarget.x = e.clientX - rect.left;
                    this.dragTarget.y = e.clientY - rect.top;
                }
            });

            this.renderer.canvas.addEventListener('mouseup', () => {
                this.isDragging = false;
                this.dragTarget = null;
            });
        }
    }

    updateScenarioUI() {
        const type = this.ui.scenarioSelect.value;
        const data = this.scenarios[type];
        if(data) {
            this.ui.missionText.innerHTML = data.mission;
            this.ui.theoryContent.innerHTML = data.theory;
        }
        if(this.ui.feedbackEl) this.ui.feedbackEl.style.display = 'none';
        this.reset(true);
    }

    reset(hardReset = false) {
        if (hardReset) {
            this.physics.reset();
        }
        
        this.physics.setupScenario(this.ui.scenarioSelect.value, this.renderer.width, this.renderer.height);
        this.updateVarsText();
        this.draw();
        this.start();
    }

    updateVarsText() {
        if (this.physics.target && this.physics.testCharge) {
            const dist = Math.hypot(this.physics.testCharge.x - this.physics.target.x, this.physics.testCharge.y - this.physics.target.y);
            this.ui.varTextEl.innerText = `d = ${dist.toFixed(1)}m, k = 8.99e9, qProva = +10`;
        } else {
            this.ui.varTextEl.innerText = `k = 8.99e9, qProva = +10, R = alvo circular`;
        }
    }

    calculateFormula() {
        this.ui.calcResult.style.color = '';
        this.ui.calcResult.innerText = '';

        const chargeStr = this.ui.formulaCharge.value;
        let currentDistance = 0;
        if (this.physics.target && this.physics.testCharge) {
             currentDistance = Math.hypot(this.physics.testCharge.x - this.physics.target.x, this.physics.testCharge.y - this.physics.target.y);
        }

        const vars = {
            d: currentDistance,
            k: this.physics.K,
            qProva: 10
        };

        const calculatedCharge = PhysicsUtils.evaluateFormula(chargeStr, vars);

        if (calculatedCharge === null) {
            this.ui.calcResult.style.color = 'var(--danger)';
            this.ui.calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        const clampedCharge = Math.max(10, Math.min(200, Math.abs(calculatedCharge)));
        
        this.ui.chargeMagInput.value = clampedCharge;
        this.ui.chargeMagVal.innerText = clampedCharge.toFixed(1);

        this.ui.calcResult.style.color = 'var(--accent-tertiary)';
        this.ui.calcResult.innerText = `Sucesso! Carga = ${clampedCharge.toFixed(1)} μC`;
    }

    failLevel(msg) {
        State.logActivity(`Falha na Eletrostática (${this.physics.currentScenario}): ${msg}`);
        if(this.ui.feedbackEl) {
            this.ui.feedbackEl.style.display = 'block';
            this.ui.feedbackEl.innerHTML = `<strong>Ops!</strong> ${msg} Tente ajustar as cargas.`;
        }
    }

    update(dt) {
        // Run physics multiple steps if we want it decoupled from framerate, but it was coupled before.
        const result = this.physics.update(this.renderer.width, this.renderer.height);

        if (result.event) {
            if (result.event === 'crashed_charge') {
                this.failLevel("A partícula colidiu com uma carga geradora!");
            } else if (result.event === 'out_of_bounds_orbit') {
                this.failLevel("A partícula escapou da órbita!");
            } else if (result.event === 'crashed_obstacle') {
                this.failLevel("A partícula entrou no campo de antimatéria!");
            } else if (result.event === 'target_hit') {
                State.addScore(200);
                State.logActivity(`Acertou o alvo na Eletrostática (${this.physics.currentScenario}).`);
                if(this.ui.feedbackEl) this.ui.feedbackEl.style.display = 'none';
                setTimeout(() => this.reset(false), 2000);
            } else if (result.event === 'orbit_complete') {
                State.addScore(300);
                State.logActivity(`Completou órbita na Eletrostática.`);
                if(this.ui.feedbackEl) {
                    this.ui.feedbackEl.style.display = 'block';
                    this.ui.feedbackEl.innerHTML = '<strong>Órbita Estável Alcançada!</strong> Você completou 360° com sucesso.';
                }
            }
        }

        if (result.fx !== undefined && result.fy !== undefined) {
            this.ui.statForce.innerText = Math.hypot(result.fx, result.fy).toFixed(2);
        }

        if (this.physics.target && this.physics.testCharge) {
            const distToTarget = Math.hypot(this.physics.testCharge.x - this.physics.target.x, this.physics.testCharge.y - this.physics.target.y);
            this.ui.statDist.innerText = distToTarget.toFixed(2);
        } else if (this.physics.orbitState.active) {
            this.ui.statDist.innerText = `${Math.abs((this.physics.orbitState.totalAngle * 180 / Math.PI)).toFixed(0)}°`;
        }
    }

    draw() {
        this.renderer.draw(this.physics, this.ui.showFieldCheck.checked);
    }
}
