import json
from pathlib import Path
import tempfile
import unittest
from hybrid_arena_sdk import ArenaClient, ArenaError, canonical_json, sha256, sign_request, validate

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "contracts/game-provider-v1/fixtures"


class ProtocolTests(unittest.TestCase):
    def test_published_signing_vector(self):
        v = json.loads((FIXTURES / "signing-vector.json").read_text())
        self.assertEqual(canonical_json(json.loads(v["body_utf8"])), v["body_utf8"])
        self.assertEqual(sha256(v["body_utf8"]), v["body_sha256"])
        h = sign_request(method=v["method"], path=v["path"], publisher_id=v["publisher_id"], environment=v["environment"], key_id="demo-key", secret_hex=v["secret_hex"], body=v["body_utf8"], timestamp=v["timestamp"], nonce=v["nonce"])
        self.assertEqual(h["X-Arena-Signature"], v["signature"])

    def test_canonical_values(self):
        self.assertEqual(canonical_json({"z": "🛰️ café", "a": 1}), '{"a":1,"z":"🛰️ café"}')
        for value in (float("nan"), float("inf"), 1.5, 9007199254740992, {"a": "\ud800"}, {"é": 1}):
            with self.assertRaises((ValueError, UnicodeError)):
                canonical_json(value)

    def test_schema_validation_rejects_private_identity_and_false_financial_authority(self):
        v = json.loads((FIXTURES / "demo-match.json").read_text())
        validate("MatchRequest", v)
        for key, value in (("steam_id", "private"), ("payout_authorized", True)):
            bad = {**v, key: value}
            with self.assertRaises(Exception):
                validate("MatchRequest", bad)

    def test_outbox_reopen_keeps_original_terms_and_rejects_new_destination(self):
        with tempfile.TemporaryDirectory(prefix="arena-python-outbox-") as d:
            options = dict(base_url="http://127.0.0.1:8789", publisher_id="demo-studio", game_id="demo-duel", key_id="demo-key", secret_hex="01" * 32, environment="sandbox", outbox_path=str(Path(d) / "outbox.sqlite"))
            v = json.loads((FIXTURES / "demo-match.json").read_text())
            with ArenaClient(**options) as client:
                client.queue_match(v)
                with self.assertRaises(ValueError):
                    client.queue_match({**v, "epoch": "f" * 32})
            with ArenaClient(**options) as client:
                self.assertEqual(client.pending(), [v["request_id"]])
            with self.assertRaises(ValueError):
                ArenaClient(**{**options, "base_url": "http://127.0.0.1:9999"})

    def test_retry_bounds_and_retry_after(self):
        with tempfile.TemporaryDirectory(prefix="arena-python-retry-") as d:
            with ArenaClient(base_url="http://127.0.0.1:8789", publisher_id="demo-studio", game_id="demo-duel", key_id="demo-key", secret_hex="01" * 32, environment="sandbox", outbox_path=str(Path(d) / "outbox.sqlite")) as client:
                calls = []
                def unavailable(_):
                    calls.append(1)
                    raise ArenaError(503, "temporary", "3600")
                client.deliver = unavailable
                with self.assertRaises(ArenaError):
                    client.deliver_with_retry("fixture", max_delay=0.001)
                self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
