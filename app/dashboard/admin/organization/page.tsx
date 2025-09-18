'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, Upload, Download, Building2, Users, School, Filter, X, AlertTriangle } from 'lucide-react'
import { parseAcademyCSVLine, formatCSVContent } from '@/lib/utils/csv-parser'

interface Subject {
  id: number
  name: string
  code: string
  _count?: {
    branches: number
    userSubjects: number
  }
}

interface Branch {
  id: number
  subjectId: number
  name: string
  code?: string
  subject: {
    id: number
    name: string
  }
  manager?: {
    id: number
    name: string
    email: string
  }
  _count?: {
    academies: number
    userSubjects: number
  }
}

interface Academy {
  id: number
  branchId: number
  name: string
  address?: string
  phone?: string
  registrationNumber?: string
  branch: {
    id: number
    name: string
    subject: {
      id: number
      name: string
    }
  }
  _count?: {
    userSubjects: number
  }
}

export default function OrganizationManagementPage() {
  const [activeTab, setActiveTab] = useState('subjects')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(false)

  // 필터 상태
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  // 선택 상태
  const [selectedAcademies, setSelectedAcademies] = useState<Set<number>>(new Set())
  const [selectedBranches, setSelectedBranches] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Form states
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' })
  const [branchForm, setBranchForm] = useState({ subjectId: '', name: '', code: '' })
  const [academyForm, setAcademyForm] = useState({
    branchId: '',
    name: '',
    address: '',
    phone: '',
    registrationNumber: ''
  })

  // 수정 모드
  const [editingAcademy, setEditingAcademy] = useState<Academy | null>(null)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  // Dialog states
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)
  const [isAcademyDialogOpen, setIsAcademyDialogOpen] = useState(false)
  const [isCSVDialogOpen, setIsCSVDialogOpen] = useState(false)
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvValidation, setCsvValidation] = useState<{
    valid: number
    invalid: number
    errors: string[]
    newSubjects: string[]
    newBranches: string[]
  }>({ valid: 0, invalid: 0, errors: [], newSubjects: [], newBranches: [] })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: number
    failed: number
    details: string[]
  } | null>(null)

  // 필터링된 데이터
  const filteredBranches = branches.filter(branch => {
    if (selectedSubject !== 'all' && branch.subjectId !== parseInt(selectedSubject)) {
      return false
    }
    if (searchText && !branch.name.toLowerCase().includes(searchText.toLowerCase())) {
      return false
    }
    return true
  })

  const filteredAcademies = academies.filter(academy => {
    if (selectedSubject !== 'all' && academy.branch.subject.id !== parseInt(selectedSubject)) {
      return false
    }
    if (selectedBranch !== 'all' && academy.branchId !== parseInt(selectedBranch)) {
      return false
    }
    if (searchText && !academy.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !academy.address?.toLowerCase().includes(searchText.toLowerCase()) &&
        !academy.phone?.includes(searchText)) {
      return false
    }
    return true
  })

  // Fetch data
  const fetchSubjects = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/subjects', {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        setSubjects(data.subjects)
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
    }
  }, [])

  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/branches', {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        setBranches(data.branches)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }, [])

  const fetchAcademies = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/academies', {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        setAcademies(data.academies)
      }
    } catch (error) {
      console.error('Failed to fetch academies:', error)
    }
  }, [])

  useEffect(() => {
    fetchSubjects()
    fetchBranches()
    fetchAcademies()
  }, [fetchSubjects, fetchBranches, fetchAcademies])

  // 전체 선택 토글
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      if (activeTab === 'academies') {
        setSelectedAcademies(new Set(filteredAcademies.map(a => a.id)))
      } else if (activeTab === 'branches') {
        setSelectedBranches(new Set(filteredBranches.map(b => b.id)))
      }
    } else {
      setSelectedAcademies(new Set())
      setSelectedBranches(new Set())
    }
  }

  // 개별 선택 토글
  const handleSelectAcademy = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedAcademies)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedAcademies(newSelected)
    setSelectAll(newSelected.size === filteredAcademies.length && filteredAcademies.length > 0)
  }

  const handleSelectBranch = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedBranches)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedBranches(newSelected)
  }

  // 전체 데이터 삭제
  const handleDeleteAllData = async () => {
    setLoading(true)

    try {
      // 1. 모든 학원 삭제
      for (const academy of academies) {
        await fetch(`/api/admin/academies?id=${academy.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      }

      // 2. 모든 지사 삭제
      for (const branch of branches) {
        await fetch(`/api/admin/branches?id=${branch.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      }

      toast.success('모든 지사와 학원 데이터가 삭제되었습니다.')

      // 데이터 새로고침
      fetchBranches()
      fetchAcademies()
      setIsDeleteAllDialogOpen(false)
    } catch (error) {
      toast.error('데이터 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (activeTab === 'academies' && selectedAcademies.size > 0) {
      if (!confirm(`선택한 ${selectedAcademies.size}개의 학원을 삭제하시겠습니까?`)) return

      setLoading(true)
      let successCount = 0
      let failCount = 0

      for (const id of selectedAcademies) {
        try {
          const response = await fetch(`/api/admin/academies?id=${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      }

      setLoading(false)
      setSelectedAcademies(new Set())
      setSelectAll(false)

      if (successCount > 0) {
        toast.success(`${successCount}개의 학원이 삭제되었습니다.`)
        fetchAcademies()
      }
      if (failCount > 0) {
        toast.error(`${failCount}개의 학원 삭제에 실패했습니다.`)
      }
    } else if (activeTab === 'branches' && selectedBranches.size > 0) {
      if (!confirm(`선택한 ${selectedBranches.size}개의 지사를 삭제하시겠습니까?`)) return

      setLoading(true)
      let successCount = 0
      let failCount = 0

      for (const id of selectedBranches) {
        try {
          const response = await fetch(`/api/admin/branches?id=${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      }

      setLoading(false)
      setSelectedBranches(new Set())
      setSelectAll(false)

      if (successCount > 0) {
        toast.success(`${successCount}개의 지사가 삭제되었습니다.`)
        fetchBranches()
      }
      if (failCount > 0) {
        toast.error(`${failCount}개의 지사 삭제에 실패했습니다.`)
      }
    }
  }

  // Subject CRUD
  const handleAddSubject = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subjectForm)
      })

      if (response.ok) {
        toast.success('과목이 추가되었습니다.')
        setIsSubjectDialogOpen(false)
        setSubjectForm({ name: '', code: '' })
        fetchSubjects()
      } else {
        const error = await response.json()
        toast.error(error.error || '과목 추가 실패')
      }
    } catch (error) {
      toast.error('과목 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/subjects?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('과목이 삭제되었습니다.')
        fetchSubjects()
      } else {
        const error = await response.json()
        toast.error(error.error || '과목 삭제 실패')
      }
    } catch (error) {
      toast.error('과목 삭제 중 오류가 발생했습니다.')
    }
  }

  // Branch CRUD
  const handleAddBranch = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...branchForm,
          subjectId: parseInt(branchForm.subjectId)
        })
      })

      if (response.ok) {
        toast.success('지사가 추가되었습니다.')
        setIsBranchDialogOpen(false)
        setBranchForm({ subjectId: '', name: '', code: '' })
        fetchBranches()
      } else {
        const error = await response.json()
        toast.error(error.error || '지사 추가 실패')
      }
    } catch (error) {
      toast.error('지사 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBranch = async () => {
    if (!editingBranch) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/branches?id=${editingBranch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: branchForm.name,
          code: branchForm.code
        })
      })

      if (response.ok) {
        toast.success('지사가 수정되었습니다.')
        setIsBranchDialogOpen(false)
        setEditingBranch(null)
        setBranchForm({ subjectId: '', name: '', code: '' })
        fetchBranches()
      } else {
        const error = await response.json()
        toast.error(error.error || '지사 수정 실패')
      }
    } catch (error) {
      toast.error('지사 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBranch = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/branches?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('지사가 삭제되었습니다.')
        fetchBranches()
      } else {
        const error = await response.json()
        toast.error(error.error || '지사 삭제 실패')
      }
    } catch (error) {
      toast.error('지사 삭제 중 오류가 발생했습니다.')
    }
  }

  // Academy CRUD
  const handleAddAcademy = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/academies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...academyForm,
          branchId: parseInt(academyForm.branchId)
        })
      })

      if (response.ok) {
        toast.success('학원이 추가되었습니다.')
        setIsAcademyDialogOpen(false)
        setAcademyForm({ branchId: '', name: '', address: '', phone: '', registrationNumber: '' })
        fetchAcademies()
      } else {
        const error = await response.json()
        toast.error(error.error || '학원 추가 실패')
      }
    } catch (error) {
      toast.error('학원 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAcademy = async () => {
    if (!editingAcademy) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/academies?id=${editingAcademy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: academyForm.name,
          address: academyForm.address,
          phone: academyForm.phone,
          registrationNumber: academyForm.registrationNumber
        })
      })

      if (response.ok) {
        toast.success('학원이 수정되었습니다.')
        setIsAcademyDialogOpen(false)
        setEditingAcademy(null)
        setAcademyForm({ branchId: '', name: '', address: '', phone: '', registrationNumber: '' })
        fetchAcademies()
      } else {
        const error = await response.json()
        toast.error(error.error || '학원 수정 실패')
      }
    } catch (error) {
      toast.error('학원 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAcademy = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/academies?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('학원이 삭제되었습니다.')
        fetchAcademies()
      } else {
        const error = await response.json()
        toast.error(error.error || '학원 삭제 실패')
      }
    } catch (error) {
      toast.error('학원 삭제 중 오류가 발생했습니다.')
    }
  }

  // CSV File Validation
  const validateCSVFile = async (file: File) => {
    setUploadResult(null)

    let text = await file.text()
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1)
    }

    const lines = text.split('\n').filter(line => line.trim())
    const dataLines = lines.slice(1) // Skip header

    const parsedData: any[] = []
    const validation = {
      valid: 0,
      invalid: 0,
      errors: [] as string[],
      newSubjects: [] as string[],
      newBranches: [] as string[]
    }

    if (activeTab === 'academies') {
      // 학원 CSV 검증
      const subjectBranchMap = new Map<string, Set<string>>()

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i]
        const { subjectName, branchName, academyName, address, phone } = parseAcademyCSVLine(line)

        const rowData = {
          subjectName,
          branchName,
          academyName,
          address,
          phone,
          valid: true,
          errors: [] as string[]
        }

        // 필수 필드 검증
        if (!subjectName || !branchName || !academyName) {
          rowData.valid = false
          rowData.errors.push('필수 필드가 누락되었습니다')
          validation.invalid++
        } else {
          // 과목 확인
          const subject = subjects.find(s => s.name === subjectName)
          if (!subject) {
            if (!validation.newSubjects.includes(subjectName)) {
              validation.newSubjects.push(subjectName)
            }
          }

          // 지사 확인 (과목별로 구분)
          const branchKey = `${subjectName}:${branchName}`
          if (!subjectBranchMap.has(subjectName)) {
            subjectBranchMap.set(subjectName, new Set())
          }
          subjectBranchMap.get(subjectName)?.add(branchName)

          const branch = branches.find(b =>
            b.name === branchName && b.subject.name === subjectName
          )

          if (!branch && !validation.newBranches.includes(branchKey)) {
            validation.newBranches.push(branchKey)
          }

          validation.valid++
        }

        parsedData.push(rowData)
      }
    }

    setCsvData(parsedData)
    setCsvValidation(validation)
  }

  // CSV Upload
  const handleCSVUpload = async () => {
    if (csvData.length === 0) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      const response = await fetch('/api/admin/csv-upload', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: activeTab,
          data: csvData.filter(d => d.valid),
          autoCreate: true // 과목/지사 자동 생성 플래그
        })
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResult({
          success: result.success,
          failed: result.failed,
          details: result.details || []
        })

        // 업로드 성공 후 데이터 새로고침
        fetchSubjects()
        fetchBranches()
        fetchAcademies()

        toast.success(`업로드 완료: 성공 ${result.success}건, 실패 ${result.failed}건`)
      } else {
        toast.error(result.error || 'CSV 업로드 실패')
      }
    } catch (error) {
      toast.error('CSV 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // Sample CSV download
  const downloadSampleCSV = () => {
    let data: string[][] = []
    let filename = ''

    if (activeTab === 'subjects') {
      data = [
        ['과목명', '과목코드'],
        ['수학', 'math'],
        ['영어', 'english'],
        ['과학', 'science']
      ]
      filename = 'sample_subjects.csv'
    } else if (activeTab === 'branches') {
      data = [
        ['과목명', '지사명', '지사코드'],
        ['수학', '강남점', 'gangnam'],
        ['수학', '서초점', 'seocho'],
        ['영어', '강남점', 'gangnam']
      ]
      filename = 'sample_branches.csv'
    } else if (activeTab === 'academies') {
      data = [
        ['과목명', '지사명', '학원명', '주소', '전화번호'],
        ['수학', '강남점', '한빛수학학원', '서울시 강남구 테헤란로 123 (역삼동, 강남빌딩)', '02-1234-5678'],
        ['영어', '서초점', '영어마을학원', '서울시 서초구 서초대로 456 (서초동, 서초타워)', '02-2345-6789']
      ]
      filename = 'sample_academies.csv'
    }

    const content = formatCSVContent(data)

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>조직 구조 관리</CardTitle>
          <CardDescription>
            과목, 지사, 학원을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value)
            setSelectedAcademies(new Set())
            setSelectedBranches(new Set())
            setSelectAll(false)
            setSelectedSubject('all')
            setSelectedBranch('all')
            setSearchText('')
          }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subjects">과목 관리</TabsTrigger>
              <TabsTrigger value="branches">지사 관리</TabsTrigger>
              <TabsTrigger value="academies">학원 관리</TabsTrigger>
            </TabsList>

            {/* 과목 관리 */}
            <TabsContent value="subjects" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">과목 목록</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    샘플 CSV
                  </Button>
                  <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        과목 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>새 과목 추가</DialogTitle>
                        <DialogDescription>
                          새로운 과목을 추가합니다
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="subject-name">과목명</Label>
                          <Input
                            id="subject-name"
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            placeholder="예: 수학"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="subject-code">과목 코드</Label>
                          <Input
                            id="subject-code"
                            value={subjectForm.code}
                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                            placeholder="예: math"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddSubject} disabled={loading}>
                          추가
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left">과목명</th>
                      <th className="p-3 text-left">코드</th>
                      <th className="p-3 text-left">지사 수</th>
                      <th className="p-3 text-left">사용자 수</th>
                      <th className="p-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id} className="border-b">
                        <td className="p-3 font-medium">{subject.name}</td>
                        <td className="p-3">{subject.code}</td>
                        <td className="p-3">{subject._count?.branches || 0}</td>
                        <td className="p-3">{subject._count?.userSubjects || 0}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* 지사 관리 */}
            <TabsContent value="branches" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">지사 목록</h3>
                <div className="flex gap-2">
                  {branches.length > 0 && (
                    <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          전체 삭제
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>전체 데이터 삭제</DialogTitle>
                          <DialogDescription>
                            ⚠️ 주의: 이 작업은 되돌릴 수 없습니다!
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <p className="text-sm text-gray-600 mb-2">
                            다음 데이터가 모두 삭제됩니다:
                          </p>
                          <ul className="text-sm space-y-1">
                            <li>• {academies.length}개의 학원</li>
                            <li>• {branches.length}개의 지사</li>
                          </ul>
                          <p className="text-sm text-red-600 mt-4">
                            사용자에게 연결된 데이터는 삭제할 수 없습니다.
                          </p>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsDeleteAllDialogOpen(false)}
                          >
                            취소
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAllData}
                            disabled={loading}
                          >
                            {loading ? '삭제 중...' : '전체 삭제 확인'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {selectedBranches.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      선택 삭제 ({selectedBranches.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    샘플 CSV
                  </Button>
                  <Dialog open={isBranchDialogOpen} onOpenChange={(open) => {
                    setIsBranchDialogOpen(open)
                    if (!open) {
                      setEditingBranch(null)
                      setBranchForm({ subjectId: '', name: '', code: '' })
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        지사 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingBranch ? '지사 수정' : '새 지사 추가'}</DialogTitle>
                        <DialogDescription>
                          {editingBranch ? '지사 정보를 수정합니다' : '새로운 지사를 추가합니다'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {!editingBranch && (
                          <div className="grid gap-2">
                            <Label htmlFor="branch-subject">과목</Label>
                            <Select
                              value={branchForm.subjectId}
                              onValueChange={(value) => setBranchForm({ ...branchForm, subjectId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="과목 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id.toString()}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label htmlFor="branch-name">지사명</Label>
                          <Input
                            id="branch-name"
                            value={branchForm.name}
                            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                            placeholder="예: 강남점"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="branch-code">지사 코드 (선택)</Label>
                          <Input
                            id="branch-code"
                            value={branchForm.code}
                            onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                            placeholder="예: gangnam"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={editingBranch ? handleUpdateBranch : handleAddBranch} disabled={loading}>
                          {editingBranch ? '수정' : '추가'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* 필터 */}
              <div className="flex gap-4">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="과목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 과목</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="지사명 검색..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-3 text-left">과목</th>
                      <th className="p-3 text-left">지사명</th>
                      <th className="p-3 text-left">코드</th>
                      <th className="p-3 text-left">학원 수</th>
                      <th className="p-3 text-left">담당자</th>
                      <th className="p-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.map((branch) => (
                      <tr key={branch.id} className="border-b">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedBranches.has(branch.id)}
                            onCheckedChange={(checked) => handleSelectBranch(branch.id, checked as boolean)}
                          />
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {branch.subject.name}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{branch.name}</td>
                        <td className="p-3">{branch.code || '-'}</td>
                        <td className="p-3">{branch._count?.academies || 0}</td>
                        <td className="p-3">{branch.manager?.name || '-'}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingBranch(branch)
                              setBranchForm({
                                subjectId: branch.subjectId.toString(),
                                name: branch.name,
                                code: branch.code || ''
                              })
                              setIsBranchDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBranch(branch.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* 학원 관리 */}
            <TabsContent value="academies" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">학원 목록</h3>
                <div className="flex gap-2">
                  {selectedAcademies.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      선택 삭제 ({selectedAcademies.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    샘플 CSV
                  </Button>
                  <Dialog open={isCSVDialogOpen} onOpenChange={setIsCSVDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        CSV 업로드
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>CSV 업로드</DialogTitle>
                        <DialogDescription>
                          학원 데이터를 CSV 파일로 일괄 등록합니다. (과목/지사 자동 생성)
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 overflow-y-auto">
                        {/* 파일 업로드 */}
                        {csvData.length === 0 && (
                          <div className="border-2 border-dashed rounded-lg p-6">
                            <Input
                              type="file"
                              accept=".csv"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  await validateCSVFile(file)
                                }
                              }}
                            />
                          </div>
                        )}

                        {/* 검증 결과 */}
                        {csvData.length > 0 && !uploadResult && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <Card>
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-green-600">{csvValidation.valid}</div>
                                  <div className="text-sm text-gray-600">유효한 데이터</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-red-600">{csvValidation.invalid}</div>
                                  <div className="text-sm text-gray-600">오류 데이터</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-blue-600">{csvData.length}</div>
                                  <div className="text-sm text-gray-600">전체 데이터</div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* 자동 생성될 항목 */}
                            {(csvValidation.newSubjects.length > 0 || csvValidation.newBranches.length > 0) && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold mb-2">자동 생성될 항목</h4>
                                {csvValidation.newSubjects.length > 0 && (
                                  <div>
                                    <span className="text-sm font-medium">새 과목: </span>
                                    <span className="text-sm">{csvValidation.newSubjects.join(', ')}</span>
                                  </div>
                                )}
                                {csvValidation.newBranches.length > 0 && (
                                  <div>
                                    <span className="text-sm font-medium">새 지사: </span>
                                    <span className="text-sm">{csvValidation.newBranches.map(b => b.split(':').join(' - ')).join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 데이터 미리보기 */}
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="p-2 text-left">상태</th>
                                    <th className="p-2 text-left">과목명</th>
                                    <th className="p-2 text-left">지사명</th>
                                    <th className="p-2 text-left">학원명</th>
                                    <th className="p-2 text-left">주소</th>
                                    <th className="p-2 text-left">전화번호</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {csvData.slice(0, 10).map((row, index) => (
                                    <tr key={index} className={row.valid ? '' : 'bg-red-50'}>
                                      <td className="p-2">
                                        {row.valid ? (
                                          <span className="text-green-600">✓</span>
                                        ) : (
                                          <span className="text-red-600">✗</span>
                                        )}
                                      </td>
                                      <td className="p-2">{row.subjectName}</td>
                                      <td className="p-2">{row.branchName}</td>
                                      <td className="p-2">{row.academyName}</td>
                                      <td className="p-2">{row.address || '-'}</td>
                                      <td className="p-2">{row.phone || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {csvData.length > 10 && (
                                <div className="p-2 text-center text-sm text-gray-500">
                                  ... {csvData.length - 10}개 더 있음
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 업로드 결과 */}
                        {uploadResult && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <Card>
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
                                  <div className="text-sm text-gray-600">성공</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-red-600">{uploadResult.failed}</div>
                                  <div className="text-sm text-gray-600">실패</div>
                                </CardContent>
                              </Card>
                            </div>

                            {uploadResult.details.length > 0 && (
                              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                                <h4 className="font-semibold mb-2">상세 결과</h4>
                                <div className="space-y-1">
                                  {uploadResult.details.map((detail, index) => (
                                    <div key={index} className="text-sm">{detail}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        {csvData.length > 0 && !uploadResult && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCsvData([])
                                setCsvValidation({ valid: 0, invalid: 0, errors: [], newSubjects: [], newBranches: [] })
                              }}
                            >
                              취소
                            </Button>
                            <Button
                              onClick={handleCSVUpload}
                              disabled={isUploading || csvValidation.valid === 0}
                            >
                              {isUploading ? '업로드 중...' : `${csvValidation.valid}개 업로드`}
                            </Button>
                          </>
                        )}
                        {uploadResult && (
                          <Button
                            onClick={() => {
                              setIsCSVDialogOpen(false)
                              setCsvData([])
                              setCsvValidation({ valid: 0, invalid: 0, errors: [], newSubjects: [], newBranches: [] })
                              setUploadResult(null)
                            }}
                          >
                            닫기
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isAcademyDialogOpen} onOpenChange={(open) => {
                    setIsAcademyDialogOpen(open)
                    if (!open) {
                      setEditingAcademy(null)
                      setAcademyForm({ branchId: '', name: '', address: '', phone: '', registrationNumber: '' })
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        학원 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingAcademy ? '학원 수정' : '새 학원 추가'}</DialogTitle>
                        <DialogDescription>
                          {editingAcademy ? '학원 정보를 수정합니다' : '새로운 학원을 추가합니다'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {!editingAcademy && (
                          <div className="grid gap-2">
                            <Label htmlFor="academy-branch">지사</Label>
                            <Select
                              value={academyForm.branchId}
                              onValueChange={(value) => setAcademyForm({ ...academyForm, branchId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="지사 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id.toString()}>
                                    [{branch.subject.name}] {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label htmlFor="academy-name">학원명</Label>
                          <Input
                            id="academy-name"
                            value={academyForm.name}
                            onChange={(e) => setAcademyForm({ ...academyForm, name: e.target.value })}
                            placeholder="예: 한빛수학학원"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="academy-address">주소 (선택)</Label>
                          <Input
                            id="academy-address"
                            value={academyForm.address}
                            onChange={(e) => setAcademyForm({ ...academyForm, address: e.target.value })}
                            placeholder="예: 서울시 강남구"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="academy-phone">전화번호 (선택)</Label>
                          <Input
                            id="academy-phone"
                            value={academyForm.phone}
                            onChange={(e) => setAcademyForm({ ...academyForm, phone: e.target.value })}
                            placeholder="예: 02-1234-5678"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="academy-reg-number">사업자등록번호 (선택)</Label>
                          <Input
                            id="academy-reg-number"
                            value={academyForm.registrationNumber}
                            onChange={(e) => setAcademyForm({ ...academyForm, registrationNumber: e.target.value })}
                            placeholder="예: 123-45-67890"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={editingAcademy ? handleUpdateAcademy : handleAddAcademy} disabled={loading}>
                          {editingAcademy ? '수정' : '추가'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* 필터 */}
              <div className="flex gap-4">
                <Select value={selectedSubject} onValueChange={(value) => {
                  setSelectedSubject(value)
                  setSelectedBranch('all')
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="과목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 과목</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="지사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 지사</SelectItem>
                    {branches
                      .filter(b => selectedSubject === 'all' || b.subjectId === parseInt(selectedSubject))
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="학원명, 주소, 전화번호 검색..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="max-w-sm"
                />
                {searchText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchText('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{filteredAcademies.length}</div>
                    <div className="text-sm text-gray-600">검색 결과</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{academies.length}</div>
                    <div className="text-sm text-gray-600">전체 학원</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{branches.length}</div>
                    <div className="text-sm text-gray-600">전체 지사</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{subjects.length}</div>
                    <div className="text-sm text-gray-600">전체 과목</div>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-3 text-left">과목</th>
                      <th className="p-3 text-left">지사</th>
                      <th className="p-3 text-left">학원명</th>
                      <th className="p-3 text-left">주소</th>
                      <th className="p-3 text-left">전화번호</th>
                      <th className="p-3 text-left">사용자 수</th>
                      <th className="p-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAcademies.map((academy) => (
                      <tr key={academy.id} className="border-b">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedAcademies.has(academy.id)}
                            onCheckedChange={(checked) => handleSelectAcademy(academy.id, checked as boolean)}
                          />
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 rounded text-sm">
                            {academy.branch.subject.name}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {academy.branch.name}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{academy.name}</td>
                        <td className="p-3">{academy.address || '-'}</td>
                        <td className="p-3">{academy.phone || '-'}</td>
                        <td className="p-3">{academy._count?.userSubjects || 0}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAcademy(academy)
                              setAcademyForm({
                                branchId: academy.branchId.toString(),
                                name: academy.name,
                                address: academy.address || '',
                                phone: academy.phone || '',
                                registrationNumber: academy.registrationNumber || ''
                              })
                              setIsAcademyDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAcademy(academy.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}