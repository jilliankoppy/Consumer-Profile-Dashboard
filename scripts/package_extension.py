"""Build the unpacked-testing extension ZIP from its reviewed source."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root / 'public' / 'extension'
with ZipFile(root / 'public' / 'orbit-extension.zip', 'w', ZIP_DEFLATED) as archive:
    for path in sorted(source.iterdir()):
        if path.is_file():
            archive.write(path, path.name)
