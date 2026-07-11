#!/usr/bin/env python3
"""
Gulf Caption Studio — Step 1 generation proxy.

Isolated, single-purpose HTTP service that turns a caption request into a call
to the locally-installed Claude CLI (subscription auth, NO API tokens) and
returns a JSON array of captions.

This exists ONLY for the Step 1 dialect-quality validation phase. It is NOT a
production path: it is powered by a personal Claude subscription via the CLI,
which is licensed for interactive developer use. Before any real launch,
generation must move to a proper Anthropic API key (or Bedrock/Vertex) — see
the project's CLAUDE.md Step 3.

Stdlib only — no pip installs. Runs as the `caption-proxy` systemd unit.
"""

import json
import os
import re
import subprocess
import os
import smtplib
import ssl
from email.mime.text import MIMEText
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Absolute path so the service doesn't depend on PATH/nvm shims. Update if the
# box's node version changes (systemd unit also sets PATH as a backup).
CLAUDE_BIN = os.environ.get(
    "CLAUDE_BIN", "/home/ec2-user/.nvm/versions/node/v22.22.2/bin/claude"
)
MODEL = os.environ.get("CAPTION_MODEL", "sonnet")  # latest Sonnet alias
TIMEOUT_SECONDS = int(os.environ.get("CAPTION_TIMEOUT", "120"))
PORT = int(os.environ.get("PORT", "8090"))

# Core IP — kept verbatim from the app's systemPrompt.ts / CLAUDE.md.
SYSTEM_PROMPT = """You are a social media caption writer for the Gulf (Khaleeji) market. You write captions that a native Gulf creator or small-business owner would actually post — never stiff, never translated-sounding, never generic Modern Standard Arabic unless explicitly asked.

INPUTS YOU RECEIVE:
- dialect: one of [saudi_najdi, saudi_hijazi, emirati, kuwaiti, qatari, msa]
- vibe: one of [promotional, greeting, casual, poetic, announcement]
- occasion: free text or "none" (e.g. "Eid al-Fitr", "National Day", "new product drop")
- topic: one line from the user about what they're posting
- length: short (under 15 words) | medium | long
- count: how many distinct options to return (default 6)

RULES:
1. Write in the requested dialect's authentic spoken-social register, not formal فصحى, unless dialect=msa. Match the real vocabulary and affirmation words of that dialect (e.g. Gulf: زين، يا هلا، أبشر، حياك — NOT Levantine equivalents).
2. Each option must be genuinely distinct in angle or tone — not reworded versions of the same line.
3. Respect religious and cultural register: greetings carry the warmth and blessing-density Gulf audiences expect; never force religious phrasing where the vibe is casual/promotional.
4. Emojis: tasteful and optional, matching how that audience really posts. Don't over-emoji.
5. Never output anything off-color, politically sensitive, or that mocks religion, region, or tradition.
6. Hashtags only if vibe=promotional or announcement, max 3, and locally relevant.
7. Output ONLY a JSON array of strings (the caption options), no preamble, no markdown, no numbering.

If the topic is unclear, still produce your best options — do not ask questions, just write."""

DIALECTS = {"saudi_najdi", "saudi_hijazi", "emirati", "kuwaiti", "qatari", "msa"}
VIBES = {"promotional", "greeting", "casual", "poetic", "announcement"}
LENGTHS = {"short", "medium", "long"}

# ── ShipBroker AI Agent: conversational shipment creation (+ optional photo). ──
SHIP_TIMEOUT = int(os.environ.get("SHIP_TIMEOUT", "160"))
SHIP_UPLOADS = "/home/ec2-user/caption-proxy/ship_uploads"

