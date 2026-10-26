"""Build the portfolio copy of the site for Netlify (see netlify.toml).

    python3 scripts/build_portfolio.py [out_dir] [--base /projects/algazy-group/]

Copies the pages and assets to <out_dir><base> with every relative link made absolute under <base>,
so the site works from a subfolder of infusedev.online, with or without a trailing slash.
Adds a noindex tag so the copy stays out of search results. Standard library only.
"""
import posixpath
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "/projects/algazy-group/"
NOINDEX = '<meta name="robots" content="noindex, nofollow">'


def absolute(val, base):
    """Relative URL -> absolute under base. External, anchor, tel:, mailto: and data: URLs are left alone."""
    if not val or re.match(r"(?:[a-z][a-z0-9+.-]*:|#|//)", val, re.I):
        return val
    path = val[1:] if val.startswith("/") else posixpath.normpath(val)
    path = re.sub(r"(^|/)index\.html(?=$|[?#])", r"\1", "" if path == "." else path)
    return base + path


def rebase(html, base):
    html = re.sub(r'\b(href|src)="([^"]*)"', lambda m: f'{m[1]}="{absolute(m[2], base)}"', html)
    html = re.sub(r'\b((?:image)?srcset)="([^"]*)"', lambda m: f'{m[1]}="' + ", ".join(
        " ".join([absolute(part.split()[0], base)] + part.split()[1:]) for part in m[2].split(",") if part.strip()) + '"', html)
    html, found = re.subn(r'<meta name="robots"[^>]*>', NOINDEX, html)
    return html if found else html.replace("<head>", "<head>\n  " + NOINDEX, 1)


def main():
    args = sys.argv[1:]
    base = BASE
    if "--base" in args:
        i = args.index("--base")
        base = "/" + args[i + 1].strip("/") + "/"
        del args[i:i + 2]
    out = Path(args[0]).resolve() if args else ROOT / "dist"
    site = out / base.strip("/")
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "assets", site / "assets")
    pages = sorted(ROOT.glob("*.html"))
    for page in pages:
        (site / page.name).write_text(rebase(page.read_text(encoding="utf-8"), base), encoding="utf-8")
    print(f"wrote {len(pages)} pages to {site}")


if __name__ == "__main__":
    main()
