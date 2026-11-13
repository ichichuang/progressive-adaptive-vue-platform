import { z } from 'zod'
import { createTableQueryLinkCodec } from './table-query-link'

/** Demo filters are public sample catalogue fields, never arbitrary form values. */
export const tableQuerySharingCodec = createTableQueryLinkCodec(
  z.strictObject({
    title: z.string().max(80).default(''),
    category: z.union([z.enum(['Design', 'Engineering', 'Research', '']), z.null()]).default(null),
  }),
  {
    sortableKeys: ['id', 'title', 'category', 'price', 'stock'],
    pageSizes: [5, 10, 20],
    pageSize: 10,
  },
)
