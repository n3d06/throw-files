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
    transform: translateX(-50%) translateY(-4px);
  }
`;

const Tip = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(0);
  background: #f2f2f2;
  border: 1px solid #767676;
  color: #575757;
  font-size: 12px;
  line-height: 1.5;
  padding: 2px 6px;
  border-radius: 0;
  white-space: pre-wrap;
  max-width: 260px;
  text-align: center;
  z-index: 500;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;

`;
