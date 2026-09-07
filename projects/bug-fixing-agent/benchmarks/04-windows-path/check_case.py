from paths import filename

assert filename("reports/weekly.txt") == "weekly.txt"
assert filename("C:\\reports\\weekly.txt") == "weekly.txt"

