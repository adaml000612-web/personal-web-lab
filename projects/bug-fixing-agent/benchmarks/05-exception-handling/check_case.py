from parser import parse_optional_int

assert parse_optional_int("42") == 42
assert parse_optional_int("not-a-number") is None
assert parse_optional_int("") is None

