"use client";

import { type ComponentProps } from "react";

/** A native select that submits its form on change (the form still works without JS). */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
