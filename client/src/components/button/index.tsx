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

const bounceIn = keyframes`
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

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
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
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

const sizeStyles: Record<Size, ReturnType<typeof css>> = {
  small: css`
    padding: 8px 14px;
    font-size: 12px;
    height: 34px;
    border-radius: 3px;
    font-weight: 600;
  `,
  middle: css`
    padding: 10px 18px;
    font-size: 14px;
    height: 42px;
    border-radius: 3px;
    font-weight: 600;
  `,
  large: css`
    padding: 14px 28px;
    font-size: 15px;
    height: 52px;
    border-radius: 3px;
    font-weight: 700;
  `,
};

const variantStyles: Record<NonNullable<Variant>, ReturnType<typeof css>> = {
  primary: css`
    background: var(--accent-gradient);
    background-size: 200% 200%;
    color: #fff;
    border: none;
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: var(--accent-primary);
    }

    &:hover:not(:disabled)::before {
      left: 100%;
    }

    &:hover:not(:disabled) {
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }
  `,
  secondary: css`
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-medium);

    &:hover:not(:disabled) {
      background: var(--bg-glass-hover);
      border-color: var(--accent-primary);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    [data-theme="light"] & {
      background: var(--bg-secondary);
      border-color: var(--border-subtle);

      &:hover:not(:disabled) {
        background: var(--bg-tertiary);
      }
    }
  `,
  danger: css`
    background: var(--accent-primary);
    color: #fff;
    border: none;

    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `,
  text: css`
    background: transparent;
    color: var(--text-secondary);
    border: none;
    padding-left: 10px;
    padding-right: 10px;

    &:hover:not(:disabled) {
      color: var(--accent-primary);
      background: var(--accent-glow);
    }
  `,
  tertiary: css`
    background: transparent;
    color: var(--accent-primary);
    border: 1px dashed var(--border-medium);

    &:hover:not(:disabled) {
      background: var(--accent-glow);
      border-color: var(--accent-primary);
      border-style: solid;
    }
  `,
  success: css`
    background: var(--accent-primary);
    color: #fff;
    border: none;

    &:hover:not(:disabled) {
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `,
};

const Btn = styled.button<{
  $variant: NonNullable<Variant>;
  $size: Size;
  $loading: boolean;
  $animate?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: "Inter", sans-serif;
  cursor: pointer;
  white-space: nowrap;
  outline: none;
  box-sizing: border-box;
  letter-spacing: -0.01em;

  ${(p) => sizeStyles[p.$size]}
  ${(p) => variantStyles[p.$variant]}
  
  ${(p) =>
    p.$animate &&
    css`
    `}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
  }

  ${(p) =>
    p.$loading &&
    css`
      cursor: wait;
      opacity: 0.8;
    `}

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }
`;
