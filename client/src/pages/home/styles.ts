// Styled-components and keyframes for the Home page.
// Split out of index.tsx, which had grown past 2,400 lines with logic and
// presentation interleaved.
// Motion is decorative only: the global prefers-reduced-motion rule in
// App.less collapses every animation and transition here to ~0ms.
import styled, { css, keyframes } from "styled-components";
import { Input } from "../../components";

/** Springy ease-out with a little overshoot, used for pops and slides. */
const spring = "cubic-bezier(0.34, 1.56, 0.64, 1)";
/** Smooth ease-out without overshoot. */
const easeOut = "cubic-bezier(0.2, 0.8, 0.2, 1)";

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.4); }
  60% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
`;

const flipIn = keyframes`
  0% { opacity: 0; transform: translateY(-60%) rotateX(90deg); }
  60% { opacity: 1; transform: translateY(8%) rotateX(-12deg); }
  100% { opacity: 1; transform: translateY(0) rotateX(0); }
`;

const slideIn = keyframes`
  0% { opacity: 0; transform: translateX(-24px) scale(0.97); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
`;

const beat = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.35); }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

const hop = keyframes`
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-7px); }
  55% { transform: translateY(0); }
  75% { transform: translateY(-3px); }
`;

const shrink = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

export const HomeComponent = styled.div`
  min-height: 100vh;
  min-height: 100dvh; /* avoids the mobile URL-bar gap */
  position: relative;
  z-index: 2;
`;

export const MainContainer = styled.div`
  max-width: 660px;
  margin: 0 auto;
  padding: 80px 16px 24px;

  &:focus:not(:focus-visible) {
    outline: none;
  }
`;

export const Panel = styled.section`
  animation: ${fadeUp} 0.5s ${easeOut} both;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-secondary);
  box-shadow: var(--shadow-xl);
  border-radius: var(--radius-lg);
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  padding: 16px;

  /* Each block rises in a beat after the one above it. */
  > * {
    animation: ${fadeUp} 0.5s ${easeOut} both;
  }
  ${[1, 2, 3, 4, 5, 6, 7, 8]
    .map((n) => `> *:nth-child(${n}) { animation-delay: ${0.08 + n * 0.06}s; }`)
    .join("\n")}

  @media (min-width: 600px) {
    padding: 20px;
  }
`;

/** Small uppercase heading above a group, like a settings-page section title. */
export const SectionLabel = styled.h2`
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  padding: 10px 12px;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
`;

export const StatusLine = styled.div<{ $state: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.3s;
  color: ${(p) =>
    p.$state === "open"
      ? "var(--success)"
      : p.$state === "failed"
        ? "var(--accent-coral)"
        : "var(--warning)"};

  span {
    flex: 1;
    animation: ${fadeUp} 0.3s ${easeOut} both;
  }
`;

/** Presence dot: a radar ring while live, a slow blink while reconnecting. */
export const LiveDot = styled.i<{ $state: string }>`
  position: relative;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;

  ${(p) =>
    p.$state === "open"
      ? css`
          animation: ${beat} 1.6s ease-in-out infinite;
        `
      : p.$state === "failed"
        ? css``
        : css`
            animation: ${blink} 1.1s ease-in-out infinite;
          `}
`;

export const DeviceCount = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-tertiary);

  svg {
    color: var(--text-tertiary);
  }
`;

export const CountPop = styled.b`
  display: inline-block;
  color: var(--title-fg);
  animation: ${popIn} 0.4s ${spring} both;
`;

export const ChannelBox = styled.div<{ $focused?: boolean }>`
  background: var(--bg-tertiary);
  outline: ${(p) => (p.$focused ? "1px solid var(--accent)" : "none")};
  outline-offset: -1px;
  border-radius: var(--radius-lg);
  padding: 8px 8px 8px 14px;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 14px;
  }
`;

export const ChannelCode = styled.span`
  font-family: var(--font-code);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--title-fg);
  flex: 1;
  min-width: 0;
  word-break: break-word;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "#";
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--text-muted);
  }

  @media (max-width: 360px) {
    font-size: 20px;
    letter-spacing: 1px;
  }
`;

export const ChannelChars = styled.span`
  display: inline-flex;
  perspective: 400px;
