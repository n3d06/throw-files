// Styled-components and keyframes for the Home page.
// Split out of index.tsx, which had grown past 2,400 lines with logic and
// presentation interleaved.
import styled, { css, keyframes } from "styled-components";
import { Input } from "../../components";
export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

export const HomeComponent = styled.div`
  min-height: 100vh;
  min-height: 100dvh; /* avoids the mobile URL-bar gap */
  position: relative;
  z-index: 2;
`;

export const MainContainer = styled.div`
  max-width: 620px;
  margin: 0 auto;
  padding: 72px 16px 24px;

  &:focus:not(:focus-visible) {
    outline: none;
  }
`;

export const Panel = styled.section`
  animation: ${fadeUp} 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-card);
  box-shadow: var(--bevel-etch);
  border-radius: var(--radius-lg);
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  padding: 20px;
`;

export const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
`;

export const StatusLine = styled.div<{ $state: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${(p) =>
    p.$state === "open"
      ? "var(--success)"
      : p.$state === "failed"
        ? "var(--danger)"
        : "var(--warning)"};

  span {
    flex: 1;
  }
`;

export const DeviceCount = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);

  svg {
    color: var(--accent-emerald);
  }
`;

export const ChannelBox = styled.div<{ $focused?: boolean }>`
  background: var(--w-field);
  box-shadow: var(--bevel-in);
  outline: ${(p) => (p.$focused ? "1px solid var(--accent)" : "none")};
  outline-offset: -1px;
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 16px;
  }
`;

export const ChannelCode = styled.span`
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--accent-primary);
  flex: 1;
  min-width: 0;
  word-break: break-word;
  text-align: left;

  @media (max-width: 360px) {
    font-size: 22px;
    letter-spacing: 1px;
  }
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  flex-shrink: 0;

  @media (max-width: 480px) {
    justify-content: flex-end;
  }
`;

export const IconButton = styled.button`
  transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
  border-radius: 50%;
  background: var(--w-face);
  border: none;
  box-shadow: var(--bevel-out);
  color: var(--text-primary);
  min-width: 36px;
  height: 36px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--hover-bg);
    box-shadow: var(--hover-shadow);
  }

  &:active {
    background: var(--press-bg);
    box-shadow: var(--press-shadow);
    transform: scale(0.92);
  }
`;

export const IconButtonSecondary = styled(IconButton)`
`;

export const InputWrapper = styled.div`
  flex: 1;
`;

export const JoinSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
  margin-bottom: 0;

  @media (max-width: 600px) {
    flex-wrap: wrap;
    gap: 10px;

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
  height: 36px;
  font-size: 15px;
  letter-spacing: 2px;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
  font-weight: 600;

  @media (max-width: 480px) {
    height: 36px;
    font-size: 15px;
  }
`;

export const TransferList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 28px;
`;

export const TransferItem = styled.div`
  animation: ${fadeUp} 0.3s ease both;
  box-shadow: var(--bevel-etch);
  padding: 12px 14px;
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
  gap: 12px;
  min-width: 0;
  flex: 1;
`;

export const FileIconWrapper = styled.div<{ $receiving?: boolean }>`
  color: ${(p) =>
    p.$receiving ? "var(--accent-sky)" : "var(--accent-emerald)"};
  flex-shrink: 0;
`;

export const FileNameText = styled.span`
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ZipBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: var(--accent-tertiary);
  background: var(--w-light);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
  flex-shrink: 0;
`;

export const TransferStatus = styled.span<{ $receiving?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: ${(p) =>
    p.$receiving ? "var(--accent-sky)" : "var(--accent-emerald)"};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const StatusDot = styled.span<{ $receiving?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) =>
    p.$receiving ? "var(--accent-sky)" : "var(--accent-emerald)"};
`;

export const ProgressTrack = styled.div`
  height: 8px;
  background: var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 12px;
  position: relative;
`;

export const ProgressFill = styled.div`
  transition: width 0.2s linear;
  height: 100%;
  background: var(--accent-gradient);
  border-radius: var(--radius-md);
  /* Progress arrives once per chunk — many times a second. A 0.3s ease made the
     bar visibly lag behind the real byte count. */
  position: relative;
  overflow: hidden;
`;

export const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
`;

export const ProgressPercent = styled.span`
  color: var(--accent-primary);
  font-weight: 700;
`;

export const ProgressSize = styled.span`
  color: var(--text-muted);
`;

export const FileSection = styled.div<{ $dragging?: boolean }>`
  transition: background 0.15s, border-color 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
  min-height: 150px;
  padding: 20px 12px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);

  ${(p) =>
    p.$dragging &&
    css`
      background: #fdf1ef;
      border-color: var(--accent);
      border-style: solid;
    `}
`;

export const BannerAction = styled.button`
  transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
  border-radius: var(--radius-pill);
  background: var(--w-face);
  box-shadow: var(--bevel-out);
  border: none;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;

  &:hover {
    background: var(--hover-bg);
    box-shadow: var(--hover-shadow);
  }

  &:active {
    background: var(--press-bg);
    box-shadow: var(--press-shadow);
    transform: scale(0.96);
  }
`;

export const CancelButton = styled.button`
  transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
  border-radius: 50%;
  background: var(--w-face);
  box-shadow: var(--bevel-out);
  border: none;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--text-primary);

  &:hover {
    background: var(--hover-bg);
    box-shadow: var(--hover-shadow);
  }

  &:active {
    background: var(--press-bg);
    box-shadow: var(--press-shadow);
    transform: scale(0.92);
  }
