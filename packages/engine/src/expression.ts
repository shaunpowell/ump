/**
 * expression.ts
 *
 * What it does: Resolves n8n template expressions in the format ={{ ... }} using
 *               a sandboxed Function constructor. Plain strings are returned unchanged.
 * Inputs:       A raw parameter string and an ExpressionContext providing $json,
 *               $binary, $input, and $ (upstream node accessor).
 * Outputs:      The evaluated value (unknown) — could be string, number, boolean,
 *               object, array, or undefined.
 * Edge cases:   Missing optional-chain values return undefined (not an error).
 *               Expressions that throw return undefined rather than propagating.
 *               Strings without ={{ are returned as-is without evaluation.
 */

export interface ExpressionContext {
  $json: Record<string, unknown>
  $binary?: Record<string, unknown>
  $input: {
    first: () => { json: Record<string, unknown> }
    all: () => Array<{ json: Record<string, unknown> }>
  }
  $: (name: string) => {
    first: () => { json: Record<string, unknown> }
    item: { json: Record<string, unknown> }
  }
}

const EXPRESSION_RE = /^=\{\{([\s\S]*)\}\}$/

export function resolveExpression(value: string, context: ExpressionContext): unknown {
  const match = EXPRESSION_RE.exec(value)
  if (match === null) {
    return value
  }

  const expression = match[1].trim()

  try {
    const fn = new Function(
      '$json',
      '$binary',
      '$input',
      '$',
      `return (${expression})`
    )
    return fn(
      context.$json,
      context.$binary ?? {},
      context.$input,
      context.$
    ) as unknown
  } catch {
    return undefined
  }
}
