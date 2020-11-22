
var tab = null;

const common = {
    keyring: [],

    load: async () => {
        try {
            const data = await browser.storage.sync.get("keys");
            const promises = data.keys.map(async (key) => {
                if(key.pgp == null) return null;
                const { keys: [privateKey] } = await openpgp.key.readArmored(key.pgp);
                await privateKey.decrypt(key.phrase);
                return privateKey;
            });
            const privatekeys = await Promise.all(promises);
            common.keyring = privatekeys.filter(p => p != null);
        } catch (e) {
            console.error(e);
        } finally {
            console.log(common.keyring.length + 'keys loaded.');
        }
    },

    decrypt: async (message) => {
        const msg = await browser.messages.getFull(message.id);
        const explore = (part) => {
            if(part.parts) {
                let result = [];
                part.parts.forEach(p => {
                    result = result.concat(explore(p))
                });
                return result;
            }
            return [part];
        }
        let parts = explore(msg);
        parts = parts.filter((part) => part.contentType === 'text/html' && part.body.startsWith('-----BEGIN PGP MESSAGE-----'));
        
        const promises = parts.map(async (part) => {
            const { data: html } = await openpgp.decrypt({
                message: await openpgp.message.readArmored(part.body),         
                privateKeys: common.keyring                                    
            });
            return html;
        });
        console.log(msg);
        return (await Promise.all(promises)).filter(p => p != null).join('');
    }

};

common.load();

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    const decrypted = await common.decrypt(message);
    if(decrypted == "") return;
    browser.tabs.sendMessage(tab.id, {
        'type': 'decrypted',
        'content': decrypted
    });
});

browser.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    /*switch(request.type) {
        case 'tab': {
            const url = request.content.replace('imap://', '');
            const tabs = (await browser.tabs.query({})).filter(t => t.url.endsWith(url));
            tab = tabs[0];
            break;
        }
    }*/
});

browser.messageDisplayScripts.register({
    js: [{ file: './view.js' }]
})