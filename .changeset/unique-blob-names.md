---
"@dugynoo/huly-mcp": patch
---

Fix file uploads overwriting each other: blobs were stored under the original filename, so two attachments named e.g. `email.txt` shared one blob and the later upload replaced the earlier one everywhere. Uploads now use a unique object name (UUID + extension); the attachment keeps the original filename for display.
