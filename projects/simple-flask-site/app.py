import hmac
import os

from flask import Flask, redirect, render_template, request, session, url_for


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get(
    "FLASK_SECRET_KEY", "dev-only-change-this-secret"
)


def credentials_are_valid(username: str, password: str) -> bool:
    expected_username = os.environ.get("FLASK_USERNAME", "admin")
    expected_password = os.environ.get("FLASK_PASSWORD", "test123")
    return hmac.compare_digest(username, expected_username) and hmac.compare_digest(
        password, expected_password
    )


@app.get("/")
def home():
    if not session.get("authenticated"):
        return redirect(url_for("login"))
    return render_template("index.html")


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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
