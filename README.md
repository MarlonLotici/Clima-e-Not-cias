# ☁️ Clima e Notícias

Uma aplicação web simples e moderna para obter a previsão do tempo e as últimas notícias da sua localização atual ou de qualquer cidade do mundo.

## ✨ Funcionalidades

* **Geolocalização Automática:** Obtém sua localização atual ao carregar a página para exibir o clima local.
* **Previsão do Tempo em Tempo Real:** Exibe temperatura, umidade, velocidade do vento e probabilidade de chuva.
* **Previsão Horária e Diária:** Veja a previsão para as próximas 24 horas e para os próximos 3 ou 5 dias.
* **Busca por Cidade:** Encontre a previsão do tempo para qualquer cidade usando o campo de busca.
* **Notícias Globais e por Tópico:** Fique atualizado com as últimas notícias, com a opção de filtrar por tópicos como Tecnologia, Esportes, Saúde e mais.
* **Design Responsivo:** A interface se adapta a dispositivos móveis e desktops.
* **Alternância de Unidade de Temperatura:** Mude facilmente entre Celsius (°C) e Fahrenheit (°F).

## 🚀 Tecnologias Utilizadas

* **HTML5:** Estrutura da página.
* **CSS3:** Estilização e design responsivo.
* **JavaScript:** Lógica da aplicação e consumo de APIs.

### APIs
* **Open-Meteo:** Para dados meteorológicos.
* **Nominatim (OpenStreetMap):** Para geocodificação reversa.
* **ipapi.co:** Para obter a localização do usuário via IP como fallback.
* **GNews:** Para as últimas notícias.

## 🛠️ Como Usar

1.  Clone este repositório para o seu computador.
    ```bash
    git clone [https://github.com/SEU_USUARIO/clima-e-noticias.git](https://github.com/SEU_USUARIO/clima-e-noticias.git)
    ```
2.  Abra a pasta do projeto e edite o arquivo `script.js`.
3.  Insira sua própria chave de API da GNews na constante `gnewsApiKey`.

    ```javascript
    const gnewsApiKey = 'SUA_CHAVE_AQUI'; 
    ```

4.  Abra o arquivo `index.html` em seu navegador para rodar a aplicação localmente, ou faça o deploy em um serviço como o Netlify.

## 🔗 Demonstração ao Vivo

[Clique para ver a demonstração](https://SEU_LINK_NETLIFY.netlify.app/)

---

Você pode copiar este texto e usá-lo como o conteúdo do seu novo arquivo `README.md` no GitHub. Depois de colar e confirmar, ele aparecerá na página principal do seu repositório.
