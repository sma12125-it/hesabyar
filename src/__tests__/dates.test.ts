import { describe, expect, it } from 'vitest'
import { formatRelativeFa } from '../lib/dates'

describe('relative Persian dates', () => {
  const noon = new Date('2026-09-15T12:00:00').getTime()

  it('labels today, yesterday, and n days ago', () => {
    expect(formatRelativeFa(noon - 2 * 60 * 60 * 1000, noon)).toBe('امروز')
    expect(formatRelativeFa(noon - 24 * 60 * 60 * 1000, noon)).toBe('دیروز')
    expect(formatRelativeFa(noon - 2 * 24 * 60 * 60 * 1000, noon)).toBe('۲ روز پیش')
  })
})
