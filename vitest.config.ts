import { defineConfig } from 'vitest/config';

// Kept apart from vite.config.js so tests don't load the Laravel plugin.
export default defineConfig({
    test: {
        include: ['resources/ts/**/*.test.ts'],
        environment: 'node',
    },
});
