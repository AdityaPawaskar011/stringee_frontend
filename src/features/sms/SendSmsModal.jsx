import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, MessageSquare, Send, X } from "lucide-react";

import { selectMaskPii } from "@/features/auth/slices/authSlice";
import { useSendStringeeSmsMutation } from "@/services";
import { maskPhone } from "@/shared/lib/mask";
import { useToast } from "@/shared/hooks/useToast";

// Same limit as the API (config.STRINGEE_SMS_MAX_CHARS).
const MAX_CHARS = 1000;

// GSM-7 text fits 160 characters in one SMS (153 per part when split); anything
// else (Hindi, emoji, curly quotes) goes as Unicode: 70, or 67 per part.
const GSM_RE = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/;

function smsParts(text) {
  if (!text) return 0;
  const [single, multi] = GSM_RE.test(text) ? [160, 153] : [70, 67];
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

/**
 * Compose and send one SMS to a client through Stringee (POST /stringee/send-sms).
 * Open to every role. `phone` is the client's number as stored; it is shown masked
 * when the user may not see PII, and the server normalises it.
 */
export default function SendSmsModal({ phone, name, onClose }) {
  const maskPii = useSelector(selectMaskPii);
  const { success, error } = useToast();
  const [message, setMessage] = useState("");
  const [sendSms, { isLoading }] = useSendStringeeSmsMutation();

  const text = message.trim();
  const parts = smsParts(text);
  const canSend = !!text && text.length <= MAX_CHARS && !isLoading;

  const send = async () => {
    if (!canSend) return;
    try {
      await sendSms({ phone_number: phone, message: text }).unwrap();
      success("SMS sent");
      onClose();
    } catch (e) {
      error(typeof e?.data?.detail === "string" ? e.data.detail : "Could not send the SMS. Please try again.");
    }
  };

  const onKeyDown = (e) => {
    // Esc closes only this dialog, not one it was opened from.
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" onKeyDown={onKeyDown}>
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-sms-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl animate-pop-in"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <h3 id="send-sms-title" className="text-sm font-semibold text-foreground">Send SMS</h3>
              <p className="truncate text-xs text-muted-foreground">
                {name ? `${name} · ` : ""}
                <span className="font-mono">{maskPii ? maskPhone(phone) : phone}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-smooth"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 px-4 py-3">
          <textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={MAX_CHARS}
            placeholder="Type your message…"
            className="w-full resize-y rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Ctrl + Enter to send</span>
            <span className="font-mono-nums">
              {text.length}/{MAX_CHARS}
              {parts > 1 && ` · ${parts} SMS`}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-smooth"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
