import { useState, useCallback } from "react";
import type { ImageUnshuffleData } from "../../../obj/notificationInterfaces.ts";

const GRID = 3;
const TILE_COUNT = GRID * GRID;

function makeScrambled(): number[] {
    // Each tile starts at 90, 180, or 270 — never 0
    return Array.from({ length: TILE_COUNT }, () => (Math.floor(Math.random() * 3) + 1) * 90);
}

interface Props {
    data: ImageUnshuffleData;
    onSuccess: () => void;
    onFailure: () => void;
}

export function ImageUnshuffleMinigame({ data, onSuccess }: Props) {
    // cumulative rotation — never clamped, so CSS always animates +90° forward
    const [rotations, setRotations] = useState<number[]>(makeScrambled);
    const [solved, setSolved] = useState(false);

    const handleTileClick = useCallback((idx: number) => {
        if (solved) return;
        setRotations(prev => {
            const next = prev.map((r, i) => i !== idx ? r : r + 90);
            // solved when every tile's cumulative value is a multiple of 360
            if (next.every(r => r % 360 === 0)) {
                setSolved(true);
                setTimeout(() => onSuccess(), 800);
            }
            return next;
        });
    }, [solved, onSuccess]);

    return (
        <>
            <p style={styles.hint}>{data.hint}</p>

            <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
                {rotations.map((rot, idx) => {
                    const col = idx % GRID;
                    const row = Math.floor(idx / GRID);
                    const isAligned = rot % 360 === 0;
                    return (
                        <div
                            key={idx}
                            style={{
                                ...styles.tile,
                                backgroundImage: `url(${data.imagePath})`,
                                backgroundSize: `${GRID * 100}%`,
                                backgroundPosition: `${col * 50}% ${row * 50}%`,
                                transform: `rotate(${rot}deg)`,
                                cursor: solved ? 'default' : 'pointer',
                                outline: solved
                                    ? '2px solid #4ade80'
                                    : isAligned
                                        ? '2px solid rgba(74,222,128,0.4)'
                                        : '1px solid rgba(255,255,255,0.15)',
                            }}
                            onClick={() => handleTileClick(idx)}
                        />
                    );
                })}
            </div>

            <div style={styles.status}>
                {solved
                    ? <span style={styles.successText}>✓ Evidence recovered — clue unlocked</span>
                    : <span style={styles.instructionText}>Click each tile to rotate it into place</span>
                }
            </div>
        </>
    );
}

const styles: Record<string, React.CSSProperties> = {
    hint: {
        fontSize: 13,
        color: '#cbd5e1',
        fontStyle: 'italic',
        margin: '0 0 8px',
        lineHeight: 1.5,
        textAlign: 'center',
    },
    grid: {
        display: 'grid',
        gap: 3,
        width: '100%',
        aspectRatio: '1',
    },
    tile: {
        aspectRatio: '1',
        backgroundRepeat: 'no-repeat',
        borderRadius: 4,
        transition: 'transform 0.18s ease',
        userSelect: 'none',
    },
    status: {
        textAlign: 'center',
        fontSize: 13,
        marginTop: 8,
        minHeight: 20,
    },
    successText: {
        color: '#4ade80',
        fontWeight: 600,
    },
    instructionText: {
        color: '#64748b',
    },
};