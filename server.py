from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
PORT = 8000

class FixRoomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/__login":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8", errors="replace")
            fields = parse_qs(body, keep_blank_values=True)
            role = fields.get("role", ["student"])[0]
            requested_destination = fields.get("destination", [""])[0]
            allowed_destinations = {"/dashboard.html", "/staff.html", "/admin.html"}
            destination = requested_destination if requested_destination in allowed_destinations else (
                "/staff.html" if role == "staff" else "/dashboard.html"
            )
            # Authentication itself is intentionally handled by the browser's
            # local demo data layer before this POST. The server only receives
            # the native form submission so browser password managers recognize
            # this as a conventional login form. Never persist or log the password.
            self.send_response(303)
            self.send_header("Location", destination)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
        except Exception:
            self.send_error(400)

    def log_message(self, fmt, *args):
        # Do not print POST bodies or credentials. Keep normal static-file logs.
        if self.command == "POST":
            print(f"{self.address_string()} - POST {self.path}")
        else:
            super().log_message(fmt, *args)

if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), FixRoomHandler)
    print(f"FixRoomAUN demo server running at http://localhost:{PORT}/")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
