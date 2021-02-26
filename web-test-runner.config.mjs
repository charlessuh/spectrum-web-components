/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { playwrightLauncher } from '@web/test-runner-playwright';
import { sendKeysPlugin } from './test/send-keys-plugin.mjs';
import { visualRegressionPlugin } from '@web/test-runner-visual-regression/plugin';
import fs from 'fs';
import path from 'path';

const packages = fs
    .readdirSync('packages')
    .filter((dir) => fs.statSync(`packages/${dir}`).isDirectory());

const vrtHTML = ({ color, scale, dir, reduceMotion }) => (testFramework) =>
    `<!doctype html>
    <html dir=${dir}>
        <head>
            <link rel="preconnect" href="https://use.typekit.net" />
            <link rel="dns-prefetch" href="https://use.typekit.net" />
            <!-- For Adobe Clean font support -->
            <link rel="stylesheet" href="https://use.typekit.net/evk7lzt.css" />
            <style>
                body {
                    margin: 0;
                }
                sp-story-decorator {
                    display:block;
                }
            </style>
        </head>
        <body>
        <script>
            window.__swc_hack_knobs__ = {
                defaultColor: "${color}",
                defaultScale: "${scale}",
                defaultDirection: "${dir}",
                defaultReduceMotion: ${reduceMotion},
            };
        </script>
        <script type="module" src="${testFramework}"></script>
        </body>
    </html>`;

const colors = ['lightest', 'light', 'dark', 'darkest'];
const scales = ['medium', 'large'];
const directions = ['ltr', 'rtl'];
const vrtGroups = [];
colors.forEach((color) => {
    scales.forEach((scale) => {
        directions.forEach((dir) => {
            const reduceMotion = true;
            const testHTML = vrtHTML({
                color,
                scale,
                dir,
                reduceMotion,
            });
            vrtGroups.push({
                name: `vrt-${color}-${scale}-${dir}`,
                files: 'test/visual/test.js',
                testRunnerHtml: testHTML,
                browsers: [playwrightLauncher({ product: 'chromium' })],
            });
        });
    });
});

export default {
    plugins: [
        sendKeysPlugin(),
        visualRegressionPlugin({
            update: process.argv.includes('--update-visual-baseline'),
            diffOptions: {
                threshold: 0,
            },
            baseDir: 'test/visual',
            getBaselineName: ({ browser, name }) => {
                const nameParts = name.split(' - ');
                return path.join('screenshots-baseline', browser, ...nameParts);
            },
            getDiffName: ({ browser, name }) => {
                const nameParts = name.split(' - ');
                return path.join(
                    'screenshots-current',
                    'diff',
                    browser,
                    ...nameParts
                );
            },
            getFailedName: ({ browser, name }) => {
                const nameParts = name.split(' - ');
                return path.join(
                    'screenshots-current',
                    'updates',
                    browser,
                    ...nameParts
                );
            },
        }),
    ],
    nodeResolve: true,
    concurrency: 4,
    concurrentBrowsers: 1,
    testsFinishTimeout: 200000,
    coverageConfig: {
        report: true,
        reportDir: 'coverage',
        exclude: [
            'packages/*/stories/*',
            'packages/icons-ui/**',
            'packages/icons-workflow/**',
            // The following file is no longer used in Chrome where coverage is calculated.
            'packages/shared/src/focus-visible.*',
            'packages/styles/**',
            'test/**',
        ],
        threshold: {
            statements: 98,
            branches: 93,
            functions: 94,
            lines: 98,
        },
    },
    testFramework: {
        config: {
            timeout: 100000,
        },
    },
    groups: [
        {
            name: 'unit',
            files: 'packages/*/test/*.test.js',
        },
        ...vrtGroups,
        ...packages.map((pkg) => ({
            name: pkg,
            files: `packages/${pkg}/test/*.test.js`,
        })),
    ],
    group: 'unit',
    browsers: [
        playwrightLauncher({ product: 'chromium' }),
        playwrightLauncher({ product: 'webkit' }),
        playwrightLauncher({
            product: 'firefox',
            launchOptions: {
                headless: false,
                args: ['-headless'],
                firefoxUserPrefs: {
                    'toolkit.telemetry.reportingpolicy.firstRun': false,
                    'browser.shell.checkDefaultBrowser': false,
                    'browser.bookmarks.restore_default_bookmarks': false,
                    'dom.disable_open_during_load': false,
                    'dom.max_script_run_time': 0,
                    'dom.min_background_timeout_value': 10,
                    'extensions.autoDisableScopes': 0,
                    'extensions.enabledScopes': 15,
                },
            },
        }),
    ],
};
