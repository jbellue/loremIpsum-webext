let targetElement;

const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = browser.runtime.getURL("styles/styles.css");

const settings = {
    count: 10,
    sourceText: 'lorem_ipsum',
    unit: 'paragraphs'
};

const storeSettings = () => {
    browser.storage.local.set({ userSettings: settings })
    .catch((error) => {
        console.error(browser.i18n.getMessage("errors_noUserSettingsInStorage"), error);
    });
}

// Capture mouse coordinates on right-click
document.addEventListener("contextmenu", (event) => {
    targetElement = event.target;
});

browser.runtime.onMessage.addListener((message) => {
    if (message.action === "showLoremIpsumModal") {
        // Check if the targetElement is valid
        if (targetElement) {
            const shadowHost = document.createElement('div');
            document.body.appendChild(shadowHost);
            const shadowRoot = shadowHost.attachShadow({mode: 'closed'});
            const fragment = document.createDocumentFragment();

            // Create the overlay
            const overlay = document.createElement("div");
            overlay.id = "loremIpsumOverlay";
            overlay.addEventListener("click", cleanup);

            // Create the popup
            const popup = document.createElement("div");
            popup.id = "loremIpsumPopup";

            // Position the popup roughly over the input element
            const rect = targetElement.getBoundingClientRect();
            popup.style.left = `${rect.left + window.scrollX}px`; // Adjust for scrolling
            popup.style.top = `${rect.bottom + window.scrollY}px`; // Position below the input

            // Create the container
            const loremIpsumContainer = document.createElement('div');
            loremIpsumContainer.className = 'loremIpsumContainer';
            const loremIpsumColumn = document.createElement('div');
            loremIpsumColumn.className = 'loremIpsumColumn';
            const loremIpsumSliderContainer = document.createElement('div');
            loremIpsumSliderContainer.className = 'loremIpsumSliderContainer';

            // Create the slider input
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = 'loremIpsumNumberSlider';
            slider.min = '1';
            slider.max = '20';
            slider.className = 'loremIpsumSlider';
            slider.setAttribute('aria-label', browser.i18n.getMessage("aria_sliderDescription"));
            slider.addEventListener("input", () => {
                settings.count = slider.value;
                updateSliderValuePosition(sliderValue, slider);
                storeSettings();
            });

            // Create the slider value display
            const sliderValue = document.createElement('span');
            sliderValue.id = 'loremIpsumSliderValue';
            sliderValue.className = 'loremIpsumSliderValue';

            loremIpsumSliderContainer.appendChild(slider);
            loremIpsumSliderContainer.appendChild(sliderValue);
            loremIpsumColumn.appendChild(loremIpsumSliderContainer);

            // Create the source text select
            const sourceText = document.createElement('select');
            sourceText.id = 'loremIpsumSourceText';
            sourceText.className = 'loremIpsumSelect';
            sourceText.setAttribute('aria-label', browser.i18n.getMessage("aria_sourceTextDescription"));
            sourceText.addEventListener('change', () => {
                settings.sourceText = sourceText.value;
                storeSettings();
            });

            loremIpsumColumn.appendChild(sourceText);
            loremIpsumContainer.appendChild(loremIpsumColumn);

            // Create the second column
            const loremIpsumColumnFlex = document.createElement('div');
            loremIpsumColumnFlex.className = 'loremIpsumColumnFlex';

            // Create the units select
            const units = document.createElement('select');
            units.id = 'loremIpsumUnits';
            units.className = 'loremIpsumSelect';
            units.setAttribute('aria-label', browser.i18n.getMessage("aria_unitsDescription"));
            units.addEventListener('change', () => {
                settings.unit = units.value;
                storeSettings();
            });
            // Create options for units
            const options = [
                { value: 'paragraphs', text: browser.i18n.getMessage("popup_units_paragraphs") },
                { value: 'words',      text: browser.i18n.getMessage("popup_units_words") },
                { value: 'letters',    text: browser.i18n.getMessage("popup_units_letters") }
            ];
            options.forEach(optionData => {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.textContent = optionData.text;
                units.appendChild(option);
            });
            loremIpsumColumnFlex.appendChild(units);

            // Create the generate button
            const generateButton = document.createElement('button');
            generateButton.id = 'loremIpsumGenerate';
            generateButton.className = 'loremIpsumButton';
            generateButton.setAttribute('aria-label', browser.i18n.getMessage("aria_generateButtonDescription"));
            generateButton.textContent = browser.i18n.getMessage("popup_button_generate");
            generateButton.addEventListener("click", insertLoremIpsumThenCleanup);

            loremIpsumColumnFlex.appendChild(generateButton);
            loremIpsumContainer.appendChild(loremIpsumColumnFlex);
            popup.appendChild(loremIpsumContainer);
            fragment.appendChild(overlay);
            fragment.appendChild(popup);
            fragment.appendChild(link);
            shadowRoot.appendChild(fragment);

            updateSliderValuePosition(sliderValue, slider);
            document.addEventListener("keydown", keyboardHandler);
            populateSourceTexts(sourceText).then(() => {
                loadUserSettings(slider, units, sourceText, sliderValue);
            });

            function insertLoremIpsumThenCleanup() {
                generateLoremIpsum().then(loremText => {
                    if (targetElement.isContentEditable) {
                        targetElement.innerText = loremText;
                    }
                    else {
                        targetElement.value = loremText;
                    }
                })
                cleanup();
            }

            // Function to remove the overlay and popup
            function cleanup() {
                shadowRoot.getElementById("loremIpsumGenerate").removeEventListener("click", insertLoremIpsumThenCleanup);
                document.removeEventListener("keydown", keyboardHandler);
                overlay.removeEventListener("click", cleanup);

                shadowRoot.removeChild(overlay);
                shadowRoot.removeChild(popup);
                document.body.removeChild(shadowHost);
            }

            // Function to remove the overlay and popup
            function keyboardHandler(e) {
                if (e.key === "Escape") {
                    cleanup();
                }
                else if (e.key === "Enter") {
                    insertLoremIpsumThenCleanup();
                }
            }
        } else {
            console.error(browser.i18n.getMessage("errors_noValidInputElement"));
        }
    }
});

