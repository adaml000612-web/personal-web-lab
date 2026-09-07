class Preferences:
    def __init__(self) -> None:
        self._values: dict[str, str] = {}
        self._cache: dict[str, str | None] = {}

    def get(self, key: str) -> str | None:
        if key not in self._cache:
            self._cache[key] = self._values.get(key)
        return self._cache[key]

    def set(self, key: str, value: str) -> None:
        self._values[key] = value
