const allowed = () =>
  (location.origin === "https://jilliankoppy.github.io" &&
    location.pathname.startsWith("/Consumer-Profile-Dashboard/")) ||
  (location.origin === "http://localhost:5173" &&
    location.pathname.startsWith("/Consumer-Profile-Dashboard/"));
const send = (data) =>
  window.postMessage({ channel: "orbit-extension", ...data }, location.origin);
window.addEventListener("message", async (e) => {
  if (
    e.source !== window ||
    e.origin !== location.origin ||
    !allowed() ||
    e.data?.channel !== "orbit-dashboard"
  )
    return;
  if (e.data.type === "ping") {
    send({ type: "ready" });
    return;
  }
  if (e.data.type === "disconnect") {
    chrome.runtime.sendMessage({ type: "disconnect" });
    return;
  }
  if (
    e.data.type !== "history" ||
    typeof e.data.requestId !== "string" ||
    ![7, 30, 90].includes(e.data.days)
  )
    return;
  try {
    const response = await chrome.runtime.sendMessage({
      type: "history",
      days: e.data.days,
    });
    send({ ...response, requestId: e.data.requestId });
  } catch {
    send({
      type: "error",
      message:
        "Open the Orbit extension toolbar popup and approve history access, then try again.",
      requestId: e.data.requestId,
    });
  }
});
if (allowed()) send({ type: "ready" });
