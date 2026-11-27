// Styled-components and keyframes for the Home page.
// Split out of index.tsx, which had grown past 2,400 lines with logic and
// presentation interleaved.
// Motion is decorative only: the global prefers-reduced-motion rule in
// App.less collapses every animation and transition here to ~0ms.
import styled, { css, keyframes } from "styled-components";
import { Button, Input } from "../../components";

/** MD3 emphasized decelerate: things entering the screen. */
const spring = "var(--md-ease-emphasized-decelerate)";
/** MD3 standard easing: state changes on things already on screen. */
const easeOut = "var(--md-ease-standard)";

/** MD3 state layer: `color` at hover (8%) / pressed (10%) opacity. */
const stateLayer = (color = "currentColor") => css`
  &:hover:not(:disabled) {
    background-color: color-mix(in srgb, ${color} 8%, transparent);
  }
  &:active:not(:disabled) {
    background-color: color-mix(in srgb, ${color} 10%, transparent);
  }
`;

/**
 * MD3 minimum touch target: an invisible 48×48 hit area centred on controls
 * that are drawn smaller (40dp icon buttons, 32dp chips and small buttons).
 */
export const touchTarget = css`
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100%, 48px);
    height: max(100%, 48px);
    transform: translate(-50%, -50%);
  }
`;

/** Type scale roles used on this page. */
const type = {
  titleMedium: css`
    font-size: 16px;
    line-height: 24px;
    font-weight: 500;
    letter-spacing: 0.15px;
  `,
  titleSmall: css`
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;
    letter-spacing: 0.1px;
  `,
  bodyLarge: css`
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;
    letter-spacing: 0.5px;
  `,
  bodyMedium: css`
    font-size: 14px;
    line-height: 20px;
    font-weight: 400;
    letter-spacing: 0.25px;
  `,
  bodySmall: css`
    font-size: 12px;
    line-height: 16px;
    font-weight: 400;
    letter-spacing: 0.4px;
  `,
  labelLarge: css`
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;
    letter-spacing: 0.1px;
  `,
  labelMedium: css`
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.5px;
  `,
  labelSmall: css`
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.5px;
  `,
};

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;


const popIn = keyframes`
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
`;

/** New list items: a short fade with a small rise (MD3 enter). */
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
`;




export const HomeComponent = styled.div`
  min-height: 100vh;
  min-height: 100dvh; /* avoids the mobile URL-bar gap */
  position: relative;
  z-index: 2;
`;

export const MainContainer = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 80px 16px 24px;

  &:focus:not(:focus-visible) {
    outline: none;
  }

  @media (min-width: 600px) {
    padding: 88px 24px 32px;
  }
`;

/* MD3 discourages wrapping the whole page in a card: the content sits straight
   on the surface and each group gets its own container where it needs one. */
export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
  padding: 0;

  /* The page fades in once as a whole (MD3 fade-through), not block by block. */
  animation: ${fadeIn} 0.3s ${easeOut} both;
`;

/** Section heading: Title small in primary, like an MD3 list subheader. */
export const SectionLabel = styled.h2`
  ${type.titleSmall}
  color: var(--md-primary);
  margin: 0 4px 8px;
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
  padding: 12px 16px;
  background: var(--md-surface-container);
  border-radius: var(--md-shape-md);
`;

export const StatusLine = styled.div<{ $state: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  ${type.labelLarge}
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

/** Presence dot: steady while connected or failed, a slow blink while connecting. */
export const LiveDot = styled.i<{ $state: string }>`
  position: relative;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;

  ${(p) =>
    (p.$state === "connecting" || p.$state === "reconnecting") &&
    css`
      animation: ${blink} 1.1s ease-in-out infinite;
    `}
`;

export const DeviceCount = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  ${type.bodyMedium}
  color: var(--md-on-surface-variant);
`;

