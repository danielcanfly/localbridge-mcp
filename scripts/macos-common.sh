#!/bin/sh

# Shared macOS tool discovery. Explicit overrides always win.
dc_find_tool() {
  override="$1"
  name="$2"

  if [ -n "$override" ]; then
    if [ -x "$override" ]; then
      printf '%s\n' "$override"
      return 0
    fi
    echo "Configured $name is not executable: $override" >&2
    return 1
  fi

  for candidate in "/opt/homebrew/bin/$name" "/usr/local/bin/$name" "/usr/bin/$name"; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  found=$(command -v "$name" 2>/dev/null || true)
  if [ -n "$found" ] && [ -x "$found" ]; then
    printf '%s\n' "$found"
    return 0
  fi

  return 1
}

dc_node_major() {
  "$1" -p 'Number(process.versions.node.split(".")[0])'
}

dc_runtime_path() {
  node_dir=$(dirname "$1")
  tunnel_dir=$(dirname "$2")
  printf '%s\n' "$node_dir:$tunnel_dir:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
}
