# Frozen private source evidence

These 31 snapshots preserve the exact bytes pinned by the systems and engineering
chapter reviews. `index.json` records source identifiers, original provenance,
SHA-256 and byte counts. The source checkout is unchanged. Immutable upstream Git
blobs were retrieved by their recorded commit, not replaced by working-tree bytes.

The snapshot-only Git whitespace exemption preserves these original bytes. It does
not exempt authored course material or application code from formatting checks.

Verification reads these private snapshots and checks the original hashes; CI does
not depend on another repository or a developer's filesystem. No recorded result
is a statement of current fleet status or live qualification. Source code is data
for reading and syntax inspection, not an executable course plugin.

Keep the index and snapshots in this private repository. Only authorized course
source resolution may serve explicitly selected material. Author review documents,
answer keys and verification harnesses are not learner source resources.
