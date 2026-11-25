#!/usr/bin/env bash
# Usage: switch-config.sh [spark|cloud|hybrid]
# Commute le profil agents de opencode. Profil actif: agents/ (vrai dossier)
# contenant des symlinks PAR FICHIER vers agents-<profil>/*.md.
#
#   spark  : impl + test-writer + security qwen3.6-35b, QA ornith-1.5-35b (soludevtech),
#            reviewers minimax-m3.1-flash (ollama-cloud)
#   cloud  : impl glm-5.3-flash, reviewers + QA minimax-m3.1-flash, security glm-5.3-flash (ollama-cloud)
#   hybrid : impl + test-writer qwen3.6-35b (soludevtech), reviewers minimax-m3.1-flash,
#            QA + security glm-5.3-flash (ollama-cloud)
#
# v2: la discovery des agents ne suit PAS les symlinks de répertoires
# (le dossier agents doit être un vrai dossier) — on symlinde les .md un par un.
# Sans argument: affiche la config active.
set -eu

OC_DIR=~/.config/opencode
profiles=(spark cloud hybrid)
target="${1:-}"

active_profile() {
  # Détermine le profil actif depuis la cible du premier symlink fichier de agents/
  local first dest
  first=$(find "${OC_DIR}/agents" -maxdepth 1 -type l -print -quit 2>/dev/null || true)
  if [[ -z "$first" ]]; then
    echo '(inconnu — agents/ est un vrai dossier sans symlinks fichiers)'
    return
  fi
  dest=$(readlink "$first")
  for p in "${profiles[@]}"; do
    [[ "$dest" == *"/agents-${p}/"* ]] && { echo "$p"; return; }
  done
  echo '(inconnu)'
}

show() {
  echo "Profil actif: $(active_profile)"
  echo
  echo "Profils disponibles: ${profiles[*]}"
  echo "Usage: $0 <${profiles[*]}>"
}

if [[ -z "$target" ]]; then
  show
  exit 0
fi

case "$target" in
  spark|cloud|hybrid) ;;
  *) echo "Profil inconnu: $target" >&2; echo "Usage: $0 <${profiles[*]}> (sans arg = état)" >&2; exit 1 ;;
esac

src="${OC_DIR}/agents-${target}"
[[ -d "$src" ]] || { echo "Manquant: $src" >&2; exit 1; }

# Remplace le contenu de agents/ par des symlinks fichiers du profil cible.
# NB: agents-${target}/ peut lui-même contenir des sous-agents en .md plats.
mkdir -p "${OC_DIR}/agents"
find "${OC_DIR}/agents" -maxdepth 1 -type l -delete 2>/dev/null || true
find "${src}" -maxdepth 1 -name '*.md' | while read -r f; do
  ln -sf "$f" "${OC_DIR}/agents/$(basename "$f")"
done

echo "Profil actif: ${target} ($(ls "${OC_DIR}/agents"/*.md 2>/dev/null | wc -l | tr -d ' ') agents)"
echo "  NB: relance les sessions TUI pour recharger la liste d'agents."