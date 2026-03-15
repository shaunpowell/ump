import { describe, it, expect } from '@jest/globals'
import { resolveExpression } from '../expression.js'
import type { ExpressionContext } from '../expression.js'

// Helper — builds a minimal context, merging in any overrides
function makeContext(overrides: Partial<ExpressionContext>): ExpressionContext {
  return {
    $json: {},
    $binary: {},
    $input: {
      first: () => ({ json: {} }),
      all: () => [],
    },
    $: (_name: string) => ({
      first: () => ({ json: {} }),
      item: { json: {} },
    }),
    ...overrides,
  }
}

// --- Plain strings (no expression) ---

it('returns non-expression strings unchanged', () => {
  expect(resolveExpression('hello world', makeContext({}))).toBe('hello world')
})

it('returns empty string unchanged', () => {
  expect(resolveExpression('', makeContext({}))).toBe('')
})

it('returns string with braces but no =={{ unchanged', () => {
  expect(resolveExpression('{{ not an expression }}', makeContext({}))).toBe(
    '{{ not an expression }}'
  )
})

// --- $json access ---

it('resolves $json.text', () => {
  const ctx = makeContext({ $json: { text: 'remittance' } })
  expect(resolveExpression('={{ $json.text }}', ctx)).toBe('remittance')
})

it('resolves $json.text.toLowerCase()', () => {
  const ctx = makeContext({ $json: { text: 'REMITTANCE' } })
  expect(resolveExpression('={{ $json.text.toLowerCase() }}', ctx)).toBe('remittance')
})

it('resolves bracket notation $json["Email ID"]', () => {
  const ctx = makeContext({ $json: { 'Email ID': 'msg-123' } })
  expect(resolveExpression("={{ $json['Email ID'] }}", ctx)).toBe('msg-123')
})

it('resolves $json.amount', () => {
  const ctx = makeContext({ $json: { amount: 4200 } })
  expect(resolveExpression('={{ $json.amount }}', ctx)).toBe(4200)
})

it('resolves $json.company', () => {
  const ctx = makeContext({ $json: { company: 'Acme' } })
  expect(resolveExpression('={{ $json.company }}', ctx)).toBe('Acme')
})

it('resolves $json.payment_date', () => {
  const ctx = makeContext({ $json: { payment_date: '2026-03-15' } })
  expect(resolveExpression('={{ $json.payment_date }}', ctx)).toBe('2026-03-15')
})

it('resolves $json.invoice_number', () => {
  const ctx = makeContext({ $json: { invoice_number: 'INV-001' } })
  expect(resolveExpression('={{ $json.invoice_number }}', ctx)).toBe('INV-001')
})

it('resolves $json.email_date', () => {
  const ctx = makeContext({ $json: { email_date: '2026-03-14' } })
  expect(resolveExpression('={{ $json.email_date }}', ctx)).toBe('2026-03-14')
})

it('resolves $json.email_id', () => {
  const ctx = makeContext({ $json: { email_id: 'abc@example.com' } })
  expect(resolveExpression('={{ $json.email_id }}', ctx)).toBe('abc@example.com')
})

it('resolves $json.imported_date', () => {
  const ctx = makeContext({ $json: { imported_date: '2026-03-01' } })
  expect(resolveExpression('={{ $json.imported_date }}', ctx)).toBe('2026-03-01')
})

it('resolves $json.description', () => {
  const ctx = makeContext({ $json: { description: 'Payment for services' } })
  expect(resolveExpression('={{ $json.description }}', ctx)).toBe('Payment for services')
})

// --- $binary access ---

it('resolves optional chaining on $binary when value present', () => {
  const ctx = makeContext({ $binary: { attachment_0: { fileName: 'invoice.pdf' } } })
  expect(resolveExpression('={{ $binary.attachment_0?.fileName }}', ctx)).toBe('invoice.pdf')
})

it('returns undefined for optional chaining on $binary when key absent', () => {
  const ctx = makeContext({ $binary: {} })
  expect(resolveExpression('={{ $binary.attachment_0?.fileName }}', ctx)).toBeUndefined()
})

// --- Upstream node references $('NodeName') ---

it('resolves $("Get a message").item.json.text', () => {
  const ctx = makeContext({
    $json: {},
    $: (name: string) => ({
      first: () => ({ json: {} }),
      item: { json: name === 'Get a message' ? { text: 'Hello' } : {} },
    }),
  })
  expect(resolveExpression("={{ $('Get a message').item.json.text }}", ctx)).toBe('Hello')
})

it('resolves $("Get a message").item.json.to.value[0].address', () => {
  const ctx = makeContext({
    $json: {},
    $: (name: string) => ({
      first: () => ({ json: {} }),
      item: {
        json:
          name === 'Get a message'
            ? { to: { value: [{ address: 'user@example.com' }] } }
            : {},
      },
    }),
  })
  expect(
    resolveExpression("={{ $('Get a message').item.json.to.value[0].address }}", ctx)
  ).toBe('user@example.com')
})

it('resolves $("Loop Over Items").item.json.id', () => {
  const ctx = makeContext({
    $json: {},
    $: (name: string) => ({
      first: () => ({ json: {} }),
      item: { json: name === 'Loop Over Items' ? { id: 'abc-456' } : {} },
    }),
  })
  expect(resolveExpression("={{ $('Loop Over Items').item.json.id }}", ctx)).toBe('abc-456')
})

// --- Complex expressions ---

it('resolves map().join() template literal expression', () => {
  const ctx = makeContext({
    $json: {
      data: [
        {
          failed_node: 'NodeA',
          message_subject: 'Sub1',
          message_id: 'id1',
          error: 'err1',
          timestamp: 't1',
        },
        {
          failed_node: 'NodeB',
          message_subject: 'Sub2',
          message_id: 'id2',
          error: 'err2',
          timestamp: 't2',
        },
      ],
    },
  })
  const expr =
    "={{ $json.data.map(item => `Node: ${item.failed_node} Subject: ${item.message_subject} Message ID: ${item.message_id} Error: ${item.error} Time: ${item.timestamp} ---`).join('\\n') }}"
  const result = resolveExpression(expr, ctx)
  expect(result).toBe(
    'Node: NodeA Subject: Sub1 Message ID: id1 Error: err1 Time: t1 ---\nNode: NodeB Subject: Sub2 Message ID: id2 Error: err2 Time: t2 ---'
  )
})

// --- Error handling ---

it('returns an error result when expression throws', () => {
  const ctx = makeContext({ $json: {} })
  // $json.nonexistent.deep would throw — evaluator should catch and return error shape
  const result = resolveExpression('={{ $json.nonexistent.deep }}', ctx)
  expect(result).toBeUndefined()
})
