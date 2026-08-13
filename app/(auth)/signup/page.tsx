import { Suspense } from 'react'
import { AuthExperience } from '@/components/auth/auth-experience'

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthExperience initialMode="signup" />
    </Suspense>
  )
}