`;

export const ReadyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
`;

export const ReadyItem = styled.div`
  animation: ${fadeUp} 0.3s ease both;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 10px;
  box-shadow: var(--bevel-etch);
  border-radius: var(--radius-md);

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

  /* Match the 34px height of the small Save button. */
  ${CancelButton} {
    width: 26px;
    height: 26px;
  }
`;

export const ReadySize = styled.span`
  font-size: 12px;
  color: var(--text-tertiary);
`;

export const LoadingDotsWrapper = styled.div`
  display: flex;
  gap: 10px;
`;

export const LoadingDot = styled.div`
  width: 12px;
  height: 12px;
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
  transition: background 0.15s, transform 0.12s;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-pill);
  padding: 10px 24px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 10px 24px;
    font-size: 15px;
    gap: 10px;
    border-radius: var(--radius-pill);
  }
`;

export const SendButtonIcon = styled.div`
  display: flex;
`;

export const SendButtonText = styled.span``;

export const PasteHint = styled.p`
  margin-top: 18px;
  font-size: 14px;
  color: var(--text-muted);

  @media (max-width: 480px) {
    font-size: 13px;
    margin-top: 14px;
  }
`;

export const PasteText = styled.span`
  color: var(--accent-primary);
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: var(--accent-secondary);
    text-decoration: underline;
  }
`;

export const InlineHistoryItem = styled.div`
  animation: ${fadeUp} 0.3s ease both;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border-subtle);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--w-light);
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

export const InlineStatusBadge = styled.span<{ $type: "sent" | "received" }>`
  width: 24px;
  height: 24px;
  color: ${(p) =>
    p.$type === "sent" ? "var(--success)" : "var(--accent-primary)"};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const InlineFileName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const InlineRight = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;

  @media (max-width: 400px) {
    gap: 10px;
  }
`;

export const InlineTime = styled.span`
  font-size: 12px;
  color: var(--text-muted);
`;

export const InlineTypeBadge = styled.span<{ $type: "sent" | "received" }>`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: ${(p) =>
    p.$type === "sent" ? "var(--success)" : "var(--accent-primary)"};
`;

export const ViewAllButton = styled.button`
  transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
  border-radius: var(--radius-pill);
  background: var(--w-face);
  box-shadow: var(--bevel-out);
  border: none;
  padding: 5px;
  width: 100%;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;

  &:hover {
    background: var(--hover-bg);
    box-shadow: var(--hover-shadow);
  }

  &:active {
    background: var(--press-bg);
    box-shadow: var(--press-shadow);
    transform: scale(0.98);
  }
`;

export const Footer = styled.div`
  margin-top: 16px;
  text-align: center;
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
      color: var(--accent-primary);
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

  &:hover {
    color: var(--accent-primary);
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
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
  color: var(--text-muted);
`;

export const CountBadge = styled.span`
  color: var(--text-muted);
  font-size: 12px;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 0;
  box-shadow: 0 1px var(--border-subtle);
  margin-bottom: 4px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  transition: box-shadow 0.2s, color 0.15s;
  padding: 6px 16px;
  border: none;
  box-shadow: ${(p) => (p.$active ? "inset 0 -2px var(--accent)" : "none")};
  background: transparent;
  color: ${(p) => (p.$active ? "var(--text-primary)" : "var(--text-secondary)")};
  cursor: pointer;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? "600" : "400")};
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  
`;

export const TabCount = styled.span<{ $active: boolean }>`
  color: var(--text-muted);
  font-size: 12px;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
`;

export const EmptyIconWrapper = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  box-shadow: var(--bevel-in);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
`;

export const EmptyTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
`;

export const EmptySubtitle = styled.div`
  font-size: 14px;
  color: var(--text-muted);
`;

export const HistoryList = styled.div`
  max-height: 480px;
  overflow-y: auto;
`;

export const HistoryItem = styled.div`
  animation: ${fadeUp} 0.3s ease both;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-subtle);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--w-light);
  }
`;

export const HistoryItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

export const StatusBadge = styled.span<{ $type: "sent" | "received" }>`
  width: 20px;
  height: 20px;
  border-radius: var(--radius-md);
    color: ${(p) =>
    p.$type === "sent" ? "var(--success)" : "var(--accent-primary)"};
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
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: ${(p) =>
    p.$type === "sent" ? "var(--success)" : "var(--accent-primary)"};
`;

export const FileSizeText = styled.span`
  font-size: 12px;
  min-width: 52px;
  text-align: right;
  color: var(--text-muted);
`;

// Toast Components
export const ToastContainerWrapper = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: calc(100vw - 32px);
  pointer-events: none;
`;

export const ToastContainer = styled.div<{ $visible: boolean; $leaving: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 6px 6px 14px;
  background: #29261b;
  color: #faf9f5;
  border-radius: var(--radius-md);
  box-shadow: 0 6px 24px rgba(41, 38, 27, 0.3);
  min-width: min(200px, 100%);
  max-width: 420px;
  pointer-events: auto;
  transition:
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.28s ease;
  transform: translateY(${(p) => (p.$visible && !p.$leaving ? "0" : "16px")});
  opacity: ${(p) => (p.$visible && !p.$leaving ? 1 : 0)};
`;

export const ToastIconWrapper = styled.div`
  display: flex;
  flex-shrink: 0;
`;

export const ToastContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ToastText = styled.div`
  font-size: 13px;
  color: #faf9f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ToastClose = styled.button`
  transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #c9c5b3;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: rgba(250, 249, 245, 0.12);
  }
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
