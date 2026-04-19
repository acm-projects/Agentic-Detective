import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../useGameStore';
import './tutorial.css';

interface Step {
    route: '/desk' | '/report' | '/clues' | '/interrogate' | '/accuse';
    routeLabel: string;
    badge: string;
    title: string;
    icon: string;
    description: string[];
    highlightTarget?: string;
    highlightTitle?: string;
}

const STEPS: Step[] = [
    {
        route: '/desk',
        routeLabel: 'Desk',
        badge: 'Desk Briefing',
        title: 'Welcome to your detective desk',
        icon: 'DESK',
        description: [
            'Review your file, inspect clue materials, and move between investigation tools from here.',
            'This board is your control center for the whole case.'
        ],
    },
    {
        route: '/report',
        routeLabel: 'Case Report',
        badge: 'Case File',
        title: 'Read the case report first',
        icon: 'REPORT',
        description: [
            'Open the Case File on the desk to review your official briefing and known facts.',
            'Start with the report before moving to deeper evidence review.'
        ]
    },
    {
        route: '/desk',
        routeLabel: 'Desk',
        badge: 'Accusation',
        title: 'Make your final accusation here',
        icon: 'ACCUSE',
        description: [
            'Once you have enough information to make a decision, open the accusation page to arrest a suspect.',
            'Remember, you can only accuse once. Be careful.'
        ],
    },
    {
        route: '/clues',
        routeLabel: 'Clues',
        badge: 'Evidence Review',
        title: 'Use the clue board to connect evidence',
        icon: 'CLUES',
        description: [
            'Examine discovered clues and track what each item can implicate.',
            'You can then present those clues during interrogation.'
        ]
    },
    {
        route: '/interrogate',
        routeLabel: 'Interrogate',
        badge: 'Interrogation Room',
        title: 'Question suspects and watch for pressure points',
        icon: 'CHAT',
        description: [
            'Interrogations are where contradictions and stress become useful.',
            'Next, I will spotlight the key tools you need during questioning.'
        ]
    },
    {
        route: '/interrogate',
        routeLabel: 'Interrogate',
        badge: 'Tool Highlight',
        title: 'The Suspects',
        icon: 'SUSPECTS',
        description: [
            'Switch between suspects through the Suspect Switcher.',
            'Interrogate everyone to extract as much information as you can.',
        ],
        highlightTarget: 'tutorial-suspect-picker',
        highlightTitle: 'The Suspect Switcher'
    },
    {
        route: '/interrogate',
        routeLabel: 'Interrogate',
        badge: 'Tool Highlight',
        title: 'Evidence Locker',
        icon: 'LOCKER',
        description: [
            'Open the locker to view discovered clues and drag them into chat as evidence.',
            'Use evidence drops to corner suspects at the right moment.'
        ],
        highlightTarget: 'tutorial-evidence-locker',
        highlightTitle: 'Your Evidence Locker'
    },
    {
        route: '/interrogate',
        routeLabel: 'Interrogate',
        badge: 'Tool Highlight',
        title: 'Field Notes',
        icon: 'NOTES',
        description: [
            'Open Notes to log observations for each suspect while details are fresh.',
            'Good notes make your final accusation more reliable.'
        ],
        highlightTarget: 'tutorial-notes',
        highlightTitle: 'Your Field Notes'
    },
    {
        route: '/interrogate',
        routeLabel: 'Interrogate',
        badge: 'Tool Highlight',
        title: 'Suspect Details',
        icon: 'PROFILE',
        description: [
            'Open this panel to review profile traits, alibi details, and suspicion tracking.',
            'Cross-check what they say against this card before accusing.'
        ],
        highlightTarget: 'tutorial-suspect-details',
        highlightTitle: 'The Suspect Details'
    }
];

const TUTORIAL_KEY = 'tutorialSeen';
const TUTORIAL_STEP_KEY = 'tutorialStep';
const TUTORIAL_READY_KEY = 'tutorialReadyAfterReport';
const TUTORIAL_DESK_ENTERED_KEY = 'tutorialDeskEntered';

const clampStep = (stepValue: number) => {
    if (!Number.isFinite(stepValue)) return 0;
    return Math.min(Math.max(stepValue, 0), STEPS.length - 1);
};

const getCalloutStyle = (rect: DOMRect) => {
    const maxWidth = Math.min(320, Math.max(220, window.innerWidth - 32));
    const left = Math.min(
        window.innerWidth - maxWidth - 12,
        Math.max(12, rect.left + rect.width / 2 - maxWidth / 2)
    );
    const renderAbove = rect.top > window.innerHeight * 0.64;

    if (renderAbove) {
        return { left, top: Math.max(12, rect.top - 132) };
    }

    return {
        left,
        top: Math.min(window.innerHeight - 90, rect.bottom + 14),
    };
};

