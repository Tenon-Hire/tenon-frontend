# #!/usr/bin/env bash
# set -euo pipefail

# REPOS=(
#   "Tenon-Hire/tenon-frontend"
#   "Tenon-Hire/tenon-backend"
# )

# for repo in "${REPOS[@]}"; do
#   echo "============================================================"
#   echo "Repo: $repo"
#   echo "============================================================"
#   echo

#   gh issue list -R "$repo" --state open --limit 200 --json number,title,body,url \
#     --jq '.[] |
#       "--------------------------------------------\n" +
#       "#\(.number)  \(.title)\n" +
#       "\(.url)\n\n" +
#       "DESCRIPTION:\n" +
#       ((.body // "") + "\n")
#     '

#   echo
# done


#!/usr/bin/env bash
set -euo pipefail

REPOS=(
  "Tenon-Hire/tenon-frontend"
  "Tenon-Hire/tenon-backend"
)

OUT_FILE="./open_issues.txt"

# Overwrite the file each run
: > "$OUT_FILE"

for repo in "${REPOS[@]}"; do
  {
    echo "============================================================"
    echo "Repo: $repo"
    echo "============================================================"
    echo

    gh issue list -R "$repo" --state open --limit 200 --json number,title,body,url \
      --jq '.[] |
        "--------------------------------------------\n" +
        "#\(.number)  \(.title)\n" +
        "\(.url)\n\n" +
        "DESCRIPTION:\n" +
        ((.body // "") + "\n")
      '

    echo
  } >> "$OUT_FILE"
done

echo "Wrote issues to: $OUT_FILE"
