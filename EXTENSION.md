# Chrome distribution preparation

Package: `public/orbit-extension.zip`. Source: `public/extension/`. Manifest V3, optional `history` permission only; content scripts restricted to the authorized GitHub Pages project and local development origin. No cookie, credential, token, tabs, storage, or remote-code permissions. Icons at 16, 48 and 128 pixels are included.

## Privacy disclosure draft

Orbit reads website URLs, page titles and last-visit timestamps for the period you choose, only after you approve optional Chrome history permission and start analysis. It passes those records to the authorized Orbit page in your browser; they are not sent to a server, sold, used for advertising, or passed to external AI services. The extension stores no history. The dashboard holds data in tab memory until refresh, close or explicit deletion. Disconnect revokes permission and removes Chrome-sourced records. You can also revoke through Chrome or uninstall. Removing permission separately does not clear data already in an open dashboard tab.

History is limited to 10,000 distinct URL entries, with last visit timestamps. It is not an exhaustive visit log. Content script access is limited to this project's dashboard, necessary to establish a local message bridge. Product capture is not implemented; use product URLs or catalog imports instead.

## Permission justification

`history` is requested as an **optional** permission from an extension-owned popup, after a clear explanation. It is required to answer the user's request to analyze a selected recent history period. The background worker validates sender origin/path and allowed period before reading history. It transfers only URL, title and lastVisitTime; visit counts, IDs and other fields are omitted.

## Before submitting to Chrome Web Store

- Test an actual unpacked installation and native optional permission prompt in the supported Chrome version.
- Verify denied permissions, disconnected permission, malformed messages, wrong origins and complete uninstall.
- Host the final privacy policy at a public URL; supply the developer's real support contact and required store account details.
- Create accurate listing screenshots from an authorized empty-state or consented dataset, avoiding private records.
- Complete the Web Store data-use disclosures for browsing activity and confirm compliance with current store policies.
- Submit for review. Add a store install URL only once an approved listing exists.

No store account, submission, public listing or approval is claimed.
