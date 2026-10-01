# 08 — Filesystem Module

## Required tools
list_directory, get_file_info, read_file, create_file, update_file, append_file, delete_file, create_directory, delete_directory, move_file, copy_file, search_files, search_in_files.

## Optional tools
watch_directory, compare_files, calculate_hash, compress_files, extract_archive.

## Workspace rule
Resolve every filesystem target against an approved workspace boundary.

## Security
Path traversal is blocked. Resolved paths, links and directory aliases must not escape the allowed workspace.

## Example flow
User asks to create a folder -> AI calls create_directory -> server validates path and permission -> agent creates folder -> structured result returns final path and status.

## Privacy
Only requested file content is returned to the AI client.