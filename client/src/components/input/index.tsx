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
  border-radius: 0;
  font-size: 13px;
  padding: 0 6px;
  outline: none;

  &::placeholder {
    color: var(--text-muted);
  }

  &:hover {
    box-shadow: inset 0 0 0 1px #171717;
  }

  &:focus {
    box-shadow: inset 0 0 0 1px var(--accent);
  }
`;
