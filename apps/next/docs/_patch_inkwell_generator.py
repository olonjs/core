#!/usr/bin/env python3
"""Replace or insert cat > PATH << 'EOF' ... EOF blocks in generate_inkwell_next.sh from SOT files."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

SCRIPT_DEFAULT = Path("/home/dev/npm-jpcore/apps/next/templates/generate_inkwell_next.sh")
SOT_DEFAULT = Path("/home/dev/temp/next-inkwell")

HEREDOC_RE = re.compile(
    r"^cat > (?P<q>['\"]?)(?P<path>[^'\"<\s]+)(?P=q) <<\s*(?P<qq>['\"]?)(?P<delim>\w+)(?P=qq)\s*$"
)


def parse_blocks(text: str) -> list[tuple[str, int, int, str, str]]:
    """Return list of (path, start_line_idx, end_line_idx_inclusive, delim, body)."""
    lines = text.splitlines(keepends=True)
    blocks = []
    i = 0
    while i < len(lines):
        m = HEREDOC_RE.match(lines[i].rstrip("\n"))
        if not m:
            i += 1
            continue
        path = m.group("path")
        delim = m.group("delim")
        start = i
        i += 1
        body_lines = []
        while i < len(lines) and lines[i].rstrip("\n") != delim:
            body_lines.append(lines[i])
            i += 1
        if i >= len(lines):
            raise SystemExit(f"Unterminated heredoc for {path}")
        end = i  # delim line
        blocks.append((path, start, end, delim, "".join(body_lines)))
        i += 1
    return blocks


def replace_body(text: str, path: str, new_body: str) -> str:
    lines = text.splitlines(keepends=True)
    blocks = parse_blocks(text)
    matches = [b for b in blocks if b[0] == path]
    if not matches:
        raise SystemExit(f"No heredoc target found for {path}")
    if len(matches) > 1:
        raise SystemExit(f"Multiple heredocs for {path}")
    _, start, end, delim, _ = matches[0]
    if new_body and not new_body.endswith("\n"):
        new_body += "\n"
    # Keep cat line; replace body; keep delim
    new_lines = lines[: start + 1] + [new_body] + lines[end:]
    # new_body already has newlines as one string — need to split for consistency
    # Actually inserting as single element is fine if it contains \n
    return "".join(
        lines[: start + 1]
        + ([new_body] if new_body else [])
        + lines[end:]
    )


def insert_after_path(text: str, after_path: str, new_path: str, new_body: str, echo: str | None = None) -> str:
    if f"cat > {new_path} <<" in text or f"cat > '{new_path}' <<" in text:
        # already present — replace instead
        return replace_body(text, new_path, new_body)
    lines = text.splitlines(keepends=True)
    blocks = parse_blocks(text)
    matches = [b for b in blocks if b[0] == after_path]
    if not matches:
        raise SystemExit(f"No heredoc to insert after: {after_path}")
    _, _start, end, _delim, _ = matches[0]
    if new_body and not new_body.endswith("\n"):
        new_body += "\n"
    insert = []
    if echo:
        insert.append(f"echo \"{echo}\"\n")
    insert.append(f"cat > {new_path} << 'EOF'\n")
    insert.append(new_body)
    insert.append("EOF\n")
    insert.append("\n")
    return "".join(lines[: end + 1] + insert + lines[end + 1 :])


def rename_target(text: str, old_path: str, new_path: str) -> str:
    lines = text.splitlines(keepends=True)
    blocks = parse_blocks(text)
    matches = [b for b in blocks if b[0] == old_path]
    if not matches:
        raise SystemExit(f"No heredoc to rename: {old_path}")
    _, start, _end, _delim, _ = matches[0]
    old_line = lines[start]
    m = HEREDOC_RE.match(old_line.rstrip("\n"))
    if not m:
        raise SystemExit("rename: cat line parse failed")
    # preserve quoting style of delim
    lines[start] = f"cat > {new_path} << 'EOF'\n"
    return "".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", type=Path, default=SCRIPT_DEFAULT)
    ap.add_argument("--sot", type=Path, default=SOT_DEFAULT)
    ap.add_argument("--replace", nargs=2, action="append", metavar=("SCRIPT_PATH", "SOT_REL"), default=[])
    ap.add_argument("--insert-after", nargs=3, action="append", metavar=("AFTER", "NEW_PATH", "SOT_REL"), default=[])
    ap.add_argument("--rename", nargs=2, action="append", metavar=("OLD", "NEW"), default=[])
    ap.add_argument("--ensure-mkdir", action="append", default=[])
    args = ap.parse_args()

    text = args.script.read_text()

    for old, new in args.rename or []:
        text = rename_target(text, old, new)
        print(f"RENAMED {old} -> {new}")

    for script_path, sot_rel in args.replace or []:
        body = (args.sot / sot_rel).read_text()
        text = replace_body(text, script_path, body)
        print(f"REPLACED {script_path} from {sot_rel}")

    for after, new_path, sot_rel in args.insert_after or []:
        body = (args.sot / sot_rel).read_text()
        text = insert_after_path(
            text,
            after,
            new_path,
            body,
            echo=f"-- Writing {new_path}...",
        )
        print(f"INSERTED {new_path} after {after}")

    for dir_path in args.ensure_mkdir or []:
        marker = "echo \"-- Creating directories...\""
        if dir_path in text:
            print(f"MKDIR already mentions {dir_path}")
            continue
        # insert before trailing src/lib \ line in mkdir block if present
        needle = "         src/lib\n"
        if needle not in text:
            raise SystemExit("mkdir block needle not found")
        text = text.replace(
            needle,
            f"         {dir_path} \\\n{needle}",
            1,
        )
        print(f"MKDIR added {dir_path}")

    args.script.write_text(text)
    print(f"WROTE {args.script}")


if __name__ == "__main__":
    main()
