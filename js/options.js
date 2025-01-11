async function saveOptions(selectedSources) {
    await browser.storage.sync.set({
        sourceTexts: selectedSources
    });
}

async function restoreOptions() {
    document.getElementById("checkbox-container-label").innerText = browser.i18n.getMessage("options_selectAvailableTexts");

    // Restore the state of the checkboxes
    let res = await browser.storage.sync.get('sourceTexts');
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
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.className = "source-text-checkbox";

    // Add change event listener to the checkbox
    checkbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll(".source-text-checkbox");
        const selectedSources = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        saveOptions(selectedSources);
    });
    const labelText = document.createTextNode(content);
    label.appendChild(checkbox);
    label.appendChild(labelText);
    return label;
}

function createCheckboxes(container) {
    return browser.storage.local.get('texts').then((data) => {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(createCheckbox("any", `🎲 ${browser.i18n.getMessage("options_randomSelection")}`));
        Object.keys(data.texts).forEach(key => {
            fragment.appendChild(createCheckbox(key, data.texts[key].title));
        });
        container.appendChild(fragment);
    });
}


document.addEventListener('DOMContentLoaded', restoreOptions);
