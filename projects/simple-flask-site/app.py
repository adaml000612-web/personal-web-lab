import hmac
import os
from functools import wraps
from typing import Any, Callable

from flask import Flask, redirect, render_template, request, session, url_for


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get(
    "FLASK_SECRET_KEY", "dev-only-change-this-secret"
)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024


def login_required(view: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(view)
    def wrapped_view(*args: Any, **kwargs: Any) -> Any:
        if not session.get("authenticated"):
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped_view


def credentials_are_valid(username: str, password: str) -> bool:
    expected_username = os.environ.get("FLASK_USERNAME", "admin")
    expected_password = os.environ.get("FLASK_PASSWORD", "test123")
    return hmac.compare_digest(username, expected_username) and hmac.compare_digest(
        password, expected_password
    )


@app.route("/", methods=["GET", "POST"])
@login_required
def home():
    greeting = None
    name_error = None
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        if not name:
            name_error = "请输入你的名字"
        elif len(name) > 50:
            name_error = "名字不能超过 50 个字符"
        else:
            greeting = f"你好，{name}！很高兴见到你。"

    return render_template("index.html", greeting=greeting, name_error=name_error)


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("authenticated"):
        return redirect(url_for("home"))

    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if credentials_are_valid(username, password):
            session.clear()
            session["authenticated"] = True
            session["username"] = username
            return redirect(url_for("home"))
        error = "用户名或密码不正确"

    return render_template("login.html", error=error)


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.errorhandler(404)
def not_found(_error: Exception):
    return render_template(
        "error.html",
        code=404,
        title="页面走丢了",
        message="你访问的页面不存在，可能已经移动或地址输入有误。",
    ), 404


@app.errorhandler(500)
def internal_server_error(_error: Exception):
    return render_template(
        "error.html",
        code=500,
        title="暂时无法处理请求",
        message="服务器遇到了意外情况，请稍后再试。",
    ), 500


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
