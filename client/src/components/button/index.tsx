import styled, { css, keyframes } from "styled-components";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "text"
    | "tertiary"
    | "success";
  size?: "small" | "middle" | "large";
  scale?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  $animate?: boolean;
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Button = ({
  variant = "secondary",
  size,
  scale,
  loading,
  icon,
  children,
  disabled,
  $animate,
  ...props
}: ButtonProps) => {
  const sz = scale === "sm" ? "small" : size || "middle";
  return (
    <Btn
      $variant={variant}
      $size={sz}
      $loading={!!loading}
      $animate={$animate}
      disabled={disabled || loading}
      aria-busy={!!loading}
      aria-live={loading ? "polite" : undefined}
      {...props}
    >
      {loading ? (
        <Spin aria-hidden="true" />
      ) : icon ? (
        <IconWrapper aria-hidden="true">{icon}</IconWrapper>
      ) : null}
      {children}
    </Btn>
  );
};

const Spin = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  flex-shrink: 0;
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

type Size = "small" | "middle" | "large";
type Variant = ButtonProps["variant"];

// MD3 common buttons: 40dp tall, fully rounded, Label large (14/20, 500).
const sizeStyles: Record<Size, ReturnType<typeof css>> = {
  small: css`
    padding: 0 16px;
    height: 32px;
  `,
  middle: css`
    padding: 0 24px;
    height: 40px;
  `,
  large: css`
    padding: 0 28px;
    height: 48px;
    font-size: 16px;
    line-height: 24px;
  `,
};

/**
 * variant → MD3 button type:
 * primary = filled, secondary = filled tonal, tertiary = outlined,
 * text = text, danger/success = filled in the error/success role.
 */
const variantStyles: Record<NonNullable<Variant>, ReturnType<typeof css>> = {
  primary: css`
    background: var(--md-primary);
    color: var(--md-on-primary);
  `,
  secondary: css`
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  `,
  danger: css`
    background: var(--md-error);
    color: var(--md-on-error);
  `,
  success: css`
    background: var(--md-success);
    color: var(--md-on-success);
  `,
  tertiary: css`
    background: transparent;
    color: var(--md-primary);
    box-shadow: inset 0 0 0 1px var(--md-outline);
  `,
  text: css`
    background: transparent;
    color: var(--md-primary);
    padding-left: 12px;
    padding-right: 12px;
  `,
};

const Btn = styled.button<{
  $variant: NonNullable<Variant>;
  $size: Size;
  $loading: boolean;
  $animate?: boolean;
}>`
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  border: none;
  border-radius: var(--md-shape-full);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: 0.1px;
  transition: box-shadow 0.2s var(--md-ease-standard);

  ${(p) => sizeStyles[p.$size]}
  ${(p) => variantStyles[p.$variant]}

  /* State layer: the content colour at 8% (hover) / 10% (pressed, focus). */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.15s var(--md-ease-standard);
    pointer-events: none;
  }

  /* MD3 minimum touch target: 48dp even when the button is drawn smaller. */
  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100%, 48px);
    height: max(100%, 48px);
    transform: translate(-50%, -50%);
  }

  &:hover:not(:disabled)::before {
    opacity: 0.08;
  }

  &:focus-visible::before,
  &:active:not(:disabled)::before {
    opacity: 0.1;
  }

  /* Filled buttons lift to level 1 on hover. */
  ${(p) =>
    ["primary", "danger", "success"].includes(p.$variant) &&
    css`
      &:hover:not(:disabled) {
        box-shadow: var(--md-elevation-1);
      }
    `}

  &:disabled {
    cursor: not-allowed;
    color: color-mix(in srgb, var(--md-on-surface) 38%, transparent);
    background: ${(p) =>
      p.$variant === "text"
        ? "transparent"
        : "color-mix(in srgb, var(--md-on-surface) 12%, transparent)"};
    box-shadow: ${(p) =>
      p.$variant === "tertiary"
        ? "inset 0 0 0 1px color-mix(in srgb, var(--md-on-surface) 12%, transparent)"
        : "none"};
  }

  ${(p) =>
    p.$loading &&
    css`
      cursor: wait;
    `}
`;
