// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\services\taskExecutor.js
const playwrightHandler = require('../core/playwright/playwright.handler');
const puppeteerHandler = require('../core/puppeteer/puppeteer.handler');
const logger = require('../utils/logger');
const sessionManager = require('../core/sessions/sessionManager'); // Pode ser útil para alguma lógica geral de sessão ou log.
const path = require('path'); // Para manipulação de caminhos, ex: screenshots
const fs = require('fs'); // Para garantir que o diretório de screenshots exista

/**
 * @file taskExecutor.js
 * @description Serviço responsável por receber, processar e executar tarefas
 * utilizando Playwright ou Puppeteer, conforme especificado.
 */

/**
 * Executa uma lista de tarefas em uma plataforma específica (Playwright ou Puppeteer).
 *
 * @param {string} platform - A plataforma a ser utilizada ('playwright' ou 'puppeteer').
 * @param {Array<object>} tasks - Uma lista de objetos de tarefa a serem executados.
 *                                Cada tarefa deve ter uma estrutura definida (ex: { type: 'goto', url: '' }, { type: 'click', selector: '' }).
 * @param {string} sessionId - (Opcional) ID da sessão para persistência. Se não fornecido, uma nova sessão temporária será usada.
 * @returns {Promise<object>} Um objeto com os resultados da execução das tarefas.
 */
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', 'screenshots'); // Pasta para salvar screenshots

/**
 * Garante que o diretório de screenshots exista.
 */
function ensureScreenshotsDirExists() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    logger.log(`[TaskExecutor] Criando diretório de screenshots em: ${SCREENSHOTS_DIR}`);
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}
ensureScreenshotsDirExists(); // Garante a criação ao carregar o módulo

