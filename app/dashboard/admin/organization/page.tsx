'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, Upload, Download, Building2, Users, School } from 'lucide-react'

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

  // Dialog states
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)
  const [isAcademyDialogOpen, setIsAcademyDialogOpen] = useState(false)
  const [isCSVDialogOpen, setIsCSVDialogOpen] = useState(false)

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

  // CSV Upload
  const handleCSVUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', activeTab)

    try {
      const response = await fetch('/api/admin/csv-upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`CSV 업로드 완료: ${data.success}개 성공, ${data.failed}개 실패`)
        
        // Refresh data
        if (activeTab === 'subjects') fetchSubjects()
        else if (activeTab === 'branches') fetchBranches()
        else if (activeTab === 'academies') fetchAcademies()
        
        setIsCSVDialogOpen(false)
      } else {
        toast.error('CSV 업로드 실패')
      }
    } catch (error) {
      toast.error('CSV 업로드 중 오류가 발생했습니다.')
    }
  }

  // Download sample CSV
  const downloadSampleCSV = () => {
    let content = ''
    let filename = ''

    if (activeTab === 'subjects') {
      content = '과목명,과목코드\n미래엔영어,english\n미래엔수학,math\n미래엔독서,reading'
      filename = 'subjects_sample.csv'
    } else if (activeTab === 'branches') {
      content = '과목명,지사명,지사코드\n미래엔영어,강남지사,gangnam\n미래엔수학,서초지사,seocho'
      filename = 'branches_sample.csv'
    } else if (activeTab === 'academies') {
      content = '과목명,지사명,학원명,주소,전화번호\n미래엔영어,강남지사,강남영어학원,서울시 강남구 테헤란로 123,02-1234-5678\n미래엔수학,서초지사,서초수학학원,서울시 서초구 서초대로 456,02-2345-6789'
      filename = 'academies_sample.csv'
    }

    // Add UTF-8 BOM for proper Korean encoding in Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">조직 관리</h1>
          <p className="text-gray-600 mt-2">과목, 지사, 학원을 관리합니다.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subjects">
              <School className="w-4 h-4 mr-2" />
              과목 관리
            </TabsTrigger>
            <TabsTrigger value="branches">
              <Building2 className="w-4 h-4 mr-2" />
              지사 관리
            </TabsTrigger>
            <TabsTrigger value="academies">
              <Users className="w-4 h-4 mr-2" />
              학원 관리
            </TabsTrigger>
          </TabsList>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>과목 목록</CardTitle>
                    <CardDescription>등록된 과목을 관리합니다.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setIsCSVDialogOpen(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      CSV 업로드
                    </Button>
                    <Button 
                      onClick={() => setIsSubjectDialogOpen(true)}
                      className="bg-accent-blue hover:bg-secondary-blue text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      과목 추가
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{subject.name}</h3>
                        <p className="text-sm text-gray-600">코드: {subject.code}</p>
                        <p className="text-sm text-gray-600">
                          지사: {subject._count?.branches || 0}개, 
                          사용자: {subject._count?.userSubjects || 0}명
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSubject(subject.id)}
                        disabled={
                          (subject._count?.branches || 0) > 0 || 
                          (subject._count?.userSubjects || 0) > 0
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>지사 목록</CardTitle>
                    <CardDescription>과목별 지사를 관리합니다.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setIsCSVDialogOpen(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      CSV 업로드
                    </Button>
                    <Button 
                      onClick={() => setIsBranchDialogOpen(true)}
                      className="bg-accent-blue hover:bg-secondary-blue text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      지사 추가
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {branches.map(branch => (
                    <div key={branch.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{branch.name}</h3>
                        <p className="text-sm text-gray-600">
                          과목: {branch.subject.name} | 코드: {branch.code || '-'}
                        </p>
                        <p className="text-sm text-gray-600">
                          학원: {branch._count?.academies || 0}개, 
                          사용자: {branch._count?.userSubjects || 0}명
                        </p>
                        {branch.manager && (
                          <p className="text-sm text-gray-600">
                            매니저: {branch.manager.name} ({branch.manager.email})
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBranch(branch.id)}
                        disabled={
                          (branch._count?.academies || 0) > 0 || 
                          (branch._count?.userSubjects || 0) > 0
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academies Tab */}
          <TabsContent value="academies">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>학원 목록</CardTitle>
                    <CardDescription>지사별 학원을 관리합니다.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setIsCSVDialogOpen(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      CSV 업로드
                    </Button>
                    <Button 
                      onClick={() => setIsAcademyDialogOpen(true)}
                      className="bg-accent-blue hover:bg-secondary-blue text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      학원 추가
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {academies.map(academy => (
                    <div key={academy.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{academy.name}</h3>
                        <p className="text-sm text-gray-600">
                          {academy.branch.subject.name} - {academy.branch.name}
                        </p>
                        {academy.address && (
                          <p className="text-sm text-gray-600">주소: {academy.address}</p>
                        )}
                        {academy.phone && (
                          <p className="text-sm text-gray-600">전화: {academy.phone}</p>
                        )}
                        {academy.registrationNumber && (
                          <p className="text-sm text-gray-600">사업자번호: {academy.registrationNumber}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          사용자: {academy._count?.userSubjects || 0}명
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAcademy(academy.id)}
                        disabled={(academy._count?.userSubjects || 0) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Subject Add Dialog */}
        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>과목 추가</DialogTitle>
              <DialogDescription>새로운 과목을 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-medium">과목명</Label>
                <Input
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                  placeholder="미래엔영어"
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">과목 코드</Label>
                <Input
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({...subjectForm, code: e.target.value})}
                  placeholder="english"
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsSubjectDialogOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                취소
              </Button>
              <Button 
                onClick={handleAddSubject} 
                disabled={loading || !subjectForm.name || !subjectForm.code}
                className="bg-accent-blue hover:bg-secondary-blue text-white"
              >
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Branch Add Dialog */}
        <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>지사 추가</DialogTitle>
              <DialogDescription>새로운 지사를 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-medium">과목 선택</Label>
                <Select
                  value={branchForm.subjectId}
                  onValueChange={(value) => setBranchForm({...branchForm, subjectId: value})}
                >
                  <SelectTrigger className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue">
                    <SelectValue placeholder="과목을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700 font-medium">지사명</Label>
                <Input
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({...branchForm, name: e.target.value})}
                  placeholder="강남지사"
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">지사 코드 (선택)</Label>
                <Input
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({...branchForm, code: e.target.value})}
                  placeholder="gangnam"
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsBranchDialogOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                취소
              </Button>
              <Button 
                onClick={handleAddBranch} 
                disabled={loading || !branchForm.subjectId || !branchForm.name}
                className="bg-accent-blue hover:bg-secondary-blue text-white"
              >
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Academy Add Dialog */}
        <Dialog open={isAcademyDialogOpen} onOpenChange={setIsAcademyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>학원 추가</DialogTitle>
              <DialogDescription>새로운 학원을 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-medium">지사 선택</Label>
                <Select
                  value={academyForm.branchId}
                  onValueChange={(value) => setAcademyForm({...academyForm, branchId: value})}
                >
                  <SelectTrigger className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue">
                    <SelectValue placeholder="지사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.subject.name} - {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700 font-medium">학원명</Label>
                <Input
                  value={academyForm.name}
                  onChange={(e) => setAcademyForm({...academyForm, name: e.target.value})}
                  placeholder="강남영어학원"
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">주소 (선택)</Label>
                <Input
                  value={academyForm.address}
                  onChange={(e) => setAcademyForm({...academyForm, address: e.target.value})}
                  placeholder="서울시 강남구..."
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">전화번호 (선택)</Label>
                <Input
                  value={academyForm.phone}
                  onChange={(e) => setAcademyForm({...academyForm, phone: e.target.value})}
                  placeholder="02-1234-5678"
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">사업자등록번호 (선택)</Label>
                <Input
                  value={academyForm.registrationNumber}
                  onChange={(e) => setAcademyForm({...academyForm, registrationNumber: e.target.value})}
                  placeholder="123-45-67890"
                  className="mt-1 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAcademyDialogOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                취소
              </Button>
              <Button 
                onClick={handleAddAcademy} 
                disabled={loading || !academyForm.branchId || !academyForm.name}
                className="bg-accent-blue hover:bg-secondary-blue text-white"
              >
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Upload Dialog */}
        <Dialog open={isCSVDialogOpen} onOpenChange={setIsCSVDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>CSV 업로드</DialogTitle>
              <DialogDescription>
                {activeTab === 'subjects' && '과목 정보를 CSV 파일로 일괄 업로드합니다.'}
                {activeTab === 'branches' && '지사 정보를 CSV 파일로 일괄 업로드합니다.'}
                {activeTab === 'academies' && '학원 정보를 CSV 파일로 일괄 업로드합니다.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleCSVUpload(file)
                  }}
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    클릭하여 CSV 파일 선택
                  </p>
                </label>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={downloadSampleCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                샘플 CSV 다운로드
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}