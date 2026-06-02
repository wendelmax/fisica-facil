

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
    const state = {
        score: 0,
        activeModule: 'projectile'
    };

    const scoreEl = document.getElementById('score');

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
            
            // Re-initialize to fix canvas scaling on tab switch
            if (targetModule === 'projectile') {
                if(typeof initProjectileModule === 'function') initProjectileModule();
            } else if (targetModule === 'dynamics') {
                if(typeof initDynamicsModule === 'function') initDynamicsModule();
            } else if (targetModule === 'energy') {
                if(typeof initEnergyModule === 'function') initEnergyModule();
            } else if (targetModule === 'electrostatics') {
                if(typeof initElectrostaticsModule === 'function') initElectrostaticsModule();
            }
        });
    });

    // Score update event listener (custom event)
    window.addEventListener('updateScore', (e) => {
        state.score += e.detail.points;
        scoreEl.innerText = state.score;
        
        // Simple animation for score
        scoreEl.style.transform = 'scale(1.5)';
        scoreEl.style.color = '#fff';
        setTimeout(() => {
            scoreEl.style.transform = 'scale(1)';
            scoreEl.style.color = 'var(--accent-tertiary)';
        }, 300);
    });

    // Initialize modules
    if(typeof initProjectileModule === 'function') initProjectileModule();
    if(typeof initDynamicsModule === 'function') initDynamicsModule();
    if(typeof initEnergyModule === 'function') initEnergyModule();
    if(typeof initElectrostaticsModule === 'function') initElectrostaticsModule();
});
