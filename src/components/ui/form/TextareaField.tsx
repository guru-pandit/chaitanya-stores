import { TextareaHTMLAttributes, forwardRef } from "react";
import { FormField } from "./FormField";
import { fieldInputClasses } from "./styles";

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, hint, id, className = "", required, ...props }, ref) => (
    <FormField label={label} htmlFor={id!} error={error} hint={hint} required={required}>
      {/* No native `required` attribute — see TextField for why. */}
      <textarea ref={ref} id={id} className={`${fieldInputClasses} ${className}`} {...props} />
    </FormField>
  )
);
TextareaField.displayName = "TextareaField";
