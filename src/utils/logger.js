// c:\Users\scrip\OneDrive\Ambiente de Trabalho\apiPlayright\src\utils\logger.js

/**
 * @file logger.js
 * @description Utilitário simples para logging no console.
 * Todas as rotinas da aplicação devem utilizar este logger para registrar informações,
 * alertas e erros, facilitando o acompanhamento e a depuração.
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

/**
 * Formata a mensagem de log com timestamp e nível.
 * @param {string} level - Nível do log (INFO, WARN, ERROR, DEBUG).
 * @param {string} message - A mensagem a ser logada.
 * @param {any[]} optionalParams - Parâmetros opcionais para logar (ex: objetos, erros).
 * @returns {string} Mensagem formatada.
 */
function formatMessage(level, message, ...optionalParams) {
  const timestamp = new Date().toISOString();
  let formattedMessage = `${timestamp} [${level}] ${message}`;
  if (optionalParams.length > 0) {
    const paramsString = optionalParams.map(param => {
      if (param instanceof Error) {
        return param.stack || param.message;
      }
      if (typeof param === 'object') {
        try {
          return JSON.stringify(param, null, 2);
        } catch (e) {
          return '[Unserializable Object]';
        }
      }
      return param;
    }).join(' ');
    formattedMessage += `\n${paramsString}`;
  }
  return formattedMessage;
}

/**
 * Loga uma mensagem informativa.
 * @param {string} message - A mensagem a ser logada.
 * @param  {any[]} optionalParams - Parâmetros opcionais.
 */
function log(message, ...optionalParams) {
  console.log(formatMessage(LOG_LEVELS.INFO, message, ...optionalParams));
}

/**
 * Loga uma mensagem de alerta.
 * @param {string} message - A mensagem a ser logada.
 * @param  {any[]} optionalParams - Parâmetros opcionais.
 */
function warn(message, ...optionalParams) {
  console.warn(formatMessage(LOG_LEVELS.WARN, message, ...optionalParams));
}

/**
 * Loga uma mensagem de erro.
 * @param {string} message - A mensagem a ser logada.
 * @param {Error|any} errorObject - O objeto de erro ou outros detalhes.
 * @param  {any[]} optionalParams - Parâmetros opcionais adicionais.
 */
function error(message, errorObject, ...optionalParams) {
  if (errorObject) {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, errorObject, ...optionalParams));
  } else {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, ...optionalParams));
  }
}

/**
 * Loga uma mensagem de debug.
 * (Pode ser configurado para logar apenas em ambiente de desenvolvimento no futuro)
 * @param {string} message - A mensagem a ser logada.
 * @param  {any[]} optionalParams - Parâmetros opcionais.
 */
function debug(message, ...optionalParams) {
  // Por enquanto, loga debug normalmente. Pode ser alterado para verificar NODE_ENV.
  console.debug(formatMessage(LOG_LEVELS.DEBUG, message, ...optionalParams));
}

module.exports = {
  log,
  warn,
  error,
  debug,
  info: log, // Alias para log
};
