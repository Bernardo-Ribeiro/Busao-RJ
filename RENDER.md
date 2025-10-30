# Deploy no Render com Docker

Este projeto agora possui um `Dockerfile` multi-stage para construir e rodar a aplicação Spring Boot no Render (ou qualquer plataforma com Docker).

## Pré-requisitos
- Java não é necessário no Render; ele usará o container.
- O `application.properties` usa `server.port=${PORT:8080}` para compatibilidade com Render.

## Estrutura de container
- Build stage: `eclipse-temurin:17-jdk-jammy` compila com Maven Wrapper (`./mvnw`).
- Runtime stage: `eclipse-temurin:17-jre-jammy` executa o JAR.
- Entrada: `ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]`

## Subindo no Render
1. Faça push do repositório para o GitHub.
2. No dashboard do Render: New → Web Service.
3. Escolha "Build & deploy from a Git repository" e selecione este repo.
4. Em Runtime, selecione "Docker" (env: docker). O Render detectará o `Dockerfile`.
5. Health Check Path: `/` (a página `index.html` já é servida pelo Spring).
6. Variáveis de ambiente (opcional):
   - `JAVA_OPTS=-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC`

O Render definirá `PORT` automaticamente, e a aplicação respeitará isso.

## Teste local (opcional)
Caso queira testar localmente com Docker:

```powershell
# Build da imagem
docker build -t busao-rj .

# Rodar a imagem (publicando porta 8080)
docker run --rm -p 8080:8080 busao-rj
```

Acesse: http://localhost:8080

## Frontend separado (opcional)
Se preferir um Static Site separado para o frontend:
- Publique somente `src/main/resources/static/` como Static Site no Render.
- Em `src/main/resources/static/config.js`, defina o backend:

```js
window.API_BASE = 'https://SEU-SERVICO.onrender.com';
```

Assim o frontend (Wasmer/Render static) conversa com seu backend Java publicado como Web Service.