`;

export const ChannelChar = styled.span`
  display: inline-block;
  transform-origin: 50% 0;
  animation: ${flipIn} 0.5s ${easeOut} both;
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;

  @media (max-width: 480px) {
    justify-content: flex-end;
  }
`;

export const SwapIcon = styled.span`
  display: flex;
  animation: ${popIn} 0.35s ${spring} both;
`;

export const IconButton = styled.button<{ $success?: boolean }>`
  transition: background 0.15s, color 0.15s, transform 0.2s ${spring};
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: ${(p) => (p.$success ? "var(--success)" : "var(--text-secondary)")};
  min-width: 36px;
  height: 36px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    transition: transform 0.25s ${spring};
  }

  &:hover {
    background: var(--bg-modifier-hover);
    color: ${(p) => (p.$success ? "var(--success)" : "var(--title-fg)")};
  }

  &:hover svg {
    transform: scale(1.18) rotate(-8deg);
  }

  &:active {
    background: var(--bg-modifier-active);
    transform: scale(0.88);
  }
`;

export const IconButtonSecondary = styled(IconButton)`
  height: 38px;
  min-width: 38px;
  background: var(--w-face);
  color: #fff;

  &:hover {
    background: var(--hover-bg);
    color: #fff;
  }

  &:active {
    background: var(--press-bg);
  }
`;

/** The regenerate button: the arrows turn half a lap on hover, a full lap on press. */
export const RefreshButton = styled(IconButtonSecondary)`
  svg {
    transition: transform 0.5s ${spring};
  }

  &:hover svg {
    transform: rotate(180deg);
  }

  &:active svg {
    transform: rotate(360deg);
    transition-duration: 0.25s;
  }
`;

export const InputWrapper = styled.div`
  flex: 1;
`;

export const JoinSection = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch;
  margin-bottom: 0;

  @media (max-width: 600px) {
    flex-wrap: wrap;

    ${InputWrapper} {
      width: 100%;
      flex: none;
    }

    > button,
    > div {
      flex: 1;
      min-width: 0;
    }
  }
`;

export const StyledInput = styled(Input)`
  height: 38px;
  font-family: var(--font-code);
  font-size: 16px;
  letter-spacing: 2px;
  border-radius: var(--radius-md);
  text-transform: uppercase;
  font-weight: 600;
  transition: box-shadow 0.2s, background 0.2s;

  &:focus {
    background: var(--input-focus-bg);
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  &::placeholder {
    font-family: var(--font-display);
    letter-spacing: 0;
    text-transform: none;
    font-weight: 400;
  }
`;

export const TransferList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const TransferItem = styled.div`
  animation: ${slideIn} 0.45s ${spring} both;
  background: var(--bg-primary);
  border: 1px solid var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  transition: border-color 0.2s, transform 0.2s;

  &:hover {
    border-color: var(--border-subtle);
  }
`;

export const TransferItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
`;

export const FileNameWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
`;

export const FileIconWrapper = styled.div<{ $receiving?: boolean }>`
  color: ${(p) =>
    p.$receiving ? "var(--accent-secondary)" : "var(--accent-emerald)"};
  flex-shrink: 0;
  display: flex;
  animation: ${popIn} 0.45s ${spring} 0.1s both;
`;

export const FileNameText = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: var(--text-link);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ZipBadge = styled.span`
  font-size: 10px;
  line-height: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  padding: 0 5px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  flex-shrink: 0;
  animation: ${popIn} 0.4s ${spring} 0.2s both;
`;

