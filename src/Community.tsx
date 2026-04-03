import { useAuth } from '@clerk/react-router';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useGameStore } from './useGameStore';
import './Community.css';

interface CommunityProps {
    onCloseModal?: () => void;
}

export default function Community({ onCloseModal }: CommunityProps) {
    const { isSignedIn } = useAuth();
    const navigate = useNavigate();
    const loadSharedCaseTemplate = useGameStore(s => s.loadSharedCaseTemplate);
    const [caseCode, setCaseCode] = useState('');
    const [loadingCase, setLoadingCase] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePlayByCode = async () => {
        const trimmedCode = caseCode.trim();
        if (!trimmedCode || loadingCase) return;

        setLoadingCase(true);
        setError(null);
        try {
            const res = await fetch(`http://localhost:3000/community/cases/${encodeURIComponent(trimmedCode)}/template`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const template = await res.json();
            await loadSharedCaseTemplate(template, navigate);
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
                    <div className="community-case-card">
                        <h4>The Museum Heist</h4>
                        <p className="case-author">By Detective Smith</p>
                        <p className="case-description">A daring theft from the city's most prestigious museum. Can you uncover the thief?</p>
                        <button className="detective-button">Play</button>
                    </div>
                    <div className="community-case-card">
                        <h4>Restaurant Secrets</h4>
                        <p className="case-author">By Detective Johnson</p>
                        <p className="case-description">Something sinister is happening behind closed kitchen doors...</p>
                        <button className="detective-button">Play</button>
                    </div>
                    <div className="community-case-card">
                        <h4>The Missing Painting</h4>
                        <p className="case-author">By Detective Williams</p>
                        <p className="case-description">Find out who took the priceless artwork before it's gone forever.</p>
                        <button className="detective-button">Play</button>
                    </div>
                </div>
            </div>

            <div className="community-section">
                <h3>Top Contributors</h3>
                <ul className="community-list">
                    <li>🔍 Detective Smith - 15 cases</li>
                    <li>🔍 Detective Johnson - 12 cases</li>
                    <li>🔍 Detective Williams - 8 cases</li>
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
                        onClick={handlePlayByCode}
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