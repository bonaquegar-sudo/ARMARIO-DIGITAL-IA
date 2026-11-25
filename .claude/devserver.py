# Static dev server for src/ with caching disabled (preview only).
import functools, http.server, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(NoCache, directory="src")).serve_forever()
