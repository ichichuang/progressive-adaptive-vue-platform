# API 请求、批量与流式消费

公共入口为 `shared/api/index.ts`。`createApiClient` 统一拥有请求发送、授权注入、
取消、协议检查和 schema 校验。业务调用方不需要另一套 HTTP 客户端。

## 原有 request

`client.request(endpoint, { signal, query, headers, body })` 保留现有 `ApiResult`：
`success` 表示响应完成且通过 schema，`accepted` 表示 HTTP 202 已受理，
`failure` 携带安全的分类信息。202 不代表业务完成。每次调用只发送一次，
没有自动重试、轮询或重连。取消只能结束客户端等待，不会撤销服务端已发生的操作。

endpoint 的 method、path、authentication、response schema 和 policy 在执行前快照。
配置地址、路径约束、`credentials`、`redirect: 'error'`、`cache: 'no-store'`
和 `referrerPolicy: 'no-referrer'` 仍由客户端维护。

## 请求与响应钩子

客户端和单次请求均支持 `hooks`，每一阶段按客户端、单次请求的顺序执行。
钩子既可同步返回，也可异步返回。引用在调用开始时捕获，不做运行中的全局注册。

```ts
const client = createApiClient({
  configuration,
  hooks: {
    beforeRequest(parameters, context) {
      context.signal.throwIfAborted()
      const headers = new Headers(parameters.headers)
      headers.set('x-client-request-id', context.requestId)
      return { ...parameters, headers }
    },
    transformResponse(value, context) {
      if (context.responseKind !== 'success') return value
      return envelopeSchema.parse(value).payload
    },
  },
})
```

- `beforeRequest` 接收并返回 `{ query?, headers?, body? }`。它可以修改参数、普通头和请求体，
  不接收授权后的头，也不能改变目标地址、方法、认证策略或取消信号。
- 原始输入及每次钩子返回值均重新校验。输入和返回值中的 query 数组、Headers、JSON、
  FormData、URLSearchParams、ArrayBuffer 会复制，避免 await 后改变已捕获的请求。
- 凭证仍使用 `authorize` 注入。普通头不能携带 Authorization、Cookie、
  Proxy-Authorization、X-API-Key 或 X-CSRF-Token。钩子不能绕过该边界。
- `transformResponse` 接收协议检查、解码之后的 `unknown`，返回值再经过 endpoint schema。
  上下文包含 `responseKind: 'success' | 'error' | 'event'` 和 HTTP 状态。
  错误体仅在声明了 `errorSchema` 时解析和转换，仍然返回失败，不转成成功。
- 不提供原始 Response，避免钩子提前消耗响应体。schema 自身的 Zod transform 仍可正常使用。
- 钩子抛错分类为 `hook`；钩子产生非法请求分类为 `request`；转换后校验失败为 `schema`。
  取消或超时优先于上述分类。迟到的异步结果不会交付，但用户代码应遵守 context.signal，
  因为取消不能强制停止已经运行的任意 JavaScript 副作用。

## 客户端批量调度

```ts
const results = await client.batch(
  [
    { endpoint: firstEndpoint, input: { query: { page: 1 } } },
    { endpoint: secondEndpoint, input: { signal: itemController.signal } },
  ] as const,
  { signal: groupController.signal, concurrency: 2 },
)
```

每项仍是一笔独立 HTTP 请求，复用 request 的授权、钩子、校验和取消流程。
这不是服务端 batch、事务或原子操作，不会发明 `/batch` 地址。

- 默认并发为 4，可指定正安全整数；非法并发返回逐项 `request` 失败且不发送。
- 返回数组顺序与输入一致，保留 tuple 的逐项数据类型。每项独立返回 success、accepted 或 failure，
  一项失败不丢弃其他结果，不自动重试。
- 批次开始时快照所有 endpoint 和输入，包括尚在排队的项。每项的请求超时从实际启动计时。
- 组 signal 取消全部未完成项，排队项不进入钩子、授权和发送。单项 signal 只取消该项。
  已完成结果保留；所有项形成终态后 batch Promise 才完成。
