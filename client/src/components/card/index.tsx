import styled from "styled-components";
import { CSSProperties, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  isWarning?: boolean;
}

export const Card = ({ isWarning, style, ...props }: CardProps) => {
  const combinedStyle: CSSProperties = isWarning
    ? { ...style, outline: "1px solid var(--accent-primary)" }
    : { ...style };
  return <GlassCard style={combinedStyle} {...props} />;
};

export const CardBody = styled.div`
  padding: 16px;

  @media (min-width: 1024px) {
    padding: 24px;
  }
`;

export const CardHeader = ({
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{
      padding: "8px 16px",
      borderBottom: "1px solid var(--border-subtle)",
      fontWeight: 600,
      ...style,
    }}
    {...props}
  />
);

const GlassCard = styled.div`
  background: var(--bg-card);
  box-shadow: var(--shadow-xl);
  border-radius: var(--radius-lg);
  position: relative;
  color: var(--text-primary);
`;
