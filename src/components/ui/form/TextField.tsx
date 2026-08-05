import { InputHTMLAttributes, forwardRef } from "react";
import { FormField } from "./FormField";
import { fieldInputClasses } from "./styles";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, id, className = "", required, ...props }, ref) => (
    <FormField label={label} htmlFor={id!} error={error} hint={hint} required={required}>
      {/* No native `required` attribute — that triggers the browser's own
          validation popup, which preempts our themed Zod/react-hook-form
          error message below the field. */}
      <input ref={ref} id={id} className={`${fieldInputClasses} ${className}`} {...props} />
    </FormField>
  )
);
TextField.displayName = "TextField";
