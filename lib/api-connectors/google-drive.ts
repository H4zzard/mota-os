/**
 * Google Drive connector — Mota OS
 * Credenciais em .env.local:
 *   GOOGLE_SERVICE_ACCOUNT_JSON='{...}'     (JSON da service account com escopo Drive)
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID=xxxxxxxxxx  (pasta compartilhada com a service account)
 * Usar apenas em Server Components, Route Handlers ou Server Actions.
 */

import { google } from "googleapis"

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GoogleDriveConfig {
  serviceAccountJson: string
  rootFolderId?:      string
}

function getConfig(): GoogleDriveConfig {
  return {
    serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON  ?? "",
    rootFolderId:       process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DriveMimeType =
  | "application/vnd.google-apps.folder"
  | "application/vnd.google-apps.document"
  | "application/vnd.google-apps.spreadsheet"
  | "application/vnd.google-apps.presentation"
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "video/mp4"
  | string

export interface DriveFile {
  id:             string
  name:           string
  mimeType:       DriveMimeType
  size?:          string
  parents?:       string[]
  webViewLink?:   string
  thumbnailLink?: string
  createdTime:    string
  modifiedTime:   string
}

export interface DriveFolder extends DriveFile {
  mimeType: "application/vnd.google-apps.folder"
}

export interface DriveListParams {
  folderId?:  string
  mimeType?:  DriveMimeType
  query?:     string
  pageSize?:  number
  pageToken?: string
}

export interface DriveListResponse {
  files:          DriveFile[]
  nextPageToken?: string
}

export interface DriveUploadParams {
  name:      string
  mimeType:  DriveMimeType
  parentId?: string
  content:   Buffer | string
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class GoogleDriveClient {
  constructor(private config: GoogleDriveConfig) {}

  private getDrive() {
    const credentials = JSON.parse(this.config.serviceAccountJson)
    const auth        = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    })
    return google.drive({ version: "v3", auth })
  }

  async listFiles(params: DriveListParams = {}): Promise<DriveListResponse> {
    const drive    = this.getDrive()
    const folderId = params.folderId ?? this.config.rootFolderId
    const qParts   = ["trashed = false"]
    if (folderId)        qParts.push(`'${folderId}' in parents`)
    if (params.mimeType) qParts.push(`mimeType = '${params.mimeType}'`)
    if (params.query)    qParts.push(params.query)

    const res = await drive.files.list({
      q:         qParts.join(" and "),
      pageSize:  params.pageSize ?? 100,
      pageToken: params.pageToken,
      fields:    "nextPageToken, files(id, name, mimeType, size, parents, webViewLink, thumbnailLink, createdTime, modifiedTime)",
    })

    return {
      files:         (res.data.files ?? []) as DriveFile[],
      nextPageToken: res.data.nextPageToken ?? undefined,
    }
  }

  async getFile(fileId: string): Promise<DriveFile> {
    const drive = this.getDrive()
    const res   = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, parents, webViewLink, createdTime, modifiedTime",
    })
    return res.data as DriveFile
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const drive = this.getDrive()
    const res   = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    )
    return Buffer.from(res.data as ArrayBuffer)
  }

  async exportGoogleDoc(fileId: string, mimeType: "application/pdf" | "text/plain" = "application/pdf"): Promise<Buffer> {
    const drive = this.getDrive()
    const res   = await drive.files.export(
      { fileId, mimeType },
      { responseType: "arraybuffer" }
    )
    return Buffer.from(res.data as ArrayBuffer)
  }

  async uploadFile(params: DriveUploadParams): Promise<DriveFile> {
    const drive    = this.getDrive()
    const parentId = params.parentId ?? this.config.rootFolderId
    const res      = await drive.files.create({
      requestBody: {
        name:    params.name,
        parents: parentId ? [parentId] : undefined,
      },
      media:  { mimeType: params.mimeType, body: params.content },
      fields: "id, name, mimeType, size, webViewLink, createdTime, modifiedTime",
    })
    return res.data as DriveFile
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    const drive  = this.getDrive()
    const parent = parentId ?? this.config.rootFolderId
    const res    = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents:  parent ? [parent] : undefined,
      },
      fields: "id, name, mimeType, parents, createdTime, modifiedTime",
    })
    return res.data as DriveFolder
  }

  async deleteFile(fileId: string): Promise<void> {
    const drive = this.getDrive()
    await drive.files.delete({ fileId })
  }

  async listAllFiles(folderId?: string): Promise<DriveFile[]> {
    const result: DriveFile[] = []
    let pageToken: string | undefined
    do {
      const page = await this.listFiles({ folderId, pageToken })
      result.push(...page.files)
      pageToken = page.nextPageToken
    } while (pageToken)
    return result
  }
}

export function createGoogleDriveClient(config = getConfig()): GoogleDriveClient {
  return new GoogleDriveClient(config)
}
