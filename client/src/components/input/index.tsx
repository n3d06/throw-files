import styled from "styled-components";
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export const Input = (props: InputProps) => <StyledInput {...props} />;

/** MD3 outlined text field: 1dp outline, 2dp primary outline when focused. */
const StyledInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  box-shadow: inset 0 0 0 1px var(--md-outline);
  color: var(--md-on-surface);
  caret-color: var(--md-primary);
  border-radius: var(--md-shape-xs);
  font-size: 16px;
  line-height: 24px;
  padding: 0 16px;
  outline: none;
  transition: box-shadow 0.15s var(--md-ease-standard);

  &::placeholder {
    color: var(--md-on-surface-variant);
  }

  &:hover:not(:focus) {
    box-shadow: inset 0 0 0 1px var(--md-on-surface);
  }

  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--md-primary);
  }
`;
