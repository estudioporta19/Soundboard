// cueGoSystem.js
// Implementa a lógica do sistema Cue/Go (Space, Ctrl+Space, Enter, etc.)

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.cueGoSystem = (function() {
    let cuedSounds = new Set(); // Stores indices of cued sounds

    function findNextSoundIndex(currentIndex, direction, soundData, NUM_CELLS) {
        let startIndex = currentIndex;
        let endIndex = NUM_CELLS;
        let step = 1;

        if (direction === -1) { // Searching backwards
            startIndex = currentIndex;
            endIndex = -1; // Loop until -1 (exclusive)
            step = -1;
        }

        for (let i = startIndex + step; (direction === 1 ? i < endIndex : i > endIndex); i += step) {
            if (soundData[i] && soundData[i].audioBuffer) {
                return i;
            }
        }
        return null; // No next/previous sound found
    }

    function toggleCue(index, soundData, cuedSoundsSet) {
        const sound = soundData[index];
        if (!sound) return; // Cannot cue an empty cell

        if (cuedSoundsSet.has(index)) {
            cuedSoundsSet.delete(index);
            sound.isCued = false;
        } else {
            cuedSoundsSet.add(index);
            sound.isCued = true;
        }
        window.soundboardApp.cellManager.updateCellDisplay(
            document.querySelector(`.sound-cell[data-index="${index}"]`),
            sound,
            false, // It's not an empty cell if it has soundData
            window.soundboardApp.i18n.getTranslation
        );
        window.soundboardApp.settingsManager.saveSettings(window.soundboardApp.soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
    }

    function playCuedSounds(soundData, audioContext, playSoundCallback, globalActivePlayingInstances, currentFadeInDuration, currentFadeOutDuration, volumeRange) {
        if (cuedSounds.size === 0) return;

        // Sort cued sounds by index to play them in order
        const sortedCuedIndices = Array.from(cuedSounds).sort((a, b) => a - b);

        sortedCuedIndices.forEach(index => {
            if (soundData[index] && soundData[index].audioBuffer) {
                // Play multiple, don't autokill for cue. Use a small fade in.
                playSoundCallback(index, soundData, audioContext, true, false, globalActivePlayingInstances, currentFadeInDuration, currentFadeOutDuration, volumeRange);
            }
        });
        // Cues usually remain for 'Go' functionality; they are not automatically cleared after playback.
    }

    function stopCuedSounds(soundData, audioContext, fadeoutSoundCallback, globalActivePlayingInstances) {
        if (cuedSounds.size === 0) return;

        // Sort cued sounds by index to stop them in order (optional, but good for consistency)
        const sortedCuedIndices = Array.from(cuedSounds).sort((a, b) => a - b);

        sortedCuedIndices.forEach(index => {
            if (soundData[index] && soundData[index].audioBuffer) {
                fadeoutSoundCallback(index, 0.2, soundData, audioContext, globalActivePlayingInstances); // Quick fade out
            }
        });
        // Cues usually remain if they were explicitly cued
    }

    function removeAllCues(soundData) {
        cuedSounds.forEach(index => {
            const sound = soundData[index];
            if (sound) {
                sound.isCued = false;
                window.soundboardApp.cellManager.updateCellDisplay(
                    document.querySelector(`.sound-cell[data-index="${index}"]`),
                    sound,
                    false, // It's not an empty cell if it has soundData
                    window.soundboardApp.i18n.getTranslation
                );
            }
        });
        cuedSounds.clear();
        window.soundboardApp.settingsManager.saveSettings(window.soundboardApp.soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
    }

    function getCuedSounds() {
        return cuedSounds;
    }

    // Function to set cued sounds from loaded settings
    function setCuedSounds(cuedIndices, soundData) {
        cuedSounds.clear(); // Clear existing cues before setting new ones
        cuedIndices.forEach(index => {
            if (soundData[index]) {
                cuedSounds.add(index);
                soundData[index].isCued = true;
            }
        });
    }

    return {
        findNextSoundIndex: findNextSoundIndex,
        toggleCue: toggleCue,
        playCuedSounds: playCuedSounds,
        stopCuedSounds: stopCuedSounds,
        removeAllCues: removeAllCues,
        getCuedSounds: getCuedSounds,
        setCuedSounds: setCuedSounds
    };
})();
