import { Simulation } from '../../core/Simulation.js';
import { EnergyPhysics } from './EnergyPhysics.js';
import { EnergyRenderer } from './EnergyRenderer.js';
import { State } from '../../core/State.js';
import { PhysicsUtils } from '../../core/PhysicsUtils.js';

export class EnergyController extends Simulation {
    constructor() {
        super();
        this.physics = new EnergyPhysics();
        this.renderer = new EnergyRenderer('en-canvas');
        
        this.scenarios = {
            radar: {
                mission: '<strong>Missão:</strong> Ajuste a altura inicial para que a esfera passe pelo radar com a velocidade correta de <span style="color:var(--accent-primary)">14.0 m/s</span>!',
                theory: '<p><strong>Energia:</strong> Ep = Ec no plano.</p><p><strong>Conservação:</strong> m * g * h = (m * v²) / 2</p><p><strong>Logo:</strong> h = v² / (2 * g)</p>',
                varsText: 'm = 5kg, g = 9.81m/s², vAlvo = 14.0m/s'
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

        this.bindUI();

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.reset();
        });
        
        setTimeout(() => {
            this.renderer.resize();
            this.updateScenarioUI();
            if (this.ui.radarSpeedInput) this.ui.radarSpeedInput.dispatchEvent(new Event('input'));
        }, 100);
    }

    onTabActive() {
        this.renderer.resize();
        this.draw();
    }