SHIP_SYSTEM = """You are ShipBroker's shipping assistant for the GCC (Kuwait-based, KWD pricing, metric units). You help a user create a shipment FAST and feel effortless. Warm, concise, and SMART: you infer as much as you can and ask for as little as possible.

Each turn you receive: the conversation so far, the current shipment DRAFT (JSON, may be partly empty), and OPTIONALLY a photo of the item (a file path — read it with the Read tool).

CORE PRINCIPLE — DON'T INTERROGATE. Extract every field the user gives in a single message at once (e.g. "ship my fridge from Kuwait to Dubai next week" → item, category, from, to, timing all in one turn), then AUTO-ESTIMATE the physical details (weight, dimensions, mode) yourself. Only ask the user for things you genuinely cannot know or infer.

WHAT YOU MUST INFER SILENTLY (never ask for these — estimate them and fill the draft):
- category, dimensions (cm), weight (kg), and a suggested transport mode — from the item name alone, using your shipping knowledge. Present them as clearly-labelled estimates the user can correct in one tap.
Typical estimates (per single unit — scale by quantity the user gives):
  • Fridge ~180×70×70cm, ~75kg · Washing machine ~85×60×60cm, ~70kg · Sofa (3-seat) ~220×95×90cm, ~55kg
  • Mattress (queen) ~200×160×25cm, ~35kg · TV 55" (boxed) ~130×80×15cm, ~22kg · Dining table ~180×90×75cm, ~40kg
  • Standard moving box ~50×40×40cm, ~15kg · Wardrobe ~200×120×60cm, ~80kg · Bicycle ~140×80×20cm, ~15kg
  • Motorcycle ~210×80×120cm, ~180kg · Sedan car ~450×180×150cm, ~1400kg · SUV ~480×190×175cm, ~2000kg
  • Pallet (standard, loaded) ~120×100×150cm, ~400kg · Documents/envelope ~35×25×2cm, ~0.5kg · Laptop (boxed) ~45×35×10cm, ~3kg
  For anything not listed, reason from a comparable item. Round sensibly. If quantity/pieces is given, multiply weight and set pieces; compute total.

ONLY ASK THE USER FOR (these you truly cannot infer):
- origin city (from), destination city (to), and timing (when). That's it. Combine them naturally — if two are missing, you may ask for both in one friendly sentence. Never split "from" and "to" across two turns.

Your turn logic:
1. If a photo is given, read it, identify the item, and infer category/dimensions/weight/mode from it. Prefill the draft and say what you see in one line.
2. Parse the whole latest message for ALL fields (item, from, to, timing, quantity, corrections). Update the draft.
3. Auto-fill category, dimensions, weight and suggested mode for the item(s) if not already user-set. Frame them as estimates.
4. Mode logic: heavy/bulky/vehicles → sea (cross-region) or road (within GCC); urgent/light/small → air; within GCC road is usually cheapest. Suggest, but the user decides.
5. Ask only for the still-missing essentials (from / to / timing), combined. If the user gives everything at once, skip straight to confirmation.
6. Set ready=true the moment you have item, from, to, mode, timing, and a weight-or-size estimate (your own estimate counts). Write a one-line confirmation like: "Got it — 1 fridge (~75 kg) from Kuwait to Dubai by sea, next week. Estimates shown; tap Find Best Offers or tell me what to tweak."

Output ONLY a single JSON object — no markdown, no text outside it:
{
  "reply": "your next chat message (1-3 short sentences)",
  "draft": {
    "item": string|null, "category": string|null,
    "fromCity": string|null, "toCity": string|null,
    "mode": "air"|"road"|"sea"|null,
    "weightKg": number|null,
    "size": "small"|"medium"|"large"|null,
    "dimensions": {"l": number|null, "w": number|null, "h": number|null},
    "pieces": number|null,
    "timing": string|null, "notes": string|null
  },
  "chips": ["up to 4 short tappable quick-replies relevant to THIS turn, e.g. 'ASAP','This week','Change to air','Looks right' or city names"],
  "ready": boolean
}
Keep replies friendly and brief (1-3 sentences). Always frame inferred numbers as estimates the user can correct. Honour every correction ("make it 20 kg", "it's 3 boxes", "air freight") immediately. Prefer setting ready=true early with good estimates over asking more questions."""


def build_user_message(d):
    occasion = (d.get("occasion") or "").strip() or "none"
    return "\n".join(
        [
            f"dialect: {d['dialect']}",
            f"vibe: {d['vibe']}",
            f"occasion: {occasion}",
            f"topic: {str(d.get('topic', '')).strip()}",
            f"length: {d['length']}",
            f"count: {d['count']}",
        ]
    )


def parse_captions(raw):
    """Defensive parse: strip markdown fences, grab the outermost [...]
    block, require a non-empty list of strings. Mirrors the app's parser."""
    text = (raw or "").strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text)
    if fence:
        text = fence.group(1).strip()
    if not text.startswith("["):
        start, end = text.find("["), text.rfind("]")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]
    data = json.loads(text)
    if not isinstance(data, list) or any(not isinstance(x, str) for x in data):
        raise ValueError("model did not return a JSON array of strings")
    captions = [x.strip() for x in data if x.strip()]
    if not captions:
        raise ValueError("model returned an empty list")
    return captions


