import { useNavigate } from "react-router";
import "./CaseResolvedErrorScreen.css";

function CaseResolvedErrorScreen() {
    const navigate = useNavigate();

    return (
        <main className="resolved-screen" role="main" aria-labelledby="resolved-title">
            <section className="resolved-card">
                <p className="resolved-status-text">Session status</p>
                <h1 id="resolved-title" className="resolved-title">Case already resolved</h1>
                <p className="resolved-message">
                    This investigation has already been closed and cannot be resumed.
                </p>

                <button
                    type="button"
                    className="resolved-home-btn"
                    onClick={() => navigate("/")}
                >
                    Return to Home
                </button>
            </section>
        </main>
    );
}

export default CaseResolvedErrorScreen;