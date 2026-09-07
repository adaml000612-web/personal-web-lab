from preferences import Preferences

preferences = Preferences()
assert preferences.get("theme") is None
preferences.set("theme", "dark")
assert preferences.get("theme") == "dark"
preferences.set("theme", "light")
assert preferences.get("theme") == "light"

