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
| Smooth and decorative carets | approximated | Terminal cursor styles and cell positions | Native line/block/underline; outline uses block, decorative shapes use line; smooth movement off |
| Typo hints below letters | approximated | Cell grid | Both inline and below hints replace the incorrect target letter |
| Separate word-error underline colour | approximated | Terminals underline using the foreground colour | Underlined committed words retain their letter colours |
| Timer/live-stat sizes and bars | approximated | Fixed terminal cells | Numeric text; shared flash visibility, speed-unit and blind-mode rules |
| Result chart interaction | approximated | Terminal text and limited columns | Block sparklines for WPM/raw/errors; bucket long series, preserve error peaks; hide charts below 22 rows |
| Raw terminal key holds | approximated | Legacy protocols omit key releases | Real press spacing; core zero-duration placeholders; record Kitty releases when available |
| Modified restart/finish keys | approximated | Legacy terminals may encode Shift+Enter/Esc like the plain key | Ctrl+R restart, F7 repeat and F8 finish alternatives |
| Tagged pace PBs | missing | Tags arrive with Stage G | Local PB, average, daily, last and custom pace |
| Word funboxes | missing | Funbox controls arrive in G16 | Explicit notice and a standard test; never label results with inactive effects |
| Browser launch on headless terminals | approximated | A local browser launcher may be unavailable | Always show the device URL/code; keep polling while the user approves in another browser |
| Bidirectional and joining-script shaping | approximated | Terminal cell order and shaping vary; the word renderer lays out logical characters | Downloaded languages retain their text; terminal handles glyph shaping, without a separate bidi layout engine |
