const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

/**
 * @file sessionManager.js
 * @description Gerencia o armazenamento e recuperação de dados de sessão para Playwright e Puppeteer.
 * As sessões são armazenadas na pasta 'sessions_data' na raiz do projeto.
 * 
 * @AIDEV-NOTE: Replanejado para usar caminhos relativos e lidar melhor com permissões
 * @AIDEV-SECURITY: Implementada verificação de erros para operações de sistema de arquivos
 */

// Determina o caminho raiz do projeto usando path.resolve para obter caminho absoluto
const PROJECT_ROOT = path.resolve(process.cwd());

// Define o diretório de sessões como um caminho relativo ao raiz do projeto
const SESSION_DIR_NAME = 'sessions_data';
const SESSIONS_BASE_DIR = path.join(PROJECT_ROOT, SESSION_DIR_NAME);

logger.log(`[SessionManager] Diretório base de sessões definido como: ${SESSIONS_BASE_DIR}`);

/**
 * Garante que o diretório base para todas as sessões exista.
 * Implementa manipulação de erros para lidar com problemas de permissão ou caminho.
 */
function ensureBaseSessionsDirExists() {
  try {
    if (!fs.existsSync(SESSIONS_BASE_DIR)) {
      logger.log(`[SessionManager] Criando diretório base de sessões em: ${SESSIONS_BASE_DIR}`);
      fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true, mode: 0o755 }); // Define permissões explícitas
      logger.log(`[SessionManager] Diretório de sessões criado com sucesso em: ${SESSIONS_BASE_DIR}`);
    } else {
      logger.log(`[SessionManager] Diretório de sessões já existe em: ${SESSIONS_BASE_DIR}`);
    }
    return true;
  } catch (error) {
    // Tratamento específico para diferentes tipos de erro
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      logger.error(`[SessionManager] Erro de permissão ao criar diretório de sessões: ${error.message}`);
      logger.warn(`[SessionManager] Tente executar a aplicação com privilégios adequados ou ajuste as permissões do diretório: ${PROJECT_ROOT}`);
    } else {
      logger.error(`[SessionManager] Erro ao criar diretório base de sessões: ${error.message}`);
    }
    
    // Tenta criar em um local alternativo se o diretório padrão falhar
    try {
      const fallbackDir = path.join(require('os').tmpdir(), 'api-playwright-sessions');
      logger.warn(`[SessionManager] Tentando criar diretório de sessões em local alternativo: ${fallbackDir}`);
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true, mode: 0o755 });
      }
      // Atualiza o caminho base para o local alternativo
      global.SESSIONS_BASE_DIR_OVERRIDE = fallbackDir;
      return true;
    } catch (fallbackError) {
      logger.error(`[SessionManager] Falha ao criar diretório alternativo: ${fallbackError.message}`);
      return false;
    }
  }
}

// Garante que o diretório base exista ao carregar o módulo
const baseSessionDirCreated = ensureBaseSessionsDirExists();
if (!baseSessionDirCreated) {
  logger.warn('[SessionManager] Não foi possível garantir o diretório de sessões. Operações de sessão podem falhar.');
}

/**
 * Retorna o caminho completo para o diretório de dados de uma sessão específica.
 * Para Playwright, este caminho pode ser usado para a opção `storageState`.
 * Para Puppeteer, este caminho pode ser usado para a opção `userDataDir`.
 *
 * @param {string} platform - A plataforma ('playwright' ou 'puppeteer').
 * @param {string} sessionId - O identificador único da sessão.
 * @returns {string} O caminho para o arquivo/diretório de dados da sessão.
 */
/**
 * Retorna o caminho completo para o diretório de dados de uma sessão específica.
 * 
 * @AIDEV-NOTE: Atualizado para usar o diretório alternativo se o principal falhar
 * 
 * @param {string} platform - A plataforma ('playwright' ou 'puppeteer').
 * @param {string} sessionId - O identificador único da sessão.
 * @returns {string} O caminho para o arquivo/diretório de dados da sessão.
 */
