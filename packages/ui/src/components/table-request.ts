import {
  cloneDraft,
  formPathParts,
  freezeDraftValue,
  getFormValue,
} from '../composables/form-draft-values'
import type {
  UiTableParameter,
  UiTableRecord,
  UiTableRequest,
  UiTableRequestContext,
  UiTableResolvedRequest,
} from './table-contracts'

/** Data paths do not support expressions, wildcards, or prototype traversal. */
export function tablePathParts(value: unknown): string[] {
  if (typeof value !== 'string') throw new TypeError('Expected a table data path.')
  const parts = formPathParts(value)
  if (parts.some((part) => !/^[\p{L}\p{N}_$-]+$/u.test(part)))
    throw new TypeError('Invalid table data path.')
  return parts
}

function reference(value: unknown): void {
  const [root, ...parts] = tablePathParts(value)
  if (['page', 'pageSize', 'offset'].includes(root ?? '') && parts.length === 0) return
  if (root === 'sorts' && parts.length === 0) return
  if (root === 'sort' && parts.length === 1 && ['key', 'order'].includes(parts[0] ?? '')) return
  if (root === 'selection' && parts.length === 1 && ['keys', 'rows'].includes(parts[0] ?? ''))
    return
  if (['filters', 'context', 'row', 'form'].includes(root ?? '') && parts.length > 0) return
  throw new TypeError('Unsupported table parameter reference.')
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new TypeError('Expected a table request object.')
  return value as Record<string, unknown>
}

function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new TypeError('Unsupported table request property.')
}

function apiPath(value: unknown): Set<string> {
  if (typeof value !== 'string' || !value) throw new TypeError('A table API path is required.')
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    throw new TypeError('Invalid table API path encoding.')
  }
  if (
    decoded.startsWith('//') ||
    /[\s\\:?#]/u.test(decoded) ||
    Array.from(decoded).some((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    }) ||
    decoded.split('/').some((part) => part === '.' || part === '..')
  )
    throw new TypeError('Table API configuration requires a relative path without a query or hash.')
  const placeholders = new Set<string>()
  for (const segment of value.split('/')) {
    if (!/[{}]/u.test(decodeURIComponent(segment))) continue
    const match = /^\{([\p{L}\p{N}_$-]+)\}$/u.exec(segment)
    const name = match?.[1]
    if (name === undefined)
      throw new TypeError('Table path placeholders must occupy whole segments.')
    tablePathParts(name)
    placeholders.add(name)
  }
  return placeholders
}

function pathSegment(value: unknown): string {
  if (
    (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') ||
    (typeof value === 'number' && !Number.isFinite(value)) ||
    value === '' ||
    value === '.' ||
    value === '..'
  )
    throw new TypeError('Table path parameters require a nonempty scalar without dot traversal.')
  try {
    return encodeURIComponent(String(value))
  } catch {
    throw new TypeError('Invalid table path parameter encoding.')
  }
}

/** Internal request boundary shared by schema parsing and standalone resolution. */
export function parseTableRequest(input: unknown): UiTableRequest {
  const cloned: unknown = cloneDraft(input)
  const request = record(cloned)
  keys(request, ['api', 'method', 'path', 'params', 'body'])
  const placeholders = apiPath(request['api'])
  if (
    typeof request['method'] !== 'string' ||
    !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request['method'])
  )
    throw new TypeError('Unsupported table request method.')
  const path = request['path'] === undefined ? {} : record(request['path'])
  if (
    Object.keys(path).some((key) => !placeholders.has(key)) ||
    Array.from(placeholders).some((key) => !Object.hasOwn(path, key))
  )
    throw new TypeError('Table path bindings must match every API placeholder exactly.')
  for (const target of ['path', 'params', 'body']) {
    if (request[target] === undefined) continue
    for (const raw of Object.values(record(request[target]))) {
      const parameter = record(raw)
      if (Object.hasOwn(parameter, 'value')) {
        keys(parameter, ['value'])
        if (target === 'path') pathSegment(parameter['value'])
      } else {
        keys(parameter, ['from'])
        reference(parameter['from'])
      }
    }
  }
  freezeDraftValue(cloned)
  return cloned as UiTableRequest
}

/** Resolve only declared own-property data, returning an isolated JSON request. */
export function resolveUiTableRequest(
  request: UiTableRequest,
  context: UiTableRequestContext,
): UiTableResolvedRequest {
  const parsed = parseTableRequest(request)
  function resolve(parameter: UiTableParameter): unknown {
    if ('value' in parameter) return parameter.value
    if (parameter.from !== 'offset') return getFormValue(context, parameter.from)
    if (
      !Number.isSafeInteger(context.page) ||
      context.page < 1 ||
      !Number.isSafeInteger(context.pageSize) ||
      context.pageSize < 1
    )
      throw new TypeError('Table offsets require positive safe integer pagination.')
    const offset = (context.page - 1) * context.pageSize
    if (!Number.isSafeInteger(offset)) throw new TypeError('Table offset exceeds the safe range.')
    return offset
  }
  function parameters(
    input: Readonly<Record<string, UiTableParameter>> | undefined,
  ): UiTableRecord {
    const result: UiTableRecord = {}
    for (const [key, parameter] of Object.entries(input ?? {})) {
      const value = resolve(parameter)
      if (value !== undefined) result[key] = cloneDraft(value) as UiTableRecord[string]
    }
    return result
  }
  return {
    api: parsed.api
      .split('/')
      .map((segment) => {
        if (!segment.startsWith('{')) return segment
        const parameter = parsed.path?.[segment.slice(1, -1)]
        if (parameter === undefined) throw new TypeError('Missing table path binding.')
        return pathSegment(resolve(parameter))
      })
      .join('/'),
    method: parsed.method,
    params: parameters(parsed.params),
    body: parameters(parsed.body),
  }
}
