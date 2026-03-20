import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'nes.css/css/nes.min.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router';
import { ClerkProvider } from '@clerk/react-router'
import { neobrutalism } from '@clerk/ui/themes'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        appearance={{
          theme: neobrutalism,
          signIn: {
            theme: neobrutalism,
          },
          signUp: {
            theme: neobrutalism,
          },
          userProfile: {
            theme: neobrutalism,
          }
        }}>
          <App />
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>,
)
