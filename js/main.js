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
        console.error('Error updating lorem ipsum settings:', error);
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
            const rect = targetElement.getBoundingClientRect();

            const shadowHost = document.createElement('div');
            document.body.appendChild(shadowHost);
            const shadowRoot = shadowHost.attachShadow({mode: 'closed'});
            
            // Create the overlay
            const overlay = document.createElement("div");
            overlay.id = "loremIpsumOverlay";

            // Create the popup
            const popup = document.createElement("div");
            popup.id = "loremIpsumPopup";

            // Position the popup roughly over the input element
            popup.style.left = `${rect.left + window.scrollX}px`; // Adjust for scrolling
            popup.style.top = `${rect.bottom + window.scrollY}px`; // Position below the input

            // Add content to the popup
            fetch(chrome.runtime.getURL("html/popup.html"))
                .then(response => response.text())
                .then(data => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data, 'text/html');
                    // Get the content from the parsed document
                    const content = doc.body.firstChild;

                    // Append the content to the body of the current document
                    popup.appendChild(content);
                })
                .then(() => {
                    // Append overlay and popup to the shadowroot
                    shadowRoot.appendChild(overlay);
                    shadowRoot.appendChild(popup);
                    shadowRoot.appendChild(link);

                    // Update the displayed value of the slider
                    const slider = shadowRoot.getElementById("loremIpsumNumberSlider");
                    const sliderValue = shadowRoot.getElementById("loremIpsumSliderValue");
                    const units = shadowRoot.getElementById("loremIpsumUnits");
                    const sourceText = shadowRoot.getElementById("loremIpsumSourceText");
                    
                    populateTextTypes(sourceText);

                    // Initial position calculation
                    updateSliderValuePosition(sliderValue, slider);

                    slider.addEventListener("input", () => {
                        settings.count = slider.value;
                        updateSliderValuePosition(sliderValue, slider);
                        storeSettings();
                    });
                    
                    units.addEventListener('change', () => {
                        settings.unit = units.value;
                        storeSettings();
                    })
                    
                    sourceText.addEventListener('change', () => {
                        settings.sourceText = sourceText.value;
                        storeSettings();
                    })

                    // Add event listeners for the button
                    shadowRoot.getElementById("loremIpsumGenerate").addEventListener("click", insertLoremIpsumThenCleanup);

                    // Remove the popup and overlay when clicking outside of the popup or pressing escape
                    overlay.addEventListener("click", cleanup);
                    document.addEventListener("keydown", keyboardHandler)
        
                    loadUserSettings(slider, units, sourceText, sliderValue);
                }
            );
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
            console.error("No valid input element found at the clicked position.");
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
    });
}
const createOption = (value, content) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = content;
    return option;
}

function populateTextTypes(selectObject) {
    browser.storage.local.get('texts').then((data) => {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(createOption("any", "Any"));
        Object.keys(data.texts).forEach(key => {
            fragment.appendChild(createOption(key, data.texts[key].title));
        });
        selectObject.appendChild(fragment);
    });
}

function generateLoremIpsum() {
    return browser.storage.local.get('texts').then((data) => {
        // Access individual properties
        if (data.texts) {
            let sourceTextId;

            if (settings.sourceText === "any") {
                const keys = Object.keys(data.texts);
                sourceTextId = keys[Math.floor(Math.random() * keys.length)];
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
