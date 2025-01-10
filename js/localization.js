async function loadi18nMessages(language) {
    const url = chrome.runtime.getURL(`locales/messages_${language}.json`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not load messages for language '${language}'`);
    }
    return await response.json();
}

async function localizePage(language, container) {
    const messages = await loadi18nMessages(language);
    const elements = container.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const messageKey = element.getAttribute('data-i18n');
        const localizedText = messages[messageKey] || messageKey;
        element.textContent = localizedText;
    });
}
