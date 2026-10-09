"""Exercise Stage G in the real CLI: replay, multiline save, export and handoff.

Uses isolated XDG directories and closed loopback ports; never uses an account
or opens the browser. Cold startup verifies the saved library independently.
"""

import fcntl
import json
import os
from pathlib import Path
import pty
import re
import select
import struct
import subprocess
import tempfile
import termios
import time


package = Path(__file__).resolve().parents[1]
# Direct bun: the TUI runs on the Bun runtime, not through vp.
bun = subprocess.check_output(
    ["bun", "-e", "console.log(process.execPath)"], cwd=package, text=True
).strip()


def launch(env):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
    child = subprocess.Popen(
        [bun, "run", "src/index.tsx"], cwd=package, env=env,
        stdin=slave, stdout=slave, stderr=slave, start_new_session=True,
    )
    os.close(slave)
    return child, master


def drain(master, output, duration=0.3):
    until = time.monotonic() + duration
    while time.monotonic() < until:
        if select.select([master], [], [], min(0.05, max(0, until - time.monotonic())))[0]:
            try:
                output.extend(os.read(master, 65536))
            except OSError:
                break


def send(master, output, value, duration=0.3):
    os.write(master, value if isinstance(value, bytes) else value.encode())
    drain(master, output, duration)


def command(master, output, name):
    send(master, output, b"\x10")  # Ctrl+P
    send(master, output, name)
    send(master, output, b"\r")


def close(child, master):
    if child.poll() is None:
        os.write(master, b"\x03")
        drain(master, bytearray())
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)
    os.close(master)


def screen(output):
    """Reconstruct changed cells; OpenTUI emits diff chunks between cursor moves."""
    cells = [[" "] * 80 for _ in range(24)]
    row = column = 0
    for token in re.findall(r"\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|[^\x1b]+", output.decode(errors="replace")):
        if token.startswith("\x1b["):
            if token.endswith("H") or token.endswith("f"):
                values = token[2:-1].split(";")
                row = int(values[0] or "1") - 1
                column = int(values[1] or "1") - 1 if len(values) > 1 else 0
            elif token == "\x1b[2J":
                cells = [[" "] * 80 for _ in range(24)]
            continue
        if token.startswith("\x1b"):
            continue
        for char in token:
            if char == "\r":
                column = 0
            elif char == "\n":
                row += 1
            elif ord(char) >= 32:
                if column >= 80:
                    column = 0
                    row += 1
                if 0 <= row < 24 and 0 <= column < 80:
                    cells[row][column] = char
                column += 1
    return "\n".join("".join(line) for line in cells)


with tempfile.TemporaryDirectory(prefix="oxytype-screens-pty-") as temporary:
    root = Path(temporary)
    config = root / "config" / "oxytype"
    data = root / "data" / "oxytype"
    config.mkdir(parents=True)
    data.mkdir(parents=True)
    settings = {"text": ["cat", "dog"], "mode": "repeat",
                "limit": {"mode": "word", "value": 2}, "pipeDelimiter": False}
    (config / "config.json").write_text(json.dumps({"mode": "custom"}))
    (data / "custom-texts.json").write_text(json.dumps({"current": settings, "texts": []}))
    env = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor",
               OXYTYPE_API_URL="http://127.0.0.1:9/api",
               OXYTYPE_ASSET_URL="http://127.0.0.1:9", OXYTYPE_TIMEOUT_MS="100",
               XDG_CONFIG_HOME=str(root / "config"), XDG_DATA_HOME=str(root / "data"),
               XDG_CACHE_HOME=str(root / "cache"))
    child, master = launch(env)
    output = bytearray()
    try:
        drain(master, output, 1.0)
        assert "typing test" in screen(output), screen(output)
        for char in "cat dog":
            send(master, output, char, 0.15)
        assert "100% acc" in screen(output), screen(output)
        send(master, output, "r")
        assert "last test replay" in screen(output), screen(output)
        send(master, output, b"\x1b[F")  # End
        send(master, output, "s")
        assert "2×" in screen(output), screen(output)

        command(master, output, "View custom")
        send(master, output, "n")
        send(master, output, b"\x1b[200~first\r\nsecond\tline\x1b[201~")
        send(master, output, b"\x1b")  # Finish editing
        send(master, output, "s")
        send(master, output, "pasted")
        send(master, output, b"\r")
        saved = json.loads((data / "custom-texts.json").read_text())
        assert saved["texts"][0]["name"] == "pasted"
        assert saved["texts"][0]["settings"]["text"] == ["first\nsecond\tline"]

        command(master, output, "Export settings file")
        exported = root / "exported.json"
        send(master, output, str(exported))
        send(master, output, b"\r")
        assert json.loads(exported.read_text())["mode"] == "custom"
        command(master, output, "Sign up in browser")
        assert "http://127.0.0.1:9/login" in screen(output), screen(output)
        send(master, output, b"\x03")
        assert child.wait(timeout=5) == 0
    finally:
        close(child, master)

    child, master = launch(env)
    cold = bytearray()
    try:
        drain(master, cold, 1.0)
        command(master, cold, "View custom")
        assert "pasted" in screen(cold), screen(cold)
        send(master, cold, b"\x03")
        assert child.wait(timeout=5) == 0
    finally:
        close(child, master)
    print(json.dumps({"terminal": "80x24 raw PTY", "replay": True,
                      "multilinePaste": True, "coldSavedText": True,
                      "configFileExport": True, "browserUrl": True, "exit": 0}))