// Function to update the slider value position
const updateSliderValuePosition = (sliderValue, slider) => {
    sliderValue.textContent = settings.count;
    const thumbWidth = 20; // Approximate width of the slider thumb
    const valueWidth = sliderValue.offsetWidth; // Get the width of the slider value text
    const valuePercentage = (settings.count - slider.min) / (slider.max - slider.min); // Calculate the percentage of the current value
    sliderValue.style.left = `${valuePercentage * (slider.offsetWidth - thumbWidth) + (thumbWidth / 2) - (valueWidth / 2)}px`; // Adjust position
};

function loadUserSettings(slider, units, sourceText, sliderValue) {
    browser.storage.local.get('userSettings').then((result) => {
        // Access individual properties
        if (result.userSettings) {
            settings.count = result.userSettings.count;
            settings.unit = result.userSettings.unit;
            settings.sourceText = result.userSettings.sourceText;
        }
        slider.value = settings.count;
        updateSliderValuePosition(sliderValue, slider);
        units.value = settings.unit;
        sourceText.value = settings.sourceText;
        // Check if the selected value is valid
        if (![...sourceText.options].some(option => option.value === settings.sourceText)) {
            // If the value is not found, select the first available option
            if (sourceText.options.length > 0) {
                sourceText.value = sourceText.options[0].value; // Select the first option
                settings.sourceText = sourceText.value; // Update settings to the new value
                storeSettings()
            }
        }
    });
}
const createOption = (value, content) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = content;
    return option;
}

function populateSourceTexts(selectObject) {
    return new Promise(async (resolve, reject) => {
        try {
            const sourceTextsRes = await browser.storage.sync.get('sourceTexts');
            const selectedSources = sourceTextsRes.sourceTexts || [];

            // Get the available texts
            const textsRes = await browser.storage.local.get('texts');
            const fragment = document.createDocumentFragment();

            // If selectedSources is empty, select everything
            const optionAny = createOption("any", `🎲 ${browser.i18n.getMessage("options_randomSelection")}`);
            if (selectedSources.length === 0) {
                // Append all available options
                fragment.appendChild(optionAny);
                Object.keys(textsRes.texts).forEach(key => {
                    fragment.appendChild(createOption(key, textsRes.texts[key].title));
                });
            } else {
                // Create options only for the selected sources
                if (selectedSources.includes("any")) {
                    fragment.appendChild(optionAny);
                }
                // Create options only for the selected sources
                Object.keys(textsRes.texts).forEach(key => {
                    if (selectedSources.includes(key)) {
                        fragment.appendChild(createOption(key, textsRes.texts[key].title));
                    }
                });
            }

            // Append the fragment to the select object
            selectObject.appendChild(fragment);

            // Resolve the promise after appending the options
            resolve();
        } catch (error) {
            // Reject the promise in case of an error
            reject(error);
        }
    });
}

function generateLoremIpsum() {
    return browser.storage.local.get('texts').then(async (data) => {
        if (data.texts) {
            let sourceTextId;
            if (settings.sourceText === "any") {
                const selectedSources = await browser.storage.sync.get('sourceTexts');
                const availableSources = selectedSources.sourceTexts.filter(source => source !== "any");
                if (availableSources.length > 0) {
                    sourceTextId = availableSources[Math.floor(Math.random() * availableSources.length)];
                } else {
                    console.error("Lorem Ipsum: no source text found");
                    return "";
                }
            } else {
                sourceTextId = settings.sourceText;
            }
            const sourceText = data.texts[sourceTextId].data;
            const words = sourceText.split(" ");
            const totalWords = words.length;

            let result = "";
            if (settings.unit === "words") {
                for (let i = 0; i < settings.count; i++) {
                    result += words[i % totalWords] + " "; // Use modulo to wrap around
                }
            } else if (settings.unit === "letters") {
                const totalChars  = sourceText.length;
                for (let i = 0; i < settings.count; i++) {
                    result += sourceText[i % totalChars]; // Use modulo to wrap around
                }
            } else if (settings.unit === "paragraphs") {
                const paragraphs = sourceText.split("\n"); // Assuming paragraphs are separated by double newlines
                for (let i = 0; i < settings.count; i++) {
                    result += paragraphs[i % paragraphs.length] + "\n\n"; // Use modulo to wrap around
                }
            }
            return result.trim(); // Trim any trailing spaces
        }
        return "";
    });
}