export const CountPop = styled.b`
  display: inline-block;
  font-weight: 500;
  color: var(--md-on-surface);
  animation: ${popIn} 0.3s ${spring} both;
`;

/** The channel is the page's hero: a filled card in primary-container. */
export const ChannelBox = styled.div<{ $focused?: boolean }>`
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  border-radius: var(--md-shape-lg);
  padding: 12px 12px 12px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 16px;
  }
`;

/** Headline medium (28/36), monospaced so the code reads unambiguously. */
export const ChannelCode = styled.span`
  font-family: var(--font-code);
  font-size: 28px;
  line-height: 36px;
  font-weight: 500;
  letter-spacing: 4px;
  color: var(--md-on-primary-container);
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
    font-size: 28px;
    font-weight: 400;
    letter-spacing: 0;
    opacity: 0.6;
  }

  @media (max-width: 360px) {
    font-size: 24px;
    letter-spacing: 2px;
  }
`;

export const ChannelChars = styled.span`
  display: inline-block;
  animation: ${fadeIn} 0.3s ${easeOut} both;
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

/**
 * MD3 standard icon button: 40dp, round, inherits its container's content
 * colour. A tick (`$success`) swaps in after a copy.
 */
export const IconButton = styled.button<{ $success?: boolean }>`
  ${touchTarget}
  transition: background-color 0.15s ${easeOut}, color 0.15s ${easeOut};
  border-radius: var(--md-shape-full);
  background: transparent;
  border: none;
  color: ${(p) => (p.$success ? "var(--md-primary)" : "inherit")};
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  ${stateLayer()}

  svg {
    width: 20px;
    height: 20px;
  }
`;

/** MD3 filled tonal icon button. */
export const IconButtonSecondary = styled(IconButton)`
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);

  &:hover:not(:disabled) {
    background-color: color-mix(
      in srgb,
      var(--md-on-secondary-container) 8%,
      var(--md-secondary-container)
    );
  }

  &:active:not(:disabled) {
    background-color: color-mix(
      in srgb,
      var(--md-on-secondary-container) 10%,
      var(--md-secondary-container)
    );
  }
`;

/** The regenerate button: the arrows turn a full lap on press. */
export const RefreshButton = styled(IconButtonSecondary)`
  svg {
    transition: transform 0.45s ${spring};
  }

  &:active svg {
    transform: rotate(180deg);
  }
`;

export const InputWrapper = styled.div`
  flex: 1;
`;

export const JoinSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
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

/** MD3 outlined text field, 56dp tall. */
export const StyledInput = styled(Input)`
  height: 56px;
  font-family: var(--font-code);
  font-size: 16px;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 500;

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

/** MD3 filled card: the tonal surface does the separating, no border. */
const filledCard = css`
  background: var(--md-surface-container-high);
  border-radius: var(--md-shape-md);
`;

export const TransferItem = styled.div`
  animation: ${slideIn} 0.4s ${spring} both;
  ${filledCard}
  padding: 12px 8px 16px 16px;
`;

export const TransferItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
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
    p.$receiving ? "var(--md-primary)" : "var(--md-on-surface-variant)"};
  flex-shrink: 0;
  display: flex;
  animation: ${popIn} 0.3s ${spring} 0.1s both;