export const TransferStatus = styled.span<{ $receiving?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
`;

export const StatusDot = styled.span<{ $receiving?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) =>
    p.$receiving ? "var(--accent-secondary)" : "var(--accent-emerald)"};
  animation: ${blink} 1s ease-in-out infinite;
`;

export const ProgressTrack = styled.div`
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 8px;
  position: relative;
`;

export const ProgressFill = styled.div`
  transition: width 0.2s linear;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-sm);
  /* Progress arrives once per chunk — many times a second. A 0.3s ease made the
     bar visibly lag behind the real byte count. */
  position: relative;
  overflow: hidden;

`;

export const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
`;

export const ProgressPercent = styled.span`
  color: var(--title-fg);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

export const ProgressSize = styled.span`
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
`;

export const SendButtonIcon = styled.div`
  display: flex;
  animation: ${float} 2.4s ease-in-out infinite;
`;

export const FileSection = styled.div<{ $dragging?: boolean }>`
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.3s ${spring};
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
  min-height: 170px;
  padding: 24px 12px;
  background: var(--bg-primary);
  border: 2px dashed var(--border-medium);
  border-radius: var(--radius-lg);

  &:hover {
    border-color: var(--border-strong);
  }

  ${(p) =>
    p.$dragging &&
    css`
      background: rgba(192, 57, 43, 0.12);
      border-color: var(--accent);
      transform: scale(1.02);

      ${SendButtonIcon} {
        animation: ${hop} 0.9s ease-in-out infinite;
      }
    `}
`;

export const BannerAction = styled.button`
  transition: background 0.15s, transform 0.2s ${spring};
  border-radius: var(--radius-sm);
  background: var(--w-face);
  border: none;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;

  &:hover {
    background: var(--hover-bg);
  }

  &:active {
    background: var(--press-bg);
    transform: scale(0.92);
  }
`;

export const CancelButton = styled.button`
  transition: background 0.15s, color 0.15s, transform 0.25s ${spring};
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--text-tertiary);

  &:hover {
    background: var(--bg-modifier-hover);
    color: var(--accent-coral);
    transform: rotate(90deg);
  }

  &:active {
    background: var(--bg-modifier-active);
    transform: rotate(90deg) scale(0.85);
  }
`;

export const ReadyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ReadyItem = styled.div`
  animation: ${slideIn} 0.45s ${spring} both;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 10px 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--bg-elevated);
  border-radius: var(--radius-lg);

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
`;

export const ReadyActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

export const ReadySize = styled.span`
  font-size: 12px;
  color: var(--text-muted);
`;

export const LoadingDotsWrapper = styled.div`
  display: flex;
  gap: 8px;
`;

export const LoadingDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  animation: ${bounce} 1.4s ease-in-out infinite both;

  &:nth-of-type(1) {
    animation-delay: -0.32s;
  }
  &:nth-of-type(2) {
    animation-delay: -0.16s;
  }
`;

export const SendButtonWrapper = styled.div`
  text-align: center;
`;

export const SendButton = styled.button`
  transition:
    background 0.17s,
    transform 0.25s ${spring};
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  height: 44px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-2px);
  }

  &:hover:not(:disabled) ${SendButtonIcon} {
    animation: ${hop} 0.9s ease-in-out infinite;
  }

  &:active:not(:disabled) {
    background: #922b21;
    transform: translateY(0) scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:disabled ${SendButtonIcon} {
    animation: none;
  }

  &:focus-visible {
    outline: 2px solid var(--text-link);
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

export const SendButtonText = styled.span``;

export const PasteHint = styled.p`
  margin-top: 14px;
  font-size: 14px;
  color: var(--text-tertiary);

  @media (max-width: 480px) {
    font-size: 13px;
  }
`;

export const PasteText = styled.span`
  color: var(--text-link);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export const InlineHistoryItem = styled.div`
  animation: ${slideIn} 0.4s ${easeOut} both;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--radius-md);
  transition: background 0.15s, transform 0.2s ${easeOut};

  &:nth-of-type(2) {
    animation-delay: 0.06s;
  }
  &:nth-of-type(3) {
    animation-delay: 0.12s;
  }

  &:hover {
    background: var(--bg-modifier-hover);
    transform: translateX(4px);
  }

  @media (max-width: 400px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
`;

export const InlineLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const directionBadge = (type: "sent" | "received") => css`
  background: ${type === "sent" ? "var(--success)" : "var(--accent)"};
  color: #fff;
`;

export const InlineStatusBadge = styled.span<{ $type: "sent" | "received" }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  ${(p) => directionBadge(p.$type)}
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-radius 0.25s ${easeOut};

  /* Round avatars soften into squircles on hover. */
  ${InlineHistoryItem}:hover & {
    border-radius: 35%;
  }
`;

export const InlineFileName = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: var(--title-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const InlineRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

export const InlineTime = styled.span`
  font-size: 12px;
  color: var(--text-muted);
`;

const typeTag = css`
  font-size: 10px;
  line-height: 15px;
  font-weight: 600;
  padding: 0 5px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
`;

export const InlineTypeBadge = styled.span<{ $type: "sent" | "received" }>`
  ${typeTag}
  ${(p) => directionBadge(p.$type)}
`;

export const ViewAllButton = styled.button`
  transition: background 0.15s, transform 0.2s ${spring};
  border-radius: var(--radius-md);
  background: var(--w-face);
  border: none;
  height: 32px;
  width: 100%;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;

  &:hover {
    background: var(--hover-bg);
  }

  &:active {
    background: var(--press-bg);
    transform: scale(0.98);
  }
`;

export const Footer = styled.div`
  margin-top: 16px;
  text-align: center;
  animation: ${fadeUp} 0.5s ${easeOut} 0.6s both;
`;

export const FooterLinks = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;

  a {
    color: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 5px;

    &:hover {
      color: var(--text-link);
    }
  }

  @media (max-width: 480px) {
    gap: 12px;
  }
`;

export const FooterLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  text-decoration: none;
  transition: color 0.15s, transform 0.2s ${spring};

  &:hover {
    color: var(--text-link);
    text-decoration: underline;
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--text-link);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
`;

// Modal Components
export const ModalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const HistoryWrapper = styled.div`
  display: flex;
  align-items: center;
  color: var(--text-tertiary);
`;

export const CountBadge = styled.span`
  background: var(--accent-coral);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
  min-width: 16px;
  padding: 0 5px;
  border-radius: 8px;
  text-align: center;
  animation: ${popIn} 0.4s ${spring} 0.15s both;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
`;

export const TabButton = styled.button<{ $active: boolean }>`
  transition: background 0.2s, color 0.2s, transform 0.2s ${spring};
  padding: 2px 10px;
  border: none;
  background: ${(p) => (p.$active ? "var(--bg-modifier-active)" : "transparent")};
  color: ${(p) => (p.$active ? "var(--title-fg)" : "var(--text-tertiary)")};
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    background: var(--bg-modifier-hover);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.94);
  }
`;

export const TabCount = styled.span<{ $active: boolean }>`
  color: var(--text-muted);
  font-size: 12px;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
  animation: ${fadeUp} 0.4s ${easeOut} both;
`;

export const EmptyIconWrapper = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--bg-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  animation: ${float} 3s ease-in-out infinite;
`;

export const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--title-fg);
  margin-bottom: 4px;
`;

export const EmptySubtitle = styled.div`
  font-size: 14px;
  color: var(--text-tertiary);
`;

export const HistoryList = styled.div`
  max-height: 480px;
  overflow-y: auto;
`;

export const HistoryItem = styled.div`
  animation: ${slideIn} 0.35s ${easeOut} both;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 8px;
  border-radius: var(--radius-md);
  transition: background 0.15s;

  ${Array.from({ length: 10 }, (_, i) => i + 2)
    .map((n) => `&:nth-child(${n}) { animation-delay: ${(n - 1) * 0.035}s; }`)
    .join("\n")}

  &:hover {
    background: var(--bg-modifier-hover);
  }
`;

export const HistoryItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

export const StatusBadge = styled.span<{ $type: "sent" | "received" }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  ${(p) => directionBadge(p.$type)}
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const HistoryItemRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const MetaText = styled.span`
  font-size: 12px;
  color: var(--text-muted);
`;

export const TypeBadge = styled.span<{ $type: "sent" | "received" }>`
  ${typeTag}
  ${(p) => directionBadge(p.$type)}
`;

export const FileSizeText = styled.span`
  font-size: 12px;
  min-width: 52px;
  text-align: right;
  color: var(--text-muted);
`;

// Toast Components — a stacked pile that fans out on hover.
export const TOAST_HEIGHT = 60;
export const TOAST_GAP = 8;
/** How far each older toast peeks out above the one in front of it. */
export const TOAST_PEEK = 10;

const toastEase = "cubic-bezier(0.21, 1.02, 0.73, 1)";

export const ToastContainerWrapper = styled.div<{ $expanded: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: min(360px, calc(100vw - 32px));
  transition: height 0.4s ${toastEase};
  /* Collapsed, only the toasts themselves catch the pointer. Expanded, the
     whole box does, so the gaps between fanned-out toasts don't count as
     leaving the stack. */
  pointer-events: ${(p) => (p.$expanded ? "auto" : "none")};
`;

interface ToastItemProps {
  $index: number;
  $expanded: boolean;
  $visible: boolean;
  $leaving: boolean;
  $hidden: boolean;
}

function toastTransform(p: ToastItemProps): string {
  const y = p.$expanded
    ? -p.$index * (TOAST_HEIGHT + TOAST_GAP)
    : -p.$index * TOAST_PEEK;
  const scale = p.$expanded ? 1 : Math.max(0.8, 1 - p.$index * 0.05);
  if (!p.$visible) return `translateY(120%) scale(0.9)`;
  if (p.$leaving) return `translateY(${y + 24}px) scale(${scale * 0.9})`;
  return `translateY(${y}px) scale(${scale})`;
}

export const ToastItem = styled.div<ToastItemProps>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: ${TOAST_HEIGHT}px;
  background: var(--floating-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--floating-shadow);
  overflow: hidden;
  transform-origin: center bottom;
  will-change: transform, opacity;
  z-index: ${(p) => 100 - p.$index};
  transform: ${toastTransform};
  opacity: ${(p) => (!p.$visible || p.$leaving || p.$hidden ? 0 : 1)};
  pointer-events: ${(p) => (p.$hidden || p.$leaving ? "none" : "auto")};
  transition:
    transform 0.45s ${toastEase},
    opacity 0.35s ease;
`;

export const ToastInner = styled.div<{ $muted: boolean }>`
  height: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 0 12px;
  opacity: ${(p) => (p.$muted ? 0 : 1)};
  transition: opacity 0.3s ease;
`;

export const ToastIconWrapper = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: ${popIn} 0.5s ${spring} 0.15s both;
`;

export const ToastContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ToastTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  color: var(--title-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ToastText = styled.div`
  font-size: 13px;
  line-height: 17px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ToastClose = styled.button`
  transition: background 0.15s, color 0.15s, transform 0.25s ${spring};
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-modifier-hover);
    color: var(--text-primary);
    transform: rotate(90deg);
  }
`;

/** Time-left bar along the bottom edge; freezes while the stack is hovered. */
export const ToastTimer = styled.div<{ $duration: number; $paused: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  opacity: 0.8;
  transform-origin: left center;
  animation: ${shrink} ${(p) => p.$duration}ms linear both;
  animation-play-state: ${(p) => (p.$paused ? "paused" : "running")};
`;

export const SkipToContent = styled.a`
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--accent-primary);
  color: #fff;
  padding: 8px 16px;
  z-index: 9999;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 var(--radius-md) 0;

  &:focus {
    top: 0;
  }
`;

// QR dialog — the code morphs into a tick when another device joins.
const tickDisc = keyframes`
  0% { transform: scale(0); }
  60% { transform: scale(1.12); }
  80% { transform: scale(0.96); }
  100% { transform: scale(1); }
`;

const tickDraw = keyframes`
  to { stroke-dashoffset: 0; }
`;

const tickThump = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

export const QrStage = styled.div<{ $scanned: boolean }>`
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  background: ${(p) => (p.$scanned ? "transparent" : "#fff")};
  transition: background 0.4s ease 0.15s;

  .qr {
    display: block;
    width: 100%;
    height: 100%;
    transition:
      transform 0.45s cubic-bezier(0.5, 0, 0.75, 0),
      opacity 0.35s ease 0.1s;
    transform: ${(p) => (p.$scanned ? "scale(0.2) rotate(-25deg)" : "none")};
    opacity: ${(p) => (p.$scanned ? 0 : 1)};
  }
`;

export const QrTick = styled.div`
  position: absolute;
  inset: 18%;
  animation: ${tickThump} 0.35s ease-in-out 1s both;

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .disc {
    fill: var(--success);
    transform-origin: 50% 50%;
    transform-box: fill-box;
    animation: ${tickDisc} 0.5s ${spring} 0.3s both;
  }

  .mark {
    fill: none;
    stroke: #fff;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: ${tickDraw} 0.4s ${easeOut} 0.65s forwards;
  }
`;

export const QrCaption = styled.p<{ $scanned: boolean }>`
  margin-top: 12px;
  font-size: 12px;
  word-break: break-all;
  text-align: center;
  transition: opacity 0.3s, transform 0.3s;
  opacity: ${(p) => (p.$scanned ? 0 : 1)};
  transform: ${(p) => (p.$scanned ? "translateY(6px)" : "none")};
`;
