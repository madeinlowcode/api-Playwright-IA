# API de Automação de Navegador com Playwright e Puppeteer

## Visão Geral

Esta API Node.js, construída com Express.js, permite a execução remota de tarefas de automação de navegador utilizando as bibliotecas Playwright e Puppeteer. Ela é projetada para rodar localmente, sem mecanismos de autenticação complexos, focando na simplicidade e na capacidade de observar as execuções em tempo real, pois os navegadores são sempre iniciados em modo visível (não headless).

A API gerencia sessões de navegador de forma persistente, permitindo que logins e outros estados do navegador sejam mantidos entre execuções de tarefas, utilizando a mesma `sessionId`.

## Funcionalidades Principais

*   Execução de tarefas com Playwright ou Puppeteer.
*   Suporte para múltiplos navegadores (Chromium, Chrome instalado no sistema, Firefox, WebKit via Playwright; Chromium via Puppeteer).
*   Persistência de sessão baseada em `sessionId`.
*   Logs detalhados no console para acompanhamento de todas as rotinas.
*   Navegadores sempre visíveis para monitoramento em tempo real.
*   Endpoint para submeter listas de tarefas.
*   Endpoint para deletar sessões de navegador salvas.
*   Tipos de tarefas suportadas:
    *   `goto`: Navega para uma URL.
    *   `screenshot`: Tira uma captura de tela da página.
    *   `type`: Digita texto em um elemento.
    *   `click`: Clica em um elemento.
    *   `wait_for_selector`: Aguarda um seletor aparecer na página.
    *   `extract_content`: Extrai o conteúdo de texto de um elemento.
    *   `delay`: Pausa a execução por uma duração especificada.
*   Tarefas opcionais: Permite que certas tarefas falhem sem interromper todo o fluxo.
*   Delay dinâmico pós-digitação: A tarefa `type` calcula e aplica um delay após a digitação para garantir que textos longos sejam processados.

## Estrutura do Projeto

```
apiPlayright/
├── logs/                     # Logs da aplicação (se configurado para arquivar)
├── node_modules/             # Dependências do Node.js
├── sessions_data/            # Dados das sessões persistentes dos navegadores
│   ├── playwright/
│   └── puppeteer/
├── screenshots/              # Capturas de tela geradas pelas tarefas
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── sessions.routes.js  # Rotas para gerenciamento de sessões
│   │   │   └── tasks.routes.js     # Rotas para execução de tarefas
│   ├── core/
│   │   ��── playwright/
│   │   │   └── playwright.handler.js # Lógica para Playwright
│   │   ├── puppeteer/
│   │   │   └── puppeteer.handler.js  # Lógica para Puppeteer
│   │   └── sessions/
│   │       └── sessionManager.js   # Gerenciamento de sessões
│   ├── services/
│   │   └── taskExecutor.js       # Orquestrador da execução de tarefas
│   ├── utils/
│   │   └── logger.js             # Utilitário de logging
│   ├── app.js                    # Configuração do Express
│   └── server.js                 # Ponto de entrada da API
├── componente.html           # Arquivo HTML de exemplo (pode ser removido)
├── package-lock.json
├── package.json
└── README.md                   # Este arquivo
```

## Configuração e Instalação

1.  **Clone o repositório** (se aplicável) ou crie a estrutura de pastas e arquivos conforme acima.
2.  **Instale as dependências do Node.js**:
    ```bash
    npm install
    ```
    Isso instalará `express`, `playwright`, `puppeteer` e `nodemon` (como dependência de desenvolvimento).
3.  **Instale os Navegadores para o Playwright**:
    Playwright requer que os binários dos navegadores que ele controla sejam instalados. Execute o seguinte comando para instalar os navegadores padrão (Chromium, Firefox, WebKit) ou especifique um (ex: `npx playwright install chromium`):
    ```bash
    npx playwright install
    ```

## Executando a API

*   **Para desenvolvimento (com `nodemon` para recarregamento automático):**
    ```bash
    npm run dev
    ```
