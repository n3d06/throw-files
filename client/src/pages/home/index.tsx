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
import {
  canSaveToDisk,
  openReceiveSink,
  type ReceiveSink,
} from "../../utils/receive-sink";
import { listenAsReceiver, parseControl } from "../../utils/p2p";
import { ChunkHasher, canHash } from "../../utils/integrity";
import { RateMeter, formatTimeLeft } from "../../utils/rate";
import {
  P2PProbe,
  summarizeProbes,
  type ProbeStatus,
} from "../../utils/p2p-probe";
import {
  loadTransferMode,
  receiverWantsP2P,
  saveTransferMode,
  supportsP2P,
  type TransferMode,
} from "../../utils/transfer-mode";
import type { TransferPath } from "../../utils/throw-file-upload";
import * as S from "./styles";

const FRONTEND_URL: string =
  (window as { ENV?: { REACT_APP_FRONTEND_URL?: string } }).ENV
    ?.REACT_APP_FRONTEND_URL ||
  // Falls back to wherever the app is actually served from, so Share can never
  // hand somebody a localhost link in production.
  window.location.origin;

/** A receive fails after this long with no new chunk (reset on every chunk). */
const TRANSFER_TIMEOUT = 5 * 60 * 1000;
const TOAST_DURATION = 5000;
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
  /** Offered but not yet accepted by a receiver. */
  waiting?: boolean;
  /** How the bytes travel, once known. */
  path?: TransferPath;
  /** Smoothed bytes per second. */
  rate?: number;
}

