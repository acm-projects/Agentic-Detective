import { useAuth } from '@clerk/react-router';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useGameStore } from './useGameStore';
import './Community.css';

import { DEMO_GAME_DOC } from './DemoCaseFile';

interface CommunityProps {
    onCloseModal?: () => void;
}

interface CommunityCase {
    caseCode: string;
    title: string;
    author: string;
    description: string;
    gameplayRating: number;
    theme?: string;
    details?: string;
    updatedAt?: string | null;
}

interface Contributor {
    name: string;
    caseCount: number;
    averageRating: number;
    bestRating: number;
}

const HARDCODED_LEADERBOARD: Contributor[] = [
    { name: 'Swarna', caseCount: 7, averageRating: 3.9, bestRating: 5.0 },
    { name: 'Nandy', caseCount: 6, averageRating: 3.8, bestRating: 5.0 },
    { name: 'Ryan', caseCount: 5, averageRating: 4.7, bestRating: 4.9 },
    { name: 'Urmi', caseCount: 4, averageRating: 2.6, bestRating: 4.8 },
];

const HARDCODED_FEATURED_CASES: CommunityCase[] = [
    {
        caseCode: 'BEAST-001',
        title: 'Beast Boy Case',
        author: 'Community Spotlight',
        description: 'Track a prank gone wrong at Titans Tower and uncover which clue is actually a trap.',
        gameplayRating: 4.8,
        theme: 'Teen Titans Go',
        details: 'Tone: chaotic comedy mystery · Difficulty: Medium',
    },
    {
        caseCode: 'ACM-001',
        title: 'The Night of the Build',
        author: 'Community Spotlight',
        description: 'A late-night build collapses minutes before demo day. Save the build night.',
        gameplayRating: 4.9,
        theme: 'ACM Projects',
        details: 'Difficulty: Hard',
    },
];

function renderStars(rating: number) {
    const filledStars = Math.round(rating);
    return Array.from({ length: 5 }, (_, idx) => (
        <span key={idx} className={`leaderboard-star ${idx < filledStars ? 'filled' : ''}`}>★</span>
    ));
}

export default function Community({ onCloseModal }: CommunityProps) {
    const { isSignedIn, userId } = useAuth();
    const navigate = useNavigate();
    const startCase = useGameStore(s => s.startCase);
    const setCurrentSessionId = useGameStore(s => s.setCurrentSessionId);
    const setSelectedCase = useGameStore(s => s.setSelectedCase);
    const loadSharedCaseTemplate = useGameStore(s => s.loadSharedCaseTemplate);
    const [caseCode, setCaseCode] = useState('');
    const [loadingCase, setLoadingCase] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePlayByCode = async (inputCode?: string) => {
        const trimmedCode = (inputCode ?? caseCode).trim();
        if (!trimmedCode || loadingCase) return;
        console.log("Attempting to load case with code:", trimmedCode);

        setLoadingCase(true);
        setError(null);

        if (trimmedCode.toUpperCase() === "DEMO-001") {
            await new Promise(resolve => setTimeout(resolve, 3000));
            setCurrentSessionId("DEMO-001");
            setSelectedCase({ game: DEMO_GAME_DOC });
            await startCase(navigate);
            onCloseModal?.();
            return;
        }

        try {
            // If this signed-in user already has progress for this case ID, resume it instead of resetting.
            if (isSignedIn && userId) {
                const existingRes = await fetch(
                    `http://localhost:3000/cases/${encodeURIComponent(trimmedCode)}?userId=${encodeURIComponent(userId)}`
                );
                if (existingRes.ok) {
                    const existingDoc = await existingRes.json();
                    if (existingDoc?.game) {
                        setCurrentSessionId(trimmedCode);
                        setSelectedCase(existingDoc);
                        await startCase(navigate);
                        onCloseModal?.();
                        return;
                    }
                }
            }

            const res = await fetch(`http://localhost:3000/community/cases/${encodeURIComponent(trimmedCode)}/template`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const template = await res.json();
            await loadSharedCaseTemplate(template, trimmedCode, navigate);
            onCloseModal?.();
        } catch {
            setError('Could not find that case code.');
        } finally {
            setLoadingCase(false);
        }
    };

    return (
        <div className="community-container">
            <h2>Community Cases</h2>
            <p>Welcome to the Agentic Detective Community! Share and discover detective cases from other players.</p>

            <div className="community-section">
                <h3>Featured Cases</h3>
                <div className="community-grid community-featured-grid">
                    {HARDCODED_FEATURED_CASES.map((c) => (
                        <div className="community-case-card" key={c.caseCode}>
                            <h4>{c.title}</h4>
                            <p className="case-author">By {c.author}</p>
                            {c.theme && <p className="community-case-theme">Theme: {c.theme}</p>}
                            <p className="community-case-code">Case ID: {c.caseCode}</p>
                            <p className="community-case-rating">Rating: {c.gameplayRating || 0}/5</p>
                            <p className="case-description">{c.description}</p>
                            {c.details && <p className="community-case-details">{c.details}</p>}
                            <button className="detective-button" onClick={() => handlePlayByCode(c.caseCode)}>
                                Play
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" className="community-featured-link-button">
                    View all featured cases
                </button>
            </div>

            <div className="community-section">
                <h3>Community Leaderboard</h3>
                <ul className="community-list">
                    {HARDCODED_LEADERBOARD.map((contributor) => (
                        <li key={contributor.name} className="leaderboard-row">
                            <div className="leaderboard-rank">🏆</div>
                            <div className="leaderboard-content">
                                <div className="leaderboard-name">{contributor.name}</div>
                                <div className="leaderboard-rating" aria-label={`Average rating ${contributor.averageRating} out of 5`}>
                                    <span className="leaderboard-label">Avg</span>
                                    <span className="leaderboard-stars">{renderStars(contributor.averageRating)}</span>
                                    <span className="leaderboard-avg-value">{contributor.averageRating.toFixed(1)}</span>
                                </div>
                                <div className="leaderboard-meta">
                                    Best {contributor.bestRating.toFixed(1)}/5 · {contributor.caseCount} featured case(s)
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            

            <div className="community-section">
                <h3>Play Shared Case</h3>
                <p className="community-share-help">Enter a Case ID to play the same base case from scratch.</p>
                <div className="community-share-row">
                    <input
                        type="text"
                        className="community-share-input"
                        placeholder="Enter Case ID (example: CASE-0047)"
                        value={caseCode}
                        onChange={(e) => setCaseCode(e.target.value)}
                    />
                    <button
                        type="button"
                        className="detective-button"
                        onClick={() => handlePlayByCode(caseCode)}
                        disabled={loadingCase || !caseCode.trim()}
                    >
                        {loadingCase ? 'Loading...' : 'Play'}
                    </button>
                </div>
                {error && <p className="community-share-error">{error}</p>}
            </div>
            <div className="community-section">
                {isSignedIn ? (
                    <button className="detective-button" onClick={() => onCloseModal?.()}>
                        Create Your Own Case
                    </button>
                ) : (
                    <p>Sign in to create and share your own detective cases!</p>
                )}
            </div>
        </div>
    );
}