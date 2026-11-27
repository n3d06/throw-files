import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useState,
  ChangeEvent,
  useCallback,
  DragEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  RefreshCw,
  Copy,
  Share2,
  QrCode,
  Github,
  ArrowUp,
  ArrowDown,
  History,
  Zap,
  File as FileIcon,
  Users,
  Upload,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Check,
  Send,
  Type,
} from "lucide-react";
import qrcode from "qrcode-generator";
import { Modal } from "../../components/modal";
import { Tooltip } from "../../components/tooltip";
import { socket, type ConnectionState } from "../../utils/throw-socket";
import { Button } from "../../components";
import ThrowFileUpload, {
  UploadError,
  type SubmitFile,
  type UploadErrorEvent,
  type UploadFileInfo,
} from "../../utils/throw-file-upload";
import {
  CHANNEL_CODE_LENGTH,
  generateChannelCode,
  isValidChannelCode,
  normalizeChannelCode,
} from "../../utils/channel";
import { formatFileSize, trimFileName } from "../../utils/format";
import {
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  isPreviewableImage,
  isTransferComplete,
  textSendProblem,
  wouldExceedExpectedSize,
} from "../../utils/transfer";
import * as S from "./styles";

const FRONTEND_URL: string =
  (window as { ENV?: { REACT_APP_FRONTEND_URL?: string } }).ENV
    ?.REACT_APP_FRONTEND_URL ||
  // Falls back to wherever the app is actually served from, so Share can never
  // hand somebody a localhost link in production.
  window.location.origin;

const TRANSFER_TIMEOUT = 5 * 60 * 1000;
const TOAST_DURATION = 5000;
const MAX_TOASTS = 5;
/** How many toasts show in the collapsed stack; the rest wait behind them. */
const TOAST_STACK_DEPTH = 3;
const OBJECT_URL_TTL = 60_000;

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastData {
  id: string;
  title: string;
  description: string;
  type: ToastVariant;
}

type Direction = "send" | "receive";

interface Transfer {
  id: string;
  name: string;
  size: number;
  bytes: number;
  direction: Direction;
  compressed: boolean;
}

interface HistoryEntry {
  id: string;
  name: string;
  size: number;
  at: number;
  channel: string;
  compressed: boolean;
  direction: Direction;
}

/**
 * A fully received file waiting for the user to save it.
 *
 * Received files are no longer written to disk automatically: a synthetic anchor
 * click on every inbound `file-done` meant anyone who guessed a channel code
 * could push a download onto a stranger's machine.
 */
interface ReadyFile {
  id: string;
  name: string;
  size: number;
  type: string;
  compressed: boolean;
  blob: Blob;
  /** Object URL for an inline preview; set only for image files. */
  previewUrl?: string;
}

/** A text snippet sent or received on this channel. Kept in memory only. */
interface TextMessage {
  id: string;
  text: string;
  at: number;
  direction: Direction;
}

/** Oldest snippets fall off past this, so a chatty channel can't grow forever. */
const MAX_MESSAGES = 50;

interface ReceiveBuffer {
  chunks: Blob[];
  bytes: number;
  info: { name: string; type: string; size: number; compressed: boolean };
  timeoutId: ReturnType<typeof setTimeout>;
}

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  open: "Connected",
  reconnecting: "Reconnecting…",
  failed: "Connection lost",
};



function vibrate(): void {
  if (window.navigator?.vibrate) window.navigator.vibrate(200);
}

function formatTime(at: number): string {
  return TIME_FORMAT.format(new Date(at));
}

const TOAST_ICONS: Record<ToastVariant, JSX.Element> = {
  success: <Check size={16} strokeWidth={3} />,
  error: <AlertCircle size={16} strokeWidth={2.5} />,
  warning: <AlertCircle size={16} strokeWidth={2.5} />,
  info: <Info size={16} strokeWidth={2.5} />,
};

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: "#1a73e8",
  error: "#d93025",
  warning: "#f9ab00",
  info: "#1a73e8",
};

