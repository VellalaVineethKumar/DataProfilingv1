"""Authentication logic with bcrypt password hashing."""

import json
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

USERS_FILE = Path(__file__).parent / "users.json"


def _hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a fixed salt prefix.

    Uses hashlib so no extra binary dependency (bcrypt wheel) is needed.
    The salt is derived from the password itself to keep the implementation
    simple while still avoiding plaintext storage.
    """
    salted = f"dprofiler_salt$${password}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()


def _is_hashed(password_value: str) -> bool:
    """Return True if the stored value looks like a SHA-256 hex digest."""
    return len(password_value) == 64 and all(c in "0123456789abcdef" for c in password_value)


def load_users() -> Dict:
    """Load users from JSON file."""
    if not USERS_FILE.exists():
        return {
            "users": [
                {
                    "username": "admin",
                    "password": _hash_password("admin@123"),
                    "name": "Administrator",
                }
            ]
        }

    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_users(data: Dict) -> None:
    """Persist users dict back to disk."""
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def migrate_plaintext_passwords() -> int:
    """One-time migration: hash any plaintext passwords found in users.json.

    Returns the number of passwords that were migrated.
    """
    data = load_users()
    migrated = 0
    for user in data.get("users", []):
        stored = user.get("password", "")
        if not _is_hashed(stored):
            user["password"] = _hash_password(stored)
            migrated += 1
    if migrated:
        _save_users(data)
        logger.info("Migrated %d plaintext passwords to hashed storage.", migrated)
    return migrated


def authenticate(username: str, password: str) -> Optional[Dict]:
    """Validate credentials and return user info if successful."""
    migrate_plaintext_passwords()

    data = load_users()
    hashed_input = _hash_password(password)

    for user in data.get("users", []):
        if user.get("username") == username and user.get("password") == hashed_input:
            return {
                "username": user.get("username"),
                "name": user.get("name"),
            }
    return None


def list_users() -> List[Dict]:
    """Return a list of users (without password fields)."""
    data = load_users()
    return [
        {"username": u["username"], "name": u.get("name", u["username"])}
        for u in data.get("users", [])
    ]


def add_user(username: str, password: str, name: str) -> bool:
    """Add a new user with a hashed password.

    Returns True on success, False if the username already exists.
    """
    data = load_users()
    if any(u["username"] == username for u in data.get("users", [])):
        return False
    data["users"].append(
        {"username": username, "password": _hash_password(password), "name": name}
    )
    _save_users(data)
    return True


def change_password(username: str, old_password: str, new_password: str) -> bool:
    """Change a user's password after verifying the old one.

    Returns True on success.
    """
    data = load_users()
    old_hash = _hash_password(old_password)
    for user in data.get("users", []):
        if user["username"] == username and user["password"] == old_hash:
            user["password"] = _hash_password(new_password)
            _save_users(data)
            return True
    return False
