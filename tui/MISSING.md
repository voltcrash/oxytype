# Terminal parity gaps

Web features that the terminal client omits or approximates. Update this list
whenever a client phase skips a feature, approximates it or hands it off to the
browser.

| Feature | Status (missing/approximated) | Reason | Approximation |
| --- | --- | --- | --- |
| Text-to-speech | missing | Browser speech synthesis API | Evaluate external speech support later |
| Sounds | missing | Browser audio playback | Evaluate terminal bell or native audio later |
| Custom fonts | missing | Terminal controls its font | Use the user's terminal font |
| Background images | missing | Terminal image support varies | Theme colors |
| Screenshots | missing | Browser canvas/DOM capture | Terminal capture or text export later |
| Visual funboxes | missing | CSS, DOM and animation effects | Terminal effects where feasible in G17 |
| Translucent theme colours | approximated | Terminals have no alpha channel | Composited onto the theme background |
| Theme colours without truecolor | approximated | 256-colour terminals | OpenTUI downsamples to the nearest xterm-256 colour |