async function executeTasks(platform, tasks, sessionId = null) {
  logger.log(`[TaskExecutor] Recebidas ${tasks.length} tarefas para execução na plataforma: ${platform} ${sessionId ? 'com sessionId: ' + sessionId : ''}`);
  logger.log('[DEBUG] O taskExecutor está sendo executado!'); // Log de depuração

  let browser, page, context; // browser será indefinido para Playwright com launchPersistentContext
  const results = [];

  // Gerar um sessionId se não for fornecido, para uso interno e logs
  const currentSessionId = sessionId || `temp_session_${Date.now()}`;
  const platformLower = platform.toLowerCase(); // Movida para o escopo mais alto da função

  try {
    // platformLower já está definida aqui
    if (platformLower === 'playwright') {
      const browserType = (tasks.find(t => t.browserType) || {}).browserType || 'chrome';
      logger.log(`[TaskExecutor-Playwright-Debug] Definido browserType como: ${browserType}`); // Log de depuração
      
      try {
        const { context: pwContext, page: pwPage } = await playwrightHandler.launchBrowser(
          browserType, 
          { /* opções de lançamento adicionais, se necessário */ },
          currentSessionId
        );
        context = pwContext;
        page = pwPage;
        logger.log(`[TaskExecutor-Playwright] Contexto persistente e página prontos para sessão ${currentSessionId}.`);
      } catch (launchError) {
        logger.error(`[TaskExecutor-Playwright-Debug] Erro DENTRO do bloco de lançamento do Playwright: ${launchError.message}`, launchError);
        throw launchError; // Re-lança o erro para ser pego pelo catch principal
      }

    } else if (platformLower === 'puppeteer') {
      const { browser: ppBrowser, page: ppPage } = await puppeteerHandler.launchBrowser(
        { /* opções de lançamento adicionais, se necessário */ },
        currentSessionId // Passa o sessionId para usar o userDataDir correspondente
      );
      browser = ppBrowser;
      page = ppPage;
      logger.log(`[TaskExecutor-Puppeteer] Navegador e página prontos para sessão ${currentSessionId}.`);
    } else {
      logger.error(`[TaskExecutor] Plataforma desconhecida: ${platform}`);
      throw new Error(`Plataforma desconhecida: ${platform}`);
    }

    // Execução das tarefas
    for (const task of tasks) {
      logger.log(`[TaskExecutor-${platform}] Executando tarefa: ${task.type} na sessão ${currentSessionId}`, task);
      try {
        switch (task.type.toLowerCase()) {
          case 'goto':
            if (!task.url) throw new Error("A tarefa 'goto' requer uma 'url'.");
            await page.goto(task.url, { waitUntil: 'networkidle0', timeout: task.timeout || 60000 }); // waitUntil pode variar, timeout aumentado
            results.push({ task: task, status: 'success', details: `Navegou para ${task.url}` });
            break;
          case 'screenshot':
            if (!task.path) throw new Error("A tarefa 'screenshot' requer um 'path'.");
            const screenshotPath = path.join(SCREENSHOTS_DIR, path.basename(task.path));
            const screenshotDir = path.dirname(screenshotPath);
            if (!fs.existsSync(screenshotDir)){
                fs.mkdirSync(screenshotDir, { recursive: true });
            }
            await page.screenshot({ path: screenshotPath, fullPage: task.fullPage || true });
            results.push({ task: task, status: 'success', details: `Screenshot salvo em: ${screenshotPath}` });
            break;
          case 'extract_content':
            let extractedContent;
            const extractSelector = task.selector || 'body';
            // platformLower já está definido no escopo da função e acessível aqui
            if (platformLower === 'playwright' || platformLower === 'puppeteer') {
              extractedContent = await page.$eval(extractSelector, el => el.innerText || el.textContent);
            }
            results.push({ 
              task: task, 
              status: 'success', 
              details: `Conteúdo extraído do seletor: ${extractSelector}`,
              content: extractedContent 
            });
            break;
          case 'click':
            if (!task.selector) throw new Error("A tarefa 'click' requer um 'selector'.");
            
            if (platformLower === 'puppeteer' && task.selector.startsWith('xpath=')) {
              const xpath = task.selector.substring('xpath='.length);
              const elements = await page.$x(xpath);
              if (elements.length === 0) {
                throw new Error(`Elemento não encontrado para o XPath: ${xpath}`);
              }
              await elements[0].click({ timeout: task.timeout || 10000 });
              results.push({ task: task, status: 'success', details: `Clicado no elemento via XPath: ${xpath}` });
            } else { // Playwright ou selector CSS/outros no Puppeteer
              await page.click(task.selector, { timeout: task.timeout || 10000 });
              results.push({ task: task, status: 'success', details: `Clicado no elemento: ${task.selector}` });
            }
            break;
          case 'type':
            if (!task.selector) throw new Error("A tarefa 'type' requer um 'selector'.");
            if (task.text === undefined || task.text === null) throw new Error("A tarefa 'type' requer um 'text'.");

            const textToType = task.text;
            const charTypingDelay = task.delay || 100; // Delay entre a digitação de cada caractere
            const focusOpTimeout = task.focusTimeout || 10000; // Timeout para a operação de focar no elemento
            const estimatedTotalTypingTime = textToType.length * charTypingDelay;

            logger.log(`[TaskExecutor-${platform}] Focando no seletor: ${task.selector} para digitação. Timeout para foco: ${focusOpTimeout}ms.`);
            await page.focus(task.selector, { timeout: focusOpTimeout });

            logger.log(`[TaskExecutor-${platform}] Iniciando digitação (via page.keyboard.type) no seletor focado. Texto: ${textToType.substring(0, 50)}... (Total: ${textToType.length} chars). Delay por char: ${charTypingDelay}ms. Duração total estimada da digitação: ${estimatedTotalTypingTime}ms.`);
            await page.keyboard.type(textToType, { delay: charTypingDelay });

            // Delay ADICIONAL após a operação de digitação ser considerada concluída.
            const postKeyboardTypeDelay = task.postTypeDelay || 1000; // Padrão de 1s para a UI processar, se não especificado.
            if (postKeyboardTypeDelay > 0) {
              logger.log(`[TaskExecutor-${platform}] Digitação (page.keyboard.type) concluída. Aplicando delay pós-operação de ${postKeyboardTypeDelay}ms.`);
              await new Promise(resolve => setTimeout(resolve, postKeyboardTypeDelay));
            }

            results.push({
              task: task,
              status: 'success',
              details: `Texto digitado no elemento: ${task.selector} usando page.keyboard.type. Duração estimada digitação: ${estimatedTotalTypingTime}ms. Delay pós-operação: ${postKeyboardTypeDelay}ms.`
            });
            break;
          case 'wait_for_selector':
            if (!task.selector) throw new Error("A tarefa 'wait_for_selector' requer um 'selector'.");
            
            if (platformLower === 'puppeteer' && task.selector.startsWith('xpath=')) {
               const xpath = task.selector.substring('xpath='.length);
               // Puppeteer não tem um page.waitForXPath diretamente com opções robustas como Playwright.
               // Podemos usar page.waitForFunction ou uma combinação de page.$x e loops.
               // Para simplificar, vamos usar page.waitForXPath se disponível (versões mais recentes) ou simular.
               // Nota: page.waitForXPath foi removido em Puppeteer >= 19.
               // Abordagem alternativa: wait for function que checa $x
               await page.waitForFunction(xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue, 
                 { timeout: task.timeout || 30000 }, xpath
               );
               // Após esperar a existência, esperamos visibilidade se necessário (Puppeteer $x não faz isso automaticamente como Playwright)
               // Esta parte de esperar visibilidade para XPath no Puppeteer é mais complexa e pode ser omitida por simplicidade inicial
               // await page.waitForSelector(task.selector, { timeout: task.timeout || 30000, visible: true }); // Playwright Style
               results.push({ task: task, status: 'success', details: `Aguardado pelo elemento via XPath: ${xpath}` });
            } else { // Playwright ou selector CSS/outros no Puppeteer
              await page.waitForSelector(task.selector, { timeout: task.timeout || 30000, visible: true }); // Esperar ser visível
              results.push({ task: task, status: 'success', details: `Aguardado pelo elemento: ${task.selector}` });
            }
            break;
          case 'delay':
            const delayTime = parseInt(task.duration, 10) || 1000; // Padrão de 1 segundo se não especificado
            if (isNaN(delayTime) || delayTime < 0) throw new Error("A tarefa 'delay' requer uma 'duration' numérica válida em milissegundos.");
            logger.log(`[TaskExecutor-${platform}] Aguardando por ${delayTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            results.push({ task: task, status: 'success', details: `Aguardou por ${delayTime}ms` });
            break;
          default:
            logger.warn(`[TaskExecutor-${platform}] Tipo de tarefa desconhecido: ${task.type}`);
            results.push({ task: task, status: 'skipped', details: `Tipo de tarefa desconhecido: ${task.type}` });
        }
      } catch (e) {
        if (task.optional) {
          logger.warn(`[TaskExecutor-${platform}] Erro ao executar tarefa OPCIONAL ${task.type}: ${e.message}. Continuando...`, { task, error: e.name });
          results.push({ task: task, status: 'skipped_optional_error', details: `Erro na tarefa opcional: ${e.message}` });
        } else {
          logger.error(`[TaskExecutor-${platform}] Erro ao executar tarefa ${task.type}: ${e.message}`, { task, error: e });
          results.push({ task: task, status: 'error', details: e.message });
          // Se uma tarefa não opcional falhar, podemos decidir parar toda a execução.
          // Por enquanto, continuaremos executando as próximas tarefas, mas marcando esta como erro.
          // throw e; // Para parar tudo se uma tarefa não opcional falhar.
        }
      }
    }

    // Salvar a sessão se um sessionId foi fornecido
    if (sessionId) { // Só salvar se foi uma sessão nomeada
      if (platformLower === 'playwright' && context) {
        await playwrightHandler.saveSession(context, currentSessionId);
      } else if (platformLower === 'puppeteer') {
        // Puppeteer salva automaticamente com userDataDir, mas chamamos para log e futuras lógicas
        await puppeteerHandler.saveSession(currentSessionId);
      }
    }

  } catch (error) {
    logger.error(`[TaskExecutor-${platform}] Erro crítico durante a execução das tarefas na sessão ${currentSessionId}: ${error.message}`, error);
    return { success: false, error: error.message, results, sessionId: currentSessionId };
  } finally {
    // Para Playwright, agora fechamos o contexto. Para Puppeteer, ainda fechamos o browser.
    if (platformLower === 'playwright' && context) {
      logger.log(`[TaskExecutor-Playwright] Fechando contexto persistente para sessão ${currentSessionId}...`);
      await playwrightHandler.closeContext(context);
    } else if (platformLower === 'puppeteer' && browser) {
      logger.log(`[TaskExecutor-Puppeteer] Fechando navegador para sessão ${currentSessionId}...`);
      await puppeteerHandler.closeBrowser(browser);
    } else if (browser && platformLower !== 'playwright') { // Condição ajustada para não tentar fechar browser de playwright
      logger.log(`[TaskExecutor-${platform}] Fechando navegador (genérico) para sessão ${currentSessionId}...`);
      // Esta linha é um fallback, pode não ser alcançada se a lógica de plataforma estiver correta.
      await browser.close(); 
    }
  }

  logger.log(`[TaskExecutor-${platform}] Execução de ${tasks.length} tarefas concluída para a sessão ${currentSessionId}.`);
  return { success: true, results, sessionId: currentSessionId };
}


/**
 * Limpa todos os arquivos da pasta de screenshots.
 * @returns {Promise<{success: boolean, message: string, error?: string}>}
 */
async function clearScreenshots() {
  logger.log('[TaskExecutor] Recebida solicitação para limpar a pasta de screenshots...');
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    logger.warn(`[TaskExecutor] Diretório de screenshots não encontrado em: ${SCREENSHOTS_DIR}. Nenhuma ação necessária.`);
    return { success: true, message: 'Diretório de screenshots não encontrado. Nenhuma ação necessária.' };
  }

  try {
    const files = await fs.promises.readdir(SCREENSHOTS_DIR);
    for (const file of files) {
      const filePath = path.join(SCREENSHOTS_DIR, file);
      await fs.promises.unlink(filePath);
      logger.log(`[TaskExecutor] Arquivo deletado: ${filePath}`);
    }
    logger.log(`[TaskExecutor] Todos os arquivos da pasta ${SCREENSHOTS_DIR} foram deletados com sucesso.`);
    return { success: true, message: `Todos os arquivos da pasta ${SCREENSHOTS_DIR} foram deletados com sucesso.` };
  } catch (error) {
    logger.error(`[TaskExecutor] Erro ao limpar a pasta de screenshots ${SCREENSHOTS_DIR}: ${error.message}`, error);
    return { success: false, message: `Erro ao limpar a pasta de screenshots.`, error: error.message };
  }
}

module.exports = {
  executeTasks,
  clearScreenshots, // Adicionada nova função
};