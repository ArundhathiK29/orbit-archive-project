"""Package only distributable project files, with an optional current PDF."""
from pathlib import Path
import os
import zipfile

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED = {'.git', '.next', 'node_modules', 'tmp', 'output', '__pycache__', '.agents', '.aws'}
ALLOWED = {'.js', '.mjs', '.css', '.json', '.sql', '.md', '.html', '.svg', '.mmd', '.ps1', '.py', '.jpg', '.png', '.yml', '.yaml', '.txt'}
CONFIG_FILES = {'.gitignore', '.gitattributes', '.env.example'}


def build_source_zip(pdf_path=None):
    archive = ROOT / 'output' / 'orbit-archive-source.zip'
    archive.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for current, dirs, files in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d not in EXCLUDED and (not d.startswith('.') or d == '.github') and not (Path(current) / d).is_symlink()]
            for name in sorted(files):
                p = Path(current) / name
                if p.is_symlink() or not p.is_file():
                    continue
                if name.startswith('.env') and name != '.env.example':
                    continue
                if p.suffix not in ALLOWED and name not in CONFIG_FILES:
                    continue
                bundle.write(p, p.relative_to(ROOT).as_posix())
        if pdf_path is not None:
            bundle.write(pdf_path, 'docs/project-report.pdf')
    return archive
