import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { PinProvider } from './contexts/PinContext'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PinProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </PinProvider>
  </StrictMode>
)
