# 配置式表单

`UiForm`、`useUiForm` 与 `parseUiFormSchema` 从 `@platform/ui` 导入。侧栏「组件展示 → 表单控件」按基础配置、只读详情、字段联动、分组与重复、校验与修正、自定义扩展展示能力，入口为 `/components/forms/basics`；原「输入组件」页 `/components/inputs` 保留综合示例。组件使用现有 `UiProvider`、Naive UI 与 PAVP tokens，不包含请求地址、业务保存或表格状态。

## 同一种配置

前端用 `as const satisfies UiFormSchema` 编写配置；后端返回同样的 JSON，先交给 `parseUiFormSchema(payload)`。`useUiForm` 也会验证并复制配置；一个控制器的 schema 固定不变，换配置需由应用重建控制器。配置不接受函数、HTML、任意组件属性、脚本表达式或未知属性。

前端类型按 kind 区分默认值、选项和校验规则，例如 number 不接受字符串默认值、select 必须提供 options、text 不接受数字范围规则。日期是否真实存在、数值是否有限、上下限顺序等仍由同一个运行时解析器检查。

```ts
const schema = {
  columns: 2,
  fields: [
    { kind: 'text', name: 'name', label: '名称', required: true },
    { kind: 'switch', name: 'hasContact', label: '填写联系人' },
    {
      kind: 'group',
      name: 'address',
      label: '地址',
      fields: [{ kind: 'text', name: 'city', label: '城市' }],
    },
    {
      kind: 'repeat',
      name: 'contacts',
      label: '联系人',
      maxItems: 5,
      hidden: { field: 'hasContact', operator: 'eq', value: false },
      fields: [
        { kind: 'text', name: 'name', label: '姓名', required: true },
        { kind: 'text', name: 'email', label: '邮箱', rules: { format: 'email' } },
      ],
    },
  ],
} as const satisfies UiFormSchema
```

字段类型为 `text`、`textarea`、`number`、`switch`、`date`、`date-range`、`time`、`select`、`multi-select`、`radio`、`checkbox-group`、`custom`。日期保存为 `YYYY-MM-DD` 或 `null`。日期范围保存为升序的两个日期 `[start, end]` 或 `null`；时间为 `HH:mm:ss` 或 `null`，不包含时区转换。单选组使用单个选项身份，复选组使用身份数组，均复用静态、异步与分页选项来源。选项身份保留字符串/数字类型，显示 label。`group` 对应对象，`repeat` 对应对象数组，允许继续嵌套。字段名是本层键，不含点或方括号；调用接口时使用 `address.city`、`contacts.0.email` 路径。

文本、数字、日期和选择控件使用配置的 placeholder，并经过 translate。两列布局中，普通字段默认占一列，group/repeat 默认占满；所有节点可用 span: 1 或 span: 2 指定宽度，窄屏自动回到单列。

缺少值时补 `defaultValue`，或按字段类型补空字符串、false、空数组、null。缺少的重复组补足 `minItems`，明确传入的数组保持原样，数量不足或超出由校验报告。未知值键及不匹配的类型会被拒绝。非有限数字、非 JSON 对象、循环、保留原型键也会拒绝。配置最多 1000 个节点；单个重复组配置上限 1000 行，按 schema 展开的规范化模型最多 10000 个节点，JSON 深度最多 32；10000 节点预算不统计 custom 对象内部的每个成员。请求体字节大小、custom 值体积、数据源响应大小仍由应用限制。

## 值类型与输入边界

`useUiForm` 按 schema 的字段类型推导返回值，而不是把初始快照的类型当作后续所有值的保证。静态 schema 用 `as const satisfies UiFormSchema` 保留字段名：文本为 string，数字为 number | null，日期为 string | null，单选为 string | number | null，多选为 (string | number)[]，开关为 boolean，custom 为 UiFormValue；group/repeat 保留对应的嵌套对象/数组结构。即使初始数字不为空、字段 required 为 true，编辑中仍可为空，提交回调需要按实际类型处理。

