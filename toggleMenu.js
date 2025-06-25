document.addEventListener('DOMContentLoaded', () => {
    const toggleHelpButton = document.getElementById('toggle-help-button');
    const helpTextContent = document.getElementById('help-text-content');

    // Tradução básica para o botão de ajuda (pode ser sincronizada com as traduções globais se necessário)
    const helpButtonTranslations = {
        pt: {
            show: "Mostrar Ajuda",
            hide: "Esconder Ajuda"
        },
        en: {
            show: "Show Help",
            hide: "Hide Help"
        },
        it: {
            show: "Mostra Aiuto",
            hide: "Nascondi Aiuto"
        }
    };

    // Função para atualizar o texto do botão
    // Esta função será globalmente acessível para que seu script.js principal possa chamá-la.
    window.updateHelpButtonText = function(lang) {
        // Obter o idioma atual do localStorage ou do parâmetro
        let currentLang = lang || localStorage.getItem('language') || 'pt';
        
        const isVisible = helpTextContent.classList.contains('visible');
        if (isVisible) {
            toggleHelpButton.textContent = helpButtonTranslations[currentLang].hide;
        } else {
            toggleHelpButton.textContent = helpButtonTranslations[currentLang].show;
        }
    };

    // Listener para o botão de alternar ajuda
    toggleHelpButton.addEventListener('click', () => {
        helpTextContent.classList.toggle('visible');
        // Opcional: Salvar o estado no localStorage (se você quiser que persista entre sessões)
        const isVisible = helpTextContent.classList.contains('visible');
        localStorage.setItem('helpMenuVisible', isVisible);
        window.updateHelpButtonText(); // Atualiza o texto do botão imediatamente após o clique
    });

    // Carregar o estado salvo ao carregar a página
    const savedVisibility = localStorage.getItem('helpMenuVisible');
    if (savedVisibility === 'true') {
        helpTextContent.classList.add('visible');
    } else {
        helpTextContent.classList.remove('visible'); // Garante que esteja escondido por padrão se não salvo como true
    }
    window.updateHelpButtonText(); // Define o texto inicial do botão ao carregar a página
});