/** A file another device wants to send, waiting for this user's answer. */
interface IncomingOffer {
  id: string;
  name: string;
  type: string;
  size: number;
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
  /** In memory, or (when savedToDisk) a disk-backed File read lazily. */
  blob: Blob;
  /** Object URL for an inline preview; set only for image files. */
  previewUrl?: string;
  /** Already written to the place the user picked on accept; no Save step. */
  savedToDisk?: boolean;
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

/** How often transfer progress is redrawn. */
const PROGRESS_FLUSH_MS = 150;

interface ReceiveBuffer {
  /** Where chunks go: the user's chosen file, or memory as a fallback. */
  sink: ReceiveSink;
  /** How bytes are arriving, once the first one does. */
  path?: TransferPath;
  /** Waiting for (or holding) the sender's DataChannel, when P2P is allowed. */
  p2p?: { close(): void; describe(): string };
  bytes: number;
  info: { name: string; type: string; size: number; compressed: boolean };
  timeoutId: ReturnType<typeof setTimeout>;
  /** Hashes chunks as they arrive, to check against the sender's hash. */
  hasher?: ChunkHasher;
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
const SnackbarHost = ({
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
          Transfer history
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
              Clear all
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
  /** Checks P2P with each device as soon as it joins the channel. */
  const probeRef = useRef<P2PProbe | null>(null);
  const [probeStatuses, setProbeStatuses] = useState<Map<string, ProbeStatus>>(
    () => new Map(),
  );
  if (!probeRef.current)
    probeRef.current = new P2PProbe(
      socket,
      () => receiverWantsP2P(transferModeRef.current) && supportsP2P(),
      setProbeStatuses,
    );
  const probe = probeRef.current;

  const uploaderRef = useRef<ThrowFileUpload | null>(null);
  // An offer counts as declined once every other device on the channel says no.
  if (!uploaderRef.current)
    uploaderRef.current = new ThrowFileUpload(
      socket,
      () => Math.max(1, connectedUsersRef.current - 1),
      () => transferModeRef.current,
      {
        status: (peerId) => probeRef.current?.status(peerId),
        openChannel: (peerId, id) =>
          probeRef.current?.openChannel(peerId, id) ?? Promise.resolve(null),
      },
    );
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
  /** Relay, P2P or Auto; applies to files this device sends and receives. */
  const [transferMode, setTransferModeState] =
    useState<TransferMode>(loadTransferMode);
  const transferModeRef = useRef(transferMode);
  transferModeRef.current = transferMode;
  const setTransferMode = useCallback((mode: TransferMode) => {
    saveTransferMode(mode);
    setTransferModeState(mode);
  }, []);
  /** Files other devices want to send, oldest first; the first is prompted. */
  const [offers, setOffers] = useState<IncomingOffer[]>([]);
  const offersRef = useRef<IncomingOffer[]>([]);
  offersRef.current = offers;
  /** The save picker is open for the current offer. */
  const [accepting, setAccepting] = useState(false);
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
      // MD3 shows one snackbar at a time: a newer message replaces the current.
      setToasts([{ id: crypto.randomUUID(), title, description, type }]);
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

  /** Speed of each running transfer, for the speed and time-left readout. */
  const rateMetersRef = useRef(new Map<string, RateMeter>());

  /**
   * Progress arrives once per chunk, which at full speed is over a thousand
   * times a second. Re-rendering that often starved the transfer itself, so
   * updates are collected here and drawn at most every PROGRESS_FLUSH_MS.
   */
  const pendingBytesRef = useRef(new Map<string, number>());
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTransferBytes = useCallback((id: string, bytes: number) => {
    let meter = rateMetersRef.current.get(id);
    if (!meter) {
      meter = new RateMeter();
      rateMetersRef.current.set(id, meter);
    }
    meter.update(bytes);
    pendingBytesRef.current.set(id, bytes);
    if (progressTimerRef.current) return;
    progressTimerRef.current = setTimeout(() => {
      progressTimerRef.current = null;
      const pending = pendingBytesRef.current;
      pendingBytesRef.current = new Map();
      setTransfers((prev) =>
        prev.map((t) => {
          const latest = pending.get(t.id);
          return latest === undefined
            ? t
            : { ...t, bytes: latest, rate: rateMetersRef.current.get(t.id)?.rate };
        }),
      );
    }, PROGRESS_FLUSH_MS);
  }, []);

  const setTransferPath = useCallback((id: string, path: TransferPath) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, path } : t)),
    );
  }, []);

  /**
   * The receive handlers live inside the socket effect; P2P DataChannels
   * reach them through this ref so both paths share one code path.
   */
  const receiveRef = useRef<{
    onChunk: (data: { id: string; file: ArrayBuffer }, path: TransferPath) => void;
    onFileDone: (data: { id: string; sha256?: string }) => void;
    onFileAbort: (data: { id: string }) => void;
    onP2PLost: (id: string) => void;
  } | null>(null);

  const dropTransfer = useCallback((id: string) => {
    rateMetersRef.current.delete(id);
    pendingBytesRef.current.delete(id);
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Feed a P2P DataChannel's messages into the shared receive path. Called
   * synchronously when the channel opens, so no early chunk is missed.
   */
  const attachReceiveChannel = useCallback(
    (id: string, channel: RTCDataChannel) => {
      let finished = false;
      channel.onmessage = ({ data }) => {
        const rx = receiveRef.current;
        if (!rx) return;
        if (data instanceof ArrayBuffer) {
          rx.onChunk({ id, file: data }, "p2p");
          return;
        }
        const control = typeof data === "string" ? parseControl(data) : null;
        if (control?.t === "done") {
          finished = true;
          rx.onFileDone({ id, sha256: control.sha256 });
        } else if (control?.t === "abort") {
          finished = true;
          rx.onFileAbort({ id });
        }
      };
      channel.onclose = () => {
        if (!finished) receiveRef.current?.onP2PLost(id);
      };
    },
    [],
  );

  // Files sent over the connection opened when the other device joined.
  useEffect(() => {
    probe.onIncomingChannel = (id, channel) => {
      if (buffersRef.current[id]) attachReceiveChannel(id, channel);
      else channel.close(); // not a transfer this device accepted
    };
  }, [probe, attachReceiveChannel]);

  /** Tear down a partial receive: timer, buffer and progress row together. */
  const discardBuffer = useCallback(
    (id: string) => {
      const buffer = buffersRef.current[id];
      if (buffer) {
        clearTimeout(buffer.timeoutId);
        buffer.sink.abort();
        buffer.p2p?.close();
      }
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

  /** (Re)start the no-progress timer for a receive. */
  const armTimeout = useCallback(
    (id: string) => {
      const buffer = buffersRef.current[id];
      if (!buffer) return;
      clearTimeout(buffer.timeoutId);
      buffer.timeoutId = setTimeout(() => {
        if (buffersRef.current[id] !== buffer) return;
        addToast(
          "Transfer timed out",
          `${buffer.info.name} stopped arriving. Nothing was saved.`,
          "error",
        );
        discardBuffer(id);
      }, TRANSFER_TIMEOUT);
    },
    [addToast, discardBuffer],
  );

  /**
   * Accept an offer. Where the browser allows it the save picker opens first,
   * so the file streams straight to disk; otherwise it collects in memory.
   * Closing the picker leaves the prompt open.
   */
  const acceptOffer = useCallback(
    async (offer: IncomingOffer) => {
      setAccepting(true);
      let sink: ReceiveSink | null;
      try {
        sink = await openReceiveSink(offer.name);
      } catch (error) {
        addToast(
          "Can't save there",
          error instanceof Error ? error.message : "Pick another location.",
          "error",
        );
        return;
      } finally {
        setAccepting(false);
      }
      if (!sink) return;

      // The sender may have cancelled while the picker was open.
      if (!offersRef.current.some((o) => o.id === offer.id)) {
        sink.abort();
        addToast("No longer offered", `${offer.name} was withdrawn.`, "info");
        return;
      }

      buffersRef.current[offer.id] = {
        sink,
        bytes: 0,
        info: {
          name: offer.name,
          type: offer.type,
          size: offer.size,
          compressed: offer.compressed,
        },
        timeoutId: undefined as unknown as ReturnType<typeof setTimeout>,
        hasher: canHash() ? new ChunkHasher() : undefined,
      };
      armTimeout(offer.id);
      upsertTransfer({
        id: offer.id,
        name: offer.name,
        size: offer.size,
        bytes: 0,
        direction: "receive",
        compressed: offer.compressed,
      });
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));

      // Offer P2P unless this device is set to relay only. If the sender
      // opens a DataChannel, the file arrives over it; if it falls back to
      // the relay instead, this listener just closes with the transfer.
      const p2p = receiverWantsP2P(transferModeRef.current) && supportsP2P();
      if (p2p) {
        const id = offer.id;
        // Fallback for when the sender has no open connection to this device
        // (it reuses the one from the join-time check whenever it can).
        buffersRef.current[id].p2p = listenAsReceiver(socket, id, (channel, route) => {
          void route.then((r) => r && console.info(`[p2p] receiving ${offer.name}: ${r}`));
          attachReceiveChannel(id, channel);
        });
      }
      socket.emit("file-accept", { id: offer.id, p2p, from: probe.selfId });
    },
    [addToast, armTimeout, upsertTransfer, probe, attachReceiveChannel],
  );

  const declineOffer = useCallback((offer: IncomingOffer) => {
    socket.emit("file-decline", { id: offer.id });
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
  }, []);

  useEffect(() => {
    probe.start();
    return () => probe.stop();
  }, [probe]);

  // Leaving Relay mode checks P2P again; entering it drops the results.
  const probedModeRef = useRef(transferMode);
  useEffect(() => {
    const wasRelay = probedModeRef.current === "relay";
    probedModeRef.current = transferMode;
    if (transferMode === "relay") probe.reset();
    else if (wasRelay) probe.restart();
  }, [probe, transferMode]);

  const probeSummary =
    transferMode === "relay" || connectedUsers < 2
      ? null
      : summarizeProbes([...probeStatuses.values()]);
  const probeDetail = [...probeStatuses.values()]
    .flatMap((s) => (s.state === "failed" ? [s.detail] : []))
    .join("\n");

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

    const onOffer = (data: IncomingOffer) => {
      // An implausible size never reaches the user: decline it outright.
      if (!(data.size > 0) || data.size > MAX_FILE_BYTES) {
        socket.emit("file-decline", { id: data.id });
        return;
      }
      vibrate();
      setOffers((prev) =>
        prev.some((o) => o.id === data.id)
          ? prev
          : [
              ...prev,
              {
                ...data,
                name: data.name || "download",
                type: data.type || "application/octet-stream",
              },
            ],
      );
    };

    // Chunks only land for transfers this user accepted. Anything else (an
    // offer declined here, or accepted on another device) is dropped unread.
    const onChunk = (
      data: { id: string; file: ArrayBuffer },
      path: TransferPath = "relay",
    ) => {
      const buffer = buffersRef.current[data.id];
      if (!buffer || !data.file || data.file.byteLength === 0) return;

      // The first chunk fixes the path; bytes from the other one are ignored.
      if (!buffer.path) {
        buffer.path = path;
        setTransferPath(data.id, path);
        // The sender chose the relay: stop waiting for a DataChannel.
        if (path === "relay") {
          buffer.p2p?.close();
          buffer.p2p = undefined;
        }
      } else if (buffer.path !== path) {
        return;
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

      buffer.hasher?.add(data.file);
      buffer.sink.write(data.file);
      buffer.bytes += data.file.byteLength;
      armTimeout(data.id);
      setTransferBytes(data.id, buffer.bytes);
    };

    const onFileDone = async (data: { id: string; name?: string; sha256?: string }) => {
      const buffer = buffersRef.current[data.id];
      if (!buffer) return;

      clearTimeout(buffer.timeoutId);
      delete buffersRef.current[data.id];
      dropTransfer(data.id);
      buffer.p2p?.close();

      // Never keep a file that is missing bytes: a dropped frame would
      // otherwise produce a truncated file reported as a success.
      if (!isTransferComplete(buffer.bytes, buffer.info.size)) {
        buffer.sink.abort();
        addToast(
          "Transfer incomplete",
          `${buffer.info.name} arrived with ${formatFileSize(buffer.bytes)} of ${formatFileSize(buffer.info.size)}. Nothing was saved.`,
          "error",
        );
        return;
      }

      // Same size is not proof of same bytes: compare with the sender's hash.
      let verified = false;
      if (data.sha256 && buffer.hasher) {
        let ours: string | null = null;
        try {
          ours = await buffer.hasher.hex();
        } catch {
          /* hashing unavailable: saved, but not reported as verified */
        }
        if (ours !== null && ours !== data.sha256) {
          buffer.sink.abort();
          console.info(`[integrity] ${buffer.info.name}: expected ${data.sha256}, got ${ours}`);
          addToast(
            "File corrupted",
            `${buffer.info.name} didn't match what was sent (SHA-256), so it was discarded. Send it again.`,
            "error",
          );
          return;
        }
        verified = ours === data.sha256;
      }

      let blob: Blob;
      try {
        blob = await buffer.sink.close(buffer.info.type);
      } catch (error) {
        addToast(
          "Couldn't save",
          error instanceof Error ? error.message : `${buffer.info.name} could not be written.`,
          "error",
        );
        return;
      }

      const onDisk = buffer.sink.onDisk;
      setReadyFiles((prev) => [
        {
          id: data.id,
          name: buffer.info.name,
          size: buffer.info.size,
          type: buffer.info.type,
          compressed: buffer.info.compressed,
          blob,
          savedToDisk: onDisk,
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
      const check = verified ? " Integrity verified (SHA-256)." : "";
      addToast(
        onDisk ? "File saved" : "File ready",
        onDisk
          ? `${buffer.info.name} is saved where you chose.${check}`
          : `${buffer.info.name} — press Save to download it.${check}`,
        "success",
      );
    };

    const onFileAbort = (data: {
      id: string;
      name?: string;
      reason?: "p2p-failed";
    }) => {
      const offer = offersRef.current.find((o) => o.id === data.id);
      if (offer) {
        setOffers((prev) => prev.filter((o) => o.id !== data.id));
        addToast("Offer withdrawn", `${offer.name} is no longer being sent.`, "info");
        return;
      }
      const buffer = buffersRef.current[data.id];
      if (!buffer) return;
      const { name } = buffer.info;
      if (data.reason === "p2p-failed") {
        // This side's view of the attempt complements the sender's.
        const detail = buffer.p2p?.describe() ?? "";
        console.info(`[p2p] receive of ${name} failed. ${detail}`);
        discardBuffer(data.id);
        addToast(
          "Couldn't connect directly (P2P)",
          `${name} was not sent. ${detail}`,
          "warning",
        );
        return;
      }
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
      // Offers die with the connection; the sender sees it drop too.
      setOffers([]);
      // A P2P transfer that is already flowing does not need the relay.
      const ids = Object.keys(buffersRef.current).filter(
        (id) => buffersRef.current[id].path !== "p2p",
      );
      if (ids.length === 0) return;
      ids.forEach((id) => discardBuffer(id));
      addToast(
        "Transfer interrupted",
        "The connection dropped mid-transfer, so the partial data was discarded.",
        "error",
      );
    };

    // Relay "file-done" only finishes relay transfers; P2P ones finish on
    // the DataChannel's own "done".
    const onRelayFileDone = (data: { id: string; sha256?: string }) => {
      if (buffersRef.current[data.id]?.path === "p2p") return;
      void onFileDone(data);
    };
    const onRelayChunk = (data: { id: string; file: ArrayBuffer }) =>
      onChunk(data, "relay");

    const onP2PLost = (id: string) => {
      const buffer = buffersRef.current[id];
      if (!buffer || buffer.path !== "p2p") return;
      discardBuffer(id);
      addToast(
        "Transfer interrupted",
        `The direct connection dropped while receiving ${buffer.info.name}. Nothing was saved.`,
        "error",
      );
    };

    receiveRef.current = {
      onChunk,
      onFileDone: (data) => void onFileDone(data),
      onFileAbort,
      onP2PLost,
    };

    socket.on("state", onState);
    socket.on("peer-joined", onPeerJoined);
    socket.on("connections", onConnections);
    socket.on("file-offer", onOffer);
    socket.on("chunk", onRelayChunk);
    socket.on("file-done", onRelayFileDone);
    socket.on("file-abort", onFileAbort);
    socket.on("text", onText);
    socket.on("disconnected", onDisconnected);

    return () => {
      socket.off("state", onState);
      socket.off("peer-joined", onPeerJoined);
      socket.off("connections", onConnections);
      socket.off("file-offer", onOffer);
      socket.off("chunk", onRelayChunk);
      socket.off("file-done", onRelayFileDone);
      socket.off("file-abort", onFileAbort);
      socket.off("text", onText);
      socket.off("disconnected", onDisconnected);
      receiveRef.current = null;
    };
  }, [
    addToast,
    addHistory,
    addMessage,
    armTimeout,
    discardBuffer,
    dropTransfer,
    setTransferBytes,
    setTransferPath,
  ]);

  // ── Uploader wiring ───────────────────────────────────────────────────────

  useEffect(() => {
    const row = (file: UploadFileInfo, waiting: boolean): Transfer => ({
      id: file.id,
      name: file.name,
      size: file.size,
      bytes: 0,
      direction: "send",
      compressed: file.compressed,
      waiting,
    });
    const onOffer = ({ file }: { file: UploadFileInfo }) =>
      upsertTransfer(row(file, true));
    const onStart = ({ file, path }: { file: UploadFileInfo; path: TransferPath }) =>
      upsertTransfer({ ...row(file, false), path });

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
      const [title, kind]: [string, ToastVariant] =
        event.code === UploadError.Cancelled
          ? ["Cancelled", "info"]
          : event.code === UploadError.Declined
            ? ["Declined", "warning"]
            : event.code === UploadError.NoAnswer
              ? ["No answer", "warning"]
              : event.code === UploadError.P2PFailed ||
                  event.code === UploadError.P2PRefused
                ? ["P2P unavailable", "warning"]
                : ["Send failed", "error"];
      addToast(title, event.message, kind);
      if (fileRef.current) fileRef.current.value = "";
    };

    uploader.addEventListener("offer", onOffer);
    uploader.addEventListener("start", onStart);
    uploader.addEventListener("progress", onProgress);
    uploader.addEventListener("complete", onComplete);
    uploader.addEventListener("error", onError);

    return () => {
      uploader.removeEventListener("offer", onOffer);
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
      Object.values(buffersRef.current).forEach((b) => {
        clearTimeout(b.timeoutId);
        b.sink.abort();
      });
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

  const hasPeer = connectedUsers > 1;
  const canSend = connectionState === "open" && hasPeer && !transferring;
  // Text rides its own control frame, so it can go out mid file transfer.
  const canSendText = connectionState === "open" && hasPeer;

  return (
    <S.HomeComponent>
      <S.SkipToContent href="#main-content">
        Skip to main content
      </S.SkipToContent>

      <SnackbarHost toast={toasts[toasts.length - 1]} onRemove={removeToast} />

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

      {/* Consent prompt for the oldest pending offer. Closing it declines. */}
      <Modal
        visible={offers.length > 0}
        onClose={() => offers[0] && !accepting && declineOffer(offers[0])}
        title="Receive this file?"
        width={440}
        footer={
          offers[0] && (
            <S.ModalFooter>
              <Button
                variant="text"
                onClick={() => declineOffer(offers[0])}
                disabled={accepting}
              >
                Decline
              </Button>
              <Button
                variant="primary"
                onClick={() => void acceptOffer(offers[0])}
                loading={accepting}
              >
                {canSaveToDisk() ? "Accept and choose where" : "Accept"}
              </Button>
            </S.ModalFooter>
          )
        }
      >
        {offers[0] && (
          <S.OfferBody>
            <S.OfferFile>
              <S.FileIconWrapper $receiving>
                <FileIcon size={20} />
              </S.FileIconWrapper>
              <S.FileNameText title={offers[0].name}>
                {trimFileName(offers[0].name, 32)}
              </S.FileNameText>
              {offers[0].compressed && <S.ZipBadge>ZIP</S.ZipBadge>}
              <S.ReadySize>{formatFileSize(offers[0].size)}</S.ReadySize>
            </S.OfferFile>
            <p>
              Another device on #{joinedChannel} wants to send you this file.{" "}
              {canSaveToDisk()
                ? "It will be written straight to the place you choose."
                : "It will stay in this tab until you press Save."}
            </p>
            {offers.length > 1 && (
              <S.OfferQueue>
                {offers.length - 1} more waiting after this one
              </S.OfferQueue>
            )}
          </S.OfferBody>
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
                {/* Keyed on the code so a new channel fades in once. */}
                <S.ChannelChars key={joinedChannel ?? "none"} aria-hidden="true">
                  {joinedChannel ?? "······"}
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
          <S.JoinSection>
            <S.InputWrapper>
              <S.OutlinedField $bg="var(--md-surface)">
                <S.StyledInput
                  id="channel-code-input"
                  onChange={handleCodeChange}
                  onKeyDown={handleCodeKeyDown}
                  placeholder={`${CHANNEL_CODE_LENGTH} letters or digits`}
                  value={code}
                  maxLength={CHANNEL_CODE_LENGTH}
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <label htmlFor="channel-code-input">Channel code</label>
              </S.OutlinedField>
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
                {probeSummary && (
                  <S.ProbeLine
                    $tone={probeSummary.tone}
                    role="status"
                    aria-live="polite"
                    title={probeDetail || undefined}
                  >
                    <Zap size={14} aria-hidden="true" />
                    <span>{probeSummary.text}</span>
                  </S.ProbeLine>
                )}
                </S.StatusRow>
          <S.ModeRow>
            <S.SegmentedButton role="radiogroup" aria-label="Transfer mode">
              {(
                [
                  { key: "auto", label: "Auto" },
                  { key: "p2p", label: "P2P" },
                  { key: "relay", label: "Relay" },
                ] as const
              ).map((option) => {
                const selected = transferMode === option.key;
                return (
                  <S.Segment
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    $selected={selected}
                    disabled={option.key !== "relay" && !supportsP2P()}
                    onClick={() => setTransferMode(option.key)}
                  >
                    {selected && <Check size={18} aria-hidden="true" />}
                    {option.label}
                  </S.Segment>
                );
              })}
            </S.SegmentedButton>
            <S.ModeHint>
              {transferMode === "auto"
                ? "Direct between devices when possible, otherwise through the server."
                : transferMode === "p2p"
                  ? "Direct between devices only. Fails if they can't reach each other."
                  : "Always through the server."}
            </S.ModeHint>
          </S.ModeRow>
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
                  { key: "file", label: "File" },
                  { key: "text", label: "Text" },
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
              <S.CircularProgress
                role="progressbar"
                aria-label="Transfer in progress"
              />
            ) : (
              <S.SendButtonWrapper>
                <S.SendButton
                  variant="primary"
                  size="large"
                  onClick={openFilePicker}
                  disabled={!canSend}
                  aria-label="Choose files to send"
                >
                  <Upload size={20} aria-hidden="true" />
                  {isDragging ? "Drop to send" : "Send files"}
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
              <S.OutlinedField $bg="var(--md-surface-container-low)" $grow>
                <S.TextArea
                  id="text-input"
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onKeyDown={handleTextKeyDown}
                  placeholder={
                    hasPeer
                      ? "Text, a link, a code snippet…"
                      : "Waiting for another device to join…"
                  }
                  spellCheck="false"
                />
                <label htmlFor="text-input">Message</label>
              </S.OutlinedField>
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
                        {transfer.path && (
                          <S.PathBadge
                            $p2p={transfer.path === "p2p"}
                            title={
                              transfer.path === "p2p"
                                ? "Direct between devices, end-to-end encrypted"
                                : "Through the relay server"
                            }
                          >
                            {transfer.path === "p2p" ? "P2P" : "Relay"}
                          </S.PathBadge>
                        )}
                      </S.FileNameWrapper>
                      <S.TransferStatus $receiving={receiving}>
                        <S.StatusDot $receiving={receiving} />
                        {transfer.waiting
                          ? "Waiting for accept"
                          : receiving
                            ? "Receiving"
                            : "Sending"}
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
                        {transfer.rate && transfer.bytes < transfer.size ? (
                          <S.ProgressSize>
                            {" · "}
                            {formatFileSize(transfer.rate)}/s
                            {(() => {
                              const left = formatTimeLeft(
                                transfer.size - transfer.bytes,
                                transfer.rate,
                              );
                              return left ? ` · ${left}` : "";
                            })()}
                          </S.ProgressSize>
                        ) : null}
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
            <S.SectionLabel>Received — {readyFiles.length}</S.SectionLabel>
            <S.ReadyList aria-label="Received files">
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
                    {file.savedToDisk ? (
                      <S.SavedLabel>
                        <Check size={16} aria-hidden="true" />
                        Saved
                      </S.SavedLabel>
                    ) : (
                      <Button
                        variant="success"
                        size="small"
                        onClick={() => saveFile(file)}
                      >
                        <Download size={14} />
                        Save
                      </Button>
                    )}
                    <S.CancelButton
                      onClick={() => dismissReadyFile(file.id)}
                      title={file.savedToDisk ? "Remove from list" : "Discard"}
                      aria-label={`${file.savedToDisk ? "Remove" : "Discard"} ${file.name}`}
                    >
                      <X size={14} />
                    </S.CancelButton>
                  </S.ReadyActions>
                </S.ReadyItem>
              ))}
            </S.ReadyList>
            </S.Section>
          )}
                {history.length > 0 && (
                  <S.ViewAllButton onClick={() => setShowHistoryModal(true)}>
                    <History size={18} aria-hidden="true" />
                    View all history ({history.length})
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
