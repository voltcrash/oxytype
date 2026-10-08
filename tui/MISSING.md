# Terminal parity gaps

Stage A extracts shared logic. Terminal rendering starts in Stage D. These
browser features need terminal substitutes or a browser handoff; update this
list as each client feature ships.

| Feature | Status (missing/approximated) | Reason | Approximation |
| --- | --- | --- | --- |
| Text-to-speech | missing | Browser speech synthesis API | Evaluate external speech support later |
| Sounds | missing | Browser audio playback | Evaluate terminal bell or native audio later |
| Custom fonts | missing | Terminal controls its font | Use the user's terminal font |
| Background images | missing | Terminal image support varies | Theme colors |
| Screenshots | missing | Browser canvas/DOM capture | Terminal capture or text export later |
| Visual funboxes | missing | CSS, DOM and animation effects | Terminal effects where feasible in G17 |
