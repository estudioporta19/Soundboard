document.addEventListener('DOMContentLoaded', () => {
    const clearAllCellsButton = document.getElementById('clear-all-cells');

    if (clearAllCellsButton) {
        clearAllCellsButton.addEventListener('click', () => {
            // Verifica se a função clearSoundCell e NUM_CELLS estão disponíveis no escopo global
            // ou se você precisa passá-los de alguma forma (o que é mais robusto).
            // Para simplificar, estamos assumindo que eles estão acessíveis globalmente,
            // mas o ideal seria encapsular o código principal em um módulo
            // e exportar as funções necessárias.

            // Exibindo um popup de confirmação antes de limpar
            showConfirmPopup(
                translations[currentLanguage].confirmClearAllTitle || "Confirmar Limpeza",
                translations[currentLanguage].confirmClearAllMessage || "Tem certeza de que deseja limpar todas as células? Isso irá remover todos os sons carregados e redefinir as configurações.",
                () => {
                    // Função a ser executada se o usuário confirmar
                    for (let i = 0; i < NUM_CELLS; i++) {
                        // Chama clearSoundCell para cada índice, com um pequeno fade out
                        clearSoundCell(i, 0.1); // Usando 0.1s de fade out
                    }
                    console.log("Todas as células foram limpas.");
                }
            );
        });
    }

    // A função showConfirmPopup é genérica e pode ser definida no seu script.js principal.
    // Se ainda não a tem, aqui está uma sugestão para adicioná-la ao seu script.js:
    /*
    function showConfirmPopup(title, message, onConfirm) {
        const popupOverlay = document.getElementById('popup-overlay');
        const popupMessage = document.getElementById('popup-message');
        const confirmYesButton = document.getElementById('confirm-stop-yes');
        const confirmNoButton = document.getElementById('confirm-stop-no');

        popupMessage.textContent = message;

        // Limpa event listeners anteriores para evitar múltiplos disparos
        const cloneYes = confirmYesButton.cloneNode(true);
        const cloneNo = confirmNoButton.cloneNode(true);
        confirmYesButton.parentNode.replaceChild(cloneYes, confirmYesButton);
        confirmNoButton.parentNode.replaceChild(cloneNo, confirmNoButton);

        const newConfirmYesButton = document.getElementById('confirm-stop-yes');
        const newConfirmNoButton = document.getElementById('confirm-stop-no');

        newConfirmYesButton.onclick = () => {
            onConfirm();
            popupOverlay.classList.remove('visible');
        };

        newConfirmNoButton.onclick = () => {
            popupOverlay.classList.remove('visible');
        };

        popupOverlay.classList.add('visible');
    }
    */
});
