import { Link } from "react-router-dom";
import styled from "styled-components";
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
  padding: 0 12px 0 16px;
  height: 48px;
  background: var(--bg-primary);
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
`;

const LogoMark = styled.div`
  width: 20px;
  height: 20px;
  background: transparent;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const UploadIcon = ({ children }: { children: React.ReactNode }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#c0392b"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const LogoText = styled.span`
  font-family: Georgia, "Times New Roman", serif;
  font-size: 18px;
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
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--text-secondary);
  font-size: 17px;
  background: transparent;
  cursor: pointer;
  border: none;

  &:hover {
    background: #e5e5e5;
  }

`;

const NavAnchor = styled.a`
  ${navItemStyles}
`;