`;

export const FileNameText = styled.span`
  ${type.titleMedium}
  color: var(--md-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** Small label in tertiary-container. */
export const ZipBadge = styled.span`
  ${type.labelSmall}
  color: var(--md-on-tertiary-container);
  background: var(--md-tertiary-container);
  padding: 0 6px;
  border-radius: var(--md-shape-xs);
  flex-shrink: 0;
  animation: ${popIn} 0.3s ${spring} 0.2s both;
`;

export const TransferStatus = styled.span<{ $receiving?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  ${type.labelMedium}
  color: var(--md-on-surface-variant);
`;

export const StatusDot = styled.span<{ $receiving?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) =>
    p.$receiving ? "var(--md-primary)" : "var(--md-on-surface-variant)"};
  animation: ${blink} 1s ease-in-out infinite;
`;

/** MD3 linear progress indicator: 4dp, rounded, secondary-container track. */
export const ProgressTrack = styled.div`
  height: 4px;
  background: var(--md-secondary-container);
  border-radius: var(--md-shape-full);
  overflow: hidden;
  margin: 0 8px 8px 0;
  position: relative;
`;

export const ProgressFill = styled.div`
  /* Progress arrives once per chunk, many times a second: keep it linear and
     short so the bar never lags behind the real byte count. */
  transition: width 0.2s linear;
  height: 100%;
  background: var(--md-primary);
  border-radius: var(--md-shape-full);
`;

export const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-right: 8px;
  ${type.labelMedium}
`;

export const ProgressPercent = styled.span`
  color: var(--md-on-surface);
  font-variant-numeric: tabular-nums;
`;

export const ProgressSize = styled.span`
  color: var(--md-on-surface-variant);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
`;


/** One card for sending, File and Text behind tabs, so only one shows. */
export const SendCard = styled.section`
  background: var(--md-surface-container-low);
  border-radius: var(--md-shape-lg);
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

/** MD3 secondary tabs: they switch content inside this card, not the page. */
export const SendTabs = styled.div`
  display: flex;
  margin: 0 -16px;
  border-bottom: 1px solid var(--md-outline-variant);
`;

export const SendTab = styled.button<{ $active: boolean }>`
  ${type.titleSmall}
  position: relative;
  flex: 1;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${(p) =>
    p.$active ? "var(--md-on-surface)" : "var(--md-on-surface-variant)"};
  transition:
    color 0.2s ${easeOut},
    background-color 0.15s ${easeOut};
  ${stateLayer("var(--md-on-surface)")}

  &:first-child {
    border-top-left-radius: var(--md-shape-lg);
  }
  &:last-child {
    border-top-right-radius: var(--md-shape-lg);
  }

  /* Secondary-tab indicator: 2dp, the full width of the tab. */
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: var(--md-primary);
    transform: scaleX(${(p) => (p.$active ? 1 : 0)});
    transition: transform 0.3s ${spring};
  }

  &:focus-visible {
    outline-offset: -3px;
  }
`;

/**
 * Both tab panels sit in the same grid cell, so the card is always as tall as
 * the taller one and switching tabs never makes it jump. The inactive panel is
 * hidden with visibility, which also drops it from the tab order and the
 * accessibility tree.
 */
export const SendPanels = styled.div`
  display: grid;

  > * {
    grid-area: 1 / 1;
    min-width: 0;
  }
`;

const tabPanel = css<{ $inactive?: boolean }>`
  visibility: ${(p) => (p.$inactive ? "hidden" : "visible")};
  ${(p) =>
    !p.$inactive &&
    css`
      animation: ${fadeUp} 0.25s ${spring} both;
    `}
`;

/** Drop zone: an outlined card whose outline is dashed to invite a drop. */
export const FileSection = styled.div<{ $dragging?: boolean; $inactive?: boolean }>`
  ${tabPanel}
  transition:
    background-color 0.2s ${easeOut},
    border-color 0.2s ${easeOut};
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
  min-height: 168px;
  padding: 24px 16px;
  background: var(--md-surface-container-low);
  border: 1px dashed var(--md-outline);
  border-radius: var(--md-shape-lg);

  ${(p) =>
    p.$dragging &&
    css`
      background: color-mix(in srgb, var(--md-primary) 16%, var(--md-surface-container-low));
      border: 2px solid var(--md-primary);
      padding: 23px 15px;
    `}
`;

/** Text button sized for an inline action. */
export const BannerAction = styled.button`
  ${touchTarget}
  ${type.labelLarge}
  ${stateLayer()}
  transition: background-color 0.15s ${easeOut};
  border-radius: var(--md-shape-full);
  background: transparent;
  border: none;
  height: 32px;
  padding: 0 12px;
  color: var(--md-primary);
  cursor: pointer;
`;

/** Standard icon button for dismiss/cancel. */
export const CancelButton = styled.button`
  ${touchTarget}
  ${stateLayer()}
  transition: background-color 0.15s ${easeOut};
  border-radius: var(--md-shape-full);
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  color: var(--md-on-surface-variant);

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const ReadyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ReadyItem = styled.div`
  animation: ${slideIn} 0.4s ${spring} both;
  ${filledCard}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 8px 8px 8px 16px;
  min-height: 56px;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 12px 8px 8px 16px;
  }
`;

/** Thumbnail across the top of a received image's card; opens the viewer. */
export const ReadyPreview = styled.button`
  /* Full card width, with an even 8px inset: the card pads 16px left, 8px right. */
  flex-basis: calc(100% + 8px);
  order: -1;
  display: flex;
  justify-content: center;
  margin: 0 0 0 -8px;
  padding: 0;
  border: none;
  border-radius: var(--md-shape-sm);
  overflow: hidden;
  cursor: zoom-in;
  /* Checkerboard so transparent PNGs stay visible on either theme. */
  background:
    repeating-conic-gradient(var(--md-surface-container-highest) 0% 25%, var(--md-surface-container) 0% 50%)
    50% / 16px 16px;

  img {
    display: block;
    max-width: 100%;
    max-height: 280px;
    object-fit: contain;
    transition: transform 0.3s ${easeOut};
  }

  &:hover img {
    transform: scale(1.02);
  }

  /* The card stacks vertically on phones, where flex-basis would be a height. */
  @media (max-width: 480px) {
    flex-basis: auto;
  }
`;

export const ImageViewer = styled.figure`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;

  img {
    display: block;
    max-width: 100%;
    max-height: calc(100dvh - 260px);
    object-fit: contain;
    border-radius: var(--md-shape-sm);
  }
`;

export const ImageViewerMeta = styled.figcaption`
  ${type.bodySmall}
  color: var(--md-on-surface-variant);
`;

export const ReadyActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

export const ReadySize = styled.span`
  ${type.bodySmall}
  color: var(--md-on-surface-variant);
  margin-right: 4px;
`;

/** Shown instead of Save once a file is already written to disk. */
export const SavedLabel = styled.span`
  ${type.labelLarge}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 4px;
  color: var(--md-success);
`;

// ── Incoming offer dialog ───────────────────────────────────────────────────

export const OfferBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const OfferFile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 16px;
  border-radius: var(--md-shape-md);
  background: var(--md-surface-container-highest);

  ${ReadySize} {
    margin-left: auto;
    flex-shrink: 0;
  }
`;

export const OfferQueue = styled.p`
  ${type.bodySmall}
  color: var(--md-on-surface-variant);
`;

// ── Text snippets ───────────────────────────────────────────────────────────

export const TextComposer = styled.div<{ $inactive?: boolean }>`
  ${tabPanel}
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/**
 * MD3 outlined text field label. The <label> follows its input/textarea; it
 * rests inside the field and floats onto the outline (Body small, in primary
 * while focused) once the field is focused or filled. `$bg` is the surface the
 * field sits on, used to cut the outline behind the floated label. The
 * placeholder only shows while focused, so it never collides with the label.
 */
export const OutlinedField = styled.div<{ $bg: string; $grow?: boolean }>`
  position: relative;
  min-width: 0;
  ${(p) =>
    p.$grow &&
    css`
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    `}

  > label {
    position: absolute;
    left: 12px;
    top: 16px;
    max-width: calc(100% - 24px);
    padding: 0 4px;
    ${type.bodyLarge}
    color: var(--md-on-surface-variant);
    background: transparent;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    transform-origin: left center;
    transition:
      top 0.2s ${easeOut},
      font-size 0.2s ${easeOut},
      line-height 0.2s ${easeOut},
      color 0.2s ${easeOut},
      background-color 0s 0.1s;
  }

  > input:not(:focus)::placeholder,
  > textarea:not(:focus)::placeholder {
    color: transparent;
  }

  > :is(input, textarea):focus + label,
  > :is(input, textarea):not(:placeholder-shown) + label {
    top: -8px;
    ${type.bodySmall}
    background: ${(p) => p.$bg};
    transition:
      top 0.2s ${easeOut},
      font-size 0.2s ${easeOut},
      line-height 0.2s ${easeOut},
      color 0.2s ${easeOut},
      background-color 0s;
  }

  > :is(input, textarea):focus + label {
    color: var(--md-primary);
  }
`;

/** MD3 outlined text field, multi-line. */
export const TextArea = styled.textarea`
  width: 100%;
  flex: 1;
  min-height: 96px;
  max-height: 240px;
  /* Fixed size: the panel sets the height and long text scrolls inside. */
  resize: none;
  padding: 16px;
  font-family: inherit;
  ${type.bodyLarge}
  color: var(--md-on-surface);
  caret-color: var(--md-primary);
  background: transparent;
  border: none;
  border-radius: var(--md-shape-xs);
  box-shadow: inset 0 0 0 1px var(--md-outline);
  transition: box-shadow 0.15s ${easeOut};

  &:hover:not(:focus):not(:disabled) {
    box-shadow: inset 0 0 0 1px var(--md-on-surface);
  }

  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--md-primary);
  }

  &::placeholder {
    color: var(--md-on-surface-variant);
  }

  &:disabled {
    cursor: not-allowed;
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--md-on-surface) 12%, transparent);
  }
