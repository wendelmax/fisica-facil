import { State } from './core/State.js';
import { UIManager } from './ui/UIManager.js';
import { ProjectileController } from './modules/projectile/ProjectileController.js';
import { DynamicsController } from './modules/dynamics/DynamicsController.js';
import { EnergyController } from './modules/energy/EnergyController.js';
import { ElectrostaticsController } from './modules/electrostatics/ElectrostaticsController.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI Manager
    const uiManager = new UIManager();

    // Initialize modules
    const projectileController = new ProjectileController();
    uiManager.registerModule('projectile', projectileController);

    const dynamicsController = new DynamicsController();
    uiManager.registerModule('dynamics', dynamicsController);

    const energyController = new EnergyController();
    uiManager.registerModule('energy', energyController);

    const electrostaticsController = new ElectrostaticsController();
    uiManager.registerModule('electrostatics', electrostaticsController);

    // Restore active tab
    uiManager.restoreActiveTab();
});
