import { InputHTMLAttributes, forwardRef } from "react";

type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, ...props }, ref) => (
    <label className="flex items-center gap-2 text-sm text-charcoal">
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-maroon/30 text-terracotta focus:ring-terracotta"
        {...props}
      />
      {label}
    </label>
  )
);
CheckboxField.displayName = "CheckboxField";
