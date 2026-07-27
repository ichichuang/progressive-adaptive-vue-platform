function location(contents: string, index: number): string {
  const prefix = contents.slice(0, index)
  const line = prefix.split('\n').length
  const lastNewline = prefix.lastIndexOf('\n')
  const column = index - lastNewline

  return `${String(line)}:${String(column)}`
}

export function parseJsonSource(contents: string, sourcePath: string): unknown {
  let index = 0

  function fail(message: string, at = index): never {
    throw new Error(`${sourcePath}:${location(contents, at)} ${message}`)
  }

  function skipWhitespace(): void {
    while (/\s/u.test(contents[index] ?? '')) {
      index += 1
    }
  }

  function parseString(): string {
    const start = index

    if (contents[index] !== '"') {
      fail('Expected a JSON string.')
    }

    index += 1

    while (index < contents.length) {
      const character = contents[index]

      if (character === '"') {
        index += 1

        try {
          const parsed = JSON.parse(contents.slice(start, index)) as unknown

          if (typeof parsed !== 'string') {
            fail('Expected a JSON string.', start)
          }

          return parsed
        } catch {
          fail('Invalid JSON string escape sequence.', start)
        }
      }

      if (character === '\\') {
        index += 2
      } else {
        index += 1
      }
    }

    fail('Unterminated JSON string.', start)
  }

  function parseNumber(): number {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(contents.slice(index))

    if (match === null) {
      fail('Invalid JSON number.')
    }

    index += match[0].length
    const value = Number(match[0])

    if (!Number.isFinite(value)) {
      fail('JSON numbers must be finite.', index - match[0].length)
    }

    return value
  }

  function parseLiteral(literal: string, value: boolean | null): boolean | null {
    if (!contents.startsWith(literal, index)) {
      fail(`Expected "${literal}".`)
    }

    index += literal.length
    return value
  }

  function parseArray(path: string[]): unknown[] {
    const values: unknown[] = []
    index += 1
    skipWhitespace()

    if (contents[index] === ']') {
      index += 1
      return values
    }

    while (index < contents.length) {
      values.push(parseValue([...path, String(values.length)]))
      skipWhitespace()

      if (contents[index] === ']') {
        index += 1
        return values
      }

      if (contents[index] !== ',') {
        fail('Expected "," or "]" in JSON array.')
      }

      index += 1
      skipWhitespace()
    }

    fail('Unterminated JSON array.')
  }

  function parseObject(path: string[]): Record<string, unknown> {
    const value: Record<string, unknown> = {}
    const keys = new Set<string>()
    index += 1
    skipWhitespace()

    if (contents[index] === '}') {
      index += 1
      return value
    }

    while (index < contents.length) {
      const keyStart = index
      const key = parseString()

      if (keys.has(key)) {
        fail(`Duplicate JSON object key "${[...path, key].join('.')}".`, keyStart)
      }

      keys.add(key)
      skipWhitespace()

      if (contents[index] !== ':') {
        fail('Expected ":" after JSON object key.')
      }

      index += 1
      value[key] = parseValue([...path, key])
      skipWhitespace()

      if (contents[index] === '}') {
        index += 1
        return value
      }

      if (contents[index] !== ',') {
        fail('Expected "," or "}" in JSON object.')
      }

      index += 1
      skipWhitespace()
    }

    fail('Unterminated JSON object.')
  }

  function parseValue(path: string[]): unknown {
    skipWhitespace()
    const character = contents[index]

    if (character === '{') {
      return parseObject(path)
    }

    if (character === '[') {
      return parseArray(path)
    }

    if (character === '"') {
      return parseString()
    }

    if (character === '-' || (character !== undefined && /\d/u.test(character))) {
      return parseNumber()
    }

    if (character === 't') {
      return parseLiteral('true', true)
    }

    if (character === 'f') {
      return parseLiteral('false', false)
    }

    if (character === 'n') {
      return parseLiteral('null', null)
    }

    fail('Expected a JSON value.')
  }

  const value = parseValue([])
  skipWhitespace()

  if (index !== contents.length) {
    fail('Unexpected content after the JSON value.')
  }

  return value
}
