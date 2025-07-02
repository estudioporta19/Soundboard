// indexedDBManager.js
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.dbManager = (function() {
    let db;
    const DB_NAME = 'soundboardDB';
    const STORE_NAME = 'soundFiles'; // Onde os BLOBs de áudio serão armazenados
    const DB_VERSION = 1; // Incrementa se fizer alterações na estrutura do DB

    /**
     * Inicializa o IndexedDB. Cria o Object Store se não existir.
     * @returns {Promise<void>} Uma promessa que resolve quando o DB está aberto.
     */
    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // Cria um object store para os ficheiros de áudio
                    // 'id' será a chave única para cada ficheiro de áudio
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    console.log(`IndexedDB upgrade: Object store '${STORE_NAME}' created.`);
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log("IndexedDB aberto com sucesso.");
                resolve();
            };

            request.onerror = (event) => {
                console.error("Erro ao abrir IndexedDB:", event.target.error);
                alert("Erro ao inicializar o armazenamento de sons. Algumas funcionalidades podem não funcionar.");
                reject(event.target.error);
            };
        });
    }

    /**
     * Guarda um Blob de ficheiro de som no IndexedDB.
     * @param {string} id - O ID único para este ficheiro de som.
     * @param {Blob} fileBlob - O objeto Blob do ficheiro de áudio.
     * @returns {Promise<void>} Uma promessa que resolve quando o ficheiro é salvo.
     */
    async function saveSoundFile(id, fileBlob) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("IndexedDB não está inicializado."));
                return;
            }
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({ id: id, data: fileBlob }); // 'data' é o seu Blob do ficheiro

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                console.error("Erro ao guardar ficheiro no IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Obtém um Blob de ficheiro de som do IndexedDB pelo seu ID.
     * @param {string} id - O ID único do ficheiro de som.
     * @returns {Promise<Blob|null>} Uma promessa que resolve com o Blob ou null se não for encontrado.
     */
    async function getSoundFile(id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("IndexedDB não está inicializado."));
                return;
            }
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = (event) => {
                const result = event.target.result;
                if (result && result.data) {
                    resolve(result.data); // Retorna o Blob
                } else {
                    resolve(null); // Ficheiro não encontrado
                }
            };

            request.onerror = (event) => {
                console.error("Erro ao obter ficheiro do IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Exclui um ficheiro de som do IndexedDB pelo seu ID.
     * @param {string} id - O ID único do ficheiro de som a ser excluído.
     * @returns {Promise<void>} Uma promessa que resolve quando o ficheiro é excluído.
     */
    async function deleteSoundFile(id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                resolve(); // Já não há DB, então nada para excluir
                return;
            }
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`Ficheiro ${id} excluído do IndexedDB.`);
                resolve();
            };

            request.onerror = (event) => {
                console.error("Erro ao excluir ficheiro do IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    return {
        init: init,
        saveSoundFile: saveSoundFile,
        getSoundFile: getSoundFile,
        deleteSoundFile: deleteSoundFile
    };
})();
