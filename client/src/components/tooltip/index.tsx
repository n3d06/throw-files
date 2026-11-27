import { ReactNode } from "react";
import styled from "styled-components";

interface TooltipProps {
  title: ReactNode;
  children: ReactNode;
}

export const Tooltip = ({ title, children }: TooltipProps) => {
  if (title === undefined || title === null || title === "")
    return <>{children}</>;
  return (
    <Wrapper>
      {children}
      <Tip role="tooltip" aria-hidden="true">
        {title}
      </Tip>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;

  &:hover > span:last-child,
  &:focus-within > span:last-child {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0) scale(1);
  }
`;

const Tip = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px) scale(0.9);
  transform-origin: 50% 100%;
  transition:
    opacity 0.15s ease,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    visibility 0.15s;
  background: var(--floating-bg);
  border: none;
  box-shadow: var(--floating-shadow);
  color: var(--floating-fg);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  max-width: 260px;
  text-align: center;
  z-index: 500;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;

`;
