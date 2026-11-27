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

const sizeStyles: Record<Size, ReturnType<typeof css>> = {
  small: css`
    padding: 0 12px;
    font-size: 13px;
    height: 30px;
  `,
  middle: css`
    padding: 0 16px;
    font-size: 14px;
    height: 36px;
  `,
  large: css`
    padding: 0 22px;
    font-size: 15px;
    height: 44px;
  `,
};

const variantStyles: Record<NonNullable<Variant>, ReturnType<typeof css>> = {
  primary: css`
    background: var(--accent);
    color: #fff;
    box-shadow: none;
    font-weight: 500;

    &&:hover:not(:disabled) {
      background: var(--accent-hover);
      box-shadow: none;
    }

    &&:active:not(:disabled) {
      background: var(--accent-hover);
      box-shadow: none;
      transform: scale(0.95);
    }
  `,
  secondary: css``,
  danger: css`
    background: var(--danger);
    color: #fff;

    &&:hover:not(:disabled),
    &&:active:not(:disabled) {
      background: var(--danger-hover);
    }
  `,
  success: css`
    background: var(--success);
    color: #fff;

    &&:hover:not(:disabled),
    &&:active:not(:disabled) {
      background: var(--success-hover);
    }
  `,
  tertiary: css``,
  text: css`
    background: transparent;
    box-shadow: none;
    color: var(--text-link);

    &&:hover:not(:disabled),
    &&:active:not(:disabled) {
      background: transparent;
      text-decoration: underline;
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
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  border: none;
  border-radius: var(--radius-pill);
  font-weight: 500;
  transition:
    background 0.17s,
    box-shadow 0.2s,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: var(--w-face);
  color: #fff;
  box-shadow: none;

  ${(p) => sizeStyles[p.$size]}
  ${(p) => variantStyles[p.$variant]}

  &:hover:not(:disabled) {
    background: var(--hover-bg);
    box-shadow: var(--hover-shadow);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    background: var(--press-bg);
    box-shadow: var(--press-shadow);
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  ${(p) =>
    p.$loading &&
    css`
      cursor: wait;
    `}
`;
