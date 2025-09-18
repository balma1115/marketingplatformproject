'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Eye, EyeOff, User, Building, School as SchoolIcon } from 'lucide-react'

interface Subject {
  id: number
  name: string
  code: string
}

interface Branch {
  id: number
  subjectId: number
  name: string
}

interface Academy {
  id: number
  branchId: number
  name: string
}

interface SubjectSelection {
  selected: boolean
  branchId: string
  academyId: string
  isBranchManager: boolean  // 지사장 여부
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')

  // Form data - 이름과 연락처 제거
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: ''
  })

  // Organization data
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])

  // Subject selections
  const [subjectSelections, setSubjectSelections] = useState<Record<string, SubjectSelection>>({})

  // 자동 생성된 이름
  const [generatedName, setGeneratedName] = useState('미선택')

  // Fetch organization data
  useEffect(() => {
    fetchOrganizationData()
  }, [])

  // 이름 자동 생성
  useEffect(() => {
    generateUserName()
  }, [subjectSelections, subjects, branches, academies])

  const fetchOrganizationData = async () => {
    try {
      // Fetch subjects
      const subjectsRes = await fetch('/api/public/subjects')
      const subjectsData = await subjectsRes.json()
      setSubjects(subjectsData.subjects || [])

      // Initialize subject selections
      const initialSelections: Record<string, SubjectSelection> = {}
      subjectsData.subjects?.forEach((subject: Subject) => {
        initialSelections[subject.id.toString()] = {
          selected: false,
          branchId: '',
          academyId: '',
          isBranchManager: false
        }
      })
      setSubjectSelections(initialSelections)

      // Fetch branches
      const branchesRes = await fetch('/api/public/branches')
      const branchesData = await branchesRes.json()
      setBranches(branchesData.branches || [])

      // Fetch academies
      const academiesRes = await fetch('/api/public/academies')
      const academiesData = await academiesRes.json()
      setAcademies(academiesData.academies || [])
    } catch (error) {
      console.error('Failed to fetch organization data:', error)
    }
  }

  const generateUserName = () => {
    const selectedSubjects = Object.entries(subjectSelections)
      .filter(([_, value]) => value.selected && value.branchId)
      .map(([subjectId, selection]) => {
        const subject = subjects.find(s => s.id.toString() === subjectId)
        const branch = branches.find(b => b.id.toString() === selection.branchId)

        if (selection.isBranchManager) {
          return `${subject?.name || ''} ${branch?.name || ''} 지사장`
        } else {
          const academy = academies.find(a => a.id.toString() === selection.academyId)
          if (academy) {
            return academy.name
          }
        }
        return null
      })
      .filter(Boolean)

    if (selectedSubjects.length > 0) {
      setGeneratedName(selectedSubjects.join(', '))
    } else {
      setGeneratedName('미선택')
    }
  }

  const handleSubjectToggle = (subjectId: string) => {
    setSubjectSelections(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        selected: !prev[subjectId].selected,
        // Reset selections when toggling off
        branchId: !prev[subjectId].selected ? prev[subjectId].branchId : '',
        academyId: !prev[subjectId].selected ? prev[subjectId].academyId : '',
        isBranchManager: false
      }
    }))
  }

  const handleBranchSelect = (subjectId: string, branchId: string) => {
    setSubjectSelections(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        branchId,
        academyId: '', // Reset academy when branch changes
        isBranchManager: false
      }
    }))
  }

  const handleAcademySelect = (subjectId: string, academyId: string) => {
    const isBranchManager = academyId === 'branch_manager'
    setSubjectSelections(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        academyId: isBranchManager ? '' : academyId,
        isBranchManager
      }
    }))
  }

  // Handle registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    // Check if at least one subject is selected
    const selectedSubjects = Object.entries(subjectSelections).filter(([_, value]) => value.selected)
    if (selectedSubjects.length === 0) {
      setError('최소 하나 이상의 과목을 선택해주세요.')
      return
    }

    // Validate all selected subjects have branch
    for (const [subjectId, selection] of selectedSubjects) {
      if (!selection.branchId) {
        const subject = subjects.find(s => s.id.toString() === subjectId)
        setError(`${subject?.name}의 지사를 선택해주세요.`)
        return
      }
      // 학원은 선택사항 (지사장일 수 있음)
      if (!selection.isBranchManager && !selection.academyId) {
        const subject = subjects.find(s => s.id.toString() === subjectId)
        setError(`${subject?.name}의 학원을 선택하거나 지사장을 선택해주세요.`)
        return
      }
    }

    setLoading(true)

    try {
      // Prepare subject data
      const userSubjects = selectedSubjects.map(([subjectId, selection]) => ({
        subjectId: parseInt(subjectId),
        branchId: parseInt(selection.branchId),
        academyId: selection.isBranchManager ? null : parseInt(selection.academyId),
        isBranchManager: selection.isBranchManager
      }))

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: generatedName,  // 자동 생성된 이름 사용
          userSubjects
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('회원가입이 완료되었습니다. 지사 승인 후 서비스를 이용할 수 있습니다.')
        router.push('/login')
      } else {
        setError(data.error || '회원가입에 실패했습니다.')
      }
    } catch (error) {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl bg-white border-gray-200 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">회원가입</CardTitle>
          <CardDescription className="text-center">
            MarketingPlat 서비스를 이용하기 위해 회원가입을 진행해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">계정 정보</h3>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">이메일 (로그인 ID)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">비밀번호</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2.5 text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm" className="text-gray-700 font-medium">비밀번호 확인</Label>
                  <div className="relative">
                    <Input
                      id="passwordConfirm"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={formData.passwordConfirm}
                      onChange={(e) => setFormData({...formData, passwordConfirm: e.target.value})}
                      className="border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-2 top-2.5 text-gray-600"
                    >
                      {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Name Display */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">계정명</Label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900 font-medium">{generatedName}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  선택하신 과목 및 소속에 따라 자동으로 생성됩니다.
                </p>
              </div>
            </div>

            {/* Subject Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">과목 및 소속 선택</h3>

              {subjects.map(subject => (
                <div key={subject.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={subjectSelections[subject.id]?.selected || false}
                      onCheckedChange={() => handleSubjectToggle(subject.id.toString())}
                    />
                    <Label
                      htmlFor={`subject-${subject.id}`}
                      className="text-base font-medium cursor-pointer"
                    >
                      {subject.name}
                    </Label>
                  </div>

                  {subjectSelections[subject.id]?.selected && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          소속 지사
                        </Label>
                        <Select
                          value={subjectSelections[subject.id].branchId}
                          onValueChange={(value) => handleBranchSelect(subject.id.toString(), value)}
                        >
                          <SelectTrigger className="relative z-50">
                            <SelectValue placeholder="지사를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent className="relative z-[100] bg-white border border-gray-200 shadow-lg" position="popper" sideOffset={5}>
                            {branches
                              .filter(branch => branch.subjectId === subject.id)
                              .map(branch => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <SchoolIcon className="h-3 w-3" />
                          학원명
                        </Label>
                        <Select
                          value={
                            subjectSelections[subject.id].isBranchManager
                              ? 'branch_manager'
                              : subjectSelections[subject.id].academyId
                          }
                          onValueChange={(value) => handleAcademySelect(subject.id.toString(), value)}
                          disabled={!subjectSelections[subject.id].branchId}
                        >
                          <SelectTrigger className="relative z-40">
                            <SelectValue placeholder="학원을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent className="relative z-[90] bg-white border border-gray-200 shadow-lg" position="popper" sideOffset={5}>
                            <SelectItem value="branch_manager" className="font-semibold">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                지사장 (학원 미선택)
                              </div>
                            </SelectItem>
                            <div className="border-t my-1" />
                            {academies
                              .filter(academy =>
                                academy.branchId === parseInt(subjectSelections[subject.id].branchId)
                              )
                              .map(academy => (
                                <SelectItem key={academy.id} value={academy.id.toString()}>
                                  {academy.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        {subjectSelections[subject.id].isBranchManager && (
                          <p className="text-xs text-blue-600">
                            지사장 권한으로 가입합니다.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-accent-blue hover:bg-secondary-blue text-white font-medium py-6 text-base transition-all duration-200"
              disabled={loading}
            >
              {loading ? '처리 중...' : '회원가입'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-accent-blue hover:text-secondary-blue font-medium transition-colors">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}