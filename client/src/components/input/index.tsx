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
  border: none;
  box-shadow: var(--bevel-in);
  color: var(--text-primary);
  border-radius: var(--radius-pill);
  font-size: 16px;
  padding: 0 10px;
  outline: none;

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    box-shadow: inset 0 0 0 1px var(--accent);
  }
`;
