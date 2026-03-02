# Phase 3: Deployment & Polish — Spec

**ID**: 898a8210  
**Status**: APPROVED  
**Phase**: 3 of 3  
**Depends on**: Phase 2 (UI & Dashboard — must be complete)

---

## Intent

Production-ready polish and deployment. SEO, analytics, monetization placeholders, error resilience, accessibility baseline, and Vercel deployment. This is the final phase — the app ships after this.

---

## Goals

1. **SEO & Metadata** — Title, description, Open Graph, favicon for Korean audience
2. **Vercel Deployment** — Production build, deployment config, custom domain readiness
3. **Analytics** — Vercel Analytics (pageviews + feature events, never transcript data)
4. **Monetization** — AdSense placeholder slots (2 max), 후원하기 (donate) link
5. **Error Resilience** — Error boundary, graceful fallbacks, user-friendly error states
6. **Accessibility Baseline** — Keyboard navigation, ARIA labels, focus management, color contrast
7. **Performance** — Bundle analysis, dynamic imports for xlsx, loading states
8. **Final Polish** — Footer, favicon, missing micro-interactions, edge case UI handling

---

## Constraints

- All Phase 1 domain tests (84+) MUST continue to pass
- Phase 2 UI functionality MUST NOT regress
- `npx next build` MUST succeed
- Analytics MUST NOT capture or transmit any transcript content, course data, grades, or GPA
- Analytics boundary: page views and feature usage events only (uploaded, selected department, used what-if)
- AdSense slots are placeholders (actual AdSense code requires account approval) — use clearly marked placeholder divs with correct sizing
- No new business logic — this phase is infrastructure and polish only
- Korean-first for all new UI copy

---

## Deliverables

### 1. SEO & Metadata

Update `src/app/layout.tsx` metadata:

```typescript
export const metadata: Metadata = {
  title: "KAIST 졸업요건 분석기 | 나 졸업 가능해?",
  description: "KAIST ERP 성적표를 업로드하면 졸업요건 충족 여부를 즉시 확인할 수 있습니다. 모든 데이터는 브라우저에서만 처리됩니다.",
  keywords: ["KAIST", "졸업요건", "졸업", "성적", "학점", "이수요건", "graduation"],
  openGraph: {
    title: "KAIST 졸업요건 분석기",
    description: "나 졸업 가능해? KAIST ERP 성적표로 즉시 확인",
    type: "website",
    locale: "ko_KR",
  },
};
```

- Set `<html lang="ko">` (currently "en")
- Add favicon (simple graduation cap or KAIST-themed icon — generate a simple SVG favicon)
- Add `robots.txt` and `sitemap.xml` via Next.js conventions (`app/robots.ts`, `app/sitemap.ts`)

### 2. Vercel Deployment

- Ensure `next.config.ts` (or `.mjs`) is production-ready
- No server-side features needed — confirm static export works OR standard Vercel Next.js deployment
- Add `.vercelignore` if needed (exclude `references/`, `specs/`, test files from deployment)
- Verify `npx next build` produces clean output with no warnings that would block deployment

### 3. Analytics (Vercel Analytics)

- Install `@vercel/analytics` package
- Add `<Analytics />` component to root layout
- Define custom events (these are the ONLY events to track):
  - `file_uploaded` — user uploaded a file (no file content)
  - `analysis_started` — user clicked analyze (department + year only, no grades)
  - `department_selected` — which department was selected (aggregate insight)
  - `whatif_used` — user interacted with what-if simulator
  - `theme_toggled` — user toggled theme
- NO events should contain: course names, grades, GPA, credit counts, or any transcript-derived data

### 4. Monetization Placeholders

**AdSense (2 slots maximum):**
- **Slot 1**: Between upload section and results (visible only after analysis, before dashboard)
- **Slot 2**: Sidebar on desktop / bottom on mobile (within results view)
- Implementation: Create an `<AdSlot />` component with:
  - Clearly marked placeholder with dashed border and "광고 영역" text in development
  - Standard AdSense container div with `data-ad-slot` and `data-ad-client` attributes (empty — to be filled when AdSense account is approved)
  - Responsive sizing: 728x90 desktop / 320x100 mobile for Slot 1, 300x250 for Slot 2
  - Component accepts `slot` prop for different placements

**후원하기 (Donate):**
- Add a "후원하기" link/button in the footer
- Links to Buy Me a Coffee or similar (use placeholder URL: `https://buymeacoffee.com/kaistgrad` — can be updated later)
- Subtle but visible — small button or text link with a coffee/heart icon
- Korean copy: "☕ 개발자에게 커피 한 잔 사주기" or similar

### 5. Error Boundary

- Create a React Error Boundary component wrapping the main content
- **Parse error**: "엑셀 파일을 읽을 수 없습니다. ERP 성적조회에서 다운로드한 파일인지 확인해주세요."
- **Analysis error**: "분석 중 오류가 발생했습니다. 다시 시도해주세요."
- **Generic error**: "예기치 않은 오류가 발생했습니다." + "다시 시도" button
- Error states should match the app's dark theme styling
- Include a "다시 시도" (retry) button that resets to upload state

### 6. Accessibility Baseline

- All interactive elements keyboard-accessible (tab order, Enter/Space activation)
- File upload: keyboard-triggerable (Enter/Space on the drop zone)
- Dropdowns: keyboard navigable
- Progress bars: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- Status hero: `role="status"` or `aria-live="polite"` for the analysis result announcement
- Color contrast: all text meets WCAG AA (4.5:1 for normal text, 3:1 for large text) in both dark and light modes
- Focus visible indicators on all interactive elements
- Alt text / aria-labels in Korean

### 7. Performance

