document.querySelector("#approve").addEventListener("click", async () => {
  const ok = await chrome.permissions.request({ permissions: ["history"] });
  document.querySelector("#status").textContent = ok
    ? "Approved. Return to the dashboard and click Approve & analyze."
    : "Permission was not granted. No history was read.";
});
document.querySelector("#revoke").addEventListener("click", async () => {
  await chrome.permissions.remove({ permissions: ["history"] });
  document.querySelector("#status").textContent =
    "History access revoked. Remove imported history in the dashboard too.";
});
