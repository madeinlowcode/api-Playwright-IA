// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\core\puppeteer\puppeteer.handler.js
const puppeteer = require('puppeteer');
const sessionManager = require('../sessions/sessionManager');
const logger = require('../../utils/logger');

/**
 * @file puppeteer.handler.js
 * @description Este arquivo é responsável por gerenciar as interações com o Puppeteer,
 * incluindo o lançamento de navegadores, gerenciamento de páginas,
 * e a execução de tarefas específicas do Puppeteer.
 */

/**
 * Lança uma instância do navegador Puppeteer.
 * @param {object} launchOptions - Opções de lançamento para o Puppeteer.
 * @param {string} sessionId - ID da sessão para carregar/salvar dados de perfil (opcional).
 * @returns {Promise<object>} Objeto contendo o navegador e a página.
 */
async function launchBrowser(launchOptions = {}, sessionId = null) {
  logger.log(`[Puppeteer] Iniciando navegador ${sessionId ? 'para sessão ' + sessionId : ''}...`);

  const defaultLaunchOptions = {
    headless: false, // Sempre abrir o navegador visualmente
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      // Adicionar outros args úteis se necessário, como para ignorar erros de certificado (com cautela)
      // '--ignore-certificate-errors' 
    ],
    userDataDir: undefined // Será definido se sessionId for fornecido
  };

  let userDataDir;
  if (sessionId) {
    // Para Puppeteer, o sessionDataPath retorna o caminho do diretório userDataDir
    userDataDir = sessionManager.getSessionDataPath('puppeteer', sessionId);
    sessionManager.ensureSessionPathExists('puppeteer', sessionId); // Garante que o diretório exista
    logger.log(`[Puppeteer] Utilizando userDataDir para sessão ${sessionId}: ${userDataDir}`);
  }

  const finalLaunchOptions = { ...defaultLaunchOptions, ...launchOptions, userDataDir };

  const browser = await puppeteer.launch(finalLaunchOptions);
  const page = (await browser.pages())[0] || await browser.newPage(); // Pega a página inicial ou cria uma nova

  logger.log(`[Puppeteer] Navegador iniciado e página pronta ${sessionId ? 'para sessão ' + sessionId : ''}.`);

  return { browser, page };
}

/**
 * Fecha o navegador Puppeteer.
 * @param {object} browser - Instância do navegador Puppeteer.
 */
async function closeBrowser(browser) {
  if (browser) {
    await browser.close();
    logger.log('[Puppeteer] Navegador fechado.');
  }
}

/**
 * Salva o estado da sessão (Puppeteer geralmente gerencia isso através do userDataDir).
 * Esta função serve mais como um ponto de log ou para futuras lógicas de sessão específicas.
 * @param {string} sessionId - ID da sessão.
 */
async function saveSession(sessionId) {
  if (!sessionId) {
    logger.warn('[Puppeteer] Session ID não fornecido. A sessão (userDataDir) é gerenciada pelo ciclo de vida do navegador.');
    return;
  }
  logger.log(`[Puppeteer] Sessão ${sessionId} é persistida automaticamente através do userDataDir, se configurado no lançamento.`);
  // Nenhuma ação explícita de salvar é geralmente necessária aqui para Puppeteer se userDataDir estiver em uso,
  // a menos que queiramos forçar algum flush de dados ou realizar operações de limpeza/backup.
}


module.exports = {
  launchBrowser,
  closeBrowser,
  saveSession,
  // Outras funções específicas do Puppeteer podem ser adicionadas aqui
};
