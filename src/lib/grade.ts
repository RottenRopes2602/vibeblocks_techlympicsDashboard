// 말레이시아 학교 체계 표시 헬퍼 — primary=Standard/Tahun, secondary=Form/Tingkatan
import type { SchoolLevel } from '../api/types'
import type { TFunction } from './i18n'

export function levelLabel(level: SchoolLevel | undefined, t: TFunction): string {
  if (level === 'primary') return t('level.primary')
  if (level === 'secondary') return t('level.secondary')
  return t('level.unset')
}

export function formatGrade(level: SchoolLevel | undefined, grade: number, t: TFunction): string {
  if (level === 'primary') return t('grade.primary', { n: grade })
  if (level === 'secondary') return t('grade.secondary', { n: grade })
  return t('grade.generic', { n: grade })
}