`UiFormSchemaValues<typeof schema>` 可复用推导的值类型。`useUiForm` 的显式泛型表示 schema 类型，不再接受独立声明的输出模型。后端 JSON 或未保留字段名的动态配置返回 UiFormRecord，调用方在使用字段前做类型收窄。initial.values 是待规范化的输入边界，运行时继续验证类型、补齐默认值并拒绝未知字段，允许省略嵌套默认值。

表格的查询与编辑复用同一个来源契约：`useUiTableQuery(table, copy, sources)` 或 `useUiTableForm({ table, transport, copy, sources })`。sources 只由可信前端提供，不放进 JSON schema；完整列表与分页来源都可复用。

## 创建与使用

```ts
const form = useUiForm({
  formId: 'profile-editor',
  schema,
  initial: { draftId: 'record-42', values: currentRecord },
  copy: formCopy, // 完整本地化文案接口，示例见 ConfiguredFormSpecimen.vue
  onChange: ({ changed, values }) => {
    /* 已接受的变更；changed 是具体路径 */
  },
  onBlur: ({ field, values }) => {
    /* 字段离焦 */
  },
  onReset: (values) => {
    /* 恢复最近接受的快照 */
  },
  onSubmit: async (values, { signal }) => {
    await saveRecord(values, signal) // 请求和业务处理留在应用层
    return { status: 'success' }
  },
})
```

模板使用 `<UiForm :form="form" />`；`mode="detail"` 显示文本、选项标签及分组，不渲染禁用输入框或编辑/提交操作。异步选项仍显示加载/失败说明与安全重试入口；保留原值，成功后显示对应标签。完整列表中找不到的值，或分页来源经 resolve 明确标记 missing 的值，保留原始 ID 并提示检查；单个查询页未包含某值不表示失效。字段 `readonly` 也使用详情展示。全表 detail 是呈现选择，程序化接口仍可回填值；它不是服务端权限控制，hidden/readonly 也不能替代服务端授权。

