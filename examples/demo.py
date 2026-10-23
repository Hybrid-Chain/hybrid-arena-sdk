"""Run against the loopback sandbox after installing ./python in a venv."""
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit
from hybrid_arena_sdk import ArenaClient

base = sys.argv[1]
if urlsplit(base).scheme != "http" or urlsplit(base).hostname != "127.0.0.1":
    raise ValueError("Explicit loopback URL required")
fixtures = Path(__file__).resolve().parents[1] / "contracts/game-provider-v1/fixtures"
with ArenaClient(base_url=base, publisher_id="demo-studio", game_id="demo-duel", key_id="demo-key", secret_hex="01" * 32, environment="sandbox", outbox_path=str(Path(".arena/python-demo/outbox.sqlite").resolve())) as client:
    client.queue_match(json.loads((fixtures / "demo-match.json").read_text()))
    client.queue_events(json.loads((fixtures / "demo-events.json").read_text()))
    print(json.dumps(client.flush(), indent=2))
