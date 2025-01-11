function localizePage(container) {
    const elements = container.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const messageKey = element.getAttribute('data-i18n');
        const localizedText = browser.i18n.getMessage(messageKey) || messageKey;
        element.textContent = localizedText;
    });
}
