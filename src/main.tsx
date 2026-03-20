import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'nes.css/css/nes.min.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router'
import { ClerkProvider } from '@clerk/react-router'
import { neobrutalism } from '@clerk/ui/themes'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

const clerkAppearance = {
  theme: neobrutalism,
  variables: {
    colorBackground: '#000000',
    colorPrimary: '#ffd166',
    colorPrimaryForeground: '#000000',
    colorMutedForeground: '#cbd5e1',
    colorForeground: '#f8fafc',
    colorNeutral: '#1f2937',
    colorBorder: '#334155',
    colorShimmer: '#f59e0b',
    colorMuted: '#000000',
    colorInput: '#dedede',
    colorInputForeground: '#000000',
  },
  signIn: {
    theme: neobrutalism,
    variables: {
      colorBackground: '#121212',
      colorForeground: '#f8fafc',
      colorPrimary: '#f84646',
      colorPrimaryForeground: '#111827',
      colorInput: '#ffffff',
      colorInputForeground: '#000000',
    },
    elements: {
      headerTitle: {
        color: '#ffffff',
      },
      headerSubtitle: {
        color: '#ffffff',
      },
      socialButtonsBlockButton: {
        color: '#ffffff',
        borderColor: '#475569',
      },
      socialButtonsBlockButtonText: {
        color: '#ffffff',
      },
      dividerText: {
        color: '#ffffff',
      },
      dividerLine: {
        backgroundColor: '#475569',
      },
      formFieldInput: {
        backgroundColor: '#ffffff',
        color: '#000000',
        '::placeholder': {
          color: '#000000',
          opacity: 1,
        },
      },
      formFieldInputShowPasswordButton: {
        color: '#000000',
      },
    },
  },
  signUp: {
    theme: neobrutalism,
    variables: {
      colorBackground: '#121212',
      colorForeground: '#f8fafc',
      colorPrimary: '#f84646',
      colorPrimaryForeground: '#111827',
      colorInput: '#ffffff',
      colorInputForeground: '#000000',
    },
    elements: {
      headerTitle: {
        color: '#ffffff',
      },
      headerSubtitle: {
        color: '#ffffff',
      },
      socialButtonsBlockButton: {
        color: '#ffffff',
        borderColor: '#475569',
      },
      socialButtonsBlockButtonText: {
        color: '#ffffff',
      },
      dividerText: {
        color: '#ffffff',
      },
      dividerLine: {
        backgroundColor: '#475569',
      },
      formFieldInput: {
        backgroundColor: '#ffffff',
        color: '#000000',
        '::placeholder': {
          color: '#000000',
          opacity: 1,
        },
      },
      formFieldInputShowPasswordButton: {
        color: '#000000',
      },
    },
  },
  userProfile: {
    theme: neobrutalism,
    variables: {
      colorBackground: '#121212',
      colorForeground: '#f8fafc',
      colorPrimary: '#f84646',
      colorPrimaryForeground: '#111827',
      colorInput: '#ffffff',
      colorInputForeground: '#000000',
    },
    elements: {
      navbar: {
        backgroundColor: '#121212',
      },
      navbarButton: {
        color: '#ffffff',
      },
      navbarButtonIcon: {
        color: '#ffffff',
      },
      profileSectionTitle: {
        color: '#ffffff',
      },
      profileSectionPrimaryButton: {
        color: '#ffffff',
      },
      formButtonPrimary: {
        color: '#ffffff',
      },
      formButtonReset: {
        color: '#ffffff',
      },
      formFieldLabel: {
        color: '#ffffff',
      },
      formFieldInput: {
        backgroundColor: '#ffffff',
        color: '#000000',
      },
    },
  },
  userButton: {
    theme: neobrutalism,
    elements: {
      userButtonPopoverCard: {
        backgroundColor: '#121212',
        color: '#ffffff',
      },
      userButtonPopoverMain: {
        color: '#ffffff',
      },
      userButtonPopoverFooter: {
        color: '#ffffff',
      },
      userButtonPopoverActionButton: {
        color: '#ffffff',
        '&:hover': {
          color: '#f84646',
        },
      },
      userButtonPopoverActionButtonText: {
        color: '#ffffff',
        '&:hover': {
          color: '#f84646',
        },
      },
      userButtonPopoverActionButtonIcon: {
        color: '#ffffff',
        '&:hover': {
          color: '#f84646',
        },
      },
    },
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        appearance={clerkAppearance}
      >
        <App />
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>,
)
