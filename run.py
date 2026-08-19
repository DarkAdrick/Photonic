import sys
import os
import logging
import threading
import time
import socket

HOST = "127.0.0.1"
PORT = 8765


def _pick_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((HOST, 0))
        return s.getsockname()[1]


def fix_stderr():
    if sys.stderr is None:
        log_path = os.path.join(os.path.dirname(sys.executable), "photonic.log")
        sys.stderr = open(log_path, "a", encoding="utf-8")
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")


def wait_for_server(url, timeout=10):
    import urllib.request
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.2)
    return False


if __name__ == "__main__":
    fix_stderr()

    is_frozen = getattr(sys, "frozen", False)

    if is_frozen:
        PORT = _pick_free_port()

    import uvicorn
    logging.basicConfig(level=logging.INFO)

    server_thread = threading.Thread(
        target=lambda: uvicorn.run(
            "backend.main:app",
            host=HOST,
            port=PORT,
            reload=False,
            log_config=None,
        ),
        daemon=True,
    )
    server_thread.start()

    url = f"http://{HOST}:{PORT}"
    if wait_for_server(url):
        if is_frozen:
            import webview

            class DevToolsAPI:
                def __init__(self):
                    self._window = None

                def open_devtools(self):
                    try:
                        self._window._webview.CoreWebView2.OpenDevToolsWindow()
                    except Exception:
                        pass

            api = DevToolsAPI()
            window = webview.create_window(
                "Photonic",
                url,
                width=1400,
                height=900,
                resizable=True,
                min_size=(800, 600),
                js_api=api,
            )
            api._window = window

            def _on_loaded():
                window.evaluate_js(
                    "document.addEventListener('keydown', function(e) {"
                    "  if (e.key === 'F12') {"
                    "    window.pywebview.api.open_devtools();"
                    "  }"
                    "});"
                )

            window.events.loaded += _on_loaded
            webview.start()
        else:
            import webbrowser
            webbrowser.open(url)
            server_thread.join()
    else:
        import webbrowser
        webbrowser.open(url)
        server_thread.join()
