// 어드민 콘솔 공통 필터 — 노션식 "조건 추가" 바 (Rankings·Schools·Participants 공유).
// 차원: 학교등급(level=초등/고등)·주(state)·zone·학교(school)·학년(grade)·반(class)·상태(status).
// 선택 안 한 차원 = 제약 없음(교집합 AND). 상위가 바뀌면 더 이상 유효하지 않은 하위 값은
// 자동으로 비워짐(값만 '' — 칩은 남음). "공통은 통합" (AGENTS.md) — 한 곳 수정 = 세 탭 반영.
import { useState } from 'react'
import { levelLabel } from '../../lib/grade'
import type { TFunction } from '../../lib/i18n'
import { useT } from '../../lib/i18n'
import type { ParticipantStatus, SchoolLevel } from '../../api/types'

export type FilterDim = 'level' | 'state' | 'zone' | 'school' | 'grade' | 'class' | 'status'
export type FilterValues = Partial<Record<FilterDim, string>>
export interface FilterOption {
  value: string
  label: string
}

// 구조적 타입 — listEventSchools 결과(AdminSchoolView)가 그대로 들어맞는다.
export interface FilterSchool {
  school: { id: string; name: string; level?: SchoolLevel; state?: string; zone?: string }
  classes: { classInfo: { id: string; name: string; grade?: number } }[]
}

const STATUS_VALUES: ParticipantStatus[] = ['approved', 'pending', 'withdrawn', 'rejected']

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

function statusLabel(status: ParticipantStatus, t: TFunction): string {
  if (status === 'approved') return t('common.registered')
  if (status === 'pending') return t('common.pending')
  if (status === 'withdrawn') return t('common.withdrawn')
  return t('common.rejected')
}

export function dimLabel(dim: FilterDim, t: TFunction): string {
  switch (dim) {
    case 'level': return t('common.schoolLevel')
    case 'state': return t('common.state')
    case 'zone': return t('common.zone')
    case 'school': return t('common.school')
    case 'grade': return t('common.grade')
    case 'class': return t('common.class')
    case 'status': return t('common.status')
  }
}

// 현재 선택값(v) 기준으로 각 차원의 선택지 — 상위 선택으로 좁혀진다.
export function buildOptions(schools: FilterSchool[], v: FilterValues, t: TFunction): Record<FilterDim, FilterOption[]> {
  const levelScope = schools.filter((s) => !v.level || s.school.level === v.level)
  const stateScope = levelScope.filter((s) => !v.state || s.school.state === v.state)
  const zoneScope = stateScope.filter((s) => !v.zone || s.school.zone === v.zone)
  const schoolScope = zoneScope.filter((s) => !v.school || s.school.id === v.school)

  const levels = uniq(schools.map((s) => s.school.level).filter((x): x is SchoolLevel => Boolean(x)))
  const states = uniq(levelScope.map((s) => s.school.state).filter((x): x is string => Boolean(x))).sort()
  const zones = uniq(stateScope.map((s) => s.school.zone).filter((x): x is string => Boolean(x))).sort()
  const grades = uniq(
    schoolScope.flatMap((s) => s.classes.map((c) => c.classInfo.grade)).filter((g): g is number => g != null),
  ).sort((a, b) => a - b)
  const classes = schoolScope.flatMap((s) =>
    s.classes
      .filter((c) => !v.grade || String(c.classInfo.grade) === v.grade)
      .map((c) => ({ value: c.classInfo.id, label: `${s.school.name} · ${c.classInfo.name}` })),
  )

  return {
    level: levels.map((l) => ({ value: l, label: levelLabel(l, t) })),
    state: states.map((s) => ({ value: s, label: s })),
    zone: zones.map((z) => ({ value: z, label: z })),
    school: zoneScope.map((s) => ({ value: s.school.id, label: s.school.name })),
    grade: grades.map((g) => ({ value: String(g), label: t('teacher.gradeLabel', { grade: g }) })),
    class: classes,
    status: STATUS_VALUES.map((s) => ({ value: s, label: statusLabel(s, t) })),
  }
}

