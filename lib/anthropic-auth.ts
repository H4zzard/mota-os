/**
 * Credenciais Anthropic via WIF (Workload Identity Federation) sem arquivo em disco.
 *
 * Como o WIF da Anthropic funciona (confirmado em @anthropic-ai/sdk):
 *   1. Um JWT externo (subject token) é emitido pelo Auth0 (client_credentials,
 *      audience https://api.anthropic.com).
 *   2. O SDK Anthropic troca esse JWT pela federation rule (RFC 7523 jwt-bearer)
 *      por um access token Anthropic temporário — internamente, em toda request.
 *   3. O SDK lê o JWT de:
 *        a. ANTHROPIC_IDENTITY_TOKEN_FILE  (caminho de arquivo) — precedência maior
 *        b. ANTHROPIC_IDENTITY_TOKEN       (valor direto)
 *      e a config de federation de:
 *        ANTHROPIC_FEDERATION_RULE_ID + ANTHROPIC_ORGANIZATION_ID
 *        (+ ANTHROPIC_SERVICE_ACCOUNT_ID, ANTHROPIC_WORKSPACE_ID)
 *
 * Em localhost o arquivo `tmp/anthropic-token` é gerado pelo predev
 * (scripts/refresh-anthropic-token.mjs). No Vercel esse script não roda e o
 * filesystem é efêmero — por isso buscamos o JWT do Auth0 em runtime e o
 * injetamos via ANTHROPIC_IDENTITY_TOKEN (valor), removendo a referência ao
 * arquivo para não cair no provider de arquivo (que tem precedência).
 *
 * Resultado: o mesmo código funciona em localhost e no Vercel, sem depender
 * de arquivo nem do predev. O SDK continua fazendo o federation exchange.
 *
 * NÃO usar `authToken` no construtor: lá o valor vira `Authorization: Bearer`
 * direto para a API da Anthropic, que rejeita o JWT do Auth0 (ele precisa do
 * exchange de federation primeiro).
 */

import os from "node:os"

type TokenCache = { token: string; expiresAt: number } | null

let _cache: TokenCache = null

/**
 * CAUSA RAIZ do "Could not resolve authentication method" no Vercel:
 *
 * Antes de sintetizar o config de federation a partir das env vars
 * (ANTHROPIC_FEDERATION_RULE_ID + ANTHROPIC_ORGANIZATION_ID), o SDK exige um
 * "config root" resolvível via getRootConfigPath(). Essa função retorna null
 * quando NENHUMA destas existe: ANTHROPIC_CONFIG_DIR, APPDATA/USERPROFILE
 * (Windows), XDG_CONFIG_HOME, HOME.
 *
 * Em localhost (Windows) há APPDATA → funciona. No Vercel (serverless Linux)
 * HOME frequentemente NÃO é definido → getRootConfigPath() retorna null →
 * loadConfigWithSource() retorna null ANTES de olhar as env vars → o SDK
 * dispara "Could not resolve authentication method", mesmo com todas as
 * variáveis de federation corretamente configuradas.
 *
 * Setar ANTHROPIC_CONFIG_DIR (maior precedência) para um diretório sempre
 * existente (os.tmpdir()) destrava a síntese via env vars. Não há arquivo de
 * config lá, então o SDK cai no caminho de síntese e usa as env vars + o
 * identity token de ANTHROPIC_IDENTITY_TOKEN. Idempotente e seguro em ambos os
 * ambientes.
 */
function ensureConfigRoot(): void {
  if (
    !process.env.ANTHROPIC_CONFIG_DIR &&
    !process.env.HOME &&
    !process.env.XDG_CONFIG_HOME &&
    !process.env.APPDATA &&
    !process.env.USERPROFILE
  ) {
    process.env.ANTHROPIC_CONFIG_DIR = os.tmpdir()
    console.log(`[anthropic-auth] ANTHROPIC_CONFIG_DIR definido para ${process.env.ANTHROPIC_CONFIG_DIR} (config root ausente no ambiente)`)
  }
}

