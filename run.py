import sys
import os
import logging
import threading
import time
import socket

HOST = "127.0.0.1"
PORT = 8765


def _ensure_single_instance():
    if os.name != "nt":
        return
    import ctypes
    ctypes.windll.kernel32.CreateMutexW(None, False, "Photonic.SingleInstance.Mutex")
    if ctypes.windll.kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
        try:
            ctypes.windll.user32.MessageBoxW(
                None,
                "Photonic is already running. Check the taskbar or the system tray.",
                "Photonic",
                0x00000010,
            )
        except Exception:
            pass
        sys.exit(0)


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
    import multiprocessing
    multiprocessing.freeze_support()

    fix_stderr()

    is_frozen = getattr(sys, "frozen", False)

    if is_frozen:
        _ensure_single_instance()
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
            from webview.window import FixPoint

            class DevToolsAPI:
                def __init__(self):
                    self._window = None
                    self._is_maximized = False

                def open_devtools(self):
                    try:
                        self._window._webview.CoreWebView2.OpenDevToolsWindow()
                    except Exception:
                        pass

                def minimize(self):
                    self._window.minimize()

                def maximize(self):
                    self.toggle_maximize()

                def toggle_maximize(self):
                    if self._is_maximized:
                        self._window.restore()
                        self._is_maximized = False
                    else:
                        self._window.maximize()
                        self._is_maximized = True
                    return self._is_maximized

                def close_app(self):
                    self._window.destroy()

                def resize_window(self, width, height, edge):
                    # Flags = the edges that stay fixed while resizing
                    fix_points = {
                        "right": FixPoint.NORTH | FixPoint.WEST,
                        "bottom": FixPoint.NORTH | FixPoint.WEST,
                        "bottom-right": FixPoint.NORTH | FixPoint.WEST,
                        "left": FixPoint.NORTH | FixPoint.EAST,
                        "top": FixPoint.SOUTH | FixPoint.WEST,
                        "top-right": FixPoint.SOUTH | FixPoint.WEST,
                        "top-left": FixPoint.SOUTH | FixPoint.EAST,
                        "bottom-left": FixPoint.NORTH | FixPoint.EAST,
                    }
                    if self._is_maximized or edge not in fix_points:
                        return
                    try:
                        self._window.resize(int(width), int(height), fix_points[edge])
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
                frameless=True,
                easy_drag=False,
                js_api=api,
            )
            api._window = window

            window.events.maximized += lambda: setattr(api, "_is_maximized", True)
            window.events.restored += lambda: setattr(api, "_is_maximized", False)

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
