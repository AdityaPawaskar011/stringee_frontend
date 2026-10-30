import { lazy, Suspense, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { MessageSquare } from "lucide-react";

import { selectIntegrations } from "@/features/auth/slices/authSlice";

const SendSmsModal = lazy(() => import("./SendSmsModal"));

/**
 * "SMS" button that opens the Stringee SMS composer for one client. Renders
 * nothing while Stringee SMS is not set up (integrations.stringee_sms) or there
 * is no number. `className` styles the button to fit where it is placed.
 *
 * The composer is portalled to <body>: inside a grid row (transformed) a fixed
 * overlay would be positioned against the row, not the screen.
 */
export default function SendSmsButton({ phone, name, className = "", label = "SMS", iconSize = 16 }) {
  const integrations = useSelector(selectIntegrations);
  const [open, setOpen] = useState(false);

  if (!integrations.stringee_sms || !phone) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Send an SMS to this client"
        className={`inline-flex items-center justify-center gap-2 transition-smooth ${className}`}
      >
        <MessageSquare size={iconSize} strokeWidth={2.2} />
        {label && <span>{label}</span>}
      </button>
      {open &&
        createPortal(
          <Suspense fallback={null}>
            <SendSmsModal phone={phone} name={name} onClose={() => setOpen(false)} />
          </Suspense>,
          document.body,
        )}
    </>
  );
}