/**
 * Garante que o SDK Anthropic tenha credenciais resolvíveis.
 *
 * - Se ANTHROPIC_API_KEY existe → não faz nada (key tem precedência no SDK).
 * - Senão → busca o JWT do Auth0 (cacheado em memória) e o injeta em
 *   ANTHROPIC_IDENTITY_TOKEN, removendo ANTHROPIC_IDENTITY_TOKEN_FILE.
 *
 * Lança se não houver API key nem variáveis Auth0 configuradas.
 */
export async function ensureAnthropicCredentials(): Promise<void> {
  // API key estática — preferência absoluta, sem Auth0
  if (process.env.ANTHROPIC_API_KEY) return

  // Destrava a síntese do config de federation em serverless (ver ensureConfigRoot)
  ensureConfigRoot()

  const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = process.env
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
    throw new Error(
      "Anthropic não está configurado. Defina ANTHROPIC_API_KEY " +
      "ou as variáveis Auth0 WIF (AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET) " +
      "no painel do Vercel (Settings → Environment Variables).",
    )
  }

  // Cache válido com 5 min de margem antes do vencimento
  if (_cache && Date.now() < _cache.expiresAt - 5 * 60_000) {
    applyIdentityToken(_cache.token)
    return
  }

  console.log("[anthropic-auth] Buscando JWT do Auth0 para federation Anthropic...")

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
    const body = await res.text().catch(() => "")
    throw new Error(`Auth0 retornou ${res.status} ao buscar JWT Anthropic: ${body}`)
  }

  const json = await res.json() as { access_token?: string; expires_in?: number }
  if (!json.access_token) {
    throw new Error("Auth0 não retornou access_token para Anthropic.")
  }

  const expiresIn = json.expires_in ?? 3600
  _cache = { token: json.access_token, expiresAt: Date.now() + expiresIn * 1000 }
  applyIdentityToken(_cache.token)

  console.log(`[anthropic-auth] JWT obtido, válido por ${expiresIn}s. Federation exchange fica a cargo do SDK.`)

  // O SDK só sintetiza o config de federation se ANTHROPIC_FEDERATION_RULE_ID
  // E ANTHROPIC_ORGANIZATION_ID estiverem presentes. Sem elas, o SDK lança o
  // críptico "Could not resolve authentication method". Validar aqui dá um erro
  // acionável apontando exatamente o que falta no ambiente (ex: no Vercel).
  assertFederationEnv()
}

function assertFederationEnv(): void {
  const faltando = [
    "ANTHROPIC_FEDERATION_RULE_ID",
    "ANTHROPIC_ORGANIZATION_ID",
  ].filter((k) => !process.env[k] || process.env[k]!.trim().length === 0)

  if (faltando.length > 0) {
    throw new Error(
      `Anthropic WIF incompleto: variáveis ausentes no ambiente: ${faltando.join(", ")}. ` +
      "Cadastre-as no Vercel (Settings → Environment Variables) junto com " +
      "ANTHROPIC_SERVICE_ACCOUNT_ID e ANTHROPIC_WORKSPACE_ID, e faça Redeploy.",
    )
  }
}

/**
 * Injeta o JWT como identity token de valor e remove a referência ao arquivo,
 * garantindo que o SDK use o valor (o provider de arquivo tem precedência).
 */
function applyIdentityToken(jwt: string): void {
  process.env.ANTHROPIC_IDENTITY_TOKEN = jwt
  // Remove o caminho de arquivo (tmp/anthropic-token) para não cair no
  // identityTokenFromFile, que tentaria ler um arquivo inexistente no Vercel.
  if (process.env.ANTHROPIC_IDENTITY_TOKEN_FILE) {
    delete process.env.ANTHROPIC_IDENTITY_TOKEN_FILE
  }
}

/**
 * Verifica se o Anthropic está configurado (API key OU Auth0 WIF).
 * Usado pelo model-registry para o gating na UI. Sem chamadas de rede.
 */
export function isAnthropicConfigured(): boolean {
  if (process.env.ANTHROPIC_API_KEY) return true
  return !!(
    process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET
  )
}