`;

export const TextComposerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

/** Supporting text under the field (Body small). */
export const TextHint = styled.span<{ $over?: boolean }>`
  ${type.bodySmall}
  margin-left: 16px;
  color: ${(p) =>
    p.$over ? "var(--md-error)" : "var(--md-on-surface-variant)"};
  font-variant-numeric: tabular-nums;
`;

export const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/** Received snippets sit on a neutral card, your own on secondary-container. */
export const MessageItem = styled.div<{ $mine: boolean }>`
  animation: ${slideIn} 0.4s ${spring} both;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 8px 12px 16px;
  border-radius: var(--md-shape-md);
  background: ${(p) =>
    p.$mine
      ? "var(--md-secondary-container)"
      : "var(--md-surface-container-high)"};
  color: ${(p) =>
    p.$mine ? "var(--md-on-secondary-container)" : "var(--md-on-surface)"};

  ${CancelButton} {
    color: inherit;
  }
`;

export const MessageBody = styled.div`
  flex: 1;
  min-width: 0;
  padding-top: 2px;
`;

export const MessageMeta = styled.div`
  ${type.labelMedium}
  opacity: 0.8;
  margin-bottom: 4px;
`;

export const MessageText = styled.div`
  ${type.bodyLarge}
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 200px;
  overflow-y: auto;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/** MD3 indeterminate circular progress indicator: 48dp, 4dp track. */
