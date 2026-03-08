import React from 'react';

interface DNA {
    philosophy: string[];
    models: string[];
    heuristics: string[];
    frameworks: string[];
    methodologies: string[];
}

export const DnaVisualizer: React.FC<{ dna?: DNA }> = ({ dna }) => {
    const defaultDna: DNA = {
        philosophy: ['Anticipation', 'Simplicity', 'Speed'],
        models: ['First Principles', '80/20'],
        heuristics: ['2-Min Rule', 'KISS'],
        frameworks: ['GTD', 'ICE'],
        methodologies: ['Clean Code', 'OODA']
    };

    const activeDna = dna || defaultDna;

    const layers = [
        { name: 'PHILOSOPHY', items: activeDna.philosophy, color: '#00ff88' },
        { name: 'MODELS', items: activeDna.models, color: '#00ccff' },
        { name: 'HEURISTICS', items: activeDna.heuristics, color: '#ffaa00' },
        { name: 'FRAMEWORKS', items: activeDna.frameworks, color: '#ff00ff' },
        { name: 'METHODOLOGIES', items: activeDna.methodologies, color: '#ff3333' }
    ];

    return (
        <div className="dna-visualizer">
            <div className="dna-container">
                {layers.map((layer, i) => (
                    <div
                        key={layer.name}
                        className="dna-layer"
                        style={{
                            '--layer-color': layer.color,
                            '--delay': `${i * 0.2}s`
                        } as React.CSSProperties}
                    >
                        <div className="layer-header">
                            <span className="layer-name">{layer.name}</span>
                            <div className="layer-status-dot" />
                        </div>
                        <div className="layer-items">
                            {layer.items.map((item, idx) => (
                                <div key={idx} className="dna-item-node" title={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mega-brain-tag">
                <div className="tag-line" />
                <span>MEGA BRAIN V1.0 ACTIVE</span>
            </div>
        </div>
    );
};

export default DnaVisualizer;
