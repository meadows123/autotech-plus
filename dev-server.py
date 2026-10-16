"""Local preview server that disables browser caching, so edits always show on refresh."""
import http.server
import socketserver


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", 8080), NoCacheHandler) as httpd:
    print("Serving AutoTech Plus on http://localhost:8080")
    httpd.serve_forever()
