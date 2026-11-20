# Vitest Commands

```bash
# Run all tests
pnpm vitest

# Watch mode
pnpm vitest --watch

# With coverage
pnpm vitest --coverage

# Single file
pnpm vitest tests/behavioral/cart/CartSummary.test.tsx

# Single test by name
pnpm vitest -t "removes an item when the remove button is clicked"

# Only the component project (no Docker)
pnpm vitest --project component

# Including behavioral e2e (needs Docker)
pnpm vitest --project e2e
```

## Best Practices
- **Query by role first**: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- **Explicit names**: `test_removes_item_on_click` > `test_click`
- **One logical behavior per test** (multiple assertions OK if they describe the same observable outcome)
- **Independent tests**: reset store/context state in `beforeEach`, never rely on test execution order
- **Reusable fixtures**: factor out mock factories in `tests/fixtures/` and render helpers in `tests/utils/` (support code only — all test files live in `tests/behavioral/`)
- **Coverage ≥ 80%**: but prioritize testing real user interactions over line coverage