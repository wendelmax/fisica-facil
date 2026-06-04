export class StateStore {
    constructor() {
        this.storageKey = 'fisicaFacilState';
        this.state = this._loadState();
        this.listeners = [];
    }

    _loadState() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : {
            score: 0,
            activeModule: 'projectile',
            history: []
        };
    }

    _saveState() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        this._notifyListeners();
    }

    get score() { return this.state.score; }
    get activeModule() { return this.state.activeModule; }
    get history() { return this.state.history; }

    addScore(points) {
        this.state.score += points;
        this._saveState();
    }

    setActiveModule(moduleName) {
        this.state.activeModule = moduleName;
        this._saveState();
    }

    logActivity(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.state.history.push(`[${timestamp}] ${message}`);
        this._saveState();
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    _notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

export const State = new StateStore();
