function showDecryptedHTMLMessage(request) {
    const content = document.body.querySelector('.moz-text-html');
    if(content == null) return; // if user isnt on html mode, we stop here
    setTimeout(() => {
        content.innerHTML = request.content;
        console.log('Rendered');
    }, 1000);
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.type) {
        case 'decrypted': {
            showDecryptedHTMLMessage(request);
            break;
        }
    }
});
