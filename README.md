# Física Fácil - Laboratórios Interativos ⚛️

O **Física Fácil** é um sistema educacional gamificado e interativo desenvolvido para tornar o aprendizado de física mais envolvente para alunos do ensino médio. Através de simulações visuais e desafios práticos, o sistema aborda conceitos fundamentais da física de forma dinâmica e moderna.

## 🚀 Funcionalidades Principais

- **Interface Moderna (Glassmorphism):** Design atraente, responsivo e imersivo com efeitos visuais avançados para manter a atenção do aluno.
- **Simulações em Tempo Real:** Motor de física customizado construído em JavaScript utilizando a API Canvas do HTML5.
- **Sistema de Pontuação:** Gamificação integrada para recompensar os alunos ao acertarem os alvos dos desafios.
- **Modo Fórmula:** Uma funcionalidade avançada onde os alunos abandonam a "tentativa e erro" e inserem equações matemáticas reais para calcular as variáveis necessárias para vencer o desafio.

## 🧪 Módulos Disponíveis

O sistema é dividido em 4 laboratórios interativos focados nas principais áreas da física do ensino médio:

1. **Cinemática (Lançamento de Projétil):** Calcule a velocidade inicial e o ângulo corretos para acertar um alvo a uma determinada distância, considerando a gravidade.
2. **Dinâmica (Bloco e Atrito):** Entenda as Leis de Newton calculando e aplicando a força exata necessária para empurrar um bloco sobre uma superfície com atrito até uma zona segura.
3. **Energia (Conservação):** Observe a conversão entre Energia Potencial Gravitacional e Energia Cinética. Calcule a altura ideal de queda baseada na conservação de energia do sistema.
4. **Eletrostática (Lei de Coulomb):** Posicione cargas positivas e negativas para gerar um campo elétrico capaz de guiar uma carga de prova até o objetivo final.

## 🧮 O Modo Fórmula (Powered by Math.js)

Para estimular a aplicação prática da matemática nas resoluções, o projeto conta com o **Modo Fórmula**.
- Através de um ambiente seguro fornecido pela biblioteca [Math.js](https://mathjs.org/), os alunos podem digitar expressões algébricas naturais (como `sqrt((d * g) / sin(2 * 45 deg))`).
- O sistema disponibiliza as **Variáveis Conhecidas** daquele cenário na interface (ex: `d = 125m`, `g = 9.81m/s²`).
- Ao clicar em "Calcular Valores", o sistema interpreta a equação, substitui as variáveis pelo estado atual da simulação e preenche os controles automaticamente.

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Estrutura e semântica.
- **CSS3 (Vanilla):** Estilização avançada utilizando variáveis nativas, Flexbox e efeitos de *backdrop-filter*. Não utiliza frameworks externos pesados.
- **JavaScript (ES6+):** Lógica da aplicação, navegação dinâmica (SPA simplificada) e motor das simulações em Canvas.
- **Math.js:** Utilizado via CDN para realizar a interpretação (parsing) e avaliação segura das equações matemáticas submetidas pelos usuários no Modo Fórmula.

## 💻 Como Executar o Projeto Localmente

O projeto é puramente *Client-Side* (front-end estático), o que significa que não requer configurações de servidor complexas.

1. Clone ou faça o download deste repositório para a sua máquina.
2. Navegue até a pasta do projeto.
3. Você pode simplesmente dar um clique duplo no arquivo `index.html` para abri-lo no seu navegador padrão (Google Chrome, Firefox, Edge, etc.).
4. *Opcional:* Para uma experiência de desenvolvimento melhor (com hot-reload), recomenda-se utilizar uma extensão como o **Live Server** no VSCode ou iniciar um servidor local simples via terminal (ex: `npx serve .` ou `python -m http.server`).

---
*Desenvolvido como uma ferramenta educacional para transformar a maneira como enxergamos a física nas escolas.*
