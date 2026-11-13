// Styled-components and keyframes for the Home page.
// Split out of index.tsx, which had grown past 2,400 lines with logic and
// presentation interleaved.
import styled, { css, keyframes, createGlobalStyle } from "styled-components";
import { Input } from "../../components";
export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const fadeInScale = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
`;

export const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
`;

export const glow = keyframes`
  0%, 100% { box-shadow: 0 0 30px var(--accent-glow), 0 0 60px var(--accent-glow); }
  50% { box-shadow: 0 0 50px var(--accent-glow-strong), 0 0 100px var(--accent-glow); }
`;

export const glowPulse = keyframes`
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
`;

export const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-8px) rotate(2deg); }
  75% { transform: translateY(4px) rotate(-1deg); }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

export const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(100px); }
  to { opacity: 1; transform: translateX(0); }
`;

export const slideInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

export const borderGlow = keyframes`
  0%, 100% { border-color: var(--accent-glow); }
  50% { border-color: var(--accent-glow-strong); }
`;

export const GlobalStyle = createGlobalStyle`
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
  
  @keyframes particleFloat {
    0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
    10% { opacity: 0.8; }
    90% { opacity: 0.8; }
    100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
  }
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
  padding: 72px 16px 24px;

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
  border: 1px solid var(--border-medium);
  background: var(--bg-card);
`;

export const PanelHead = styled.div`
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  padding: 16px;
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
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
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

export const CardWrapper = styled.div`
  width: 100%;
  position: relative;

`;

export const Card = styled.div`
  background: var(--bg-primary);
  position: relative;
  width: 100%;

  /* Full width: one column on phones, controls left and history right on wide screens. */
  @media (min-width: 900px) {
    display: grid;
    grid-template-columns: minmax(360px, 480px) 1fr;
    align-items: start;
    column-gap: 24px;
    padding: 0 24px;

    > :nth-child(2) { display: contents; }
    > :nth-child(2) > * { grid-column: 1; }
    > :first-child { grid-column: 1 / -1; }
    > :nth-child(2) > [aria-label="Recent transfers"] { grid-column: 2; grid-row: 2 / span 20; }
  }
`;

export const HeaderSection = styled.div`
  text-align: center;
  padding: 32px 28px 24px;
  position: relative;

  @media (max-width: 480px) {
    padding: 24px 18px 20px;
  }
`;

export const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
`;

export const LogoIcon = styled.div`
  width: 64px;
  height: 64px;
  background: var(--accent-gradient);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
`;

export const UploadIconWrapper = styled.div`
  color: white;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
`;

export const Title = styled.h1`
  font-size: clamp(26px, 6.5vw, 34px);
  font-weight: 800;
  letter-spacing: -1.5px;
  color: var(--text-primary);
  margin: 0 0 12px;

  @media (max-width: 360px) {
    font-size: 24px;
    letter-spacing: -1px;
  }
`;

export const Subtitle = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 auto 20px;
  line-height: 1.6;
  max-width: 34ch;

  @media (max-width: 480px) {
    font-size: 13px;
    margin-bottom: 16px;
  }
`;

export const FeatureBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 8px;
  }
`;

export const Badge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);

  svg {
    color: var(--accent-primary);
  }

  @media (max-width: 480px) {
    padding: 5px 10px;
    font-size: 10px;
  }
`;

export const ChannelSection = styled.div`
  margin-bottom: 20px;
`;

export const ChannelLabelWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  margin-bottom: 14px;
`;

export const ChannelBox = styled.div<{ $focused?: boolean }>`
  background: var(--bg-tertiary);
  border: 1px solid
    ${(p) => (p.$focused ? "var(--accent-primary)" : "var(--border-subtle)")};
  border-radius: 3px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  &:hover {
    border-color: var(--border-accent);
  }

  [data-theme="light"] & {
    background: var(--bg-secondary);
    border-color: ${(p) =>
      p.$focused ? "var(--accent-primary)" : "var(--border-subtle)"};
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 16px;
  }
