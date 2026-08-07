import os
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

os.environ["FLASK_USERNAME"] = "test-user"
os.environ["FLASK_PASSWORD"] = "test-password"
os.environ["FLASK_SECRET_KEY"] = "test-secret"

from app import app  # noqa: E402


@app.get("/_test/server-error")
def raise_server_error():
    raise RuntimeError("intentional test error")


class FlaskSiteTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True, SECRET_KEY="test-secret")
        self.client = app.test_client()

    def login(self):
        return self.client.post(
            "/login",
            data={"username": "test-user", "password": "test-password"},
        )

    def test_logged_out_home_redirects_to_login(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.headers["Location"].endswith("/login"))

    def test_login_page_renders(self):
        response = self.client.get("/login")
        body = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn('name="username"', body)
        self.assertIn('name="password"', body)

    def test_invalid_login_shows_generic_error(self):
        response = self.client.post(
            "/login", data={"username": "test-user", "password": "wrong"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('role="alert"', response.get_data(as_text=True))

    def test_valid_login_opens_home(self):
        response = self.login()
        self.assertEqual(response.status_code, 302)
        home_response = self.client.get("/")
        body = home_response.get_data(as_text=True)
        self.assertEqual(home_response.status_code, 200)
        self.assertIn("test-user", body)
        self.assertIn('name="name"', body)

    def test_valid_name_renders_greeting(self):
        self.login()
        response = self.client.post("/", data={"name": "Alice"})
        body = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn("Alice", body)
        self.assertIn('role="status"', body)

    def test_blank_name_is_rejected(self):
        self.login()
        response = self.client.post("/", data={"name": "   "})
        self.assertIn('role="alert"', response.get_data(as_text=True))

    def test_long_name_is_rejected(self):
        self.login()
        response = self.client.post("/", data={"name": "A" * 51})
        self.assertIn('role="alert"', response.get_data(as_text=True))

    def test_user_input_is_escaped(self):
        self.login()
        response = self.client.post("/", data={"name": "<script>alert(1)</script>"})
        body = response.get_data(as_text=True)
        self.assertNotIn("<script>alert(1)</script>", body)
        self.assertIn("&lt;script&gt;", body)

    def test_logout_clears_session(self):
        self.login()
        response = self.client.post("/logout")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.headers["Location"].endswith("/login"))
        self.assertEqual(self.client.get("/").status_code, 302)

    def test_not_found_uses_custom_error_page(self):
        response = self.client.get("/missing-page")
        body = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 404)
        self.assertIn("ERROR 404", body)

    def test_server_error_uses_custom_error_page(self):
        app.config.update(TESTING=False, PROPAGATE_EXCEPTIONS=False)
        response = self.client.get("/_test/server-error")
        body = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 500)
        self.assertIn("ERROR 500", body)

    def test_security_headers_are_present(self):
        response = self.client.get("/login")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")


if __name__ == "__main__":
    unittest.main()