*   **Para produção (ou execução simples):**
    ```bash
    npm start
    # Ou diretamente:
    # node src/server.js
    ```

Por padrão, a API será executada em `http://localhost:3000`.

## Endpoints da API

### 1. Submeter Tarefas

*   **Endpoint**: `POST /api/tasks`
*   **Descrição**: Submete uma ou mais tarefas para serem executadas pela plataforma especificada (Playwright ou Puppeteer).
*   **Corpo da Requisição (JSON)**:

    ```json
    {
        "platform": "playwright", // ou "puppeteer"
        "sessionId": "nomeUnicoDaSessao", // Opcional, mas recomendado para persistência
        "tasks": [
            // Lista de objetos de tarefa
            // Veja a seção "Tipos de Tarefas e Parâmetros" abaixo
        ]
    }
    ```

*   **Resposta de Sucesso (200 OK)**:
    ```json
    {
        "success": true,
        "results": [
            // Detalhes do resultado de cada tarefa executada
        ],
        "sessionId": "nomeUnicoDaSessao"
    }
    ```
*   **Respostas de Erro**:
    *   `400 Bad Request`: Se os parâmetros da requisição forem inválidos.
    *   `500 Internal Server Error`: Se ocorrer um erro durante o processamento das tarefas.

### 2. Deletar Sessão

*   **Endpoint**: `DELETE /api/sessions/:platform/:sessionId`
*   **Descrição**: Deleta os dados de uma sessão de navegador persistente.
*   **Parâmetros de URL**:
    *   `:platform`: `playwright` ou `puppeteer`
    *   `:sessionId`: O ID da sessão a ser deletada.
*   **Exemplo de URL**: `DELETE http://localhost:3000/api/sessions/playwright/minhaSessaoAntiga`
*   **Resposta de Sucesso (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Operação de exclusão para sessão [platform]-[sessionId] concluída."
    }
    ```
*   **Respostas de Erro**:
    *   `400 Bad Request`: Se os parâmetros `platform` ou `sessionId` forem inválidos ou ausentes.
    *   `500 Internal Server Error`: Se ocorrer um erro interno ao tentar deletar a sessão.

### 3. Limpar Screenshots

*   **Endpoint**: `DELETE /api/sessions/screenshots`
*   **Descrição**: Remove todos os arquivos da pasta `screenshots/`.
*   **Corpo da Requisição**: Nenhum.
*   **Resposta de Sucesso (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Todos os arquivos da pasta screenshots foram deletados com sucesso."
    }
    ```
    Ou, se a pasta não existir ou já estiver vazia:
    ```json
    {
        "success": true,
        "message": "Diretório de screenshots não encontrado. Nenhuma ação necessária."
    }
    ```
*   **Respostas de Erro**:
    *   `500 Internal Server Error`: Se ocorrer um erro interno ao tentar limpar a pasta de screenshots.

## Tipos de Tarefas e Parâmetros

Cada objeto de tarefa na lista `tasks` deve ter um campo `type` e outros parâmetros dependendo do tipo.

1.  **`goto`**: Navega para uma URL.
    *   `type`: `"goto"`
    *   `url` (string, obrigatório): A URL para navegar.
    *   `timeout` (number, opcional): Timeout em milissegundos para a navegação (padrão: 60000ms).
    *   `waitUntil` (string, opcional): Condição para considerar a navegação concluída (ex: `"load"`, `"domcontentloaded"`, `"networkidle0"`, `"networkidle2"` - padrão é `"networkidle0"`).

2.  **`screenshot`**: Tira uma captura de tela.
    *   `type`: `"screenshot"`
    *   `path` (string, obrigatório): Nome do arquivo para salvar a screenshot (ex: `"minha_foto.png"`). Será salvo na pasta `screenshots/` do projeto.
    *   `fullPage` (boolean, opcional): Se `true`, tira screenshot da página inteira (padrão: `true`).
    *   `optional` (boolean, opcional): Se `true`, a falha nesta tarefa não interrompe o fluxo (padrão: `false`).

