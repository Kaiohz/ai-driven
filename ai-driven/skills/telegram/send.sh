#!/usr/bin/env bash
# send.sh — send a Telegram message via the Bot API.
# Usage:
#   send.sh "<message>"    send a message
#   send.sh --test         send a test message (setup verification)
# Credentials (first found wins):
#   1. TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID environment variables
#   2. ~/.config/opencode/.telegram.env (chmod 600, sourced)
# Exit codes: 0 = sent ("ok":true), 1 = missing credentials or API error.
set -euo pipefail

env_file="${HOME}/.config/opencode/.telegram.env"
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" && -f "${env_file}" ]]; then
  # shellcheck disable=SC1090
  source "${env_file}"
fi

token="${TELEGRAM_BOT_TOKEN:-}"
chat_id="${TELEGRAM_CHAT_ID:-}"

if [[ -z "${token}" || -z "${chat_id}" ]]; then
  echo "telegram: NOT CONFIGURED — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in ${env_file} (chmod 600) or in the environment" >&2
  exit 1
fi

text="${1:-}"
if [[ "${text}" == "--test" ]]; then
  text="🤖 Test OpenCode : le bot Telegram est opérationnel — les notifications de loop arriveront ici."
elif [[ -z "${text}" ]]; then
  echo 'telegram: missing message — usage: send.sh "<message>" | send.sh --test' >&2
  exit 1
fi

response="$(curl -s --max-time 15 -X POST \
  "https://api.telegram.org/bot${token}/sendMessage" \
  --data-urlencode "chat_id=${chat_id}" \
  --data-urlencode "text=${text}" || echo '{"ok":false,"error":"curl failed"}')"

if printf '%s' "${response}" | grep -q '"ok":true'; then
  echo "telegram: message sent to ${chat_id}"
  exit 0
fi

echo "telegram: SEND FAILED — API response: ${response}" >&2
exit 1
