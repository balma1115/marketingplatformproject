/**
 * CSV 파싱 유틸리티
 * 주소 내 쉼표 등 특수 케이스를 처리하는 CSV 파서
 */

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 이스케이프된 따옴표
        current += '"'
        i++ // 다음 따옴표 건너뛰기
      } else {
        // 따옴표 열기/닫기
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // 필드 구분자
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // 마지막 필드 추가
  if (current || line.endsWith(',')) {
    result.push(current.trim())
  }

  return result
}

/**
 * 학원 CSV 라인을 파싱하는 함수
 * 과목명,지사명,학원명,주소,전화번호 형식
 * 주소에 쉼표가 있을 수 있음을 고려
 */
export function parseAcademyCSVLine(line: string): {
  subjectName: string
  branchName: string
  academyName: string
  address: string
  phone: string
} {
  const parts = parseCSVLine(line)

  // 기본 케이스: 5개 필드
  if (parts.length === 5) {
    return {
      subjectName: parts[0],
      branchName: parts[1],
      academyName: parts[2],
      address: parts[3],
      phone: parts[4]
    }
  }

  // 주소에 쉼표가 있어서 필드가 더 많은 경우
  if (parts.length > 5) {
    // 처음 3개는 과목, 지사, 학원명
    // 마지막은 전화번호
    // 나머지는 모두 주소
    const subjectName = parts[0]
    const branchName = parts[1]
    const academyName = parts[2]
    const phone = parts[parts.length - 1]

    // 전화번호 패턴 검증 (숫자와 하이픈으로 구성)
    const phonePattern = /^[\d-]+$/

    // 마지막 필드가 전화번호 패턴이 아니면 주소의 일부로 간주
    if (!phonePattern.test(phone) || phone.length < 8) {
      // 전화번호가 없는 경우, 모든 나머지를 주소로
      const address = parts.slice(3).join(', ')
      return {
        subjectName,
        branchName,
        academyName,
        address,
        phone: ''
      }
    } else {
      // 전화번호가 있는 경우
      const address = parts.slice(3, -1).join(', ')
      return {
        subjectName,
        branchName,
        academyName,
        address,
        phone
      }
    }
  }

  // 필드가 부족한 경우
  if (parts.length < 5) {
    return {
      subjectName: parts[0] || '',
      branchName: parts[1] || '',
      academyName: parts[2] || '',
      address: parts[3] || '',
      phone: ''
    }
  }

  return {
    subjectName: '',
    branchName: '',
    academyName: '',
    address: '',
    phone: ''
  }
}

/**
 * CSV 파일 내용을 따옴표로 감싸서 Excel에서 올바르게 표시되도록 포맷
 */
export function formatCSVContent(data: string[][]): string {
  const BOM = '\uFEFF'
  const lines = data.map(row =>
    row.map(cell => {
      // 쉼표, 따옴표, 줄바꿈이 포함된 경우 따옴표로 감싸기
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        // 따옴표는 두 개로 이스케이프
        const escaped = cell.replace(/"/g, '""')
        return `"${escaped}"`
      }
      return cell
    }).join(',')
  )

  return BOM + lines.join('\n')
}