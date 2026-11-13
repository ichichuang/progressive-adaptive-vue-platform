# UiG2Chart

`UiG2Chart` 是 `@platform/ui` 的 G2 5.4.8 Vue 适配器。图形和数据使用原生 G2 Spec，外观来源仍是 PAVP Design System；不维护另一份主题或尺寸配置。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { UiG2Chart, type UiG2ChartOptions } from '@platform/ui'

const options = shallowRef<UiG2ChartOptions>({
  type: 'interval',
  data: [
    { category: 'A', value: 12 },
    { category: 'B', value: 24 },
  ],
  encode: { x: 'category', y: 'value', key: 'category' },
  animate: { enter: { type: 'growInY' } },
})
</script>

<template>
  <!-- Place inside the application's existing UiProvider and a bounded height layout. -->
  <UiG2Chart
    :options="options"
    label="A 为 12，B 为 24 的分类比较"
  />
</template>
```

## 接口与布局

- 必填 `options: UiG2ChartOptions` 是原生 `G2Spec` 类型；必填 `label: string` 是图表可访问名称。图表在已有 `UiProvider` 下使用。
- `rendered` 表示当前最新配置完成绘制；`error` 携带 `Error`。过期任务不会发出成功或错误事件。监听 `error` 在消费方展示合适的失败提示，修正配置后可继续使用同一组件。
- 组件填满父容器，不定义独立固定高度。父级必须提供确定的可用高度，收缩链遵循 `min-height: 0 / min-width: 0`。根配置的 `width`、`height` 和 `autoFit` 由适配器接管，内部视图可保留自己的布局。
- 原生 HTML tooltip 默认挂载到 `UiProvider` 的 `#pavp-overlay-root` 内的组件独立视口浮层，图表容器不设置超出隐藏；不放宽工作区、卡片或滚动区的裁切。提示层保留主题和动效，按实时视口/图表位置翻转并在边缘收束，长标题和名称可换行；超出屏幕高度的内容局部滚动，需要交互内容时使用原生 `interaction.tooltip.enterable: true`。外层滚动时清除过期提示，视口变化时重新校验边界，重新悬停时使用最新位置。卸载/失活释放提示节点和监听。显式 `mount`、`bounding`、`position`、`render`、`enterable`、`css` 及关闭设置向子图继承；自行指定挂载点时，其外层裁切与定位由调用方负责。
- ResizeObserver 监听真实容器及排版测量，不依赖 window resize。零尺寸时延后绘制；重新可见、KeepAlive 激活后恢复。卸载/失活会释放 observer、帧任务和 G2 实例。
- 配置与数据变更自动更新，在绘制准备阶段帧合并，以最新配置为准；前一帧完成绘制后即可重新定向正在播放的过渡，不需要等旧动画结束。使用 G2 公开的 render/context 接口完整替换配置，不残留已删除的轴/样式。实例不暴露，避免绕过统一策略与生命周期。配置先复制，不让 G2 的标准化修改调用方的普通对象/数组。
- 容器尺寸变化时即时重排，避免旧像素几何在新画布边缘被裁切；后续数据更新与 hover 仍使用当前动效偏好。示例页主动切换“窄容器”时单独重播入场，保留当前数据、筛选与范围；普通窗口缩放不触发重播。
- 给数据项提供稳定的 `encode.key`，可获得 G2 原生的进入、更新、退出过渡。大数据推荐 `shallowRef` 并替换配置，减少 Vue 深层响应式开销。

## 统一外观与动效

