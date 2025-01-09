const texts = {
    lorem_ipsum: {title: "Lorem Ipsum", file: "data/lorem_ipsum.txt"},
    moby_dick: {title: "Moby Dick", file: "data/moby_dick.txt"},
    great_expectations: {title: "Great Expectations", file: "data/great_expectations.txt"},
    metamorphosis: {title: "The Metamorphosis", file: "data/metamorphosis.txt"}
};

browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: "insertLoremIpsumContextMenu",
        title: "Insert LoremIpsum",
        contexts: ["editable", "input"]
    });
    // Load the text files and store their contents
    const promises = Object.keys(texts).map(async key => {
        const item = texts[key];
        const response = await fetch(item.file);
        if (!response.ok) {
            throw new Error(`Failed to load ${item.file}`);
        }
        const content = await response.text();
        return { [key]: { title: item.title, data: content } };
    });

    // Wait for all promises to resolve
    Promise.all(promises)
        .then(results => {
            // Combine results into a single object
            const combinedTexts = results.reduce((acc, curr) => Object.assign(acc, curr), {});
            return browser.storage.local.set({ texts: combinedTexts });
        })
        .then(() => {
            console.log("Texts have been stored successfully.");
        })
        .catch(error => {
            console.error("Error loading texts:", error);
        });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "insertLoremIpsumContextMenu") {
        // Send the clicked element's information to the content script
        browser.tabs.sendMessage(tab.id, { action: "showLoremIpsumModal" });
    }
});