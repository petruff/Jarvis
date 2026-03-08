/**
 * Fast EN/PT Language Detector for JARVIS
 */
export class LanguageDetector {
    private static readonly PORTUGUESE_KEYWORDS = [
        'ola', 'bom', 'dia', 'como', 'esta', 'mim', 'agora', 'faz', 'quer', 'sim', 'nao',
        'obrigado', 'agente', 'voce', 'por', 'favor', 'pode', 'ajuda', 'falar', 'com'
    ];

    /**
     * Detects if the text is likely Portuguese or English
     */
    static detect(text: string): 'en' | 'pt-BR' {
        if (!text) return 'en';

        const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        const words = lower.split(/\s+/);

        // Simple heuristic: count matching common PT words
        const ptMatches = words.filter(w => this.PORTUGUESE_KEYWORDS.includes(w)).length;

        // Heuristic 2: Check for common PT suffixes/patterns
        const ptPatterns = (lower.match(/ao\b|oes\b|ia\b|ar\b|er\b|ir\b/g) || []).length;

        if (ptMatches > 0 || ptPatterns > 2) {
            return 'pt-BR';
        }

        return 'en';
    }
}
