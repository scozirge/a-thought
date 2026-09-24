"""Local-only Unity Web preview, including WebAssembly MIME and fresh builds."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.js': 'application/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5174)
    parser.add_argument('--directory', default=str(Path(__file__).resolve().parents[1] / 'Builds' / 'Web'))
    args = parser.parse_args()
    root = Path(args.directory).resolve()
    if not (root / 'index.html').is_file():
        raise SystemExit(f'Web build missing: {root}')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(root)))
    print(f'RIVALS Web: http://localhost:{args.port}/', flush=True)
    server.serve_forever()
