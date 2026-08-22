#!/usr/bin/env python3
"""Universal SRS Tracker Multi-Agent Plugin Installer (cross-platform).

Single source of truth for what install-plugin.ps1 (Windows) and
install-plugin.sh (Linux/macOS) used to duplicate. Both wrapper scripts now
just exec this file with `python`/`python3`.
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HOME = Path.home()
REPO_URL = "https://github.com/tausif35/local-srs-tracker.git"

GREEN = "\033[0;32m"
CYAN = "\033[0;36m"
GRAY = "\033[0;90m"
YELLOW = "\033[0;33m"
RESET = "\033[0m"


def color(s, c):
    # Disable color when not a real terminal (e.g. piped output on Windows).
    if not sys.stdout.isatty():
        return s
    return f"{c}{s}{RESET}"


def find_plugin_source() -> Path:
    """Prefer the local checkout this script ships inside -- that's the only
    reliable source today since REPO_URL is not a public repo (git clone
    against it 404s for anyone who isn't already running from a local copy).
    Only attempt a network clone if this script is being run standalone,
    outside any srs-tracker checkout."""
    local_repo_root = Path(__file__).resolve().parent.parent
    if (local_repo_root / "plugin" / "srs-tracker").is_dir():
        return local_repo_root

    print(f"\nNo local srs-tracker checkout found next to this script. Trying {REPO_URL} ...")
    temp_dir = Path(tempfile.gettempdir()) / "srs-tracker-install"
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)

    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", REPO_URL, str(temp_dir)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    if temp_dir.is_dir() and (temp_dir / "plugin" / "srs-tracker").is_dir():
        return temp_dir

    print(color(
        f"Error: {REPO_URL} is not reachable/public, and no local checkout was found.\n"
        "Clone or download the srs-tracker repo yourself and run this script from inside it:\n"
        "  scripts/install-plugin.py", YELLOW,
    ))
    sys.exit(1)


def copy_tree(src: Path, dst: Path):
    if dst.exists():
        shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(src, dst)


def copy_skills_into(skills_src: Path, skills_dst: Path):
    skills_dst.mkdir(parents=True, exist_ok=True)
    for item in skills_src.iterdir():
        dest = skills_dst / item.name
        if dest.exists():
            shutil.rmtree(dest) if dest.is_dir() else dest.unlink()
        shutil.copytree(item, dest) if item.is_dir() else shutil.copy2(item, dest)


class Installer:
    def __init__(self, plugin_source: Path, temp_dir: Path):
        self.plugin_source = plugin_source
        self.skills_source = plugin_source / "skills"
        self.temp_dir = temp_dir
        self.installed = []
        self.universal_done = False

    def universal(self):
        if self.universal_done:
            return
        dest = HOME / ".agents" / "plugins" / "srs-tracker"
        copy_tree(self.plugin_source, dest)
        copy_skills_into(self.skills_source, HOME / ".agents" / "skills")
        self.installed.append(f"{dest} (~/.agents)")
        self.universal_done = True

    def _standard_agent_plugin(self, agent_home: Path, label: str):
        # Claude Code / Codex CLI auto-discover skills bundled inside a
        # plugin's own skills/ folder, so no separate top-level skills copy.
        dest = agent_home / "plugins" / "srs-tracker"
        copy_tree(self.plugin_source, dest)
        self.installed.append(f"{dest} ({label})")

    def claude(self):
        self._standard_agent_plugin(HOME / ".claude", "Claude Code")

    def codex(self):
        self._standard_agent_plugin(HOME / ".codex", "OpenAI Codex")

    def gemini(self, has_antigravity_cli, has_antigravity_ide, has_legacy_gemini, has_gemini_dir):
        installed_any = False

        if has_antigravity_cli:
            dest = HOME / ".gemini" / "antigravity-cli" / "plugins" / "srs-tracker"
            copy_tree(self.plugin_source, dest)
            self.installed.append(f"{dest} (Antigravity CLI)")
            installed_any = True

        if has_antigravity_ide:
            dest = HOME / ".gemini" / "config" / "plugins" / "srs-tracker"
            copy_tree(self.plugin_source, dest)
            self.installed.append(f"{dest} (Antigravity IDE)")
            installed_any = True

        # Legacy Gemini CLI (pre-Antigravity) doesn't auto-discover bundled
        # skills -- populate its flat skills/ dir explicitly.
        if has_legacy_gemini or (not has_antigravity_cli and not has_antigravity_ide and has_gemini_dir):
            skills_path = HOME / ".gemini" / "skills"
            copy_skills_into(self.skills_source, skills_path)
            self.installed.append(f"{skills_path} (Gemini CLI legacy)")
            installed_any = True

        if not installed_any:
            dest = HOME / ".gemini" / "config" / "plugins" / "srs-tracker"
            copy_tree(self.plugin_source, dest)
            self.installed.append(f"{dest} (Gemini - default/Antigravity IDE)")

    def cursor(self):
        rules_dir = HOME / ".cursor" / "rules"
        rules_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.plugin_source / "rules" / "tracker-discipline.md", rules_dir / "tracker-discipline.mdc")

        # Cursor doesn't auto-discover plugin-bundled skills -- copy explicitly.
        copy_skills_into(self.skills_source, HOME / ".cursor" / "skills")

        self.universal()
        self.installed.append(f"{HOME / '.cursor'} (Cursor IDE)")

    def project(self, cwd: Path):
        dest = cwd / ".agents" / "plugins" / "srs-tracker"
        copy_tree(self.plugin_source, dest)
        copy_skills_into(self.skills_source, cwd / ".agents" / "skills")
        agents_md = cwd / "AGENTS.md"
        src_agents_md = self.temp_dir / "AGENTS.md"
        if not agents_md.exists() and src_agents_md.exists():
            shutil.copy2(src_agents_md, agents_md)
        self.installed.append(f"{dest.resolve()} (Active Project)")


def main():
    parser = argparse.ArgumentParser(description="SRS Tracker universal plugin installer")
    parser.add_argument("--target", "-t", default=None,
                         help="1=Universal 2=Claude 3=Gemini 4=Codex 5=Cursor 6=Project A=All (default: prompt, or A if non-interactive)")
    args = parser.parse_args()

    cwd = Path.cwd()
    print(color("=================================================", CYAN))
    print(color("   SRS Tracker Universal Agent Plugin Installer  ", CYAN))
    print(color("=================================================", CYAN))

    repo_root = find_plugin_source()
    plugin_source = repo_root / "plugin" / "srs-tracker"

    detect = {
        "universal": (HOME / ".agents").is_dir(),
        "claude": (HOME / ".claude").is_dir(),
        "antigravity_cli": (HOME / ".gemini" / "antigravity-cli").is_dir(),
        "antigravity_ide": (HOME / ".gemini" / "config").is_dir(),
        "legacy_gemini": (HOME / ".gemini" / "skills").is_dir(),
        "codex": (HOME / ".codex").is_dir() or (HOME / ".openai").is_dir(),
        "cursor": (HOME / ".cursor").is_dir(),
        "project": (cwd / ".git").is_dir() or (cwd / "package.json").is_file(),
    }
    detect["gemini"] = detect["antigravity_cli"] or detect["antigravity_ide"] or detect["legacy_gemini"] or (HOME / ".gemini").is_dir()

    def status(flag, active_label="Detected"):
        return color(f"[{active_label}]", GREEN) if flag else color("[Available]", GRAY)

    print("\nDetected AI Environments on your system:")
    print(f"  [1] Universal Cross-Agent (~/.agents)       {status(detect['universal'])}")
    print(f"  [2] Claude Code (~/.claude)                 {status(detect['claude'])}")
    print(f"  [3] Google Gemini / Antigravity (~/.gemini) {status(detect['gemini'])}")
    print(f"  [4] OpenAI Codex (~/.codex)                 {status(detect['codex'])}")
    print(f"  [5] Cursor IDE (~/.cursor)                  {status(detect['cursor'])}")
    print(f"  [6] Current Project (./.agents)              {status(detect['project'], 'Active Repo')}")
    print(color("  [A] All Environments / All Detected (Default)", CYAN))

    choice = args.target
    if choice is None:
        if sys.stdin.isatty():
            entered = input("\nEnter choice (1-6 or A for All) [A]: ").strip()
            choice = entered.upper() if entered else "A"
        else:
            choice = "A"
    else:
        choice = choice.strip().upper()

    inst = Installer(plugin_source, repo_root)

    if "1" in choice or choice == "A":
        inst.universal()
    if "2" in choice or (choice == "A" and detect["claude"]):
        inst.claude()
    if "3" in choice or (choice == "A" and detect["gemini"]):
        inst.gemini(detect["antigravity_cli"], detect["antigravity_ide"], detect["legacy_gemini"], (HOME / ".gemini").is_dir())
    if "4" in choice or (choice == "A" and detect["codex"]):
        inst.codex()
    if "5" in choice or (choice == "A" and detect["cursor"]):
        inst.cursor()
    if "6" in choice:
        inst.project(cwd)

    if not inst.installed:
        inst.universal()

    temp_dir = Path(tempfile.gettempdir()) / "srs-tracker-install"
    if repo_root == temp_dir:
        shutil.rmtree(temp_dir, ignore_errors=True)

    print(color("\n[SUCCESS] SRS Tracker Plugin installed to:", GREEN))
    for loc in inst.installed:
        print(f"  -> {loc}")

    print(color("\nUniversal skills, tracker.py CLI, and auto-rules are active and ready!", GREEN))


if __name__ == "__main__":
    main()
