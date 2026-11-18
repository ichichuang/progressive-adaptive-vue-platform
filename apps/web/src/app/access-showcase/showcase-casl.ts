import { createCaslAccess } from '../access/casl-access'
import {
  conditionalCapabilities,
  conditionsFor,
  type ConditionalAuthority,
} from './showcase-conditional'
import { fixtureRecordsDomain, globalShowcaseScope } from './showcase-requirements'

export const createShowcaseCasl: ConditionalAuthority = (loadFacts) => {
  const mappings = conditionalCapabilities.map((capability) => ({
    ...capability,
    subject: capability.resource,
    abilityAction: capability.action,
  }))
  return createCaslAccess({
    domain: fixtureRecordsDomain,
    scope: globalShowcaseScope,
    mappings,
    policy: {
      revision: 'showcase-casl-policy',
      rules: mappings.map(({ subject, abilityAction }) => ({
        action: abilityAction,
        subject,
        conditions: conditionsFor(abilityAction),
      })),
    },
    loadFacts,
  }).provider
}
