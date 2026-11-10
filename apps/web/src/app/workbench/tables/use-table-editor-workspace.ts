import { onActivated, ref } from 'vue'
import { useWorkspaceEditorNavigation } from '../../router/application-navigation'

/** A closed session can be reopened if its return navigation was superseded. */
export function useTableEditorWorkspace(hasUnsavedChanges: () => boolean) {
  const navigation = useWorkspaceEditorNavigation(hasUnsavedChanges)
  const editorRevision = ref(0)
  let reopenOnActivation = false
  async function closeEditor(): Promise<void> {
    if (hasUnsavedChanges()) return
    reopenOnActivation = true
    await navigation.close({ name: 'component-combination-page' })
  }
  onActivated(() => {
    if (reopenOnActivation) {
      editorRevision.value++
      reopenOnActivation = false
    }
  })
  return { closeEditor, editorRevision }
}
