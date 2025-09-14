---
applyTo: "apps/web/**/*"
---

# Frontend React – Instructions (Radix UI)

## Tech version
- React v19
- Vite v7
- TypeScript 5.9.2
- Radix UI v1.4.3
- TailwindCSS v4 latest 
- TanStack Query latest 
- TanStack Router latest 
- socket.io-client latest 
- @clerk/clerk-react latest 
- Vitest latest 

## Folder detail (trong apps/web/src)
├─ components/ui/       # Radix composition
├─ features/            # business component
├─ hooks/               # custom hooks
├─ pages/               # router pages
├─ worklets/            # AudioWorklet
├─ services/            # api + socket
├─ utils/               # helper, cn()
└─ env.ts

## Radix composition mẫu
```tsx
import * as Dialog from '@radix-ui/react-dialog';
export function ConfirmDialog({ open, onOpenChange, onConfirm, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-1/2 scale-95 rounded-lg bg-white p-4 shadow-xl animate-scale-in">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{children}</Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close className="btn-secondary">Huỷ</Dialog.Close>
            <button onClick={onConfirm} className="btn-primary">Xác nhận</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

## Share với BE
- Import schema từ `@vn-speech/schemas` → validate trước khi emit:
```ts
socket.emit('audio', AudioChunkSchema.parse(chunk));
```

## Test
- Vitest + @testing-library/react
- Coverage > 70 %
```

---