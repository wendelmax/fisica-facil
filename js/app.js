window.PhysicsUtils = {
    evaluateFormula: (formula, variables) => {
        try {
            if (!formula || formula.trim() === '') return null;
            // Uses math.js which is loaded in index.html
            if (typeof math !== 'undefined') {
                return math.evaluate(formula, variables);
            } else {
                console.error("math.js not loaded!");
                return null;
            }
        } catch (e) {
            console.error("Formula error:", e);
            return null;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Global State
    const savedState = localStorage.getItem('fisicaFacilState');
    const state = savedState ? JSON.parse(savedState) : {
        score: 0,
        activeModule: 'projectile',
        history: []
    };

    const saveState = () => localStorage.setItem('fisicaFacilState', JSON.stringify(state));

    const scoreEl = document.getElementById('score');
    scoreEl.innerText = state.score;

    // Expose a global logger for modules to register activity
    window.logActivity = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        state.history.push(`[${timestamp}] ${message}`);
        saveState();
    };

    // Navigation logic
    const navLinks = document.querySelectorAll('nav a');
    const modules = document.querySelectorAll('.module-view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetModule = e.target.dataset.module;
            if(!targetModule) return;

            // Update active state in nav
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            e.target.parentElement.classList.add('active');

            // Show active module
            modules.forEach(m => {
                m.classList.remove('active');
                if(m.id === `module-${targetModule}`) {
                    m.classList.add('active');
                }
            });

            state.activeModule = targetModule;
            saveState();
            
            // Re-initialize to fix canvas scaling on tab switch
            if (targetModule === 'projectile' && typeof initProjectileModule === 'function') initProjectileModule();
            if (targetModule === 'dynamics' && typeof initDynamicsModule === 'function') initDynamicsModule();
            if (targetModule === 'energy' && typeof initEnergyModule === 'function') initEnergyModule();
            if (targetModule === 'electrostatics' && typeof initElectrostaticsModule === 'function') initElectrostaticsModule();
        });
    });

    // Score update event listener (custom event)
    window.addEventListener('updateScore', (e) => {
        state.score += e.detail.points;
        scoreEl.innerText = state.score;
        saveState();
        
        // Simple animation for score
        scoreEl.style.transform = 'scale(1.5)';
        scoreEl.style.color = '#fff';
        setTimeout(() => {
            scoreEl.style.transform = 'scale(1)';
            scoreEl.style.color = 'var(--accent-tertiary)';
        }, 300);
    });

    // High Contrast Feature
    const btnHighContrast = document.getElementById('btn-high-contrast');
    if(localStorage.getItem('fisicaFacilHighContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
    btnHighContrast.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        localStorage.setItem('fisicaFacilHighContrast', document.body.classList.contains('high-contrast'));
    });

    // Export Report Feature
    const btnReport = document.getElementById('btn-report');
    btnReport.addEventListener('click', () => {
        const reportWin = window.open('', '_blank');
        const historyHtml = state.history.length > 0 
            ? state.history.map(h => `<li>${h}</li>`).join('') 
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
                    <strong>Pontuação Total Alcançada:</strong> <span class="score">${state.score}</span>
                </div>
                <h2>Histórico de Atividades e Fórmulas Utilizadas:</h2>
                <ul>${historyHtml}</ul>
                <button onclick="window.print()">Imprimir / Salvar PDF</button>
            </body>
            </html>
        `);
        reportWin.document.close();
    });

    // Initialize modules
    if(state.activeModule === 'projectile' && typeof initProjectileModule === 'function') initProjectileModule();
    if(state.activeModule === 'dynamics' && typeof initDynamicsModule === 'function') initDynamicsModule();
    if(state.activeModule === 'energy' && typeof initEnergyModule === 'function') initEnergyModule();
    if(state.activeModule === 'electrostatics' && typeof initElectrostaticsModule === 'function') initElectrostaticsModule();
    
    // Set active tab based on loaded state
    navLinks.forEach(l => l.parentElement.classList.remove('active'));
    document.querySelector(`nav a[data-module="${state.activeModule}"]`)?.parentElement.classList.add('active');
    modules.forEach(m => m.classList.remove('active'));
    document.getElementById(`module-${state.activeModule}`)?.classList.add('active');
});