3.  **`type`**: Digita texto em um elemento.
    *   `type`: `"type"`
    *   `selector` (string, obrigatório): Seletor CSS ou XPath (veja "Seletores") do elemento.
    *   `text` (string, obrigatório): O texto a ser digitado.
    *   `delay` (number, opcional): Delay em milissegundos entre cada caractere digitado (padrão: `100`ms).
    *   `postTypeDelay` (number, opcional): Buffer de delay adicional em milissegundos aplicado *após* o tempo calculado de digitação (padrão: `1000`ms). Útil para garantir que a digitação de textos longos seja concluída.
    *   `optional` (boolean, opcional): Se `true`, a falha nesta tarefa não interrompe o fluxo.

4.  **`click`**: Clica em um elemento.
    *   `type`: `"click"`
    *   `selector` (string, obrigatório): Seletor CSS ou XPath do elemento.
    *   `timeout` (number, opcional): Timeout em milissegundos para encontrar o elemento antes de clicar (padrão: `10000`ms).
    *   `optional` (boolean, opcional): Se `true`, a falha nesta tarefa não interrompe o fluxo.

5.  **`wait_for_selector`**: Aguarda um elemento aparecer (e ser visível) na página.
    *   `type`: `"wait_for_selector"`
    *   `selector` (string, obrigatório): Seletor CSS ou XPath do elemento.
    *   `timeout` (number, opcional): Timeout em milissegundos para esperar pelo elemento (padrão: `30000`ms).
    *   `optional` (boolean, opcional): Se `true`, a falha nesta tarefa não interrompe o fluxo.

6.  **`extract_content`**: Extrai o conteúdo de texto (innerText/textContent) de um elemento.
    *   `type`: `"extract_content"`
    *   `selector` (string, opcional): Seletor CSS ou XPath do elemento. Se omitido, o conteúdo do `<body>` é extraído.
    *   `description` (string, opcional): Uma descrição para esta tarefa, apenas para fins de log ou referência.
    *   `optional` (boolean, opcional): Se `true`, a falha nesta tarefa não interrompe o fluxo.
    *   **Resposta**: Esta tarefa adiciona um campo `content` ao objeto de resultado da tarefa na resposta da API.

7.  **`delay`**: Pausa a execução.
    *   `type`: `"delay"`
    *   `duration` (number, obrigatório): Duração da pausa em milissegundos (ex: `5000` para 5 segundos).
    *   `optional` (boolean, opcional): Se `true`, a falha nesta tarefa não interrompe o fluxo (embora seja improvável para `delay`).

**Parâmetro Global de Tarefa `optional`**:
Qualquer tarefa pode incluir o campo `"optional": true`. Se uma tarefa opcional falhar (ex: seletor não encontrado), a execução continuará para a próxima tarefa, e o erro será registrado no resultado da tarefa como `"skipped_optional_error"`.

## Seletores (Campo `selector`)

O campo `selector` nas tarefas (`type`, `click`, `wait_for_selector`, `extract_content`) pode ser:

*   **Seletor CSS padrão**: Ex: `"#meuId"`, `".minhaClasse"`, `"div > p"`.
*   **Playwright Text Selector**: Ex: `"text=Login"`.
*   **Playwright Role Selector**: Ex: `"role=button[name='Enviar']"`.
*   **XPath**:
    *   **Para Playwright**: Prefixar com `xpath=`. Ex: `"xpath=//button[@data-testid='submit_button']"`.
    *   **Para Puppeteer**: O `taskExecutor` foi modificado para detectar seletores que começam com `xpath=` e usar `page.$x()` internamente. Portanto, use o mesmo prefixo `xpath=`. Ex: `"xpath=//button[@data-testid='submit_button']"`.

**Recomendação**: Sempre que possível, use seletores robustos como IDs, `data-testid` (se disponível na página alvo), seletores ARIA (role, label), ou seletores de texto do Playwright, pois tendem a ser mais estáveis do que classes CSS geradas dinamicamente.

## Exemplo Completo de Requisição (WhatsApp)

