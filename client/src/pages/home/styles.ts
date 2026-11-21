// Styled-components and keyframes for the Home page.
// Split out of index.tsx, which had grown past 2,400 lines with logic and
// presentation interleaved.
import styled, { css, keyframes } from "styled-components";
import { Input } from "../../components";
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 46px 12px 24px;

  &:focus:not(:focus-visible) {
    outline: none;
  }
`;

export const Dashboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Row = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols}, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-card);
  box-shadow: var(--bevel-etch);
`;

export const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 12px;
  min-height: 34px;
  background: var(--w-title);
  border-bottom: 1px solid var(--border-subtle);
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  padding: 12px;
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

export const EmptyHint = styled.p`
  margin: auto;
  font-size: 13px;
  color: var(--text-muted);
`;
export const PanelTitle = styled.h2`
  font-size: 13px;
  font-weight: 600;
  color: var(--title-fg);
  margin: 0;
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

export const Note = styled.p`
  margin-top: auto;
  font-size: 12px;
  color: var(--text-muted);
`;

export const ChannelBox = styled.div<{ $focused?: boolean }>`
  background: var(--w-field);
  box-shadow: var(--bevel-in);
  outline: ${(p) => (p.$focused ? "1px solid var(--accent)" : "none")};
  outline-offset: -1px;
  border-radius: 0;
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
  font-family: "Courier New", monospace;
  font-size: 22px;
  font-weight: 700;
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
  background: var(--w-face);
  border: none;
  box-shadow: var(--bevel-out);
  color: var(--text-primary);
  min-width: 32px;
  height: 32px;
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
  height: 32px;
  font-size: 15px;
  letter-spacing: 2px;
  border-radius: 0;
  text-transform: uppercase;
  font-weight: 600;

  &:hover {
    box-shadow: inset 0 0 0 1px #171717;
  }

  &:focus {
    box-shadow: inset 0 0 0 1px var(--accent);
  }

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
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ZipBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: var(--accent-tertiary);
  box-shadow: var(--bevel-out);
  padding: 2px 6px;
  border-radius: 0;
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
  border-radius: 0;
  background: ${(p) =>
    p.$receiving ? "var(--accent-sky)" : "var(--accent-emerald)"};
`;

export const ProgressTrack = styled.div`
  height: 8px;
  background: var(--border-subtle);
  border-radius: 0;
  overflow: hidden;
  margin-bottom: 12px;
  position: relative;
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 0;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
  min-height: 200px;
  padding: 32px 16px;
  border: 1px dotted var(--text-primary);
  border-radius: 0;

  ${(p) =>
    p.$dragging &&
    css`
      background: var(--w-light);
    `}
`;

export const BannerAction = styled.button`
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
  }
`;

export const CancelButton = styled.button`
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
  }
`;

export const ReadyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
`;

export const ReadyItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 10px;
  box-shadow: var(--bevel-etch);
  border-radius: 0;

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
  border-radius: 0;
  background: #0078d7;
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
  background: var(--w-face);
  color: var(--text-primary);
  border: none;
  box-shadow: inset 0 0 0 2px var(--accent);
  border-radius: 0;
  padding: 6px 24px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: var(--hover-bg);
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  &:active:not(:disabled) {
    background: var(--press-bg);
    box-shadow: inset 0 0 0 2px #005499;
  }

  &:disabled {
    color: #a0a0a0;
    background: #cccccc;
    box-shadow: inset 0 0 0 1px #bfbfbf;
    cursor: default;
  }

  &:focus-visible {
    outline: 1px dotted var(--text-primary);
    outline-offset: -5px;
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 10px 24px;
    font-size: 15px;
    gap: 10px;
    border-radius: 0;
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

export const HistoryStats = styled.span`
  box-shadow: var(--bevel-in);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
  padding: 0 8px;
  border-radius: 0;
`;

export const InlineHistoryItem = styled.div`
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
  }
`;

export const Footer = styled.div`
  margin-top: 40px;
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
    outline: 1px dotted var(--text-primary);
    outline-offset: 1px;
    border-radius: 0;
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
  box-shadow: var(--bevel-in);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 0;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 0;
  box-shadow: 0 1px var(--w-hi);
  margin-bottom: 8px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 14px;
  border: none;
  box-shadow: ${(p) => (p.$active ? "inset 0 -2px var(--accent)" : "none")};
  background: transparent;
  color: ${(p) => (p.$active ? "var(--text-primary)" : "var(--text-secondary)")};
  cursor: pointer;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? "600" : "500")};
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  
`;

export const TabCount = styled.span<{ $active: boolean }>`
  box-shadow: var(--bevel-in);
  padding: 0 7px;
  border-radius: 0;
  font-size: 11px;
  font-weight: 600;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 64px 24px;
`;

export const EmptyIconWrapper = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  box-shadow: var(--bevel-in);
  border-radius: 0;
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
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 18px;
  align-items: center;
  padding: 12px 8px;
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
  gap: 14px;
  min-width: 0;
`;

export const StatusBadge = styled.span<{ $type: "sent" | "received" }>`
  width: 32px;
  height: 32px;
  border-radius: 0;
    color: ${(p) =>
    p.$type === "sent" ? "var(--success)" : "var(--accent-primary)"};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const HistoryItemRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
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
  font-size: 14px;
  color: var(--text-muted);
`;

// Toast Components
export const ToastContainerWrapper = styled.div`
  position: fixed;
  top: 44px;
  right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: calc(100vw - 32px);

  /* A 340px min-width toast pinned 28px from the right ran off the side of any
     phone narrower than ~370px, where overflow-x:hidden then clipped it. */
  @media (max-width: 520px) {
    top: 44px;
    left: 12px;
    right: 12px;
    max-width: none;
    gap: 6px;
  }
`;

export const ToastContainer = styled.div<{ $visible: boolean; $leaving: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 12px;
  background: var(--bg-card);
  border-left: 3px solid var(--border-strong);
  box-shadow: 0 0 0 1px #adadad, 0 4px 12px rgba(0, 0, 0, 0.2);
  border-radius: 0;
  min-width: min(280px, 100%);
  max-width: 360px;
  transform: translateX(${(p) => (p.$leaving ? "120%" : "0")});
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  position: relative;
  overflow: hidden;

  @media (max-width: 520px) {
    min-width: 0;
    max-width: none;
    width: 100%;
  }
`;

export const ToastIconWrapper = styled.div`
  display: flex;
  flex-shrink: 0;
`;

export const ToastContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ToastTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
`;

export const ToastDescription = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 1px;
`;

export const ToastClose = styled.button`
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: #e5e5e5;
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
  border-radius: 0 0 8px 0;

  &:focus {
    top: 0;
  }
`;