export const CircularProgress = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid var(--md-secondary-container);
  border-top-color: var(--md-primary);
  animation: ${spin} 1s linear infinite;
`;

export const SendButtonWrapper = styled.div`
  text-align: center;
`;

/** The drop zone's action: an MD3 filled button (a FAB belongs on the screen
    edge, not inside a card). Full width on phones. */
export const SendButton = styled(Button)`
  @media (max-width: 480px) {
    width: 100%;
  }
`;

export const PasteHint = styled.p`
  margin-top: 16px;
  ${type.bodyMedium}
  color: var(--md-on-surface-variant);
`;

export const PasteText = styled.span`
  color: var(--md-primary);
  font-weight: 500;
`;

/** MD3 two-line-ish list item: 56dp, leading avatar, state layer on hover. */


/** Tonal avatar colours: received in primary, sent in secondary. */
const directionBadge = (type: "sent" | "received") => css`
  background: ${type === "sent"
    ? "var(--md-secondary-container)"
    : "var(--md-primary-container)"};
  color: ${type === "sent"
    ? "var(--md-on-secondary-container)"
    : "var(--md-on-primary-container)"};
`;





const typeTag = css`
  ${type.labelSmall}
  padding: 0 6px;
  border-radius: var(--md-shape-xs);
`;


/** MD3 outlined button, full width. */
export const ViewAllButton = styled.button`
  ${touchTarget}
  ${type.labelLarge}
  ${stateLayer("var(--md-primary)")}
  transition: background-color 0.15s ${easeOut};
  border-radius: var(--md-shape-full);
  background: transparent;
  border: 1px solid var(--md-outline);
  height: 40px;
  width: 100%;
  color: var(--md-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export const Footer = styled.div`
  margin-top: 24px;
  text-align: center;
  animation: ${fadeUp} 0.5s ${spring} 0.6s both;
`;

export const FooterLinks = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  ${type.bodySmall}
  color: var(--md-on-surface-variant);
  flex-wrap: wrap;
`;

/** Text-button-like footer link with a state layer. */
export const FooterLink = styled.a`
  ${touchTarget}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: var(--md-shape-full);
  color: var(--md-on-surface-variant);
  text-decoration: none;
  transition: background-color 0.15s ${easeOut};
  ${stateLayer("var(--md-on-surface-variant)")}
`;

// Modal Components
export const ModalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HistoryWrapper = styled.div`
  display: flex;
  align-items: center;
  color: var(--md-secondary);
`;

/** MD3 large badge: 16dp, error colours. */
export const CountBadge = styled.span`
  background: var(--md-error);
  color: var(--md-on-error);
  ${type.labelSmall}
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--md-shape-full);
  text-align: center;
  animation: ${popIn} 0.3s ${spring} 0.15s both;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

