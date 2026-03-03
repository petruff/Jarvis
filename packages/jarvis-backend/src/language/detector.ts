import { franc } from 'franc-min';

export class LanguageDetector {
    private static ISO_MAP: Record<string, 'en' | 'pt' | 'es'> = {
        'eng': 'en',
        'por': 'pt',
        'spa': 'es'
    };

    /**
     * Detects the language of a given text and returns 'en', 'pt', or 'es'.
     * Defaults to 'en' if detection is uncertain.
     */
    detect(text: string): 'en' | 'pt' | 'es' {
        if (!text || text.length < 5) return 'en';

        // Custom triggers for high-frequency words that franc might miss in short sentences
        const lower = text.toLowerCase();
        if (/\b(bom dia|boa tarde|boa noite|como vai|você|fazer|ajudar)\b/.test(lower)) return 'pt';
        if (/\b(hola|buenos días|qué tal|hacer|ayuda)\b/.test(lower)) return 'es';

        const iso3 = franc(text);
        return LanguageDetector.ISO_MAP[iso3] || 'en';
    }

    /**
     * Translates system messages if required (Simple map for Phase 1)
     */
    translate(key: string, lang: 'en' | 'pt' | 'es'): string {
        const translations: Record<string, Record<'en' | 'pt' | 'es', string>> = {
            'REVISION_REQUIRED': {
                'en': 'REVISION REQUIRED',
                'pt': 'REVISÃO NECESSÁRIA',
                'es': 'REVISIÓN NECESARIA'
            }
        };

        return translations[key]?.[lang] || key;
    }
}