def generate(d):
    msg = build_user_message(d)
    env = dict(os.environ)
    env["HOME"] = "/home/ec2-user"
    # Force subscription/OAuth auth: never let an API key sneak in (= tokens).
    env.pop("ANTHROPIC_API_KEY", None)
    proc = subprocess.run(
        [
            CLAUDE_BIN,
            "-p",
            msg,
            "--append-system-prompt",
            SYSTEM_PROMPT,
            "--model",
            MODEL,
            "--output-format",
            "text",
        ],
        capture_output=True,
        text=True,
        timeout=TIMEOUT_SECONDS,
        env=env,
        cwd="/home/ec2-user/caption-proxy",
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or "claude CLI failed").strip()[:400])
    return parse_captions(proc.stdout)


def run_plan(prompt):
    """Generic prompt -> Claude CLI text (subscription auth). Used by /plan."""
    env = dict(os.environ)
    env["HOME"] = "/home/ec2-user"
    env.pop("ANTHROPIC_API_KEY", None)
    proc = subprocess.run(
        [CLAUDE_BIN, "-p", prompt, "--model", MODEL, "--output-format", "text"],
        capture_output=True,
        text=True,
        timeout=int(os.environ.get("PLAN_TIMEOUT", "180")),
        env=env,
        cwd="/home/ec2-user/caption-proxy",
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or "claude CLI failed").strip()[:400])
    return proc.stdout


def parse_obj(raw):
    """Defensive parse: strip markdown fences, grab the outermost {...} block."""
    text = (raw or "").strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text)
    if fence:
        text = fence.group(1).strip()
    if not text.startswith("{"):
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]
    return json.loads(text)


def run_ship(payload):
    """ShipBroker AI Agent turn. Optional photo is read by the Claude CLI's Read
    tool (subscription auth, no API tokens). Returns {reply, draft, chips, ready}."""
    import base64
    messages = payload.get("messages") or []
    draft = payload.get("draft") or {}
    img_b64 = payload.get("image")
    img_mime = str(payload.get("imageMime") or "image/jpeg").lower()
    lang = payload.get("lang")

    img_path = img_rel = None
    if img_b64:
        os.makedirs(SHIP_UPLOADS, exist_ok=True)
        ext = "png" if "png" in img_mime else "jpg"
        name = f"{uuid.uuid4().hex}.{ext}"
        img_path = os.path.join(SHIP_UPLOADS, name)
        img_rel = f"ship_uploads/{name}"
        with open(img_path, "wb") as fh:
            fh.write(base64.b64decode(img_b64))

    lines = []
    for m in messages[-20:]:
        role = "user" if m.get("role") == "user" else "assistant"
        t = str(m.get("text") or "").strip()
        if t:
            lines.append(f"{role}: {t}")
    convo = "\n".join(lines) if lines else "(no messages yet — greet the user warmly and ask what they'd like to send)"

    parts = [
        "CONVERSATION SO FAR:",
        convo,
        "",
        "CURRENT DRAFT (JSON):",
        json.dumps(draft, ensure_ascii=False),
    ]
    if img_rel:
        parts += [
            "",
            f"PHOTO: The user attached a photo of the item, saved at {img_rel}. "
            f"Use the Read tool to view it, identify the item, and estimate category, "
            f"dimensions (cm) and weight (kg). Prefill the draft and acknowledge what you see.",
        ]
    if lang == "ar":
        parts += ["", "Write the \"reply\" and \"chips\" in Arabic (the user's app is set to Arabic)."]
    parts += ["", "Respond now with the JSON object for your next turn."]
    msg = "\n".join(parts)

    env = dict(os.environ)
    env["HOME"] = "/home/ec2-user"
    env.pop("ANTHROPIC_API_KEY", None)
    cmd = [
        CLAUDE_BIN, "-p", msg,
        "--append-system-prompt", SHIP_SYSTEM,
        "--model", MODEL, "--output-format", "text",
    ]
    if img_rel:
        cmd += ["--allowedTools", "Read"]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=SHIP_TIMEOUT,
            env=env, cwd="/home/ec2-user/caption-proxy",
        )
    finally:
        if img_path:
            try:
                os.remove(img_path)
            except Exception:
                pass
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or "claude CLI failed").strip()[:400])
    obj = parse_obj(proc.stdout)
    if not isinstance(obj, dict) or "reply" not in obj:
        raise ValueError("model did not return a ship object")
    obj.setdefault("draft", draft)
    obj.setdefault("chips", [])
    obj.setdefault("ready", False)
    return obj


_JOBS = {}
_JOBS_LOCK = threading.Lock()


