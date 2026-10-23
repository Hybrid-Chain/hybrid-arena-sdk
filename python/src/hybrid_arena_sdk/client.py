"""Durable server-only delivery; original request bytes survive failures."""
import json
import os
from pathlib import Path
import re
import sqlite3
import random
import time
from email.utils import parsedate_to_datetime
import urllib.request
import urllib.error
from jsonschema import Draft7Validator, ValidationError
from .protocol import canonical_json, sha256, valid_base_url, sign_request, MAX_BODY_BYTES

_schema = json.loads((Path(__file__).parent / "contracts" / "schemas.json").read_text())


def validate(name, value):
    try:
        Draft7Validator({"$ref": "#/$defs/" + name, "$defs": _schema["$defs"]}).validate(value)
    except ValidationError:
        raise ValueError("Invalid " + name) from None


class ArenaError(Exception):
    def __init__(self, status, code, retry_after=None):
        super().__init__("Arena request failed: " + code)
        self.status, self.code, self.retry_after = status, code, retry_after

    @property
    def retryable(self):
        return self.status == 0 or self.status == 429 or self.status >= 500


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ArenaClient:
    def __init__(self, *, base_url, publisher_id, game_id, key_id, secret_hex, environment, outbox_path, timeout=10):
        self.base_url = valid_base_url(base_url)
        if environment != "sandbox" or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", game_id) or not isinstance(timeout, (int, float)) or not 0 < timeout <= 60:
            raise ValueError("Invalid sandbox client configuration")
        self.publisher_id, self.game_id, self.environment = publisher_id, game_id, environment
        self.signing = dict(publisher_id=publisher_id, environment=environment, key_id=key_id, secret_hex=secret_hex)
        sign_request(**self.signing, method="GET", path="/v1/receipts/" + "0" * 32)
        self.timeout = timeout
        path = Path(outbox_path)
        if not path.is_absolute():
            raise ValueError("Absolute outbox path required")
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        parent = path.parent.lstat()
        if path.parent.is_symlink() or not path.parent.is_dir() or parent.st_mode & 0o077 or parent.st_uid != os.getuid():
            raise ValueError("Owner-only outbox directory required")
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
            os.close(fd)
        except FileExistsError:
            pass
        stat = path.lstat()
        if path.is_symlink() or not path.is_file() or stat.st_mode & 0o077 or stat.st_uid != os.getuid():
            raise ValueError("Owner-only outbox file required")
        self.db = sqlite3.connect(path, isolation_level=None)
        try:
            self.db.executescript("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS target(binding TEXT NOT NULL); CREATE TABLE IF NOT EXISTS requests(ordinal INTEGER PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, body TEXT NOT NULL, digest TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, receipt TEXT, last_error TEXT);")
            self.db.execute("BEGIN IMMEDIATE")
            target = canonical_json(dict(base_url=self.base_url, publisher_id=publisher_id, game_id=game_id, environment=environment))
            previous = self.db.execute("SELECT binding FROM target").fetchone()
            if previous and previous[0] != target:
                raise ValueError("Outbox destination or publisher binding changed")
            if not previous:
                self.db.execute("INSERT INTO target VALUES(?)", (target,))
            self.db.commit()
            self.db.row_factory = sqlite3.Row
        except Exception:
            self.db.rollback()
            self.db.close()
            raise
        # Never follow redirects or inherit a workstation HTTP proxy for signed traffic.
        self.http = urllib.request.build_opener(_NoRedirect, urllib.request.ProxyHandler({}))

    def _queue(self, value, kind):
        validate(kind, value)
        if value["publisher_id"] != self.publisher_id or value["game_id"] != self.game_id:
            raise ValueError("Request is outside publisher/game binding")
        body = canonical_json(value)
        if len(body.encode("utf-8")) > MAX_BODY_BYTES:
            raise ValueError("Request exceeds body limit")
        rid = value["request_id" if kind == "MatchRequest" else "batch_id"]
        path = "/v1/matches" if kind == "MatchRequest" else "/v1/matches/" + value["match_id"] + "/events"
        self.db.execute("BEGIN IMMEDIATE")
        try:
            old = self.db.execute("SELECT path,body FROM requests WHERE request_id=?", (rid,)).fetchone()
            if old and (old["path"] != path or old["body"] != body):
                raise ValueError("Request ID already binds different terms")
            if not old:
                if self.db.execute("SELECT count(*) FROM requests").fetchone()[0] >= 10000:
                    raise ValueError("Reference outbox capacity reached")
                self.db.execute("INSERT INTO requests(request_id,method,path,body,digest) VALUES(?,'POST',?,?,?)", (rid, path, body, sha256(body)))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return rid

    def queue_match(self, value):
        return self._queue(value, "MatchRequest")

    def queue_events(self, value):
        return self._queue(value, "EventBatch")

    def _request(self, method, path, body=""):
        headers = sign_request(**self.signing, method=method, path=path, body=body)
        headers["User-Agent"] = "Hybrid-Arena-SDK/0.1.0a3"
        if method == "POST":
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(self.base_url + path, method=method, headers=headers, data=body.encode("utf-8") if method == "POST" else None)
        try:
            response = self.http.open(req, timeout=self.timeout)
        except urllib.error.HTTPError as e:
            response = e
        except (OSError, urllib.error.URLError):
            raise ArenaError(0, "transport_unavailable") from None
        try:
            with response:
                if response.headers.get_content_type() != "application/json":
                    raise ArenaError(response.status, "invalid_response")
                raw = response.read(MAX_BODY_BYTES + 1)
                if len(raw) > MAX_BODY_BYTES:
                    raise ArenaError(502, "response_too_large")
                value = json.loads(raw)
                if not 200 <= response.status < 300:
                    code = value.get("error", "remote_error") if isinstance(value, dict) else "remote_error"
                    if not isinstance(code, str) or not re.fullmatch(r"[a-z_]+", code):
                        code = "remote_error"
                    raise ArenaError(response.status, code, response.headers.get("Retry-After"))
                return value
        except ArenaError:
            raise
        except Exception:
            raise ArenaError(502, "invalid_response") from None

    def _checked(self, value, pending):
        validate("Receipt", value)
        original = json.loads(pending["body"])
        match_request = original["schema"] == "arena.game.match.v1"
        if any(value[k] != v for k, v in {"request_id": pending["request_id"], "request_sha256": pending["digest"], "publisher_id": self.publisher_id, "game_id": self.game_id, "match_id": original["match_id"], "epoch": original["epoch"], "kind": "match.created" if match_request else "events.accepted", "first_sequence": None if match_request else original["first_sequence"], "last_sequence": 0 if match_request else original["events"][-1]["sequence"]}.items()):
            raise ArenaError(502, "receipt_mismatch")
        return value

    def deliver(self, rid):
        pending = self.db.execute("SELECT * FROM requests WHERE request_id=?", (rid,)).fetchone()
        if not pending or sha256(pending["body"]) != pending["digest"]:
            raise ValueError("Unknown or corrupted outbox request")
        if pending["receipt"]:
            return self._checked(json.loads(pending["receipt"]), pending)
        try:
            if pending["attempts"]:
                try:
                    receipt = self._checked(self._request("GET", "/v1/receipts/" + rid), pending)
                except ArenaError as e:
                    if e.status != 404:
                        raise
                else:
                    self.db.execute("UPDATE requests SET receipt=?,last_error=NULL WHERE request_id=?", (canonical_json(receipt), rid))
                    return receipt
            self.db.execute("UPDATE requests SET attempts=attempts+1 WHERE request_id=?", (rid,))
            receipt = self._checked(self._request(pending["method"], pending["path"], pending["body"]), pending)
            self.db.execute("UPDATE requests SET receipt=?,last_error=NULL WHERE request_id=?", (canonical_json(receipt), rid))
            return receipt
        except Exception as e:
            self.db.execute("UPDATE requests SET last_error=? WHERE request_id=?", (e.code if isinstance(e, ArenaError) else "invalid_receipt", rid))
            raise

    def pending(self):
        return [r[0] for r in self.db.execute("SELECT request_id FROM requests WHERE receipt IS NULL ORDER BY ordinal")]

    def flush(self, max_requests=100):
        if type(max_requests) is not int or not 1 <= max_requests <= 10000:
            raise ValueError("Invalid flush bound")
        return [self.deliver(rid) for rid in self.pending()[:max_requests]]

    def deliver_with_retry(self, rid, *, max_attempts=3, max_delay=5):
        if type(max_attempts) is not int or not 1 <= max_attempts <= 10 or type(max_delay) not in (int, float) or not 0 < max_delay <= 60:
            raise ValueError("Invalid retry bounds")
        for attempt in range(max_attempts):
            try:
                return self.deliver(rid)
            except ArenaError as e:
                if not e.retryable or attempt + 1 >= max_attempts:
                    raise
                after = 0
                if e.retry_after:
                    try:
                        after = int(e.retry_after) if e.retry_after.isdigit() else max(0, parsedate_to_datetime(e.retry_after).timestamp() - time.time())
                    except (ValueError, TypeError, OverflowError):
                        after = 0
                if after > max_delay:
                    raise
                ceiling = min(max_delay, 0.25 * 2 ** attempt)
                time.sleep(max(after, random.uniform(ceiling / 2, ceiling)))

    def close(self):
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
