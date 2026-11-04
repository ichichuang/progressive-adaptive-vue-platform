import { z } from 'zod'

export const httpsApiBaseUrlSchema = z.string().refine((value) => {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      !value.includes('?') &&
      !value.includes('#') &&
      url.href === value &&
      url.pathname.endsWith('/')
    )
  } catch {
    return false
  }
})

export const apiProxyPrefixSchema = z.string().refine((value) => {
  try {
    return (
      value.startsWith('/') &&
      !value.startsWith('//') &&
      value !== '/' &&
      value.endsWith('/') &&
      !/[?#\\\s]/u.test(value) &&
      new URL(value, 'https://localhost/').pathname === value
    )
  } catch {
    return false
  }
})

export const apiBaseUrlSchema = z.union([httpsApiBaseUrlSchema, apiProxyPrefixSchema])

const httpsApiOriginSchema = z.string().refine((value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.origin === value
  } catch {
    return false
  }
})

export const apiConfigurationSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('unconfigured') }),
  z
    .strictObject({
      status: z.literal('configured'),
      baseUrl: apiBaseUrlSchema,
      upstreamOrigin: httpsApiOriginSchema.optional(),
    })
    .refine((value) => value.upstreamOrigin === undefined || value.baseUrl.startsWith('/')),
])

export type ApiConfiguration = Readonly<z.infer<typeof apiConfigurationSchema>>