- **Dynamic import xlsx**: The `xlsx` library is ~300KB. Dynamically import it only when the user uploads a file (not on initial page load). Use `next/dynamic` or React.lazy.
- **Loading state**: Show a spinner/skeleton while Excel is being parsed (parsing is fast but xlsx import is not)
- **Bundle analysis**: Run `npx next build` and check that the initial page JS bundle is under 200KB (excluding xlsx)
- **Image optimization**: Use `next/image` if any images exist; ensure favicon is optimized SVG

### 8. Footer

Add a minimal footer at the bottom of the page (both upload and results states):

```
KAIST 졸업요건 분석기 | 모든 데이터는 브라우저에서만 처리됩니다
☕ 개발자에게 커피 한 잔 사주기  |  GitHub
```

- Privacy restatement
- 후원하기 link
- GitHub link (placeholder: `https://github.com/yourusername/graduatekaist`)
- Copyright year (auto-generated)
- Minimal, single-line on desktop, stacked on mobile

---

## Test Cases

### T19: SEO & Metadata

| # | Given | When | Then |
|---|-------|------|------|
| T19.1 | App loaded | Check document title | Contains "KAIST 졸업요건 분석기" |
| T19.2 | App loaded | Check html lang attribute | "ko" |
| T19.3 | App loaded | Check meta description | Contains Korean description about graduation analysis |

### T20: Error Handling

| # | Given | When | Then |
|---|-------|------|------|
| T20.1 | User uploads corrupted file | Analysis attempted | Shows Korean error message, does not crash |
| T20.2 | Error state shown | Click "다시 시도" | Returns to upload state |
| T20.3 | Domain analysis throws | Error boundary catches | Shows graceful error UI, not white screen |

### T21: Analytics Events

| # | Given | When | Then |
|---|-------|------|------|
| T21.1 | Vercel Analytics loaded | User uploads file | `file_uploaded` event tracked (no file content) |
| T21.2 | Vercel Analytics loaded | User starts analysis | `analysis_started` event tracked (department + year only) |
| T21.3 | Any analytics event | Check payload | Contains NO course data, grades, or GPA |

### T22: Accessibility

| # | Given | When | Then |
|---|-------|------|------|
| T22.1 | Upload page | Navigate with Tab key | All interactive elements reachable in logical order |
| T22.2 | Progress bars rendered | Check ARIA attributes | Has role="progressbar" with correct value attributes |
| T22.3 | Dark mode active | Check text contrast | Meets WCAG AA (4.5:1) |

### T23: Performance

| # | Given | When | Then |
|---|-------|------|------|
| T23.1 | Initial page load | Check network tab | xlsx not loaded until file upload |
| T23.2 | User uploads file | During parsing | Loading indicator visible |
| T23.3 | `npx next build` output | Check bundle size | Initial JS < 200KB (excluding xlsx) |

### T24: Monetization Placeholders

| # | Given | When | Then |
|---|-------|------|------|
| T24.1 | Results view | Check ad slot 1 | Placeholder div present between upload and results |
| T24.2 | Results view (desktop) | Check ad slot 2 | Placeholder div present in sidebar |
| T24.3 | Footer rendered | Check 후원하기 link | Link present with correct text and URL |

---

## Out of Scope (Phase 3)

- Actual AdSense account setup and code (placeholder only)
- Custom domain purchase/configuration
- Real Buy Me a Coffee account setup
- CI/CD pipeline
- Automated E2E tests (Playwright/Cypress)
- i18n framework for full English translation
- PWA / service worker
- Additional department support (V2)
- User feedback form
- Social sharing features

---

## Verification Commands

```bash
# All tests pass (Phase 1 domain + any new tests)
npx vitest run

# Type checking
npx tsc --noEmit

# Lint
npx next lint

# Production build succeeds
npx next build
```

---

## Acceptance Criteria

- [ ] AC1: HTML lang attribute is "ko"
- [ ] AC2: Page title contains "KAIST 졸업요건 분석기"
- [ ] AC3: Open Graph metadata present with Korean title and description
- [ ] AC4: Favicon exists (SVG or PNG)
- [ ] AC5: robots.txt generated via Next.js conventions
- [ ] AC6: `@vercel/analytics` installed and Analytics component in root layout
- [ ] AC7: Custom analytics events defined for file_uploaded, analysis_started, department_selected, whatif_used, theme_toggled — none contain transcript data
- [ ] AC8: AdSense placeholder component exists with 2 slots (between upload/results, sidebar/bottom)
- [ ] AC9: 후원하기 link in footer with Korean copy
- [ ] AC10: Footer present with privacy restatement, donate link, and GitHub link
- [ ] AC11: Error boundary wraps main content; parse/analysis errors show Korean error messages
- [ ] AC12: "다시 시도" button in error state resets to upload
- [ ] AC13: All interactive elements keyboard-accessible (file upload, dropdowns, buttons, toggle)
- [ ] AC14: Progress bars have role="progressbar" with ARIA value attributes
- [ ] AC15: xlsx dynamically imported (not in initial bundle)
- [ ] AC16: Loading indicator shown during file parsing
- [ ] AC17: `npx next build` succeeds with 0 errors
- [ ] AC18: All Phase 1 domain tests still pass
- [ ] AC19: `npx tsc --noEmit` passes with 0 errors
- [ ] AC20: No analytics event payload contains course data, grades, or GPA

---

## Completion Standard

Phase 3 is complete when:
1. All 20 acceptance criteria are satisfied
2. `npx vitest run` passes (all tests, 0 failures)
3. `npx tsc --noEmit` passes with 0 errors
4. `npx next build` succeeds with 0 errors
5. The app is production-ready: SEO, analytics, error handling, accessibility, performance