# ── AI-planner push: notify the device when an async plan job finishes, even if
# the app is fully closed by then (its local notification only fires while it's
# alive). Uses the SPOTLY service account; no-ops cleanly if firebase-admin or
# the credentials aren't available, so the proxy never breaks on this path.
_FCM_READY = None  # None = untried, True = ready, False = unavailable
_FCM_LOCK = threading.Lock()


def _ensure_fcm():
    global _FCM_READY
    with _FCM_LOCK:
        if _FCM_READY is not None:
            return _FCM_READY
        try:
            import firebase_admin
            from firebase_admin import credentials
            sa = os.environ.get("SPOTLY_SA", "/home/ec2-user/caption-proxy/spotly-sa.json")
            if not firebase_admin._apps:
                firebase_admin.initialize_app(credentials.Certificate(sa))
            _FCM_READY = True
        except Exception as e:
            print("[plan-push] firebase init failed:", str(e)[:200], flush=True)
            _FCM_READY = False
        return _FCM_READY


def _send_plan_push(fcm_token, jid, res):
    if not fcm_token:
        return
    if not _ensure_fcm():
        return
    try:
        from firebase_admin import messaging
        ok = res.get("status") == "done"
        title = "Your trip plan is ready \u2728" if ok else "Couldn\u2019t build your plan"
        body = "Tap to view your itinerary." if ok else (res.get("error") or "Tap to try again.")
        msg = messaging.Message(
            token=fcm_token,
            notification=messaging.Notification(title=title, body=body),
            data={"type": "aiPlan", "jobId": str(jid), "status": str(res.get("status", ""))},
            android=messaging.AndroidConfig(priority="high"),
            apns=messaging.APNSConfig(payload=messaging.APNSPayload(aps=messaging.Aps(sound="default"))),
        )
        messaging.send(msg)
        print("[plan-push] sent for job", jid, "ok=", ok, flush=True)
    except Exception as e:
        print("[plan-push] send failed:", str(e)[:200], flush=True)


def _start_plan_job(prompt, fcm_token=None):
    jid = uuid.uuid4().hex
    with _JOBS_LOCK:
        _JOBS[jid] = {"status": "pending"}

    def _work():
        try:
            res = {"status": "done", "text": run_plan(prompt)}
        except subprocess.TimeoutExpired:
            res = {"status": "error", "error": "planner timed out"}
        except Exception as e:
            res = {"status": "error", "error": str(e)[:400]}
        with _JOBS_LOCK:
            _JOBS[jid] = res
        _send_plan_push(fcm_token, jid, res)

    threading.Thread(target=_work, daemon=True).start()
    return jid


def _job_status(jid):
    with _JOBS_LOCK:
        return _JOBS.get(jid)