- `getValues()` / `getValue(path)` 返回独立副本，读取不会泄露可变草稿。
- `getInitial()` 返回当前接受的 `{ draftId, values }` 独立副本；它与当前输入分别保存，可用于应用草稿恢复而不另建重置基准。
- `nodeLabel(path)` 返回具体配置节点的可读名称，包含祖先分组与重复行序号；未知路径抛出 TypeError。`canFocusField(path)` 检查该字段或分组是否有当前已挂载、未隐藏或禁用的焦点目标，`focusField(path)` 调用该目标并返回是否成功。它们复用表单摘要的同一份节点与焦点状态，不触发校验或错误晃动；只读叶字段通常没有编辑目标，分组标题仍可作为定位目标。
- `setValue(path, value)` 更新字段或整个组；`setValues(patch)` **浅合并根键**，传入的嵌套对象/数组替换该组，未提供的子字段再按默认值补齐。
- `replaceValues(values)` **完整替换当前值**，缺少字段回到 schema 默认值，并清理临时输入、旧校验和行身份；不改变 reset 基准。恢复已验证的草稿时，可先 `replaceInitial(savedInitial)`，再 `replaceValues(savedValues)`，从而保留草稿的修改状态。
- `addItem(path)` 在末尾追加 schema 默认行；`insertItem(path, index)` 在指定位置前插入默认行，index 必须是 0 到当前行数之间的整数，空数组支持 0，行数位置表示末尾。它们不接受自定义行数据。
- `duplicateItem(path, index)` 深复制指定行的规范化 JSON 值，紧接源行之后插入；根行与嵌套行都有新身份，不复制触达、错误、临时输入、焦点或提交注册。源行及其后代仍有 pending 输入时返回 blocked；其他行的 pending 输入不阻止复制。复制保留业务 ID，应用自行决定业务 ID 的重建规则。已经展示的校验仍会按新值重新检查，新行可能产生自己的错误。
- `removeItem(path, index)`、`moveItem(path, from, to)` 沿用已有行身份。插入、复制、移动和删除时，存活行的错误、触达、嵌套身份、焦点/提交注册与原始输入缓冲随行迁移；捕获旧路径的选项请求会取消，并按当前可见性与依赖恢复。整组数组替换会重建行身份与对应错误状态。
- 所有行操作检查 hidden、readonly、disabled、提交与销毁状态，以及适用的数量限制。删除/复制/移动的源索引和移动目标必须是有效行整数索引；无效索引或数量限制返回 blocked，同位置移动返回 unchanged。行操作发布期间的同步重入编辑返回 busy；reset、replaceInitial 和 dispose 仍可终止旧操作。行操作不改变 reset 基准；仅改变同值行顺序时仍更新身份和 revision，但不触发值变化 onChange。行校验使用独立的 validateItem 接口。
- `validateItem(path, index)` 校验现有 repeat 行及其子树，例如 `validateItem('contacts', 0)`。仅提交该子树中可编辑控件的当前输入，行外 pending 输入不会被提交或阻止本次检查。仅该行的已配置字段、group 和嵌套 repeat 被标记触达并更新 schema/自定义/输入反馈，无关的行外反馈和触达保持不变；祖先集合或整表的服务端/输入错误仍在对应被拒绝值改变后过期，成功加载的旧选项错误也会清理；不打开整表错误显示。父 repeat 自身的数量规则不在该行范围内。
- 行校验复用 `validation(values, { signal })`，回调仍读取整表的规范化快照；只发布明确指向所选行内**已配置路径**的错误。`contacts.0` 不是配置节点，null、未知路径和行外错误不由行校验发布，应使用整表 validate/submit 检查。返回 valid 仅表示该行范围通过，不保证整表或尚未提交的行外输入通过。回调抛错返回 invalid，使用已有 notice 的 validationUnavailable 文案，不伪造字段错误；之后成功执行行校验会清除此提示。
- validateItem 返回 valid / invalid / blocked / busy / cancelled。未知路径或非 repeat 路径抛 TypeError；无效整数索引及 hidden/disabled/readonly 集合返回 blocked；提交或同步行变更发布期间返回 busy；销毁或被新操作取代返回 cancelled。只读/禁用后代不提交输入，但其规范化值仍校验。同一行的进行中检查复用等待；另一行或整表显式检查取代旧检查。行外离焦启动通常的自动校验并取消进行中的行校验；行内离焦不另建检查。新输入、值/行身份变化、reset、替换或销毁使旧结果失效，即使回调忽略 signal 也不能落到其他行。行校验失败只定位、反馈该行内可定位的错误。
- `reset()` 恢复最近接受的快照；`replaceInitial({ draftId, values })` 切换 CRUD 编辑记录并清理旧校验、选项请求和临时输入状态。
- `validate()` 先通过已注册的 `setCommitTarget` 检查当前控件输入，再返回 valid / invalid / cancelled；未完成的数字、日期或组合输入保留原文并报告 inputIncomplete，不会接受旧模型值为已通过。有未完成输入时不执行 validation 回调，会保留此前的自定义校验反馈并重新检查其余字段的 schema；未完成字段不重复报告基于旧规范化值的 schema 错误。它不提交、不改变 reset 基准；离焦和数据变化触发的自动校验不调用提交目标。`submit()` 返回 success / invalid / failure / cancelled。同一提交过程只会运行一次。提交遇到未完成输入也会保留此前自定义反馈、检查其他字段的当前 schema，不执行 validation 或 onSubmit；再次提交仍清除上一轮服务端错误。
- `values`、`dirty`、`touched`、`issues`、`phase`、`submitting` 为只读响应式状态。
- `dirty` 只比较规范化值与已接受基准；`dirtyFields` 列出变化的具体叶字段和重复集合路径。字段 binding 也提供 `dirty`。
- `pendingFields`、`hasPendingInput` 包含尚未写入规范化值的数字、日期、文字合成和已报告的 custom 输入；`hasUnsavedChanges` 合并 dirty 与 pending。离开或覆盖提醒应观察后者，不能仅观察 dirty。`revision` 在值、基准或临时输入改变时递增，应用可据此拒绝异步确认期间继续编辑后已过期的决定。