- 默认颜色来自当前主题的语义色板，包括浅色/深色、增强对比度和已验证自定义主题。单色使用主题主色，分类色使用主题的独立八色 dataViz.categorical；数值颜色默认使用设计系统已有的连续色阶，跟随主题、浅深和对比度。轴、图例、标签、标题、tooltip、滑块和滚动条均有对应投影。
- 字体、字号、间距、线宽、圆角和时长由组件所在作用域的语义 UnoCSS 类解析成实际像素/毫秒，跟随字号；图表边距、图例行列间距和滑块尺寸另外使用现有控件高度/水平内边距响应 comfortable、compact、spacious 密度。Canvas 不直接接收无法解析的 CSS var/calc/rem。
- `options.theme` 是图表级显式覆写，递归合并到平台默认值并向下继承。开发者可用原生 `scale.color.range`、`scale.color.palette`、`scale.color.interpolator` 或 mark `style.fill/stroke` 自由定义单图配色；这些显式颜色优先于平台默认。消费者对显式覆写的可读性负责。不要为普通图表复制一份平台主题。
- `full` 保留 G2 原生高级动画和显式时长/缓动；图表默认入场、数据更新、退出分别使用系统时长的 5、4、2 倍，有限时间序列每帧为 8 倍。内置 200ms 基础时长对应 1000/800/400ms 及 1600ms 时间帧；只投影图表节奏，不修改全局控件时长。显式 theme、animate、编码时长仍优先，缓动沿用系统曲线。
- 普通笛卡尔柱图的原生标签随柱子的同一动画时长与曲线移动，纯数字标签同步插值；快速更新从显示中的位置与数值继续。标签默认使用正文大小，`top/left/right` 留出语义间距，显式标签排版仍优先。原生标签变换或自定义文字应由调用方确认布局。
- 普通 `theta` 扇区使用圆弧角度插值，保持共享边界与圆形轮廓；默认整图淡入。显式动画、编码动画、圆角/间隔/自定义形状保留原生行为。消费方仍负责选择状态，构成示例提供可键盘操作且更新后保留选择的图例。
- `reduced` 仅保留半系统时长的透明度进入/退出，更新不做空间插值，移除编码的动画延迟与时长；`none` 完全关闭图元过渡。轴/图例显式动画（含独立 `legends` 子组件的分页）与 hover scale/fisheye 也受约束。原生 HTML tooltip 的移动与 CSS 动画在 reduced/none 下关闭，即使 theme 或 interaction 显式配置动效也不能重新启用；full 下 tooltip 默认使用系统时长/缓动，仍允许显式定制。用户显式 `animate: false` 始终有效。
- `interaction.elementHighlight: true` 和共享 tooltip 趋势图提供平滑聚焦：其他图形淡化，曲线/非尺寸编码点的描边略增强，不改变坐标、半径或数值比例。full 使用 1.5 倍系统时长；reduced 只做半系统时长的透明度过渡；none 即时反馈。快速移动从当前透明度重新定向，离开恢复。显式原生交互对象、state、自定义交互或关闭选项保持调用方控制；无视觉副作用的自定义观察交互可同时显式声明 `elementHighlight: true` 来选择平台聚焦；原生数据动画期间先保留 tooltip，完成后再应用当前悬停，避免两种动画争夺同一图形属性。
- 动效偏好改变时立即退休旧实例，防止正在播放的空间动画继续。正在播放的有限时间序列遇到更新时快速结束旧序列并绘制最新配置，不排队等待旧播放周期。有限 `timingKeyframe` 在 reduced/none 按 direction/iterationCount 显示最终帧，不启动时间序列；无限序列拒绝并发出 error，避免长期占用渲染队列。分面回调生成的子图形也执行同一策略。
- reduced/none 下拒绝自定义 mark 函数，因为第三方函数可能自行创建动画，不能保证遵守用户偏好。需要扩展时，应先明确其无障碍与生命周期约束。

## 数据、可访问性与打包

- 使用应用已有 API/query 层取数后传入 data，不在图表配置中另建请求、缓存或鉴权。
- Canvas 内容带 `role="img"` 和名称，但这不等于可访问的数据表或键盘交互。重要数据应在图表外提供文本摘要/表格；不能把 tooltip 或颜色作为唯一信息来源。
- 不添加业务页面或全局注册；从 UI 公共入口按需导入。没有消费者时 G2 不进入现有应用首屏包。
- `pnpm check:chart` 验证配置隔离、外观映射、尺寸与动效策略，并纳入 `pnpm verify`。依赖声明兼容使用锁定版本的 `.d.ts` 补丁，保留 strict、exactOptionalPropertyTypes 和完整依赖类型检查。G2 5.4.8 的连续颜色推断另有最小兼容补丁：原生数值 color 推断支持适配器的 `theme.sequential` 默认色阶，并尊重显式 interpolator/palette；没有平台默认值时仍使用 G2 原生行为。补丁不重写数据转换、域推断或分类色逻辑。`growInX/growInY` 的最小生命周期补丁在动画完成或取消时释放自身创建的临时裁剪路径，并保留调用方裁剪，避免尺寸变化后继续使用旧位置裁切图元。AntV Component 的 Navigator 补丁只在翻页完成时归零播放容器和目标页的位置，修复 `navAnimate: false` 时页码更新但内容被裁切为空的问题；full 动画过程保持原样。

## 连续范围交互示例

