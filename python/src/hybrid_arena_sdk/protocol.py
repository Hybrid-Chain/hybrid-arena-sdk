"""Cross-language canonical request profile and scoped service signatures."""
import hashlib
import hmac
import json
import re
import secrets
import time
from urllib.parse import urlsplit

CONTRACT_VERSION = "2026-10-23.2"
MAX_BODY_BYTES = 262144


def new_id():
    return secrets.token_hex(16)


def sha256(body):
    return hashlib.sha256(body.encode("utf-8") if isinstance(body, str) else body).hexdigest()


def canonical_json(value):
    def check(v, depth=0):
        if depth > 20:
            raise ValueError("JSON nesting exceeds contract limit")
        if v is None or type(v) is bool:
            return
        if type(v) is int:
            if abs(v) > 9007199254740991:
                raise ValueError("Safe integer required")
            return
        if isinstance(v, str):
            v.encode("utf-8", errors="strict")
            return
        if isinstance(v, list):
            for item in v:
                check(item, depth + 1)
            return
        if type(v) is dict:
            for key, item in v.items():
                if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,96}", key):
                    raise ValueError("ASCII contract keys required")
                check(item, depth + 1)
            return
        raise ValueError("Unsupported JSON value")
    check(value)
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def valid_base_url(base):
    u = urlsplit(base)
    if u.username or u.password or u.path not in ("", "/") or u.query or u.fragment or not (
        u.scheme == "https" or u.scheme == "http" and u.hostname in ("127.0.0.1", "::1")
    ):
        raise ValueError("Explicit HTTPS or literal loopback HTTP origin required")
    if not u.hostname:
        raise ValueError("Origin required")
    host = u.hostname.encode("idna").decode("ascii").lower()
    if ":" in host:
        host = "[" + host + "]"
    port = u.port
    authority = host if port is None or port == (443 if u.scheme == "https" else 80) else f"{host}:{port}"
    return f"{u.scheme}://{authority}"


def sign_request(*, method, path, publisher_id, environment, key_id, secret_hex, body="", timestamp=None, nonce=None):
    if not re.fullmatch(r"[a-f0-9]{64}", secret_hex) or not all(
        re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", x) for x in (key_id, publisher_id)
    ) or environment != "sandbox" or method not in ("GET", "POST") or not re.fullmatch(
        r"/v1/(?:matches(?:/[a-f0-9]{32}/events)?|receipts/[a-f0-9]{32})", path
    ):
        raise ValueError("Invalid signing parameters")
    timestamp = str(int(time.time())) if timestamp is None else timestamp
    nonce = new_id() if nonce is None else nonce
    if not re.fullmatch(r"\d{1,12}", timestamp) or not re.fullmatch(r"[a-f0-9]{32}", nonce):
        raise ValueError("Invalid clock or nonce")
    canonical = "\n".join(("ARENA-GAME-HMAC-V1", method, path, publisher_id, environment, timestamp, nonce, sha256(body)))
    return {
        "X-Arena-Key-Id": key_id, "X-Arena-Publisher": publisher_id,
        "X-Arena-Environment": environment, "X-Arena-Timestamp": timestamp,
        "X-Arena-Nonce": nonce,
        "X-Arena-Signature": hmac.new(bytes.fromhex(secret_hex), canonical.encode("utf-8"), hashlib.sha256).hexdigest(),
    }