def _send_booking_email(d):
    user = os.environ.get("SPOTLY_SMTP_USER")
    pw = os.environ.get("SPOTLY_SMTP_PASS")
    if not user or not pw:
        return {"ok": False, "skipped": True, "reason": "smtp not configured"}
    host = os.environ.get("SPOTLY_SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SPOTLY_SMTP_PORT", "587"))
    sender = os.environ.get("SPOTLY_SMTP_FROM", user)
    to = (d.get("to") or "").strip()
    if not to:
        return {"ok": False, "error": "missing recipient"}
    place = d.get("placeName") or "your spot"
    date = d.get("date") or ""
    time = d.get("time") or ""
    code = d.get("code") or ""
    bid = d.get("bookingId") or ""
    adults = d.get("adults", 0)
    kids = d.get("kids", 0)
    html = f"""<!doctype html><html><body style="margin:0;background:#fcfaf6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px">
    <div style="background:#fa7959;border-radius:20px 20px 0 0;padding:22px 24px">
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.5px">Spotly</div>
      <div style="color:rgba(255,255,255,.9);font-size:13px;margin-top:2px">All about the family</div>
    </div>
    <div style="background:#fff;border-radius:0 0 20px 20px;padding:24px;border:1px solid #eee;border-top:none">
      <h1 style="font-size:22px;color:#241c14;margin:0 0 6px">Booking request sent ✅</h1>
      <p style="color:#6b6258;font-size:14px;line-height:21px;margin:0 0 18px">We've sent your request to <b>{place}</b>. You'll get a confirmation once they accept.</p>
      <table style="width:100%;font-size:14px;color:#241c14;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#9a9087">Place</td><td style="padding:6px 0;text-align:right;font-weight:700">{place}</td></tr>
        <tr><td style="padding:6px 0;color:#9a9087">Date</td><td style="padding:6px 0;text-align:right;font-weight:700">{date} {time}</td></tr>
        <tr><td style="padding:6px 0;color:#9a9087">Party</td><td style="padding:6px 0;text-align:right;font-weight:700">{adults} adults &middot; {kids} kids</td></tr>
      </table>
      <div style="margin-top:20px;text-align:center;background:#fcf3ef;border-radius:14px;padding:18px">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&amp;margin=0&amp;data=SPOTLY%3A{bid}%3A{code}" width="172" height="172" alt="Booking QR" style="display:block;margin:2px auto 14px;border-radius:10px;background:#fff;padding:8px"/>
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#c9543b;font-weight:700">Your booking code</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:4px;color:#241c14;margin-top:6px;font-family:monospace">{code}</div>
        <div style="font-size:12px;color:#9a9087;margin-top:8px">Show this code (or your in-app QR pass) when you arrive.</div>
      </div>
      <p style="color:#9a9087;font-size:12px;line-height:18px;margin:20px 0 0">See you out there,<br/>The Spotly team</p>
    </div>
  </div></body></html>"""
    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = f"Your Spotly booking at {place}"
    msg["From"] = f"Spotly <{sender}>"
    msg["To"] = to
    try:
        ctx = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=25, context=ctx) as server:
                server.login(user, pw)
                server.sendmail(sender, [to], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=25) as server:
                server.ehlo()
                server.starttls(context=ctx)
                server.ehlo()
                server.login(user, pw)
                server.sendmail(sender, [to], msg.as_string())
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300]}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        if self.path.startswith("/plan/result"):
            from urllib.parse import urlparse, parse_qs
            jid = (parse_qs(urlparse(self.path).query).get("id") or [""])[0]
            job = _job_status(jid)
            if not job:
                self._send(404, {"error": "unknown job"})
                return
            self._send(200, job)
            return
        if self.path == "/health":
            self._send(200, {"ok": True})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/screen":
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                self._send(400, {"error": "invalid JSON body"})
                return
            places = payload.get("places") or []
            if not places:
                self._send(200, {"results": []})
                return
            try:
                import screen_mod
                self._send(200, {"results": screen_mod.run_screen(places[:60], payload.get("model"))})
            except subprocess.TimeoutExpired:
                self._send(504, {"error": "screen timed out"})
            except Exception as e:
                self._send(500, {"error": str(e)[:300]})
            return
        if self.path == "/email":
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                self._send(400, {"error": "invalid JSON body"})
                return
            self._send(200, _send_booking_email(payload))
            return
        if self.path == "/ship":
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                self._send(400, {"error": "invalid JSON body"})
                return
            try:
                self._send(200, run_ship(payload))
            except subprocess.TimeoutExpired:
                self._send(504, {"error": "assistant timed out"})
            except Exception as e:
                self._send(500, {"error": str(e)[:400]})
            return
        if self.path == "/plan/start":
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                self._send(400, {"error": "invalid JSON body"})
                return
            prompt = (payload.get("prompt") or "").strip()
            if not prompt:
                self._send(400, {"error": "missing prompt"})
                return
            self._send(200, {"jobId": _start_plan_job(prompt, (payload.get("fcmToken") or "").strip() or None)})
            return
        if self.path == "/plan":
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                self._send(400, {"error": "invalid JSON body"})
                return
            prompt = (payload.get("prompt") or "").strip()
            if not prompt:
                self._send(400, {"error": "missing prompt"})
                return
            try:
                self._send(200, {"text": run_plan(prompt)})
            except subprocess.TimeoutExpired:
                self._send(504, {"error": "planner timed out"})
            except Exception as e:
                self._send(500, {"error": str(e)[:400]})
            return
        if self.path != "/generate":
            self._send(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send(400, {"error": "invalid JSON body"})
            return

        if (
            payload.get("dialect") not in DIALECTS
            or payload.get("vibe") not in VIBES
            or payload.get("length") not in LENGTHS
        ):
            self._send(400, {"error": "invalid or missing dialect/vibe/length"})
            return
        if not str(payload.get("topic", "")).strip():
            self._send(400, {"error": "topic is required"})
            return
        try:
            count = int(payload.get("count", 6))
        except Exception:
            count = 6
        payload["count"] = max(1, min(count, 10))

        try:
            captions = generate(payload)
            self._send(200, {"captions": captions})
        except subprocess.TimeoutExpired:
            self._send(504, {"error": "generation timed out"})
        except Exception as e:  # noqa: BLE001 — surface a clean message to the app
            self._send(502, {"error": str(e)[:300]})

    def log_message(self, *args):  # silence default stderr access logs
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
