// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\core\playwright\playwright.handler.js
const playwright = require('playwright');
const sessionManager = require('../sessions/sessionManager');
const logger = require('../../utils/logger');

/**
 * @file playwright.handler.js
 * @description Este arquivo é responsável por gerenciar as interações com o Playwright,
 * incluindo o lançamento de navegadores, gerenciamento de contextos e páginas,
 * e a execução de tarefas específicas do Playwright.
 */

/**
 * Lança uma instância do navegador Playwright.
 * @param {string} browserType - Tipo de navegador a ser lançado (ex: 'chromium', 'firefox', 'webkit').
 * @param {object} launchOptions - Opções de lançamento para o Playwright.
 * @param {string} sessionId - ID da sessão para carregar/salvar dados de contexto (opcional).
 * @returns {Promise<object>} Objeto contendo o navegador, contexto e página.
 */
async function launchBrowser(browserTypeInput = 'chromium', launchOptions = {}, sessionId = null) {
  let effectiveApiBrowserType = browserTypeInput.toLowerCase(); // Tipo de navegador para a API do Playwright
  logger.log(`[Playwright] Solicitado tipo de navegador: ${browserTypeInput}. Iniciando contexto persistente ${sessionId ? 'para sessão ' + sessionId : ''}...`);

  // Tenta ajudar a evitar detecção
  const defaultLaunchOptions = {
    headless: false, 
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ],
    // executablePath será definido abaixo se necessário
  };

  if (browserTypeInput.toLowerCase() === 'chrome') {
    try {
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      ];
      let chromePath = null;
      for (const p of possiblePaths) {
        if (require('fs').existsSync(p)) {
          chromePath = p;
          break;
        }
      }
      if (chromePath) {
        logger.log(`[Playwright] Usando executável do Chrome instalado em: ${chromePath}`);
        defaultLaunchOptions.executablePath = chromePath;
        effectiveApiBrowserType = 'chromium'; // IMPORTANTE: Usar o motor chromium do Playwright com o executável do Chrome
      } else {
        logger.warn(`[Playwright] Chrome (navegador instalado) não encontrado. Usando motor 'chromium' do Playwright como padrão.`);
        effectiveApiBrowserType = 'chromium';
      }
    } catch (e) {
      logger.warn(`[Playwright] Erro ao tentar localizar Chrome: ${e.message}. Usando motor 'chromium' do Playwright.`);
      effectiveApiBrowserType = 'chromium';
    }
  } else if (!['chromium', 'firefox', 'webkit'].includes(effectiveApiBrowserType)) {
    logger.warn(`[Playwright] Tipo de navegador de entrada inválido: '${browserTypeInput}'. Usando motor 'chromium' do Playwright como padrão.`);
    effectiveApiBrowserType = 'chromium';
  }

  logger.log(`[Playwright] Tentando iniciar contexto persistente com motor: ${effectiveApiBrowserType}`);

  let userDataDirToUse = null;
  if (sessionId) {
    userDataDirToUse = sessionManager.getSessionDataPath('playwright', sessionId);
    sessionManager.ensureSessionPathExists('playwright', sessionId); // Garante que o diretório (perfil) exista
    logger.log(`[Playwright] Usando userDataDir para sessão ${sessionId}: ${userDataDirToUse}`);
  } else {
    // Para launchPersistentContext, um userDataDir é obrigatório.
    // Se não houver sessionId, podemos criar um temporário ou decidir não usar contexto persistente (mas a API é para isso).
    // Por enquanto, vamos logar um aviso e o Playwright provavelmente criará um temporário se userDataDirToUse for null/undefined.
    // Ou, idealmente, forçar um ID de sessão temporário se quisermos sempre persistência mesmo que não nomeada.
    // Para este exemplo, se não houver sessionId, não será um contexto "persistente" nomeado.
    // Playwright criará um diretório temporário se userDataDir for null.
    // No entanto, para nosso gerenciamento, é melhor ter um caminho.
    // Vamos criar um temporário se não houver sessionId para manter a lógica de userDataDir.
    const tempSessionId = `temp_playwright_session_${Date.now()}`;
    userDataDirToUse = sessionManager.getSessionDataPath('playwright', tempSessionId);
    sessionManager.ensureSessionPathExists('playwright', tempSessionId);
    logger.warn(`[Playwright] Nenhum sessionId fornecido. Usando userDataDir temporário: ${userDataDirToUse}`);
  }

  const finalLaunchOptions = { ...defaultLaunchOptions, ...launchOptions };
  
  const context = await playwright[effectiveApiBrowserType].launchPersistentContext(userDataDirToUse, finalLaunchOptions);
  
  // A primeira página geralmente já está aberta em contextos persistentes.
  let page = context.pages()[0];
  if (!page) {
    page = await context.newPage(); // Cria uma nova se nenhuma existir
  }
  await page.bringToFront();

  logger.log(`[Playwright] Contexto persistente para ${browserTypeInput} (motor efetivo: ${effectiveApiBrowserType}) iniciado e página pronta ${sessionId ? 'para sessão ' + sessionId : ' (temporária)'}.`);

  // Não retornamos mais o 'browser', pois o ciclo de vida é gerenciado pelo contexto persistente.
  return { context, page }; 
}

/**
 * Fecha o contexto do navegador Playwright.
 * Fechar o contexto persistente também fecha o navegador associado.
 * @param {object} context - Instância do contexto do navegador Playwright.
 */
async function closeContext(context) {
  if (context) {
    await context.close();
    logger.log('[Playwright] Contexto persistente fechado.');
  }
}

/**
 * Salva o estado da sessão.
 * Com launchPersistentContext, a maioria dos dados é salva automaticamente no userDataDir.
 * Esta função pode ser usada para logs ou para forçar o salvamento de algo específico se necessário no futuro.
 * @param {object} context - Contexto do navegador Playwright (pode não ser necessário aqui).
 * @param {string} sessionId - ID da sessão.
 */
async function saveSession(context, sessionId) {
  if (!sessionId) {
    logger.warn('[Playwright] Session ID não fornecido. Dados de contexto persistente são salvos no userDataDir durante o uso.');
    return;
  }
  // Com launchPersistentContext, os dados são salvos no userDataDir automaticamente.
  // context.storageState() ainda pode ser usado se quisermos um snapshot explícito, mas o perfil já é persistente.
  logger.log(`[Playwright] Sessão ${sessionId} (userDataDir) é persistida automaticamente durante o uso.`);
  // Exemplo: se quiséssemos forçar um storageState mesmo com userDataDir:
  // const sessionDataPath = path.join(sessionManager.getSessionDataPath('playwright', sessionId), 'explicit_storage_state.json');
  // try {
  //   if (context) await context.storageState({ path: sessionDataPath });
  //   logger.log(`[Playwright] Snapshot explícito da sessão ${sessionId} salvo em: ${sessionDataPath}`);
  // } catch (error) {
  //   logger.error(`[Playwright] Erro ao salvar snapshot explícito da sessão ${sessionId}: ${error.message}`, error);
  // }
}

module.exports = {
  launchBrowser,
  closeContext,
  saveSession,
};
