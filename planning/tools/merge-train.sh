#!/bin/bash
# Merge PRs in order once every check (at least 12) is green on a head that contains current main; rebase the next.
R=roeehrl/course-core
for n in "$@"; do
  while true; do
    main=$(gh api repos/$R/branches/main -q .commit.sha)
    head=$(gh pr view $n -R $R --json headRefOid,state -q '.state+" "+.headRefOid')
    [[ $head == MERGED* ]] && { echo "PR $n already merged"; break; }
    h=${head#OPEN }
    if ! gh api repos/$R/compare/$main...$h -q .behind_by | grep -qx 0; then
      echo "$(date +%T) PR $n behind main; rebasing"; gh pr update-branch $n -R $R --rebase || { echo "PR $n rebase conflict"; exit 2; }; sleep 60; continue; fi
    s=$(gh pr checks $n -R $R 2>/dev/null | awk -F'\t' '{print $2}' | sort | uniq -c | tr -s ' ' | tr '\n' ',')
    if [[ $s == *fail* ]]; then echo "$(date +%T) PR $n FAILED: $s"; exit 1; fi
    if [[ $s =~ ^\ ([0-9]+)\ pass,$ ]] && (( BASH_REMATCH[1] >= 12 )); then
      # A release tags a "Version X" commit only once its own main CI passes; say so if that run is still going.
      msg=$(gh api repos/$R/commits/$main -q .commit.message | head -1)
      if [[ $msg == "Version "* ]]; then
        st=$(gh run list -R $R --workflow ci.yml --branch main --commit $main -L 1 --json status -q '.[0].status')
        [[ $st != completed ]] && echo "$(date +%T) WARNING: main is \"$msg\" ($main) and its CI is ${st:-not started}; the release waits on that run"
      fi
      gh pr merge $n -R $R --rebase --match-head-commit $h && echo "$(date +%T) MERGED PR $n ($h)"; break; fi
    sleep 120
  done
done
