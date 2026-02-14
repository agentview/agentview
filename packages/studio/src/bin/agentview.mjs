#!/usr/bin/env node
import { tsImport } from 'tsx/esm/api';
await tsImport('./agentview.ts', import.meta.url);