function getSessionDataPath(platform, sessionId) {
  if (!platform || !sessionId) {
    logger.error('[SessionManager] Plataforma e Session ID são obrigatórios para obter o caminho da sessão.');
    throw new Error('Plataforma e Session ID são obrigatórios.');
  }

  // Sanitiza o sessionId para evitar problemas com caracteres no nome do arquivo/pasta
  const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  // Usa o diretório base padrão ou o alternativo se houve falha anterior
  const baseDir = global.SESSIONS_BASE_DIR_OVERRIDE || SESSIONS_BASE_DIR;
  const sessionPath = path.join(baseDir, platform, sanitizedSessionId);

  // Para Playwright com launchPersistentContext, ele espera um caminho de diretório.
  // Para Puppeteer, userDataDir também é um diretório.
  // Portanto, para ambos os casos, retornaremos o sessionPath diretamente.
  return sessionPath; 
}

/**
 * Garante que o caminho para uma sessão específica exista, criando os diretórios se necessário.
 * É especialmente útil para Puppeteer, que precisa que o userDataDir exista antes do lançamento.
 * Para Playwright, o diretório onde o `storage_state.json` será salvo também precisa existir.
 *
 * @param {string} platform - A plataforma ('playwright' ou 'puppeteer').
 * @param {string} sessionId - O identificador único da sessão.
 */
/**
 * Garante que o caminho para uma sessão específica exista, criando os diretórios se necessário.
 * Implementa tratamento de erros robusto para lidar com problemas de permissão.
 * 
 * @AIDEV-NOTE: Implementado tratamento de erros robusto
 * 
 * @param {string} platform - A plataforma ('playwright' ou 'puppeteer').
 * @param {string} sessionId - O identificador único da sessão.
 * @returns {boolean} - True se o diretório foi criado/existe, false se ocorreu erro
 */
function ensureSessionPathExists(platform, sessionId) {
  try {
    const fullPath = getSessionDataPath(platform, sessionId);
    const dirToEnsure = platform.toLowerCase() === 'playwright' ? path.dirname(fullPath) : fullPath;

    if (!fs.existsSync(dirToEnsure)) {
      logger.log(`[SessionManager] Criando diretório para sessão ${platform}-${sessionId} em: ${dirToEnsure}`);
      fs.mkdirSync(dirToEnsure, { recursive: true, mode: 0o755 });
      logger.log(`[SessionManager] Diretório criado com sucesso para sessão ${platform}-${sessionId}`);
    }
    return true;
  } catch (error) {
    logger.error(`[SessionManager] Erro ao criar diretório para sessão ${platform}-${sessionId}: ${error.message}`);
    
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      logger.warn(`[SessionManager] Problema de permissão. Verifique se você tem permissões adequadas.`);
    }
    return false;
  }
}

/**
 * Deleta a pasta de dados de uma sessão específica.
 *
 * @param {string} platform - A plataforma ('playwright' ou 'puppeteer').
 * @param {string} sessionId - O identificador único da sessão a ser deletada.
 * @returns {Promise<boolean>} True se a sessão foi deletada com sucesso ou não existia, false se ocorreu um erro.
 */
async function deleteSession(platform, sessionId) {
  if (!platform || !sessionId) {
    logger.error('[SessionManager] Plataforma e Session ID são obrigatórios para deletar a sessão.');
    return false;
  }
  const sessionPath = getSessionDataPath(platform, sessionId);
  // Para Playwright com launchPersistentContext e Puppeteer, sessionPath é o diretório.
  // Se usássemos storageState para Playwright, sessionPath seria o arquivo e precisaríamos pegar path.dirname(sessionPath).
  // Como ajustamos getSessionDataPath para retornar o diretório para Playwright também, sessionPath está correto.
  const directoryToDelete = sessionPath; 

  try {
    if (fs.existsSync(directoryToDelete)) {
      await fs.promises.rm(directoryToDelete, { recursive: true, force: true });
      logger.log(`[SessionManager] Sessão ${platform}-${sessionId} deletada de: ${directoryToDelete}`);
      return true;
    } else {
      logger.warn(`[SessionManager] Sessão ${platform}-${sessionId} não encontrada em ${directoryToDelete}. Nenhuma ação realizada.`);
      return true; // Considera sucesso se não existia
    }
  } catch (error) {
    logger.error(`[SessionManager] Erro ao deletar sessão ${platform}-${sessionId} de ${directoryToDelete}: ${error.message}`, error);
    return false;
  }
}

module.exports = {
  getSessionDataPath,
  ensureSessionPathExists,
  deleteSession,
  SESSIONS_BASE_DIR,
  ensureBaseSessionsDirExists, // Exporta para permitir que outros módulos possam verificar/criar o diretório
};
