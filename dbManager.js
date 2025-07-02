// dbManager.js
const DB_NAME = 'SoundboardDB';
const DB_VERSION = 1; // Incrementa a versão se mudar o schema
let db;

/**
 * Inicializa a base de dados IndexedDB.
 * @returns {Promise<void>} Uma Promise que resolve quando a DB está aberta e pronta.
 */
function init() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Cria a object store para os ficheiros de áudio
            if (!db.objectStoreNames.contains('soundFiles')) {
                const soundFilesStore = db.createObjectStore('soundFiles', { keyPath: 'id', autoIncrement: true });
                soundFilesStore.createIndex('name', 'name', { unique: false });
                console.log("Object store 'soundFiles' criada/atualizada.");
            }
            // Cria a object store para as sessões
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                sessionsStore.createIndex('name', 'name', { unique: true }); // Nome da sessão deve ser único
                console.log("Object store 'sessions' criada/atualizada.");
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("IndexedDB aberto com sucesso.");
            resolve();
        };

        request.onerror = (event) => {
            console.error("Erro ao abrir IndexedDB:", event.target.error);
            alert("Erro crítico: Não foi possível abrir a base de dados local. A aplicação pode não funcionar corretamente.");
            reject(event.target.error);
        };
    });
}

/**
 * Salva um ficheiro de áudio no IndexedDB.
 * @param {string} name - O nome do ficheiro.
 * @param {ArrayBuffer} arrayBuffer - O ArrayBuffer do áudio.
 * @param {string} mimeType - O tipo MIME do áudio (ex: 'audio/mpeg', 'audio/wav').
 * @returns {Promise<number>} Uma Promise que resolve com o ID do ficheiro salvo.
 */
async function saveAudio(name, arrayBuffer, mimeType) {
    const tx = db.transaction(['soundFiles'], 'readwrite');
    const store = tx.objectStore('soundFiles');

    const soundFile = {
        name: name,
        data: arrayBuffer,
        mimeType: mimeType, // **NOVA PROPRIEDADE**
        timestamp: new Date()
    };

    return new Promise((resolve, reject) => {
        const request = store.add(soundFile);

        request.onsuccess = () => {
            console.log(`Ficheiro de áudio '${name}' salvo com ID: ${request.result}`);
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Erro na transação de salvar áudio:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Obtém um ficheiro de áudio do IndexedDB pelo seu ID.
 * @param {number} id - O ID do ficheiro de áudio.
 * @returns {Promise<{name: string, data: ArrayBuffer, mimeType: string}|null>} Uma Promise que resolve com os dados do ficheiro ou null.
 */
async function getAudio(id) {
    const tx = db.transaction(['soundFiles'], 'readonly');
    const store = tx.objectStore('soundFiles');

    return new Promise((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error(`Erro ao obter áudio com ID ${id}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Apaga um ficheiro de áudio do IndexedDB pelo seu ID.
 * @param {number} id - O ID do ficheiro de áudio a ser apagado.
 * @returns {Promise<void>} Uma Promise que resolve quando o ficheiro é apagado.
 */
async function deleteAudio(id) {
    const tx = db.transaction(['soundFiles'], 'readwrite');
    const store = tx.objectStore('soundFiles');

    return new Promise((resolve, reject) => {
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`Ficheiro de áudio com ID ${id} apagado.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`Erro ao apagar áudio com ID ${id}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Limpa todos os ficheiros de áudio da object store 'soundFiles'.
 * @returns {Promise<void>} Uma Promise que resolve quando todos os ficheiros são apagados.
 */
async function clearAllAudioFiles() {
    const tx = db.transaction(['soundFiles'], 'readwrite');
    const store = tx.objectStore('soundFiles');

    return new Promise((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => {
            console.log("Todos os ficheiros de áudio foram apagados do IndexedDB.");
            resolve();
        };

        request.onerror = (event) => {
            console.error("Erro ao limpar todos os ficheiros de áudio:", event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Salva uma sessão no IndexedDB.
 * @param {string} name - O nome da sessão.
 * @param {object} sessionData - Os dados da sessão a serem salvos (metadados dos sons, configurações, etc.).
 * @returns {Promise<number>} Uma Promise que resolve com o ID da sessão salva.
 */
async function saveSession(name, sessionData) {
    const tx = db.transaction(['sessions'], 'readwrite');
    const store = tx.objectStore('sessions');

    const session = {
        name: name,
        data: sessionData,
        timestamp: new Date()
    };

    return new Promise((resolve, reject) => {
        // Tenta adicionar, se já existir pelo nome, usa put (atualiza)
        const getRequest = store.index('name').get(name);
        getRequest.onsuccess = () => {
            const existingSession = getRequest.result;
            if (existingSession) {
                // Atualiza a sessão existente
                session.id = existingSession.id; // Mantém o mesmo ID
                const putRequest = store.put(session);
                putRequest.onsuccess = () => {
                    console.log(`Sessão '${name}' atualizada com ID: ${session.id}`);
                    resolve(session.id);
                };
                putRequest.onerror = (event) => {
                    console.error('Erro ao atualizar sessão:', event.target.error);
                    reject(event.target.error);
                };
            } else {
                // Adiciona nova sessão
                const addRequest = store.add(session);
                addRequest.onsuccess = () => {
                    console.log(`Sessão '${name}' salva com ID: ${addRequest.result}`);
                    resolve(addRequest.result);
                };
                addRequest.onerror = (event) => {
                    console.error('Erro ao salvar nova sessão:', event.target.error);
                    reject(event.target.error);
                };
            }
        };
        getRequest.onerror = (event) => {
            console.error('Erro ao verificar sessão existente:', event.target.error);
            reject(event.target.error);
        };
    });
}


/**
 * Carrega uma sessão do IndexedDB pelo seu ID.
 * @param {number} id - O ID da sessão a ser carregada.
 * @returns {Promise<object|null>} Uma Promise que resolve com os dados da sessão ou null.
 */
async function loadSession(id) {
    const tx = db.transaction(['sessions'], 'readonly');
    const store = tx.objectStore('sessions');

    return new Promise((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result ? request.result.data : null);
        };

        request.onerror = (event) => {
            console.error(`Erro ao carregar sessão com ID ${id}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Obtém todos os metadados de sessão do IndexedDB (ID e nome).
 * @returns {Promise<Array<{id: number, name: string}>>} Uma Promise que resolve com uma lista de sessões.
 */
async function getAllSessionData() {
    const tx = db.transaction(['sessions'], 'readonly');
    const store = tx.objectStore('sessions');

    return new Promise((resolve, reject) => {
        const sessions = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                sessions.push({ id: cursor.value.id, name: cursor.value.name, timestamp: cursor.value.timestamp });
                cursor.continue();
            } else {
                resolve(sessions);
            }
        };

        request.onerror = (event) => {
            console.error("Erro ao obter todas as sessões:", event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Apaga uma sessão do IndexedDB pelo seu ID.
 * @param {number} id - O ID da sessão a ser apagada.
 * @returns {Promise<void>} Uma Promise que resolve quando a sessão é apagada.
 */
async function deleteSession(id) {
    const tx = db.transaction(['sessions'], 'readwrite');
    const store = tx.objectStore('sessions');

    return new Promise((resolve, reject) => {
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`Sessão com ID ${id} apagada.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`Erro ao apagar sessão com ID ${id}:`, event.target.error);
            reject(event.target.error);
        };
    });
}


export { init, saveAudio, getAudio, deleteAudio, clearAllAudioFiles, getAllSessionData, saveSession, loadSession, deleteSession };
