import { computed } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'

export function useAccessInteractionCopy() {
  const { t } = useConsoleI18n()
  return computed(() => ({
    read: {
      pending: t('accessInteraction.pending'),
      ready: t('accessInteraction.unavailable'),
      unavailable: t('accessInteraction.unavailable'),
      failed: t('accessInteraction.failed'),
    },
    activity: {
      idle: '',
      working: '',
      done: t('accessInteraction.done'),
      unknown: t('accessInteraction.unknown'),
      unavailable: t('accessInteraction.unavailable'),
      failed: t('accessInteraction.failed'),
    },
    command: {
      cancel: t('accessInteraction.cancel'),
      approve: t('accessInteraction.approve'),
      reject: t('accessInteraction.reject'),
      revoke: t('accessInteraction.revoke'),
    },
    mode: {
      private: t('accessInteraction.mode.private'),
      organization: t('accessInteraction.mode.organization'),
      'selected-members': t('accessInteraction.mode.selected-members'),
      public: t('accessInteraction.mode.public'),
    },
    status: {
      ready: t('accessInteraction.status.ready'),
      recorded: t('accessInteraction.status.recorded'),
      publishing: t('accessInteraction.status.publishing'),
      effective: t('accessInteraction.status.effective'),
      revoked: t('accessInteraction.status.revoked'),
      expired: t('accessInteraction.status.expired'),
      failed: t('accessInteraction.status.failed'),
      requestable: t('accessInteraction.status.requestable'),
      pending: t('accessInteraction.status.pending'),
      approved: t('accessInteraction.status.approved'),
      provisioning: t('accessInteraction.status.provisioning'),
      rejected: t('accessInteraction.status.rejected'),
      cancelled: t('accessInteraction.status.cancelled'),
    },
  }))
}
