async function saveOptions(e) {
    e.preventDefault();
    const language = document.getElementById("language-selector").value;
    await browser.storage.sync.set({
        language: language
    });

    // Save the state of the checkboxes
    const checkboxes = document.querySelectorAll(".source-text-checkbox");
    const selectedSources = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    
    await browser.storage.sync.set({
        sourceTexts: selectedSources
    });
}

async function restoreOptions() {
    let res = await browser.storage.sync.get('language');
    const selectedLanguage = res.language || 'en';
    document.getElementById("language-selector").value = selectedLanguage;
    localizePage(selectedLanguage, document);
    
    // Restore the state of the checkboxes
    res = await browser.storage.sync.get('sourceTexts');
    const selectedBooks = res.sourceTexts || [];

    // Create checkboxes first
    await createCheckboxes(document.getElementById("checkbox-container"));
    
    // Then set the checked state
    const checkboxes = document.querySelectorAll(".source-text-checkbox");
    // If selectedBooks is empty, check all checkboxes
    if (selectedBooks.length === 0) {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true; // Check all checkboxes
        });
    } else {
        // Otherwise, set the checked state based on selectedBooks
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectedBooks.includes(checkbox.value);
        });
    }
}

const createCheckbox = (value, content) => {
    const label = document.createElement("label");
    const option = document.createElement("input");
    option.type = "checkbox";
    option.value = value;
    option.className = "source-text-checkbox";
    const labelText = document.createTextNode(content);
    label.appendChild(option);
    label.appendChild(labelText);
    return label;
}

function createCheckboxes(container) {
    return browser.storage.local.get('texts').then((data) => {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(createCheckbox("any", "🎲 Any"));
        Object.keys(data.texts).forEach(key => {
            fragment.appendChild(createCheckbox(key, data.texts[key].title));
        });
        container.appendChild(fragment);
    });
}


document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.getElementById("language-selector").addEventListener('change', e => {
    const selectedLanguage = e.target.value;
    localizePage(selectedLanguage, document);
});