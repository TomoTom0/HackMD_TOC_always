const defaultSettings = { opacity: 0.5, hidden: false, width: 150, expand: true };

async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(defaultSettings, (result) => {
            resolve(result);
        });
    });
}

async function saveSettings(settings) {
    return new Promise((resolve) => {
        chrome.storage.sync.set(settings, () => {
            resolve();
        });
    });
}

function updateDisplay(settings) {
    document.getElementById('opacityValue').textContent = settings.opacity;
    document.getElementById('widthValue').textContent = settings.width;
    document.getElementById('hiddenValue').textContent = settings.hidden ? 'Hidden' : 'Visible';
    document.getElementById('expandValue').textContent = settings.expand ? 'Expanded' : 'Collapsed';
}

function showStatus(message) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'success';
    statusEl.style.display = 'block';
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 2000);
}

document.addEventListener('DOMContentLoaded', async () => {
    let settings = await loadSettings();
    updateDisplay(settings);

    document.getElementById('btnOpacityPlus').addEventListener('click', async () => {
        settings.opacity = Math.min(1, settings.opacity + 0.25);
        await saveSettings(settings);
        updateDisplay(settings);
        showStatus('Opacity updated');
    });

    document.getElementById('btnOpacityMinus').addEventListener('click', async () => {
        settings.opacity = Math.max(0.25, settings.opacity - 0.25);
        await saveSettings(settings);
        updateDisplay(settings);
        showStatus('Opacity updated');
    });

    document.getElementById('btnWidthPlus').addEventListener('click', async () => {
        settings.width = Math.min(300, settings.width + 50);
        await saveSettings(settings);
        updateDisplay(settings);
        showStatus('Width updated');
    });

    document.getElementById('btnWidthMinus').addEventListener('click', async () => {
        settings.width = Math.max(100, settings.width - 50);
        await saveSettings(settings);
        updateDisplay(settings);
        showStatus('Width updated');
    });

    document.getElementById('btnToggleHidden').addEventListener('click', async () => {
        settings.hidden = !settings.hidden;
        await saveSettings(settings);
        updateDisplay(settings);
        showStatus('Visibility updated');
    });

    document.getElementById('btnToggleExpand').addEventListener('click', async () => {
        settings.expand = !settings.expand;
        await saveSettings(settings);
        updateDisplay(settings);
        showStatus('Expand state updated');
    });
});