function TutorialModal() {
    const navigate = useNavigate();
    const location = useLocation();
    const totalConversationCount = useGameStore(state => state.totalConversationCount);
    const isFirstTimePlayer = totalConversationCount <= 2;
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
    const isSupportedRoute =
        location.pathname === '/desk' ||
        location.pathname === '/report' ||
        location.pathname === '/clues' ||
        location.pathname === '/interrogate';

    useEffect(() => {
        if (!isFirstTimePlayer) return;

        const hasSeenTutorial = localStorage.getItem(TUTORIAL_KEY) === 'true';
        if (hasSeenTutorial) return;
        const readyAfterReport = localStorage.getItem(TUTORIAL_READY_KEY) === 'true';
        if (!readyAfterReport) return;
        const deskEntered = localStorage.getItem(TUTORIAL_DESK_ENTERED_KEY) === 'true';
        if (!deskEntered) return;

        const savedStep = Number(localStorage.getItem(TUTORIAL_STEP_KEY) ?? 0);
        setStep(clampStep(savedStep));
        setVisible(true);
    }, [isFirstTimePlayer]);

    useEffect(() => {
        if (!visible) return;
        localStorage.setItem(TUTORIAL_STEP_KEY, String(clampStep(step)));
    }, [step, visible]);

    const current = STEPS[clampStep(step)];

    useEffect(() => {
        if (!visible || !current.highlightTarget || location.pathname !== current.route) {
            setSpotlightRect(null);
            return;
        }

        const findAndMeasure = () => {
            const target = document.querySelector(
                `[data-tutorial-id="${current.highlightTarget}"]`
            ) as HTMLElement | null;

            if (!target) {
                setSpotlightRect(null);
                return;
            }

            setSpotlightRect(target.getBoundingClientRect());
        };

        findAndMeasure();
        const intervalId = window.setInterval(findAndMeasure, 180);
        window.addEventListener('resize', findAndMeasure);
        window.addEventListener('scroll', findAndMeasure, true);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('resize', findAndMeasure);
            window.removeEventListener('scroll', findAndMeasure, true);
        };
    }, [visible, current.highlightTarget, current.route, location.pathname]);

    const dismiss = () => {
        localStorage.setItem(TUTORIAL_KEY, 'true');
        localStorage.removeItem(TUTORIAL_STEP_KEY);
        localStorage.removeItem(TUTORIAL_READY_KEY);
        setVisible(false);
        setSpotlightRect(null);
    };

    const updateStep = (nextStep: number) => {
        const sanitized = clampStep(nextStep);
        setStep(sanitized);
        localStorage.setItem(TUTORIAL_STEP_KEY, String(sanitized));
    };

    const next = () => updateStep(Math.min(step + 1, STEPS.length - 1));
    const prev = () => updateStep(Math.max(step - 1, 0));
    const isLast = step === STEPS.length - 1;
    const shouldNavigate = location.pathname !== current.route;
    const isHighlightStep = Boolean(current.highlightTarget && spotlightRect);

    const primaryActionLabel = (() => {
        if (shouldNavigate) return `Go to ${current.routeLabel}`;

        if (isLast) return 'Start investigating';

        return 'Next';
    })();

    const handlePrimaryAction = () => {
        if (shouldNavigate) {
            navigate(current.route);
            return;
        }

        if ((current.route === '/report' && location.pathname === '/report') ||
            (current.route === '/clues' && location.pathname === '/clues')) {
            next();
            navigate('/desk');
            return;
        }

        if (isLast) {
            dismiss();
            return;
        }
        next();
    };

    if (!visible || !isSupportedRoute) return null;

    const progressPercent = ((step + 1) / STEPS.length) * 100;
    const calloutStyle = spotlightRect ? getCalloutStyle(spotlightRect) : null;
    const activeSpotlight = spotlightRect;
    const shouldDockLeftForNotes =
        current.highlightTarget === 'tutorial-notes' &&
        location.pathname === '/interrogate';

    return (
        <>
            {isHighlightStep && activeSpotlight && (
                <div className='tutorial-spotlight-layer' aria-hidden='true'>
                    <div
                        className='tutorial-spotlight-hole'
                        style={{
                            left: activeSpotlight.left - 8,
                            top: activeSpotlight.top - 8,
                            width: activeSpotlight.width + 16,
                            height: activeSpotlight.height + 16,
                        }}
                    />
                    <div
                        className='tutorial-spotlight-pulse'
                        style={{
                            left: activeSpotlight.left - 8,
                            top: activeSpotlight.top - 8,
                            width: activeSpotlight.width + 16,
                            height: activeSpotlight.height + 16,
                        }}
                    />
                    {calloutStyle && (
                        <div
                            className='tutorial-spotlight-callout'
                            style={{
                                left: calloutStyle.left,
                                top: calloutStyle.top,
                            }}
                        >
                            <div className='tutorial-spotlight-callout-label'>Highlighted</div>
                            <p>{current.highlightTitle}</p>
                        </div>
                    )}
                </div>
            )}

            <section
                className={`tutorial-dock ${shouldDockLeftForNotes ? 'tutorial-dock--left' : ''}`}
                aria-live='polite'
            >
                <div className='tutorial-dock-header'>
                    <span className='tutorial-step-chip'>{current.badge}</span>
                    <button className='tutorial-skip-link' onClick={dismiss}>Skip</button>
                </div>

                <div className='tutorial-dock-progress'>
                    <span>Step {step + 1} / {STEPS.length}</span>
                    <div className='tutorial-progress-track'>
                        <span
                            className='tutorial-progress-fill'
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                <div className='tutorial-card' key={step}>
                    <div className='tutorial-card-icon'>{current.icon}</div>
                    <h2>{current.title}</h2>
                    {current.description.map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>

                <div className='tutorial-step-dots'>
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            className={i === step ? 'active' : ''}
                            onClick={() => updateStep(i)}
                            aria-label={`Jump to step ${i + 1}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                <div className='tutorial-actions'>
                    <button onClick={prev} disabled={step === 0}>Back</button>
                    <button className='tutorial-primary-btn' onClick={handlePrimaryAction}>{primaryActionLabel}</button>
                </div>
            </section>
        </>
    );
}

export default TutorialModal;