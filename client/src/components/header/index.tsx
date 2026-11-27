import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { Github, Moon, Sun } from "lucide-react";
import {
  currentTheme,
  onSystemThemeChange,
  savedTheme,
  setTheme,
  type Theme,
} from "../../utils/theme";

const slideDown = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const spinIn = keyframes`
  from { opacity: 0; transform: rotate(-90deg) scale(0.6); }
  to { opacity: 1; transform: rotate(0) scale(1); }
`;

export const Header = () => {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  // Until the user picks one, keep following the OS as it changes.
  useEffect(
    () =>
      onSystemThemeChange((system) => {
        if (!savedTheme()) setThemeState(system);
      }),
    [],
  );

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

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
        <NavButton
          type="button"
          onClick={toggleTheme}
          title={label}
          aria-label={label}
        >
          <ThemeIcon key={theme} aria-hidden="true">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </ThemeIcon>
        </NavButton>
        <NavAnchor
          href="https://github.com/n3d06/throw-files"
          target="_blank"
          rel="noopener noreferrer"
          title="View Source on GitHub"
          aria-label="View Source on GitHub"
        >
          <Github size={20} />
        </NavAnchor>
      </NavActions>
    </HeaderContainer>
  );
};

/** MD3 small top app bar: 64dp, surface colour, Title large. */
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
  height: 64px;
  background: var(--md-surface);
  animation: ${slideDown} 0.4s var(--md-ease-emphasized-decelerate) both;
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  border-radius: var(--md-shape-full);
  padding-right: 8px;
`;

const LogoMark = styled.div`
  width: 40px;
  height: 40px;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  border-radius: var(--md-shape-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-radius 0.3s var(--md-ease-standard);

  a:hover > & {
    border-radius: var(--md-shape-full);
  }
`;

const UploadIcon = ({ children }: { children: React.ReactNode }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

/** Title large: 22/28, regular. */
const LogoText = styled.span`
  font-size: 22px;
  font-weight: 400;
  line-height: 28px;
  letter-spacing: 0;
  color: var(--md-on-surface);
`;

const NavActions = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
`;

/** Standard icon button: 40dp, round state layer. */
const navItemStyles = `
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--md-shape-full);
  color: var(--md-on-surface-variant);
  background: transparent;
  cursor: pointer;
  border: none;
  transition: background 0.15s var(--md-ease-standard);

  &:hover {
    background: color-mix(in srgb, var(--md-on-surface-variant) 8%, transparent);
  }

  &:active {
    background: color-mix(in srgb, var(--md-on-surface-variant) 10%, transparent);
  }
`;

const NavAnchor = styled.a`
  ${navItemStyles}
`;

const NavButton = styled.button`
  ${navItemStyles}
`;

const ThemeIcon = styled.span`
  display: flex;
  animation: ${spinIn} 0.4s var(--md-ease-emphasized-decelerate) both;
`;
