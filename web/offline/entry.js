import { installNetworkGuard } from "./networkGuard.js";
import { setPreviewRole } from "./supabase.js";
import "./preview.css";

installNetworkGuard(window);
document.getElementById("mock-admin").onclick = () => setPreviewRole("admin");
document.getElementById("mock-user").onclick = () => setPreviewRole("viewer");
document.getElementById("mock-out").onclick = () => setPreviewRole(null);
// Dynamic import guarantees the guard is installed before application initialization.
await import("../src/main.jsx");