## 异步回显与刷新

可信应用通过 `load(loader, { strategy })` 请求记录，loader 接收 `{ signal }` 并返回既有的 `{ draftId, values }` 快照。请求地址、响应验证、日期/业务值转换仍由应用完成，后端 schema 不包含回调或请求配置。

```ts
const outcome = await form.load(async ({ signal }) => ({
  draftId: recordId,
  values: await readAndAdaptRecord(recordId, signal),
}))
```

默认 `preserve-dirty`：同一记录只刷新未修改字段，按响应完成时的最新输入判断，包括请求期间输入的内容和未完成的 DOM 缓冲。组内普通字段分别合并；重复数组没有服务端行身份，只要集合或任一后代被修改/含缓冲，就完整保留该数组，不按索引拼接不同记录。最新服务器快照成为 reset 基准，保留的本地差异仍为 dirty。服务器值已等于当前输入时，该差异自然变为干净。

不同 draftId 且仍有未保存输入时返回 `blocked`，不改任何值或基准。应用完成确认后可显式使用 `{ strategy: 'replace' }`，其含义是丢弃响应完成时的所有本地修改和临时输入并接受完整快照。调用方应在确认期间核对 revision，并在需要时限制请求期间继续编辑。

`loadState` 为 idle / loading / ready / failed / blocked，独立于校验/提交 phase。load 返回 applied / failure / blocked / busy / cancelled；加载中仍可编辑，提交期间不能开始 load。新 load 取消旧等待；reset、replaceValues、replaceInitial、submit、dispose 取消未完成的 load。被取消的 loader 即使忽略 signal，旧结果也不会落地；失败或不兼容返回值不会覆盖当前数据。load 与 replaceInitial 均为回显，不触发编辑 onChange；数据和基准变化通过 values/revision/dirty 观察。

getValues 不包含未完成的原始输入。应用持久化需明确选择允许保存的字段、用户/记录范围、有效期及 schema 兼容规则；hasPendingInput 为 true 时不能声称所有屏幕输入均已保存。表单核心不写浏览器存储，也不自动弹离开确认。现有应用的 `app/forms/use-form-draft.ts` 提供字段白名单/排除、范围/有效期及基准兼容检查；支持显式选择叶字段、普通分组和重复组根节点。重复组按完整数组原子保存，包含嵌套数据和行顺序；不能按数字行号或通配路径分别保存。排除某个子项时会保守地排除包含它的整组，避免通过父节点泄露排除值。恢复前检查完整分组/行结构，字段值语义仍由表单核心验证。

应用可显式传入 `automatic: true` 与 `enabled: () => true`，在首次创建时恢复经过校验且基准匹配的本地草稿，并在一轮编辑结束后自动保存。普通数据仍须由调用方确认可保存的字段与范围，组件不会为所有表单默认开启持久化。当页面所有可编辑字段都纳入保存时，离开保护可使用 `form.hasPendingInput.value || draft.unsaved.value`，不必把已保存修改也当作可能丢失的数据；若只保存部分字段，仍须保护未纳入保存范围的修改。刷新或销毁前会补写完整快照；焦点、跨页签通知与 bfcache 返回只检查冲突，不把存储数据重放到正在编辑的表单。保存失败、冲突、过期或格式不兼容不会覆盖现有记录，也不会假报已保存。

