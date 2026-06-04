import { State } from '../core/State.js';

export class UIManager {
    constructor() {
        this.scoreEl = document.getElementById('score');
        this.navLinks = document.querySelectorAll('nav a');
        this.modules = document.querySelectorAll('.module-view');
        this.btnHighContrast = document.getElementById('btn-high-contrast');
        this.btnReport = document.getElementById('btn-report');

        this.moduleControllers = {}; // To call re-init on tab switch

        this.init();
    }

    registerModule(moduleName, controller) {
        this.moduleControllers[moduleName] = controller;
    }

    init() {
        // Init Score
        this.updateScoreUI(State.score);
        
        // Listen for state changes
        State.subscribe((state) => {
            this.updateScoreUI(state.score);
        });

        // Event Listeners for Navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetModule = e.target.dataset.module;
                if (!targetModule) return;
                this.switchTab(targetModule);
            });
        });

        // High Contrast Feature
        if(localStorage.getItem('fisicaFacilHighContrast') === 'true') {
            document.body.classList.add('high-contrast');
        }
        this.btnHighContrast.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
            localStorage.setItem('fisicaFacilHighContrast', document.body.classList.contains('high-contrast'));
        });

        // Report Feature
        this.btnReport.addEventListener('click', () => this.generateReport());
        
        // Custom event to add score globally (keeps compatibility if needed)
        window.addEventListener('updateScore', (e) => {
            State.addScore(e.detail.points);
        });
    }

    switchTab(targetModule) {
        // Update active state in nav
        this.navLinks.forEach(l => l.parentElement.classList.remove('active'));
        const activeLink = document.querySelector(`nav a[data-module="${targetModule}"]`);
        if (activeLink) activeLink.parentElement.classList.add('active');

        // Show active module
        this.modules.forEach(m => {
            m.classList.remove('active');
            if(m.id === `module-${targetModule}`) {
                m.classList.add('active');
            }
        });

        State.setActiveModule(targetModule);
        
        // Re-initialize controller to fix canvas scaling on tab switch
        if (this.moduleControllers[targetModule]) {
            this.moduleControllers[targetModule].onTabActive();
        }
    }

    restoreActiveTab() {
        this.switchTab(State.activeModule);
    }

    updateScoreUI(score) {
        if (!this.scoreEl) return;
        if (this.scoreEl.innerText != score) {
            this.scoreEl.innerText = score;
            // Simple animation for score
            this.scoreEl.style.transform = 'scale(1.5)';
            this.scoreEl.style.color = '#fff';
            setTimeout(() => {
                this.scoreEl.style.transform = 'scale(1)';
                this.scoreEl.style.color = 'var(--accent-tertiary)';
            }, 300);
        }
    }

    generateReport() {
        const reportWin = window.open('', '_blank');
        const history = State.history;
        const historyHtml = history.length > 0 
            ? history.map(h => `<li>${h}</li>`).join('') 
            : '<li>Nenhuma atividade registrada ainda.</li>';
            
        reportWin.document.write(`
            <html>
            <head>
                <title>Relatório de Desempenho - Física Fácil</title>
                <style>
                    body { font-family: sans-serif; padding: 2rem; color: #333; max-width: 800px; margin: 0 auto; }
                    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                    .score-box { background: #f0fdf4; border: 1px solid #16a34a; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .score { font-size: 1.8rem; font-weight: bold; color: #16a34a; }
                    ul { line-height: 1.6; background: #f8fafc; padding: 20px 40px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    li { margin-bottom: 8px; }
                    button { margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #2563eb; color: #fff; border: none; border-radius: 4px; }
                    button:hover { background: #1d4ed8; }
                    @media print { button { display: none; } body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>Relatório de Desempenho - Física Fácil</h1>
                <div class="score-box">
                    <strong>Pontuação Total Alcançada:</strong> <span class="score">${State.score}</span>
                </div>
                <h2>Histórico de Atividades e Fórmulas Utilizadas:</h2>
                <ul>${historyHtml}</ul>
                <button onclick="window.print()">Imprimir / Salvar PDF</button>
            </body>
            </html>
        `);
        reportWin.document.close();
    }
}
