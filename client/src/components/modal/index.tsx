import { ReactNode, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styled, { css, keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.7); }
  60% { opacity: 1; transform: scale(1.03); }
  100% { opacity: 1; transform: scale(1); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/** Closing: the dialog sinks down and fades out. */
const dropOut = keyframes`
  0% { opacity: 1; transform: translateY(0) scale(1); }
  25% { opacity: 1; transform: translateY(-6px) scale(1.01); }
  100% { opacity: 0; transform: translateY(60px) scale(0.92); }
`;

const CLOSE_MS = 320;

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

  // Stay mounted for the closing animation after `visible` turns false.
  const [rendered, setRendered] = useState(visible);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (visible) {
      setRendered(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const t = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!rendered) return null;

  return ReactDOM.createPortal(
    <Overlay
      $closing={closing}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Box
        $closing={closing}
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
              <X size={24} />
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

const Overlay = styled.div<{ $closing: boolean }>`
  animation: ${(p) =>
    p.$closing
      ? css`${fadeOut} ${CLOSE_MS}ms ease both`
      : css`${fadeIn} 0.18s ease both`};
  pointer-events: ${(p) => (p.$closing ? "none" : "auto")};
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--overlay);
  backdrop-filter: blur(3px);

`;

const Box = styled.div<{ $closing: boolean }>`
  animation: ${(p) =>
    p.$closing
      ? css`${dropOut} ${CLOSE_MS}ms cubic-bezier(0.5, 0, 0.75, 0) both`
      : css`${popIn} 0.35s cubic-bezier(0.34, 1.3, 0.64, 1) both`};
  background: var(--bg-primary);
  box-shadow: var(--shadow-xl), var(--shadow-lg);
  border-radius: var(--radius-lg);
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
  padding: 16px 12px 0 16px;
  min-height: 48px;
  flex-shrink: 0;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 20px;
  line-height: 24px;
  color: var(--title-fg);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseBtn = styled.button`
  transition: color 0.15s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  font-size: 14px;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--text-primary);
    transform: rotate(90deg);
  }

`;

const Body = styled.div`
  padding: 12px 16px 20px;
  color: var(--text-secondary);
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  padding: 16px;
  background: var(--bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
