"""Give cloud-save scripts content-based URLs so browsers fetch changed files."""
from hashlib import sha256
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
page = root / 'index.html'
html = page.read_text()
for asset in ('firebase-config.js', 'scripts/firebase_web.mjs'):
    version = sha256((root / asset).read_bytes()).hexdigest()[:12]
    pattern = r'src="' + re.escape(asset) + r'(?:\?[^\"]*)?"'
    html, count = re.subn(pattern, lambda _: f'src="{asset}?v={version}"', html)
    if count != 1:
        raise SystemExit(f'Expected one script reference for {asset}, found {count}')
    print(f'{asset}: {version}')
page.write_text(html)