表单能力各示例和输入控件页的综合表单均显式接入了自动恢复，按示例的稳定 formId 与 draftId 隔离，同一浏览器保留 7 天；嵌套页的整组对象、重复行顺序与空数组也会恢复。前端配置与 JSON 配置切换共用同一示例记录；校验页保留正确/错误数据填充，不再模拟切换业务记录。重置后的值同样会保存，恢复不会把用户修改变成 reset 基准。普通控件尚未提交的数字、日期和输入法缓冲仍不持久化，离开时继续保护；有此类缓冲时，其他已完成字段仍可保存。示例不存储校验反馈、请求状态或业务接口响应，也没有为真实业务表单默认开启存储。多业务记录必须由接入方提供明确的记录范围，不能沿用示例身份。

示例的「撤销上一步」由应用层保留最近 10 次已完成值更改，可逐步撤销重置、删行、载入样例与后续编辑；撤销通过 replaceValues 回填，保留 reset 基准，并由既有自动保存记录恢复后的值。历史由页面持有，编辑/阅读切换不清空；控制器、记录身份或接受基准改变，以及页面实例释放时清空，刷新后不会恢复历史。它只保存规范化值，不恢复原始输入、校验反馈、请求或行的运行时身份。示例重置、覆盖样例、撤销在存在未完成输入时暂不可用；内置重复行删除在该行或后代仍有未完成输入时不可用，避免丢失无法撤销的原始文字。核心程序化写入接口仍由调用方负责确认与恢复策略。

构建器自己的配置编辑草稿由应用自动保存、首次进入自动恢复，无需手动保存与恢复按钮。构建器可恢复已发出的属性文字及未完成的数字、日期缓冲，但不能恢复仍被输入法组合事件抑制、尚未发出更新的 DOM 文字。组合输入期间暂停保存，并维持离开提醒；组合结束后再恢复保存。重新载入历史组合标记时会提示核对文字，不把旧编辑值视为组合文字已保存。构建器的配置和已完成试填值保存在同一条记录，恢复时先由表单核心核对值与配置，匹配后一次恢复；旧的仅配置草稿仍兼容。重复组和值顺序也保留，reset 仍使用当前配置的默认值。试填区的原始输入缓冲不保存，仍受离开保护；配置与暂缓中的旧预览不一致时暂停写入，避免保存错配记录，预览同步后自动继续。JSON 配置导入、导出仍是独立操作，不包含用户试填数据。

构建器试填区若有未完成输入，会保留当前控制器及其原始缓冲，暂缓整个预览的 schema 切换；配置和 JSON 仍立即更新。补完输入并移出预览输入控件后，自动同步最新配置，无需应用操作；不会在补完首个有效字符时重建仍聚焦的控件并打断后续输入。暂缓期间使用旧预览的结构与规则，并禁用会卸载输入控件的详情切换；不会声称此时预览已实时同步。现有控制器 schema 不可变，因此这里不另建仅更新无关字段的并行配置机制。

成功提交接受提交快照作为新的 reset 基准；保存结果有规范化数据时返回 `{ status: 'success', initial: { draftId, values } }`。失败返回 `{ status: 'failure', message: () => '保存失败', issues }`，其中 `issues` 可省略。应用将服务端响应适配成 `readonly UiFormIssue[]`：

```ts
return {
  status: 'failure',
  message: () => '请检查保存时返回的问题',
  issues: [
    { field: 'name', message: () => '此名称已被使用' },
    { field: 'contacts.0.email', message: () => '此联系人邮箱重复' },
    { field: null, message: () => '无法归属到单个字段的说明' },
  ],
}
```

服务端只返回 JSON 数据，不能提供回调。以下是可信应用代码在校验响应结构、核对当前记录并映射具体字段路径之后的适配方式：

```ts
const issues: UiFormIssue[] = validatedResponse.errors.map((error) => ({
  field: error.field, // 已映射为 name、contacts.0.email 等当前路径，或 null
  message: () => error.message, // 服务端普通字符串由前端包成展示回调
}))
return { status: 'failure', message: () => '保存失败', issues }
```

