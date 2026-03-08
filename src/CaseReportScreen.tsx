import { useGameStore } from "./useGameStore";
import "./CaseReportScreen.css";
import { useState, useRef, useCallback, useEffect } from "react";

const LENS_SIZE = 180;   // diameter in px
const ZOOM = 2.0;        // zoom level

interface LensPos { x: number; y: number; }

type CaseReport = NonNullable<ReturnType<typeof useGameStore>["player"]>["caseReport"];

export default function CaseReportScreen() {
  const { player, proceedToInvestigation } = useGameStore();
  const report = player?.caseReport;

  const overlayRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<LensPos | null>(null);
  const [docRect, setDocRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      if (docRef.current) setDocRect(docRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    setLens({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + overlay.scrollTop,
    });
    if (docRef.current) setDocRect(docRef.current.getBoundingClientRect());
  }, []);

  const handleMouseLeave = useCallback(() => setLens(null), []);

  if (!report) return null;

  const half = LENS_SIZE / 2;

  let cloneTranslateX = 0;
  let cloneTranslateY = 0;

  if (lens && docRect && overlayRef.current) {
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const cursorInDocX = lens.x - (docRect.left - overlayRect.left);
    const cursorInDocY = lens.y - (docRect.top - overlayRect.top + overlayRef.current.scrollTop);
    cloneTranslateX = half - cursorInDocX * ZOOM;
    cloneTranslateY = half - cursorInDocY * ZOOM;
  }

  return (
    <div
      className="report-overlay"
      ref={overlayRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: lens ? "none" : "default" }}
    >
      {lens && (
        <div
          className="magnifier-lens"
          style={{
            left: lens.x - half,
            top: lens.y - half,
            width: LENS_SIZE,
            height: LENS_SIZE,
          }}
        >
          <div
            className="magnifier-clone-wrap"
            style={{
              transform: `translate(${cloneTranslateX}px, ${cloneTranslateY}px) scale(${ZOOM})`,
              transformOrigin: "0 0",
              width: docRect ? docRect.width : "auto",
            }}
          >
            <MagnifiedDocContent report={report} />
          </div>
          <div className="magnifier-rim" />
          <div className="magnifier-glare" />
          <div className="magnifier-crosshair" />
        </div>
      )}

      <div className="report-document" ref={docRef}>
        <div className="report-agency">
          Agentic Detective Bureau &nbsp;·&nbsp; Homicide Division
        </div>
        <div className="report-header">
          <span className="case-id">Case File № {report.caseId}</span>
          <h1 className="report-title">{report.caseTitle}</h1>
          <p className="report-meta">{report.date} &nbsp;—&nbsp; {report.setting}</p>
          <div className="stamp">Confidential</div>
        </div>

        <div className="report-section">
          <div className="report-section-title">Victim</div>
          <div className="victim-block">
            <p className="victim-name">{report.victim.name}</p>
            <p className="victim-details">
              {report.victim.age} years old &nbsp;·&nbsp; {report.victim.occupation}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 10px', color: 'var(--ink)' }}>
              {report.victim.background}
            </p>
            <p className="cause-of-death">✦ {report.victim.causeOfDeath}</p>
            <p className="body-found">Found at: {report.victim.bodyFoundAt}</p>
          </div>
        </div>

        <hr className="report-divider" />

        <div className="report-section">
          <div className="report-section-title">Detective Briefing</div>
          <p className="briefing-text">{report.officialBriefing}</p>
        </div>

        <hr className="report-divider" />

        <div className="report-section">
          <div className="report-section-title">Established Facts</div>
          <ul className="report-list">
            {report.knownFacts.map((fact, i) => <li key={i}>{fact}</li>)}
          </ul>
        </div>

        <hr className="report-divider" />

        <div className="report-section">
          <div className="report-section-title">Open Questions</div>
          <ul className="report-list questions-list">
            {report.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </div>

        <div className="report-footer">
          <div><div className="signature-line">Lead Detective</div></div>
          <div style={{ textAlign: 'right' }}>
            <div>Issued by the Agentic Detective Bureau</div>
            <div style={{ marginTop: 4 }}>Handle with discretion</div>
          </div>
        </div>

        <button className="begin-button" onClick={proceedToInvestigation}>
          <span>Begin Investigation →</span>
        </button>
      </div>
    </div>
  );
}

function MagnifiedDocContent({ report }: { report: CaseReport }) {
  if (!report) return null;
  return (
    <div className="report-document magnifier-clone" aria-hidden="true">
      <div className="report-agency">
        Agentic Detective Bureau &nbsp;·&nbsp; Homicide Division
      </div>
      <div className="report-header">
        <span className="case-id">Case File № {report.caseId}</span>
        <h1 className="report-title">{report.caseTitle}</h1>
        <p className="report-meta">{report.date} &nbsp;—&nbsp; {report.setting}</p>
        <div className="stamp">Confidential</div>
      </div>
      <div className="report-section">
        <div className="report-section-title">Victim</div>
        <div className="victim-block">
          <p className="victim-name">{report.victim.name}</p>
          <p className="victim-details">
            {report.victim.age} years old &nbsp;·&nbsp; {report.victim.occupation}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 10px', color: 'var(--ink)' }}>
            {report.victim.background}
          </p>
          <p className="cause-of-death">✦ {report.victim.causeOfDeath}</p>
          <p className="body-found">Found at: {report.victim.bodyFoundAt}</p>
        </div>
      </div>
      <hr className="report-divider" />
      <div className="report-section">
        <div className="report-section-title">Detective Briefing</div>
        <p className="briefing-text">{report.officialBriefing}</p>
      </div>
      <hr className="report-divider" />
      <div className="report-section">
        <div className="report-section-title">Established Facts</div>
        <ul className="report-list">
          {report.knownFacts.map((fact, i) => <li key={i}>{fact}</li>)}
        </ul>
      </div>
      <hr className="report-divider" />
      <div className="report-section">
        <div className="report-section-title">Open Questions</div>
        <ul className="report-list questions-list">
          {report.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
        </ul>
      </div>
    </div>
  );
}