    bindUI() {
        this.ui = {
            scenarioSelect: document.getElementById('en-scenario'),
            missionText: document.getElementById('en-mission-text'),
            theoryContent: document.getElementById('en-theory-content'),
            varText: document.getElementById('en-var-text'),
            heightInput: document.getElementById('en-height'),
            heightVal: document.getElementById('en-height-val'),
            massInput: document.getElementById('en-mass'),
            massVal: document.getElementById('en-mass-val'),
            frictionCheck: document.getElementById('en-friction'),
            radarSpeedInput: document.getElementById('en-radar-speed'),
            radarSpeedVal: document.getElementById('en-radar-speed-val'),
            radarControlDiv: document.getElementById('en-radar-control'),
            dropBtn: document.getElementById('en-drop-btn'),
            resetBtn: document.getElementById('en-reset-btn'),
            statPE: document.getElementById('stat-pe'),
            statKE: document.getElementById('stat-ke'),
            statTE: document.getElementById('stat-te'),
            barPE: document.getElementById('bar-pe'),
            barKE: document.getElementById('bar-ke'),
            formulaModeToggle: document.getElementById('en-formula-mode'),
            manualControls: document.getElementById('en-manual-controls'),
            formulaControls: document.getElementById('en-formula-controls'),
            formulaMass: document.getElementById('en-formula-mass'),
            formulaHeight: document.getElementById('en-formula-height'),
            calcBtn: document.getElementById('en-calc-btn'),
            calcResult: document.getElementById('en-calc-result'),
            feedbackEl: document.getElementById('en-feedback')
        };

        if (this.ui.scenarioSelect) this.ui.scenarioSelect.addEventListener('change', () => this.updateScenarioUI());

        this.ui.heightInput.addEventListener('input', (e) => {
            this.ui.heightVal.innerText = e.target.value;
            if(!this.physics.isPlaying) this.reset();
        });

        this.ui.massInput.addEventListener('input', (e) => {
            this.ui.massVal.innerText = e.target.value;
            if(!this.physics.isPlaying) this.reset();
        });

        if (this.ui.radarSpeedInput) {
            this.ui.radarSpeedInput.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                this.ui.radarSpeedVal.innerText = v.toFixed(1);
                this.scenarios.radar.mission = `<strong>Missão:</strong> Ajuste a altura inicial para que a esfera passe pelo radar com a velocidade correta de <span style="color:var(--accent-primary)">${v.toFixed(1)} m/s</span>!`;
                this.scenarios.radar.varsText = `m = 5kg, g = 9.81m/s², vAlvo = ${v.toFixed(1)}m/s`;
                if (this.ui.scenarioSelect.value === 'radar') {
                    this.ui.missionText.innerHTML = this.scenarios.radar.mission;
                    this.ui.varText.innerHTML = this.scenarios.radar.varsText;
                    if(!this.physics.isPlaying) this.reset();
                }
            });
        }

        this.ui.dropBtn.addEventListener('click', () => {
            if (!this.physics.isPlaying) {
                this.physics.isPlaying = true;
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
        const data = this.scenarios[type];
        if(data) {
            this.ui.missionText.innerHTML = data.mission;
            this.ui.theoryContent.innerHTML = data.theory;
            this.ui.varText.innerHTML = data.varsText;
        }
        if(this.ui.feedbackEl) this.ui.feedbackEl.style.display = 'none';
        
        if (this.ui.radarControlDiv) {
            this.ui.radarControlDiv.style.display = type === 'radar' ? 'block' : 'none';
        }
        
        this.renderer.resize();
        this.reset();
    }

    reset() {
        this.stop();
        const startHeightMeters = parseFloat(this.ui.heightInput.value) / 100;
        const mass = parseFloat(this.ui.massInput.value);
        const friction = this.ui.frictionCheck.checked;
        const radarSpeed = parseFloat(this.ui.radarSpeedInput.value);

        this.physics.setupScenario(this.ui.scenarioSelect.value, this.renderer.width, this.renderer.height, startHeightMeters, mass, friction, radarSpeed);
        
        this.updateStatsUI();
        this.draw();
    }

    updateStatsUI() {
        const energies = this.physics.calculateEnergies();
        this.ui.statPE.innerText = energies.PE.toFixed(1);
        this.ui.statKE.innerText = energies.KE.toFixed(1);
        this.ui.statTE.innerText = energies.TE.toFixed(1);

        if(!isNaN(energies.pePercent)) this.ui.barPE.style.height = `${energies.pePercent}%`;
        if(!isNaN(energies.kePercent)) this.ui.barKE.style.height = `${energies.kePercent}%`;
    }

    calculateFormula() {
        this.ui.calcResult.style.color = '';
        this.ui.calcResult.innerText = '';

        const mStr = this.ui.formulaMass.value;
        const hStr = this.ui.formulaHeight.value;

        const vars = {
            g: this.physics.g,
            m: parseFloat(mStr) || 5,
            vAlvo: this.physics.scenariosConfig.radar.targetSpeed,
            R: 3,
            hMax: 10
        };

        const calculatedMass = PhysicsUtils.evaluateFormula(mStr, vars);
        vars.m = calculatedMass !== null ? calculatedMass : vars.m;
        const calculatedHeight = PhysicsUtils.evaluateFormula(hStr, vars);

        if (calculatedMass === null || calculatedHeight === null) {
            this.ui.calcResult.style.color = 'var(--danger)';
            this.ui.calcResult.innerText = 'Erro na fórmula! Verifique a sintaxe.';
            return;
        }

        const clampedMass = Math.max(1, Math.min(20, calculatedMass));
        const clampedHeight = Math.max(10, Math.min(1000, calculatedHeight));
        
        this.ui.massInput.value = clampedMass;
        this.ui.massVal.innerText = clampedMass.toFixed(1);
        this.ui.heightInput.value = clampedHeight;
        this.ui.heightVal.innerText = clampedHeight.toFixed(1);

        this.ui.calcResult.style.color = 'var(--accent-tertiary)';
        this.ui.calcResult.innerText = `Sucesso! Massa = ${clampedMass.toFixed(1)} kg, Altura = ${clampedHeight.toFixed(1)} cm`;
        
        if(!this.physics.isPlaying) this.reset();
    }

    showFeedback(success, msg) {
        if(!this.ui.feedbackEl) return;
        this.ui.feedbackEl.style.display = 'block';
        this.ui.feedbackEl.style.backgroundColor = success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        this.ui.feedbackEl.style.borderLeftColor = success ? '#10b981' : '#ef4444';
        this.ui.feedbackEl.innerHTML = `<strong>Resultado:</strong> ${msg}`;
        
        const h = parseFloat(this.ui.heightInput.value)/100;
        State.logActivity(`Energia ${this.physics.currentScenario}: ${success?'Sucesso':'Falha'} com altura ${h.toFixed(2)} e atrito ${this.ui.frictionCheck.checked}`);
        
        if(success) State.addScore(100);
    }

    update(dt) {
        const result = this.physics.update(dt);
        this.updateStatsUI();

        if (result.event) {
            const ev = result.event;
            if (ev.type === 'radar_finish') {
                this.showFeedback(ev.success, `Velocidade no radar: ${ev.speed.toFixed(1)} m/s! ${ev.success ? 'Excelente!' : 'Tente novamente.'}`);
            } else if (ev.type === 'loop_fail') {
                this.showFeedback(false, 'Energia insuficiente! A força gravitacional superou a centrípeta e a esfera caiu.');
            } else if (ev.type === 'loop_success') {
                this.showFeedback(true, 'Incrível! Completou o looping com perfeição!');
            } else if (ev.type === 'jump_success') {
                this.showFeedback(true, 'Aterrissagem perfeita! Ec foi suficiente para o alcance do salto.');
            } else if (ev.type === 'jump_fail') {
                this.showFeedback(false, ev.reason === 'short' ? 'Oops! Caiu no abismo. Faltou energia.' : 'Oops! Passou reto da plataforma! Muita energia.');
            }
        }
        
        if (this.physics.ball.hasFinished) {
            this.stop();
        }
    }

    draw() {
        this.renderer.draw(this.physics);
    }
}
