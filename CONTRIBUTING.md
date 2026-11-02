# Contributing to Yash OS

Thank you for your interest in contributing to **Yash OS**! We welcome improvements, bug fixes, and engineering enhancements that adhere to our code quality standards.

---

## Code of Conduct

Please be respectful, collaborative, and constructive when opening issues or submitting pull requests.

---

## Development Workflow

### 1. Prerequisites

- Node.js (v20+ or v22+)
- npm (v10+)

### 2. Fork & Clone

```bash
git clone https://github.com/your-username/yash-os.git
cd yash-os
git checkout -b feature/your-feature-name
```

### 3. Install Dependencies

```bash
npm ci
```

### 4. Running the Development Server

```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000).

---

## Code Quality Standards

Before submitting a Pull Request, verify that all automated checks pass locally:

```bash
# 1. Format code
npm run format

# 2. Check format compliance
npm run format:check

# 3. Static analysis & linting
npm run lint

# 4. Strict TypeScript validation
npm run typecheck

# 5. Automated test suite
npm test

# 6. Production build compilation
npm run build
```

---

## Pull Request Guidelines

1. **Focused Scope**: Keep changes cohesive and focused. Do not mix unrelated refactoring with feature code.
2. **Preserve Compatibility**: Yash OS uses an offline-first storage model. Any state model modifications must preserve backward compatibility through schema migration (`migrateOSState`).
3. **Write Tests**: Accompany new domain logic, utilities, or review calculators with Vitest unit tests in `src/test/`.
4. **Follow Design DNA**: Respect the established UI aesthetic: midnight navy canvas, subtle glass containers, cyan/blue primary accents, and controlled violet depth.

Thank you for helping build high-leverage operating infrastructure!