const Toast = ({
  toast,
  index,
  expanded,
  onRemove,
}: {
  toast: ToastData;
  /** 0 is the newest toast, at the front of the stack. */
  index: number;
  expanded: boolean;
  onRemove: (id: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remainingRef = useRef(TOAST_DURATION);

  // Held in a ref so the timers below never restart because the parent passed
  // a new callback. Keying on it restarted the countdown on every parent
  // render, so toasts never auto-dismissed while a transfer was ticking.
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  const itemRef = useRef<HTMLDivElement>(null);

  // Reading layout forces the browser to compute the off-screen starting
  // style before `visible` flips, so the slide-in transitions. Waiting on
  // requestAnimationFrame instead stalled in background tabs, where frames
  // never fire, and left toasts stuck invisible.
  useLayoutEffect(() => {
    itemRef.current?.getBoundingClientRect();
    setVisible(true);
  }, []);

  // The countdown pauses while the stack is expanded (hovered or focused), so
  // a toast cannot vanish from under the pointer; it resumes where it left off.
  useEffect(() => {
    if (expanded || leaving) return;
    const started = Date.now();
    const dismiss = setTimeout(() => setLeaving(true), remainingRef.current);
    return () => {
      clearTimeout(dismiss);
      remainingRef.current -= Date.now() - started;
    };
  }, [expanded, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const remove = setTimeout(() => onRemoveRef.current(toast.id), 400);
    return () => clearTimeout(remove);
  }, [leaving, toast.id]);

  const color = TOAST_STYLES[toast.type];
  const hidden = !expanded && index >= TOAST_STACK_DEPTH;

  return (
    <S.ToastItem
      ref={itemRef}
      style={{ ["--toast-color" as string]: TOAST_STYLES[toast.type] }}
      $index={index}
      $expanded={expanded}
      $visible={visible}
      $leaving={leaving}
      $hidden={hidden}
      aria-hidden={hidden || undefined}
    >
      <S.ToastInner $muted={!expanded && index > 0}>
        <S.ToastIconWrapper style={{ background: color }}>
          {TOAST_ICONS[toast.type]}
        </S.ToastIconWrapper>
        <S.ToastContent>
          <S.ToastTitle>{toast.title}</S.ToastTitle>
          {toast.description && (
            <S.ToastText title={toast.description}>
              {toast.description}
            </S.ToastText>
          )}
        </S.ToastContent>
        <S.ToastClose onClick={() => setLeaving(true)} aria-label="Dismiss">
          <X size={14} />
        </S.ToastClose>
      </S.ToastInner>
      <S.ToastTimer
        style={{ background: color }}
        $duration={TOAST_DURATION}
        $paused={expanded}
      />
    </S.ToastItem>
  );
};

/**
 * Toasts pile up as a stack: the newest in front, older ones peeking out
 * behind it, smaller and dimmer. Hovering or focusing the stack fans it out
 * into a list and pauses every countdown.
 */
const ToastStack = ({
  toasts,
  onRemove,
}: {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (toasts.length === 0) setExpanded(false);
  }, [toasts.length]);

  const count = toasts.length;
  const height = expanded
    ? count * (S.TOAST_HEIGHT + S.TOAST_GAP) - S.TOAST_GAP
    : S.TOAST_HEIGHT +
      Math.min(Math.max(count - 1, 0), TOAST_STACK_DEPTH - 1) *
        S.TOAST_PEEK;

  return (
    <S.ToastContainerWrapper
      role="status"
      aria-live="polite"
      aria-atomic="false"
      $expanded={expanded}
      style={{ height: count ? height : 0 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setExpanded(false);
      }}
    >
      {toasts.map((toast, i) => (
        <Toast
          key={toast.id}
          toast={toast}
          index={count - 1 - i}
          expanded={expanded}
          onRemove={onRemove}
        />
      ))}
    </S.ToastContainerWrapper>
  );
};

const QR_QUIET = 3;
/** How long the tick stays up before the QR dialog drops away. */
const QR_SUCCESS_HOLD_MS = 1500;

/** Renders `value` as an inline SVG QR code (dark modules on a white quiet zone). */
const QrModal = ({
  visible,
  onClose,
  value,
  joinSignal,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  /** Bumped each time another device joins the channel. */
  joinSignal: number;
}) => {
  // A device joining while the code is on screen almost certainly means it was
  // just scanned: morph the QR into a tick, then let the dialog drop away.
  const [scanned, setScanned] = useState(false);
  const seenSignal = useRef(joinSignal);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) {
      seenSignal.current = joinSignal;
      return;
    }
    if (joinSignal !== seenSignal.current) {
      seenSignal.current = joinSignal;
      setScanned(true);
    }
  }, [visible, joinSignal]);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  useEffect(() => {
    if (!scanned) return;
    const t = setTimeout(() => onCloseRef.current(), QR_SUCCESS_HOLD_MS);
    return () => clearTimeout(t);
  }, [scanned]);

  const { n, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.isDark(r, c)) path += `M${c + QR_QUIET} ${r + QR_QUIET}h1v1h-1z`;
    return { n, path };
  }, [value]);
  const quiet = QR_QUIET;
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={scanned ? "Device connected" : "Scan to open"}
      width={340}
    >
      <S.QrStage $scanned={scanned}>
        <svg
          className="qr"
          viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`}
          role="img"
          aria-label={`QR code for ${value}`}
          shapeRendering="crispEdges"
        >
          <path d={path} fill="#000" />
        </svg>
        {scanned && (
          <S.QrTick role="img" aria-label="Device connected">
            <svg viewBox="0 0 52 52">
              <circle className="disc" cx="26" cy="26" r="25" />
              <path className="mark" d="M14.5 27.5l7.5 7.5 16-16" />
            </svg>
          </S.QrTick>
        )}
      </S.QrStage>
      <S.QrCaption $scanned={scanned}>{value}</S.QrCaption>
    </Modal>
  );
};

const HistoryModal = ({
  visible,
  onClose,
  history,
  onClearHistory,
}: {
  visible: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onClearHistory: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "send" | "receive">("all");

  const sentCount = history.filter((h) => h.direction === "send").length;
  const receivedCount = history.length - sentCount;
  const files =
    activeTab === "all"
      ? history
      : history.filter((h) => h.direction === activeTab);

  return (
    <Modal
      title={
        <S.ModalTitle>
          <S.HistoryWrapper>
            <History size={16} />
          </S.HistoryWrapper>
          Transfer History
          <S.CountBadge>{history.length}</S.CountBadge>
        </S.ModalTitle>
      }
      visible={visible}
      onClose={onClose}
      width={600}
      footer={
        <S.ModalFooter>
          {history.length > 0 && (
            <Button variant="danger" onClick={onClearHistory}>
              Clear All
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </S.ModalFooter>
      }
    >
      <S.TabBar>
        {(
          [
            { key: "all", label: "All", count: history.length },
            { key: "send", label: "Sent", count: sentCount },
            { key: "receive", label: "Received", count: receivedCount },
          ] as const
        ).map((tab) => (
          <S.TabButton
            key={tab.key}
            $active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <S.TabCount $active={activeTab === tab.key}>{tab.count}</S.TabCount>
          </S.TabButton>
        ))}
      </S.TabBar>

      {files.length === 0 ? (
        <S.EmptyState>
          <S.EmptyIconWrapper>
            <FileIcon size={32} />
          </S.EmptyIconWrapper>
          <S.EmptyTitle>No transfers yet</S.EmptyTitle>
          <S.EmptySubtitle>Your file transfers will appear here</S.EmptySubtitle>
        </S.EmptyState>
      ) : (
        <S.HistoryList>
          {files.map((file) => {
            const type = file.direction === "send" ? "sent" : "received";
            return (
              <S.HistoryItem key={file.id}>
                <S.HistoryItemLeft>
                  <S.StatusBadge $type={type}>
                    {file.direction === "send" ? (
                      <ArrowUp size={11} />
                    ) : (
                      <ArrowDown size={11} />
                    )}
                  </S.StatusBadge>
                  <S.FileNameWrapper>
                    <S.FileNameText title={file.name}>
                      {trimFileName(file.name, 36)}
                    </S.FileNameText>
                    {file.compressed && <S.ZipBadge>ZIP</S.ZipBadge>}
                  </S.FileNameWrapper>
                </S.HistoryItemLeft>
                <S.HistoryItemRight>
                  <S.MetaText>{formatTime(file.at)}</S.MetaText>
                  <S.TypeBadge $type={type}>
                    {file.direction === "send" ? "SENT" : "RECV"}
                  </S.TypeBadge>
                </S.HistoryItemRight>
                <S.FileSizeText>{formatFileSize(file.size)}</S.FileSizeText>
              </S.HistoryItem>
            );
          })}
        </S.HistoryList>
      )}
    </Modal>
  );
};

export const Home = memo(() => {
  const uploaderRef = useRef<ThrowFileUpload | null>(null);
  if (!uploaderRef.current) uploaderRef.current = new ThrowFileUpload(socket);
  const uploader = uploaderRef.current;

  const [code, setCode] = useState("");
  const [joinedChannel, setJoinedChannel] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socket.connectionState,
  );
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [peerJoinCount, setPeerJoinCount] = useState(0);
  // Read inside sendFiles, which must not be recreated on every count change.
  const connectedUsersRef = useRef(0);
  connectedUsersRef.current = connectedUsers;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [readyFiles, setReadyFiles] = useState<ReadyFile[]>([]);
  /** Received image open in the full-size viewer. */
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = readyFiles.find((f) => f.id === viewingId && f.previewUrl);

  // Preview URLs pin their blobs in memory; release whatever is left on unmount.
  const readyFilesRef = useRef<ReadyFile[]>([]);
  readyFilesRef.current = readyFiles;
  useEffect(
    () => () =>
      readyFilesRef.current.forEach(
        (f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl),
      ),
    [],
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  /** Which tab of the send card is showing. */
  const [sendMode, setSendMode] = useState<"file" | "text">("file");
  const [textDraft, setTextDraft] = useState("");
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const buffersRef = useRef<Record<string, ReceiveBuffer>>({});
  const dragDepthRef = useRef(0);

  // Read by socket handlers that are registered once and must not go stale.
  const joinedChannelRef = useRef<string | null>(null);
  joinedChannelRef.current = joinedChannel;

  const transferring = transfers.length > 0;

  // ── Toasts ────────────────────────────────────────────────────────────────

  const addToast = useCallback(
    (title: string, description: string, type: ToastVariant) => {
      setToasts((prev) => [
        ...prev.slice(-(MAX_TOASTS - 1)),
        { id: crypto.randomUUID(), title, description, type },
      ]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Transfer list ─────────────────────────────────────────────────────────

  const upsertTransfer = useCallback((transfer: Transfer) => {
    setTransfers((prev) => {
      const index = prev.findIndex((t) => t.id === transfer.id);
      if (index === -1) return [...prev, transfer];
      const next = [...prev];
      next[index] = transfer;
      return next;
    });
  }, []);

  const setTransferBytes = useCallback((id: string, bytes: number) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, bytes } : t)),
    );
  }, []);

  const dropTransfer = useCallback((id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Tear down a partial receive: timer, buffer and progress row together. */
  const discardBuffer = useCallback(
    (id: string) => {
      const buffer = buffersRef.current[id];
      if (buffer) clearTimeout(buffer.timeoutId);
      delete buffersRef.current[id];
      dropTransfer(id);
    },
    [dropTransfer],
  );

  const addHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev]);
  }, []);

  // ── Channel ───────────────────────────────────────────────────────────────

  const joinChannel = useCallback(
    (next: string) => {
      const normalized = normalizeChannelCode(next);
      if (!isValidChannelCode(normalized)) {
        addToast(
          "Invalid code",
          `Channel codes are exactly ${CHANNEL_CODE_LENGTH} letters or digits.`,
          "error",
        );
        return;
      }
      setCode(normalized);
      setJoinedChannel(normalized);
      socket.setChannel(normalized);
      // replaceState, never pushState: pushing on every change trapped the
      // browser's Back button behind one entry per keystroke.
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?channel=${normalized}`,
      );
    },
    [addToast],
  );

  const handleCodeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    // Typing no longer joins anything — the old effect fired a join and a
    // history entry for every prefix of the code.
    setCode(normalizeChannelCode(event.target.value));
  }, []);

  const handleCodeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        joinChannel(code);
      }
    },
    [code, joinChannel],
  );

  const handleGenerate = useCallback(() => {
    joinChannel(generateChannelCode());
  }, [joinChannel]);

  // ── Sending ───────────────────────────────────────────────────────────────

  const sendFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const channel = joinedChannelRef.current;
      if (!channel || !socket.connected) {
        addToast(
          "Not connected",
          "Join a channel and wait for the green light before sending.",
          "error",
        );
        return;
      }
      // The relay drops chunks when nobody else is in the channel, so sending
      // alone would report success for a file nobody received.
      if (connectedUsersRef.current < 2) {
        addToast(
          "No one to send to",
          "Wait for another device to join this channel first.",
          "warning",
        );
        return;
      }
      if (uploader.hasActiveUploads) {
        addToast(
          "Already sending",
          "Wait for the current transfer to finish.",
          "warning",
        );
        return;
      }

      if (files.length === 1) {
        await uploader.submitFiles(files as SubmitFile[], channel);
        return;
      }

      try {
        addToast("Compressing", `Zipping ${files.length} files…`, "info");
        const zip = new (await import("jszip")).default();
        files.forEach((file) => zip.file(file.name, file));
        const blob = await zip.generateAsync({ type: "blob" });
        const archive = new File(
          [blob],
          `throwmyfile-${Date.now()}.zip`,
          { type: "application/zip" },
        ) as SubmitFile;
        archive.compressed = true;
        await uploader.submitFiles([archive], channel);
      } catch (error) {
        addToast(
          "Compression failed",
          error instanceof Error
            ? error.message
            : "Those files could not be zipped.",
          "error",
        );
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [addToast, uploader],
  );

  const addMessage = useCallback((message: TextMessage) => {
    setMessages((prev) => [message, ...prev].slice(0, MAX_MESSAGES));
  }, []);

  const sendText = useCallback(() => {
    const text = textDraft;
    const problem = textSendProblem(text);
    if (problem === "empty") return;
    if (problem === "too-long") {
      addToast(
        "Text too long",
        `Keep it under ${MAX_TEXT_CHARS.toLocaleString("en-US")} characters, or send it as a file.`,
        "error",
      );
      return;
    }
    if (!joinedChannelRef.current || !socket.connected) {
      addToast(
        "Not connected",
        "Join a channel and wait for the green light before sending.",
        "error",
      );
      return;
    }
    if (connectedUsersRef.current < 2) {
      addToast(
        "No one to send to",
        "Wait for another device to join this channel first.",
        "warning",
      );
      return;
    }

    const id = crypto.randomUUID();
    socket.emit("text", { id, text });
    addMessage({ id, text, at: Date.now(), direction: "send" });
    setTextDraft("");
  }, [textDraft, addToast, addMessage]);

  const handleTextKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      // Enter alone adds a newline; Ctrl/Cmd+Enter sends.
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        sendText();
      }
    },
    [sendText],
  );

  const dismissMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const cancelTransfer = useCallback(
    (transfer: Transfer) => {
      if (transfer.direction === "send") {
        uploader.cancelUpload(transfer.id);
        return;
      }
      discardBuffer(transfer.id);
      addToast("Cancelled", `Stopped receiving ${transfer.name}.`, "info");
    },
    [uploader, discardBuffer, addToast],
  );

  // ── Receiving ─────────────────────────────────────────────────────────────

  const saveFile = useCallback((file: ReadyFile) => {
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_TTL);
  }, []);

  const dismissReadyFile = useCallback((id: string) => {
    setReadyFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setViewingId((current) => (current === id ? null : current));
  }, []);

  /** An image whose bytes didn't decode loses its preview, keeping its row. */
  const dropPreview = useCallback((id: string) => {
    setReadyFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id || !f.previewUrl) return f;
        URL.revokeObjectURL(f.previewUrl);
        return { ...f, previewUrl: undefined };
      }),
    );
  }, []);

  // ── Socket wiring (registered once) ───────────────────────────────────────

  useEffect(() => {
    const onState = (state: ConnectionState) => {
      setConnectionState(state);
      if (state === "failed") {
        addToast(
          "Connection lost",
          "We stopped trying to reconnect. Use Retry when you're back online.",
          "error",
        );
      }
    };

    const onPeerJoined = () => {
      vibrate();
      setPeerJoinCount((n) => n + 1);
      addToast("Peer joined", "Someone else is on this channel.", "info");
    };

    const onConnections = (count: unknown) => {
      setConnectedUsers(typeof count === "number" ? count : 0);
    };

    const onIncoming = (data: { name?: string }) => {
      vibrate();
      addToast("Incoming", `Receiving ${data?.name ?? "a file"}…`, "info");
    };

    const onChunk = (data: {
      id: string;
      name: string;
      type: string;
      size: number;
      compressed: boolean;
      file: ArrayBuffer;
    }) => {
      if (!data.file || data.file.byteLength === 0) return;
      if (!(data.size > 0) || data.size > MAX_FILE_BYTES) {
        addToast(
          "Rejected",
          `${data.name || "A file"} declares an implausible size.`,
          "error",
        );
        return;
      }

      let buffer = buffersRef.current[data.id];
      if (!buffer) {
        buffer = buffersRef.current[data.id] = {
          chunks: [],
          bytes: 0,
          info: {
            name: data.name || "download",
            type: data.type || "application/octet-stream",
            size: data.size,
            compressed: Boolean(data.compressed),
          },
          timeoutId: setTimeout(() => {
            const stalled = buffersRef.current[data.id];
            if (!stalled) return;
            addToast(
              "Transfer timed out",
              `${stalled.info.name} stopped arriving. Nothing was saved.`,
              "error",
            );
            discardBuffer(data.id);
          }, TRANSFER_TIMEOUT),
        };
        upsertTransfer({
          id: data.id,
          name: buffer.info.name,
          size: data.size,
          bytes: 0,
          direction: "receive",
          compressed: buffer.info.compressed,
        });
      }

      if (
        wouldExceedExpectedSize(buffer.bytes, data.file.byteLength, buffer.info.size)
      ) {
        addToast(
          "Transfer failed",
          `${buffer.info.name} sent more data than it declared.`,
          "error",
        );
        discardBuffer(data.id);
        return;
      }

      buffer.chunks.push(new Blob([data.file]));
      buffer.bytes += data.file.byteLength;
      setTransferBytes(data.id, buffer.bytes);
    };

    const onFileDone = (data: { id: string; name?: string }) => {
      const buffer = buffersRef.current[data.id];
      if (!buffer) return;

      clearTimeout(buffer.timeoutId);
      delete buffersRef.current[data.id];
      dropTransfer(data.id);

      // The old code handed the browser whatever chunks had arrived, so a
      // single dropped frame produced a truncated file reported as a success.
      if (!isTransferComplete(buffer.bytes, buffer.info.size)) {
        addToast(
          "Transfer incomplete",
          `${buffer.info.name} arrived with ${formatFileSize(buffer.bytes)} of ${formatFileSize(buffer.info.size)}. Nothing was saved.`,
          "error",
        );
        return;
      }

      const blob = new Blob(buffer.chunks, { type: buffer.info.type });
      setReadyFiles((prev) => [
        {
          id: data.id,
          name: buffer.info.name,
          size: buffer.info.size,
          type: buffer.info.type,
          compressed: buffer.info.compressed,
          blob,
          previewUrl:
            !buffer.info.compressed &&
            isPreviewableImage(buffer.info.type, buffer.info.size)
              ? URL.createObjectURL(blob)
              : undefined,
        },
        ...prev,
      ]);
      addHistory({
        id: data.id,
        name: buffer.info.name,
        size: buffer.info.size,
        at: Date.now(),
        channel: joinedChannelRef.current ?? "",
        compressed: buffer.info.compressed,
        direction: "receive",
      });
      vibrate();
      addToast(
        "File ready",
        `${buffer.info.name} — press Save to download it.`,
        "success",
      );
    };

    const onFileAbort = (data: { id: string; name?: string }) => {
      if (!buffersRef.current[data.id]) return;
      const name = buffersRef.current[data.id].info.name;
      discardBuffer(data.id);
      addToast("Sender cancelled", `${name} was not sent.`, "warning");
    };

    const onText = (data: { id?: unknown; text: string }) => {
      if (!data.text) return;
      vibrate();
      addMessage({
        id: typeof data.id === "string" && data.id ? data.id : crypto.randomUUID(),
        text: data.text.slice(0, MAX_TEXT_CHARS),
        at: Date.now(),
        direction: "receive",
      });
      addToast("Text received", data.text.slice(0, 80), "success");
    };

    const onDisconnected = () => {
      const ids = Object.keys(buffersRef.current);
      if (ids.length === 0) return;
      ids.forEach((id) => discardBuffer(id));
      addToast(
        "Transfer interrupted",
        "The connection dropped mid-transfer, so the partial data was discarded.",
        "error",
      );
    };

    socket.on("state", onState);
    socket.on("peer-joined", onPeerJoined);
    socket.on("connections", onConnections);
    socket.on("file-incoming", onIncoming);
    socket.on("chunk", onChunk);
    socket.on("file-done", onFileDone);
    socket.on("file-abort", onFileAbort);
    socket.on("text", onText);
    socket.on("disconnected", onDisconnected);

    return () => {
      socket.off("state", onState);
      socket.off("peer-joined", onPeerJoined);
      socket.off("connections", onConnections);
      socket.off("file-incoming", onIncoming);
      socket.off("chunk", onChunk);
      socket.off("file-done", onFileDone);
      socket.off("file-abort", onFileAbort);
      socket.off("text", onText);
      socket.off("disconnected", onDisconnected);
    };
  }, [
    addToast,
    addHistory,
    addMessage,
    discardBuffer,
    dropTransfer,
    setTransferBytes,
    upsertTransfer,
  ]);

  // ── Uploader wiring ───────────────────────────────────────────────────────

  useEffect(() => {
    const onStart = ({ file }: { file: UploadFileInfo }) => {
      upsertTransfer({
        id: file.id,
        name: file.name,
        size: file.size,
        bytes: 0,
        direction: "send",
        compressed: file.compressed,
      });
    };

    const onProgress = ({ id, bytesSent }: { id: string; bytesSent: number }) =>
      setTransferBytes(id, bytesSent);

    const onComplete = ({ file }: { file: UploadFileInfo }) => {
      dropTransfer(file.id);
      addHistory({
        id: file.id,
        name: file.name,
        size: file.size,
        at: Date.now(),
        channel: joinedChannelRef.current ?? "",
        compressed: file.compressed,
        direction: "send",
      });
      addToast("Sent", `${file.name} was delivered.`, "success");
      if (fileRef.current) fileRef.current.value = "";
    };

    // Every failure mode surfaces now; previously only the size error did, so
    // an empty file or a read failure left the UI stuck mid-transfer forever.
    const onError = (event: UploadErrorEvent) => {
      if (event.id) dropTransfer(event.id);
      const cancelled = event.code === UploadError.Cancelled;
      addToast(
        cancelled ? "Cancelled" : "Send failed",
        event.message,
        cancelled ? "info" : "error",
      );
      if (fileRef.current) fileRef.current.value = "";
    };

    uploader.addEventListener("start", onStart);
    uploader.addEventListener("progress", onProgress);
    uploader.addEventListener("complete", onComplete);
    uploader.addEventListener("error", onError);

    return () => {
      uploader.removeEventListener("start", onStart);
      uploader.removeEventListener("progress", onProgress);
      uploader.removeEventListener("complete", onComplete);
      uploader.removeEventListener("error", onError);
    };
  }, [
    uploader,
    addToast,
    addHistory,
    dropTransfer,
    setTransferBytes,
    upsertTransfer,
  ]);

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Shared links are normalized, so `?channel=abc123` now works instead of
    // silently failing validation and never connecting.
    const raw = new URLSearchParams(window.location.search).get("channel");
    const fromUrl = normalizeChannelCode(raw);
    if (raw && !isValidChannelCode(fromUrl)) {
      addToast(
        "Link problem",
        "That link's channel code was incomplete, so we generated a fresh one.",
        "warning",
      );
    }
    joinChannel(isValidChannelCode(fromUrl) ? fromUrl : generateChannelCode());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      Object.values(buffersRef.current).forEach((b) => clearTimeout(b.timeoutId));
      buffersRef.current = {};
      uploader.dispose();
    },
    [uploader],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (!files || files.length === 0) return;
      // Only emptiness disqualifies a file. Requiring a non-empty MIME type used
      // to silently discard extensionless files the browser could not classify.
      const valid = Array.from(files).filter((file) => file.size > 0);
      if (valid.length === 0) {
        addToast("Nothing to send", "The clipboard held no files.", "warning");
        return;
      }
      void sendFiles(valid);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [sendFiles, addToast]);

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const dragHasFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const handleDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (!dragHasFiles(event)) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) void sendFiles(files);
    },
    [sendFiles],
  );

  // ── Clipboard / share ─────────────────────────────────────────────────────

  const fallbackCopy = useCallback(
    (text: string) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        addToast("Copied", "Copied to clipboard.", "success");
      } catch {
        addToast("Copy failed", "Copy the code manually instead.", "error");
      }
      textarea.remove();
    },
    [addToast],
  );

  const copyCode = useCallback(async () => {
    const value = joinedChannel ?? code;
    try {
      await navigator.clipboard.writeText(value);
      addToast("Copied", "Channel code copied.", "success");
      setCopied(true);
    } catch {
      fallbackCopy(value);
    }
  }, [joinedChannel, code, addToast, fallbackCopy]);

  // Swap the copy icon for a tick briefly after a successful copy.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copyMessage = useCallback(
    async (message: TextMessage) => {
      try {
        await navigator.clipboard.writeText(message.text);
        setCopiedMessageId(message.id);
      } catch {
        fallbackCopy(message.text);
      }
    },
    [fallbackCopy],
  );

  useEffect(() => {
    if (!copiedMessageId) return;
    const t = setTimeout(() => setCopiedMessageId(null), 1500);
    return () => clearTimeout(t);
  }, [copiedMessageId]);

  const shareLink = useCallback(async () => {
    const url = `${FRONTEND_URL}/?channel=${joinedChannel ?? code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ThrowMyFile",
          text: "Share files instantly",
          url,
        });
        return;
      } catch {
        // User dismissed the share sheet — nothing to report.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      addToast("Copied", "Share link copied.", "success");
    } catch {
      fallbackCopy(url);
    }
  }, [joinedChannel, code, addToast, fallbackCopy]);

  const openFilePicker = useCallback(() => fileRef.current?.click(), []);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) void sendFiles(Array.from(files));
    },
    [sendFiles],
  );

  const retryConnection = useCallback(() => {
    if (joinedChannel) socket.setChannel(joinedChannel);
  }, [joinedChannel]);

  const recentHistory = history.slice(0, 3);
  const hasPeer = connectedUsers > 1;
  const canSend = connectionState === "open" && hasPeer && !transferring;
  // Text rides its own control frame, so it can go out mid file transfer.
  const canSendText = connectionState === "open" && hasPeer;

  return (
    <S.HomeComponent>
      <S.SkipToContent href="#main-content">
        Skip to main content
      </S.SkipToContent>

      <ToastStack toasts={toasts} onRemove={removeToast} />

      <QrModal
        visible={showQr}
        onClose={() => setShowQr(false)}
        value={`${FRONTEND_URL}/?channel=${joinedChannel ?? code}`}
        joinSignal={peerJoinCount}
      />

      <Modal
        visible={Boolean(viewing)}
        onClose={() => setViewingId(null)}
        title={viewing ? trimFileName(viewing.name, 40) : ""}
        width={880}
        footer={
          viewing && (
            <S.ModalFooter>
              <Button variant="text" onClick={() => setViewingId(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => saveFile(viewing)}>
                <Download size={16} />
                Save
              </Button>
            </S.ModalFooter>
          )
        }
      >
        {viewing?.previewUrl && (
          <S.ImageViewer>
            <img src={viewing.previewUrl} alt={viewing.name} />
            <S.ImageViewerMeta>{formatFileSize(viewing.size)}</S.ImageViewerMeta>
          </S.ImageViewer>
        )}
      </Modal>

      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={history}
        onClearHistory={() => setHistory([])}
      />

      <S.MainContainer id="main-content" role="main" tabIndex={-1}>
        <S.Panel>
          <S.PanelBody>
            <S.Section>
            <S.SectionLabel>Your channel</S.SectionLabel>
            <S.ChannelBox>
              <S.ChannelCode aria-label={`Channel code ${joinedChannel ?? "none"}`}>
                {/* Keyed on the code so each new channel replays the
                    letter-by-letter flip-in. */}
                <S.ChannelChars key={joinedChannel ?? "none"} aria-hidden="true">
                  {(joinedChannel ?? "······").split("").map((ch, i) => (
                    <S.ChannelChar key={i} style={{ animationDelay: `${i * 45}ms` }}>
                      {ch}
                    </S.ChannelChar>
                  ))}
                </S.ChannelChars>
              </S.ChannelCode>
              <S.ActionButtons>
                <S.IconButton
                  onClick={copyCode}
                  title="Copy code"
                  aria-label="Copy channel code"
                  $success={copied}
                >
                  <S.SwapIcon key={copied ? "done" : "copy"}>
                    {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
                  </S.SwapIcon>
                </S.IconButton>
                <S.IconButton
                  onClick={shareLink}
                  title="Share link"
                  aria-label="Share channel link"
                >
                  <Share2 size={16} />
                </S.IconButton>
                <S.IconButton
                  onClick={() => setShowQr(true)}
                  title="Show QR code"
                  aria-label="Show QR code for this channel"
                >
                  <QrCode size={16} />
                </S.IconButton>
              </S.ActionButtons>
            </S.ChannelBox>
            </S.Section>
          <S.Section>
          <S.SectionLabel>Join another channel</S.SectionLabel>
          <S.JoinSection>
            <S.InputWrapper>
              <S.StyledInput
                onChange={handleCodeChange}
                onKeyDown={handleCodeKeyDown}
                placeholder="Code"
                value={code}
                maxLength={CHANNEL_CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                aria-label="Channel code to join"
              />
            </S.InputWrapper>
            <Tooltip title="Generate new">
              <S.RefreshButton
                onClick={handleGenerate}
                aria-label="Generate a new channel code"
              >
                <RefreshCw size={16} />
              </S.RefreshButton>
            </Tooltip>
            <Button
              variant="primary"
              onClick={() => joinChannel(code)}
              disabled={
                !isValidChannelCode(code) ||
                transferring ||
                code === joinedChannel
              }
            >
              <Zap size={16} />
              Join
            </Button>
          </S.JoinSection>
          </S.Section>
                <S.StatusRow>
                <S.StatusLine $state={connectionState} role="status" aria-live="polite">
                  <S.LiveDot $state={connectionState} aria-hidden="true" />
                  <span key={connectionState}>{CONNECTION_LABEL[connectionState]}</span>
                  {connectionState === "failed" && (
                    <S.BannerAction onClick={retryConnection}>Retry</S.BannerAction>
                  )}
                </S.StatusLine>
                <S.DeviceCount>
                  <Users size={14} />
                  <span>
                    <S.CountPop key={connectedUsers}>{connectedUsers}</S.CountPop>{" "}
                    {connectedUsers === 1 ? "device" : "devices"} on this channel
                  </span>
                </S.DeviceCount>
                </S.StatusRow>
          {/* File and text share one card behind MD3 tabs. Drag events sit on
              the card, so dragging a file in from the Text tab still lands. */}
          <S.SendCard
            onDragEnter={(event) => {
              handleDragEnter(event);
              if (Array.from(event.dataTransfer?.types ?? []).includes("Files"))
                setSendMode("file");
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <S.SendTabs role="tablist" aria-label="What to send">
              {(
                [
                  { key: "file", label: "File", icon: <Upload size={18} /> },
                  { key: "text", label: "Text", icon: <Type size={18} /> },
                ] as const
              ).map((tab, i, tabs) => (
                <S.SendTab
                  key={tab.key}
                  id={`send-tab-${tab.key}`}
                  role="tab"
                  type="button"
                  aria-selected={sendMode === tab.key}
                  aria-controls={`send-panel-${tab.key}`}
                  tabIndex={sendMode === tab.key ? 0 : -1}
                  $active={sendMode === tab.key}
                  onClick={() => setSendMode(tab.key)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                      return;
                    event.preventDefault();
                    const next =
                      tabs[(i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
                    setSendMode(next.key);
                    document.getElementById(`send-tab-${next.key}`)?.focus();
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </S.SendTab>
              ))}
            </S.SendTabs>

          <S.SendPanels>
          <S.FileSection
            id="send-panel-file"
            role="tabpanel"
            aria-labelledby="send-tab-file"
            $dragging={isDragging}
            $inactive={sendMode !== "file"}
            aria-hidden={sendMode !== "file" || undefined}
          >
            {transferring ? (
              <S.LoadingDotsWrapper
                aria-live="polite"
                aria-label="Transfer in progress"
              >
                <S.LoadingDot />
                <S.LoadingDot />
                <S.LoadingDot />
              </S.LoadingDotsWrapper>
            ) : (
              <S.SendButtonWrapper>
                <S.SendButton
                  onClick={openFilePicker}
                  disabled={!canSend}
                  aria-label="Choose files to send"
                >
                  <S.SendButtonIcon aria-hidden="true">
                    <Upload size={22} />
                  </S.SendButtonIcon>
                  <S.SendButtonText>
                    {isDragging ? "Drop to send" : "Send Files"}
                  </S.SendButtonText>
                </S.SendButton>
                <S.PasteHint>
                  {connectionState === "open" && !hasPeer ? (
                    "Waiting for another device to join this channel…"
                  ) : (
                    <>
                      drag &amp; drop, or <S.PasteText>paste</S.PasteText> from
                      the clipboard
                    </>
                  )}
                </S.PasteHint>
              </S.SendButtonWrapper>
            )}
          </S.FileSection>
            <S.TextComposer
              id="send-panel-text"
              role="tabpanel"
              aria-labelledby="send-tab-text"
              $inactive={sendMode !== "text"}
              aria-hidden={sendMode !== "text" || undefined}
            >
              <S.TextArea
                id="text-input"
                aria-label="Text to send"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder={
                  hasPeer
                    ? "Type or paste text, a link, a code snippet…"
                    : "Waiting for another device to join…"
                }
                spellCheck="false"
              />
              <S.TextComposerFooter>
                <S.TextHint $over={textDraft.length > MAX_TEXT_CHARS}>
                  {textDraft.length > MAX_TEXT_CHARS
                    ? `${textDraft.length.toLocaleString("en-US")} / ${MAX_TEXT_CHARS.toLocaleString("en-US")} characters`
                    : "Ctrl + Enter to send"}
                </S.TextHint>
                <Button
                  variant="primary"
                  onClick={sendText}
                  disabled={!canSendText || textSendProblem(textDraft) !== null}
                >
                  <Send size={15} />
                  Send text
                </Button>
              </S.TextComposerFooter>
            </S.TextComposer>
          </S.SendPanels>
          </S.SendCard>
          {messages.length > 0 && (
            <S.Section>
              <S.SectionLabel>Messages — {messages.length}</S.SectionLabel>
              <S.MessageList aria-label="Text messages" aria-live="polite">
                {messages.map((message) => {
                  const mine = message.direction === "send";
                  return (
                    <S.MessageItem key={message.id} $mine={mine}>
                      <S.MessageBody>
                        <S.MessageMeta>
                          {mine ? "You sent" : "Received"} ·{" "}
                          {formatTime(message.at)}
                        </S.MessageMeta>
                        <S.MessageText>{message.text}</S.MessageText>
                      </S.MessageBody>
                      <S.IconButton
                        onClick={() => void copyMessage(message)}
                        title="Copy text"
                        aria-label="Copy text"
                        $success={copiedMessageId === message.id}
                      >
                        <S.SwapIcon
                          key={copiedMessageId === message.id ? "done" : "copy"}
                        >
                          {copiedMessageId === message.id ? (
                            <Check size={16} strokeWidth={3} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </S.SwapIcon>
                      </S.IconButton>
                      <S.CancelButton
                        onClick={() => dismissMessage(message.id)}
                        title="Remove"
                        aria-label="Remove message"
                      >
                        <X size={14} />
                      </S.CancelButton>
                    </S.MessageItem>
                  );
                })}
              </S.MessageList>
            </S.Section>
          )}
          {transfers.length > 0 && (
            <S.Section>
            <S.SectionLabel>In progress — {transfers.length}</S.SectionLabel>
            <S.TransferList>
              {transfers.map((transfer) => {
                const receiving = transfer.direction === "receive";
                const percent =
                  transfer.size > 0
                    ? Math.min(
                        100,
                        (transfer.bytes / transfer.size) * 100,
                      )
                    : 0;
                return (
                  <S.TransferItem key={transfer.id}>
                    <S.TransferItemHeader>
                      <S.FileNameWrapper>
                        <S.FileIconWrapper $receiving={receiving}>
                          <FileIcon size={15} />
                        </S.FileIconWrapper>
                        <S.FileNameText title={transfer.name}>
                          {trimFileName(transfer.name, 28)}
                        </S.FileNameText>
                        {transfer.compressed && (
                          <S.ZipBadge>ZIP</S.ZipBadge>
                        )}
                      </S.FileNameWrapper>
                      <S.TransferStatus $receiving={receiving}>
                        <S.StatusDot $receiving={receiving} />
                        {receiving ? "Receiving" : "Sending"}
                      </S.TransferStatus>
                      <S.CancelButton
                        onClick={() => cancelTransfer(transfer)}
                        title="Cancel transfer"
                        aria-label={`Cancel ${transfer.name}`}
                      >
                        <X size={14} />
                      </S.CancelButton>
                    </S.TransferItemHeader>
                    <S.ProgressTrack
                      role="progressbar"
                      aria-valuenow={Math.round(percent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${transfer.name} progress`}
                    >
                      <S.ProgressFill style={{ width: `${percent}%` }} />
                    </S.ProgressTrack>
                    <S.ProgressInfo>
                      <S.ProgressPercent>
                        {percent.toFixed(1)}%
                      </S.ProgressPercent>
                      <S.ProgressSize>
                        {formatFileSize(transfer.bytes)} /{" "}
                        {formatFileSize(transfer.size)}
                      </S.ProgressSize>
                    </S.ProgressInfo>
                  </S.TransferItem>
                );
              })}
            </S.TransferList>
            </S.Section>
          )}

          {readyFiles.length > 0 && (
            <S.Section>
            <S.SectionLabel>Ready to save — {readyFiles.length}</S.SectionLabel>
            <S.ReadyList aria-label="Files ready to save">
              {readyFiles.map((file) => (
                <S.ReadyItem key={file.id}>
                  {file.previewUrl && (
                    <S.ReadyPreview
                      type="button"
                      onClick={() => setViewingId(file.id)}
                      aria-label={`View ${file.name} full size`}
                    >
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        onError={() => dropPreview(file.id)}
                      />
                    </S.ReadyPreview>
                  )}
                  <S.FileNameWrapper>
                    <S.FileIconWrapper $receiving>
                      <CheckCircle size={15} />
                    </S.FileIconWrapper>
                    <S.FileNameText title={file.name}>
                      {trimFileName(file.name, 24)}
                    </S.FileNameText>
                    {file.compressed && <S.ZipBadge>ZIP</S.ZipBadge>}
                  </S.FileNameWrapper>
                  <S.ReadyActions>
                    <S.ReadySize>{formatFileSize(file.size)}</S.ReadySize>
                    <Button
                      variant="success"
                      size="small"
                      onClick={() => saveFile(file)}
                    >
                      <Download size={14} />
                      Save
                    </Button>
                    <S.CancelButton
                      onClick={() => dismissReadyFile(file.id)}
                      title="Discard"
                      aria-label={`Discard ${file.name}`}
                    >
                      <X size={14} />
                    </S.CancelButton>
                  </S.ReadyActions>
                </S.ReadyItem>
              ))}
            </S.ReadyList>
            </S.Section>
          )}
                {recentHistory.length > 0 && (
                  <S.Section>
                    <S.SectionLabel>Recent activity</S.SectionLabel>
                    {recentHistory.map((file) => {
                      const type =
                        file.direction === "send" ? "sent" : "received";
                      return (
                        <S.InlineHistoryItem key={file.id}>
                          <S.InlineLeft>
                            <S.InlineStatusBadge $type={type}>
                              {file.direction === "send" ? (
                                <ArrowUp size={16} />
                              ) : (
                                <ArrowDown size={16} />
                              )}
                            </S.InlineStatusBadge>
                            <S.InlineFileName title={file.name}>
                              {trimFileName(file.name, 40)}
                            </S.InlineFileName>
                          </S.InlineLeft>
                          <S.InlineRight>
                            <S.InlineTime>{formatTime(file.at)}</S.InlineTime>
                            <S.InlineTypeBadge $type={type}>
                              {file.direction === "send" ? "SENT" : "RECV"}
                            </S.InlineTypeBadge>
                          </S.InlineRight>
                        </S.InlineHistoryItem>
                      );
                    })}
                  </S.Section>
                )}
                {history.length > 0 && (
                  <S.ViewAllButton onClick={() => setShowHistoryModal(true)}>
                    {history.length > 3
                      ? `View all (${history.length})`
                      : "View all history"}
                  </S.ViewAllButton>
                )}
        </S.PanelBody>
</S.Panel>

        <S.Footer>
          <S.FooterLinks>
            <span>© {new Date().getFullYear()} ThrowMyFile</span>
            <S.FooterLink href="/privacy-policy">Privacy</S.FooterLink>
            <S.FooterLink
              href="https://github.com/n3d06/throw-files"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Source on GitHub"
            >
              <Github size={14} />
            </S.FooterLink>
          </S.FooterLinks>
        </S.Footer>
      </S.MainContainer>

      <input
        type="file"
        ref={fileRef}
        id="file_input"
        multiple
        hidden
        onChange={handleFileInputChange}
        aria-label="Select files to send"
      />
    </S.HomeComponent>
  );
});
