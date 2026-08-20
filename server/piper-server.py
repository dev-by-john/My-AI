from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess
import tempfile
import os

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

PIPER = os.path.join(
    BASE_DIR,
    "piper",
    "piper.exe"
)

MODEL = os.path.join(
    BASE_DIR,
    "models",
    "piper",
    "en_US-lessac-medium.onnx"
)

CONFIG = os.path.join(
    BASE_DIR,
    "models",
    "piper",
    "en-US-lessac-medium.onnx.json"
)

class PiperHandler(BaseHTTPRequestHandler):

    def do_POST(self):

        if self.path != "/speak":
            self.send_response(404)
            self.end_headers()
            return

        length = int(
            self.headers.get(
                "Content-Length",
                0
            )
        )

        text = self.rfile.read(
            length
        ).decode("utf-8")

        print("🎤 Piper:", text)

        with tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False
        ) as temp:

            output_file = temp.name

        try:

            subprocess.run(
                [
                    PIPER,
                    "--model",
                    MODEL,
                    "--config",
                    CONFIG,
                    "--output_file",
                    output_file,
                    "--quiet"
                ],
                input=text,
                text=True,
                check=True
            )

            with open(
                output_file,
                "rb"
            ) as f:

                audio = f.read()

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "audio/wav"
            )

            self.send_header(
                "Content-Length",
                str(len(audio))
            )

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.end_headers()

            self.wfile.write(audio)

        except Exception as e:

            print(
                "❌ Piper error:",
                e
            )

            self.send_response(500)

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.end_headers()

            self.wfile.write(
                str(e).encode()
            )

        finally:

            if os.path.exists(
                output_file
            ):

                os.remove(
                    output_file
                )

    def do_OPTIONS(self):

        self.send_response(200)

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "POST, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )

        self.end_headers()


server = HTTPServer(
    ("127.0.0.1", 8765),
    PiperHandler
)

print("===================================")
print("🎤 Piper voice server")
print("===================================")
print("Listening on http://127.0.0.1:8765")
print("Press CTRL+C to stop")
print()

server.serve_forever()