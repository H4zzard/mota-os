/**
 * Troca credenciais Auth0 por um JWT válido para WIF da Anthropic.
 * Salva o token no caminho definido por ANTHROPIC_IDENTITY_TOKEN_FILE.
 *
 * Uso:
 *   node scripts/refresh-anthropic-token.mjs
 *
 * Variáveis de ambiente necessárias (adicione ao .env.local ou env vars do Coolify):
 *   AUTH0_DOMAIN         → ex: minha-empresa.us.auth0.com
 *   AUTH0_CLIENT_ID      → Client ID da aplicação M2M
 *   AUTH0_CLIENT_SECRET  → Client Secret da aplicação M2M
 *   ANTHROPIC_IDENTITY_TOKEN_FILE → caminho onde o token será salvo
 */

import { writeFileSync, mkdirSync } from "fs"
import { dirname }                  from "path"

const {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  ANTHROPIC_IDENTITY_TOKEN_FILE,
} = process.env

const missing = ["AUTH0_DOMAIN","AUTH0_CLIENT_ID","AUTH0_CLIENT_SECRET","ANTHROPIC_IDENTITY_TOKEN_FILE"]
  .filter(k => !process.env[k])

if (missing.length) {
  console.error(`[refresh-token] Variáveis ausentes: ${missing.join(", ")}`)
  process.exit(1)
}

const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
  method:  "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type:    "client_credentials",
    client_id:     AUTH0_CLIENT_ID,
    client_secret: AUTH0_CLIENT_SECRET,
    audience:      "https://api.anthropic.com",
  }),
})

if (!res.ok) {
  const body = await res.text()
  console.error(`[refresh-token] Auth0 retornou ${res.status}: ${body}`)
  process.exit(1)
}

const { access_token } = await res.json()

mkdirSync(dirname(ANTHROPIC_IDENTITY_TOKEN_FILE), { recursive: true })
writeFileSync(ANTHROPIC_IDENTITY_TOKEN_FILE, access_token, "utf8")

console.log(`[refresh-token] Token salvo em ${ANTHROPIC_IDENTITY_TOKEN_FILE}`)
