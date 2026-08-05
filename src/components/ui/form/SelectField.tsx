import { SelectHTMLAttributes, forwardRef } from "react";
import { FormField } from "./FormField";
import { fieldBaseClasses } from "./styles";
import { Select } from "@/components/ui/Select";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id, className = "", required, children, ...props }, ref) => (
    <FormField label={label} htmlFor={id!} error={error} required={required}>
      {/* No native `required` attribute — see TextField for why. */}
      <Select ref={ref} id={id} className={`${fieldBaseClasses} pl-3 ${className}`} {...props}>
        {children}
      </Select>
    </FormField>
  )
);
SelectField.displayName = "SelectField";
