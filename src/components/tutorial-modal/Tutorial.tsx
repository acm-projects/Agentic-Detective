import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../useGameStore';
import './tutorial.css';

interface Step {
    route: '/report' | '/desk' | '/interrogate';
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
        route: '/report',
        routeLabel: 'Case Report',
        badge: 'Case Report',
        title: 'Review the case file first',
        icon: 'REPORT',
        description: [
            'This report gives your timeline, victim context, and initial leads.',
            'When you are ready, continue to your desk.'
        ],
        highlightTarget: 'tutorial-case-report-main',
        highlightTitle: 'Case Report'
    },
    {
        route: '/desk',
        routeLabel: 'Desk',
        badge: 'Desk Option',
        title: 'Case File',
        icon: 'CASE',
        description: [
            'Use Case File to reopen the official report at any time.'
        ],
        highlightTarget: 'tutorial-desk-case-file',
        highlightTitle: 'Case File'
    },
    {
        route: '/desk',
        routeLabel: 'Desk',
        badge: 'Desk Option',
        title: 'Accusation',
        icon: 'ACCUSE',
        description: [
            'Use this option to choose and accuse your final suspect.'
        ],
        highlightTarget: 'tutorial-desk-accusation',
        highlightTitle: 'Accusation'
    },
    {
        route: '/desk',
        routeLabel: 'Desk',
        badge: 'Desk Option',
        title: 'Clue Book',
        icon: 'CLUES',
        description: [
            'Use the Clue Book to review discovered evidence.'
        ],
        highlightTarget: 'tutorial-desk-clue-book',
        highlightTitle: 'Clue Book'
    },
    {
        route: '/desk',
        routeLabel: 'Desk',
        badge: 'Desk Option',
        title: 'Interrogation Phone',
        icon: 'PHONE',
        description: [
            'Use the phone to enter the interrogation room.'
        ],
        highlightTarget: 'tutorial-desk-phone',
        highlightTitle: 'Interrogation Phone'
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
        title: 'Suspect Details',
        icon: 'PROFILE',
        description: [
            'Open this panel to review profile traits, alibi details, and suspicion tracking.',
            'Cross-check what they say against this card before accusing.'
        ],
        highlightTarget: 'tutorial-suspect-details',
        highlightTitle: 'The Suspect Details'
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
    }
];

const TUTORIAL_KEY = 'tutorialSeen';
const TUTORIAL_STEP_KEY = 'tutorialStep';

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
        location.pathname === '/report' ||
        location.pathname === '/desk' ||
        location.pathname === '/interrogate';

    useEffect(() => {
        if (!isFirstTimePlayer) return;
        if (!isSupportedRoute) return;

        const hasSeenTutorial = localStorage.getItem(TUTORIAL_KEY) === 'true';
        if (hasSeenTutorial) return;

        const savedStep = Number(localStorage.getItem(TUTORIAL_STEP_KEY) ?? 0);
        setStep(clampStep(savedStep));
        setVisible(true);
    }, [isFirstTimePlayer, isSupportedRoute, location.pathname]);

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

        if (isLast) {
            dismiss();
            return;
        }

        const nextStep = Math.min(step + 1, STEPS.length - 1);
        const nextRoute = STEPS[nextStep].route;
        next();

        if (nextRoute !== location.pathname) {
            navigate(nextRoute);
        }
    };

    if (!visible || !isSupportedRoute) return null;

    const progressPercent = ((step + 1) / STEPS.length) * 100;
    const calloutStyle = spotlightRect ? getCalloutStyle(spotlightRect) : null;
    const activeSpotlight = spotlightRect;
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
                className='tutorial-dock'
                aria-live='polite'
            >
                <div className='tutorial-dock-header'>
                    <div className='tutorial-dock-progress'>
                        <span>{current.badge} · Step {step + 1} / {STEPS.length}</span>
                        <div className='tutorial-progress-track'>
                            <span
                                className='tutorial-progress-fill'
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                    <button className='tutorial-skip-link' onClick={dismiss}>Skip</button>
                </div>

                <div
                    className='tutorial-card'
                    key={step}
                >
                    <h2>{current.title}</h2>
                    {current.description.map((line, i) => (
                        <p key={i}>{line}</p>
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