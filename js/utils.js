// utils.js
// Contém funções utilitárias que podem ser partilhadas.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.utils = {
    getRandomHSLColor: function() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 20) + 70; // 70-90%
        const lightness = Math.floor(Math.random() * 20) + 40; // 40-60%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    },

    updateVolumeDisplay: function(volumeRange, volumeDisplay) {
        volumeDisplay.textContent = `${Math.round(volumeRange.value * 100)}%`;
    },

    updateFadeInDisplay: function(fadeInRange, fadeInDisplay, translations, currentLanguage) {
        const currentFadeInDuration = parseFloat(fadeInRange.value);
        if (!translations[currentLanguage]) {
            fadeInDisplay.textContent = `Loading...`;
            return;
        }
        if (currentFadeInDuration === 0) {
            fadeInDisplay.textContent = `${currentFadeInDuration.toFixed(1)}s${translations[currentLanguage].immediateStart || ' (Início Imediato)'}`;
        } else {
            fadeInDisplay.textContent = `${currentFadeInDuration.toFixed(1)}s`;
        }
    },

    updateFadeOutDisplay: function(fadeOutRange, fadeOutDisplay, translations, currentLanguage) {
        const currentFadeOutDuration = parseFloat(fadeOutRange.value);
        if (!translations[currentLanguage]) {
            fadeOutDisplay.textContent = `Loading...`;
            return;
        }
        if (currentFadeOutDuration === 0) {
            fadeOutDisplay.textContent = `${currentFadeOutDuration.toFixed(1)}s${translations[currentLanguage].immediateStop || ' (Paragem Imediata)'}`;
        } else {
            fadeOutDisplay.textContent = `${currentFadeOutDuration.toFixed(1)}s`;
        }
    }
};
