#!/usr/bin/env python3

import sys
from pathlib import Path
from urllib.parse import urlparse

import requests


def normalize_png_signature(data: bytes) -> bytes:
    png_tail = b"PNG\r\n\x1a\n"
    if len(data) >= 8 and data[1:8] == png_tail and data[0] != 0x89:
        return bytes([0x89]) + data[1:]
    return data


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "usage: fetch-streamdocs-rendering.py <url> <output-path>", file=sys.stderr
        )
        return 2

    url = sys.argv[1]
    output_path = Path(sys.argv[2])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    data = normalize_png_signature(response.content)
    output_path.write_bytes(data)

    parsed = urlparse(url)
    print(f"url={parsed.scheme}://{parsed.netloc}{parsed.path}")
    print(f"status={response.status_code}")
    print(f"content_type={response.headers.get('content-type')}")
    print(f"bytes={len(data)}")
    print(f"output={output_path}")
    print(f"head_hex={data[:8].hex()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