// 상위 변경으로 무효가 된 하위 값은 '' 로(칩은 유지). 상위→하위 순으로 정리.
export function sanitizeFilters(schools: FilterSchool[], v: FilterValues): FilterValues {
  const out: FilterValues = { ...v }
  const drop = (dim: FilterDim, allowed: Set<string>) => {
    const val = out[dim]
    if (val && !allowed.has(val)) out[dim] = ''
  }
  drop('level', new Set(schools.map((s) => s.school.level).filter(Boolean) as string[]))
  const levelScope = schools.filter((s) => !out.level || s.school.level === out.level)
  drop('state', new Set(levelScope.map((s) => s.school.state).filter(Boolean) as string[]))
  const stateScope = levelScope.filter((s) => !out.state || s.school.state === out.state)
  drop('zone', new Set(stateScope.map((s) => s.school.zone).filter(Boolean) as string[]))
  const zoneScope = stateScope.filter((s) => !out.zone || s.school.zone === out.zone)
  drop('school', new Set(zoneScope.map((s) => s.school.id)))
  const schoolScope = zoneScope.filter((s) => !out.school || s.school.id === out.school)
  drop('grade', new Set(schoolScope.flatMap((s) => s.classes.map((c) => c.classInfo.grade)).filter((g) => g != null).map(String)))
  drop('class', new Set(schoolScope.flatMap((s) => s.classes.filter((c) => !out.grade || String(c.classInfo.grade) === out.grade).map((c) => c.classInfo.id))))
  return out
}

// 필터에 맞는 (학교,반) 쌍 — Rankings 교집합 집계용. (status 는 행 단위라 제외)
export function matchingClasses(schools: FilterSchool[], v: FilterValues): { schoolId: string; classId: string }[] {
  return schools
    .filter((s) => (!v.level || s.school.level === v.level) && (!v.state || s.school.state === v.state) && (!v.zone || s.school.zone === v.zone) && (!v.school || s.school.id === v.school))
    .flatMap((s) =>
      s.classes
        .filter((c) => (!v.grade || String(c.classInfo.grade) === v.grade) && (!v.class || c.classInfo.id === v.class))
        .map((c) => ({ schoolId: s.school.id, classId: c.classInfo.id })),
    )
}

// 학교 1건이 필터에 맞는가 (Schools 목록·Participants 행 공용).
export function schoolMatches(
  v: FilterValues,
  s: { id?: string; level?: SchoolLevel; state?: string; zone?: string },
): boolean {
  if (v.level && s.level !== v.level) return false
  if (v.state && s.state !== v.state) return false
  if (v.zone && s.zone !== v.zone) return false
  if (v.school && s.id !== v.school) return false
  return true
}

// 필터 상태 + 정리(sanitize) 훅.
export function useFilters(schools: FilterSchool[], initial: FilterValues = {}) {
  const [values, setValues] = useState<FilterValues>(initial)
  const set = (key: FilterDim, value: string) => setValues((prev) => sanitizeFilters(schools, { ...prev, [key]: value }))
  const add = (key: FilterDim) => setValues((prev) => (key in prev ? prev : { ...prev, [key]: '' }))
  const remove = (key: FilterDim) =>
    setValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return sanitizeFilters(schools, next)
    })
  return { values, set, add, remove }
}

// 노션식 필터 바 — 활성 조건은 칩(라벨+값 select+×), 우측 "조건 추가" 드롭다운.
export function FilterBar({
  schools,
  dims,
  values,
  required = [],
  onSet,
  onAdd,
  onRemove,
}: {
  schools: FilterSchool[]
  dims: FilterDim[]
  values: FilterValues
  required?: FilterDim[]
  onSet: (key: FilterDim, value: string) => void
  onAdd: (key: FilterDim) => void
  onRemove: (key: FilterDim) => void
}) {
  const t = useT()
  const options = buildOptions(schools, values, t)
  const activeDims = dims.filter((d) => d in values || required.includes(d))
  const inactiveDims = dims.filter((d) => !activeDims.includes(d))

  return (
    <div className="ops-filter-row">
      {activeDims.map((dim) => (
        <span className="ops-filter-chip" key={dim}>
          <span className="ops-filter-chip-label">{dimLabel(dim, t)}</span>
          <select className="ops-filter-chip-select" value={values[dim] ?? ''} onChange={(e) => onSet(dim, e.target.value)}>
            {/* 필수 차원(예: 랭킹의 등급)은 'All' 없이 — 반드시 하나 골라야 함(등급별 데이터 분리) */}
            {required.includes(dim) ? (
              <option value="" disabled>{t('common.select')}</option>
            ) : (
              <option value="">{t('common.all')}</option>
            )}
            {options[dim].map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {!required.includes(dim) && (
            <button className="ops-filter-chip-x" type="button" aria-label={t('admin.removeFilter')} onClick={() => onRemove(dim)}>
              ×
            </button>
          )}
        </span>
      ))}
      {inactiveDims.length > 0 && (
        <select
          className="ops-filter-add"
          aria-label={t('common.addFilter')}
          value=""
          onChange={(e) => {
            if (e.target.value) onAdd(e.target.value as FilterDim)
          }}
        >
          <option value="">+ {t('common.addFilter')}</option>
          {inactiveDims.map((d) => (
            <option key={d} value={d}>{dimLabel(d, t)}</option>
          ))}
        </select>
      )}
    </div>
  )
}