- 调用方负责限制业务批次数量和保留结果的大小，客户端不会默默丢弃结果。

## SSE 与 NDJSON

```ts
const streamEndpoint = {
  id: 'example.events',
  method: 'GET',
  path: ['events'],
  authentication: 'anonymous',
  policy: 'stream',
  response: {
    mode: 'sse',
    mimeTypes: ['text/event-stream'],
    schema: z.string(),
  },
} as const satisfies ApiStreamEndpoint<string>

const result = await client.stream(streamEndpoint, {
  signal: controller.signal,
  async onEvent(event, context) {
    context.signal.throwIfAborted()
    await displayEvent(event.data)
  },
})
```

`stream` 与普通请求共享发送与授权入口，不把未消费的 ReadableStream 冒充已完成结果。
返回 `ApiResult<{ eventCount: number }>`。只有正常 EOF、全部回调完成后才成功；HTTP 202
仍返回 accepted。之前已交付的数据不意味着最终成功，取消或后续错误不撤回已交付的数据。

- `onEvent` 接收 `{ data, index, event?, id? }`，index 从 0 开始。逐项 transform、schema、
  回调均被 await，形成背压，不在库内积累完整事件历史。调用方应为显示日志设置自己的长度上限。
- SSE 仅接受声明的 `text/event-stream`；schema 输入是 data 字符串，不自动当 JSON。
  支持 UTF-8 跨字节分块、首 BOM、CRLF/CR/LF、跨块换行、多行 data、注释和空 data。
  空行才交付事件，EOF 丢弃尚未由空行结束的事件。事件名默认 message，id 在事件间保留，
  含 NULL 的 id 忽略。未知字段和 retry 忽略，不自动重连。[DONE] 是服务自定义内容，不是传输终止符。
- NDJSON 接受声明的 `application/x-ndjson` 或 `application/ndjson`；schema 输入是每行 JSON 值。
  支持 LF、CRLF、跨块 Unicode、空白行忽略、EOF 处没有换行的完整末行。单独 CR、非法 JSON、
  非法 UTF-8 返回 parse。多个同块事件也逐一处理。
- 每个事件都通过 schema；格式问题为 parse，schema 失败为 schema，onEvent 抛错为 consumer。
  网络中断为 network；HTTP 错误沿用 errorSchema；MIME/大小违反约束为 protocol。
  reader 在失败/取消后 cancel 并释放锁，定时器与取消监听器清理；忽略取消而迟到的 fetch body 也关闭。
- 暂停的钩子、schema、回调或网络读取都可被 signal/总期限中断。不会取消第三方回调已经产生的副作用。

## 有限资源策略

策略唯一定义位于 `policies.ts`，实际按 endpoint.policy 选取。默认值：

| 策略     | 总期限 | 总响应字节 | 连接/等待网络空闲 | 单事件字节 |
| -------- | ------ | ---------- | ----------------- | ---------- |
| standard | 10 秒  | 1 MiB      | 不单列            | 不适用     |
| stream   | 120 秒 | 16 MiB     | 30 秒             | 1 MiB      |

stream 总期限包括钩子、授权、连接、消费回调及读取；空闲期限只在等待 fetch 响应头和下一块网络数据时计时，
不把慢 schema/回调当作网络空闲。SSE 单事件限制包含从上次空行起的 data/metadata/comment 字节，
NDJSON 限制针对一行。超过任一字节限制立即结束，不会无限缓存未终结帧。

客户端可明确覆盖这些有限策略，例如长时间任务扩大总期限；所有值必须是正安全整数，
计时值不超过平台 setTimeout 上限 2,147,483,647。非法覆盖导致 configuration 失败、不发送请求。

```ts
const client = createApiClient({
  configuration,
  policies: {
    stream: { timeoutMilliseconds: 300_000, maximumResponseBytes: 32 * 1024 * 1024 },
  },
})
```

本模块没有新增缓存、认证系统、自动重连、重放或服务端协议。读查询去重与缓存仍由现有 shared/query 负责。
EOF 仅表示本次传输结束；业务任务完成与否仍由服务契约判断。
