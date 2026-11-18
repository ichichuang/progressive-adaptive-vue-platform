import type { AccessHost } from '../access/access-contract'
import type { ConditionalAuthority } from './showcase-conditional'
import type { AccessShowcaseProfile } from './showcase-routes'
import { createShowcaseAdministration } from './showcase-administration'
import { createShowcaseWorld, type ShowcaseWorld } from './showcase-world'

let session: ShowcaseWorld | undefined

export function startAccessShowcase(
  profile: AccessShowcaseProfile,
  authority?: ConditionalAuthority,
): AccessHost {
  session = createShowcaseWorld(profile, authority)
  const admin = createShowcaseAdministration(session)
  return {
    ...session.host,
    decisions: [...session.host.decisions, admin.provider],
    administration: admin.modules,
  }
}

export function useShowcaseWorld(): ShowcaseWorld {
  if (session === undefined) throw new TypeError('The access showcase composition is unavailable.')
  return session
}
