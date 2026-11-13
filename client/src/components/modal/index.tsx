import { ReactNode, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
}

export const Modal = ({
  visible,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Held in a ref so the effect below can key on `visible` alone. Callers pass
  // an inline arrow for onClose, so depending on it re-ran this effect on every
  // parent render — releasing the body scroll lock and yanking focus back to
  // the trigger button while the dialog was still open.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Keep Tab inside the dialog. aria-modal alone does not constrain focus,
      // so Tab used to walk straight out into the page behind the overlay.
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        modalRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === modalRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    const focusTimer = setTimeout(() => {
      (focusables()[0] ?? modalRef.current)?.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousActiveElement.current?.focus();
    };
  }, [visible]);

  if (!visible) return null;

  return ReactDOM.createPortal(
    <Overlay
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Box
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        style={{ maxWidth: width, width: "100%" }}
      >
        {title !== undefined && (
          <Header>
            <Title id="modal-title">{title}</Title>
            <CloseBtn onClick={onClose} aria-label="Close">
              <X size={18} />
            </CloseBtn>
          </Header>
        )}
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Box>
    </Overlay>,
    document.body,
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.6);

  @supports not (backdrop-filter: blur(8px)) {
    background: rgba(0, 0, 0, 0.8);
  }

`;

const Box = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border-medium);
  border-radius: 0;
  overflow: hidden;
  /* Keep a tall dialog inside the viewport and let the body scroll instead. */
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 40px);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
`;

const Title = styled.div`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseBtn = styled.button`
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  width: 28px;
  height: 28px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
    border-color: var(--border-medium);
  }
`;

const Body = styled.div`
  padding: 16px;
  color: var(--text-primary);
  font-family: "Inter", sans-serif;
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
`;

const X = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
