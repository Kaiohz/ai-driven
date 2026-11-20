# Setup — Vitest Config and Custom Render

## Test Structure
```
src/
├── components/
│   └── CartSummary/
│       └── CartSummary.tsx         # no co-located tests in src/
├── hooks/
│   └── useCheckout/
│       └── useCheckout.ts          # no co-located tests in src/
└── infrastructure/
    └── api/
        └── (external adapters — tested via MSW at the network boundary)
tests/
├── setup.ts                         # Global test setup (MSW, matchers)
├── behavioral/                      # ALL tests live here
│   └── <feature>/
│       ├── CartSummary.test.tsx
│       └── useCheckout.test.ts
├── utils/
│   └── render.tsx                   # Custom render with providers
└── fixtures/
    └── external.ts                  # Shared vi.fn() factories for external calls
```

- ALL test files live in `tests/behavioral/` — no co-located `*.test.tsx` in `src/`, no `tests/unit/`. `tests/utils/` and `tests/fixtures/` hold support code only, never test files.

## vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['tests/behavioral/**/*.test.{ts,tsx}'],
  },
})
```

## tests/setup.ts

```ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

## tests/utils/render.tsx — custom render with providers

```tsx
import { render, type RenderOptions } from '@testing-library/react'
import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

function customRender(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AppProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
```

## Why real implementations
Using real implementations ensures tests reflect actual behavior. A stub that diverges silently from the real implementation produces tests that pass but do not detect real regressions. Mocking only the network boundary (API calls, SDKs) keeps the cost low while keeping confidence high.