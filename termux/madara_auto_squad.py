#!/usr/bin/env python3
"""Madara FF Auto Squad client for Termux.

Creates a five-player squad record through the user's Madara FF API.
It does NOT create an in-game Free Fire lobby or send game invitations.
"""
import getpass
import json
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse

UID_RE = re.compile(r"^\d{5,20}$")


def ask(prompt):
    return input(prompt).strip()


def request_json(base_url, api_key, path, payload):
    url = base_url.rstrip("/") + path
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-api-key": api_key,
            "User-Agent": "Madara-Termux-AutoSquad/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read().decode("utf-8", errors="replace")
            try:
                return response.status, json.loads(raw)
            except json.JSONDecodeError:
                return response.status, {"raw": raw}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {"raw": raw}
        return exc.code, data
    except urllib.error.URLError as exc:
        print(f"Network error: {exc.reason}")
        return 0, {}


def validate_uid(label):
    while True:
        uid = ask(label)
        if UID_RE.fullmatch(uid):
            return uid
        print("UID duhet te kete 5 deri ne 20 shifra.")


def main():
    print("\n=== MADARA FF AUTO SQUAD ===")
    base_url = ask("Madara API URL (p.sh. https://madara-ff-api-mu.vercel.app): ")
    parsed = urlparse(base_url)
    if parsed.scheme != "https" or not parsed.netloc:
        print("Per siguri vendos nje URL HTTPS te vlefshme.")
        return
    api_key = getpass.getpass("MADARA_API_KEY (nuk shfaqet ne ekran): ").strip()
    if len(api_key) < 24:
        print("API key duhet te kete te pakten 24 karaktere.")
        return

    print("\nVendos UID e liderit dhe 4 lojtareve.")
    uids = [validate_uid("UID e liderit: ")]
    for i in range(1, 5):
        uids.append(validate_uid(f"UID e lojtarit {i}/4: "))

    if len(set(uids)) != 5:
        print("Gabim: te 5 UID duhet te jene unike.")
        return

    name = ask("Emri i squad-it [Madara Squad]: ") or "Madara Squad"
    if len(name) > 40:
        print("Emri nuk mund te kaloje 40 karaktere.")
        return

    print("\nPo regjistroj lojtaret ne Madara...")
    for index, uid in enumerate(uids):
        nickname = "Madara Leader" if index == 0 else f"Madara Player {index}"
        status, data = request_json(
            base_url, api_key, "/api/player",
            {"uid": uid, "nickname": nickname},
        )
        if status == 0:
            return
        if status not in (200, 201):
            # Existing records may be reported as a conflict by some API versions.
            # Stop rather than pretending registration succeeded.
            print(f"Regjistrimi i UID {uid} deshtoi (HTTP {status}):")
            print(json.dumps(data, ensure_ascii=False, indent=2))
            print("Kontrollo endpoint-in /api/player ose regjistroji UID ne dashboard.")
            return

    print("Lojtaret u regjistruan. Po krijoj squad-in ne Madara...")
    status, data = request_json(
        base_url, api_key, "/api/5group",
        {"name": name, "leaderUid": uids[0], "members": uids[1:]},
    )
    print(f"HTTP {status}")
    print(json.dumps(data, ensure_ascii=False, indent=2))
    if status in (200, 201) and data.get("ok"):
        print("\nSQUAD-I U RUAJT NE MADARA.")
        print("KJO NUK KRIJON LOBBY NE FREE FIRE DHE NUK DERGON FTESA NE LOJE.")
    else:
        print("\nSquad-i nuk u krijua. Shiko gabimin me siper.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nU anulua.")
        sys.exit(130)
