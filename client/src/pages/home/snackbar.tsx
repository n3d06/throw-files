import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import * as S from "./styles";

const TOAST_DURATION = 5000;

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: string;
  title: string;
  description: string;
  type: ToastVariant;
}

const SNACKBAR_ICONS: Record<ToastVariant, JSX.Element> = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertCircle size={20} />,
  info: <Info size={20} />,
};

/**
 * MD3 snackbar: one at a time on the inverse surface. A newer message replaces
 * the current one (see addToast). The countdown pauses while the pointer or
 * keyboard focus is on it, so it never vanishes mid-read.
 */
const Snackbar = ({
  toast,
  onRemove,
}: {
  toast: ToastData;
  onRemove: (id: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(TOAST_DURATION);

  // Held in a ref so the timers below never restart because the parent passed
  // a new callback; keying on it restarted the countdown on every render.
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  const itemRef = useRef<HTMLDivElement>(null);

  // Reading layout forces the off-screen starting style to apply before
  // `visible` flips, so the entrance transitions even in background tabs.
  useLayoutEffect(() => {
    itemRef.current?.getBoundingClientRect();
    setVisible(true);
  }, []);

  // A newer message reuses this snackbar instead of remounting it, so rapid
  // messages swap text in place rather than flashing out and back in. Each
  // one gets a fresh countdown, and one arriving mid-exit cancels the exit.
  const shownId = useRef(toast.id);
  if (shownId.current !== toast.id) {
    shownId.current = toast.id;
    remainingRef.current = TOAST_DURATION;
  }
  useEffect(() => {
    setLeaving(false);
  }, [toast.id]);

  useEffect(() => {
    if (paused || leaving) return;
    const started = Date.now();
    const dismiss = setTimeout(() => setLeaving(true), remainingRef.current);
    return () => {
      clearTimeout(dismiss);
      remainingRef.current -= Date.now() - started;
    };
  }, [paused, leaving, toast.id]);

  useEffect(() => {
    if (!leaving) return;
    const remove = setTimeout(() => onRemoveRef.current(toast.id), 200);
    return () => clearTimeout(remove);
  }, [leaving, toast.id]);

  return (
    <S.Snackbar
      ref={itemRef}
      $visible={visible}
      $leaving={leaving}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Swapped in place with no animation: re-running a fade on every
          message made rapid ones (e.g. repeated Copy) flicker. */}
      <S.SnackbarContent>
        <S.SnackbarIcon $type={toast.type} aria-hidden="true">
          {SNACKBAR_ICONS[toast.type]}
        </S.SnackbarIcon>
        <S.SnackbarText>
          <S.SnackbarTitle>{toast.title}</S.SnackbarTitle>
          {toast.description && (
            <S.SnackbarSupporting title={toast.description}>
              {toast.description}
            </S.SnackbarSupporting>
          )}
        </S.SnackbarText>
      </S.SnackbarContent>
      <S.SnackbarClose onClick={() => setLeaving(true)} aria-label="Dismiss">
        <X size={20} />
      </S.SnackbarClose>
    </S.Snackbar>
  );
};

/** Live region that hosts the single current snackbar. */
export const SnackbarHost = ({
  toast,
  onRemove,
}: {
  toast: ToastData | undefined;
  onRemove: (id: string) => void;
}) => (
  <S.SnackbarHost role="status" aria-live="polite">
    {toast && <Snackbar toast={toast} onRemove={onRemove} />}
  </S.SnackbarHost>
);
