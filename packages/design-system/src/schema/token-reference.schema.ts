import { z } from 'zod'

const tokenReferencePattern = /^\{[a-z][a-z0-9-]*(?:\.(?:[a-z][a-z0-9-]*|\d+))+\}$/u

export const tokenReferenceSchema = z
  .string()
  .regex(tokenReferencePattern, 'Token references must use the complete {token.path} syntax.')

export function isTokenReference(value: unknown): value is string {
  return typeof value === 'string' && tokenReferencePattern.test(value)
}

export function tokenPathFromReference(reference: string): string {
  return reference.slice(1, -1)
}
