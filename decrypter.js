self.importScripts('openpgp.js');

let keyring = null;


async function loadKeyring(data) {
    const promises = data.keys.map(async (key) => {
        if(key.pgp == null) return null;
        try {
            const { keys: [privateKey] } = await openpgp.key.readArmored(key.pgp);
            await privateKey.decrypt(key.phrase);
            return privateKey;
        } catch (e) {
            console.error(e);
        }
        return null;
    });
    const privatekeys = await Promise.all(promises);
    keyring = privatekeys.filter(p => p != null);
    console.log(keyring.length+' keys loaded.');
    postMessage({
        type: 'initialized'
    })

}

async function decrypt(part) {
    console.log(part);
    try {
        const { data: content } = await openpgp.decrypt({
            message: await openpgp.message.readArmored(part.body),         
            privateKeys: keyring                                    
        });
        postMessage({ 
            'type' : 'decrypted',
            content
        });
    } catch (e) {
        console.error(e);
        postMessage({ 
            'type' : 'decrypted',
            content: null
        });
    }
}

onmessage = function(e) {
    const payload = e.data;
    switch(payload.type) {
        case 'initialize': {
            loadKeyring(payload.content);
            break;
        }
        case 'decrypt': {
            decrypt(payload.content);
            break;
        }
    }
}