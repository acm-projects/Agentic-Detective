import { useAuth } from '@clerk/react-router';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useGameStore } from './useGameStore';
import './Community.css';

interface CommunityProps {
    onCloseModal?: () => void;
}

interface CommunityCase {
    caseCode: string;
    title: string;
    author: string;
    description: string;
    gameplayRating: number;
    updatedAt?: string | null;
}

interface Contributor {
    name: string;
    caseCount: number;
    averageRating: number;
    bestRating: number;
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
    const [communityCases, setCommunityCases] = useState<CommunityCase[]>([]);
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadFeed = async () => {
            setFeedLoading(true);
            setFeedError(null);
            try {
                const res = await fetch('http://localhost:3000/community/feed?limit=12');
                console.log("Community feed response:", res.status, res.statusText);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!mounted) return;
                setCommunityCases(Array.isArray(data.cases) ? data.cases : []);
                setContributors(Array.isArray(data.contributors) ? data.contributors : []);
            } catch {
                if (!mounted) return;
                setFeedError('Could not load community feed right now.');
            } finally {
                if (mounted) setFeedLoading(false);
            }
        };

        loadFeed();
        return () => { mounted = false; };
    }, []);

    const handlePlayByCode = async (inputCode?: string) => {
        const trimmedCode = (inputCode ?? caseCode).trim();
        if (!trimmedCode || loadingCase) return;
        console.log("Attempting to load case with code:", trimmedCode);

        setLoadingCase(true);
        setError(null);
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
                <div className="community-grid">
                    {feedLoading && <p className="community-share-help">Loading community cases...</p>}
                    {!feedLoading && communityCases.length === 0 && !feedError && (
                        <p className="community-share-help">No featured community cases yet. Rate a finished game and enable featuring.</p>
                    )}
                    {!feedLoading && feedError && <p className="community-share-error">{feedError}</p>}
                    
                    {!feedLoading && !feedError && communityCases.map((c) => (
                        <div className="community-case-card" key={c.caseCode}>
                            <h4>{c.title}</h4>
                            <p className="case-author">By {c.author}</p>
                            <p className="community-case-code">Case ID: {c.caseCode}</p>
                            <p className="community-case-rating">Rating: {c.gameplayRating || 0}/5</p>
                            <p className="case-description">{c.description}</p>
                            <button className="detective-button" onClick={() => handlePlayByCode(c.caseCode)}>
                                Play
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="community-section">
                <h3>Community Leaderboard</h3>
                <ul className="community-list">
                    {feedLoading && <li className="community-share-help">Loading contributors...</li>}
                    {!feedLoading && contributors.length === 0 && <li className="community-share-help">No leaderboard entries yet.</li>}
                    {!feedLoading && contributors.map((contributor) => (
                        <li key={contributor.name}>🔍 {contributor.name} · Avg {contributor.averageRating}/5 · Best {contributor.bestRating}/5 · {contributor.caseCount} featured case(s)</li>
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