`;

export const ChannelCode = styled.span`
  font-family: "Inter", monospace;
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
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);

  &:hover {
    background: var(--accent-glow);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  &:active {
    transform: scale(0.95);
  }
`;

export const IconButtonSecondary = styled(IconButton)`
  background: var(--bg-tertiary);
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
  height: 40px;
  font-size: 15px;
  letter-spacing: 3px;
  border-radius: 3px;
  text-transform: uppercase;
  font-weight: 600;

  @media (max-width: 480px) {
    height: 48px;
    font-size: 15px;
    letter-spacing: 2px;
  }
`;

export const TransferList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 28px;
`;

export const TransferItem = styled.div<{ $delay: number }>`
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  padding: 20px 22px;

  &:hover {
    border-color: var(--accent-primary);
  }

  [data-theme="light"] & {
    background: var(--bg-secondary);
  }
`;

export const TransferItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
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
  background: rgba(192, 132, 252, 0.15);
  padding: 4px 10px;
  border-radius: 3px;
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
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
  position: relative;
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 4px;
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
  border: 1px dashed var(--border-strong);
  border-radius: 3px;

  ${(p) =>
    p.$dragging &&
    css`
      background: var(--bg-secondary);
      border-color: var(--accent-primary);
      border-style: solid;
    `}
`;

export const ConnectionBanner = styled.div<{ $state: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 10px 14px;
  border-radius: 3px;
  font-size: 13px;
  font-weight: 500;
  background: ${(p) =>
    p.$state === "failed"
      ? "rgba(248, 113, 113, 0.12)"
      : "rgba(251, 191, 36, 0.12)"};
  border: 1px solid
    ${(p) =>
      p.$state === "failed"
        ? "rgba(248, 113, 113, 0.35)"
        : "rgba(251, 191, 36, 0.35)"};
  color: ${(p) => (p.$state === "failed" ? "var(--danger)" : "var(--warning)")};

  span {
    flex: 1;
  }
`;

export const BannerAction = styled.button`
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 3px;
  padding: 4px 12px;
  font-family: "Inter", sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: inherit;
  cursor: pointer;

  &:hover {
    background: currentColor;
    filter: brightness(1.4);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

export const CancelButton = styled.button`
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--text-tertiary);

  &:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
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
  padding: 14px 16px;
  background: var(--success-glow);
  border: 1px solid rgba(52, 211, 153, 0.3);
  border-radius: 3px;

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
  background: var(--accent-gradient);
  animation: bounce 1.4s ease-in-out infinite both;

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
  background: var(--accent-gradient);
  background-size: 200% 200%;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 10px 28px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: "Inter", sans-serif;
  letter-spacing: -0.02em;
  position: relative;
  overflow: hidden;

  &:hover {
  }

  &:active {
  }

  [data-theme="light"] & {

    &:hover {
    }
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 4px;
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 16px 24px;
    font-size: 16px;
    gap: 10px;
    border-radius: 3px;
  }
`;

export const SendButtonIcon = styled.div`
  display: flex;

  ${SendButton}:hover & {
  }
`;

export const SendButtonText = styled.span``;

export const ButtonShine = styled.div`
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--accent-primary);

  ${SendButton}:hover & {
    left: 100%;
  }
`;

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
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: var(--accent-secondary);
    text-decoration: underline;
  }
`;

export const HistorySection = styled.div`
  margin: 0;
  padding: 16px;
  background: transparent;
  border: none;
  border-radius: 3px;

  &:hover {
    border-color: var(--border-medium);
  }

  [data-theme="light"] & {
    background: var(--bg-secondary);
  }

  @media (max-width: 480px) {
    padding: 16px;
    margin-top: 22px;
  }
`;

export const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
`;

export const HistoryTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);

  svg {
    color: var(--accent-amber);
  }
`;

export const HistoryStats = styled.span`
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-glass);
  padding: 5px 14px;
  border-radius: 3px;
`;

export const HistoryContent = styled.div`
  max-height: 240px;
  overflow-y: auto;
`;