错误进入可访问摘要；空控件用占位提示显示简短原因，已有内容不被覆盖，组路径可用于组级错误。自动错误反馈保留本表单内的当前焦点，避免离焦丢弃未完成的输入；用户仍可通过摘要或问题入口主动定位字段。显式 validate 或 submit 校验失败会通过目标所在的最近 UiScrollArea 定位首个可定位错误；已可见时不滚动，缺少此容器或遇到独立原生滚动边界时保留摘要入口。full 动效下，仅完成定位且进入有效可视区的对应字段轻晃一次；自动离焦/编辑校验不触发定位或晃动，group/repeat 不整组晃动。未知路径降为整表错误，不静默丢弃。服务端仍需独立校验与授权。字段路径必须按当前表单的具体路径映射；接口自己的错误结构、记录标识和文案翻译由应用处理，组件不解析任意服务端协议。失败不会更新重置基准。服务端字段/组错误持续保留，直到对应值改变；编辑无关字段、离焦或手动 validate 不会抹掉它。整表及未知路径错误在任一值改变后清理。再次 submit 会清除上一轮服务端错误并重新尝试保存；reset/replaceInitial 全部清理。已经显示的 schema 错误在编辑后同步重新计算；前端异步 validation 错误保留到新校验完成，避免等待期间错误闪失。省略 onSubmit 时只校验并接受本地快照，不会发出请求。reset、切换记录、销毁会取消等待并忽略旧结果，但不能保证已经发送的服务端写入被撤销。

## 声明式联动与校验

`hidden`、`disabled`、`readonly`、`required` 接受布尔值或条件；条件支持 eq、neq、in、empty、not-empty，以及 `{ all: [...] }`、`{ any: [...] }`、`{ not: ... }`。默认 field 路径相对整表；`scope: 'group'` 相对当前字段所属对象，因此重复组内的同名字段各自独立。引用必须指向已配置路径。

隐藏字段保留值，仍包含在输出中，但不参与校验；隐藏的异步选项不会请求，也不会阻止提交，重新显示时按当前依赖加载，依赖未变时可复用完整列表的成功缓存或当前已确认的选择证据。父组状态作用于所有后代。控件写入遵守隐藏/禁用/只读；应用的 setValue/setValues 可用于回填。disabled/readonly 不免除数据校验；禁用节点不会获得摘要焦点。配置校验支持 required、数字 min/max、长度 minLength/maxLength、email，以及规则 message。重复组使用 `minItems` / `maxItems` 检查行数，`copy.minItems(count)` / `copy.maxItems(count)` 提供本地化说明。显式回填空数组或超量数组仍保留原值，错误保留在组级可访问说明和带组标签的摘要中；点击摘要可定位空组。增删按钮限制只是交互保护，不能替代提交校验。`validation(values, { signal })` 可追加可信前端异步校验，返回 `{ field: 'contacts.0.email', message: () => '错误说明' }[]`。

## 可信前端扩展

单选与多选使用官方 Naive UI 普通列表渲染，以跟随自适应令牌尺寸。分页源每页最多 100 项，不累加已浏览页面；完整列表源仍由应用限制数据量。当前适配不提供虚拟化大列表性能保证。

选项使用同一种 JSON：静态数组或 `{ source: 'cities', dependsOn: [{ field: 'country', scope: 'group' }] }`。后端只能引用可信前端显式注册的 source 名称，不能提供 URL、代码或函数；继承属性不算注册。省略 dependsOn 时整份 canonical values 变化会重载，`[]` 表示无值依赖。提供者只能把已声明依赖当作可变输入；如果读取其他表单值，也应声明相应依赖。

`sources` 接受两种明确的可信来源，JSON 不需要增加传输模式：

