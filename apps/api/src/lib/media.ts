import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Readable } from 'node:stream'
import { HttpError } from './auth.js'
import { env } from './env.js'

function getDirname(): string {
  try {
    if (typeof import.meta.url === 'string' && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url))
    }
  } catch {}
  return process.cwd?.() ?? ''
}

const here = getDirname()
export const storageRoot = path.resolve(here, '../../', env.STORAGE_DIR || 'storage')

export interface UploadTicket {
  /** Where the browser should PUT/POST the bytes. */
  uploadUrl: string
  /** Provider-side id we persist on MediaAsset.externalId. */
  externalId: string
  /** Extra headers/fields the client must send. */
  headers?: Record<string, string>
}

export interface StoredObject {
  externalId: string
  localPath?: string
  playbackUrl: string
  sizeBytes?: number
}

/**
 * Video never streams through the API in production. The browser uploads
 * straight to the provider with a signed ticket, and the provider calls our
 * webhook when the asset is ready. Proxying video through Node is the fastest
 * way to melt a small server and a bandwidth budget at once.
 *
 * The local provider below is a dev stand-in that writes to ./storage so the
 * stack runs with no third-party account. It is the ONLY implementation that
 * accepts bytes through the API, and it is not for production use.
 */
export interface MediaProvider {
  readonly name: string
  createUploadTicket(input: {
    mediaId: string
    kind: string
    /** Lets the provider pick a file extension for the stored object. */
    contentType?: string
  }): Promise<UploadTicket>
  /** Only the local dev provider implements this. */
  acceptDirectUpload?(input: {
    mediaId: string
    filename: string
    stream: Readable
  }): Promise<StoredObject>
  playbackUrlFor(externalId: string): string
  /**
   * Providers whose objects are private mint a time-limited URL instead. Async
   * because signing is a round trip; playbackUrlFor() stays synchronous so the
   * local provider and its 14 existing call sites are unaffected.
   */
  signedPlaybackUrl?(externalId: string, expiresInSeconds: number): Promise<string>
  /** Hard-delete the bytes. Used by the retention job. */
  deleteObject?(externalId: string): Promise<void>
}

class LocalMediaProvider implements MediaProvider {
  readonly name = 'local'

  async createUploadTicket({ mediaId }: { mediaId: string; kind: string }): Promise<UploadTicket> {
    return {
      uploadUrl: `/api/media/${mediaId}/upload`,
      externalId: mediaId,
    }
  }

  async acceptDirectUpload({
    mediaId,
    filename,
    stream,
  }: {
    mediaId: string
    filename: string
    stream: Readable
  }): Promise<StoredObject> {
    const safeExt = path.extname(filename).replace(/[^.a-zA-Z0-9]/g, '') || '.webm'
    const dir = path.join(storageRoot, 'submissions')
    await mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `${mediaId}${safeExt}`)
    await pipeline(stream, createWriteStream(filePath))
    return {
      externalId: mediaId,
      localPath: filePath,
      playbackUrl: this.playbackUrlFor(`${mediaId}${safeExt}`),
    }
  }

  playbackUrlFor(externalId: string): string {
    return `/media/submissions/${externalId}`
  }
}

/** video/webm;codecs=vp9 -> webm. Whatever MediaRecorder picked, we store it as-is. */
function extensionFor(contentType: string | undefined): string {
  if (contentType?.includes('mp4')) return 'mp4'
  return 'webm'
}

/**
 * A Storage failure that remembers the status Supabase actually reported, so
 * callers can branch on it (retry a missing bucket, ignore a create race)
 * without pattern-matching the human-readable message.
 */
class StorageError extends HttpError {
  constructor(
    readonly storageStatus: number,
    message: string,
    code: string,
  ) {
    super(502, message, code)
  }
}

