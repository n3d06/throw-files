// Self-hosted Roboto (the CSP only allows fonts from this origin). Each file is
// split by unicode-range, so browsers fetch only the subsets a page uses.
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto-mono/500.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { unregisterServiceWorkers } from "./serviceWorker";

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");

createRoot(container).render(<App />);

void unregisterServiceWorkers();
