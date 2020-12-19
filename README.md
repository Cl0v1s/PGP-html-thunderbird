# About 

I use server-side encryption on my own mail server to encrypt all incoming emails. 
Since I like this soft, I wanted to use Thunderbird to read and manage them. The soft has natively pgp support, however it seems to be a bit messy when it comes to render encrypted html. 

Indeed, the html emails weren't rendered, and I was able to see the (sanitized) html. 
This little extension allows to correctly render pgp-encrypted html emails. 

# How to use
When the extension is installed in Thunderbird, you can manage its options from the addon management panel. 
There, you can add your private pgp keys and their corresponding passphrase. Obviously, all these data are only stored locally and never sent anywhere. 
These keys will be used to decrypt html emails on-the-fly when you open them in thunderbird GUI, and then render this decrypted html in the window. 

After providing your settings, you may need to restart thunderbird for the changes to take effect.