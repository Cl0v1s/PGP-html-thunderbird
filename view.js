browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.type) {
        case 'decrypted': {
            const content = document.body.querySelector('.moz-text-html');
            if(content == null) return; // if user isnt on html mode, we stop here
            content.innerHTML = request.content;
            break;
        }
    }
});
