import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";
import { installGlobalErrorHandlers } from "@/shared/lib/errorLogger";
import { bootBranding } from "@/shared/theme/branding";
import { installCrossTabAuthSync } from "@/shared/lib/crossTabAuth";

installGlobalErrorHandlers();
// A sign-in or sign-out in another tab replaces this tab's login too: follow it.
installCrossTabAuthSync();
// Paint the last-seen client's logo and colours before the first render, so a
// client's users never see another brand flash in first.
bootBranding();

createRoot(document.getElementById("root")).render(<App />);