/**
 * Turn a Storage HTTP failure into something an operator can act on.
 *
 * Every one of these is a deploy-configuration problem, and the generic 500
 * ("Something broke on our side") is the worst possible answer to it — it points
 * at the code when the fix is one field in a dashboard. So name the likely cause
 * per status and pass Supabase's own message through.
 *
 * Nothing secret goes out: Storage error bodies carry a reason string, never the
 * service key and never the signed token we sent.
 */
function storageFailure(httpStatus: number, detail: string): StorageError {
  const trimmed = detail.trim().slice(0, 300)

  /**
   * Prefer the status inside the body over the HTTP one. A missing bucket comes
   * back as HTTP 400 wrapping {"statusCode":"404","message":"The related resource
   * does not exist"} — read only the outer 400 and you tell the operator to check
   * the object path when the bucket simply isn't there.
   */
  let status = httpStatus
  try {
    const inner = Number((JSON.parse(trimmed) as { statusCode?: string | number }).statusCode)
    if (Number.isFinite(inner) && inner >= 400) status = inner
  } catch {
    // Not JSON, or truncated mid-object. The HTTP status is all we have.
  }

  const hint =
    status === 404
      ? `bucket "${env.SUPABASE_STORAGE_BUCKET}" does not exist in this Supabase project — create it with the public toggle OFF, or fix SUPABASE_STORAGE_BUCKET`
      : status === 400
        ? 'Supabase rejected the request — usually a bucket name or object path problem'
        : status === 401 || status === 403
          ? 'SUPABASE_SERVICE_ROLE_KEY is missing, wrong, or is the anon key rather than service_role'
          : status === 413
            ? "the file is larger than the bucket's upload limit"
            : 'Supabase Storage returned an unexpected status'

  return new StorageError(
    status,
    `Video storage is misconfigured: ${hint}. Supabase said ${status}${trimmed ? `: ${trimmed}` : ''}.`,
    status === 404 ? 'STORAGE_BUCKET_MISSING' : 'STORAGE_MISCONFIGURED',
  )
}

/**
 * Supabase Storage, private bucket.
 *
 * Deliberately no @supabase/supabase-js: all three operations we need are one
 * HTTP call each, and Node 20+ has global fetch. Adding the SDK to save ~40
 * lines would mean a dependency install and a bigger serverless bundle.
 *
 * Note there is no acceptDirectUpload — bytes go browser -> Supabase and never
 * touch the API, which is also what keeps us under Vercel's 4.5 MB body cap.
 */
class SupabaseMediaProvider implements MediaProvider {
  readonly name = 'supabase'

  private readonly base: string
  private readonly bucket: string
  private readonly key: string

  constructor() {
    // env.ts already guarantees these are present when MEDIA_PROVIDER=supabase.
    this.base = `${env.SUPABASE_URL!.replace(/\/+$/, '')}/storage/v1`
    this.bucket = env.SUPABASE_STORAGE_BUCKET
    this.key = env.SUPABASE_SERVICE_ROLE_KEY!
  }

  private async call<T>(method: string, urlPath: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.base}${urlPath}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          apikey: this.key,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch (cause) {
      // A DNS or TLS failure here means SUPABASE_URL points somewhere that isn't
      // a Supabase project. Distinguish it from a project that answered badly.
      throw new HttpError(
        502,
        `Video storage is unreachable at SUPABASE_URL — ${(cause as Error).message}`,
        'STORAGE_UNREACHABLE',
      )
    }

