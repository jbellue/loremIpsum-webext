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
            popup.innerHTML = `
<div class="loremIpsumContainer">
    <div class="loremIpsumColumn">
        <div class="loremIpsumSliderContainer">
            <input type="range" id="loremIpsumNumberSlider" min="1" max="20" class="loremIpsumSlider" aria-label="Number of items to generate">
            <span id="loremIpsumSliderValue" class="loremIpsumSliderValue"></span>
        </div>
        <select id="loremIpsumSourceText" class="loremIpsumSelect" aria-label="Select type of text to generate"></select>
    </div>
    <div class="loremIpsumColumnFlex">
        <select id="loremIpsumUnits" class="loremIpsumSelect" aria-label="Select unit of measurement">
            <option value="paragraphs">Paragraphs</option>
            <option value="words">Words</option>
            <option value="letters">Letters</option>
        </select>
        <button id="loremIpsumGenerate" class="loremIpsumButton" aria-label="Generate Lorem Ipsum text">Generate ✏️</button>
    </div>
</div>`;
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

            // Function to update the slider value position
            const updateSliderValuePosition = () => {
                sliderValue.textContent = settings.count;
                const thumbWidth = 20; // Approximate width of the slider thumb
                const valueWidth = sliderValue.offsetWidth; // Get the width of the slider value text
                const valuePercentage = (settings.count - slider.min) / (slider.max - slider.min); // Calculate the percentage of the current value
                sliderValue.style.left = `${valuePercentage * (slider.offsetWidth - thumbWidth) + (thumbWidth / 2) - (valueWidth / 2)}px`; // Adjust position
            };
            
            function loadUserSettings(slider, units, sourceText) {
                browser.storage.local.get('userSettings').then((result) => {
                    // Access individual properties
                    if (result.userSettings) {
                        settings.count = result.userSettings.count;
                        settings.unit = result.userSettings.unit;
                        settings.sourceText = result.userSettings.sourceText;
                    }
                    slider.value = settings.count;
                    updateSliderValuePosition();
                    units.value = settings.unit;
                    sourceText.value = settings.sourceText;
                });
            }
            const createOption = (value, content) => {
                return `<option value="${value}">${content}</option>`;
            }

            function populateTextTypes(selectObject) {
                browser.storage.local.get('texts').then((data) => {
                    let optionsHTML = createOption("any", "Any");
                    Object.keys(data.texts).forEach(key => {
                        optionsHTML += createOption(key, data.texts[key].title);
                    });
                    selectObject.innerHTML = optionsHTML;
                });
            }

            // Initial position calculation
            updateSliderValuePosition();

            slider.addEventListener("input", () => {
                settings.count = slider.value;
                updateSliderValuePosition();
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

            // Remove the popup and overlay when clicking outside of the popup or pressing escape
            overlay.addEventListener("click", cleanup);
            document.addEventListener("keydown", keyboardHandler)

            loadUserSettings(slider, units, sourceText);
        } else {
            console.error("No valid input element found at the clicked position.");
        }
    }
});

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
