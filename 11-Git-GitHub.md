# 11 — Git & GitHub Integration

## Git tools
- git_status
- git_diff
- git_log
- git_branch
- git_checkout
- git_add
- git_commit
- git_pull
- git_push
- git_clone

## Policy
Potentially destructive Git actions must be policy controlled. Hard resets and similar operations require confirmation by default.

## Example workflow
User asks to commit and push -> status -> add -> commit -> push, with policy/confirmation as configured.

## GitHub module
Optional separate integration.

## GitHub features
create_repository, list_repositories, create_issue, read_issue, create_pull_request, read_pull_request, comment_on_issue, comment_on_pull_request.

## Authentication
Support OAuth or personal access tokens for GitHub integration. Keep credentials in secure storage.