- 完整列表函数：`sources.cities(values, { signal, field, group })` 返回 `Promise<readonly UiFormOption[]>`。仍在可见时加载完整列表，加载中或失败会阻止校验/提交；成员校验与 disabled 写入限制保持原行为。数组不会被当成一页或自动切片。
- 分页对象：`{ pageSize, query, resolve }`，类型为 `UiFormPagedOptionSource<I>`。pageSize 必须是 1–100 的整数，两个函数都必需。引用到的分页来源还要求 copy 提供 `previousOptionsPage()`、`nextOptionsPage()` 和 `optionsPage(page)`；无效定义或缺少文案在创建控制器时抛出 TypeError，不产生缺字按钮。未引用的注册不参与检查。注册函数、分页方法及页大小在创建时捕获，修改应用侧注册对象不会替换既有控制器的来源。方法保留原接收对象，业务数据仍可变化；核心不会冻结或改写调用方对象。

分页 `query(values, { signal, field, group, search, page, pageSize })` 返回 `{ items, hasNext }`。page 从 1 开始，公开的 `setOptionsPage(page)` 只接受相邻页，下一页需要当前成功结果明确的 hasNext。page 表示请求目标而非上次成功页：请求第 2 页失败时，第 2 页标签、空结果和重试目标保持一致，仍可回到相邻的第 1 页，不必被失败重试困住。搜索重置到第 1 页。核心不根据 items 长度推断下一页，不 trim 或改写 search。这里支持整数页协议，不原生支持只提供不透明 cursor 的服务；应用应接入可提供该整数页契约的服务，核心不会创建共享 cursor 状态或声称适配所有后端分页。

`resolve(values, { signal, field, group, selected })` 返回 `{ items, missing }`，按已选 ID 补取标签与当前存在性。请求的每个 ID 必须恰好出现在 items 或 missing 之一。遗漏、额外 ID、重复、交叉、null 或畸形结果都视为解析失败，不能把没返回的 ID 猜成不存在。字符串与数字身份严格区分，包括 `0`、`'0'`、`''`、`1` 和 `'1'`。解析请求采用唯一 ID 集，canonical values 不会被去重或改写；既有 normalization 仍拒绝重复 multi-select 输入。scalar `''` 的既有 required 空值语义不变。

### 查询与已选状态

分页字段的 `binding.options` 只代表当前查询页，`optionsState` 只代表该查询的 idle/loading/ready/failed；未打开的查询可保持 idle，不影响已有有效选择或空的可选字段。`optionQuery` 提供最后一次请求的 search、page、pageSize 和 hasNext，非分页字段为 null。

`selectedOptions` 按 canonical 值顺序提供 `{ value, option, status }`。它是已选值的只读证据与标签投影，不是另一份值源。option 为最后已知的选项或 null；status 为 idle/loading/ready/missing/failed，只有 ready 证实当前依赖范围内的有效性。旧标签可在重新确认时继续显示。详情、只读与编辑标签都使用这份证据，当前页中冲突或过期的标签不能覆盖已确认的标签。

- 控制器初始化只解析非空已选 ID，详情不下载未使用的查询页。
- 打开选择器后通过官方 inputProps.id 读取当前挂载搜索输入框的可见文字，交给 `searchOptions(search)`；关闭不发起新查询。正常关闭后文字会由 Naive 清空，快速重开时以实际仍可见的文字为准。失效的打开回调不查询。
- 连续搜索使用 200ms debounce；首次查询与翻页立即请求。菜单关闭后，已经启动的请求仍可完成并缓存。
- 搜索只是临时浏览输入，不进入 values、dirty 或 pendingFields，也不当作待提交的字段值。其他字段的未完成输入仍受原提交保护。
- 搜索失败、空页、翻页或某页缺少已选 ID，都不能证明已选值失效。已确认选择继续有效；空的非必填字段不因 query 失败而无法提交。
- resolve 的 missing 才表示明确失效。idle/loading/failed 表示尚不能确认，需等待或重试；不会偷偷清空值。
- 新增选择必须来自当前成功页且未 disabled；原有选择可跨页保留，可移除 missing 项或清空，而不丢掉其他选择。已存在的 disabled 项仍可作为数据保留。此增量写入规则只用于分页来源，不改变完整列表来源的写入规则。

