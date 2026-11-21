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
  border: 2px solid #bcbcbc;
  border-top-color: var(--text-primary);
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
    padding: 0 10px;
    font-size: 12px;
    height: 24px;
  `,
  middle: css`
    padding: 0 14px;
    font-size: 13px;
    height: 28px;
  `,
  large: css`
    padding: 0 20px;
    font-size: 14px;
    height: 34px;
  `,
};

const variantStyles: Record<NonNullable<Variant>, ReturnType<typeof css>> = {
  primary: css`
    font-weight: 700;
    /* Default button: blue frame. */
    box-shadow: inset 0 0 0 2px var(--accent);
  `,
  secondary: css``,
  danger: css`
    color: var(--danger);
  `,
  success: css`
    color: var(--success);
  `,
  tertiary: css``,
  text: css`
    background: transparent;
    box-shadow: none;
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
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  border: none;
  border-radius: 0;
  background: var(--w-face);
  color: var(--text-primary);
  box-shadow: var(--bevel-out);

  ${(p) => sizeStyles[p.$size]}
  ${(p) => variantStyles[p.$variant]}

  &:hover:not(:disabled) {
    background: var(--hover-bg);
    box-shadow: var(--hover-shadow);
  }

  &:active:not(:disabled) {
    background: var(--press-bg);
    box-shadow: var(--press-shadow);
  }

  &:disabled {
    color: #a0a0a0;
    background: #cccccc;
    box-shadow: inset 0 0 0 1px #bfbfbf;
    cursor: default;
  }

  ${(p) =>
    p.$loading &&
    css`
      cursor: wait;
    `}

  &:focus-visible {
    outline: 1px dotted var(--text-primary);
    outline-offset: -4px;
  }
`;
