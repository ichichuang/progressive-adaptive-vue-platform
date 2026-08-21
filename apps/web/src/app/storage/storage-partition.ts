declare const principalPartitionIdIdentity: unique symbol

export type PrincipalPartitionId = string & {
  readonly [principalPartitionIdIdentity]: true
}

export type PrincipalPartitionKind = 'anonymous' | 'user' | 'tenant-user' | 'none'

export const nonePrincipalPartitionId = 'none' as PrincipalPartitionId
