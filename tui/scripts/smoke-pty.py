"""Run the actual CLI in a raw 80x24 PTY, save a test, reopen history, quit."""

import fcntl
import json
import os
from pathlib import Path
import pty
import select
import struct
import subprocess
import tempfile
import termios
import time


package = Path(__file__).resolve().parents[1]
# Resolve before XDG overrides: package-manager shims may otherwise download Bun.
bun = os.environ.get("OXYTYPE_SMOKE_BUN") or subprocess.check_output(
    ["bun", "-e", "console.log(process.execPath)"], cwd=package, text=True
).strip()
binary = os.environ.get("OXYTYPE_SMOKE_BIN")


def launch(env):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
    child = subprocess.Popen(
        [bun, binary] if binary else [bun, "run", "src/index.tsx"],
        cwd=Path(binary).parent if binary else package,
        env=env,
        stdin=slave,
        stdout=slave,
        stderr=slave,
        start_new_session=True,
    )
    os.close(slave)
    return child, master


def drain(master, output, duration):
    until = time.monotonic() + duration
    while time.monotonic() < until:
        if select.select([master], [], [], min(0.05, max(0, until - time.monotonic())))[0]:
            try:
                output.extend(os.read(master, 65536))
            except OSError:
                break


def close(child, master):
    if child.poll() is None:
        child.terminate()
        child.wait(timeout=5)
    os.close(master)


with tempfile.TemporaryDirectory(prefix="oxytype-pty-") as temporary:
    base = Path(temporary)
    config = base / "config" / "oxytype"
    config.mkdir(parents=True)
    (config / "config.json").write_text(json.dumps({
        "mode": "custom", "quickRestart": "tab",
        "paceCaret": "custom", "paceCaretCustomSpeed": 65,
    }))
    env = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor",
               XDG_CONFIG_HOME=str(base / "config"),
               XDG_DATA_HOME=str(base / "data"),
               XDG_CACHE_HOME=str(base / "cache"))
    child, master = launch(env)
    output = bytearray()
    try:
        drain(master, output, 1.2)
        assert b"typing test" in output, bytes(output)[-2000:]
        os.write(master, b"\x1b[17~")  # F6: default custom 9 -> 10 words
        drain(master, output, 0.4)
        for char in "The quick brown fox jumps over the lazy dog The":
            os.write(master, char.encode())
            drain(master, output, 0.12)
        drain(master, output, 0.6)
        history_file = base / "data" / "oxytype" / "history.json"
        history = json.loads(history_file.read_text())
        assert len(history["entries"]) == 1
        result = history["entries"][0]["result"]
        assert result["client"] == "tui" and result["offline"] is True
        assert result["mode"] == "custom" and result["acc"] == 100
        assert result["charStats"] == [47, 0, 0, 0]
        assert result["customText"]["limit"] == {"mode": "word", "value": 10}
        os.write(master, b"\x03")
        drain(master, output, 0.3)
        assert child.wait(timeout=5) == 0
    finally:
        close(child, master)

    # Cold startup reads the saved result independently of the previous process.
    child, master = launch(env)
    reopened = bytearray()
    try:
        drain(master, reopened, 1.2)
        os.write(master, b"\x0f")  # Ctrl+O: local history
        drain(master, reopened, 0.3)
        assert b"1 tests" in reopened, bytes(reopened)[-2000:]
        os.write(master, b"\x03")
        drain(master, reopened, 0.3)
        assert child.wait(timeout=5) == 0
    finally:
        close(child, master)

    print(json.dumps({
        "terminal": "80x24 raw PTY", "accuracy": result["acc"],
        "characters": result["charStats"], "savedResults": len(history["entries"]),
        "reopenedHistory": True, "exit": 0,
        "rgbOutput": b"38;2;" in output, "cursorStyles": b" q" in output,
    }))
