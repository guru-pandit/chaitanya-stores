import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

const variantClasses = {
  primary: "bg-terracotta text-cream hover:bg-terracotta-dark",
  secondary: "bg-maroon text-cream hover:bg-maroon-dark",
  gold: "bg-gold text-maroon-dark hover:bg-gold-light",
  ghost: "bg-transparent text-maroon border border-maroon/30 hover:bg-maroon/5",
} as const;

type Variant = keyof typeof variantClasses;

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant };

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <a ref={ref} className={`${base} ${variantClasses[variant]} ${className}`} {...props} />
  )
);
LinkButton.displayName = "LinkButton";
