#!/bin/sh
# filter-branch 的 tree-filter：把历史版本里的证书编号抹掉。
# 只匹配 ASCII 部分（编号本身），避免在 Windows 上把中文写进 sed 模式时编码出问题。
if [ -f src/data/competitions.json ]; then
  sed -i 's/"extra": "[^"]*[^"]*"/"extra": null/g' src/data/competitions.json
fi
exit 0
