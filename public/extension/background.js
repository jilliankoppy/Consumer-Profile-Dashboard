function authorized(sender) {
  try {
    const u = new URL(sender.url);
    return (
      (u.origin === "https://jilliankoppy.github.io" ||
        u.origin === "http://localhost:5173") &&
      u.pathname.startsWith("/Consumer-Profile-Dashboard/")
    );
  } catch {
    return false;
  }
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!authorized(sender) || !msg || typeof msg !== "object") return;
  if (msg.type === "disconnect") {
    chrome.permissions
      .remove({ permissions: ["history"] })
      .then(() => reply({ type: "disconnected" }));
    return true;
  }
  if (msg.type !== "history" || ![7, 30, 90].includes(msg.days)) return;
  (async () => {
    const approved = await chrome.permissions.contains({
      permissions: ["history"],
    });
    if (!approved) {
      reply({
        type: "error",
        message:
          "Click the Orbit extension in your Chrome toolbar and approve history access. Then return and analyze your chosen period.",
      });
      await chrome.action.openPopup();
      return;
    }
    const records = await chrome.history.search({
      text: "",
      startTime: Date.now() - msg.days * 86400000,
      maxResults: 10000,
    });
    reply({
      type: "history",
      records: records.map((r) => ({
        url: r.url,
        title: r.title,
        lastVisitTime: r.lastVisitTime,
      })),
    });
  })().catch(() =>
    reply({
      type: "error",
      message:
        "History access was not granted or is unavailable. Use an export instead.",
    }),
  );
  return true;
});
