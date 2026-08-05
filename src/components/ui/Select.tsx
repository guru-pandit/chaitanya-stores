import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

// Native <select> arrows sit flush against the edge on rounded/pill inputs and
// look cramped. This hides the native arrow and draws our own with proper
// spacing, while callers still control border/background/shape via className.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", wrapperClassName = "", children, ...props }, ref) => (
    <div className={`relative ${wrapperClassName}`}>
      <select
        ref={ref}
        className={`w-full appearance-none pr-10 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal/40"
      />
    </div>
  )
);
Select.displayName = "Select";
