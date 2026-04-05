// This page defines a Tutorial Modal that shows up on the Interrogation page upon first load
// The tutorial is skippable and guides users with the UI for their first playthrough.
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './tutorial.css';

interface Step {
    title: string,
    icon: string,
    description: string[],
}

const STEPS: Step[] = [
    {
        title: "The Desk",
        icon: "",
        description: [
            "You are a detective, and you have one job: find the culprit.",
            "Read the case file, then begin interrogating."
        ],
    },
    {
        title: "Interrogation",
        icon: "",
        description: [
            "Each suspect has their secrets. Ask questions to unravel them.",
            "Find inconsistencies. Figure out their lying tells."
        ]
    },
    {
        title: "Evidence",
        icon: "",
        description: [
            "New evidence arrives during the investigation as notifications. Complete the minigame to unlock it.",
            "Drag clues from the Evidence Locker into the chat to confront suspects directly.",
        ]
    },
    {
        title: "Making your Accusation",
        icon: "",
        description: [
            "When you're ready, accuse a suspect from the interrogation screen. You need to find evidence first.",
            "Choose carefully — you only get one shot.",
        ]
    }
];

const TUTORIAL_KEY = 'tutorialSeen';
const TUTORIAL_STEP_KEY = 'tutorialStep';

function TutorialModal() {
    const navigate = useNavigate();
    const location = useLocation();
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const isDeskRoute = useMemo(() => location.pathname === '/desk', [location.pathname]);
    const isCluesRoute = useMemo(() => location.pathname === '/clues', [location.pathname]);

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem(TUTORIAL_KEY) === 'true';
        if (hasSeenTutorial) return;

        const savedStep = Number(localStorage.getItem(TUTORIAL_STEP_KEY) ?? '0');
        setStep(Number.isFinite(savedStep) ? savedStep : 0);
        setVisible(true);
    }, []);

    useEffect(() => {
        if (!visible) return;
        localStorage.setItem(TUTORIAL_STEP_KEY, String(step));
    }, [step, visible]);

    const dismiss = () => {
        localStorage.setItem(TUTORIAL_KEY, 'true');
        localStorage.removeItem(TUTORIAL_STEP_KEY);
        setVisible(false);
    }
    const updateStep = (nextStep: number) => {
        setStep(nextStep);
        localStorage.setItem(TUTORIAL_STEP_KEY, String(nextStep));
    };
    const next = () => updateStep(Math.min(step + 1, STEPS.length - 1));
    const prev = () => updateStep(Math.max(step - 1, 0));
    const isLast = step === STEPS.length - 1;
    const current = STEPS[step];

    const primaryActionLabel = (() => {
        if (step === 0) {
            return isDeskRoute ? 'Return to Interrogate' : 'Visit the Desk';
        }

        if (step === 2) {
            return isCluesRoute ? 'Return to Interrogate' : 'Visit the Clues Page';
        }

        if (isLast) {
            return 'Got it — start investigating';
        }

        return 'Next →';
    })();

    const handlePrimaryAction = () => {
        if (step === 0 && !isDeskRoute) {
            navigate('/desk');
            return;
        }
        if (step === 0 && isDeskRoute) {
            updateStep(1);
            navigate('/interrogate');
            return;
        }
        if (step === 2 && !isCluesRoute) {
            navigate('/clues');
            return;
        }
        if (step === 2 && isCluesRoute) {
            updateStep(3);
            navigate('/interrogate');
            return;
        }


        if (isLast) {
            dismiss();
            return;
        }

        next();
    };

    if (!visible) return null;

    return (
        <>
            <div onClick={dismiss} className='tutorial-backdrop' />

            <div role="dialog" aria-modal="true" className='tutorial-modal'>
                <div key={step}>
                    <span>{current.icon}</span>
                    <h2>{current.title}</h2>
                    {current.description.map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>

                <div>
                    {STEPS.map((_, i) => (
                        <button key={i} onClick={() => updateStep(i)}>
                            {i === step ? '●' : '○'}
                        </button>
                    ))}
                </div>

                <div>
                    {step > 0 && <button onClick={prev}>← Back</button>}
                    <button onClick={dismiss}>Skip tutorial</button>
                    <button onClick={handlePrimaryAction}>{primaryActionLabel}</button>
                </div>
            </div>
        </>
    );
}

export default TutorialModal;