/** All / Sent / Received narrow one list, so they are MD3 filter chips. */
export const TabBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  ${touchTarget}
  ${type.labelLarge}
  transition: background-color 0.15s ${easeOut}, box-shadow 0.15s ${easeOut};
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: var(--md-shape-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${(p) =>
    p.$active ? "var(--md-secondary-container)" : "transparent"};
  color: ${(p) =>
    p.$active
      ? "var(--md-on-secondary-container)"
      : "var(--md-on-surface-variant)"};
  box-shadow: ${(p) =>
    p.$active ? "none" : "inset 0 0 0 1px var(--md-outline-variant)"};

  &:hover {
    background-color: ${(p) =>
      p.$active
        ? "color-mix(in srgb, var(--md-on-secondary-container) 8%, var(--md-secondary-container))"
        : "color-mix(in srgb, var(--md-on-surface-variant) 8%, transparent)"};
  }
`;

export const TabCount = styled.span<{ $active: boolean }>`
  ${type.labelMedium}
  opacity: 0.8;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
  animation: ${fadeUp} 0.4s ${spring} both;
`;

export const EmptyIconWrapper = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--md-surface-container-highest);
  border-radius: var(--md-shape-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-on-surface-variant);
`;

export const EmptyTitle = styled.div`
  ${type.titleMedium}
  color: var(--md-on-surface);
  margin-bottom: 4px;
`;

export const EmptySubtitle = styled.div`
  ${type.bodyMedium}
  color: var(--md-on-surface-variant);
`;

export const HistoryList = styled.div`
  max-height: 480px;
  overflow-y: auto;
  margin: 0 -8px;
`;

export const HistoryItem = styled.div`
  animation: ${slideIn} 0.35s ${spring} both;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 8px;
  border-radius: var(--md-shape-md);
  transition: background-color 0.15s ${easeOut};
  ${stateLayer("var(--md-on-surface)")}

  ${Array.from({ length: 10 }, (_, i) => i + 2)
    .map((n) => `&:nth-child(${n}) { animation-delay: ${(n - 1) * 0.035}s; }`)
    .join("\n")}
`;

export const HistoryItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const StatusBadge = styled.span<{ $type: "sent" | "received" }>`
  width: 32px;
  height: 32px;
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
  gap: 12px;
`;

export const MetaText = styled.span`
  ${type.labelSmall}
  color: var(--md-on-surface-variant);
`;

export const TypeBadge = styled.span<{ $type: "sent" | "received" }>`
  ${typeTag}
  ${(p) => directionBadge(p.$type)}
`;

export const FileSizeText = styled.span`
  ${type.bodySmall}
  min-width: 56px;
  text-align: right;
  color: var(--md-on-surface-variant);
`;

// MD3 snackbar: inverse surface, 4dp corners, level 3, one at a time.
export const SnackbarHost = styled.div`
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 9999;
  width: min(560px, calc(100vw - 32px));
  pointer-events: none;
`;

export const Snackbar = styled.div<{ $visible: boolean; $leaving: boolean }>`
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 6px 8px 6px 16px;
  background: var(--md-inverse-surface);
  color: var(--md-inverse-on-surface);
  border-radius: var(--md-shape-xs);
  box-shadow: var(--md-elevation-3);
  opacity: ${(p) => (p.$visible && !p.$leaving ? 1 : 0)};
  transform: ${(p) =>
    !p.$visible ? "translateY(16px)" : p.$leaving ? "scale(0.96)" : "none"};
  transition:
    opacity ${(p) => (p.$leaving ? "0.15s" : "0.25s")} var(--md-ease-standard),
    transform 0.3s ${spring};
`;

/** Icon + text; a newer message replaces them in place, without animating. */
export const SnackbarContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

/** Leading icon in the snackbar's accent roles (inverse-primary / error). */
export const SnackbarIcon = styled.span<{
  $type: "success" | "error" | "info" | "warning";
}>`
  display: flex;
  flex-shrink: 0;
  color: ${(p) =>
    p.$type === "error" || p.$type === "warning"
      ? "var(--md-inverse-error)"
      : "var(--md-inverse-primary)"};
`;

export const SnackbarText = styled.div`
  flex: 1;
  min-width: 0;
  padding: 4px 0;
`;

export const SnackbarTitle = styled.div`
  ${type.labelLarge}
`;

/** Body medium, clamped to two lines as MD3 allows. */
export const SnackbarSupporting = styled.div`
  ${type.bodyMedium}
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/** Close affordance: a standard icon button on the inverse surface. */
export const SnackbarClose = styled.button`
  ${stateLayer()}
  ${touchTarget}
  transition: background-color 0.15s ${easeOut};
  border-radius: var(--md-shape-full);
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const SkipToContent = styled.a`
  position: absolute;
  top: -48px;
  left: 8px;
  background: var(--md-primary);
  color: var(--md-on-primary);
  ${type.labelLarge}
  height: 40px;
  display: inline-flex;
  align-items: center;
  padding: 0 24px;
  z-index: 9999;
  text-decoration: none;
  border-radius: var(--md-shape-full);

  &:focus {
    top: 12px;
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
  border-radius: var(--md-shape-lg);
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
    fill: var(--md-success);
    transform-origin: 50% 50%;
    transform-box: fill-box;
    animation: ${tickDisc} 0.5s ${spring} 0.3s both;
  }

  .mark {
    fill: none;
    stroke: var(--md-on-success);
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
  ${type.bodySmall}
  color: var(--md-on-surface-variant);
  word-break: break-all;
  text-align: center;
  transition: opacity 0.3s, transform 0.3s;
  opacity: ${(p) => (p.$scanned ? 0 : 1)};
  transform: ${(p) => (p.$scanned ? "translateY(6px)" : "none")};
`;
