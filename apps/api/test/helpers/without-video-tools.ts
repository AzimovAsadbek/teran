import { WITHOUT_VIDEO_TOOLS } from '../test-env.js';

// Imported first by suites whose films are made-up MP4 boxes, not films ffprobe could read: they
// test uploads and publishing rules without ffmpeg (ADR-061). The API reads its configuration
// once, when its application module is imported.
Object.assign(process.env, WITHOUT_VIDEO_TOOLS);
