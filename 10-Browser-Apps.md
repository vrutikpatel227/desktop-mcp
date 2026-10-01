# 10 — Browser & Application Control

## Browser module
Implement browser automation as a separate capability module.

## Tools
open_url, get_page, click, type, select, submit, take_screenshot, get_page_text, wait_for_element.

## Recommended implementation
Playwright.

## SSRF protection
Network/browser tools must validate destinations. Block localhost, loopback, 0.0.0.0, private address ranges, cloud metadata endpoints and internal ranges unless an explicit policy allows them.

## Application control
Allowed applications are configuration driven.

Example apps: VS Code, Chrome, PowerShell.

## Tools
launch_application, close_application, focus_application.

## Browser safety
Browser sessions should be isolated where possible and sensitive credentials must not be exposed through tool output.