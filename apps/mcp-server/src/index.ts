import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createDesktopMcpServer } from '../../../packages/protocol/src/desktop-server.js';

serveStdio(createDesktopMcpServer);