    if (!res.ok) {
      throw storageFailure(res.status, await res.text().catch(() => ''))
    }
    return (await res.json()) as T
  }

  /**
   * Object key inside the bucket, also persisted as externalId. Keyed by media
   * kind rather than a fixed prefix — the bucket is already named for the
   * product, and lesson video and student video want separating.
   */
  private objectPath(mediaId: string, kind: string, contentType?: string): string {
    const folder = kind.replace(/[^a-z0-9_-]/gi, '') || 'other'
    return `${folder}/${mediaId}.${extensionFor(contentType)}`
  }

  async createUploadTicket({
    mediaId,
    kind,
    contentType,
  }: {
    mediaId: string
    kind: string
    contentType?: string
  }): Promise<UploadTicket> {
    const objectPath = this.objectPath(mediaId, kind, contentType)

    let url: string
    try {
      url = await this.signUpload(objectPath)
    } catch (err) {
      // A brand new Supabase project has no buckets, so the very first upload of
      // every deploy would otherwise fail on a step no code path can recover from
      // and no student can act on. Create it and retry once.
      if (!(err instanceof StorageError) || err.code !== 'STORAGE_BUCKET_MISSING') throw err
      await this.createBucket()
      url = await this.signUpload(objectPath)
    }

    return {
      uploadUrl: `${this.base}${url}`,
      externalId: objectPath,
      headers: { 'content-type': contentType ?? 'video/webm' },
    }
  }

  /** Response url is relative and already carries ?token=<jwt>. */
  private async signUpload(objectPath: string): Promise<string> {
    const { url } = await this.call<{ url: string }>(
      'POST',
      `/object/upload/sign/${this.bucket}/${objectPath}`,
      {},
    )
    return url
  }

  /**
   * Create the bucket, private.
   *
   * `public: false` is not a default being restated — it is the single most
   * important line in this file. A public bucket puts every student's practice
   * video on the open internet behind a guessable path, which breaks the DPDP
   * promise the whole product rests on. Playback goes through signedPlaybackUrl()
   * precisely so the bucket never has to be public.
   *
   * A 409 means another container won the race. That is success, not failure.
   */
  private async createBucket(): Promise<void> {
    try {
      await this.call('POST', '/bucket', { name: this.bucket, id: this.bucket, public: false })
      console.warn(`[media] created missing private Supabase bucket "${this.bucket}"`)
    } catch (err) {
      if (!(err instanceof StorageError) || err.storageStatus !== 409) throw err
    }
  }

  async signedPlaybackUrl(externalId: string, expiresInSeconds: number): Promise<string> {
    const { signedURL } = await this.call<{ signedURL: string }>(
      'POST',
      `/object/sign/${this.bucket}/${externalId}`,
      { expiresIn: expiresInSeconds },
    )
    return `${this.base}${signedURL}`
  }

  async deleteObject(externalId: string): Promise<void> {
    await this.call('DELETE', `/object/${this.bucket}`, { prefixes: [externalId] })
  }

  /**
   * The bucket is private, so an unsigned URL is not playable — it exists only
   * to satisfy the interface. Callers that need a working URL must use
   * signedPlaybackUrl(); the routes check for it before falling back here.
   */
  playbackUrlFor(externalId: string): string {
    return `${this.base}/object/${this.bucket}/${externalId}`
  }
}

/**
 * Stub for the real thing. Bunny Stream is the cheapest credible option for an
 * India-first, cost-sensitive rollout; Cloudflare Stream is the alternative.
 * Implementing this class is the only change needed to go production — no
 * route or schema changes, which is the point of the interface.
 */
class BunnyMediaProvider implements MediaProvider {
  readonly name = 'bunny'

  async createUploadTicket(): Promise<UploadTicket> {
    throw new Error(
      'BunnyMediaProvider is not implemented yet. Set MEDIA_PROVIDER=local for development.',
    )
  }

  playbackUrlFor(externalId: string): string {
    return `https://vz-example.b-cdn.net/${externalId}/playlist.m3u8`
  }
}

function build(): MediaProvider {
  switch (env.MEDIA_PROVIDER) {
    case 'local':
      return new LocalMediaProvider()
    case 'supabase':
      return new SupabaseMediaProvider()
    case 'bunny':
    case 'cloudflare':
      return new BunnyMediaProvider()
    default:
      return new LocalMediaProvider()
  }
}

export const mediaProvider = build()
