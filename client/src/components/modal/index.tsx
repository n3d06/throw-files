import { ReactNode, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styled, { css, keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(-16px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/** Closing: the dialog fades and shrinks slightly. */
const dropOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.96); }
`;

const CLOSE_MS = 200;

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
      ? css`${fadeOut} ${CLOSE_MS}ms var(--md-ease-emphasized-accelerate) both`
      : css`${fadeIn} 0.2s var(--md-ease-standard) both`};
  pointer-events: ${(p) => (p.$closing ? "none" : "auto")};
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  /* MD3 scrim: 32% black. */
  background: var(--overlay);
`;

/** MD3 basic dialog: surface-container-high, extra-large (28dp) corners. */
const Box = styled.div<{ $closing: boolean }>`
  animation: ${(p) =>
    p.$closing
      ? css`${dropOut} ${CLOSE_MS}ms var(--md-ease-emphasized-accelerate) both`
      : css`${popIn} 0.4s var(--md-ease-emphasized-decelerate) both`};
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
  box-shadow: var(--md-elevation-3);
  border-radius: var(--md-shape-xl);
  overflow: hidden;
  min-width: min(280px, 100%);
  /* Keep a tall dialog inside the viewport and let the body scroll instead. */
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 16px 0 24px;
  flex-shrink: 0;
`;

/** Headline small: 24/32, regular weight. */
const Title = styled.h2`
  font-weight: 400;
  font-size: 24px;
  line-height: 32px;
  letter-spacing: 0;
  color: var(--md-on-surface);
  display: flex;
  align-items: center;
  gap: 12px;
`;

/** Standard icon button: 40dp with a round state layer. */
const CloseBtn = styled.button`
  position: relative;
  flex-shrink: 0;

  /* 48dp touch target around the 40dp button. */
  &::before {
    content: "";
    position: absolute;
    inset: -4px;
  }
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--md-on-surface-variant);
  width: 40px;
  height: 40px;
  border-radius: var(--md-shape-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s var(--md-ease-standard);

  &:hover {
    background: color-mix(in srgb, var(--md-on-surface-variant) 8%, transparent);
  }

  &:active {
    background: color-mix(in srgb, var(--md-on-surface-variant) 10%, transparent);
  }
`;

/** Body medium in on-surface-variant. */
const Body = styled.div`
  padding: 16px 24px 24px;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0.25px;
  color: var(--md-on-surface-variant);
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  padding: 0 24px 24px;
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
