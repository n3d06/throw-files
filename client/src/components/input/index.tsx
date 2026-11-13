import styled from "styled-components";
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export const Input = (props: InputProps) => <StyledInput {...props} />;

const StyledInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
  border-radius: 3px;
  font-family: "Inter", sans-serif;
  font-size: 14px;
  padding: 0 14px;
  outline: none;

  &::placeholder {
    color: var(--text-muted);
  }

  &:hover {
    border-color: var(--border-medium);
    background: var(--bg-glass);
  }

  &:focus {
    border-color: var(--input-focus);
    background: var(--bg-glass);
  }
`;
