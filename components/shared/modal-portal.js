"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Keep dialogs outside table markup and overflow containers. Wait for the
// client mount so server rendering and the first hydration render agree.
export default function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
