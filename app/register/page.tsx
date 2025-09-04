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
import { Eye, EyeOff, Phone } from 'lucide-react'

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
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: ''
  })

  // Organization data
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])

  // Subject selections
  const [subjectSelections, setSubjectSelections] = useState<Record<string, SubjectSelection>>({})

  // Fetch organization data
  useEffect(() => {
    fetchOrganizationData()
  }, [])

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
          academyId: ''
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

  const handleSubjectToggle = (subjectId: string) => {
    setSubjectSelections(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        selected: !prev[subjectId].selected,
        // Reset selections when toggling off
        branchId: !prev[subjectId].selected ? prev[subjectId].branchId : '',
        academyId: !prev[subjectId].selected ? prev[subjectId].academyId : ''
      }
    }))
  }

  const handleBranchSelect = (subjectId: string, branchId: string) => {
    setSubjectSelections(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        branchId,
        academyId: '' // Reset academy when branch changes
      }
    }))
  }

  const handleAcademySelect = (subjectId: string, academyId: string) => {
    setSubjectSelections(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        academyId
      }
    }))
  }


  // Handle registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      setError('필수 정보를 모두 입력해주세요.')
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

    // Validate all selected subjects have branch and academy
    for (const [subjectId, selection] of selectedSubjects) {
      if (!selection.branchId || !selection.academyId) {
        const subject = subjects.find(s => s.id.toString() === subjectId)
        setError(`${subject?.name}의 지사와 학원을 모두 선택해주세요.`)
        return
      }
    }

    setLoading(true)

    try {
      // Prepare subject data
      const userSubjects = selectedSubjects.map(([subjectId, selection]) => ({
        subjectId: parseInt(subjectId),
        branchId: parseInt(selection.branchId),
        academyId: parseInt(selection.academyId)
      }))

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
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
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">기본 정보</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">이메일 (ID)</Label>
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
                
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">이름</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                    required
                  />
                </div>
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

            {/* Phone Number */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">연락처</h3>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">전화번호</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pl-10 border-gray-300 focus:border-accent-blue focus:ring-accent-blue"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">하이픈(-) 없이 입력해주세요.</p>
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
                        <Label>소속 지사</Label>
                        <Select
                          value={subjectSelections[subject.id].branchId}
                          onValueChange={(value) => handleBranchSelect(subject.id.toString(), value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="지사를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
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
                        <Label>학원명</Label>
                        <Select
                          value={subjectSelections[subject.id].academyId}
                          onValueChange={(value) => handleAcademySelect(subject.id.toString(), value)}
                          disabled={!subjectSelections[subject.id].branchId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="학원을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
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