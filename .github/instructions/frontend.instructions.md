
### `.github/instructions/frontend.instructions.md`
```markdown
---
applyTo: "apps/ui/**/*"
---

# React + Vite + TS Frontend Guidelines

## 1. Component naming
PascalCase: LivePanel, DashboardPage, AuthLoginForm

## 2. File structure
components/
hooks/
services/ (axios + react-query)
pages/
routes.tsx

## 3. Logic rules
- Dùng React Query cho mọi fetch REST (cache 5 phút)
- WebSocket: hook `useSocket()` quản lý reconnect 3 lần
- Không any – strict TypeScript
- Style: TailwindCSS, không viết CSS thô

## 4. Ví dụ
```tsx
// vi: hiển thị đoạn transcript có highlight từ toxic
export const TranscriptText: React.FC<{words: Word[]}> = ({words}) => (
  <p>
    {words.map((w) => (
      <span
        key={`${w.start}-${w.end}`}
        className={w.isToxic ? 'text-red-600 font-bold' : ''}
      >
        {w.word}{' '}
      </span>
    ))}
  </p>
);

## 5. Testing
- unit: Vitest + @testing-library/react  
- e2e: npx playwright (chỉ 1 flow: login → nói → thấy đỏ)
