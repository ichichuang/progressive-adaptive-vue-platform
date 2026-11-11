# UiChartTimeRange

`UiChartTimeRange` 是不依赖 G2 的受控时间范围导航器。它显示全量数据的缩略趋势，以整数采样索引选择区间；业务时间、数据筛选和图表更新由消费方负责。主题、密度、字号和动效使用现有 PAVP 语义，不复制外观配置。

## 接口

从 `@platform/ui` 导入 `UiChartTimeRange` 与 `UiChartTimeRangeValue`。

- `value: UiChartTimeRangeValue`：只读 `[start, end]`，两端均包含，至少相隔一个采样索引。
- `min`、`max`：有限整数边界，`max > min`。范围计算会取整并限制在边界内。
- `overview: readonly number[]`：全量缩略趋势，各项均匀覆盖 `min` 到 `max`。无须传入图表实例或业务日期；空数组显示空轨道。
- `formatValue(index): string`：把采样索引转换为当前语言的日期/时间或其他标签。
- `label`、`startLabel`、`endLabel`、`helpText`：由应用提供本地化名称和操作说明。
- `update:value`：返回新的 `[number, number]`。组件不持有独立的业务范围状态。
- `start` / `end`：指针或滚轮连续操作开始/结束，可用于在操作时即时重绘，结束后恢复图表过渡。键盘单步直接触发 `update:value`。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { UiChartTimeRange, type UiChartTimeRangeValue } from '@platform/ui'

const range = ref<UiChartTimeRangeValue>([6, 18])
const overview = [
  12, 18, 20, 17, 24, 29, 34, 28, 30, 36, 40, 37, 44, 39, 36, 42, 47, 50, 43, 39, 35, 30, 25, 20,
]
const formatHour = (index: number): string => `${String(index).padStart(2, '0')}:00`
</script>

<template>
  <UiChartTimeRange
    v-model:value="range"
    :min="0"
    :max="23"
    :overview="overview"
    :format-value="formatHour"
    label="时间范围"
    start-label="开始时间"
    end-label="结束时间"
    help-text="拖动两端调整范围，拖动选区平移；聚焦后滚轮缩放，Shift + 滚轮平移。"
  />
</template>
```

## 交互与生命周期

- 拖动双端调整边界，拖动选区平移，点击未选区域居中窗口。使用 Pointer Events 和指针捕获，支持鼠标、触屏和触笔；Esc / pointercancel 恢复操作前范围。
- 手柄支持方向键、PageUp / PageDown、Home / End。轨道本身可聚焦，用同样按键平移窗口。可访问名称、当前值和格式化值随范围更新，控件不依赖颜色提示。
- 聚焦时间轴后滚轮以鼠标位置为中心缩放；Shift + 滚轮平移。Alt + 滚轮可直接操作。Ctrl / Meta 组合留给浏览器，未聚焦时保留页面滚动。小幅触控板增量会累计，不会卡在最小窗口。
- `full` 的间接范围变化使用两倍系统时长；直接拖动、`reduced`、`none` 不做位置补间。缩略选区、裁剪区域和手柄同步。
- 失活或卸载会结束手势并释放 ResizeObserver、滚轮监听器和计时器。业务范围由消费方保存；组件不写存储，不发起请求。

## 与图表联动

使用同一份 `value` 同时驱动时间轴、精确输入和图表域。图表区域若也需要滚轮操作，可复用公开纯函数 `normalizeUiChartTimeRange`、`panUiChartTimeRange`、`zoomUiChartTimeRange`，避免另写范围算法。缩放函数的 `factor < 1` 为放大，`anchor` 是相对当前窗口的归一化鼠标锚点（窗口内为 0 到 1，缩略轨道的鼠标可位于窗口外）；所有函数返回新的元组，不修改调用方输入；无效边界或非有限输入抛出 RangeError。鼠标位置变化时重新锚定当前窗口，不继续沿用旧位置；整数采样取整误差最多半个采样，边界钳制时优先保持合法范围。

工作台交互图表提供完整例子：拖动时保持纵轴稳定、即时跟随横轴，结束后平滑调整纵轴；框选仅把选区回传到同一范围，不让图表内部过滤器成为第二份状态。独立控件在“组件展示 → 选择”中可操作和查看接口。