export const EmptyHistoryState = styled.div`
  text-align: center;
  padding: 28px;
`;

export const InlineHistoryItem = styled.div<{ $delay: number }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  margin-bottom: 10px;

  &:hover {
    border-color: var(--accent-primary);
  }

  @media (max-width: 400px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
  }
`;

export const InlineLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const InlineStatusBadge = styled.span<{ $type: "sent" | "received" }>`
  width: 30px;
  height: 30px;
  border-radius: 3px;
  background: ${(p) =>
    p.$type === "sent" ? "var(--success-glow)" : "var(--accent-glow)"};
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

export const SeeMoreButton = styled.button`
  background: transparent;
  border: 1px dashed var(--border-medium);
  border-radius: 3px;
  padding: 10px;
  width: 100%;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
  cursor: pointer;
  font-family: "Inter", sans-serif;

  &:hover {
    background: var(--bg-secondary);
    border-style: solid;
    border-color: var(--accent-primary);
  }
`;

export const ViewAllButton = styled.button`
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  padding: 14px;
  width: 100%;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  margin-top: 16px;
  font-family: "Inter", sans-serif;

  &:hover {
    background: var(--accent-glow);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
`;

export const Footer = styled.div`
  margin-top: 40px;
  text-align: center;
`;

export const UserCountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-muted);
  background: var(--bg-glass);
  padding: 12px 24px;
  border-radius: 3px;
  margin-bottom: 18px;
  border: 1px solid var(--border-subtle);

  svg {
    color: var(--accent-emerald);
  }
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
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

// Particles
//
// This used to be an empty styled.div while the real rules lived in App.less
// under a `.particles` class the component never applied. The particles were
// therefore unclipped (they travel +/-100vh) and visible in light mode.
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
  border: 1px solid var(--border-medium);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 3px;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 8px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-bottom: 2px solid
    ${(p) => (p.$active ? "var(--accent-primary)" : "transparent")};
  margin-bottom: -1px;
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
  font-family: "Inter", sans-serif;

  &:hover {
    color: var(--text-primary);
  }
`;

export const TabCount = styled.span<{ $active: boolean }>`
  border: 1px solid var(--border-medium);
  padding: 0 7px;
  border-radius: 3px;
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
  background: var(--bg-tertiary);
  border-radius: 3px;
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

export const HistoryItem = styled.div<{ $visible: boolean; $delay: number }>`
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
    background: var(--bg-secondary);
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
  border-radius: 3px;
  background: ${(p) =>
    p.$type === "sent" ? "var(--success-glow)" : "var(--accent-glow)"};
  color: ${(p) =>
    p.$type === "sent" ? "var(--success)" : "var(--accent-primary)"};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const HistoryFileNameWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

export const FileName = styled.span``;

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
  top: 90px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: calc(100vw - 32px);

  /* A 340px min-width toast pinned 28px from the right ran off the side of any
     phone narrower than ~370px, where overflow-x:hidden then clipped it. */
  @media (max-width: 520px) {
    top: 72px;
    left: 12px;
    right: 12px;
    max-width: none;
    gap: 10px;
  }
`;

export const ToastContainer = styled.div<{ $visible: boolean; $leaving: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  min-width: min(340px, 100%);
  max-width: 440px;
  transform: translateX(${(p) => (p.$leaving ? "120%" : "0")});
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  position: relative;
  overflow: hidden;

  @media (max-width: 520px) {
    min-width: 0;
    max-width: none;
    width: 100%;
    padding: 14px 16px;
    gap: 12px;
  }
`;

export const ToastIconWrapper = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const ToastContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ToastTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
`;

export const ToastDescription = styled.div`
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 3px;
`;

export const ToastClose = styled.button`
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 8px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-glass);
    color: var(--text-primary);
  }
`;

export const ToastProgress = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;

  @keyframes toastProgress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;

export const SkipToContent = styled.a`
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--accent-primary);
  color: white;
  padding: 8px 16px;
  z-index: 9999;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 8px 0;

  &:focus {
    top: 0;
  }
`;
