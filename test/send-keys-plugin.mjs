export function sendKeysPlugin() {
    return {
        name: 'send-keys-command',
        async executeCommand({ command, payload = {}, session }) {
            if (command === 'send-keys') {
                // handle specific behavior for playwright
                if (session.browser.type === 'playwright') {
                    if (payload.type) {
                        const page = session.browser.getPage(session.id);
                        await page.keyboard.type(payload.type);
                        return true;
                    } else if (payload.press) {
                        const page = session.browser.getPage(session.id);
                        await page.keyboard.press(payload.press);
                        return true;
                    }
                }
                // you might not be able to support all browser launchers
                throw new Error(
                    `Sending keys is not supported for browser type ${session.browser.type}.`
                );
            }
        },
    };
}
