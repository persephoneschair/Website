# Local preview server: same as `python -m http.server`, but tells the
# browser never to cache, so edits always show up on reload.
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8834
http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
