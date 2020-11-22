window.browser = window.browser.extension.getBackgroundPage().browser;

const preferences = {
    keys: [],

    load: async () => {
        try {
            const data = await browser.storage.sync.get("keys");
            preferences.keys = data.keys;
        } catch (e) {
            console.error(e);
        } finally {
            console.log(preferences.keys);
        }
    },

    save: async () => {
        return browser.storage.sync.set({
            keys: preferences.keys,
        });
    },

    build: () => {
        const tobdy = document.querySelector('tbody');
        tobdy.innerHTML = "";
        preferences.keys.forEach((key) => {
            try {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        ${key.email}
                    </td>
                    <td>
                        ${key.pgp.substr(0, 8)}...
                    </td>
                    <td>
                        ${key.phrase.replace(/[A-z]/g, '*')}
                    </td>
                `;
                tobdy.appendChild(tr);
                const button = document.createElement('button');
                button.innerHTML = "Delete";
                button.onclick = () => preferences.onDelete(key.pgp);
                const td = document.createElement('td');
                td.appendChild(button);
                tr.appendChild(td);
            } catch (e) {
                console.error(e);
            }
        });
    },

    onDelete: (pgp) => {
        preferences.keys = preferences.keys.filter(key => key.pgp !== pgp);
        preferences.build();
        preferences.save();
    },

    onSubmit: (evt) => {
        evt.preventDefault();
        const form = evt.target;
        const entry = {};
        Array.from(form).forEach((input) => {
            if(!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
            entry[input.name] = input.value;
            input.value = "";
        });
        preferences.keys.push(entry);
        preferences.build();
        preferences.save();
    },
};

window.addEventListener('DOMContentLoaded', async () => {
    await preferences.load();
    preferences.build();
    document.querySelector('form').addEventListener('submit', preferences.onSubmit);
});



