import os
import sys
import json
import argparse
import uuid
from datetime import datetime, timezone
from pathlib import Path

def get_tracker_dir():
    curr = Path.cwd()
    while True:
        if (curr / ".tracker").is_dir():
            return curr / ".tracker"
        if curr.parent == curr:
            break
        curr = curr.parent
    return Path.cwd() / ".tracker"

def load_json(path, default=None):
    if not path.exists():
        return default
    with open(path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error: {path} is not valid JSON ({e}). Fix or restore it before continuing.")
            sys.exit(1)

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def iso_now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

def short_date():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def generate_id():
    return "t_" + uuid.uuid4().hex[:8]

def get_packet(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    task = next((t for t in tasks if t["id"] == args.id), None)
    if not task:
        print(f"Error: Task {args.id} not found.")
        sys.exit(1)
        
    req_ids = task.get("requirementIds", [])
    reqs = load_json(t_dir / "requirements.json", [])
    linked_reqs = [r for r in reqs if r["id"] in req_ids]
    
    blocked_by = task.get("blockedBy", [])
    blocker_tasks = [t for t in tasks if t["id"] in blocked_by]
    
    packet = {
        "task": task,
        "requirements": linked_reqs,
        "blockers": [{"id": b["id"], "column": b.get("column"), "title": b.get("title")} for b in blocker_tasks]
    }
    
    print(json.dumps(packet, indent=2))

def get_task(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    task = next((t for t in tasks if t["id"] == args.id), None)
    if not task:
        print(f"Error: Task {args.id} not found.")
        sys.exit(1)
    print(json.dumps(task, indent=2))

def list_tasks(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    if args.column:
        tasks = [t for t in tasks if t.get("column") == args.column]
    for t in tasks:
        print(f"[{t.get('column', 'unknown')}] {t['id']}: {t['title']}")

def move_task(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    task = next((t for t in tasks if t["id"] == args.id), None)
    if not task:
        print(f"Error: Task {args.id} not found.")
        sys.exit(1)
        
    old_col = task.get("column")
    task["column"] = args.col
    task["updatedAt"] = iso_now()
    
    if "metadata" not in task:
        task["metadata"] = {}
        
    if args.by:
        task["metadata"]["lastUpdatedBy"] = args.by
        
    if args.col == "planning":
        task["metadata"]["plannedAt"] = iso_now()
        if args.by: task["metadata"]["plannedBy"] = args.by
    elif args.col == "implementation":
        task["metadata"]["implementedAt"] = iso_now()
        if args.by: task["metadata"]["implementedBy"] = args.by
    elif args.col == "done" and old_col != "done":
        task["metadata"]["verifiedAt"] = iso_now()
        if args.by: task["metadata"]["verifiedBy"] = args.by

    save_json(t_dir / "tasks.json", tasks)
    print(f"Moved {args.id} to {args.col}.")

def quick_task(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    new_id = generate_id()
    now = iso_now()
    
    col = args.column or ("done" if getattr(args, 'done', False) else "implementation")
    
    task = {
        "id": new_id,
        "title": args.title,
        "column": col,
        "order": len(tasks),
        "metadata": {
            "plannedAt": now,
            "implementedAt": now,
            "lastUpdatedBy": args.by
        },
        "createdAt": now,
        "updatedAt": now
    }
    
    if args.by:
        task["metadata"]["plannedBy"] = args.by
        task["metadata"]["implementedBy"] = args.by
        
    if col == "done":
        task["metadata"]["verifiedAt"] = now
        if args.by: task["metadata"]["verifiedBy"] = args.by

    tasks.append(task)
    save_json(t_dir / "tasks.json", tasks)
    print(f"Created quick task {new_id} in {col}.")

def verify_task(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    task = next((t for t in tasks if t["id"] == args.id), None)
    if not task:
        print(f"Error: Task {args.id} not found.")
        sys.exit(1)
        
    if "verification" not in task:
        task["verification"] = {"commands": [], "status": args.status}
    else:
        task["verification"]["status"] = args.status
        
    if args.evidence:
        task["verification"]["evidence"] = args.evidence
        
    task["updatedAt"] = iso_now()
    if "metadata" not in task: task["metadata"] = {}
    if args.status == "passed":
        task["metadata"]["verifiedAt"] = iso_now()
        if args.by: task["metadata"]["verifiedBy"] = args.by
    if args.by:
        task["metadata"]["lastUpdatedBy"] = args.by
        
    save_json(t_dir / "tasks.json", tasks)
    print(f"Verification for {args.id} set to {args.status}.")

def append_decision(args, t_dir):
    decisions_file = t_dir / "decisions.json"
    decisions = load_json(decisions_file, [])
    
    if not decisions:
        decisions = [{
            "id": "decision-log",
            "title": "Decision Log",
            "type": "timeline",
            "content": {"entries": []}
        }]
    
    entry = {
        "title": args.title,
        "status": "done",
        "date": short_date(),
        "timestamp": iso_now(),
        "description": args.reason
    }
    
    if args.req_id:
        entry["requirementIds"] = [args.req_id]
    if args.by:
        entry["model"] = args.by
        
    decisions[0]["content"]["entries"].append(entry)
    save_json(decisions_file, decisions)
    print("Appended decision.")

def upsert_block(state, block):
    """Replace the block with matching id in-place, or append it. Preserves
    every other block already in state.json instead of discarding them."""
    for i, b in enumerate(state):
        if b.get("id") == block["id"]:
            state[i] = block
            return
    state.append(block)

def update_state(args, t_dir):
    state_file = t_dir / "state.json"
    state = load_json(state_file, [])

    # Preserve git context if it exists in current handoff block
    git_ctx = "None"
    old_handoff = next((b for b in state if b.get("id") == "agent-handoff"), None)
    if old_handoff and "content" in old_handoff and "items" in old_handoff["content"]:
        git_item = next((i for i in old_handoff["content"]["items"] if i.get("label") == "Git Context"), None)
        if git_item: git_ctx = git_item.get("value", "None")

    handoff_block = {
        "id": "agent-handoff",
        "title": "Agent Handoff & Session Memory",
        "type": "keyvalue",
        "content": {
            "dense": True,
            "items": [
                {"label": "Last Updated", "value": iso_now()},
                {"label": "Git Context", "value": git_ctx}
            ]
        }
    }
    if args.by: handoff_block["content"]["items"].insert(0, {"label": "Last Model", "value": args.by})
    if args.focus: handoff_block["content"]["items"].append({"label": "Active Task", "value": args.focus})
    if args.next: handoff_block["content"]["items"].append({"label": "Next Action", "value": args.next})

    # Merge into existing state instead of replacing it wholesale, so
    # unrelated blocks other tooling added to state.json survive.
    upsert_block(state, handoff_block)

    if args.focus:
        upsert_block(state, {
            "id": "current-focus",
            "title": "Current Focus",
            "type": "markdown",
            "content": {"text": args.focus}
        })

    if args.blocked:
        upsert_block(state, {
            "id": "blocked",
            "title": "Blocked",
            "type": "list",
            "content": {"items": [{"text": args.blocked, "status": "error"}]}
        })
    else:
        # No longer blocked -- drop any stale "blocked" block.
        state = [b for b in state if b.get("id") != "blocked"]

    save_json(state_file, state)
    print("Updated state.json.")

VALID_COLUMNS = {"backlog", "planning", "implementation", "done"}

def health(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    reqs = load_json(t_dir / "requirements.json", [])
    task_ids = set(t["id"] for t in tasks)
    req_ids = set(r["id"] for r in reqs)
    errors = []

    for t in tasks:
        for b in t.get("blockedBy", []):
            if b not in task_ids:
                errors.append(f"Task {t['id']} references unknown blocker {b}")

        for r in t.get("requirementIds", []):
            if r not in req_ids:
                errors.append(f"Task {t['id']} references unknown requirement {r}")

        col = t.get("column")
        if col not in VALID_COLUMNS:
            errors.append(f"Task {t['id']} has invalid column '{col}' (expected one of {sorted(VALID_COLUMNS)})")

    if not errors:
        if not args.quiet:
            print("[OK] All checks passed (0 errors, 0 warnings)")
        sys.exit(0)
    else:
        for e in errors:
            print(f"Error: {e}")
        sys.exit(1)

def check_stop_readiness(args, t_dir):
    tasks = load_json(t_dir / "tasks.json", [])
    unverified = [t for t in tasks if t.get("column") == "implementation"]
    if unverified:
        print(f"Warning: {len(unverified)} task(s) in implementation phase. Ensure they are tested.")
        sys.exit(0)
    print("Ready to stop.")
    sys.exit(0)

def sync_git(args, t_dir):
    state_file = t_dir / "state.json"
    state = load_json(state_file, [])
    
    handoff = next((b for b in state if b.get("id") == "agent-handoff"), None)
    if not handoff:
        handoff = {
            "id": "agent-handoff",
            "title": "Agent Handoff & Session Memory",
            "type": "keyvalue",
            "content": {"dense": True, "items": []}
        }
        state.insert(0, handoff)
        
    items = handoff.get("content", {}).get("items", [])
    git_val = f"branch: {args.branch} @ commit {args.commit}"
    
    git_item = next((i for i in items if i.get("label") == "Git Context"), None)
    if git_item:
        git_item["value"] = git_val
    else:
        items.append({"label": "Git Context", "value": git_val})
        
    save_json(state_file, state)
    print("Synced git context to state.")

def main():
    parser = argparse.ArgumentParser(description="SRS Tracker CLI")
    subparsers = parser.add_subparsers(dest="cmd", required=True)

    p_get = subparsers.add_parser("get-packet")
    p_get.add_argument("id")

    p_task = subparsers.add_parser("get-task")
    p_task.add_argument("id")

    p_list = subparsers.add_parser("list-tasks")
    p_list.add_argument("--column")

    p_move = subparsers.add_parser("move-task")
    p_move.add_argument("id")
    p_move.add_argument("col")
    p_move.add_argument("--by")

    p_quick = subparsers.add_parser("quick-task")
    p_quick.add_argument("title")
    p_quick.add_argument("--column")
    p_quick.add_argument("--done", action="store_true")
    p_quick.add_argument("--by")

    p_verify = subparsers.add_parser("verify-task")
    p_verify.add_argument("id")
    p_verify.add_argument("--status", required=True)
    p_verify.add_argument("--evidence")
    p_verify.add_argument("--by")

    p_dec = subparsers.add_parser("append-decision")
    p_dec.add_argument("--title", required=True)
    p_dec.add_argument("--reason", required=True)
    p_dec.add_argument("--req-id")
    p_dec.add_argument("--by")

    p_state = subparsers.add_parser("update-state")
    p_state.add_argument("--focus")
    p_state.add_argument("--blocked")
    p_state.add_argument("--next")
    p_state.add_argument("--by")

    p_health = subparsers.add_parser("health")
    p_health.add_argument("--quiet", action="store_true")

    p_stop = subparsers.add_parser("check-stop-readiness")

    p_git = subparsers.add_parser("sync-git")
    p_git.add_argument("--branch", required=True)
    p_git.add_argument("--commit", required=True)

    args = parser.parse_args()
    t_dir = get_tracker_dir()

    if not t_dir.exists() and args.cmd not in ["health"]:
        print(f"Warning: {t_dir} does not exist.")

    cmd_map = {
        "get-packet": get_packet,
        "get-task": get_task,
        "list-tasks": list_tasks,
        "move-task": move_task,
        "quick-task": quick_task,
        "verify-task": verify_task,
        "append-decision": append_decision,
        "update-state": update_state,
        "health": health,
        "check-stop-readiness": check_stop_readiness,
        "sync-git": sync_git
    }

    cmd_map[args.cmd](args, t_dir)

if __name__ == "__main__":
    main()
