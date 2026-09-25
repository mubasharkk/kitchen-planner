import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/ts/main.ts'],
            refresh: true,
        }),
    ],
    build: {
        chunkSizeWarningLimit: 900,
    },
    server: {
        // Reachable from the host when running inside Sail.
        host: '0.0.0.0',
        hmr: { host: 'localhost' },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
