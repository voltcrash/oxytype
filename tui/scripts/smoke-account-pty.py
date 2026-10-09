"""Exercise the actual CLI: device login, PB, offline queue, cold recovery/logout/assets.

HTTP consent/results are fixtures. The D1 test independently verifies the real backend.
Browser launchers are stubbed only within the child's PATH; no real account is used.
"""

import fcntl
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import pty
import select
import struct
import subprocess
import tempfile
import termios
import threading
import time


package = Path(__file__).resolve().parents[1]
# Direct bun: the TUI runs on the Bun runtime, not through vp.
bun = subprocess.check_output(
    ["bun", "-e", "console.log(process.execPath)"], cwd=package, text=True
).strip()
state = {"online": True, "polls": 0, "revoked": False, "language": "english"}
results = []


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def respond(self, data, status=200):
        encoded = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if not state["online"]:
            return self.respond({"message": "offline fixture"}, 503)
        if self.path == "/api/auth/get-session":
            assert self.headers.get("Authorization") == "Bearer pty-session"
            return self.respond({
                "session": {"expiresAt": "2099-01-01T00:00:00.000Z"},
                "user": {"id": "pty-user", "name": "PTY account"},
            })
        if self.path == "/api/configs":
            return self.respond({"message": "ok", "data": {
                "mode": "custom", "theme": "nord", "language": state["language"],
            }})
        if self.path == "/version.json":
            return self.respond({"version": "pty-assets-v1"})
        if self.path == "/languages/french.json":
            assert self.headers.get("Authorization") is None
            return self.respond({"name": "french", "words": ["bonjour", "monde"]})
        self.respond({"message": "unknown route"}, 404)

    def do_PATCH(self):
        assert self.path == "/api/configs"
        self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self.respond({"message": "saved"})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
        if not state["online"]:
            return self.respond({"message": "offline fixture"}, 503)
        assert self.headers.get("Origin") is None
        if self.path == "/api/auth/device/code":
            assert body["client_id"] == "oxytype-tui"
            return self.respond({
                "device_code": "pty-device-secret", "user_code": "PTY-1234",
                "verification_uri": f"http://127.0.0.1:{self.server.server_port}/device",
                "expires_in": 60, "interval": 1,
            })
        if self.path == "/api/auth/device/token":
            state["polls"] += 1
            if state["polls"] == 1:
                return self.respond({"error": "authorization_pending"}, 400)
            return self.respond({"access_token": "pty-session", "token_type": "Bearer", "expires_in": 3600})
        assert self.headers.get("Authorization") == "Bearer pty-session"
        if self.path == "/api/auth/sign-out":
            state["revoked"] = True
            return self.respond({"status": True})
        assert self.path == "/api/results"
        result = body["result"]
        assert result["uid"] == "pty-user" and result["client"] == "tui"
        results.append(result)
        self.respond({"message": "saved", "data": {
            "insertedId": f"pty{len(results)}", "isPb": not result["offline"],
            "tagPbs": [], "xp": 0, "dailyXpBonus": False,
            "xpBreakdown": {}, "streak": 1,
        }})


def launch(env):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
    child = subprocess.Popen(
        [bun, "run", "src/index.tsx"], cwd=package, env=env,
        stdin=slave, stdout=slave, stderr=slave, start_new_session=True,
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


def stop(child, master, output):
    os.write(master, b"\x03")
    drain(master, output, 0.3)
    assert child.wait(timeout=5) == 0, bytes(output)[-2000:]
    os.close(master)


def finish(master, output):
    os.write(master, b"\x14")  # Ctrl+T
    drain(master, output, 0.3)
    os.write(master, b"\x1b[17~")  # F6: custom nine -> ten words
    drain(master, output, 0.3)
    for char in "The quick brown fox jumps over the lazy dog The":
        os.write(master, char.encode())
        drain(master, output, 0.1)
    drain(master, output, 0.4)


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with tempfile.TemporaryDirectory(prefix="oxytype-account-pty-") as temporary:
        root = Path(temporary)
        launchers = root / "bin"
        launchers.mkdir()
        for name in ["open", "xdg-open"]:
            launcher = launchers / name
            launcher.write_text('#!/bin/sh\nprintf "%s\\n" "$1" > "$OXYTYPE_BROWSER_RECORD"\n')
            launcher.chmod(0o700)
        base_url = f"http://127.0.0.1:{server.server_port}"
        env = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor",
                   PATH=str(launchers) + os.pathsep + os.environ["PATH"],
                   OXYTYPE_BROWSER_RECORD=str(root / "browser.txt"),
                   OXYTYPE_API_URL=base_url + "/api", OXYTYPE_ASSET_URL=base_url,
                   OXYTYPE_TIMEOUT_MS="1000",
                   XDG_CONFIG_HOME=str(root / "config"), XDG_DATA_HOME=str(root / "data"),
                   XDG_CACHE_HOME=str(root / "cache"))
        credentials = root / "data" / "oxytype" / "credentials.json"
        queue = root / "data" / "oxytype" / "uploads.json"
        child, master = launch(env)
        output = bytearray()
        try:
            drain(master, output, 1.0)
            os.write(master, b"\x01\r")  # Ctrl+A then enter: device login
            drain(master, output, 0.5)
            assert b"PTY-1234" in output, bytes(output)[-2000:]
            assert b"pty-device-secret" not in output and b"pty-session" not in output
            drain(master, output, 2.0)
            assert credentials.stat().st_mode & 0o777 == 0o600
            assert (root / "browser.txt").read_text().strip() == base_url + "/device"
            finish(master, output)
            assert len(results) == 1 and results[0]["offline"] is False, bytes(output)[-6000:]
            assert b"new TUI PB" in output, bytes(output)[-2000:]
            stop(child, master, output)
        finally:
            if child.poll() is None:
                child.kill()
                child.wait()
                os.close(master)

        state["online"] = False
        child, master = launch(env)
        offline = bytearray()
        try:
            drain(master, offline, 1.0)
            finish(master, offline)
            stored = json.loads(queue.read_text())
            assert len(stored["entries"]) == 1 and stored["entries"][0]["result"]["offline"] is True
            stop(child, master, offline)
        finally:
            if child.poll() is None:
                child.kill()
                child.wait()
                os.close(master)

        state.update(online=True, language="french")
        child, master = launch(env)
        recovered = bytearray()
        try:
            drain(master, recovered, 1.5)
            assert len(results) == 2 and results[1]["offline"] is True
            assert json.loads(queue.read_text())["entries"] == []
            assert list((root / "cache" / "oxytype" / "remote").glob("*/languages/french.json"))
            os.write(master, b"\x01l")  # Account, logout
            drain(master, recovered, 0.4)
            assert state["revoked"] and not credentials.exists()
            stop(child, master, recovered)
        finally:
            if child.poll() is None:
                child.kill()
                child.wait()
                os.close(master)

        state["online"] = False
        child, master = launch(env)
        cached = bytearray()
        try:
            drain(master, cached, 1.0)
            assert b"french" in cached and b"not available offline" not in cached
            stop(child, master, cached)
        finally:
            if child.poll() is None:
                child.kill()
                child.wait()
                os.close(master)
        print(json.dumps({"terminal": "80x24 raw PTY", "deviceLogin": True,
                          "credentialMode": "0600", "onlinePB": True,
                          "recoveredOfflineUpload": True, "revoked": True,
                          "coldOfflineFrench": True, "exit": 0}))
finally:
    server.shutdown()
    server.server_close()
