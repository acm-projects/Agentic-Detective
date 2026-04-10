import { useNavigate } from "react-router";
import { useGameStore } from "../../useGameStore";
import "./CaseResolvedErrorScreen.css";

function CaseResolvedErrorScreen() {
    const navigate = useNavigate();
    const currentCase = useGameStore(s => s.selectedCase);

    const caseTitle = currentCase?.caseData?.caseReport?.caseTitle ?? "Untitled Case";
    const caseId = currentCase?.sessionId ?? currentCase?.caseId ?? "Unknown";
    const status = currentCase?.status ?? "resolved";
    const outcome = currentCase?.outcome ?? null;

    const accusedName = outcome?.accusedName ?? "Unknown";
    const trueKiller = outcome?.trueKiller ?? "Unknown";
    const isCorrect = Boolean(outcome?.isCorrect);
    const explanation = outcome?.explanation ?? "No explanation was saved for this case.";
    const decidedAt = outcome?.decidedAt
        ? new Date(outcome.decidedAt).toLocaleString()
        : "Unknown";

    const updatedAt = currentCase?.updatedAt
        ? new Date(currentCase.updatedAt).toLocaleString()
        : "Unknown";

    return (
        <main className="resolved-screen" role="main" aria-labelledby="resolved-title">
            <div className="resolved-card">
                <p className="resolved-status-text">Session status</p>
                <h1 id="resolved-title" className="resolved-title">Case already resolved</h1>
                <p className="resolved-message">
                    This investigation has already been closed and cannot be resumed.
                </p>

                <div className="resolved-meta" aria-label="Case metadata">
                    <p><strong>Title:</strong> {caseTitle}</p>
                    <p><strong>Session ID:</strong> {caseId}</p>
                    <p><strong>Status:</strong> {status}</p>
                    <p><strong>Last Updated:</strong> {updatedAt}</p>
                </div>
            

                <p className="resolved-status-text">CASE SUMMARY</p>
                <h2 className="resolved-title">Outcome Details</h2>

                <div className="resolved-outcome" aria-label="Outcome details">
                    <p><strong>Your Accusation:</strong> {accusedName}</p>
                    <p><strong>True Killer:</strong> {trueKiller}</p>
                    <p><strong>Result:</strong> {isCorrect ? "Correct accusation" : "Incorrect accusation"}</p>
                    <p><strong>Decision Recorded:</strong> {decidedAt}</p>
                </div>

                <div className="resolved-explanation-block" aria-label="Case explanation">
                    <p className="resolved-status-text">The True Sequence of Events</p>
                    <p className="resolved-explanation">{explanation}</p>
                </div>
                <button
                    type="button"
                    className="resolved-home-btn"
                    onClick={() => navigate("/")}
                >
                    Return to Home
                </button>
            </div>
        </main>
    );
}

export default CaseResolvedErrorScreen;