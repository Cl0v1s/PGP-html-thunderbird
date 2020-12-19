
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
            console.log(common.keyring.length + ' keys loaded.');
        }
    },

    decryptParts: async (parts) => {
        const promises = parts.map(async (part) => {
            const { data: content } = await openpgp.decrypt({
                message: await openpgp.message.readArmored(part.body),         
                privateKeys: common.keyring                                    
            });
            return content;
        });
        return (await Promise.all(promises)).filter(p => p != null);
    },

    decryptBody: async (message) => {
        const msg = await browser.messages.getFull(message.id);
        console.log(msg);
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
        return (await common.decryptParts(parts)).join('');
    },

    decryptAttachment: async (message) => {
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
        // only get parts with name ending with '.pgp' and no 'text/x' contentType
        let parts = explore(msg)
            .filter(p => p.name != null && p.name.endsWith('.pgp') && p.contentType.startsWith('text/') === false);
        if(parts.length <= 0) return;
        const startStr = '-----BEGIN PGP MESSAGE-----';
        const endStr = '-----END PGP MESSAGE-----';
        const raw = await browser.messages.getRaw(message.id);
        parts.forEach((part) => {
            let index = [
                raw.indexOf(`name="${part.name}"`),
                raw.indexOf(`name=${part.name}`),
                raw.indexOf(`name='${part.name}'`)
            ].filter(i => i != -1);
            if(index.length <= 0) return;
            index = index[0];
            let temp = raw.slice(index);
            const startIndex = temp.indexOf(startStr);
            if(startIndex == -1) return;
            const endIndex = temp.indexOf(endStr);
            if(endIndex == -1) return;
            temp = temp.slice(startIndex, endIndex + endStr.length);
            part.body = temp;
            console.log('Body extracted for '+part.name + ' ('+(endIndex + endStr.length - startIndex)+' chars)');
        });
        parts = parts.filter((p) => p.body != null);
        // for each part we retrieve their raw bodies since thunderbird doesnt natively

        const attachments = await common.decryptParts(parts);
        return attachments.map((a, i) => {
            return {
                name: parts[i].name.replace('.pgp', ''),
                contentType: parts[i].contentType,
                data: a,
            }
        })
    }

};

common.load();

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    const decrypted = await common.decryptBody(message);
    if(decrypted == "") return;
    // updating message content 
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

browser.messageDisplayAction.onClicked.addListener(async (tab) => {
    const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
    const attachments = await common.decryptAttachment(message);
    attachments.forEach((a) => {
        const dataa = new Blob([a.data], {type : a.contentType});
        const url = URL.createObjectURL(dataa);
        browser.downloads.download({
            url,
            filename: a.name,
        });
    })
});

browser.messageDisplayScripts.register({
    js: [{ file: './view.js' }]
})