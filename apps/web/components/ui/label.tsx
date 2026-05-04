import * as React from "react";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-xs font-medium uppercase tracking-wide text-neutral-500 ${className ?? ""}`} {...props} />;
}
