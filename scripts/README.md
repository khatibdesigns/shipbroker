# EC2 Claude-CLI proxy — ShipBroker AI agent

The "Send with AI" flow talks to a small stdlib Python proxy on the shared EC2 box
(`16.16.79.251:8090`, systemd unit `caption-proxy`) that shells out to the local
`claude` CLI under a personal subscription — **no API tokens**. The same box also
powers Gulf Caption Studio (`/generate`) and Spotly (`/plan`, `/screen`, `/email`).

`ec2-server.py` here is a **reference copy** of the deployed
`/home/ec2-user/caption-proxy/server.py`. ShipBroker added the **`/ship`** endpoint.

## `/ship` — conversational shipment builder (with vision)

`POST /ship`, `Content-Type: application/json`:

```jsonc
{
  "messages": [{ "role": "user|assistant", "text": "…" }],  // running transcript
  "draft":    { /* current ShipmentDraft, may be partly empty */ },
  "lang":     "en" | "ar",
  "image":    "<base64>",        // optional photo of the item
  "imageMime":"image/jpeg|png"
}
```

Response:

```jsonc
{
  "reply": "next chat message",
  "draft": { "item": …, "fromCity": …, "toCity": …, "mode": "air|road|sea",
             "weightKg": …, "size": …, "dimensions": {…}, "timing": …, … },
  "chips": ["Air", "Road", "ASAP", …],   // up to 4 tappable quick-replies
  "ready": false
}
```

When an image is supplied the server writes it to `ship_uploads/<uuid>.jpg` and runs
`claude -p "<prompt>" --append-system-prompt <SHIP_SYSTEM> --model sonnet
--output-format text --allowedTools Read` so the CLI's Read tool can *see* the photo
(vision, token-free). The temp file is deleted after the turn. The system prompt
(`SHIP_SYSTEM`) makes the model ask one question at a time, recommend a transport
mode, honour corrections (e.g. "change the weight to 20 kg"), and emit strict JSON.

## Deploy / update

```bash
# from this repo
scp -i ~/.ssh/openclaw-ssh.pem scripts/ec2-server.py \
    ec2-user@16.16.79.251:/home/ec2-user/caption-proxy/server.py
ssh -i ~/.ssh/openclaw-ssh.pem ec2-user@16.16.79.251 \
    'python3 -m py_compile ~/caption-proxy/server.py && sudo systemctl restart caption-proxy && curl -s localhost:8090/health'
```

The box keeps timestamped `server.py.bak.*` backups; always back up before replacing.

> Same caveat as the other apps: this runs on a personal Claude subscription via the
> CLI (licensed for interactive developer use). Before a real launch, move generation
> to a proper Anthropic API key / Bedrock / Vertex.
