from profiles import display_name

assert display_name({"first_name": "Ada", "last_name": "Lovelace"}) == "Ada Lovelace"
assert display_name({"first_name": "Ada"}) == "Ada"