`retryOptions('query')` 刷新已经请求过的当前页；`retryOptions('selection')` 重新确认已选 ID，包括 missing；无参数刷新两者，但不会仅为详情打开一个尚未查询的页面。详情只做 selection 恢复，不修改值。完整列表的无参 retry 仍重载完整集合。查询结果可以为尚未知的已选 ID 提供证据；已有 ready 证据不会被页标签覆盖，其他并发更新受每个 ID 的请求次序保护。

### 缓存与取消

每个控制器缓存最多 20 个成功查询页，保留 60 秒，按最近使用淘汰。缓存包含来源、逻辑字段身份、具体 field/group、依赖范围、search、page 和 pageSize；不会跨控制器、记录或重复行共享。失败与过期回复不缓存，显式 retry 绕过并失效当前字段的页面缓存。过期检查发生在访问时，没有后台刷新计时器。缓存命中沿用原始响应的证据次序，不会因为再次访问而覆盖更新的 missing 或标签解析结果。缓存淘汰不会清除当前值、当前展示或已选标签。当前页和当前已选证据不是“所有历史选择”的缓存；取消选择后释放不再需要的已选记录。

依赖变化保留 ID 与旧标签，重新确认其有效性；已开始浏览的查询保留搜索文字并回到第 1 页。隐藏会取消请求与 debounce，不启动新工作，保留 canonical 值并跳过校验；重新显示按当前依赖解析标签，打开菜单才恢复查询。重复行移动按稳定行身份搬迁展示，捕获旧路径的请求必须取消，路径相关证据与缓存重新确认。复制行不继承请求或缓存。

reset、replaceInitial、replaceValues、删除所属行与 dispose 释放相应请求、计时器和缓存。每次发布都检查控制器、字段 owner、依赖范围与请求身份，即使来源忽略 AbortSignal，也不能用旧结果覆盖新状态。resolve 结果完整验证后一次发布，不先应用部分标签再报错。取消不能保证已经发送的业务请求在服务端撤销。真实传输、业务合法性校验与保存仍由应用负责。

`field` 插槽提供 custom 字段编辑器，`detail` 插槽可提供自定义详情展示；插槽得到字段 binding（value、setValue、blur 等），不执行 JSON 中的代码。自定义控件应绑定焦点目标，并用 setCommitTarget 注册显式 validate 和 submit 前的临时输入提交函数。有独立输入缓冲的控件必须在每次未提交输入时调用 `setPendingInput(true)`，包括已处于 pending 时的再次编辑，并在提交、撤销或卸载时调用 false；binding.pendingInput 可读取状态。仍为 pending 的可编辑字段会阻止显式校验/提交，未注册提交目标也不接受旧值。任意插槽的内部缓冲无法自动推断，只有履行此契约的控件才享有刷新和离开保护。

配置文本可直接用文案，也可用前端识别的消息键，再提供 `translate(text)`。翻译只发生在展示侧，切换语言不重建草稿。变更/离焦/重置回调是观察事件，不应用回调返回值修改状态；如需额外联动写值，在应用中观察状态并调用公开写入接口。观察回调抛错会传给调用方，已经接受的数据变更不会回滚。

## 边界

演示中的 JSON 模式是本地序列化往返，选项来源是本地函数；示例只校验当前输入，不调用保存接口，也不表示已连接后端。后端需输出受支持的 schema，或由应用先适配为该契约；选项源、错误路径和保存结果都由可信前端映射。表单不会自动创建 API、表格、权限、文件上传、草稿持久化、可视化配置设计器或任意表达式引擎。表格 CRUD 应在应用层组合记录选择、请求、replaceInitial 与 submit；上传等专门控件通过可信插槽接入。

可视化构建页 `/components/forms/builder` 是应用层的配置消费示例：通过可视操作生成同一份 `UiFormSchema`，使用公开解析与表单接口预览并导出 JSON。它不新增共享核心的设计器 API，也不改变配置的数据边界。
