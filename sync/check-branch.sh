#!/usr/bin/env bash
set -euo pipefail

target=$1
branch=$2

# An absent branch is safe; transport/authentication errors must still fail.
remote_ref=$(git -C "$target" ls-remote --heads origin "refs/heads/$branch")
if [ -z "$remote_ref" ]; then
  exit 0
fi

git -C "$target" fetch --no-tags origin "refs/heads/$branch"
if git -C "$target" merge-base --is-ancestor FETCH_HEAD HEAD; then
  # The old sync was merged: a normal push from the base will fast-forward it.
  exit 0
else
  status=$?
  if [ "$status" -eq 1 ]; then
    # Preserve unmerged commits. The caller reports an actionable skipped result.
    exit 3
  fi
  exit "$status"
fi