工作台的滑块与框选示例共用共享 `UiChartTimeRange` 趋势缩略时间轴和一份范围状态，再映射到 `G2Spec.scale.x.domain`，提供 96 小时、双系列连续数据。时间轴支持双端缩放、整段平移、方向键 / PageUp / PageDown / Home / End，以及触屏指针捕获；Esc 取消拖动。聚焦图表或时间轴后滚轮缩放，Shift + 滚轮平移；Alt + 滚轮直接操作。未聚焦时保留页面滚动，Ctrl / Meta 组合保留浏览器缩放。框选使用原生 brushXHighlight 的域事件更新同一范围，不使用独立内部状态的 brushXFilter。拖动时关闭图形/坐标轴补间，保持最后确认的纵轴范围；释放或选择预设后平滑收束到当前范围的纵轴。这样把直接操控的跟手性与释放后的过渡分开，不用长动画追赶指针。原生 G2 slider/filter API 仍可使用，但它自己的过滤路径会关闭动画；适配器没有修改厂商内部实现。

## 图片导出与恢复视图

组件 ref 暴露 `UiG2ChartHandle.exportImage(): Promise<Blob>`，返回当前已就绪画布的 PNG。
保留渲染像素密度、当前可见数据、图形颜色与交互状态，并以当前主题面板色填充背景，避免深色图表导出后文字落在透明白底上。
导出不重新请求数据，不重启动画，不暴露 G2 实例；尚未就绪、正在更新或已经失活时拒绝。
调用方负责下载文件、按钮忙碌状态和失败反馈。外部标题、HTML tooltip、时间轴及操作区不属于画布图片。

“恢复视图”由消费方原有状态负责：范围图恢复完整范围，构成图恢复被隐藏分类，不重置已更新的数据。
没有可恢复筛选的图表不显示无意义的恢复按钮。工作台通过这些状态演示导出与恢复。

## 分类颜色与标签

默认分类色为当前主题的八个固定槽位，category10/category20 是 G2 的 API 字段名，不代表平台设计了十色或二十色。超过八类时原生 ordinal 映射会循环颜色，应使用分面、筛选、标签/形状或显式更长 range，不能仅依赖颜色区别。消费者应提供稳定的 scale.color.domain，以免筛选、排序后改变系列对应颜色；平台不猜测业务类别。显式 range/palette/interpolator 和 mark 颜色仍优先。

内置 inside/inner 标签无显式 fill 或 transform 时使用 G2 contrastReverse，按实际图形填充选择黑/白内容色，而不是借用主色按钮的配套文字。标签默认基于现有 text.primary；显式填充、变换及复杂透明叠加的可读性由消费者验证。

## 自动巡游

可选 `tour` 是纯 JSON：`targets` 为 `{ id, field, value }` 的数组，ID 必须非空且唯一，
field 按直接数据对象的自有字段严格匹配 string / finite number。相同字段值可聚焦多个系列的点。
`intervalMs` 默认 4000，最低 1000；`loop` 默认 true；`autoplay` 默认 false。
停留间隔与动画时长分开，过渡沿用全局动效配置。没有 tour 时不改变原图表交互。

支持单视图的 interval（柱形或 theta 环形）、point，以及 line/area 背景加 point 的组合。
只传 line 没有 point、分面、多视图、时间序列动画或自定义 focus/state 不属于当前合同，会发出 error，
不悄悄覆盖原交互。复杂 transform 后的目标字段需要消费方按实际展示数据显式提供；不存在或不可见的
目标不参与巡游。配置中不执行函数或脚本；请求仍由已有应用 API/query 层负责。

组件 handle 增加 `playTour()`、`pauseTour()`、`stopTour()`、`nextTour()`、`previousTour()`。
`tourChange` 提供 `UiChartTourState`（status / targetId / reason），不要从 tooltip DOM 反推状态。
暂停保留当前项；停止清除强调，下一次播放从首项开始；前后项转为手动暂停状态。
点击图元锁定该目标；悬停/键盘进入临时接管，离开后等待完整间隔继续，不抢用户操作。

后台文档、不可见容器、KeepAlive 停用、正在重新绘制时暂停；卸载清除 timer/observer/listener。
用户手动暂停不会因返回页面而恢复播放。数据更新/排序按目标 ID 维持当前项；该目标消失后选择下一个
有效位置，空数据不启动 timer，单项不创建循环 timer。减少/关闭动效时不自动轮播，仍支持手动前后项。
原生 hover 与自动巡游复用同一强调执行器，不重绘数据几何、不创建第二套颜色或动画时钟。
展示页 `/components/charts/tour` 提供柱图、双系列时间趋势和环形占比，文本摘要及固定操作区。
