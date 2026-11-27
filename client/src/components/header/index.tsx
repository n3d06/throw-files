import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";

const slideDown = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0) scale(1.1); }
  25% { transform: rotate(-12deg) scale(1.1); }
  75% { transform: rotate(12deg) scale(1.1); }
`;
import { Github } from "lucide-react";

export const Header = () => {
  return (
    <HeaderContainer>
      <LogoLink to="/">
        <LogoMark>
          <UploadIcon>
            <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" />
          </UploadIcon>
        </LogoMark>
        <LogoText>ThrowMyFile</LogoText>
      </LogoLink>
      <NavActions aria-label="Main navigation">
        <NavAnchor
          href="https://github.com/n3d06/throw-files"
          target="_blank"
          rel="noopener noreferrer"
          title="View Source on GitHub"
          aria-label="View Source on GitHub"
        >
          <Github size={16} />
        </NavAnchor>
      </NavActions>
    </HeaderContainer>
  );
};

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 16px;
  height: 48px;
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
  animation: ${slideDown} 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both;
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
`;

const LogoMark = styled.div`
  width: 28px;
  height: 28px;
  background: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-radius 0.25s, background 0.25s;

  a:hover > & {
    border-radius: 30%;
    background: var(--accent-hover);
    animation: ${wiggle} 0.5s ease-in-out;
  }
`;

const UploadIcon = ({ children }: { children: React.ReactNode }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffffff"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const LogoText = styled.span`
  font-size: 16px;
  font-weight: 600;
  line-height: 20px;
  color: var(--title-fg);
`;

const NavActions = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const navItemStyles = `
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 17px;
  background: transparent;
  cursor: pointer;
  border: none;
  transition: background 0.15s, color 0.15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    color: var(--title-fg);
    background: var(--bg-modifier-hover);
    transform: rotate(-10deg) scale(1.1);
  }

`;

const NavAnchor = styled.a`
  ${navItemStyles}
`;
