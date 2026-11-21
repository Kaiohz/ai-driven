# Anti-patterns

Load this before review to catch violations.

## Absolutely Avoid
- ❌ React imports in domain layer (no hooks, no JSX, no components)
- ❌ Direct API calls in components (use hooks that consume domain)
- ❌ Prop drilling (use composition or context)
- ❌ Class components (use functional components)
- ❌ `any` type (use `unknown` or proper types)
- ❌ Premature optimization (measure first)
- ❌ God components (>300 lines, do everything)
- ❌ Testing implementation details (test behavior)
- ❌ Fixed pixel widths (use responsive units: %, rem, vw/vh)
- ❌ Desktop-only designs (mobile traffic is 50%+ globally)
- ❌ Ignoring touch interactions (hover states don't work on mobile)
- ❌ Tiny touch targets (<44px on mobile)
- ❌ Arbitrary Tailwind literals (`min-h-[143px]`, `size-[41px]`, `h-[23px]`, `shadow-[…]`) when a named primitive or token exists; promote recurring values to tokens instead
- ❌ Reimplementing an existing UI primitive (Badge, Card, Skeleton…) with raw elements + a local class map — reuse/enrich the real component and its `*-variants.ts`
- ❌ Hardcoded colours (`#hex`, `rgb()`, default Tailwind palette classes like `bg-blue-600`) — always go through the repo's design tokens
- ❌ `index.ts` files for re-exporting dependencies across layers
- ❌ Local `Record<Variant, string>` maps inside a component when a `*-variants.ts` file exists for that primitive
- ❌ Multiple custom hooks exported from one file (one hook = one file — hooks are the use-case equivalent)
- ❌ Business rules inline in hooks or components (extract pure domain functions / Zod schemas in `domain/`)
- ❌ Re-implementing an existing domain function, hook, or guard (grep first, reuse/inject the real one)

## Critical Reminders
1. **Domain** = pure TypeScript, zero React dependencies
2. **Application** consumes domain via **custom hooks**
3. **Infrastructure** implements **domain ports** (adapters pattern)
4. Use **TypeScript strict mode** with explicit types everywhere
5. **Test behavior, not implementation** with React Testing Library
6. **Mobile-first responsive design** with Tailwind breakpoints
7. **Touch targets** minimum 44x44px on mobile
8. SOLID + KISS: simplicity and design principles above all
9. ONE hook per file; hooks are thin orchestrators — business rules in pure domain functions/Zod; reuse-first for logic as well as UI