```json
{
    "platform": "playwright",
    "tasks": [
        {
            "browserType": "chrome",
            "type": "goto",
            "url": "https://web.whatsapp.com/send/?phone=NUMERO_DO_TELEFONE_AQUI",
            "timeout": 70000
        },
        {
            "type": "wait_for_selector",
            "selector": "canvas[aria-label='Scan me!'], .app-wrapper-web",
            "timeout": 60000
        },
        {
            "type": "screenshot",
            "path": "whatsapp_initial_page_state_dynamic_delay.png",
            "fullPage": false
        },
        {
            "type": "wait_for_selector",
            "selector": ".app-wrapper-web",
            "timeout": 120000
        },
        {
            "type": "wait_for_selector",
            "selector": "xpath=//*[@id="app"]/div/span[2]/div/div/div/div/div/div/div[2]/div/button | //button[contains(., 'OK')] | //button[contains(., 'Continuar')]",
            "timeout": 15000,
            "optional": true
        },
        {
            "type": "screenshot",
            "path": "whatsapp_modal_view_if_any_dynamic_delay.png",
            "fullPage": false,
            "optional": true
        },
        {
            "type": "click",
            "selector": "xpath=//*[@id="app"]/div/span[2]/div/div/div/div/div/div/div[2]/div/button | //button[contains(., 'OK')] | //button[contains(., 'Continuar')]",
            "optional": true,
            "timeout": 10000
        },
        {
            "type": "delay",
            "duration": 2000,
            "optional": true
        },
        {
            "type": "goto",
            "url": "https://web.whatsapp.com/send/?phone=NUMERO_DO_TELEFONE_AQUI",
            "timeout": 70000
        },
        {
            "type": "wait_for_selector",
            "selector": "div[aria-label='Digite uma mensagem'][role='textbox'][contenteditable='true']",
            "timeout": 60000
        },
        {
            "type": "type",
            "selector": "div[aria-label='Digite uma mensagem'][role='textbox'][contenteditable='true']",
            "text": "Esta é uma mensagem de teste automatizada com delay dinâmico!",
            "delay": 100,
            "postTypeDelay": 3000
        },
        {
            "type": "wait_for_selector",
            "selector": "button[aria-label='Enviar']",
            "timeout": 15000
        },
        {
            "type": "click",
            "selector": "button[aria-label='Enviar']",
            "timeout": 15000
        },
        {
            "type": "delay", 
            "duration": 30000 
        },
        {
            "type": "wait_for_selector",
            "selector": "span[data-icon='msg-time'], span[data-icon='msg-dblcheck'], span[data-icon='msg-check']",
            "timeout": 10000,
            "optional": true
        },
        {
            "type": "screenshot",
            "path": "whatsapp_dynamic_delay_message_sent.png",
            "fullPage": false
        }
    ],
    "sessionId": "whatsapp_example_session"
}
```
Lembre-se de substituir `NUMERO_DO_TELEFONE_AQUI` pelo número desejado.

## Persistência de Sessão

A API utiliza a pasta `sessions_data` na raiz do projeto para armazenar perfis de navegador.
*   **Playwright**: Com a configuração atual (`launchPersistentContext`), o Playwright cria um diretório de perfil completo em `sessions_data/playwright/[sessionId]/`.
*   **Puppeteer**: O Puppeteer usa `userDataDir` apontando para `sessions_data/puppeteer/[sessionId]/`.

Isso permite que logins, cookies e outros dados do site persistam entre as execuções, contanto que o mesmo `sessionId` seja usado para a mesma plataforma.

**Importante**: Sessões criadas pelo Playwright não são diretamente compatíveis com o Puppeteer e vice-versa, mesmo que ambas usem o mesmo `sessionId`.

## Notas Adicionais

*   **Manutenção de Seletores**: Para aplicações web que mudam frequentemente sua estrutura HTML (como o WhatsApp Web), os seletores (CSS e XPath) podem precisar de atualização periódica.
*   **Recursos do Sistema**: A execução de múltiplos navegadores é intensiva em termos de CPU e memória. Monitore os recursos do sistema ao executar muitas tarefas em paralelo (via múltiplas requisições à API).

---
