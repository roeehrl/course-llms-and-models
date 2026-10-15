#!/bin/bash
# Merge PRs in order once 12/12 green on a head that contains current main; rebase the next.
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
    if [[ $s == " 12 pass," ]]; then gh pr merge $n -R $R --rebase --match-head-commit $h && echo "$(date +%T) MERGED PR $n ($h)"; break; fi
    sleep 120
  done
done
