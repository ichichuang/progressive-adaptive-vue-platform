import { createApplicationBuildConfig } from './vite.config'
import { administrationModules } from './src/app/administration/administration-routes'

export default createApplicationBuildConfig(administrationModules)
