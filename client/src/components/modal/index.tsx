import { ReactNode, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

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
              <X size={16} />
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
  animation: ${fadeIn} 0.18s ease both;
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(41, 38, 27, 0.35);

  @supports not (backdrop-filter: blur(8px)) {
    background: rgba(41, 38, 27, 0.7);
  }

`;

const Box = styled.div`
  animation: ${popIn} 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  background: var(--bg-card);
  box-shadow: 0 8px 32px rgba(41, 38, 27, 0.18), inset 0 0 0 1px var(--border-medium);
  border-radius: var(--radius-xl);
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
  padding: 8px 8px 0 20px;
  min-height: 48px;
  flex-shrink: 0;
`;

const Title = styled.div`
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 400;
  font-size: 18px;
  color: var(--title-fg);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseBtn = styled.button`
  transition: background 0.15s, transform 0.12s;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--hover-bg);
  }

  &:active {
    transform: scale(0.9);
  }

`;

const Body = styled.div`
  padding: 12px 20px 20px;
  color: var(--text-primary);
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  padding: 0 20px 20px;
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
