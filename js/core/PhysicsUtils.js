export class PhysicsUtils {
    static evaluateFormula(formula, variables) {
        try {
            if (!formula || formula.trim() === '') return null;
            // Utiliza o math.js que é carregado no index.html
            if (typeof math !== 'undefined') {
                return math.evaluate(formula, variables);
            } else {
                console.error("math.js não está carregado!");
                return null;
            }
        } catch (e) {
            console.error("Erro na fórmula:", e);
            return null;
        }
    }
}
