import express from 'express';
import { createServer } from 'http';

import { createAgentsRouter } from './server/routes/agents.routes.ts';
import { createProjectsRouter } from './server/routes/projects.routes.ts';
import { createFsRouter } from './server/routes/fs.routes.ts';
import { createRunRouter } from './server/routes/run.routes.ts';
import { createDiffRouter } from './server/routes/diff.routes.ts';
import { createSoloPilotRouter } from './server/routes/solo-pilot.routes.ts';
import { createPreviewRouter } from './server/routes/preview.routes.ts';
import { createIntentRouter } from './server/routes/intent.routes.ts';
import { createTimelineRouter } from './server/routes/timeline.routes.ts';
import { createArtifactsRouter } from './server/routes/artifacts.routes.ts';
import { createPublishingRouter } from './server/routes/publishing.routes.ts';
import { createFoldersRouter } from './server/routes/folders.routes.ts';
import { createInventoryRouter } from './server/routes/inventory.routes.ts';
import { createChatRouter } from './server/routes/chat.routes.ts';
import { createLegacyAliasRouter } from './server/routes/legacy-aliases.routes.ts';
import { createCompatRouter } from './server/routes/compat.routes.ts';
import { createRuntimeRouter } from './server/routes/runtime.routes.ts';
import { createPreviewProxy } from './server/proxy/preview-proxy.ts';
import { createSseRouter } from './server/streams/sse.ts';
import { attachWebSocketServer } from './server/streams/ws-server.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Existing pipeline router
app.use('/api/agents', createAgentsRouter());

// New orchestration routers
app.use('/api/projects', createProjectsRouter());
app.use('/api/fs', createFsRouter());
app.use('/api/run', createRunRouter());
app.use('/api/agent/diff-queue', createDiffRouter());
app.use('/api/solo-pilot', createSoloPilotRouter());
app.use('/api/preview', createPreviewRouter());
app.use('/api/ai/intent', createIntentRouter());
app.use('/api/timeline', createTimelineRouter());
app.use('/api/artifacts', createArtifactsRouter());
app.use('/api/publishing', createPublishingRouter());
app.use('/api/folders', createFoldersRouter());
app.use('/api/inventory', createInventoryRouter());
app.use('/api/chat', createChatRouter());

// Real runtime endpoints (project run/stop/restart, packages, git, screenshot)
// Mounted BEFORE legacy aliases so it wins on overlapping paths.
app.use(createRuntimeRouter());

// Preview proxy: /preview/:projectId/* → child process port
app.use('/preview', createPreviewProxy());

// Compat / legacy alias routers (mounted at root because paths include their own prefix)
app.use(createLegacyAliasRouter());
app.use(createCompatRouter());

// SSE adapters (mounted at root because paths include their own prefix)
app.use(createSseRouter());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'running',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

app.post('/api/echo', (req, res) => {
  res.json({ echo: req.body });
});

app.get('/api/pro', (_req, res) => {
  res.json({ feature: 'pro-dashboard', enabled: true });
});

app.get('/api/enterprise', (_req, res) => {
  res.json({ feature: 'enterprise-analytics', enabled: true });
});

const server = createServer(app);
attachWebSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[nura-x] API server running on port ${PORT}`);
  console.log(`[nura-x] Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('[nura-x] SIGTERM received — graceful shutdown');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[nura-x] SIGINT received — graceful shutdown');
  server.close(() => process.exit(0));
});

export default app;
