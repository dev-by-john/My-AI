from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess
import tempfile
import os

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

WHISPER = os.path.join(
    BASE_DIR,
    "runtime",
    "whisper",
    "whisper-cli.exe"
)

MODEL = os.path.join(
    BASE_DIR,
    "models",
    "whisper",
    "ggml-tiny.en.bin"
)

FFMPEG = "ffmpeg"


class WhisperHandler(BaseHTTPRequestHandler):

    def do_POST(self):

        if self.path != "/transcribe":
            self.send_response(404)
            self.end_headers()
            return

        length = int(
            self.headers.get(
                "Content-Length",
                0
            )
        )

        audio_data = self.rfile.read(length)

        print(
            "🎤 Whisper received:",
            len(audio_data),
            "bytes"
        )

        webm_file = None
        wav_file = None

        try:

            with tempfile.NamedTemporaryFile(
                suffix=".webm",
                delete=False
            ) as temp:

                webm_file = temp.name
                temp.write(audio_data)

            with tempfile.NamedTemporaryFile(
                suffix=".wav",
                delete=False
            ) as temp:

                wav_file = temp.name

            print(
                "🔄 Converting WebM → WAV..."
            )

            ffmpeg_result = subprocess.run(
                [
                    FFMPEG,
                    "-y",
                    "-i",
                    webm_file,
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    "-c:a",
                    "pcm_s16le",
                    wav_file
                ],
                capture_output=True,
                text=True
            )

            if ffmpeg_result.returncode != 0:
                raise RuntimeError(
                    ffmpeg_result.stderr
                )

            print(
                "✅ Audio converted"
            )

            print(
                "🧠 Running Whisper..."
            )

            result = subprocess.run(
                [
                    WHISPER,
                    "-m",
                    MODEL,
                    "-f",
                    wav_file,
                    "-nt",
                    "-np"
                ],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                raise RuntimeError(
                    result.stderr
                )

            text = result.stdout.strip()

            print(
                "📝 Whisper:",
                text
            )

            response = text.encode(
                "utf-8"
            )

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "text/plain; charset=utf-8"
            )

            self.send_header(
                "Content-Length",
                str(len(response))
            )

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.end_headers()

            self.wfile.write(
                response
            )

        except Exception as e:

            print(
                "❌ Whisper error:",
                e
            )

            error = str(e).encode(
                "utf-8"
            )

            self.send_response(500)

            self.send_header(
                "Content-Type",
                "text/plain; charset=utf-8"
            )

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.send_header(
                "Content-Length",
                str(len(error))
            )

            self.end_headers()

            self.wfile.write(
                error
            )

        finally:

            if (
                webm_file
                and os.path.exists(webm_file)
            ):
                os.remove(webm_file)

            if (
                wav_file
                and os.path.exists(wav_file)
            ):
                os.remove(wav_file)

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
    ("127.0.0.1", 8766),
    WhisperHandler
)

print("===================================")
print("🎤 Whisper speech server")
print("===================================")
print("Model:", MODEL)
print("Whisper:", WHISPER)
print("FFmpeg:", FFMPEG)
print("Listening on http://127.0.0.1:8766")
print("Press CTRL+C to stop")
print()

server.serve_forever()